<?php

namespace App\Services\Pozemky;

/**
 * Rozbor odpovědi WFS v datovém modelu INSPIRE Cadastral Parcels (GML 3.2, i GML 2 z MapServeru).
 * Názvy prvků bez ohledu na předponu a velikost písmen (Itálie má CP:LABEL).
 */
class InspireGml
{
    /**
     * @param bool $latLon pořadí os v souřadnicích: true „lat lon“ (urn:…EPSG::4326), false „lon lat“
     * @return array [['polygony' => [[[lat, lon], ...], ...], 'label', 'ref', 'vymera', 'local_id', 'xml'], ...]
     */
    public static function prvky(string $xml, bool $latLon): array
    {
        if (!preg_match_all('/<((?:\w+:)?(?:member|featureMember))\b[^>]*>(.*?)<\/\1>/s', $xml, $m)) {
            return [];
        }
        $vystup = [];
        foreach ($m[2] as $prvek) {
            $polygony = self::vnejsiPrstence($prvek, $latLon);
            if (!$polygony) {
                continue;
            }
            $vystup[] = [
                'polygony' => $polygony,
                'label' => self::text($prvek, 'label'),
                'ref' => self::text($prvek, 'nationalCadastralReference'),
                'vymera' => is_numeric($v = self::text($prvek, 'areaValue')) ? (float) $v : null,
                'local_id' => self::text($prvek, 'localId'),
                'xml' => $prvek,
            ];
        }

        return $vystup;
    }

    /** Text prvního prvku daného jména (bez předpony, bez ohledu na velikost písmen). */
    public static function text(string $xml, string $nazev): ?string
    {
        if (preg_match('/<(?:\w+:)?' . preg_quote($nazev, '/') . '\b[^>\/]*>([^<]*)</i', $xml, $m)) {
            $t = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_XML1, 'UTF-8'));

            return $t !== '' ? $t : null;
        }

        return null;
    }

    /** Vnější prstence všech polygonů prvku (díry se zahazují). */
    public static function vnejsiPrstence(string $xml, bool $latLon): array
    {
        $prstence = [];
        if (preg_match_all('/<(?:\w+:)?(?:exterior|outerBoundaryIs)\b[^>]*>(.*?)<\/(?:\w+:)?(?:exterior|outerBoundaryIs)>/s', $xml, $m)) {
            foreach ($m[1] as $cast) {
                $body = self::souradnice($cast, $latLon);
                if (count($body) >= 3) {
                    $prstence[] = $body;
                }
            }
        }

        return $prstence;
    }

    /** posList, sled pos nebo GML 2 coordinates → [[lat, lon], ...]. */
    public static function souradnice(string $xml, bool $latLon): array
    {
        $cisla = [];
        if (preg_match_all('/<(?:\w+:)?posList\b[^>]*>(.*?)<\//s', $xml, $m)) {
            // Prstenec složený z více úseků (Ring/curveMember): navázat za sebou
            foreach ($m[1] as $usek) {
                array_push($cisla, ...preg_split('/\s+/', trim($usek)));
            }
        } elseif (preg_match_all('/<(?:\w+:)?pos\b[^>]*>(.*?)<\//s', $xml, $m)) {
            foreach ($m[1] as $p) {
                array_push($cisla, ...preg_split('/\s+/', trim($p)));
            }
        } elseif (preg_match('/<(?:\w+:)?coordinates\b[^>]*>(.*?)<\//s', $xml, $m)) {
            foreach (preg_split('/\s+/', trim($m[1])) as $dvojice) {
                array_push($cisla, ...explode(',', $dvojice));
            }
        }
        $body = [];
        for ($i = 0; $i + 1 < count($cisla); $i += 2) {
            $a = (float) $cisla[$i];
            $b = (float) $cisla[$i + 1];
            $body[] = $latLon ? [$a, $b] : [$b, $a];
        }

        return $body;
    }

    /** Filtr FES 2.0 BBOX s obálkou ve WGS84 (lat lon). */
    public static function filtrObalky(array $o, string $vlastnost): string
    {
        return '<fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0"><fes:BBOX>'
            . '<fes:ValueReference>' . $vlastnost . '</fes:ValueReference>'
            . '<gml:Envelope xmlns:gml="http://www.opengis.net/gml/3.2" srsName="urn:ogc:def:crs:EPSG::4326">'
            . "<gml:lowerCorner>{$o['min_lat']} {$o['min_lon']}</gml:lowerCorner>"
            . "<gml:upperCorner>{$o['max_lat']} {$o['max_lon']}</gml:upperCorner>"
            . '</gml:Envelope></fes:BBOX></fes:Filter>';
    }
}
