<?php

namespace App\Services\Pozemky;

use RuntimeException;

/**
 * Textový rastr ESRI ASCII Grid (WCS „ArcGrid“, „text/plain“): hlavička ncols, nrows, xll/yll, cellsize,
 * pak hodnoty po řádcích od severu. Španělsko ho posílá v obálce multipart/related (jako GeoTIFF
 * dává jen celé metry), Itálie (TINITALY) přímo. Výška v bodě bilineárně jako GeoTiff::hodnota.
 */
class AsciiGrid
{
    private int $sloupcu;
    private int $radku;
    private float $x0;     // střed levého horního pixelu
    private float $y0;
    private float $dx;
    private float $dy;
    private array $hodnoty;

    public static function zTextu(string $text): self
    {
        // Obálka multipart: vzít první část s hlavičkou ncols
        if (($i = stripos($text, 'ncols')) === false) {
            throw new RuntimeException('Služba nevrátila rastr: ' . mb_substr(trim(strip_tags($text)), 0, 200));
        }
        $text = substr($text, $i);
        if (preg_match('/\r?\n--[^\r\n]+/', $text, $m, PREG_OFFSET_CAPTURE)) {
            $text = substr($text, 0, $m[0][1]);
        }

        $g = new self();
        $hlava = [];
        $radky = preg_split('/\r?\n/', trim($text));
        $i = 0;
        while ($i < count($radky) && preg_match('/^\s*([a-zA-Z_]+)\s+(\S+)\s*$/', $radky[$i], $m)) {
            $hlava[strtolower($m[1])] = (float) $m[2];
            $i++;
        }
        $g->sloupcu = (int) ($hlava['ncols'] ?? 0);
        $g->radku = (int) ($hlava['nrows'] ?? 0);
        // Čtvercová buňka (cellsize), nebo po převzorkování zvlášť dx a dy (Španělsko mimo mřížku 5 m)
        $g->dx = (float) ($hlava['cellsize'] ?? $hlava['dx'] ?? 0);
        $g->dy = (float) ($hlava['cellsize'] ?? $hlava['dy'] ?? 0);
        if (!$g->sloupcu || !$g->radku || !$g->dx || !$g->dy) {
            throw new RuntimeException('ASCII Grid: neúplná hlavička');
        }
        $nodata = $hlava['nodata_value'] ?? -9999.0;
        // xllcorner = levý dolní roh rastru, xllcenter = střed levého dolního pixelu
        $xStred = isset($hlava['xllcenter']) ? $hlava['xllcenter'] : ($hlava['xllcorner'] ?? 0) + $g->dx / 2;
        $yStred = isset($hlava['yllcenter']) ? $hlava['yllcenter'] : ($hlava['yllcorner'] ?? 0) + $g->dy / 2;
        $g->x0 = $xStred;
        $g->y0 = $yStred + ($g->radku - 1) * $g->dy;

        $cisla = preg_split('/\s+/', trim(implode(' ', array_slice($radky, $i))));
        $g->hodnoty = array_map(fn ($v) => (!is_numeric($v) || abs((float) $v - $nodata) < 1e-6 || (float) $v < -1000) ? null : (float) $v, $cisla);
        if (count($g->hodnoty) < $g->sloupcu * $g->radku) {
            throw new RuntimeException('ASCII Grid: málo hodnot');
        }

        return $g;
    }

    public function hodnota(float $x, float $y): ?float
    {
        $s = ($x - $this->x0) / $this->dx;
        $r = ($this->y0 - $y) / $this->dy;
        if ($s < -0.5 || $r < -0.5 || $s > $this->sloupcu - 0.5 || $r > $this->radku - 0.5) {
            return null;
        }
        $s0 = (int) floor($s);
        $r0 = (int) floor($r);
        $ts = $s - $s0;
        $tr = $r - $r0;
        $v = [];
        foreach ([[0, 0], [1, 0], [0, 1], [1, 1]] as [$ds, $dr]) {
            $ss = max(0, min($this->sloupcu - 1, $s0 + $ds));
            $rr = max(0, min($this->radku - 1, $r0 + $dr));
            $v[] = $this->hodnoty[$rr * $this->sloupcu + $ss];
        }
        if (in_array(null, $v, true)) {
            return $this->hodnoty[(int) round(max(0, min($this->radku - 1, $r))) * $this->sloupcu + (int) round(max(0, min($this->sloupcu - 1, $s)))];
        }

        return ($v[0] * (1 - $ts) + $v[1] * $ts) * (1 - $tr) + ($v[2] * (1 - $ts) + $v[3] * $ts) * $tr;
    }
}
