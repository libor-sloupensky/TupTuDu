<?php

namespace App\Services\Pozemky;

use RuntimeException;

/**
 * Čtečka malých výškových rastrů GeoTIFF (výřez z WCS, dlaždice COG). Bez GDAL, čisté PHP.
 *
 * Umí: TIFF i BigTIFF, oba pořadí bajtů, pruhy i dlaždice, bez komprese, Deflate a LZW,
 * prediktor 2 a 3, celá čísla 8–32 b a desetinná 32/64 b, jedno pásmo.
 * Georeference: ModelTransformation nebo ModelTiepoint + ModelPixelScale, PixelIsArea/Point.
 * Souřadnice vrací v CRS rastru (to zná volající, GeoTIFF jen přepočte pixel ↔ x, y).
 */
class GeoTiff
{
    public int $sirka;
    public int $vyska;

    /** Afinní převod pixel (sloupec, řádek) → x, y: [a, b, c, d, e, f], x = a·s + b·r + c, y = d·s + e·r + f. */
    private array $afin;

    /** Hodnoty po řádcích, null = bez dat. */
    private array $hodnoty = [];

    private ?float $nodata = null;

    /** Hlavička bez dat (pro COG, kde se dlaždice dočítají po částech). */
    public array $ifd = [];
    public string $poradi = '<';
    public bool $big = false;

    public static function zDat(string $bin): self
    {
        $g = new self();
        $g->nactiHlavicku($bin);
        $g->nactiVse($bin);

        return $g;
    }

    /** Jen hlavička z prvních bajtů souboru (COG má IFD na začátku). */
    public static function hlavicka(string $zacatek): self
    {
        $g = new self();
        $g->nactiHlavicku($zacatek);

        return $g;
    }

    public function nactiHlavicku(string $bin): void
    {
        if (strlen($bin) < 16) {
            throw new RuntimeException('GeoTIFF: příliš krátká data');
        }
        $bo = substr($bin, 0, 2);
        if ($bo === 'II') {
            $this->poradi = '<';
        } elseif ($bo === 'MM') {
            $this->poradi = '>';
        } else {
            throw new RuntimeException('Služba nevrátila rastr: ' . mb_substr(trim(strip_tags($bin)), 0, 200));
        }
        $magic = $this->cislo($bin, 2, 3);
        $this->big = $magic === 43;
        if ($magic !== 42 && $magic !== 43) {
            throw new RuntimeException('GeoTIFF: chybná hlavička');
        }
        $off = $this->big ? $this->cislo($bin, 8, 16) : $this->cislo($bin, 4, 4);
        $pocet = $this->big ? $this->cislo($bin, $off, 16) : $this->cislo($bin, $off, 3);
        $vel = $this->big ? 20 : 12;
        $p = $off + ($this->big ? 8 : 2);

        $ifd = [];
        for ($i = 0; $i < $pocet; $i++) {
            $z = $p + $i * $vel;
            if ($z + $vel > strlen($bin)) {
                throw new RuntimeException('GeoTIFF: hlavička za koncem načtených dat');
            }
            $tag = $this->cislo($bin, $z, 3);
            $typ = $this->cislo($bin, $z + 2, 3);
            $cnt = $this->big ? $this->cislo($bin, $z + 4, 16) : $this->cislo($bin, $z + 4, 4);
            $velTypu = [1 => 1, 2 => 1, 3 => 2, 4 => 4, 5 => 8, 6 => 1, 7 => 1, 8 => 2, 9 => 4, 10 => 8, 11 => 4, 12 => 8, 16 => 8, 17 => 8][$typ] ?? 1;
            $delka = $velTypu * $cnt;
            $poleHodnoty = $z + ($this->big ? 12 : 8);
            $mista = $this->big ? 8 : 4;
            $start = $delka <= $mista ? $poleHodnoty : ($this->big ? $this->cislo($bin, $poleHodnoty, 16) : $this->cislo($bin, $poleHodnoty, 4));
            if ($start + $delka > strlen($bin)) {
                // Hodnota mimo načtená data (velké tabulky dlaždic v COG): zapamatovat pozici
                $ifd[$tag] = ['odkaz' => $start, 'typ' => $typ, 'pocet' => $cnt];
                continue;
            }
            $ifd[$tag] = $this->hodnotyTagu(substr($bin, $start, $delka), $typ, $cnt);
        }
        $this->ifd = $ifd;

        $this->sirka = (int) ($ifd[256][0] ?? 0);
        $this->vyska = (int) ($ifd[257][0] ?? 0);
        if (isset($ifd[42113]) && is_string($ifd[42113])) {
            $nd = trim($ifd[42113], "\0 ");
            $this->nodata = is_numeric($nd) ? (float) $nd : null;
        }
        $this->afin = $this->spoctiAfin();
    }

