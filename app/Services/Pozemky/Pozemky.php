<?php

namespace App\Services\Pozemky;

use RuntimeException;

/**
 * Pozemky v Evropě: jeden vstup pro editor, zdroj dat podle místa (config/pozemky.php).
 * Země se určuje z polohy, ne ze země uživatele: Čech, který staví na Slovensku, dostane slovenský katastr.
 */
class Pozemky
{
    /** Největší strana obálky pozemku pro výškový profil (m), větší rastry by zahltily paměť. */
    private const MAX_STRANA_M = 1500;

    public function nastaveni(string $zeme): ?array
    {
        return config("pozemky.zeme.{$zeme}");
    }

    public function zdrojParcel(string $zeme): ?ZdrojParcel
    {
        $trida = $this->nastaveni($zeme)['parcely'] ?? null;

        return $trida ? app($trida) : null;
    }

    public function zdrojVysek(string $zeme): ?ZdrojVysek
    {
        $trida = $this->nastaveni($zeme)['vysky'] ?? null;

        return $trida ? app($trida) : null;
    }

    public function maVysky(string $zeme): bool
    {
        return !empty($this->nastaveni($zeme)['vysky']);
    }

    /**
     * Parcela v bodě. Nejdřív země podle hranic, u hranice i sousední.
     * @return array{zeme: ?string, parcela: ?array, duvod: ?string} duvod: mimo_evropu | bez_katastru | nenalezena
     */
    public function parcelaVBode(float $lat, float $lon): array
    {
        $zeme = Hranice::zeme($lat, $lon);
        $kandidati = array_values(array_unique(array_filter([$zeme, ...Hranice::blizke($lat, $lon)])));
        $sKatastrem = array_values(array_filter($kandidati, fn ($k) => $this->zdrojParcel($k) !== null));

        $chyba = null;
        foreach ($sKatastrem as $k) {
            try {
                $parcela = $this->zdrojParcel($k)->parcelaVBode($lat, $lon);
            } catch (\Throwable $e) {
                // Výpadek jedné služby u hranice nesmí shodit dotaz, když sousední zemi data má
                $chyba = $e;
                continue;
            }
            if ($parcela) {
                return ['zeme' => $k, 'parcela' => $parcela, 'duvod' => null];
            }
        }
        if ($chyba && count($sKatastrem) === 1) {
            throw $chyba;
        }

        return [
            'zeme' => $zeme,
            'parcela' => null,
            'duvod' => $zeme === null ? 'mimo_evropu' : ($sKatastrem ? 'nenalezena' : 'bez_katastru'),
        ];
    }

    public function parcelyVOblasti(string $zeme, array $obalka): array
    {
        return $this->zdrojParcel($zeme)?->parcelyVOblasti($obalka) ?? [];
    }

    public function stavbyVOblasti(string $zeme, array $obalka): array
    {
        return $this->zdrojParcel($zeme)?->stavbyVOblasti($obalka) ?? [];
    }

    /**
     * Výškový profil pro polygony pozemku: mřížka po 2 m, výšky z modelu terénu země.
     * Tvar výstupu jako u ČR (Dmr5gService): body [[lat, lon, z], ...] a souhrny.
     */
    public function vyskovyProfil(string $zeme, array $polygony): array
    {
        $zdroj = $this->zdrojVysek($zeme);
        if (!$zdroj) {
            throw new RuntimeException(__('ed_nastroje.katastr.vysky_zeme_nejsou'));
        }

        $body = [];
        foreach ($polygony as $polygon) {
            $o = Geo::obalka($polygon);
            $stranaM = max(
                Geo::vzdalenost([$o['min_lat'], $o['min_lon']], [$o['max_lat'], $o['min_lon']]),
                Geo::vzdalenost([$o['min_lat'], $o['min_lon']], [$o['min_lat'], $o['max_lon']])
            );
            if ($stranaM > self::MAX_STRANA_M) {
                throw new RuntimeException(__('ed_nastroje.katastr.pozemek_velky'));
            }
            array_push($body, ...Geo::mrizka($polygon));
        }
        if (!$body) {
            throw new RuntimeException(__('ed_nastroje.katastr.polygon_bez_bodu'));
        }

        $z = $zdroj->vysky($body);
        $vystup = [];
        foreach ($body as $i => $b) {
            if (isset($z[$i]) && $z[$i] !== null) {
                $vystup[] = [$b[0], $b[1], round($z[$i], 2)];
            }
        }
        if (!$vystup) {
            throw new RuntimeException(__('ed_nastroje.katastr.vysky_nedostupne'));
        }

        // Rozlišení modelu: editor u hrubšího modelu (Itálie 10 m) upozorní, že terén je orientační
        return $this->souhrn($vystup) + ['rozliseni' => $this->nastaveni($zeme)['rozliseni'] ?? null, 'zeme' => $zeme];
    }

    private function souhrn(array $body): array
    {
        $z = array_column($body, 2);

        return [
            'body' => $body,
            'pocet_bodu' => count($body),
            'vyska_min' => round(min($z), 1),
            'vyska_max' => round(max($z), 1),
            'vyskovy_rozdil' => round(max($z) - min($z), 1),
            'vyska_prumerna' => round(array_sum($z) / count($z), 1),
        ];
    }

    /**
     * Co je k dispozici v místě (mapa výběru pozemku se ptá po každém posunu):
     * země, spolková země, vrstva parcel nad mapou, jestli jde kliknout na parcelu a jestli jsou výšky.
     */
    public function infoBodu(float $lat, float $lon): array
    {
        $zeme = Hranice::zeme($lat, $lon);
        $z = $zeme ? $this->nastaveni($zeme) : null;
        $oblast = null;
        $wms = $z['wms'] ?? null;
        $parcely = !empty($z['parcely']);
        $vysky = !empty($z['vysky']);
        if ($z && isset($z['wms_oblasti'])) {
            $oblast = Hranice::zeme($lat, $lon, Hranice::SPOLKOVE_ZEME);
            $w = $oblast ? ($z['wms_oblasti'][$oblast] ?? null) : null;
            $wms = $w ? ['verze' => '1.3.0', 'crs' => 'EPSG:3857'] + $w : null;
            if ($zeme === 'DE') {
                $parcely = $oblast && in_array($oblast, Zdroje\Nemecko::zemeSKatastrem(), true);
                $vysky = $oblast && in_array($oblast, Zdroje\NemeckoVysky::zemeSVyskami(), true);
            }
        }

        return [
            'zeme' => $zeme,
            'oblast' => $oblast,
            'parcely' => $parcely,
            'okoli' => $z['okoli'] ?? true,
            'vysky' => $vysky,
            'wms' => $wms,
            'atribuce' => $z['atribuce'] ?? null,
        ];
    }
}
