<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Pozemky\Geo;
use App\Services\Pozemky\Parcela;
use App\Services\Pozemky\ZdrojParcel;
use App\Services\Pozemky\ZdrojVysek;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Polsko: GUGiK. Parcela v bodě přes ULDK (Usługa Lokalizacji Działek Katastralnych),
 * výšky z NMT (model terénu 1 m z LiDARu) přes službu GetHByPointList v PL-1992 (EPSG:2180).
 * ULDK neumí dotaz na obálku, okolní parcely a stavby proto Polsko nemá.
 */
class Polsko implements ZdrojParcel, ZdrojVysek
{
    private const ULDK = 'https://uldk.gugik.gov.pl/';
    private const NMT = 'https://services.gugik.gov.pl/nmt/';
    private const DAVKA = 150;

    public function parcelaVBode(float $lat, float $lon): ?array
    {
        // ULDK občas místo výsledku vrátí chybu (12. 11. 2026 jednou z pěti pokusů), druhý pokus projde.
        // „-1 brak wyników“ znamená, že v bodě opravdu nic není, to se neopakuje.
        for ($pokus = 1; $pokus <= 2; $pokus++) {
            $text = Http::timeout(20)->retry(2, 300, fn ($e) => $e instanceof \Illuminate\Http\Client\ConnectionException)->get(self::ULDK, [
                'request' => 'GetParcelByXY',
                'xy' => sprintf('%.7f,%.7f,4326', $lon, $lat),
                'result' => 'id,voivodeship,county,commune,region,parcel,geom_wkt',
                'srid' => '4326',
            ])->throw()->body();
            $radky = preg_split('/\r?\n/', trim($text));
            if (($radky[0] ?? '') === '0' || str_contains($text, 'brak wynik')) {
                break;
            }
            \Illuminate\Support\Facades\Log::warning('ULDK neočekávaná odpověď: ' . mb_substr($text, 0, 200));
        }
        if (($radky[0] ?? '') !== '0' || !isset($radky[1])) {
            return null;
        }
        $pole = explode('|', $radky[1]);
        if (count($pole) < 7) {
            return null;
        }
        [$id, , , $obec, $obreb, $cislo, $wkt] = $pole;
        $polygon = Geo::zWkt($wkt);
        if (count($polygon) < 3) {
            return null;
        }

        return Parcela::sestav('PL', $id, $cislo, $polygon, null, [
            'obec' => $obec ?: null,
            'ku_nazev' => $obreb ?: null,
            'typ' => 'pozemkova',
        ]);
    }

    public function parcelyVOblasti(array $obalka): array
    {
        return [];
    }

    public function stavbyVOblasti(array $obalka): array
    {
        return [];
    }

    public function vysky(array $body): array
    {
        // PL-1992: x = sever, y = východ (geodetické pořadí), služba bere „x y“
        $pl = array_map(function ($b) {
            [$e, $n] = Geo::tm($b[0], $b[1], 19, 0.9993, 500000, -5300000);

            return sprintf('%.2f %.2f', $n, $e);
        }, $body);

        $davky = array_chunk($pl, self::DAVKA, true);
        $odpovedi = Http::pool(fn (Pool $pool) => array_map(
            fn ($d) => $pool->timeout(25)->get(self::NMT, ['request' => 'GetHByPointList', 'list' => implode(',', $d)]),
            $davky
        ));

        $vysky = array_fill(0, count($body), null);
        foreach ($davky as $i => $davka) {
            $o = $odpovedi[$i] ?? null;
            if (!$o instanceof \Illuminate\Http\Client\Response || !$o->successful()) {
                throw new RuntimeException('NMT GUGiK neodpověděla');
            }
            $trojice = explode(',', trim($o->body()));
            $klice = array_keys($davka);
            foreach ($trojice as $j => $t) {
                $c = preg_split('/\s+/', trim($t));
                if (count($c) >= 3 && is_numeric($c[2]) && isset($klice[$j])) {
                    $v = (float) $c[2];
                    $vysky[$klice[$j]] = $v > -100 ? $v : null;
                }
            }
        }

        return $vysky;
    }
}
