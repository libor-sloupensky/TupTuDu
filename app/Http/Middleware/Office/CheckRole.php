<?php

namespace App\Http\Middleware\Office;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Omezí akci na konkrétní role uživatele v aktivní firmě. */
class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $ico = session('office_firma_ico');

        if (!$user || !$ico) {
            abort(403, 'Nemáte oprávnění k této akci.');
        }

        $userRole = $user->officeFirmy()->where('office_firmy.ico', $ico)->first()?->pivot?->role;

        // Účetní vazba na klientskou firmu se chová jako role 'ucetni'
        if (!$userRole && $user->officeJeKlientFirma($ico)) {
            $userRole = 'ucetni';
        }

        if (!$userRole || !in_array($userRole, $roles)) {
            abort(403, 'Nemáte oprávnění k této akci.');
        }

        return $next($request);
    }
}
