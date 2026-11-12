<?php

namespace App\Console\Commands;

use App\Services\Pozemky\Geo;
use App\Services\Pozemky\Pozemky;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Ověří skutečnými dotazy, že služby pozemků v Evropě opravdu fungují tou cestou, kterou je volá editor
 * (Pozemky → zdroj země → národní služba). Pro každou zemi náhodná místa v obytných čtvrtích:
 *  - parcela v bodě: nalezena, bod leží uvnitř, výměra služby sedí s plochou obrysu (ověří osy a CRS),
 *  - okolní parcely a stavby,
 *  - výškový profil: pokrytí mřížky, rozumné hodnoty, srovnání s nezávislým EU-DEM 25 m (OpenTopoData).
 *
 *   php artisan pozemky:over                  všechny země, 3 místa
 *   php artisan pozemky:over --zeme=PL --mist=6 --seed=7
 */
class PozemkyOver extends Command
{
    protected $signature = 'pozemky:over {--zeme= : jen tyto země, čárkou} {--mist=3 : náhodných míst na zemi} {--seed= : opakovatelný výběr míst} {--bez-srovnani : bez kontroly proti EU-DEM}';

    protected $description = 'Ověří katastr a výšky v evropských zemích skutečnými dotazy na náhodná místa';

    /** Obytné čtvrti s rodinnými domy, raději kopcovité (srovnání výšek pak víc rozliší). */
    private const MISTA = [
        'CZ' => [[49.991, 14.654], [49.207, 16.687], [50.743, 15.077], [49.226, 17.667], [48.975, 14.474], [49.396, 15.591]],
        'SK' => [[48.236, 17.040], [49.223, 18.739], [48.736, 19.146], [48.708, 21.207], [49.001, 21.239], [48.309, 18.087]],
        'PL' => [[52.078, 21.023], [50.064, 19.876], [49.300, 19.950], [54.425, 18.483], [51.143, 16.873], [49.822, 19.044]],
        'FR' => [[45.797, 4.846], [45.899, 6.129], [43.611, 1.499], [48.121, -1.603], [48.530, 7.716], [45.774, 3.066]],
        'ES' => [[40.435, -3.813], [39.520, -0.411], [37.346, -5.928], [41.656, -0.877], [36.721, -4.421], [37.177, -3.599]],
        'IT' => [[41.876, 12.454], [45.000, 7.683], [44.494, 11.343], [43.806, 11.293], [40.846, 14.231], [45.438, 10.994]],
        // Německo: jedno místo v každé spolkové zemi kromě Bavorska (to bezplatnou WFS nemá)
        'DE' => [[48.730, 9.105], [52.430, 13.250], [52.400, 13.065], [53.098, 8.935], [53.650, 10.160], [50.180, 8.500],
            [54.050, 12.050], [52.470, 9.850], [50.686, 7.160], [49.985, 8.165], [49.280, 7.110], [51.110, 13.650],
            [51.510, 11.950], [53.790, 10.000], [50.980, 11.320]],
        'AT' => [[48.208, 16.373], [47.070, 15.439], [47.269, 11.404], [47.809, 13.055], [48.306, 14.286], [46.624, 14.307]],
    ];

    private int $chyb = 0;

    public function handle(Pozemky $pozemky): int
    {
        if ($this->option('seed') !== null) {
            mt_srand((int) $this->option('seed'));
        }
        $zeme = $this->option('zeme')
            ? array_map('trim', explode(',', strtoupper($this->option('zeme'))))
            : array_keys(config('pozemky.zeme'));

        foreach ($zeme as $kod) {
            if (!$pozemky->nastaveni($kod)) {
                $this->warn("{$kod}: země není v config/pozemky.php");
                continue;
            }
            $this->newLine();
            $this->info("══ {$kod} ══");
            $mista = self::MISTA[$kod] ?? [];
            shuffle($mista);
            foreach (array_slice($mista, 0, (int) $this->option('mist')) as [$lat, $lon]) {
                // Náhodně do 300 m od středu čtvrti
                $lat += (mt_rand(-1000, 1000) / 1000) * 300 / 111320;
                $lon += (mt_rand(-1000, 1000) / 1000) * 300 / (111320 * cos(deg2rad($lat)));
                $this->overMisto($pozemky, $kod, round($lat, 6), round($lon, 6));
            }
        }

        $this->newLine();
        if ($this->chyb) {
            $this->error("Chyb: {$this->chyb}");

            return self::FAILURE;
        }
        $this->info('Vše v pořádku.');

        return self::SUCCESS;
    }