    private function spoctiAfin(): array
    {
        $ifd = $this->ifd;
        // Raster typ z GeoKeys: 1025 = GTRasterTypeGeoKey, 1 PixelIsArea (výchozí), 2 PixelIsPoint
        $jeBod = false;
        if (isset($ifd[34735]) && is_array($ifd[34735])) {
            $k = $ifd[34735];
            for ($i = 4; $i + 3 < count($k); $i += 4) {
                if ($k[$i] === 1025 && $k[$i + 1] === 0) {
                    $jeBod = $k[$i + 3] === 2;
                }
            }
        }
        // Posun půl pixelu: hodnota pixelu patří jeho středu
        $p = $jeBod ? 0.0 : 0.5;

        if (isset($ifd[34264]) && is_array($ifd[34264]) && count($ifd[34264]) >= 8) {
            $m = $ifd[34264];

            return [$m[0], $m[1], $m[3] + $m[0] * $p + $m[1] * $p, $m[4], $m[5], $m[7] + $m[4] * $p + $m[5] * $p];
        }
        if (isset($ifd[33550], $ifd[33922]) && is_array($ifd[33550]) && is_array($ifd[33922])) {
            [$sx, $sy] = $ifd[33550];
            [$i, $j, , $x, $y] = $ifd[33922];

            return [$sx, 0.0, $x + ($p - $i) * $sx, 0.0, -$sy, $y - ($p - $j) * $sy];
        }

        throw new RuntimeException('GeoTIFF: chybí georeference');
    }

    /** Převod x, y v CRS rastru na (sloupec, řádek) středů pixelů jako desetinná čísla. */
    public function naPixel(float $x, float $y): array
    {
        [$a, $b, $c, $d, $e, $f] = $this->afin;
        $det = $a * $e - $b * $d;
        $dx = $x - $c;
        $dy = $y - $f;

        return [($e * $dx - $b * $dy) / $det, ($a * $dy - $d * $dx) / $det];
    }

    /** Výška v bodě (x, y v CRS rastru), bilineárně ze čtyř sousedních pixelů. */
    public function hodnota(float $x, float $y): ?float
    {
        [$s, $r] = $this->naPixel($x, $y);
        $s0 = (int) floor($s);
        $r0 = (int) floor($r);
        $ts = $s - $s0;
        $tr = $r - $r0;

        $v = [];
        foreach ([[0, 0], [1, 0], [0, 1], [1, 1]] as [$ds, $dr]) {
            $v[] = $this->pixel(max(0, min($this->sirka - 1, $s0 + $ds)), max(0, min($this->vyska - 1, $r0 + $dr)));
        }
        if ($s < -0.5 || $r < -0.5 || $s > $this->sirka - 0.5 || $r > $this->vyska - 0.5) {
            return null;
        }
        if (in_array(null, $v, true)) {
            // Na okraji dat bez interpolace: nejbližší platný pixel
            $nej = $this->pixel((int) round(max(0, min($this->sirka - 1, $s))), (int) round(max(0, min($this->vyska - 1, $r))));

            return $nej;
        }

        return ($v[0] * (1 - $ts) + $v[1] * $ts) * (1 - $tr) + ($v[2] * (1 - $ts) + $v[3] * $ts) * $tr;
    }

    public function pixel(int $s, int $r): ?float
    {
        return $this->hodnoty[$r * $this->sirka + $s] ?? null;
    }

