<?php

namespace App\Http\Middleware;

use App\Support\Domeny;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Routa běží jen na vyjmenovaných částech aplikace: `subdomena:masterteam`,
 * `subdomena:app,masterteam`. Jinde přesměruje na první z nich se stejnou cestou
 * (např. www.tuptudu.com/masterteam → masterteam.tuptudu.com/masterteam).
 *
 * GET → 301 (lokálně 302, ať si prohlížeč přesměrování nezapamatuje napořád).
 * POST/PATCH/DELETE → 307 (zachová metodu i tělo — např. POST /login).
 * Lokálně holé 127.0.0.1 propouští vše (viz Domeny::jeNeutralniLokalne).
 */
class NaSubdomene
{
    public function handle(Request $request, Closure $next, string ...$casti): Response
    {
        if (in_array(Domeny::cast($request), $casti, true) || Domeny::jeNeutralniLokalne($request)) {
            return $next($request);
        }

        $status = ! $request->isMethod('GET') ? 307 : (app()->environment('local') ? 302 : 301);

        return redirect(Domeny::zaklad($casti[0], $request) . $request->getRequestUri(), $status);
    }
}
