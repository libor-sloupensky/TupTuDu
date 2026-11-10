<?php

namespace App\Console\Commands;

use App\Services\Google\GoogleApi;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Zeptá se Googlu na stav adres ze sitemapy (URL Inspection) a uloží dnešní počet
 * zaindexovaných. Search Console historii počtu v API nedává, proto si ji skládáme sami —
 * graf v Masterteamu se plní ode dne prvního běhu (modules/statistiky.md).
 *
 * Běží z cronu každou hodinu, každou adresu ale kontroluje nejvýš jednou za 20 hodin.
 * Jeden běh má časový strop (cron je webový požadavek), zbytek dobere další běh.
 */
class IndexaceKontrola extends Command
{
    protected $signature = 'indexace:kontrola {--vse : Zkontrolovat všechny adresy hned, bez ohledu na stáří a časový strop}';

    protected $description = 'Uloží, kolik adres ze sitemapy má Google v indexu';

    /** Po kolika hodinách se adresa kontroluje znovu. */
    private const STARI_H = 20;

    /** Časový strop jednoho běhu v sekundách; nová dávka se po něm už nezačne. */
    private const STROP_S = 35;

    /** Souběžných dotazů v dávce (limit Googlu: 600 za minutu, 2 000 denně na web). */
    private const DAVKA = 25;

    public function handle(GoogleApi $google): int
    {
        if (! $google->nastaveno()) {
            $this->line('indexace: klíč Google API není nastavený, přeskočeno');

            return self::SUCCESS;
        }

        $zacatek = microtime(true);
        $vse = (bool) $this->option('vse');
        $zkontrolovano = 0;
        $chyby = [];

        try {
            $this->srovnejSeSitemapou();

            $cekajici = DB::table('indexace_url')
                ->when(! $vse, fn ($q) => $q->where(fn ($q) => $q->whereNull('zkontrolovano_v')
                    ->orWhere('zkontrolovano_v', '<', now()->subHours(self::STARI_H))))
                ->orderByRaw('zkontrolovano_v IS NOT NULL, zkontrolovano_v')
                ->limit(1500)
                ->pluck('adresa')
                ->all();

            @set_time_limit(300);
            foreach (array_chunk($cekajici, self::DAVKA) as $davka) {
                if (! $vse && microtime(true) - $zacatek > self::STROP_S) {
                    break;
                }
                foreach ($google->stavIndexace($davka) as $adresa => $v) {
                    // Adresa, na kterou Google neodpověděl, si nechá předchozí stav a zkusí se příště
                    if (isset($v['chyba'])) {
                        $chyby[] = $v['chyba'];

                        continue;
                    }
                    DB::table('indexace_url')->where('adresa', $adresa)->update([
                        'zaindexovano' => $v['zaindexovano'],
                        'stav' => mb_substr($v['stav'], 0, 190),
                        'prochazeno' => $v['prochazeno'] ? Carbon::parse($v['prochazeno'])->setTimezone(config('app.timezone')) : null,
                        'robot' => $v['robot'] ? mb_substr($v['robot'], 0, 30) : null,
                        'zkontrolovano_v' => now(),
                    ]);
                    $zkontrolovano++;
                }
            }
        } catch (\Throwable $e) {
            Log::error('Indexace: kontrola selhala — ' . $e->getMessage());
            $this->line('indexace: CHYBA ' . $e->getMessage());

            return self::FAILURE;
        }

        if ($chyby && $zkontrolovano === 0) {
            Log::error('Indexace: Google neodpověděl na žádnou adresu — ' . $chyby[0]);
            $this->line('indexace: CHYBA ' . $chyby[0]);

            return self::FAILURE;
        }

        // Dnešní součet jen z adres, které už Google aspoň jednou posoudil
        $posouzene = DB::table('indexace_url')->whereNotNull('zkontrolovano_v');
        $adres = (clone $posouzene)->count();
        $zaindexovano = (clone $posouzene)->where('zaindexovano', true)->count();
        if ($adres > 0) {
            DB::table('indexace_denne')->upsert(
                [['den' => today()->toDateString(), 'adres' => $adres, 'zaindexovano' => $zaindexovano]],
                ['den'],
                ['adres', 'zaindexovano'],
            );
        }

        $this->line("indexace: {$zaindexovano} z {$adres} adres v indexu, teď zkontrolováno {$zkontrolovano}"
            . ($chyby ? ', bez odpovědi ' . count($chyby) : ''));

        return self::SUCCESS;
    }

    /** Nové adresy ze sitemapy založí (čekají na první kontrolu), zmizelé smaže. */
    private function srovnejSeSitemapou(): void
    {
        $sitemapa = config('services.google_api.sitemapa');
        $odpoved = Http::timeout(30)->get($sitemapa);
        if (! $odpoved->successful()) {
            throw new \RuntimeException("sitemapa {$sitemapa} vrátila HTTP " . $odpoved->status());
        }
        preg_match_all('~<loc>\s*([^<\s]+)\s*</loc>~', $odpoved->body(), $shody);
        $adresy = array_values(array_unique(array_map('html_entity_decode', $shody[1])));
        if (! $adresy) {
            throw new \RuntimeException("sitemapa {$sitemapa} neobsahuje žádnou adresu");
        }

        DB::table('indexace_url')->insertOrIgnore(array_map(
            fn ($adresa) => ['adresa' => $adresa, 'stav' => 'čeká na první kontrolu'],
            $adresy
        ));
        DB::table('indexace_url')->whereNotIn('adresa', $adresy)->delete();
    }
}
