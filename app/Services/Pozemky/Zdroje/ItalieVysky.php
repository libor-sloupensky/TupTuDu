<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Pozemky\AsciiGrid;
use App\Services\Pozemky\Geo;
use App\Services\Pozemky\ZdrojVysek;
use Illuminate\Support\Facades\Http;

/**
 * Itálie: TINITALY 1.1 (INGV, CC BY 4.0), model terénu 10 m pro celou Itálii, WCS v UTM 32 (EPSG:32632).
 * Celostátně jemnější zdroj na zavolání není (MASE DTM 20 m neodpovídá, LiDAR 1 m jen na žádost a po oblastech).
 * Na pozemku 30 × 40 m to dá sklon a tvar terénu, ne drobné nerovnosti, proto `rozliseni` 10 v profilu.
 */
class ItalieVysky implements ZdrojVysek
{
    private const WCS = 'https://tinitaly.pi.ingv.it/TINItaly_1_1/wcs';

    public function vysky(array $body): array
    {
        $utm = array_map(fn ($b) => Geo::utm($b[0], $b[1], 32), $body);
        $e = array_column($utm, 0);
        $n = array_column($utm, 1);
        $okraj = 20;
        $url = self::WCS . '?' . http_build_query([
            'service' => 'WCS', 'version' => '2.0.1', 'request' => 'GetCoverage',
            'coverageId' => 'TINItaly_1_1__tinitaly_dem', 'format' => 'text/plain',
        ]) . '&subset=' . rawurlencode(sprintf('E(%.1f,%.1f)', min($e) - $okraj, max($e) + $okraj))
            . '&subset=' . rawurlencode(sprintf('N(%.1f,%.1f)', min($n) - $okraj, max($n) + $okraj));
        $mrizka = AsciiGrid::zTextu(Http::timeout(30)->get($url)->throw()->body());

        return array_map(fn ($p) => ($v = $mrizka->hodnota($p[0], $p[1])) === null ? null : round($v, 2), $utm);
    }
}
