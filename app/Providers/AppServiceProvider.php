<?php

namespace App\Providers;

use App\Models\Chyba;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->sledujChybyVLogu();

        // Globální default timeouts pro Http:: — pod PHP max_execution_time,
        // aby pomalé externí volání nikdy nevyčerpalo celé okno bez stack trace.
        Http::globalOptions([
            'timeout' => 25,
            'connect_timeout' => 5,
        ]);

        // Přihlášený uživatel na guest-only routě (/login) → rovnou do adminu.
        \Illuminate\Auth\Middleware\RedirectIfAuthenticated::redirectUsing(fn () => '/masterteam');
    }

    /**
     * Log::error(...) → tabulka `chyby`.
     *
     * Exception handler v bootstrap/app.php zachytí jen výjimky, které probublají
     * až nahoru. Kód, který si chybu odchytí sám a jen ji zaloguje — typicky cron
     * příkazy modulu Doklady — by jinak skončil pouze v laravel.log, kam se nikdo
     * nedívá. Tenhle listener dostane do přehledu i takové případy, včetně
     * budoucího kódu, aniž by ho autor musel na tracker napojovat.
     */
    private function sledujChybyVLogu(): void
    {
        Event::listen(MessageLogged::class, function (MessageLogged $udalost) {
            if (! in_array($udalost->level, ['error', 'critical', 'alert', 'emergency'], true)) {
                return;
            }

            // Chyba::zachyt() sama loguje jen přes error_log(), takže tenhle
            // listener nemůže spustit sám sebe.
            try {
                $vyjimka = $udalost->context['exception'] ?? null;

                Chyba::zachyt([
                    'typ' => app()->runningInConsole() ? 'cron' : 'server',
                    'uroven' => $udalost->level,
                    'zprava' => mb_substr($udalost->message, 0, 500),
                    'soubor' => $vyjimka instanceof \Throwable
                        ? basename($vyjimka->getFile()) . ':' . $vyjimka->getLine()
                        : null,
                    'stack_trace' => $vyjimka instanceof \Throwable
                        ? mb_substr($vyjimka->getTraceAsString(), 0, 8000)
                        : mb_substr(json_encode($udalost->context, JSON_UNESCAPED_UNICODE) ?: '', 0, 8000),
                    'uri' => request()?->fullUrl() ? mb_substr(request()->fullUrl(), 0, 500) : null,
                    'metoda' => request()?->method(),
                    'uzivatel_id' => auth()->hasUser() ? auth()->id() : null,
                ]);
            } catch (\Throwable $ignore) {
                // Selhání trackeru nesmí shodit původní logování.
            }
        });
    }
}
