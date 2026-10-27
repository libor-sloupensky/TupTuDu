<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Na které části aplikace (web / app / masterteam) běží aktuální request.
 * Hosty jsou v config/domeny.php.
 */
final class Domeny
{
    public const WEB = 'web';
    public const APP = 'app';
    public const MASTERTEAM = 'masterteam';

    /** Část podle hostu requestu; null = neznámý host (např. holé 127.0.0.1). */
    public static function cast(?Request $request = null): ?string
    {
        $request ??= request();
        $host = strtolower($request?->getHost() ?? '');

        if ($host === strtolower(config('domeny.app'))) {
            return self::APP;
        }
        if ($host === strtolower(config('domeny.masterteam'))) {
            return self::MASTERTEAM;
        }

        $bezWww = str_starts_with($host, 'www.') ? substr($host, 4) : $host;
        if (in_array($bezWww, array_map('strtolower', config('domeny.web')), true)) {
            return self::WEB;
        }

        return null;
    }

    public static function jeApp(?Request $request = null): bool
    {
        return self::cast($request) === self::APP;
    }

    public static function jeMasterteam(?Request $request = null): bool
    {
        return self::cast($request) === self::MASTERTEAM;
    }

    public static function jeWeb(?Request $request = null): bool
    {
        return self::cast($request) === self::WEB;
    }

    /**
     * Lokální vývoj na holém 127.0.0.1 / localhost — propouští všechny části.
     * UI testy (services/import-test) se přihlašují přes 127.0.0.1 a hned
     * otevírají masterteam; s oddělenými cookies by jinak skončily na loginu.
     */
    public static function jeNeutralniLokalne(?Request $request = null): bool
    {
        $request ??= request();

        return app()->environment('local')
            && in_array(strtolower($request?->getHost() ?? ''), ['127.0.0.1', 'localhost', '::1'], true);
    }

    /** Základ adresy části — https://app.tuptudu.com, lokálně http://app.tuptudu.localhost:8002. */
    public static function zaklad(string $cast, ?Request $request = null): string
    {
        $request ??= request();
        $host = $cast === self::WEB ? config('domeny.web')[0] : config('domeny.' . $cast);

        if (app()->environment('local')) {
            $port = $request?->getPort();
            $pripona = ($port && ! in_array($port, [80, 443], true)) ? ':' . $port : '';

            return 'http://' . $host . $pripona;
        }

        return 'https://' . ($cast === self::WEB ? 'www.' . $host : $host);
    }

    public static function url(string $cast, string $cesta = '/'): string
    {
        return self::zaklad($cast) . '/' . ltrim($cesta, '/');
    }

    /** Kam po přihlášení — masterteam do administrace, zákazník na úvod aplikace. */
    public static function domov(?Request $request = null): string
    {
        return self::jeApp($request) ? '/' : '/masterteam';
    }
}
