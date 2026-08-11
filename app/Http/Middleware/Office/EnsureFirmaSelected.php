<?php

namespace App\Http\Middleware\Office;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hlídá, že uživatel má vybranou firmu, ke které patří doklady.
 * Bez firmy nemá modul co zobrazit → odešle na založení/připojení firmy.
 */
class EnsureFirmaSelected
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || $user->officeFirmy()->count() === 0) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Nemáte přiřazenou žádnou firmu.'], 403);
            }
            return redirect()->route('office.firma.zadna');
        }

        $aktivniIco = session('office_firma_ico');
        if (!$aktivniIco
            || (!$user->officeFirmy()->where('office_firmy.ico', $aktivniIco)->exists()
                && !$user->officeJeKlientFirma($aktivniIco))) {
            session(['office_firma_ico' => $user->officeFirmy()->first()->ico]);
        }

        return $next($request);
    }
}
