<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Katastr\Dmr5gService;
use App\Services\Pozemky\GeoTiff;
use App\Services\Pozemky\ZdrojVysek;
use Illuminate\Support\Facades\Http;

/**
 * Česko: DMR 5G (ČÚZK) jedním výřezem rastru přes ImageServer exportImage v S-JTSK (EPSG:5514).
 * Dřív se ptal identify bod po bodu (Dmr5gService), pozemek o 4000 m² trval přes 40 s a na webu
 * narazil na limit. Převod do S-JTSK je tentýž (Dmr5gService::wgs84ToSjtsk), hodnoty se shodují.
 */
class CeskoVysky implements ZdrojVysek
{
    private const EXPORT = 'https://ags.cuzk.cz/arcgis2/rest/services/dmr5g/ImageServer/exportImage';
    private const PIXEL_M = 1.0;

    public function __construct(private Dmr5gService $dmr)
    {
    }

    public function vysky(array $body): array
    {
        $sjtsk = array_map(fn ($b) => $this->dmr->wgs84ToSjtsk($b[0], $b[1]), $body);
        $x = array_column($sjtsk, 0);
        $y = array_column($sjtsk, 1);
        $okraj = 3;
        $minX = floor(min($x) - $okraj);
        $minY = floor(min($y) - $okraj);
        $maxX = ceil(max($x) + $okraj);
        $maxY = ceil(max($y) + $okraj);
        $sirka = (int) (($maxX - $minX) / self::PIXEL_M);
        $vyska = (int) (($maxY - $minY) / self::PIXEL_M);

        $bin = Http::timeout(25)->get(self::EXPORT, [
            'bbox' => "{$minX},{$minY},{$maxX},{$maxY}",
            'bboxSR' => 5514,
            'imageSR' => 5514,
            'size' => "{$sirka},{$vyska}",
            'format' => 'tiff',
            'pixelType' => 'F32',
            'noDataInterpretation' => 'esriNoDataMatchAny',
            'interpolation' => 'RSP_BilinearInterpolation',
            'f' => 'image',
        ])->throw()->body();
        $tif = GeoTiff::zDat($bin);

        return array_map(fn ($p) => ($v = $tif->hodnota($p[0], $p[1])) === null ? null : round($v, 2), $sjtsk);
    }
}
