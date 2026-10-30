<?php

namespace App\Console\Commands;

use App\Support\Tarif;
use Illuminate\Console\Command;
use Laravel\Paddle\Cashier;

/**
 * Založí v Paddlu produkty a ceny placených tarifů podle config/tarify.php a jejich ID
 * zapíše do .env. Testovací (sandbox) a ostrý účet jsou v Paddlu úplně oddělené → spustit
 * pro každý zvlášť (s jeho klíčem). Opakované spuštění nic nezdvojí: produkt a cenu pozná
 * podle custom_data; změněná částka v configu = nová cena (stará zůstane stávajícím předplatným).
 *
 *   php artisan paddle:katalog --zapsat                      produkty a ceny
 *   php artisan paddle:katalog --zapsat --token              + klíč pro prohlížeč (client-side token)
 *   php artisan paddle:katalog --zapsat --webhook=https://…/paddle/webhook
 *                                                            + cíl zpráv z Paddlu a jeho tajný klíč
 *
 * Tajné hodnoty se jen zapíšou do .env, na výstup jdou zamaskované. Viz modules/platby.md.
 */
class PaddleKatalog extends Command
{
    protected $signature = 'paddle:katalog
        {--zapsat : Zapsat ID a klíče do .env (jinak jen vypíše)}
        {--token : Založit i client-side token pro Paddle.js}
        {--webhook= : Založit cíl zpráv z Paddlu na tuto adresu (…/paddle/webhook)}
        {--odkaz= : Nastavit výchozí odkaz pokladny (https://app.tuptudu.com/billing)}
        {--github : Zapsat hodnoty i do GitHub secrets (gh secret set) pro nasazení}';

    protected $description = 'Založí v Paddlu produkty a ceny tarifů (config/tarify.php) a zapíše jejich ID do .env';

    /** Zprávy, které zpracovává Laravel Cashier (Laravel\Paddle\Http\Controllers\WebhookController). */
    private const UDALOSTI = [
        'customer.updated',
        'transaction.completed',
        'transaction.updated',
        'subscription.created',
        'subscription.updated',
        'subscription.paused',
        'subscription.canceled',
    ];

    private const NAZVY = ['stavebnik' => 'TupTuDu Stavebník', 'profi' => 'TupTuDu Profi'];

    private array $env = [];

    public function handle(): int
    {
        $klic = (string) config('cashier.api_key');
        if ($klic === '') {
            $this->error('V .env chybí PADDLE_API_KEY.');

            return self::FAILURE;
        }
        // Testovací účet = klíč pdl_sdbx_… (AppServiceProvider podle něj přepne cashier.sandbox)
        $sandbox = (bool) config('cashier.sandbox');
        $this->info('Účet: ' . ($sandbox ? 'testovací (sandbox)' : 'OSTRÝ'));

        $produkty = Cashier::api('GET', 'products', ['status' => 'active', 'include' => 'prices', 'per_page' => 200])['data'];

        foreach (Tarif::PLACENE as $tarif) {
            $produkt = collect($produkty)->first(fn ($p) => ($p['custom_data']['tuptudu_tarif'] ?? null) === $tarif)
                ?? $this->zalozProdukt($tarif);
            $this->env['PADDLE_PRODUKT_' . strtoupper($tarif)] = $produkt['id'];

            foreach (Tarif::OBDOBI as $obdobi) {
                $cena = $this->najdiCenu($produkt['prices'] ?? [], $tarif, $obdobi) ?? $this->zalozCenu($produkt['id'], $tarif, $obdobi);
                $this->env['PADDLE_CENA_' . strtoupper($tarif) . '_' . strtoupper($obdobi)] = $cena['id'];
            }
        }

        if ($this->option('token')) {
            $token = Cashier::api('POST', 'client-tokens', [
                'name' => 'TupTuDu ' . ($sandbox ? 'lokálně' : 'web'),
                'description' => 'Paddle.js — platební okno (partials/paddle-js)',
            ])['data'];
            $this->env['PADDLE_CLIENT_SIDE_TOKEN'] = $token['token'];
            $this->line('Client-side token založen: ' . $token['id']);
        }

        // Výchozí odkaz pokladny — bez něj se platební okno neotevře (ostrý účet: jen schválená doména)
        if ($odkaz = $this->option('odkaz')) {
            Cashier::api('PATCH', 'settings/checkout-url', ['default_url' => $odkaz]);
            $this->line('Výchozí odkaz pokladny: ' . $odkaz);
        }

        if ($adresa = $this->option('webhook')) {
            $cil = Cashier::api('POST', 'notification-settings', [
                'description' => 'TupTuDu — ' . parse_url($adresa, PHP_URL_HOST),
                'type' => 'url',
                'destination' => $adresa,
                'subscribed_events' => self::UDALOSTI,
                'traffic_source' => 'all',
                'api_version' => 1,
                'include_sensitive_fields' => false,
            ])['data'];
            $this->env['PADDLE_WEBHOOK_SECRET'] = $cil['endpoint_secret_key'];
            $this->line('Cíl zpráv založen: ' . $cil['id'] . ' → ' . $adresa);
        }

        $this->newLine();
        foreach ($this->env as $nazev => $hodnota) {
            $tajne = in_array($nazev, ['PADDLE_WEBHOOK_SECRET'], true);
            $this->line($nazev . '=' . ($tajne ? substr($hodnota, 0, 8) . '…' : $hodnota));
        }

        if ($this->option('zapsat')) {
            $this->zapisDoEnv();
            $this->info('Zapsáno do .env — spusť `php artisan config:clear`, pokud je config v cache.');
        }

        // GitHub secrets čte deploy.yml při nasazení; hodnota jde do gh přes stdin, ne v příkazu
        if ($this->option('github')) {
            foreach ($this->env as $nazev => $hodnota) {
                $proces = \Illuminate\Support\Facades\Process::input($hodnota)->path(base_path())->run(['gh', 'secret', 'set', $nazev]);
                $this->line(($proces->successful() ? 'GitHub secret ' : 'CHYBA GitHub secret ') . $nazev
                    . ($proces->successful() ? '' : ': ' . trim($proces->errorOutput())));
            }
        }

        return self::SUCCESS;
    }

    private function zalozProdukt(string $tarif): array
    {
        $produkt = Cashier::api('POST', 'products', [
            'name' => self::NAZVY[$tarif],
            'tax_category' => 'saas',
            'description' => 'TupTuDu — online concept of a new build or renovation (' . $tarif . ' plan).',
            'custom_data' => ['tuptudu_tarif' => $tarif],
        ])['data'];
        $produkt['prices'] = [];
        $this->line('Produkt založen: ' . $produkt['id'] . ' (' . self::NAZVY[$tarif] . ')');

        return $produkt;
    }

    /** Aktivní cena s naším označením a částkami podle configu. */
    private function najdiCenu(array $ceny, string $tarif, string $obdobi): ?array
    {
        $chci = $this->teloCeny('', $tarif, $obdobi);

        foreach ($ceny as $cena) {
            if (($cena['status'] ?? null) !== 'active'
                || ($cena['custom_data']['tuptudu_obdobi'] ?? null) !== $obdobi
                || ($cena['unit_price'] ?? null) != $chci['unit_price']) {
                continue;
            }
            $prepis = collect($cena['unit_price_overrides'] ?? [])->first(fn ($o) => in_array('CZ', $o['country_codes'], true));
            if (($prepis['unit_price'] ?? null) == $chci['unit_price_overrides'][0]['unit_price']) {
                return $cena;
            }
        }

        return null;
    }

    private function zalozCenu(string $produktId, string $tarif, string $obdobi): array
    {
        $cena = Cashier::api('POST', 'prices', $this->teloCeny($produktId, $tarif, $obdobi))['data'];
        $this->line('Cena založena: ' . $cena['id'] . ' (' . self::NAZVY[$tarif] . ', ' . $obdobi . ')');

        return $cena;
    }

    /**
     * Cena v Paddlu: základ v eurech, pro Česko pevně v korunách. Částky v haléřích/centech
     * jako text. tax_mode internal = ceny včetně DPH (firma s DIČ z EU ji má odečtenou).
     */
    private function teloCeny(string $produktId, string $tarif, string $obdobi): array
    {
        $haleru = fn (string $mena) => (string) (int) round(Tarif::cena($tarif, $obdobi, $mena) * 100);

        return [
            'product_id' => $produktId,
            'description' => self::NAZVY[$tarif] . ' — ' . ($obdobi === 'mesic' ? 'měsíčně' : 'ročně'),
            'billing_cycle' => ['interval' => $obdobi === 'mesic' ? 'month' : 'year', 'frequency' => 1],
            'tax_mode' => 'internal',
            'unit_price' => ['amount' => $haleru('EUR'), 'currency_code' => 'EUR'],
            'unit_price_overrides' => [
                ['country_codes' => ['CZ'], 'unit_price' => ['amount' => $haleru('CZK'), 'currency_code' => 'CZK']],
            ],
            'custom_data' => ['tuptudu_tarif' => $tarif, 'tuptudu_obdobi' => $obdobi],
        ];
    }

    /** Přepíše (nebo doplní) řádky KLIC=hodnota v .env. */
    private function zapisDoEnv(): void
    {
        $soubor = base_path('.env');
        $obsah = file_get_contents($soubor);

        foreach ($this->env as $nazev => $hodnota) {
            $radek = $nazev . '=' . $hodnota;
            $obsah = preg_match('/^' . preg_quote($nazev, '/') . '=.*$/m', $obsah)
                ? preg_replace('/^' . preg_quote($nazev, '/') . '=.*$/m', str_replace(['\\', '$'], ['\\\\', '\\$'], $radek), $obsah)
                : rtrim($obsah) . PHP_EOL . $radek . PHP_EOL;
        }

        file_put_contents($soubor, $obsah);
    }
}
