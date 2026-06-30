<?php

namespace App\Services\Koncept;

/**
 * Konvertuje pudorys output.json (sample/14033/output.json) → paket reprezentace E.
 *
 * Paket E:
 *  - granularita: m / znak (default 0.25)
 *  - grid: ASCII (písmena = místnosti, '.' = mimo)
 *  - mistnosti: [{id, nazev, typ}]
 *  - otvory: [{typ, sirka_cm, mezi:[A,B], pozice_cm, otevira_do}]
 *  - vybaveni: [{typ, kategorie, v_mistnosti, u_steny, od_kraje_cm, sirka_cm, hloubka_cm}]
 *
 * POZOR: Pudorys output.json používá "Y nahoru" konvenci (Y v polygonech je záporné
 * pro objekty pod počátkem). Grid generujeme tak, že řádek 0 = nejvyšší Y.
 */
class PaketEKonvertor
{
    private const ABECEDA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    public function konvertuj(array $output, float $granularita = 0.25): array
    {
        $prostory = $output['prostory'] ?? [];
        $steny = $output['steny'] ?? [];
        $otvory = $output['otvory'] ?? [];
        $vybaveni = $output['vybaveni'] ?? [];

        if (empty($prostory)) {
            return ['granularita' => $granularita, 'grid' => '', 'mistnosti' => [], 'otvory' => [], 'vybaveni' => []];
        }

        // 1. Bbox všech polygonů (Y up — záporné hodnoty == dole na canvasu).
        [$minX, $maxX, $minY, $maxY] = $this->bbox($prostory);

        // 2. Mapování sample id → znak A/B/C
        $idLookup = [];
        foreach ($prostory as $i => $p) {
            $znak = self::ABECEDA[$i % strlen(self::ABECEDA)];
            $idLookup[$p['id'] ?? "P{$i}"] = $znak;
        }

        // 3. ASCII grid. Řádek 0 (nejvyšší Y) = nahoře.
        $gridW = (int) ceil(($maxX - $minX) / $granularita);
        $gridH = (int) ceil(($maxY - $minY) / $granularita);
        $gridLines = [];
        for ($r = 0; $r < $gridH; $r++) {
            $row = '';
            $py = $maxY - ($r + 0.5) * $granularita;
            for ($c = 0; $c < $gridW; $c++) {
                $px = $minX + ($c + 0.5) * $granularita;
                $znak = '.';
                foreach ($prostory as $i => $p) {
                    if ($this->pointInPolygon($px, $py, $p['polygon'] ?? [])) {
                        $znak = self::ABECEDA[$i % strlen(self::ABECEDA)];
                        break;
                    }
                }
                $row .= $znak;
            }
            $gridLines[] = $row;
        }

        // 4. Mistnosti
        $mistnostiE = [];
        foreach ($prostory as $i => $p) {
            $mistnostiE[] = [
                'id' => self::ABECEDA[$i % strlen(self::ABECEDA)],
                'nazev' => $p['nazev'] ?? "Místnost " . ($i + 1),
                'typ' => $p['typ'] ?? 'Undefined',
            ];
        }

        // 5. Otvory — mapovat na mezi: [A, B] na základě sousednosti polygonů se stěnou
        $stenaById = [];
        foreach ($steny as $s) $stenaById[$s['id']] = $s;

        $otvoryE = [];
        foreach ($otvory as $o) {
            $w = $stenaById[$o['stena'] ?? ''] ?? null;
            if (!$w) continue;

            $sousedy = [];
            foreach ($prostory as $i => $p) {
                if ($this->stenaTouchesPolygon($w, $p['polygon'] ?? [])) {
                    $sousedy[] = self::ABECEDA[$i % strlen(self::ABECEDA)];
                }
            }
            $sousedy = array_values(array_unique($sousedy));

            // Pokud má stěna jen 1 souseda → druhý je obvod ('.')
            $mezi = count($sousedy) >= 2 ? array_slice($sousedy, 0, 2) : [$sousedy[0] ?? '.', '.'];

            $typ = $o['typ'] ?? 'dvere';
            $sirkaCm = (int) round(($o['sirka'] ?? 0.9) * 100);
            $pozCm = (int) round(($o['pozice'] ?? 0) * 100);

            // Mapování smer_otvirani → otevira_do.
            // Pudorys output: "left_in"/"right_in"/"left_out"/"right_out".
            // 'in' = otevírá se DOVNITŘ první místnosti (lex. menší znak)
            // 'out' = ven (do druhé místnosti)
            $otevira_do = null;
            if ($typ !== 'okno' && !empty($mezi)) {
                sort($mezi);
                $smer = $o['smer_otvirani'] ?? 'left_in';
                $otevira_do = str_ends_with($smer, '_out') ? ($mezi[1] ?? null) : ($mezi[0] ?? null);
            }

            $rec = [
                'typ' => $typ,
                'sirka_cm' => $sirkaCm,
                'mezi' => $mezi,
                'pozice_cm' => $pozCm,
            ];
            if ($otevira_do) $rec['otevira_do'] = $otevira_do;
            $otvoryE[] = $rec;
        }

        // 6. Vybaveni — pro každý kus zjistit místnost a stranu
        $vybaveniE = [];
        foreach ($vybaveni as $v) {
            $stred = $v['stred'] ?? null;
            if (!$stred || count($stred) < 2) continue;

            // Pudorys formát: stred = [x, y_up]
            $vMistnosti = null;
            $bbox = null;
            foreach ($prostory as $i => $p) {
                if ($this->pointInPolygon($stred[0], $stred[1], $p['polygon'] ?? [])) {
                    $vMistnosti = self::ABECEDA[$i % strlen(self::ABECEDA)];
                    $bbox = $this->bboxJednoho($p['polygon']);
                    break;
                }
            }
            if (!$vMistnosti || !$bbox) continue;

            $sirka = $v['sirka'] ?? 0;
            $hloubka = $v['hloubka'] ?? 0;
            // Y up → 'S' = sever = nejvyšší Y (maxY); 'J' = jih = nejnižší (minY).
            $dN = $bbox['maxY'] - $stred[1];
            $dJ = $stred[1] - $bbox['minY'];
            $dV = $bbox['maxX'] - $stred[0];
            $dZ = $stred[0] - $bbox['minX'];
            $minD = min($dN, $dJ, $dV, $dZ);
            $strana = $minD === $dN ? 'S' : ($minD === $dJ ? 'J' : ($minD === $dV ? 'V' : 'Z'));

            // od_kraje: pro S/J měříme od západního kraje (minX); pro V/Z od severního (maxY).
            if ($strana === 'S' || $strana === 'J') {
                $odKraje = $stred[0] - $bbox['minX'] - $sirka / 2;
            } else {
                $odKraje = $bbox['maxY'] - $stred[1] - $sirka / 2;
            }

            $vybaveniE[] = [
                'typ' => $v['typ'] ?? 'Generic',
                'kategorie' => $v['kategorie'] ?? null,
                'v_mistnosti' => $vMistnosti,
                'u_steny' => $strana,
                'od_kraje_cm' => max(0, (int) round($odKraje * 100)),
                'sirka_cm' => (int) round($sirka * 100),
                'hloubka_cm' => (int) round($hloubka * 100),
            ];
        }

        return [
            'granularita' => $granularita,
            'grid' => implode("\n", $gridLines),
            'mistnosti' => $mistnostiE,
            'otvory' => $otvoryE,
            'vybaveni' => $vybaveniE,
        ];
    }

