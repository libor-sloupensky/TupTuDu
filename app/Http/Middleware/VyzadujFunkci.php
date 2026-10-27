<?php

namespace App\Http\Middleware;

use App\Support\Lokalizace;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Routa národní služby, která v zemi uživatele neexistuje → 404.
 * Použití: `funkce:katastr` (seznam služeb podle země v config/lokalizace.php).
 */
class VyzadujFunkci
{
    public function handle(Request $request, Closure $next, string $funkce): Response
    {
        abort_unless(Lokalizace::maFunkci($funkce), 404);

        return $next($request);
    }
}
