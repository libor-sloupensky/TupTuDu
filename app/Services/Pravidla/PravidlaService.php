<?php

namespace App\Services\Pravidla;

use App\Models\Koncept;

class PravidlaService
{
    private PravidlaLoader $loader;
    private PravidlaResolver $resolver;
    private TokenBudget $budget;

    public function __construct(PravidlaLoader $loader, PravidlaResolver $resolver, TokenBudget $budget)
    {
        $this->loader = $loader;
        $this->resolver = $resolver;
        $this->budget = $budget;
    }

    /**
     * Sestaví systémový prompt pro daný projekt.
     * V rozhovoru vrátí prompt pro interview, jinak skládá z knihoven.
     */
    public function sestavSystemPrompt(?Koncept $koncept = null): string
    {
        // Bez projektu nebo nový projekt bez fáze → rozhovor
        $faze = $koncept?->faze ?? 'rozhovor';
        $metadata = $koncept?->metadata;

        if ($faze === 'rozhovor') {
            return $this->promptRozhovor();
        }

        return $this->promptNavrh($metadata);
    }

    /**
     * Prompt pro interview fázi.
     */
    private function promptRozhovor(): string
    {
        $rozhovor = $this->loader->obsah('rozhovor');
        $zaklad = $this->loader->obsah('zaklad');

        if (!$rozhovor) {
            // Fallback — vrátit základ
            return $zaklad;
        }

        return $rozhovor . "\n\n" . $zaklad;
    }

    /**
     * Prompt pro návrhovou fázi — složený z relevantních knihoven.
     */
    private function promptNavrh(?array $metadata): string
    {
        $pravidlaIds = $this->resolver->vyber($metadata);
        $pravidla = $this->loader->nactiVybrana($pravidlaIds);
        $pravidla = $this->budget->vejdiSeDoBudgetu($pravidla, 8000);

        $casti = [];

        // Kontextová informace o projektu
        if ($metadata) {
            $casti[] = $this->kontextProjektu($metadata);
        }

        // Pravidla seřazená podle priority
        foreach ($pravidla->sortBy('priorita') as $pravidlo) {
            $casti[] = $pravidlo['obsah'];
        }

        return implode("\n\n---\n\n", array_filter($casti));
    }

    /**
     * Kontextová informace o aktuálním projektu pro AI.
     */
    private function kontextProjektu(array $metadata): string
    {
        $objekty = $metadata['objekty'] ?? [];
        $pozemek = $metadata['pozemek'] ?? [];
        $aktivni = $metadata['aktivni_objekt'] ?? null;

        $info = "KONTEXT PROJEKTU:\n";

        if ($objekty) {
            $info .= "Objekty na pozemku:\n";
            foreach ($objekty as $obj) {
                $id = $obj['id'] ?? '?';
                $typ = $obj['typ'] ?? '?';
                $ucel = $obj['ucel'] ?? '';
                $oznaceni = ($id === $aktivni) ? ' ← AKTIVNÍ' : '';
                $info .= "- {$id}: {$typ}" . ($ucel ? " ({$ucel})" : '') . $oznaceni . "\n";
            }
        }

        if ($pozemek) {
            $teren = $pozemek['teren'] ?? 'rovny';
            $info .= "Pozemek: terén {$teren}";
            if (isset($pozemek['prevyseni'])) {
                $info .= ", převýšení {$pozemek['prevyseni']}m";
            }
            if (isset($pozemek['orientace'])) {
                $info .= ", orientace {$pozemek['orientace']}";
            }
            $info .= "\n";
        }

        return $info;
    }
}
