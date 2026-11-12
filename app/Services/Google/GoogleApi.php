<?php

namespace App\Services\Google;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Čtení z Google Analytics 4 a Search Console servisním účtem (modules/statistiky.md).
 *
 * Klíč servisního účtu je JSON z Google Cloud: na produkci v `GOOGLE_SA_JSON` (base64,
 * GitHub Secret), lokálně cesta k souboru v `GOOGLE_SA_SOUBOR`. Bez knihoven Googlu —
 * přístupový token se získá podepsaným JWT (RS256) a drží se v cache.
 */
class GoogleApi
{
    private const ROZSAHY = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly';

    public function nastaveno(): bool
    {
        return $this->klic() !== null;
    }

    /**
     * Návštěvy z GA4 po dnech a součet za období (návštěvníci v součtu jsou unikátní
     * za celé období, ne součet dnů).
     *
     * @return array{dny: array<int, array{den: string, navstevnici: int, relace: int, zobrazeni: int}>, celkem: array<string, int>}
     */
    public function navstevy(string $od, string $do): array
    {
        $metriky = [['name' => 'activeUsers'], ['name' => 'sessions'], ['name' => 'screenPageViews']];
        $adresa = 'https://analyticsdata.googleapis.com/v1beta/properties/' . config('services.google_api.ga4_sluzba') . ':runReport';
        $obdobi = [['startDate' => $od, 'endDate' => $do]];

        // Oba dotazy souběžně: za sebou s pomalým Googlem přelezly limit PHP 30 s (bug 84)
        ['dny' => $poDnech, 'soucet' => $soucet] = $this->postSoubezne([
            'dny' => [$adresa, ['dateRanges' => $obdobi, 'dimensions' => [['name' => 'date']], 'metrics' => $metriky, 'limit' => 5000]],
            'soucet' => [$adresa, ['dateRanges' => $obdobi, 'metrics' => $metriky]],
        ]);

        $dny = [];
        foreach ($poDnech['rows'] ?? [] as $radek) {
            $d = $radek['dimensionValues'][0]['value']; // 20261101
            $dny[] = [
                'den' => substr($d, 0, 4) . '-' . substr($d, 4, 2) . '-' . substr($d, 6, 2),
                'navstevnici' => (int) $radek['metricValues'][0]['value'],
                'relace' => (int) $radek['metricValues'][1]['value'],
                'zobrazeni' => (int) $radek['metricValues'][2]['value'],
            ];
        }
        $s = $soucet['rows'][0]['metricValues'] ?? [];

        return [
            'dny' => $dny,
            'celkem' => [
                'navstevnici' => (int) ($s[0]['value'] ?? 0),
                'relace' => (int) ($s[1]['value'] ?? 0),
                'zobrazeni' => (int) ($s[2]['value'] ?? 0),
            ],
        ];
    }

    /**
     * Výkon ve vyhledávání Google po dnech (Search Console, včetně čerstvých neuzavřených dnů).
     *
     * @return array<int, array{den: string, zobrazeni: int, kliknuti: int, pozice: float}>
     */
    public function vyhledavani(string $od, string $do): array
    {
        return $this->poDnech($this->post($this->adresaVyhledavani(), $this->dotazVyhledavani('date', $od, $do)));
    }

    /**
     * Vyhledávání po dnech, po stránkách a po výrazech najednou: tři dotazy souběžně. Za sebou s pomalým
     * Search Console přelezly limit PHP 30 s a stránka Statistik spadla (bug 84, 12. 11. 2026).
     *
     * @return array{dny: array, stranky: array, vyrazy: array}
     */
    public function vyhledavaniVse(string $od, string $do): array
    {
        $adresa = $this->adresaVyhledavani();
        $o = $this->postSoubezne([
            'dny' => [$adresa, $this->dotazVyhledavani('date', $od, $do)],
            'stranky' => [$adresa, $this->dotazVyhledavani('page', $od, $do)],
            'vyrazy' => [$adresa, $this->dotazVyhledavani('query', $od, $do)],
        ]);

        return ['dny' => $this->poDnech($o['dny']), 'stranky' => $this->podle($o['stranky']), 'vyrazy' => $this->podle($o['vyrazy'])];
    }

