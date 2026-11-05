<?php

namespace App\Http\Middleware;

use App\Support\Lokalizace;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Jazyk daný adresou stránky (/cs, /cs/pricing, /cs/clanky/…). Má přednost před účtem, přepínačem
 * i polohou podle IP: Googlebot chodí typicky z USA a na jedné adrese musí každý vidět týž text
 * (modules/blog.md). Běží po NastavLokalizaci, zemi tedy nemění (měna, národní služby).
 */
class JazykZAdresy
{
    public function handle(Request $request, Closure $next, string $jazyk): Response
    {
        abort_unless(Lokalizace::jeJazyk($jazyk), 404);

        App::setLocale($jazyk);

        // Kdo přišel na adresu s jazykem, má ho i na stránkách, které jazyk v adrese nemají
        if ($request->hasSession() && $request->session()->get('jazyk') !== $jazyk) {
            $request->session()->put('jazyk', $jazyk);
        }

        return $next($request);
    }
}
