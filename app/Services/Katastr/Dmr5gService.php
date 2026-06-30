<?php

namespace App\Services\Katastr;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * DMR 5G — Digitální model reliéfu 5. generace (ČÚZK).
 *
 * Výškové body přes ArcGIS ImageServer REST API (zdarma, bez registrace).
 * Endpoint: ags.cuzk.cz/arcgis2/rest/services/dmr5g/ImageServer/identify
 * Souřadnice: S-JTSK (EPSG:5514)
 * Přesnost: ±0.18m
 */
class Dmr5gService
{
    private const API_URL = 'https://ags.cuzk.cz/arcgis2/rest/services/dmr5g/ImageServer/identify';
    private const GRID_STEP = 2.0; // metry — rozlišení DMR 5G

    /**
     * Načte výškový profil pro polygon parcely.
     *
     * @param array $polygonWgs84 Polygon ve WGS84 [[lat, lon], ...]
     * @return array Výškové statistiky + body [[x_sjtsk, y_sjtsk, z], ...]
     */
    public function nactiVyskovyProfil(array $polygonWgs84): array
    {
        if (count($polygonWgs84) < 3) {
            throw new \RuntimeException('Polygon musí mít alespoň 3 body.');
        }

        // Grid přímo ve WGS84 — krok ~2m převedený na stupně
        $lats = array_column($polygonWgs84, 0);
        $lons = array_column($polygonWgs84, 1);
        $centerLat = array_sum($lats) / count($lats);
        $stepLat = self::GRID_STEP / 111320; // ~2m v stupních latitude
        $stepLon = self::GRID_STEP / (111320 * cos(deg2rad($centerLat))); // ~2m v stupních longitude

        $minLat = min($lats); $maxLat = max($lats);
        $minLon = min($lons); $maxLon = max($lons);

        // Grid body uvnitř WGS84 polygonu
        $gridWgs = [];
        for ($lat = $minLat; $lat <= $maxLat; $lat += $stepLat) {
            for ($lon = $minLon; $lon <= $maxLon; $lon += $stepLon) {
                if ($this->bodVPolygonu($lat, $lon, $polygonWgs84)) {
                    $gridWgs[] = [$lat, $lon];
                }
            }
        }

        if (empty($gridWgs)) {
            throw new \RuntimeException('Žádné body v polygonu parcely.');
        }

        // Limit
        if (count($gridWgs) > 5000) {
            $factor = ceil(sqrt(count($gridWgs) / 5000));
            $gridWgs = [];
            for ($lat = $minLat; $lat <= $maxLat; $lat += $stepLat * $factor) {
                for ($lon = $minLon; $lon <= $maxLon; $lon += $stepLon * $factor) {
                    if ($this->bodVPolygonu($lat, $lon, $polygonWgs84)) {
                        $gridWgs[] = [$lat, $lon];
                    }
                }
            }
        }

        Log::info('DMR5G: dotazuji ' . count($gridWgs) . ' bodů');

        // WGS84 → S-JTSK pro ArcGIS API dotaz, vrátit výsledek s WGS84 souřadnicemi
        $body = [];
        $chunks = array_chunk($gridWgs, 50);

        foreach ($chunks as $chunk) {
            // Konvertovat na S-JTSK pro API
            $sjtskChunk = array_map(fn($p) => $this->wgs84ToSjtsk($p[0], $p[1]), $chunk);
            $results = $this->dotazVysky($sjtskChunk);

            // Přiřadit výšky zpět k WGS84 souřadnicím
            foreach ($results as $r) {
                // Najít odpovídající WGS84 bod přes S-JTSK souřadnice
                foreach ($sjtskChunk as $idx => $sjtsk) {
                    if (abs($sjtsk[0] - $r[0]) < 0.1 && abs($sjtsk[1] - $r[1]) < 0.1) {
                        $body[] = [round($chunk[$idx][0], 6), round($chunk[$idx][1], 6), $r[2]];
                        break;
                    }
                }
            }

            if (count($chunks) > 1) usleep(100000);
        }

        if (empty($body)) {
            throw new \RuntimeException('Výšková data pro tuto oblast nejsou dostupná.');
        }

        // Statistiky (pro sklon/orientaci potřebuji S-JTSK — použiju konverzi)
        $vysky = array_column($body, 2);
        $min = min($vysky);
        $max = max($vysky);
        $prumer = array_sum($vysky) / count($vysky);

        $bodySjtsk = array_map(fn($b) => [...$this->wgs84ToSjtsk($b[0], $b[1]), $b[2]], $body);

        return [
            'vyska_prumerna' => round($prumer, 1),
            'vyska_min' => round($min, 1),
            'vyska_max' => round($max, 1),
            'vyskovy_rozdil' => round($max - $min, 1),
            'sklon_procent' => round($this->vypoctiSklon($bodySjtsk), 1),
            'orientace_svahu' => $this->urcOrientaci($bodySjtsk),
            'pocet_bodu' => count($body),
            'body' => $body, // [[lat, lon, z], ...] ve WGS84 — přesně odpovídá polygonu
        ];
    }

