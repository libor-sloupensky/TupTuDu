<?php

namespace App\Services\Katastr;

use Illuminate\Support\Facades\Http;

class DmrClient
{
    private const ENDPOINT = 'https://ags.cuzk.cz/arcgis2/rest/services/dmr5g/ImageServer';

    /**
     * Získá výškový profil pro polygon parcely.
     * Vytvoří grid bodů uvnitř bounding boxu a dotáže se DMR 5G.
     *
     * @param array $polygonSjtsk Polygon v S-JTSK souřadnicích
     * @param int $gridSize Počet bodů na delší stranu (default 5)
     */
    public function vyskovyProfil(array $polygonSjtsk, int $gridSize = 5): ?array
    {
        $bbox = $this->spocitejBbox($polygonSjtsk);
        $body = $this->vytvorGridBody($bbox, $gridSize);

        if (empty($body)) {
            return null;
        }

        $vysky = $this->getSamples($body);

        if (empty($vysky)) {
            return null;
        }

        return $this->analyzujProfil($vysky);
    }

    /**
     * Dotaz na DMR 5G getSamples endpoint.
     */
    private function getSamples(array $body): array
    {
        $points = array_map(fn($b) => [$b['x'], $b['y']], $body);

        $geometry = json_encode([
            'points' => $points,
            'spatialReference' => ['wkid' => 5514],
        ]);

        $response = Http::timeout(30)->get(self::ENDPOINT . '/getSamples', [
            'geometry' => $geometry,
            'geometryType' => 'esriGeometryMultipoint',
            'returnFirstValueOnly' => 'true',
            'f' => 'json',
        ]);

        if (!$response->successful()) {
            return [];
        }

        $data = $response->json();
        $samples = $data['samples'] ?? [];
        $vysky = [];

        foreach ($samples as $i => $sample) {
            $hodnota = $sample['value'] ?? null;
            if ($hodnota !== null && $hodnota !== 'NoData' && is_numeric($hodnota)) {
                $vysky[] = [
                    'x' => $body[$i]['x'] ?? 0,
                    'y' => $body[$i]['y'] ?? 0,
                    'z' => round((float)$hodnota, 2),
                ];
            }
        }

        return $vysky;
    }

    /**
     * Analyzuje výškové body — spočítá sklon, orientaci svahu, převýšení.
     */
    private function analyzujProfil(array $body): array
    {
        $zValues = array_column($body, 'z');
        $minZ = min($zValues);
        $maxZ = max($zValues);
        $rozdil = round($maxZ - $minZ, 2);

        // Průměrný sklon — lineární regrese ve 2D (gradient)
        $sklon = $this->spocitejSklon($body);
        $orientace = $this->urcOrientaci($body);

        return [
            'min' => $minZ,
            'max' => $maxZ,
            'rozdil' => $rozdil,
            'prumerny_sklon' => $sklon,
            'orientace_svahu' => $orientace,
            'body' => $body,
        ];
    }

    /**
     * Spočítá průměrný sklon v procentech pomocí gradientu.
     */
    private function spocitejSklon(array $body): float
    {
        if (count($body) < 2) return 0;

        // Najít max horizontální vzdálenost a výškový rozdíl
        $maxDist = 0;
        $vyskRozdil = 0;

        $n = count($body);
        for ($i = 0; $i < $n; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                $dx = $body[$i]['x'] - $body[$j]['x'];
                $dy = $body[$i]['y'] - $body[$j]['y'];
                $dist = sqrt($dx * $dx + $dy * $dy);
                if ($dist > $maxDist) {
                    $maxDist = $dist;
                    $vyskRozdil = abs($body[$i]['z'] - $body[$j]['z']);
                }
            }
        }

        if ($maxDist < 0.01) return 0;

        return round(($vyskRozdil / $maxDist) * 100, 1);
    }

    /**
     * Určí orientaci svahu (S, SV, V, JV, J, JZ, Z, SZ) — směr sestupu.
     */
    private function urcOrientaci(array $body): string
    {
        if (count($body) < 3) return 'rovný';

        // Najít bod s max výškou a bod s min výškou
        $maxBod = $body[0];
        $minBod = $body[0];
        foreach ($body as $b) {
            if ($b['z'] > $maxBod['z']) $maxBod = $b;
            if ($b['z'] < $minBod['z']) $minBod = $b;
        }

        $dz = $maxBod['z'] - $minBod['z'];
        if ($dz < 0.5) return 'rovný';

        // Vektor od nejvyššího k nejnižšímu bodu (směr sestupu)
        // S-JTSK: osa X roste na jih, osa Y roste na západ (záporné hodnoty)
        $dx = $minBod['x'] - $maxBod['x']; // kladné = jih
        $dy = $minBod['y'] - $maxBod['y']; // kladné = západ

        // Úhel v radiánech, převést na světové strany
        // V S-JTSK: +X = jih, +Y = západ
        $uhel = atan2(-$dy, $dx); // -dy protože západ je kladný Y v SJTSK
        $stupne = rad2deg($uhel);
        if ($stupne < 0) $stupne += 360;

        $smery = ['J', 'JZ', 'Z', 'SZ', 'S', 'SV', 'V', 'JV'];
        $index = (int)round($stupne / 45) % 8;

        return $smery[$index];
    }

    private function vytvorGridBody(array $bbox, int $gridSize): array
    {
        $dx = $bbox['max_x'] - $bbox['min_x'];
        $dy = $bbox['max_y'] - $bbox['min_y'];

        if ($dx < 0.1 || $dy < 0.1) return [];

        $stepX = $dx / max(1, $gridSize - 1);
        $stepY = $dy / max(1, $gridSize - 1);

        $body = [];
        for ($i = 0; $i < $gridSize; $i++) {
            for ($j = 0; $j < $gridSize; $j++) {
                $body[] = [
                    'x' => round($bbox['min_x'] + $i * $stepX, 2),
                    'y' => round($bbox['min_y'] + $j * $stepY, 2),
                ];
            }
        }

        return $body;
    }

    private function spocitejBbox(array $polygon): array
    {
        $xs = array_column($polygon, 0);
        $ys = array_column($polygon, 1);
        return [
            'min_x' => min($xs),
            'min_y' => min($ys),
            'max_x' => max($xs),
            'max_y' => max($ys),
        ];
    }
}
