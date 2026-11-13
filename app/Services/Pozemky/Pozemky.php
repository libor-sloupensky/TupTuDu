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

    /** Okolní parcely, z mezipaměti serveru (Mezipamet), národní služba jen poprvé a při tiché obnově. */
    public function parcelyVOblasti(string $zeme, array $obalka): array
    {
        if (!$this->zdrojParcel($zeme)) {
            return [];
        }

        return app(Mezipamet::class)->ziskej('okoli', $zeme, $obalka, fn () => $this->spoctiCerstve('okoli', $zeme, $obalka));
    }

    /** Stavby v okolí, z mezipaměti serveru jako okolní parcely. */
    public function stavbyVOblasti(string $zeme, array $obalka): array
    {
        if (!$this->zdrojParcel($zeme)) {
            return [];
        }

        return app(Mezipamet::class)->ziskej('stavby', $zeme, $obalka, fn () => $this->spoctiCerstve('stavby', $zeme, $obalka));
    }

    /**
     * Data přímo z národní služby, bez mezipaměti (první načtení a tichá obnova pozemky:obnovit).
     * @param string $druh vysky | okoli | stavby
     */
    public function spoctiCerstve(string $druh, string $zeme, array $parametry): array
    {
        return match ($druh) {
            'okoli' => $this->zdrojParcel($zeme)?->parcelyVOblasti($parametry) ?? [],
            'stavby' => $this->zdrojParcel($zeme)?->stavbyVOblasti($parametry) ?? [],
            'vysky' => $this->vyskovyProfilCerstvy($zeme, $parametry),
        };
    }

    /**
     * Výškový profil pro polygony pozemku: mřížka po 2 m, výšky z modelu terénu země.
     * Tvar výstupu jako u ČR (Dmr5gService): body [[lat, lon, z], ...] a souhrny.
     */
    public function vyskovyProfil(string $zeme, array $polygony): array
    {
        if (!$this->zdrojVysek($zeme)) {
            throw new RuntimeException(__('ed_nastroje.katastr.vysky_zeme_nejsou'));
        }

        return app(Mezipamet::class)->ziskej('vysky', $zeme, $polygony, fn () => $this->vyskovyProfilCerstvy($zeme, $polygony));
    }

    private function vyskovyProfilCerstvy(string $zeme, array $polygony): array
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
        // Falešné nuly: služba místo výšky vrátí 0,0 (Polsko celé dávky, 12. 11. 2026). Na pozemku, který
        // jinak leží výš než 5 m nad mořem, je přesná nula chyba, ne terén.
        $platne = array_values(array_filter($z, fn ($v) => $v !== null));
        sort($platne);
        $median = $platne ? $platne[intdiv(count($platne), 2)] : 0;
        if (abs($median) > 5) {
            $z = array_map(fn ($v) => ($v !== null && abs($v) < 0.001) ? null : $v, $z);
        }
        $vystup = [];
        foreach ($body as $i => $b) {
            if (isset($z[$i]) && $z[$i] !== null) {
                $vystup[] = [$b[0], $b[1], round($z[$i], 2)];
            }
        }
        if (!$vystup) {
            throw new RuntimeException(__('ed_nastroje.katastr.vysky_nedostupne'));
        }

        return $this->souhrn($vystup) + ['zeme' => $zeme];
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
