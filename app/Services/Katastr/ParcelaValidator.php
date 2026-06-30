<?php

namespace App\Services\Katastr;

class ParcelaValidator
{
    /**
     * Ověří, zda nová parcela sousedí s alespoň jednou ze stávajících parcel.
     * Dvě parcely sousedí, pokud sdílejí alespoň jednu hraniční úsečku (ne jen bod).
     *
     * @param array $novaParcela Polygon nové parcely (S-JTSK)
     * @param array $stavajiciParcely Pole polygonů stávajících parcel
     * @param float $tolerance Tolerance pro porovnání souřadnic (metry)
     */
    public function sousediSNekterou(array $novaParcela, array $stavajiciParcely, float $tolerance = 0.5): bool
    {
        if (empty($stavajiciParcely)) {
            return true; // První parcela — vždy OK
        }

        foreach ($stavajiciParcely as $stavajici) {
            if ($this->sdilejiHranu($novaParcela, $stavajici, $tolerance)) {
                return true;
            }
            // Stavební parcela uvnitř pozemkové (nebo naopak) = sousedí
            if ($this->polygonObsahujeBod($stavajici, $novaParcela[0], $tolerance)
                || $this->polygonObsahujeBod($novaParcela, $stavajici[0], $tolerance)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Sjednotí polygony sousedících parcel do jednoho vnějšího polygonu.
     * Jednoduchá implementace — vrátí konvexní obal všech bodů.
     */
    public function sjednotPolygony(array $polygony): array
    {
        if (count($polygony) === 1) {
            return $polygony[0];
        }

        // Sloučit všechny body
        $vsechnyBody = [];
        foreach ($polygony as $polygon) {
            foreach ($polygon as $bod) {
                $vsechnyBody[] = $bod;
            }
        }

        return $this->konvexniObal($vsechnyBody);
    }

    /**
     * Zkontroluje, zda dva polygony sdílejí alespoň jednu hranu.
     */
    private function sdilejiHranu(array $polygonA, array $polygonB, float $tolerance): bool
    {
        $hranyA = $this->extrahuHrany($polygonA);
        $hranyB = $this->extrahuHrany($polygonB);

        foreach ($hranyA as $hranaA) {
            foreach ($hranyB as $hranaB) {
                if ($this->hranySeKryji($hranaA, $hranaB, $tolerance)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Extrahuje hrany (úsečky) z polygonu.
     */
    private function extrahuHrany(array $polygon): array
    {
        $hrany = [];
        $n = count($polygon);
        for ($i = 0; $i < $n; $i++) {
            $j = ($i + 1) % $n;
            $hrany[] = [$polygon[$i], $polygon[$j]];
        }
        return $hrany;
    }

    /**
     * Zjistí, zda se dvě hrany překrývají (sdílejí úsek, ne jen bod).
     */
    private function hranySeKryji(array $hranaA, array $hranaB, float $tolerance): bool
    {
        // Zkontrolovat, zda alespoň dva body jedné hrany leží na druhé hraně
        // a naopak — to indikuje sdílenou úsečku

        // Jednodušší přístup: obě hrany jsou kolineární a překrývají se
        [$a1, $a2] = $hranaA;
        [$b1, $b2] = $hranaB;

        // Bod leží blízko úsečky?
        $b1NaA = $this->bodBlizkoUsecky($b1, $a1, $a2, $tolerance);
        $b2NaA = $this->bodBlizkoUsecky($b2, $a1, $a2, $tolerance);
        $a1NaB = $this->bodBlizkoUsecky($a1, $b1, $b2, $tolerance);
        $a2NaB = $this->bodBlizkoUsecky($a2, $b1, $b2, $tolerance);

        // Sdílená hrana = alespoň jeden koncový bod jedné hrany leží na druhé
        // a zároveň alespoň jeden koncový bod druhé leží na první
        $pocetShod = ($b1NaA ? 1 : 0) + ($b2NaA ? 1 : 0) + ($a1NaB ? 1 : 0) + ($a2NaB ? 1 : 0);

        return $pocetShod >= 2;
    }

    /**
     * Zjistí, zda bod leží blízko úsečky (v rámci tolerance).
     */
    private function bodBlizkoUsecky(array $bod, array $useckaA, array $useckaB, float $tolerance): bool
    {
        $px = $bod[0];
        $py = $bod[1];
        $ax = $useckaA[0];
        $ay = $useckaA[1];
        $bx = $useckaB[0];
        $by = $useckaB[1];

        $dx = $bx - $ax;
        $dy = $by - $ay;
        $delka2 = $dx * $dx + $dy * $dy;

        if ($delka2 < 0.0001) {
            // Degenerovaná úsečka (bod)
            $vzdalenost = sqrt(($px - $ax) ** 2 + ($py - $ay) ** 2);
            return $vzdalenost <= $tolerance;
        }

        // Projekce bodu na přímku
        $t = (($px - $ax) * $dx + ($py - $ay) * $dy) / $delka2;
        $t = max(0, min(1, $t));

        $projX = $ax + $t * $dx;
        $projY = $ay + $t * $dy;

        $vzdalenost = sqrt(($px - $projX) ** 2 + ($py - $projY) ** 2);

        return $vzdalenost <= $tolerance;
    }

    /**
     * Ray-casting: zjistí, zda bod leží uvnitř polygonu.
     */
    private function polygonObsahujeBod(array $polygon, array $bod, float $tolerance = 0): bool
    {
        $x = $bod[0];
        $y = $bod[1];
        $n = count($polygon);
        $inside = false;

        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $xi = $polygon[$i][0]; $yi = $polygon[$i][1];
            $xj = $polygon[$j][0]; $yj = $polygon[$j][1];

            if ((($yi > $y) !== ($yj > $y))
                && ($x < ($xj - $xi) * ($y - $yi) / ($yj - $yi) + $xi)) {
                $inside = !$inside;
            }
        }

        return $inside;
    }

    /**
     * Konvexní obal (Graham scan).
     */
    private function konvexniObal(array $body): array
    {
        if (count($body) < 3) return $body;

        // Najít bod s nejmenším Y (a při shodě nejmenším X)
        usort($body, function ($a, $b) {
            if (abs($a[1] - $b[1]) < 0.001) return $a[0] <=> $b[0];
            return $a[1] <=> $b[1];
        });

        $pivot = $body[0];

        // Seřadit podle úhlu od pivota
        $ostatni = array_slice($body, 1);
        usort($ostatni, function ($a, $b) use ($pivot) {
            $uhelA = atan2($a[1] - $pivot[1], $a[0] - $pivot[0]);
            $uhelB = atan2($b[1] - $pivot[1], $b[0] - $pivot[0]);
            if (abs($uhelA - $uhelB) < 0.0001) {
                $distA = ($a[0] - $pivot[0]) ** 2 + ($a[1] - $pivot[1]) ** 2;
                $distB = ($b[0] - $pivot[0]) ** 2 + ($b[1] - $pivot[1]) ** 2;
                return $distA <=> $distB;
            }
            return $uhelA <=> $uhelB;
        });

        $stack = [$pivot, $ostatni[0]];
        for ($i = 1; $i < count($ostatni); $i++) {
            while (count($stack) > 1) {
                $top = end($stack);
                $prev = $stack[count($stack) - 2];
                $cross = ($top[0] - $prev[0]) * ($ostatni[$i][1] - $prev[1])
                       - ($top[1] - $prev[1]) * ($ostatni[$i][0] - $prev[0]);
                if ($cross <= 0) {
                    array_pop($stack);
                } else {
                    break;
                }
            }
            $stack[] = $ostatni[$i];
        }

        return $stack;
    }
}
