<?php

namespace App\Services\Katastr;

use Illuminate\Support\Facades\DB;

class KatastrService
{
    private CuzkWfsClient $wfs;
    private DmrClient $dmr;
    private ParcelaValidator $validator;

    public function __construct(CuzkWfsClient $wfs, DmrClient $dmr, ParcelaValidator $validator)
    {
        $this->wfs = $wfs;
        $this->dmr = $dmr;
        $this->validator = $validator;
    }

    /**
     * Načte parcelu — z cache nebo z WFS API.
     * Vrací pole s polygonem v S-JTSK a atributy. Canvas konverzi dělá frontend.
     */
    public function nactiParcelu(int $kuKod, string $cisloParcely, string $typ = 'auto', bool $forceRefresh = false): ?array
    {
        if (!$forceRefresh) {
            $cached = $this->zCache($kuKod, $cisloParcely, $typ);
            if ($cached && !empty($cached['centroid_wgs84']) && !empty($cached['polygon_wgs84']) && !empty($cached['druh_pozemku_cz'])) {
                return $cached;
            }
        }

        $parcela = $this->wfs->nactiParcelu($kuKod, $cisloParcely, $typ);
        if (!$parcela) {
            return null;
        }

        $parcela['ku_kod'] = $kuKod;
        $parcela['cislo'] = $cisloParcely;

        // Uložit do cache
        $this->ulozDoCache($kuKod, $cisloParcely, $parcela['typ'], $parcela);

        return $parcela;
    }

    /**
     * Načte stavby na parcele. Bbox ve WGS84 (lat/lon).
     */
    public function nactiStavby(array $bboxWgs84): array
    {
        return $this->wfs->nactiStavby($bboxWgs84);
    }

    /**
     * Načte okolní parcely v oblasti (BBOX ve WGS84).
     */
    public function nactiOkolniParcely(array $bboxWgs84): array
    {
        return $this->wfs->nactiParcelyVOblasti($bboxWgs84);
    }

    /**
     * Načte výškový profil pro parcelu.
     */
    public function nactiVyskovyProfil(array $polygonSjtsk): ?array
    {
        return $this->dmr->vyskovyProfil($polygonSjtsk);
    }

    /**
     * Ověří sousednost nové parcely se stávajícími.
     */
    public function overSousednost(array $novaParcelaSjtsk, array $stavajiciParcelySjtsk): bool
    {
        return $this->validator->sousediSNekterou($novaParcelaSjtsk, $stavajiciParcelySjtsk);
    }

    /**
     * Sjednotí polygony parcel do jednoho.
     */
    public function sjednotParcely(array $polygonySjtsk): array
    {
        $sjednoceny = $this->validator->sjednotPolygony($polygonySjtsk);
        return $this->sjtskNaCanvas($sjednoceny);
    }

    /**
     * Konverze S-JTSK souřadnic na canvas souřadnice.
     * S-JTSK: záporné souřadnice, velká čísla, osa X = jih, osa Y = západ.
     * Canvas: počátek v [0,0], osa X = vpravo, osa Y = dolů, v metrech.
     */
    public function sjtskNaCanvas(array $polygonSjtsk, ?array $centroid = null): array
    {
        if (empty($polygonSjtsk)) return [];

        // Centroid — střed bounding boxu
        if (!$centroid) {
            $xs = array_column($polygonSjtsk, 0);
            $ys = array_column($polygonSjtsk, 1);
            $centroid = [
                (min($xs) + max($xs)) / 2,
                (min($ys) + max($ys)) / 2,
            ];
        }

        $canvasBody = [];
        foreach ($polygonSjtsk as $bod) {
            // S-JTSK: X roste na jih, Y roste na západ (obojí záporné)
            // Canvas: X vpravo (= -Y_sjtsk), Y dolů (= X_sjtsk)
            $canvasBody[] = [
                round(-($bod[1] - $centroid[1]), 3), // -deltaY = vpravo
                round($bod[0] - $centroid[0], 3),     // deltaX = dolů
            ];
        }

        return $canvasBody;
    }

    /**
     * Cache: načtení.
     */
    private function zCache(int $kuKod, string $cislo, string $typ): ?array
    {
        $row = DB::table('katastr_cache')
            ->where('ku_kod', $kuKod)
            ->where('cislo_parcely', $cislo)
            ->where(function ($q) use ($typ) {
                if ($typ !== 'auto') {
                    $q->where('typ_parcely', $typ);
                }
            })
            ->first();

        if (!$row) return null;

        $data = json_decode($row->data, true);

        // Přidat výškový profil pokud existuje
        if ($row->vyskovy_profil) {
            $data['vyskovy_profil'] = json_decode($row->vyskovy_profil, true);
        }

        return $data;
    }

    /**
     * Cache: uložení.
     */
    private function ulozDoCache(int $kuKod, string $cislo, string $typ, array $data): void
    {
        $vyskovyProfil = $data['vyskovy_profil'] ?? null;
        $dataProCache = $data;
        unset($dataProCache['vyskovy_profil']);

        DB::table('katastr_cache')->updateOrInsert(
            [
                'ku_kod' => $kuKod,
                'cislo_parcely' => $cislo,
                'typ_parcely' => $typ,
            ],
            [
                'data' => json_encode($dataProCache, JSON_UNESCAPED_UNICODE),
                'vyskovy_profil' => $vyskovyProfil ? json_encode($vyskovyProfil, JSON_UNESCAPED_UNICODE) : null,
                'upraveno' => now(),
            ]
        );
    }

    /**
     * Cache: smazání pro vynucenou aktualizaci.
     */
    public function invalidujCache(int $kuKod, string $cislo): void
    {
        DB::table('katastr_cache')
            ->where('ku_kod', $kuKod)
            ->where('cislo_parcely', $cislo)
            ->delete();
    }
}
