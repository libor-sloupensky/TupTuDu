<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Zprávy z Paddlu (POST /paddle/webhook, Laravel Cashier) bez PADDLE_WEBHOOK_SECRET
 * Cashier vůbec neověřuje — kdokoli by si mohl poslat „zaplacené předplatné“
 * (ID zákazníka u Paddlu je vidět ve stránce předplatného). Mimo lokální vývoj
 * se proto bez tajného klíče odmítnou a nahlásí do bugů (Log::error).
 */
class PaddleJenSPodpisem
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is(trim(config('cashier.path'), '/') . '/webhook')
            && ! config('cashier.webhook_secret')
            && ! app()->environment('local')) {
            Log::error('Paddle: zpráva odmítnuta — na serveru chybí PADDLE_WEBHOOK_SECRET');
            abort(403);
        }

        return $next($request);
    }
}