    /**
     * Dotáže výšky pro pole bodů přes ArcGIS identify.
     * Paralelní HTTP dotazy (10 souběžně) pro rychlost.
     */
    private function dotazVysky(array $body): array
    {
        $results = [];
        $client = new \GuzzleHttp\Client(['timeout' => 10]);

        // Paralelně po 10 dotazech
        $chunks = array_chunk($body, 10);
        foreach ($chunks as $chunk) {
            $promises = [];
            foreach ($chunk as $idx => [$x, $y]) {
                $promises[$idx] = $client->getAsync(self::API_URL, [
                    'query' => [
                        'geometry' => json_encode(['x' => $x, 'y' => $y]),
                        'geometryType' => 'esriGeometryPoint',
                        'returnGeometry' => 'false',
                        'f' => 'json',
                    ],
                ]);
            }

            $settled = \GuzzleHttp\Promise\Utils::settle($promises)->wait();
            foreach ($settled as $idx => $result) {
                if ($result['state'] !== 'fulfilled') continue;
                $data = json_decode($result['value']->getBody()->getContents(), true);
                $value = $data['value'] ?? null;
                if ($value !== null && is_numeric($value) && (float) $value > -9999) {
                    [$x, $y] = $chunk[$idx];
                    $results[] = [round($x, 2), round($y, 2), round((float) $value, 2)];
                }
            }
        }

        return $results;
    }

