<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'master' => \App\Http\Middleware\JeMaster::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Auto-zachytávání serverových chyb do tabulky `chyby` (in-house tracking
        // místo Sentry). Tichá deduplikace přes Chyba::zachyt(). Přeskakuje
        // očekávané stavy (404/419/422/401/403 = UX flow, ne bug).
        $exceptions->report(function (\Throwable $e) {
            $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
            if (in_array($status, [404, 419, 422, 401, 403], true)) {
                return;
            }
            try {
                \App\Models\Chyba::zachyt([
                    'typ' => 'server',
                    'uroven' => 'error',
                    'zprava' => mb_substr($e->getMessage() ?: get_class($e), 0, 500),
                    'soubor' => basename($e->getFile()) . ':' . $e->getLine(),
                    'stack_trace' => mb_substr($e->getTraceAsString(), 0, 8000),
                    'uri' => request()?->fullUrl() ? mb_substr(request()->fullUrl(), 0, 500) : null,
                    'metoda' => request()?->method(),
                    'uzivatel_id' => auth()->id(),
                    'user_agent' => mb_substr((string) request()?->userAgent(), 0, 500),
                    'ip' => request()?->ip(),
                ]);
            } catch (\Throwable $ignore) {
                // Selhání trackeru nesmí shodit původní handler.
            }
        });
    })->create();