    private function bbox(array $prostory): array
    {
        $minX = INF; $maxX = -INF; $minY = INF; $maxY = -INF;
        foreach ($prostory as $p) {
            foreach ($p['polygon'] ?? [] as [$x, $y]) {
                $minX = min($minX, $x); $maxX = max($maxX, $x);
                $minY = min($minY, $y); $maxY = max($maxY, $y);
            }
        }
        return [$minX, $maxX, $minY, $maxY];
    }

    private function bboxJednoho(array $polygon): array
    {
        $xs = array_column($polygon, 0);
        $ys = array_column($polygon, 1);
        return [
            'minX' => min($xs), 'maxX' => max($xs),
            'minY' => min($ys), 'maxY' => max($ys),
        ];
    }

    private function pointInPolygon(float $px, float $py, array $polygon): bool
    {
        $inside = false;
        $n = count($polygon);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            [$xi, $yi] = $polygon[$i];
            [$xj, $yj] = $polygon[$j];
            if (($yi > $py) !== ($yj > $py) && $px < ($xj - $xi) * ($py - $yi) / ($yj - $yi) + $xi) {
                $inside = !$inside;
            }
        }
        return $inside;
    }

    /**
     * True pokud stěna (úsečka od → do) leží na hranici polygonu.
     * Heuristika: oba konce stěny jsou na nějaké hraně polygonu (tolerance).
     */
    private function stenaTouchesPolygon(array $stena, array $polygon): bool
    {
        $od = $stena['od'] ?? null;
        $do = $stena['do'] ?? null;
        if (!$od || !$do || count($polygon) < 3) return false;

        return $this->pointOnPolygonEdge($od[0], $od[1], $polygon)
            && $this->pointOnPolygonEdge($do[0], $do[1], $polygon);
    }

    private function pointOnPolygonEdge(float $px, float $py, array $polygon, float $tol = 0.05): bool
    {
        $n = count($polygon);
        for ($i = 0; $i < $n; $i++) {
            [$x1, $y1] = $polygon[$i];
            [$x2, $y2] = $polygon[($i + 1) % $n];
            $d = $this->pointToSegmentDist($px, $py, $x1, $y1, $x2, $y2);
            if ($d < $tol) return true;
        }
        return false;
    }

    private function pointToSegmentDist(float $px, float $py, float $x1, float $y1, float $x2, float $y2): float
    {
        $dx = $x2 - $x1; $dy = $y2 - $y1;
        $lenSq = $dx * $dx + $dy * $dy;
        if ($lenSq < 1e-9) return sqrt(($px - $x1) ** 2 + ($py - $y1) ** 2);
        $t = max(0.0, min(1.0, (($px - $x1) * $dx + ($py - $y1) * $dy) / $lenSq));
        $projX = $x1 + $t * $dx;
        $projY = $y1 + $t * $dy;
        return sqrt(($px - $projX) ** 2 + ($py - $projY) ** 2);
    }
}