    private function overMisto(Pozemky $pozemky, string $kod, float $lat, float $lon): void
    {
        $this->line("· {$lat}, {$lon}");
        $t = microtime(true);
        try {
            $vysledek = $pozemky->parcelaVBode($lat, $lon);
        } catch (\Throwable $e) {
            $this->chyba('parcela v bodě: ' . $e->getMessage());

            return;
        }
        $ms = (int) ((microtime(true) - $t) * 1000);
        $p = $vysledek['parcela'];
        if (!$p) {
            $this->chyba("parcela nenalezena (země {$vysledek['zeme']}, důvod {$vysledek['duvod']})");

            return;
        }
        if ($vysledek['zeme'] !== $kod) {
            $this->chyba("země {$vysledek['zeme']}, čekal jsem {$kod}");
        }
        $poly = $p['polygon_wgs84'];
        $uvnitr = Geo::bodVPolygonu($lat, $lon, $poly);
        $plocha = Geo::plocha($poly);
        $zprava = "parcela {$p['cislo']} ({$p['id']}), {$p['vymera']} m²" . ($p['vymera_vypoctena'] ? ' z obrysu' : '') . ", {$ms} ms";
        $this->ok($uvnitr, $zprava . ($uvnitr ? ', bod uvnitř' : ', BOD MIMO OBRYS'));
        if (!$p['vymera_vypoctena'] && $p['vymera'] > 0) {
            $pomer = $plocha / $p['vymera'];
            // Výměra z katastru vs plocha obrysu: přehozené osy nebo špatná projekce dají úplně jiné číslo.
            // Menší rozdíl bývá v datech (výměra z písemného operátu, díra v parcele), jen upozornit.
            $text = sprintf('plocha obrysu %d m² proti úřední %d m² (%.2f×)', $plocha, $p['vymera'], $pomer);
            if ($pomer > 0.85 && $pomer < 1.18) {
                $this->ok(true, $text);
            } elseif ($pomer > 0.6 && $pomer < 1.6) {
                $this->line("    <fg=yellow>! {$text}, rozdíl v datech katastru</>");
            } else {
                $this->chyba($text);
            }
        }
        $this->ok($plocha > 5 && $plocha < 2_000_000, sprintf('plocha %d m² je rozumná', $plocha));

        // Okolí a stavby
        $nast = $pozemky->nastaveni($kod);
        $o = Geo::obalka($poly);
        $obalka = [
            'min_lat' => $o['min_lat'] - 0.0002, 'max_lat' => $o['max_lat'] + 0.0002,
            'min_lon' => $o['min_lon'] - 0.0003, 'max_lon' => $o['max_lon'] + 0.0003,
        ];
        if (($nast['okoli'] ?? true)) {
            try {
                $okoli = $pozemky->parcelyVOblasti($kod, $obalka);
                $this->ok(count($okoli) >= 2, 'okolní parcely: ' . count($okoli));
            } catch (\Throwable $e) {
                $this->chyba('okolní parcely: ' . $e->getMessage());
            }
        }
        try {
            $stavby = $pozemky->stavbyVOblasti($kod, $obalka);
            $this->line('    stavby v okolí: ' . count($stavby));
        } catch (\Throwable $e) {
            $this->chyba('stavby: ' . $e->getMessage());
        }

        if (!$pozemky->maVysky($kod)) {
            $this->line('    výšky: pro zemi nejsou');

            return;
        }
        if (Geo::plocha($poly) > 200_000) {
            $this->line('    výšky: velká parcela, přeskočeno');

            return;
        }
        $t = microtime(true);
        try {
            $profil = $pozemky->vyskovyProfil($kod, [$poly]);
        } catch (\Throwable $e) {
            $this->chyba('výšky: ' . $e->getMessage());

            return;
        }
        $ms = (int) ((microtime(true) - $t) * 1000);
        $ocekavano = max(1, count(Geo::mrizka($poly)));
        $pokryti = $profil['pocet_bodu'] / $ocekavano;
        $z = array_column($profil['body'], 2);
        $ruznych = count(array_unique(array_map(fn ($v) => round($v, 2), $z)));
        $this->ok($pokryti >= 0.9, sprintf('výšky: %d bodů z %d (%.0f %%), %s–%s m, %d různých hodnot, %d ms',
            $profil['pocet_bodu'], $ocekavano, $pokryti * 100, $profil['vyska_min'], $profil['vyska_max'], $ruznych, $ms));
        $this->ok($profil['vyska_min'] > -100 && $profil['vyska_max'] < 4000, 'výšky v rozumném rozsahu');
        if ($profil['pocet_bodu'] > 20) {
            $this->ok($ruznych > 1, 'výšky nejsou všude stejné');
        }

        if (!$this->option('bez-srovnani')) {
            $this->srovnej($profil['body']);
        }
    }

