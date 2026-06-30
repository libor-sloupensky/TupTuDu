<?php

namespace App\Services\Pravidla;

use Illuminate\Support\Collection;

class TokenBudget
{
    /**
     * Odhad počtu tokenů pro text (přibližně 4 znaky = 1 token pro český text).
     */
    public function odhadniTokeny(string $text): int
    {
        return (int) ceil(mb_strlen($text) / 4);
    }

    /**
     * Vejde pravidla do rozpočtu — ořízne nejméně prioritní, pokud se nevejdou.
     * Pravidla musí být seřazena podle priority (nižší = důležitější).
     */
    public function vejdiSeDoBudgetu(Collection $pravidla, int $budget = 6000): Collection
    {
        $vysledek = collect();
        $pouzito = 0;

        foreach ($pravidla->sortBy('priorita') as $pravidlo) {
            $tokeny = $this->odhadniTokeny($pravidlo['obsah'] ?? '');
            if ($pouzito + $tokeny <= $budget) {
                $vysledek->put($pravidlo['id'], $pravidlo);
                $pouzito += $tokeny;
            }
        }

        return $vysledek;
    }
}
