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
        // Globální default timeouts pro Http:: — pod PHP max_execution_time,
        // aby pomalé externí volání nikdy nevyčerpalo celé okno bez stack trace.
        Http::globalOptions([
            'timeout' => 25,
            'connect_timeout' => 5,
        ]);

        // Přihlášený uživatel na guest-only routě (/login) → rovnou do adminu.
        \Illuminate\Auth\Middleware\RedirectIfAuthenticated::redirectUsing(fn () => '/masterteam');
    }
}