    /** Srovnání s EU-DEM 25 m (OpenTopoData, nezávislý zdroj). EU-DEM je hrubší a měří i povrch, rozdíl jednotky metrů je v pořádku. */
    private function srovnej(array $body): void
    {
        $vzorek = [];
        $krok = max(1, intdiv(count($body), 8));
        for ($i = 0; $i < count($body) && count($vzorek) < 8; $i += $krok) {
            $vzorek[] = $body[$i];
        }
        try {
            sleep(1); // veřejné API: nejvýš 1 dotaz za sekundu
            $o = Http::timeout(30)->get('https://api.opentopodata.org/v1/eudem25m', [
                'locations' => implode('|', array_map(fn ($b) => "{$b[0]},{$b[1]}", $vzorek)),
            ]);
            $ref = array_column($o->json('results') ?? [], 'elevation');
        } catch (\Throwable $e) {
            $this->warn('    srovnání s EU-DEM nedostupné: ' . $e->getMessage());

            return;
        }
        $rozdily = [];
        foreach ($vzorek as $i => $b) {
            if (isset($ref[$i]) && is_numeric($ref[$i])) {
                $rozdily[] = $b[2] - $ref[$i];
            }
        }
        if (!$rozdily) {
            $this->warn('    srovnání s EU-DEM: bez dat');

            return;
        }
        sort($rozdily);
        $median = $rozdily[intdiv(count($rozdily), 2)];
        // EU-DEM měří i stromy a střechy, model terénu bývá v lese a zástavbě níž (záporný rozdíl).
        // Kladný rozdíl nad pár metrů ukazuje chybu (výška nad elipsoidem, posun místa).
        $text = sprintf('srovnání s EU-DEM 25 m: medián rozdílu %+.1f m (%d bodů)', $median, count($rozdily));
        if ($median > -8 && $median < 6) {
            $this->ok(true, $text);
        } elseif ($median >= -25 && $median <= -8) {
            $this->line("    <fg=yellow>! {$text}, nejspíš les nebo zástavba</>");
        } else {
            $this->chyba($text);
        }
    }

    private function ok(bool $v, string $text): void
    {
        if ($v) {
            $this->line("    <fg=green>✓</> {$text}");
        } else {
            $this->chyba($text);
        }
    }

    private function chyba(string $text): void
    {
        $this->chyb++;
        $this->line("    <fg=red>✗ {$text}</>");
    }
}
