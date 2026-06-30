<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JeMaster
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->jeMaster()) {
            abort(403, 'Přístup pouze pro master tým.');
        }

        return $next($request);
    }
}
