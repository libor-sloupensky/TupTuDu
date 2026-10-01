<?php

namespace App\Services\Koncept;

/**
 * Sbírá úsečky kresby po hladinách a rovnou je přepočítává do souřadnic
 * vykreslené strany (body PDF, počátek vlevo nahoře — jako SVG z poppleru).
 *
 * Oddělené od čtečky, aby průchod operátory nemusel tahat stav kolem sebe.
 */
class VrstvySberac
{
    /** @var array<string, array<int, array{0: float, 1: float, 2: float, 3: float}>> */
    public array $usecky = [];

    public function __construct(
        private float $sirka,
        private float $vyska,
        private int $otoceni,
    ) {
    }

    /** Úsečka v uživatelském prostoru PDF; bez hladiny se zahazuje. */
    public function uloz(?string $hladina, array $ctm, float $x1, float $y1, float $x2, float $y2): void
    {
        if ($hladina === null || $hladina === '') {
            return;
        }

        [$ax, $ay] = $this->bod($ctm, $x1, $y1);
        [$bx, $by] = $this->bod($ctm, $x2, $y2);

        // Nulové úsečky jen nadouvají výstup — stejných bodů je v CADu hodně.
        if (abs($ax - $bx) < 0.01 && abs($ay - $by) < 0.01) {
            return;
        }

        $this->usecky[$hladina][] = [
            round($ax, 2), round($ay, 2), round($bx, 2), round($by, 2),
        ];
    }

    /**
     * PDF má počátek vlevo dole a osu y nahoru, vykreslená strana vlevo nahoře
     * a y dolů. Otočení strany (/Rotate) poppler při vykreslení použije,
     * takže se musí složit do téhož převodu — jinak sedí rozměry, ale ne poloha.
     */
    private function bod(array $ctm, float $px, float $py): array
    {
        $X = $ctm[0] * $px + $ctm[2] * $py + $ctm[4];
        $Y = $ctm[1] * $px + $ctm[3] * $py + $ctm[5];

        return match ($this->otoceni) {
            90 => [$this->vyska - $Y, $this->sirka - $X],
            180 => [$this->sirka - $X, $Y],
            270 => [$Y, $X],
            default => [$X, $this->vyska - $Y],
        };
    }
}
