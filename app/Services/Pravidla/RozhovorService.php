<?php

namespace App\Services\Pravidla;

use App\Models\Koncept;

class RozhovorService
{
    /**
     * Zpracuje AI odpověď během rozhovoru — aktualizuje metadata a fázi projektu.
     */
    public function zpracujOdpoved(Koncept $koncept, array $aiData): void
    {
        // Mergovat metadata z AI odpovědi
        if (isset($aiData['metadata'])) {
            $stavajici = $koncept->metadata ?? [];
            $nova = $aiData['metadata'];

            // Merge objekty — přepsat existující, přidat nové
            if (isset($nova['objekty'])) {
                $stavajiciObjekty = collect($stavajici['objekty'] ?? [])->keyBy('id');
                foreach ($nova['objekty'] as $objekt) {
                    $stavajiciObjekty->put($objekt['id'], $objekt);
                }
                $stavajici['objekty'] = $stavajiciObjekty->values()->toArray();
                unset($nova['objekty']);
            }

            // Merge pozemek
            if (isset($nova['pozemek'])) {
                $stavajici['pozemek'] = array_merge($stavajici['pozemek'] ?? [], $nova['pozemek']);
                unset($nova['pozemek']);
            }

            // Zbylé klíče
            $stavajici = array_merge($stavajici, $nova);
            $koncept->metadata = $stavajici;
        }

        // Přepnout fázi, pokud je rozhovor hotový
        if (!empty($aiData['rozhovor_hotovy'])) {
            $koncept->faze = 'navrh';
            // Zajistit, že metadata mají flag
            $meta = $koncept->metadata ?? [];
            $meta['rozhovor_hotovy'] = true;
            $koncept->metadata = $meta;
        }

        $koncept->save();
    }

    /**
     * Zjistí, jestli AI odpověď obsahuje data rozhovoru (metadata/rozhovor_hotovy).
     */
    public function jeRozhovorOdpoved(array $aiData): bool
    {
        return isset($aiData['metadata']) || isset($aiData['rozhovor_hotovy']);
    }

    /**
     * Extrahuje aktivní objekt z metadat pro PravidlaResolver.
     */
    public function aktivniObjekt(Koncept $koncept): ?array
    {
        $metadata = $koncept->metadata ?? [];
        $aktivniId = $metadata['aktivni_objekt'] ?? null;
        $objekty = $metadata['objekty'] ?? [];

        if ($aktivniId) {
            foreach ($objekty as $obj) {
                if (($obj['id'] ?? '') === $aktivniId) {
                    return $obj;
                }
            }
        }

        return $objekty[0] ?? null;
    }
}
