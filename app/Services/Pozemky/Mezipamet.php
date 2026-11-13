<?php

namespace App\Services\Pozemky;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Mezipaměť dat pozemků na našem serveru (Libor 13. 11. 2026: „nemusí se načítat z národních serverů
 * při každém načtení stránky, jednou za čas tiše aktualizovat“). Tabulka pozemky_cache.
 *
 * - Editor dostane uložená data hned, i když národní služba zrovna neběží.
 * - Poprvé se ptá služby; uloží se jen úspěšná odpověď (zdroje při chybě hlásí výjimku, ne prázdno).
 * - Obnova je tichá v plánovači (pozemky:obnovit): zastaralé a nedávno používané záznamy po malých dávkách.
 *   Když služba neodpoví, zůstanou stará data.
 * Licence dat to dovolují (CC BY 4.0, dl-de, Licence Ouverte, otevřená data ČÚZK a GUGiK); dlaždice
 * Mapy.com se neukládají, podmínky Mapy.com to nepovolují.
 */
class Mezipamet
{
    /**
     * @param string $druh vysky | okoli | stavby
     * @param callable $nacti fn () => array, dotaz na národní službu
     */
    public function ziskej(string $druh, string $zeme, array $parametry, callable $nacti): array
    {
        $klic = self::klic($druh, $zeme, $parametry);
        $radek = DB::table('pozemky_cache')->where('klic', $klic)->first();
        if ($radek) {
            DB::table('pozemky_cache')->where('id', $radek->id)->update(['pouzito_v' => now()]);

            return json_decode($radek->data, true) ?? [];
        }

        $data = $nacti();
        DB::table('pozemky_cache')->insertOrIgnore([
            'klic' => $klic,
            'druh' => $druh,
            'zeme' => $zeme,
            'parametry' => json_encode($parametry),
            'data' => json_encode($data),
            'nacteno_v' => now(),
            'pouzito_v' => now(),
        ]);

        return $data;
    }

    /** Stejný klíč pro stejný pozemek: souřadnice zaokrouhlené na 7 desetin (cm). */
    public static function klic(string $druh, string $zeme, array $parametry): string
    {
        return sha1($druh . '|' . $zeme . '|' . json_encode(self::zaokrouhli($parametry)));
    }

    private static function zaokrouhli(mixed $v): mixed
    {
        if (is_array($v)) {
            return array_map([self::class, 'zaokrouhli'], $v);
        }

        return is_float($v) || (is_numeric($v) && !is_int($v)) ? round((float) $v, 7) : $v;
    }

    /**
     * Tichá obnova: zastaralé záznamy, které editor chtěl v posledních dnech, nejstarší první.
     * Vrací [obnoveno, chyb]. Neúspěšný záznam se zkusí znovu nejdřív za den.
     *
     * @param callable $spocti fn (string $druh, string $zeme, array $parametry): array
     */
    public function obnov(callable $spocti, int $limit): array
    {
        $nastaveni = config('pozemky.mezipamet');
        $obnoveno = 0;
        $chyb = 0;
        foreach ($nastaveni['stari_dni'] as $druh => $dni) {
            $radky = DB::table('pozemky_cache')
                ->where('druh', $druh)
                ->where('nacteno_v', '<', now()->subDays($dni))
                ->where('pouzito_v', '>', now()->subDays($nastaveni['pouzito_do_dni']))
                ->where(fn ($q) => $q->whereNull('chyba_v')->orWhere('chyba_v', '<', now()->subDay()))
                ->orderBy('nacteno_v')
                ->limit($limit - $obnoveno - $chyb)
                ->get();
            foreach ($radky as $r) {
                try {
                    $data = $spocti($druh, $r->zeme, json_decode($r->parametry, true));
                    DB::table('pozemky_cache')->where('id', $r->id)->update([
                        'data' => json_encode($data),
                        'nacteno_v' => now(),
                        'chyba_v' => null,
                    ]);
                    $obnoveno++;
                } catch (\Throwable $e) {
                    DB::table('pozemky_cache')->where('id', $r->id)->update(['chyba_v' => now()]);
                    Log::warning("Obnova pozemku {$druh} {$r->zeme} #{$r->id}: " . mb_substr($e->getMessage(), 0, 160));
                    $chyb++;
                }
            }
            if ($obnoveno + $chyb >= $limit) {
                break;
            }
        }

        return [$obnoveno, $chyb];
    }
}
