<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Diagnostika: HTML response bez layoutu.
 *
 * Když controller omylem vrátí partial view (bez <!doctype>/<html>/<body>)
 * jako plnou stránku (např. AJAX fragment obsluhuje samostatnou routu),
 * user vidí neostylovaný text. Server nevyhodí žádnou exception — proto to
 * neskončí v tabulce `chyby`. Tento middleware to detekuje a zaloguje.
 *
 * Kritéria pro zápis:
 *   - status 2xx
 *   - Content-Type: text/html*
 *   - request není AJAX (X-Requested-With != XMLHttpRequest)
 *   - request neočekává JSON
 *   - obsah neobsahuje `<!doctype html>` ani `<html`
 *   - obsah není prázdný a je delší než 200 znaků (partials bývají větší)
 *
 * Middleware jen loguje, neblokuje. Response prochází beze změn.
 */
class KontrolaHtmlLayoutu
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Jen HTML 2xx odpovědi.
        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            return $response;
        }
        $contentType = strtolower((string) $response->headers->get('Content-Type', ''));
        if (! str_contains($contentType, 'text/html')) {
            return $response;
        }

        // AJAX/JSON požadavky partial vracet smějí.
        if ($request->ajax() || $request->wantsJson() || $request->expectsJson()) {
            return $response;
        }

        // Explicitní opt-out — controller přiznává, že response je partial
        // ZÁMĚRNĚ (např. AJAX endpoint volaný fetch bez X-Requested-With).
        // Guard v controlleru brání přímému hitu, tento header pak jen
        // middleware informuje, že nemá dělat false-positive log.
        if ($response->headers->get('X-Layout-Partial') === '1') {
            return $response;
        }

        // Odhlídneme si prvních ~1000 znaků odpovědi (case-insensitive detekce
        // <!doctype nebo <html — obojí signalizuje plnohodnotný layout).
        $obsah = $response->getContent();
        if (! is_string($obsah) || strlen($obsah) < 200) {
            return $response;
        }
        $prefix = strtolower(substr(ltrim($obsah), 0, 1000));
        if (str_contains($prefix, '<!doctype') || str_contains($prefix, '<html')) {
            return $response;
        }

        // Chybí layout — zaloguj (v try/catch aby middleware nikdy neshodil response).
        try {
            \App\Models\Bug::zachyt([
                'typ' => 'server',
                'uroven' => 'warning',
                'zprava' => 'HTML odpověď bez layoutu (missing <!doctype>/<html>). Controller pravděpodobně vrací partial jako plnou stránku.',
                'soubor' => 'KontrolaHtmlLayoutu',
                'uri' => mb_substr($request->fullUrl(), 0, 500),
                'metoda' => $request->method(),
                'uzivatel_id' => auth()->id(),
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
                'ip' => $request->ip(),
            ]);
        } catch (\Throwable $e) {
            // Diagnostika nesmí shodit request.
        }

        return $response;
    }
}
