<?php

namespace App\Support;

use App\Models\KonkurenceHodnota;
use App\Models\KonkurenceMereni;
use App\Models\KonkurenceParametr;
use App\Models\Konkurent;
use App\Models\KonkurenceUdalost;
use Illuminate\Support\Facades\DB;

/**
 * Načte analýzu konkurence z JSON do DB (modules/konkurence.md, část Import).
 * Všechno se páruje podle klíčů, import jde pustit opakovaně. Režim u existujících
 * parametrů a konkurentů nepřepisuje (nastavuje ho Libor přepínači), jen s $prepsatRezim.
 *
 * Tvar: { parametry: [{klic, skupina, nazev, …}], konkurenti: [{klic, nazev, segment, …}],
 *         mereni: [{datum, nazev, poznamka, prevzit_z?, hodnoty: [{konkurent, parametr, hodnota, …}]}],
 *         udalosti: [{konkurent, datum, typ, popis, zdroj}] }
 */
class KonkurenceImport
{
    public static function importuj(array $data, bool $prepsatRezim = false): array
    {
        $souhrn = ['parametry' => 0, 'konkurenti' => 0, 'mereni' => 0, 'hodnoty' => 0, 'prevzato' => 0, 'udalosti' => 0, 'chyby' => []];

        DB::transaction(function () use ($data, $prepsatRezim, &$souhrn) {
            foreach ($data['parametry'] ?? [] as $i => $p) {
                $p['poradi'] ??= $i;
                self::ulozPodleKlice(KonkurenceParametr::class, $p, $prepsatRezim);
                $souhrn['parametry']++;
            }
            foreach ($data['konkurenti'] ?? [] as $i => $k) {
                $k['poradi'] ??= $i;
                self::ulozPodleKlice(Konkurent::class, $k, $prepsatRezim);
                $souhrn['konkurenti']++;
            }

            $parametry = KonkurenceParametr::pluck('id', 'klic');
            $konkurenti = Konkurent::pluck('id', 'klic');

            foreach ($data['mereni'] ?? [] as $m) {
                $mereni = KonkurenceMereni::updateOrCreate(
                    ['datum' => $m['datum']],
                    array_filter(['nazev' => $m['nazev'] ?? null, 'poznamka' => $m['poznamka'] ?? null], fn ($v) => $v !== null),
                );
                $souhrn['mereni']++;

                // Úplný snímek: hodnoty z minulého kola, které tohle kolo neověřilo, se převezmou
                if (! empty($m['prevzit_z'])) {
                    $souhrn['prevzato'] += self::prevezmi($m['prevzit_z'], $mereni);
                }

                foreach ($m['hodnoty'] ?? [] as $h) {
                    $kId = $konkurenti[$h['konkurent']] ?? null;
                    $pId = $parametry[$h['parametr']] ?? null;
                    if (! $kId || ! $pId) {
                        $souhrn['chyby'][] = "Neznámý konkurent nebo parametr: {$h['konkurent']} / {$h['parametr']}";
                        continue;
                    }
                    KonkurenceHodnota::updateOrCreate(
                        ['mereni_id' => $mereni->id, 'konkurent_id' => $kId, 'parametr_id' => $pId],
                        [
                            'hodnota' => $h['hodnota'] ?? null,
                            'placene' => (bool) ($h['placene'] ?? false),
                            'cislo' => $h['cislo'] ?? null,
                            'data' => $h['data'] ?? null,
                            'text' => $h['text'] ?? null,
                            'poznamka' => $h['poznamka'] ?? null,
                            'poznamky' => $h['poznamky'] ?? null,
                            'zdroj' => $h['zdroj'] ?? null,
                            'doklad' => $h['doklad'] ?? null,
                            'doklad_v' => $h['doklad_v'] ?? null,
                            'overeno' => $h['overeno'] ?? $m['datum'],
                        ],
                    );
                    $souhrn['hodnoty']++;
                }
            }

            foreach ($data['udalosti'] ?? [] as $u) {
                $kId = $konkurenti[$u['konkurent']] ?? null;
                if (! $kId) {
                    $souhrn['chyby'][] = "Neznámý konkurent u události: {$u['konkurent']}";
                    continue;
                }
                KonkurenceUdalost::firstOrCreate(
                    ['konkurent_id' => $kId, 'datum' => $u['datum'], 'popis' => mb_substr($u['popis'], 0, 500)],
                    ['typ' => $u['typ'] ?? 'funkce', 'zdroj' => $u['zdroj'] ?? null],
                );
                $souhrn['udalosti']++;
            }
        });

        // Nové stránky srovnání ať jsou v patičce hned (SrovnaniController::verzePrehledu)
        \Illuminate\Support\Facades\Cache::forget('srovnani-jazyky-prehledu');

        return $souhrn;
    }

    /** Založí nebo doplní řádek podle klíče; režim existujícího řádku nechá, pokud se nemá přepsat. */
    private static function ulozPodleKlice(string $model, array $radek, bool $prepsatRezim): void
    {
        $existujici = $model::where('klic', $radek['klic'])->first();
        if ($existujici && ! $prepsatRezim) {
            unset($radek['rezim']);
        }
        $model::updateOrCreate(['klic' => $radek['klic']], $radek);
    }

    /** Zkopíruje hodnoty z kola s datem $zDatum, které v cílovém kole ještě nejsou. Vrací počet. */
    private static function prevezmi(string $zDatum, KonkurenceMereni $cil): int
    {
        $zdroj = KonkurenceMereni::whereDate('datum', $zDatum)->first();
        if (! $zdroj || $zdroj->id === $cil->id) {
            return 0;
        }
        $pocet = 0;
        $uz = KonkurenceHodnota::where('mereni_id', $cil->id)->get()
            ->mapWithKeys(fn ($h) => [$h->konkurent_id . '-' . $h->parametr_id => true]);
        foreach (KonkurenceHodnota::where('mereni_id', $zdroj->id)->get() as $h) {
            if (isset($uz[$h->konkurent_id . '-' . $h->parametr_id])) {
                continue;
            }
            $kopie = $h->replicate(['id', 'created_at', 'updated_at']);
            $kopie->mereni_id = $cil->id;
            $kopie->save();
            $pocet++;
        }

        return $pocet;
    }
}
