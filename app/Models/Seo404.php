<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Seo404 extends Model
{
    protected $table = 'seo_404';

    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $fillable = [
        'hash', 'uri', 'referer', 'user_agent',
        'pocet_vyskytu', 'prvni_v', 'naposledy_v',
    ];

    protected function casts(): array
    {
        return [
            'prvni_v' => 'datetime',
            'naposledy_v' => 'datetime',
        ];
    }

    /**
     * Zaznamená 404. Deduplikace přes hash(uri + referer source).
     * Žádné IP — jen URI, referer, UA pro SEO analýzu.
     * Bezpečné z exception handleru — chyba v zápisu se ignoruje.
     *
     * Šum filtrujeme PŘED zápisem (nezahlcovat tabulku):
     *  - security skeny (.env, wp-login, .git, phpunit, …)
     *  - assety (.png, .css, .js, .ico, fonty) — to není SEO problém
     *  - well-known crawly (.well-known/*)
     * Užitečné je 404 stránek (bez přípony nebo .html/.php) — to jsou ty,
     * na které někdo přišel z externího zdroje a chtěl reálný obsah.
     */
    public static function zachyt(string $uri, ?string $referer, ?string $userAgent): void
    {
        try {
            if (self::jeSum($uri)) return;
            $uri = mb_substr($uri, 0, 500);
            $referer = $referer ? mb_substr($referer, 0, 1000) : null;
            $userAgent = $userAgent ? mb_substr($userAgent, 0, 500) : null;

            // Hash kombinuje URI + zdroj refereru (= doménu) — stejná
            // 404 z různých zdrojů se nededuplikuje, ale různé linky
            // ze stejné domény ano.
            $refSrc = $referer ? parse_url($referer, PHP_URL_HOST) : '';
            $hash = hash('sha256', $uri . '|' . ($refSrc ?: ''));

            $existujici = static::where('hash', $hash)->first();

            if ($existujici) {
                $existujici->update([
                    'pocet_vyskytu' => $existujici->pocet_vyskytu + 1,
                    'naposledy_v' => now(),
                    // Aktualizuj referer/UA na nejnovější — užitečné pro
                    // sledování zda link na ztracené URL ještě někde žije.
                    'referer' => $referer,
                    'user_agent' => $userAgent,
                ]);
                return;
            }

            static::create([
                'hash' => $hash,
                'uri' => $uri,
                'referer' => $referer,
                'user_agent' => $userAgent,
                'pocet_vyskytu' => 1,
                'prvni_v' => now(),
                'naposledy_v' => now(),
            ]);
        } catch (\Throwable $e) {
            error_log('Seo404::zachyt selhalo: ' . $e->getMessage());
        }
    }

    /**
     * Šum, který nestojí za zápis do seo_404:
     *  - security skeny (.env, .yml, wp-login, .git, phpunit, vendor/, …)
     *  - assety (.png, .jpg, .css, .js, .ico, fonty, mapy)
     *  - .well-known/* (Apple, Let's Encrypt, Chrome DevTools probes)
     * Pro SEO ztráty zajímavé jsou jen URL, na které někdo přišel po reálném
     * obsahu — typicky bez přípony nebo .html.
     */
    public static function jeSum(string $uri): bool
    {
        $path = strtolower(parse_url($uri, PHP_URL_PATH) ?? '');
        if ($path === '' || $path === '/') return false;

        // Security skeny + admin / config probes.
        // `/public/` a `/graphql*` jsou typické bot fishing pokusy — my nemáme
        // Laravel `/public/` exposed jako sub-URL (docroot je public/) ani GraphQL API.
        $podezrelePrefixy = [
            '/wp-', '/wordpress', '/.env', '/.git', '/.svn', '/.aws',
            '/.well-known/', '/phpmyadmin', '/phpunit', '/vendor/',
            '/xmlrpc.php', '/phpinfo', '/server-status', '/server-info',
            '/cgi-bin/', '/actuator', '/_next/', '/__webpack',
            '/public/', '/graphql', '/api/graphql', '/v1/graphql',
        ];
        foreach ($podezrelePrefixy as $p) {
            if (str_starts_with($path, $p) || str_contains($path, $p)) return true;
        }

        // „/null", „/sluzby/null", „/undefined" — crawler Facebooku (meta-externalagent)
        // čte `var v = null;` ze skriptů stránky jako odkaz. Na webu takový odkaz není.
        if (preg_match('~/(null|undefined)$~', $path)) return true;

        // Assety + technické přípony podle koncovky.
        // `.php` je bot fishing — my nemáme žádné legit `.php` URL v public routách
        // (deploy-hook.php / cron.php mají vlastní auth token; tester `/index.php` neexistuje).
        $assetPripony = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico',
            'css', 'js', 'map', 'woff', 'woff2', 'ttf', 'otf', 'eot',
            'mp4', 'mp3', 'wav', 'pdf', 'zip', 'gz', 'tar',
            'env', 'yml', 'yaml', 'json', 'sql', 'log', 'bak', 'old',
            'php', 'asp', 'aspx', 'jsp', 'cgi',
        ];
        if (preg_match('/\.([a-z0-9]{2,5})$/i', $path, $m)
            && in_array(strtolower($m[1]), $assetPripony, true)) {
            return true;
        }
        return false;
    }

    /**
     * Vrací true pokud UA odpovídá známému botu / crawleru. Heuristika podle
     * pojmenovaných tokenů — pro SEO ztráty chceme primárně reálné lidi,
     * boty pak izolovat do samostatného filtru.
     */
    public function jeBot(): bool
    {
        $ua = strtolower($this->user_agent ?? '');
        if ($ua === '') return true; // bez UA = skoro jistě skript / curl
        return (bool) preg_match(
            '/bot|spider|crawler|slurp|facebookexternalhit|telegram|whatsapp|preview|headless|httpclient|python-requests|curl\//',
            $ua
        );
    }

    /**
     * Vrací true pokud referer je z naší vlastní domény (= rozbitý interní
     * odkaz, ne SEO ztráta z externího zdroje).
     */
    public function jeInterni(): bool
    {
        if (!$this->referer) return false;
        $host = strtolower(parse_url($this->referer, PHP_URL_HOST) ?? '');
        return $host === '' || str_ends_with($host, 'tuptudu.com');
    }
}