    /**
     * Konverze WGS84 → S-JTSK.
     * Port z https://github.com/josefzamrzla/JTSK_Converter (Jakub Kerhat).
     */
    private function wgs84ToSjtsk(float $lat, float $lon): array
    {
        if ($lat < 40 || $lat > 60 || $lon < 5 || $lon > 25) {
            throw new \RuntimeException("Souřadnice mimo rozsah S-JTSK: {$lat}, {$lon}");
        }

        // 1) WGS84 → Bessel (přes kartézské souřadnice)
        $B = deg2rad($lat);
        $L = deg2rad($lon);

        // WGS84 → kartézské
        $a = 6378137.0;
        $f_1 = 298.257223563;
        $e2 = 1 - pow(1 - 1 / $f_1, 2);
        $rho = $a / sqrt(1 - $e2 * pow(sin($B), 2));
        $x1 = $rho * cos($B) * cos($L);
        $y1 = $rho * cos($B) * sin($L);
        $z1 = ((1 - $e2) * $rho) * sin($B);

        // Helmertova transformace
        $dx = -570.69; $dy = -85.69; $dz = -462.84;
        $wx = 4.99821 / 3600 * M_PI / 180;
        $wy = 1.58676 / 3600 * M_PI / 180;
        $wz = 5.2611 / 3600 * M_PI / 180;
        $m = -3.543e-6;

        $x2 = $dx + (1 + $m) * ($x1 + $wz * $y1 - $wy * $z1);
        $y2 = $dy + (1 + $m) * (-$wz * $x1 + $y1 + $wx * $z1);
        $z2 = $dz + (1 + $m) * ($wy * $x1 - $wx * $y1 + $z1);

        // Kartézské → Bessel
        $aB = 6377397.15508;
        $f_1B = 299.152812853;
        $a_b = $f_1B / ($f_1B - 1);
        $p = sqrt($x2 * $x2 + $y2 * $y2);
        $e2B = 1 - pow(1 - 1 / $f_1B, 2);
        $th = atan2($z2 * $a_b, $p);
        $st = sin($th); $ct = cos($th);
        $t = ($z2 + $e2B * $a_b * $aB * $st * $st * $st) / ($p - $e2B * $aB * $ct * $ct * $ct);

        $latBessel = atan($t);
        $lonBessel = 2 * atan($y2 / ($p + $x2));

        // 2) Bessel → JTSK (Křovákovo zobrazení)
        // Přesná kopie z josefzamrzla/JTSK_Converter
        $e     = 0.081696831215303;
        $n     = 0.97992470462083;
        $rho_0 = 12310230.12797036;
        $sinUQ = 0.863499969506341;
        $cosUQ = 0.504348889819882;
        $sinVQ = 0.420215144586493;
        $cosVQ = 0.907424504992097;
        $alfa  = 1.000597498371542;
        $k_2   = 1.00685001861538;

        $sinB = sin($latBessel);
        $t = (1 - $e * $sinB) / (1 + $e * $sinB);
        $t = pow(1 + $sinB, 2) / (1 - $sinB * $sinB) * exp($e * log($t));
        $t = $k_2 * exp($alfa * log($t));

        $sinU  = ($t - 1) / ($t + 1);
        $cosU  = sqrt(1 - $sinU * $sinU);
        $V     = $alfa * $lonBessel;
        $sinV  = sin($V);
        $cosV  = cos($V);
        $cosDV = $cosVQ * $cosV + $sinVQ * $sinV;
        $sinDV = $sinVQ * $cosV - $cosVQ * $sinV;
        $sinS  = $sinUQ * $sinU + $cosUQ * $cosU * $cosDV;
        $cosS  = sqrt(1 - $sinS * $sinS);
        $sinD  = $sinDV * $cosU / $cosS;
        $cosD  = sqrt(1 - $sinD * $sinD);

        $eps = $n * atan($sinD / $cosD);
        $rho = $rho_0 * exp(-$n * log((1 + $sinS) / $cosS));

        // Křovák: X=southing (rho*cos), Y=westing (rho*sin) — kladné
        // ArcGIS DMR5G: x=westing (záporné), y=southing (záporné)
        $xKrovak = $rho * cos($eps); // southing
        $yKrovak = $rho * sin($eps); // westing
        return [round(-$yKrovak, 2), round(-$xKrovak, 2)];
    }

    /**
     * Zpětná konverze S-JTSK → WGS84 (iterativní).
     * Startuje od odhadu a iterativně zpřesňuje pomocí wgs84ToSjtsk.
     */
    private function sjtskToWgs84(float $x, float $y, float $latGuess = 49.5, float $lonGuess = 15.0): array
    {
        $lat = $latGuess;
        $lon = $lonGuess;
        $delta = 5.0;

        for ($steps = 0; $steps < 1000 && $delta > 0.000001; $steps++) {
            $sjtsk = $this->wgs84ToSjtsk($lat, $lon);
            $errX = $x - $sjtsk[0];
            $errY = $y - $sjtsk[1];

            if (abs($errX) < 0.01 && abs($errY) < 0.01) break;

            // Numerický gradient (jak lat/lon ovlivňují x/y)
            $h = 0.00001;
            $sLat = $this->wgs84ToSjtsk($lat + $h, $lon);
            $sLon = $this->wgs84ToSjtsk($lat, $lon + $h);

            $dxdlat = ($sLat[0] - $sjtsk[0]) / $h;
            $dydlat = ($sLat[1] - $sjtsk[1]) / $h;
            $dxdlon = ($sLon[0] - $sjtsk[0]) / $h;
            $dydlon = ($sLon[1] - $sjtsk[1]) / $h;

            $det = $dxdlat * $dydlon - $dxdlon * $dydlat;
            if (abs($det) < 1e-20) break;

            $dlat = ($dydlon * $errX - $dxdlon * $errY) / $det;
            $dlon = (-$dydlat * $errX + $dxdlat * $errY) / $det;

            $lat += $dlat;
            $lon += $dlon;
            $delta = abs($dlat) + abs($dlon);
        }

        return [$lat, $lon];
    }