    private function adresaVyhledavani(): string
    {
        return 'https://www.googleapis.com/webmasters/v3/sites/' . rawurlencode(config('services.google_api.gsc_web')) . '/searchAnalytics/query';
    }

    private function dotazVyhledavani(string $rozmer, string $od, string $do): array
    {
        return ['startDate' => $od, 'endDate' => $do, 'dimensions' => [$rozmer], 'dataState' => 'all', 'rowLimit' => 5000];
    }

    private function poDnech(array $odpoved): array
    {
        return array_map(fn ($r) => [
            'den' => $r['keys'][0],
            'zobrazeni' => (int) $r['impressions'],
            'kliknuti' => (int) $r['clicks'],
            'pozice' => round((float) $r['position'], 1),
        ], $odpoved['rows'] ?? []);
    }

    /**
     * Hledané výrazy, na které se web ukázal: výraz => zobrazení, kliknutí, pozice. Google z ochrany
     * soukromí zamlčí výrazy, které hledalo jen pár lidí, součet proto bývá nižší než zobrazení celkem.
     *
     * @return array<string, array{zobrazeni: int, kliknuti: int, pozice: float}>
     */
    public function vyhledavaniPoVyrazech(string $od, string $do): array
    {
        return $this->vyhledavaniPodle('query', $od, $do);
    }

    /**
     * Výkon jednotlivých stránek ve vyhledávání za období: adresa => zobrazení, kliknutí, pozice.
     *
     * @return array<string, array{zobrazeni: int, kliknuti: int, pozice: float}>
     */
    public function vyhledavaniPoStrankach(string $od, string $do): array
    {
        return $this->vyhledavaniPodle('page', $od, $do);
    }

    /** @return array<string, array{zobrazeni: int, kliknuti: int, pozice: float}> */
    private function vyhledavaniPodle(string $rozmer, string $od, string $do): array
    {
        return $this->podle($this->post($this->adresaVyhledavani(), $this->dotazVyhledavani($rozmer, $od, $do)));
    }

    /** @return array<string, array{zobrazeni: int, kliknuti: int, pozice: float}> */
    private function podle(array $odpoved): array
    {
        $stranky = [];
        foreach ($odpoved['rows'] ?? [] as $r) {
            $stranky[$r['keys'][0]] = [
                'zobrazeni' => (int) $r['impressions'],
                'kliknuti' => (int) $r['clicks'],
                'pozice' => round((float) $r['position'], 1),
            ];
        }

        return $stranky;
    }

    /**
     * Stav adres v indexu Google (URL Inspection). Jeden dotaz trvá kolem 7 s, proto souběžně
     * po 25. Limit Googlu je 2 000 dotazů denně a 600 za minutu na web.
     *
     * @param  string[]  $adresy
     * @return array<string, array{zaindexovano?: bool, stav?: string, prochazeno?: ?string, chyba?: string}> adresa => výsledek
     */
    public function stavIndexace(array $adresy): array
    {
        $token = $this->token();
        $web = config('services.google_api.gsc_web');
        $vysledky = [];

        foreach (array_chunk($adresy, 25) as $davka) {
            $odpovedi = Http::pool(fn (Pool $pool) => array_map(
                fn ($adresa) => $pool->as($adresa)->withToken($token)->timeout(30)
                    ->post('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', [
                        'inspectionUrl' => $adresa, 'siteUrl' => $web, 'languageCode' => 'cs',
                    ]),
                $davka
            ));
            foreach ($davka as $adresa) {
                $o = $odpovedi[$adresa] ?? null;
                if (! $o instanceof Response || ! $o->successful()) {
                    $vysledky[$adresa] = ['chyba' => $o instanceof Response
                        ? 'HTTP ' . $o->status() . ' ' . mb_substr((string) $o->json('error.message'), 0, 200)
                        : mb_substr($o instanceof \Throwable ? $o->getMessage() : 'bez odpovědi', 0, 200)];

                    continue;
                }
                $stav = $o->json('inspectionResult.indexStatusResult') ?? [];
                $vysledky[$adresa] = [
                    'zaindexovano' => ($stav['verdict'] ?? '') === 'PASS',
                    'stav' => (string) ($stav['coverageState'] ?? 'neznámý'),
                    'prochazeno' => $stav['lastCrawlTime'] ?? null,
                    'robot' => $stav['crawledAs'] ?? null, // MOBILE, DESKTOP
                ];
            }
        }

        return $vysledky;
    }

