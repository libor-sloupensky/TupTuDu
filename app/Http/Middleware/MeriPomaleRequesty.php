<?php

namespace App\Http\Middleware;

use App\Models\Bug;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Změří dobu requestu a pomalé (nad práh) zapíše do tabulky `bugy` jako typ
 * `pomaly_request` — objeví se v /masterteam/bugy (záložka „Pomalé").
 *
 * Účel: chytit „vypršel čas spojení" KDEKOLI, ne jen na jedné stránce. Když se
 * stránka občas načítá 10 s místo 0,15 s, uživateli to spadne do timeoutu —
 * a tady uvidíme, na které cestě a jak často se to děje.
 *
 * Návrh, aby to nebylo zbytečně invazivní:
 *  - loguje se v `terminate()` PO odeslání odpovědi → uživatel nečeká navíc,
 *  - jen GET (načtení stránky) — POST bývají AI/uploady, pomalé záměrně,
 *  - vyloučené cesty (streaming, cron, AI vyčítání) se přeskočí,
 *  - dedup přes `Bug::zachyt` (čísla se v hashi normalizují) → stejná cesta =
 *    jeden řádek s počtem výskytů, ne stovky záznamů,
 *  - selhání zápisu nikdy neshodí request.
 *
 * Práh: `config('app.pomaly_request_ms')` (default 3000 ms), laditelný přes .env.
 */
class MeriPomaleRequesty
{
    /** Cesty pomalé ZÁMĚRNĚ (AI, streaming, cron, export, PDF→SVG) — nelogovat. */
    private const VYLOUCIT = ['stream', 'sse', 'cron', 'export', 'poradce', 'chat', 'vycti-charakteristiky', 'vykaz-vymer'];

    public function handle(Request $request, Closure $next): Response
    {
        // Diagnostika: kolik trvá NAVÁZAT spojení k DB (samotný connect, ne dotaz).
        // U pomalého requestu pak v kontextu vidíme rozpad: když je connect ~10 s,
        // je zádrhel v databázovém spojení; když je connect rychlý a request přesto
        // pomalý, je problém jinde (disk/session, CPU). Slow query log connecty
        // nezaznamenává, proto to měříme tady. Připojení request stejně potřebuje,
        // jen ho tím vyvoláme dřív a změříme.
        try {
            $t = microtime(true);
            \Illuminate\Support\Facades\DB::connection()->getPdo();
            $request->attributes->set('db_connect_ms', (int) round((microtime(true) - $t) * 1000));
        } catch (\Throwable $e) {
            $request->attributes->set('db_connect_ms', -1);
        }

        // Počet DB dotazů + jejich celkový čas — rozliší „mnoho drobných dotazů"
        // (celkový čas ≈ trvání requestu) od „čas je mimo DB" (celkový čas malý,
        // request přesto pomalý → PHP/CPU/render). Slow log jednotlivé rychlé
        // dotazy nechytí, tady je sečteme.
        $pocet = 0;
        $sumaMs = 0.0;
        \Illuminate\Support\Facades\DB::listen(function ($q) use (&$pocet, &$sumaMs) {
            $pocet++;
            $sumaMs += $q->time;
        });

        $vysledek = $next($request);

        $request->attributes->set('db_pocet_dotazu', $pocet);
        $request->attributes->set('db_suma_ms', (int) round($sumaMs));

        return $vysledek;
    }

    public function terminate(Request $request, Response $response): void
    {
        try {
            if ($request->method() !== 'GET') {
                return;
            }

            // Stahování souboru (ZIP příloh, PDF…): terminate() běží až po
            // odeslání, takže čas zahrnuje přenos po síti zákazníka — to není
            // pomalost serveru (2026-10-20: ZIP příloh 4,4 s při nulové DB/zátěži).
            if ($response instanceof \Symfony\Component\HttpFoundation\BinaryFileResponse
                || $response instanceof \Symfony\Component\HttpFoundation\StreamedResponse) {
                return;
            }

            // Lokálně (php artisan serve) je pomalost šum: jeden požadavek najednou,
            // po každé změně překlad šablon → bugy plné /faktury, /kontakt, / (2026-10-25).
            if (app()->isLocal()) {
                return;
            }

            $start = defined('LARAVEL_START') ? LARAVEL_START : (float) $request->server('REQUEST_TIME_FLOAT');
            if (! $start) {
                return;
            }

            $ms = (int) round((microtime(true) - $start) * 1000);
            if ($ms < (int) config('app.pomaly_request_ms', 3000)) {
                return;
            }

            $cesta = '/' . ltrim($request->path(), '/');
            foreach (self::VYLOUCIT as $v) {
                if (str_contains($cesta, $v)) {
                    return;
                }
            }

            $klic = 'GET ' . $cesta;
            Bug::zachyt([
                'typ' => 'pomaly_request',
                'uroven' => 'warning',
                'zprava' => 'Pomalé načítání stránky: ' . $klic,
                'soubor' => $klic, // dedup klíč (per cesta+metoda)
                'uri' => mb_substr($request->fullUrl(), 0, 500),
                'metoda' => 'GET',
                'uzivatel_id' => $request->user()?->id,
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
                'ip' => $request->ip(),
                'kontext' => [
                    'trvani_ms' => $ms,
                    'db_connect_ms' => $request->attributes->get('db_connect_ms'),
                    'db_pocet_dotazu' => $request->attributes->get('db_pocet_dotazu'),
                    'db_suma_ms' => $request->attributes->get('db_suma_ms'),
                    // Zatížení serveru (1/5/15 min) v okamžiku pomalé stránky —
                    // vysoký load = CPU/systém přetížený → čas je mimo DB kvůli
                    // sdílenému CPU VPS. (Na Windows vrací null, na Linuxu čísla.)
                    'load' => function_exists('sys_getloadavg') ? sys_getloadavg() : null,
                    'status' => $response->getStatusCode(),
                ],
            ]);
        } catch (\Throwable $e) {
            // Měření výkonu nikdy nesmí shodit request.
        }
    }
}