    private function bodVPolygonu(float $x, float $y, array $polygon): bool
    {
        $n = count($polygon);
        $inside = false;
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $xi = $polygon[$i][0]; $yi = $polygon[$i][1];
            $xj = $polygon[$j][0]; $yj = $polygon[$j][1];
            if (($yi > $y) !== ($yj > $y) && $x < ($xj - $xi) * ($y - $yi) / ($yj - $yi) + $xi) {
                $inside = !$inside;
            }
        }
        return $inside;
    }

    private function vypoctiSklon(array $body): float
    {
        if (count($body) < 3) return 0;
        $n = count($body);
        $sx = $sy = $sz = $sxx = $sxy = $sxz = $syy = $syz = 0;
        foreach ($body as [$x, $y, $z]) {
            $sx += $x; $sy += $y; $sz += $z;
            $sxx += $x*$x; $sxy += $x*$y; $sxz += $x*$z;
            $syy += $y*$y; $syz += $y*$z;
        }
        $mx = $sx/$n; $my = $sy/$n; $mz = $sz/$n;
        $dxx = $sxx-$n*$mx*$mx; $dxy = $sxy-$n*$mx*$my;
        $dxz = $sxz-$n*$mx*$mz; $dyy = $syy-$n*$my*$my;
        $dyz = $syz-$n*$my*$mz;
        $det = $dxx*$dyy - $dxy*$dxy;
        if (abs($det) < 1e-10) return 0;
        $a = ($dyy*$dxz - $dxy*$dyz) / $det;
        $b = ($dxx*$dyz - $dxy*$dxz) / $det;
        return sqrt($a*$a + $b*$b) * 100;
    }

    private function urcOrientaci(array $body): string
    {
        if (count($body) < 3) return 'rovina';
        $n = count($body);
        $sx = $sy = $sz = $sxx = $sxy = $sxz = $syy = $syz = 0;
        foreach ($body as [$x, $y, $z]) {
            $sx += $x; $sy += $y; $sz += $z;
            $sxx += $x*$x; $sxy += $x*$y; $sxz += $x*$z;
            $syy += $y*$y; $syz += $y*$z;
        }
        $mx = $sx/$n; $my = $sy/$n; $mz = $sz/$n;
        $dxx = $sxx-$n*$mx*$mx; $dxy = $sxy-$n*$mx*$my;
        $dxz = $sxz-$n*$mx*$mz; $dyy = $syy-$n*$my*$my;
        $dyz = $syz-$n*$my*$mz;
        $det = $dxx*$dyy - $dxy*$dxy;
        if (abs($det) < 1e-10) return 'rovina';
        $a = ($dyy*$dxz - $dxy*$dyz) / $det;
        $b = ($dxx*$dyz - $dxy*$dxz) / $det;
        if (abs($a) < 0.001 && abs($b) < 0.001) return 'rovina';
        $uhel = atan2(-$b, -$a) * (180 / M_PI);
        if ($uhel < 0) $uhel += 360;
        $s = ['sever','severovýchod','východ','jihovýchod','jih','jihozápad','západ','severozápad'];
        return $s[(int)round($uhel / 45) % 8];
    }
}