    /** Načte celý rastr (malé výřezy z WCS). */
    private function nactiVse(string $bin): void
    {
        $ifd = $this->ifd;
        $this->hodnoty = array_fill(0, $this->sirka * $this->vyska, null);

        if (isset($ifd[322])) {
            $tw = (int) $ifd[322][0];
            $th = (int) $ifd[323][0];
            $offsety = $ifd[324];
            $delky = $ifd[325];
            $naRadek = (int) ceil($this->sirka / $tw);
            foreach ($offsety as $i => $off) {
                $vals = $this->dekoduj(substr($bin, (int) $off, (int) $delky[$i]), $tw, $th);
                $this->vlozBlok($vals, ($i % $naRadek) * $tw, intdiv($i, $naRadek) * $th, $tw, $th);
            }

            return;
        }

        $rps = (int) ($ifd[278][0] ?? $this->vyska);
        foreach ($ifd[273] as $i => $off) {
            $radku = min($rps, $this->vyska - $i * $rps);
            $vals = $this->dekoduj(substr($bin, (int) $off, (int) $ifd[279][$i]), $this->sirka, $radku);
            $this->vlozBlok($vals, 0, $i * $rps, $this->sirka, $radku);
        }
    }

    /** Vloží dlaždici nebo pruh do rastru (okrajové dlaždice přesahují, přebytek se zahodí). */
    public function vlozBlok(array $vals, int $x0, int $y0, int $w, int $h): void
    {
        for ($r = 0; $r < $h; $r++) {
            $y = $y0 + $r;
            if ($y >= $this->vyska) {
                break;
            }
            for ($s = 0; $s < $w; $s++) {
                $x = $x0 + $s;
                if ($x >= $this->sirka) {
                    continue;
                }
                $v = $vals[$r * $w + $s] ?? null;
                if ($v !== null && ($this->nodata !== null && abs($v - $this->nodata) < 1e-3 * max(1, abs($this->nodata)) || abs($v) > 1e20 || $v < -1000 || is_nan($v))) {
                    $v = null;
                }
                $this->hodnoty[$y * $this->sirka + $x] = $v;
            }
        }
    }

    /** Rozbalí jednu dlaždici nebo pruh na pole čísel. */
    public function dekoduj(string $data, int $w, int $h): array
    {
        $ifd = $this->ifd;
        $komprese = (int) ($ifd[259][0] ?? 1);
        $bity = (int) ($ifd[258][0] ?? 8);
        $format = (int) ($ifd[339][0] ?? 1);
        $prediktor = (int) ($ifd[317][0] ?? 1);
        $bajty = intdiv($bity, 8);

        $data = match ($komprese) {
            1 => $data,
            8, 32946 => $this->inflate($data),
            5 => $this->lzw($data),
            default => throw new RuntimeException("GeoTIFF: nepodporovaná komprese {$komprese}"),
        };

        if ($prediktor === 3) {
            $data = $this->prediktorFloat($data, $w, $h, $bajty);
            // Po prediktoru 3 jsou bajty vždy v pořadí big-endian
            $kod = $bajty === 8 ? 'E*' : 'G*';

            return array_values(unpack($kod, $data));
        }

        $le = $this->poradi === '<';
        $kod = match (true) {
            $format === 3 && $bajty === 4 => $le ? 'g*' : 'G*',
            $format === 3 && $bajty === 8 => $le ? 'e*' : 'E*',
            $bajty === 1 => $format === 2 ? 'c*' : 'C*',
            $bajty === 2 => $le ? 'v*' : 'n*',
            $bajty === 4 => $le ? 'V*' : 'N*',
            default => throw new RuntimeException("GeoTIFF: nepodporovaný formát {$bity} b"),
        };
        $hodnoty = array_values(unpack($kod, $data));
        if ($format === 2 && $bajty === 2) {
            $hodnoty = array_map(fn ($v) => $v >= 32768 ? $v - 65536 : $v, $hodnoty);
        } elseif ($format === 2 && $bajty === 4) {
            $hodnoty = array_map(fn ($v) => $v >= 2147483648 ? $v - 4294967296 : $v, $hodnoty);
        }
        if ($prediktor === 2) {
            for ($r = 0; $r < $h; $r++) {
                for ($s = 1; $s < $w; $s++) {
                    $hodnoty[$r * $w + $s] += $hodnoty[$r * $w + $s - 1];
                }
            }
        }

        return $hodnoty;
    }

