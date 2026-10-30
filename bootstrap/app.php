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
            // Část aplikace podle subdomény (web / app / masterteam) — config/domeny.php
            'subdomena' => \App\Http\Middleware\NaSubdomene::class,
            // Národní služba dostupná jen v některých zemích — config/lokalizace.php
            'funkce' => \App\Http\Middleware\VyzadujFunkci::class,
        ]);
        // Přesměrování na správnou subdoménu musí proběhnout DŘÍV než `auth` —
        // jinak by nepřihlášeného poslal na login na špatné subdoméně.
        $middleware->prependToPriorityList(
            before: \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
            prepend: \App\Http\Middleware\NaSubdomene::class,
        );
        // Diagnostika do tabulky `bugy` — chyby, které nevyhodí exception:
        // pomalé načítání stránek a HTML odpověď bez layoutu. Jen logují, neblokují.
        $middleware->web(append: [
            \App\Http\Middleware\MeriPomaleRequesty::class,
            \App\Http\Middleware\KontrolaHtmlLayoutu::class,
            // Jazyk a země requestu (po StartSession — čte volbu z přepínače i uživatele)
            \App\Http\Middleware\NastavLokalizaci::class,
        ]);

        // Hlásič chyb (/api/bug) bez CSRF: stránka s prošlou session (otevřená
        // přes noc, z cache) by dostala 419 a o původní chybě bychom se nikdy
        // nedozvěděli. Ochranu dělá BugController sám (rate limit, roboti).
        // Zprávy z Paddlu (paddle/webhook, Laravel Cashier) nemají CSRF token —
        // pravost ověřuje Cashier podpisem (PADDLE_WEBHOOK_SECRET). Bez klíče by
        // podpis neověřoval vůbec → mimo lokál je odmítne PaddleJenSPodpisem.
        $middleware->validateCsrfTokens(except: ['api/bug', 'paddle/*']);
        $middleware->append(\App\Http\Middleware\PaddleJenSPodpisem::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // 404 logujeme do `seo_404` přes render() hook — report() callback
        // se pro NotFoundHttpException nevolá (Laravel ho má v
        // internalDontReport přes HttpException parent). render() se volá
        // pro každou exception před vrácením response; vrátíme null →
        // Laravel pak udělá standardní 404 stránku.
        $exceptions->render(function (
            \Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e,
            \Illuminate\Http\Request $request
        ) {
            try {
                \App\Models\Seo404::zachyt(
                    $request->fullUrl(),
                    $request->headers->get('referer'),
                    (string) $request->userAgent()
                );
            } catch (\Throwable $ignore) {
                // nesmí shodit standardní 404 handler
            }
            return null; // nech Laravel vrátit defaultní 404
        });
        $exceptions->render(function (
            \Illuminate\Database\Eloquent\ModelNotFoundException $e,
            \Illuminate\Http\Request $request
        ) {
            try {
                \App\Models\Seo404::zachyt(
                    $request->fullUrl(),
                    $request->headers->get('referer'),
                    (string) $request->userAgent()
                );
            } catch (\Throwable $ignore) {
                // nesmí shodit standardní 404 handler
            }
            return null;
        });

        // Auto-zachytávání chyb do tabulky `bugy` (= jednoduchý in-house
        // tracking místo Sentry). Volá se pro každou neošetřenou Throwable;
        // tichá deduplikace přes Bug::zachyt(). Skip očekávaných stavů
        // (404, 419, 422 validation), které nejsou bug ale UX flow.
        $exceptions->report(function (\Throwable $e) {
            $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
            if (in_array($status, [404, 419, 422, 401, 403], true)) {
                return; // 404 jdou do seo_404, 419/422/401/403 jsou UX flow
            }
            // Strukturální timeout cronu (FPM max_execution_time, nelze v kódu
            // zvýšit) — velký AI batch občas visí přes limit. Není to bug, jen šum.
            // Skip JEN když request pochází z cronu (TupTuDu: routy /cron/…);
            // u normální stránky se timeout dál loguje (byl by to perf bug).
            $script = $_SERVER['SCRIPT_NAME'] ?? $_SERVER['SCRIPT_FILENAME'] ?? '';
            $jeCron = str_contains($script, 'cron') || (bool) request()?->is('cron/*');
            if (str_contains($e->getMessage(), 'Maximum execution time') && $jeCron) {
                return;
            }
            // Výjimky z `php artisan tinker` = ladění v konzoli (překlep, zkušební dotaz),
            // ne chyba aplikace. Tinker je posílá do report() → v bugách jen šum
            // (bug #30, 2. 10. 2026: „PHP Parse error: Unexpected character" z eval kódu).
            if (app()->runningInConsole() && ($_SERVER['argv'][1] ?? null) === 'tinker') {
                return;
            }
            try {
                \App\Models\Bug::zachyt([
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
                    'kontext' => \App\Models\Bug::kontextZRequestu(),
                ]);
            } catch (\Throwable $ignore) {
                // Selhání trackeru nesmí shodit původní handler
            }
        });

        // CSRF token vypršel (419) — typicky když user dal `back` v browseru
        // nebo nechal formulář dlouho otevřený. Místo statické chybové stránky
        // udělej redirect ZPĚT na referer (= GET request → nový token v session)
        // a přidej flash hlášku aby user věděl proč ho to "vrátilo".
        // POZOR: Laravel převede TokenMismatchException na HttpException(419)
        // v prepareException() DŘÍV, než se volají render callbacky — callback
        // typovaný na TokenMismatchException by se proto NIKDY nespustil.
        // Chytáme HttpException a filtrujeme status 419; null = výchozí render.
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e, \Illuminate\Http\Request $request) {
            if ($e->getStatusCode() !== 419) {
                return null;
            }
            // Odhlášení s vypršelou session: uživatel chce pryč, tak ho odhlásíme
            // (i „zapamatuj si mě") a pošleme na přihlášení — žádná hláška ani bug.
            if ($request->isMethod('post') && $request->getPathInfo() === '/logout') {
                \Illuminate\Support\Facades\Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return $request->expectsJson()
                    ? response()->json(['ok' => true])
                    : redirect()->route('login');
            }
            // 419 SE LOGUJE do bugů (report() ho přeskakuje jako "UX flow").
            // Ojedinělé 419 = uživatel nechal formulář otevřený; HROMADNÉ 419 na
            // jednom hostu = rozbitá session (cookie s cizí doménou → žádná session
            // → každý POST končí 419 a nikdo o tom neví).
            // Dedup přes soubor = host+cesta, pocet_vyskytu roste → viditelné.
            // Roboti (Googlebot, GPTBot, spidery) posílají formuláře bez session —
            // to není rozbitá session, jen šum v bugách → nelogovat.
            $jeRobot = (bool) preg_match('/bot|spider|crawl|slurp|scrapy|python-requests|curl\//i', (string) $request->userAgent());
            // Referer = sama cílová adresa POSTu, která NENÍ stránka (jen příjem
            // formuláře): člověk na ní nikdy nestojí, odesílá ze stránky
            // s formulářem → robot přehrávající request.
            // /login posílá sám na sebe → tam referer = cíl je normální, logujeme.
            $refererCesta = parse_url((string) $request->headers->get('referer'), PHP_URL_PATH);
            if (! $jeRobot && $refererCesta === $request->getPathInfo()) {
                $jeStranka = false;
                try {
                    $getRoute = app('router')->getRoutes()->match(\Illuminate\Http\Request::create($request->getPathInfo(), 'GET'));
                    $jeStranka = $getRoute->uri() === $request->route()?->uri();
                } catch (\Throwable $ignore) {
                }
                $jeRobot = ! $jeStranka;
            }
            try {
                $cookies = array_keys($request->cookies->all());
                if ($jeRobot) {
                    throw new \RuntimeException('robot');
                }
                \App\Models\Bug::zachyt([
                    'typ' => 'server',
                    'uroven' => 'warning',
                    'zprava' => 'CSRF token mismatch (419) — POST bez platné session na ' . $request->getHost() . $request->getPathInfo(),
                    'soubor' => 'CSRF ' . $request->getHost() . $request->getPathInfo(),
                    'uri' => mb_substr($request->fullUrl(), 0, 500),
                    'metoda' => $request->method(),
                    'uzivatel_id' => auth()->id(),
                    'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
                    'ip' => $request->ip(),
                    'kontext' => [
                        'host' => $request->getHost(),
                        'session_cookie_prisla' => in_array(config('session.cookie'), $cookies, true),
                        'cookies' => implode(',', array_slice($cookies, 0, 10)),
                        'session_domain_config' => config('session.domain'),
                        'content_length' => (int) $request->server('CONTENT_LENGTH', 0),
                        'expects_json' => $request->expectsJson(),
                        'referer' => mb_substr((string) $request->headers->get('referer'), 0, 200),
                    ],
                ]);
            } catch (\Throwable $ignore) {
            }

            // AJAX / API klient — ten ať dostane 419 JSON a JS si s tím poradí
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'CSRF token vypršel, obnov stránku.',
                ], 419);
            }

            $referer = $request->headers->get('referer');
            $cilovaUrl = $referer && str_starts_with($referer, url('/')) ? $referer : '/';

            return redirect($cilovaUrl)->with(
                'chyba',
                'Bezpečnostní platnost stránky vypršela, prosíme zkuste to znovu.'
            );
        });
    })->create();
