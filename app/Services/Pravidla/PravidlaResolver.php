<?php

namespace App\Services\Pravidla;

class PravidlaResolver
{
    private PravidlaLoader $loader;

    public function __construct(PravidlaLoader $loader)
    {
        $this->loader = $loader;
    }

    /**
     * Na základě metadat projektu vrátí seznam ID pravidel, která se mají načíst.
     */
    public function vyber(?array $metadata): array
    {
        $ids = ['zaklad', 'geometrie']; // Vždy

        if (empty($metadata)) {
            return $this->rozbalZavislosti($ids);
        }

        $objekty = $metadata['objekty'] ?? [];
        $pozemek = $metadata['pozemek'] ?? [];

        foreach ($objekty as $objekt) {
            // Typ stavby
            $typ = $objekt['typ'] ?? null;
            if ($typ && $this->existuje("typy/{$typ}")) {
                $ids[] = $typ;
            }

            // Střecha
            $strecha = $objekt['strecha'] ?? null;
            if ($strecha && $this->existuje("strechy/{$strecha}")) {
                $ids[] = $strecha;
            }

            // Materiál
            $material = $objekt['material'] ?? null;
            if ($material && $this->existuje("materialy/{$material}")) {
                $ids[] = $material;
            }
        }

        // Terén
        $teren = $pozemek['teren'] ?? 'rovny';
        if ($teren !== 'rovny') {
            $ids[] = 'svahovitost';
            // Plot na svahu
            $maPlot = collect($objekty)->contains(fn($o) => ($o['typ'] ?? '') === 'plot');
            if ($maPlot && $this->existuje('teren/plot-na-svahu')) {
                $ids[] = 'plot-na-svahu';
            }
        }

        // Multi-objekt → odstupy
        if (count($objekty) > 1 && $this->existuje('normy/odstupy')) {
            $ids[] = 'odstupy';
        }

        return $this->rozbalZavislosti(array_unique($ids));
    }

    /**
     * Rozbalí závislosti pravidel (z front matter "zavislosti").
     */
    private function rozbalZavislosti(array $ids): array
    {
        $vsechna = $this->loader->nactiVsechna();
        $vysledek = $ids;
        $zpracovano = [];

        while (count($vysledek) !== count($zpracovano)) {
            foreach ($vysledek as $id) {
                if (in_array($id, $zpracovano)) continue;
                $zpracovano[] = $id;

                $pravidlo = $vsechna->get($id);
                if (!$pravidlo) continue;

                foreach ($pravidlo['zavislosti'] ?? [] as $zavislost) {
                    if (!in_array($zavislost, $vysledek)) {
                        $vysledek[] = $zavislost;
                    }
                }
            }
        }

        return array_unique($vysledek);
    }

    /**
     * Zkontroluje, jestli soubor pravidla existuje (podle relativní cesty).
     */
    private function existuje(string $relativniCesta): bool
    {
        // Loader mapuje soubory na ID z front matter, zkusíme najít
        $vsechna = $this->loader->nactiVsechna();
        $id = basename($relativniCesta);
        return $vsechna->has($id);
    }
}
