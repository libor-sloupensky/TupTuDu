<?php

namespace App\Providers;

use App\Support\Domeny;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            \Laravel\Fortify\Contracts\LoginResponse::class,
            \App\Http\Responses\LoginResponse::class
        );
    }

    public function boot(): void
    {
        Fortify::loginView(fn () => view('auth.login'));

        // Registrace jen v zákaznické aplikaci — z masterteamu na app
        Fortify::registerView(function (Request $request) {
            if (Domeny::jeMasterteam()) {
                return redirect(Domeny::url('app', '/register'));
            }
            // Článek, ze kterého návštěvník přišel (blok výzvy, modules/blog.md). Uloží se k registraci i přes Google.
            if (preg_match('/^[a-z0-9-]{1,80}$/', (string) $request->query('zdroj'))) {
                $request->session()->put('zdroj_registrace', $request->query('zdroj'));
            }

            return view('auth.register');
        });
        Fortify::createUsersUsing(\App\Actions\Fortify\CreateNewUser::class);

        Fortify::requestPasswordResetLinkView(fn () => view('auth.forgot-password'));
        Fortify::resetPasswordView(fn (Request $request) => view('auth.reset-password', ['request' => $request]));
        Fortify::resetUserPasswordsUsing(\App\Actions\Fortify\ResetUserPassword::class);

        Fortify::verifyEmailView(fn () => view('auth.verify-email'));

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())) . '|' . $request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
