<?php

namespace App\Providers;

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
        // Log::error/critical → tabulka bugů (jinak končí jen v laravel.log, který nikdo nečte)
        // zařizuje App\Listeners\ZrcadliLogDoBugu. Registruje ho sám Laravel (auto-discovery
        // app/Listeners podle typu v handle()) — ruční Event::listen tady by ho přidal podruhé
        // a každé Log::error by se v přehledu počítalo 2× (ověřeno přes `php artisan event:list`).

        // Globální default timeouts pro Http:: — pod PHP max_execution_time,
        // aby pomalé externí volání nikdy nevyčerpalo celé okno bez stack trace.
        Http::globalOptions([
            'timeout' => 25,
            'connect_timeout' => 5,
        ]);

        // Přihlášený uživatel na guest-only routě (/login) → rovnou dovnitř
        // (na masterteamu do administrace, na app na úvod aplikace).
        \Illuminate\Auth\Middleware\RedirectIfAuthenticated::redirectUsing(fn ($request) => \App\Support\Domeny::domov($request));

        // @funkce('katastr') … @endfunkce — část šablony jen pro země, kde služba existuje
        \Illuminate\Support\Facades\Blade::if('funkce', fn (string $funkce) => \App\Support\Lokalizace::maFunkci($funkce));
    }
}