    private function post(string $adresa, array $telo): array
    {
        $odpoved = Http::withToken($this->token())->connectTimeout(10)->timeout(30)->post($adresa, $telo);

        return $this->json($adresa, $odpoved);
    }

    /**
     * Několik dotazů souběžně, výsledek pod stejnými klíči. Selže-li kterýkoli, vyhodí výjimku (spojení
     * jako ConnectionException, ať ji volající pozná jako výpadek sítě).
     *
     * @param  array<string, array{0: string, 1: array}>  $dotazy  klíč => [adresa, tělo]
     * @return array<string, array>
     */
    private function postSoubezne(array $dotazy): array
    {
        $token = $this->token();
        $odpovedi = Http::pool(fn (Pool $pool) => array_map(
            fn ($klic) => $pool->as($klic)->withToken($token)->connectTimeout(10)->timeout(30)->post($dotazy[$klic][0], $dotazy[$klic][1]),
            array_keys($dotazy)
        ));
        $vysledky = [];
        foreach ($dotazy as $klic => [$adresa]) {
            $odpoved = $odpovedi[$klic] ?? null;
            if ($odpoved instanceof \Throwable) {
                throw $odpoved;
            }
            $vysledky[$klic] = $this->json($adresa, $odpoved);
        }

        return $vysledky;
    }

    private function json(string $adresa, ?Response $odpoved): array
    {
        if (! $odpoved?->successful()) {
            throw new RuntimeException('Google API ' . parse_url($adresa, PHP_URL_HOST) . ': HTTP ' . ($odpoved?->status() ?? 0) . ' ' . mb_substr((string) $odpoved?->json('error.message'), 0, 300));
        }

        return $odpoved->json() ?? [];
    }

    /** Přístupový token servisního účtu (platí hodinu, v cache 50 minut). */
    private function token(): string
    {
        $klic = $this->klic() ?? throw new RuntimeException('Google API: chybí klíč servisního účtu (GOOGLE_SA_JSON nebo GOOGLE_SA_SOUBOR).');

        return Cache::remember('google-api-token-' . md5($klic['client_email']), 3000, function () use ($klic) {
            $b64 = fn (string $s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
            $cas = time();
            $obsah = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])) . '.' . $b64(json_encode([
                'iss' => $klic['client_email'],
                'scope' => self::ROZSAHY,
                'aud' => $klic['token_uri'],
                'iat' => $cas,
                'exp' => $cas + 3600,
            ]));
            if (! openssl_sign($obsah, $podpis, $klic['private_key'], OPENSSL_ALGO_SHA256)) {
                throw new RuntimeException('Google API: klíč servisního účtu nejde použít k podpisu.');
            }

            $odpoved = Http::asForm()->timeout(20)->post($klic['token_uri'], [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $obsah . '.' . $b64($podpis),
            ]);
            if (! $odpoved->successful() || ! $odpoved->json('access_token')) {
                throw new RuntimeException('Google API: token se nepodařilo získat, HTTP ' . $odpoved->status() . ' ' . mb_substr((string) $odpoved->json('error_description'), 0, 200));
            }

            return $odpoved->json('access_token');
        });
    }

    /** Klíč servisního účtu, nebo null, když není nastavený nebo je poškozený. */
    private function klic(): ?array
    {
        $json = null;
        if ($b64 = config('services.google_api.klic_json')) {
            $json = base64_decode((string) $b64, true) ?: null;
        } elseif (($soubor = config('services.google_api.klic_soubor')) && is_file($soubor)) {
            $json = file_get_contents($soubor);
        }
        $klic = $json ? json_decode($json, true) : null;

        return is_array($klic) && isset($klic['client_email'], $klic['private_key'], $klic['token_uri']) ? $klic : null;
    }
}