    private function inflate(string $data): string
    {
        $vystup = @zlib_decode($data);
        if ($vystup === false) {
            throw new RuntimeException('GeoTIFF: nepodařilo se rozbalit Deflate');
        }

        return $vystup;
    }

    /** Prediktor 3 (desetinná čísla): rozdíly po bajtech, pak přeskládání bajtů. */
    private function prediktorFloat(string $data, int $w, int $h, int $bajty): string
    {
        $vystup = '';
        $radek = $w * $bajty;
        for ($r = 0; $r < $h; $r++) {
            $b = array_values(unpack('C*', substr($data, $r * $radek, $radek)));
            for ($i = 1; $i < $radek; $i++) {
                $b[$i] = ($b[$i] + $b[$i - 1]) & 0xFF;
            }
            $r2 = '';
            for ($s = 0; $s < $w; $s++) {
                for ($k = 0; $k < $bajty; $k++) {
                    $r2 .= chr($b[$k * $w + $s]);
                }
            }
            $vystup .= $r2;
        }

        return $vystup;
    }

    /** Dekodér LZW podle specifikace TIFF 6.0. */
    private function lzw(string $data): string
    {
        $slovnik = [];
        for ($i = 0; $i < 256; $i++) {
            $slovnik[$i] = chr($i);
        }
        $dalsi = 258;
        $sirkaKodu = 9;
        $bitu = 0;
        $zasobnik = 0;
        $vystup = '';
        $predchozi = null;
        $n = strlen($data);
        for ($p = 0; $p < $n;) {
            while ($bitu < $sirkaKodu && $p < $n) {
                $zasobnik = ($zasobnik << 8) | ord($data[$p++]);
                $bitu += 8;
            }
            if ($bitu < $sirkaKodu) {
                break;
            }
            $kod = ($zasobnik >> ($bitu - $sirkaKodu)) & ((1 << $sirkaKodu) - 1);
            $bitu -= $sirkaKodu;
            $zasobnik &= (1 << $bitu) - 1;

            if ($kod === 256) {
                $slovnik = array_slice($slovnik, 0, 256);
                $dalsi = 258;
                $sirkaKodu = 9;
                $predchozi = null;
                continue;
            }
            if ($kod === 257) {
                break;
            }
            if ($predchozi === null) {
                $vystup .= $slovnik[$kod];
                $predchozi = $slovnik[$kod];
                continue;
            }
            $zaznam = $slovnik[$kod] ?? ($predchozi . $predchozi[0]);
            $vystup .= $zaznam;
            $slovnik[$dalsi++] = $predchozi . $zaznam[0];
            $predchozi = $zaznam;
            if ($dalsi + 1 >= (1 << $sirkaKodu) && $sirkaKodu < 12) {
                $sirkaKodu++;
            }
        }

        return $vystup;
    }

    private function cislo(string $bin, int $off, int $typ): int
    {
        return match ($typ) {
            3 => unpack($this->poradi === '<' ? 'v' : 'n', substr($bin, $off, 2))[1],
            4 => unpack($this->poradi === '<' ? 'V' : 'N', substr($bin, $off, 4))[1],
            16 => unpack($this->poradi === '<' ? 'P' : 'J', substr($bin, $off, 8))[1],
        };
    }

    private function hodnotyTagu(string $raw, int $typ, int $cnt): array|string
    {
        $le = $this->poradi === '<';

        return match ($typ) {
            2 => $raw,
            1, 7 => array_values(unpack('C*', $raw)),
            3 => array_values(unpack($le ? 'v*' : 'n*', $raw)),
            4 => array_values(unpack($le ? 'V*' : 'N*', $raw)),
            16 => array_values(unpack($le ? 'P*' : 'J*', $raw)),
            11 => array_values(unpack($le ? 'g*' : 'G*', $raw)),
            12 => array_values(unpack($le ? 'e*' : 'E*', $raw)),
            5 => (function () use ($raw, $le) {
                $v = array_values(unpack($le ? 'V*' : 'N*', $raw));
                $o = [];
                for ($i = 0; $i + 1 < count($v); $i += 2) {
                    $o[] = $v[$i + 1] ? $v[$i] / $v[$i + 1] : 0;
                }

                return $o;
            })(),
            default => [],
        };
    }
}
