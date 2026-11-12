<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Konkurent v analýze konkurence (modules/konkurence.md). Řádek s klíčem `tuptudu` jsme my,
 * měří se stejně jako ostatní. Režim má stejný význam jako u parametru.
 */
class Konkurent extends Model
{
    protected $table = 'konkurenti';

    protected $fillable = [
        'klic', 'adresa', 'nazev', 'kratky', 'segment', 'web', 'zeme', 'platformy', 'cilovka',
        'rezim', 'kvalita', 'navic', 'chybi', 'poznamka', 'verejne', 'jazyky', 'pridano', 'poradi',
    ];

    protected function casts(): array
    {
        return [
            'platformy' => 'array',
            'navic' => 'array',
            'chybi' => 'array',
            'verejne' => 'array',
            'jazyky' => 'array',
            'pridano' => 'date',
        ];
    }

    /** Jméno na stránkách: krátké, jinak celé. */
    public function jmeno(): string
    {
        return $this->kratky ?: $this->nazev;
    }

    /** Veřejný údaj (popis, platformy) v jazyce, záložně česky. */
    public function verejne(string $co, string $jazyk): ?string
    {
        return $this->verejne[$jazyk][$co] ?? null;
    }

    /** Má veřejnou srovnávací stránku v jazyce: sledovaný, s adresou, jazyk vybraný u něj i zveřejněný v config. */
    public function maStranku(string $jazyk): bool
    {
        return $this->rezim === 'sledovat' && $this->adresa && ! $this->jeTuptudu()
            && in_array($jazyk, $this->jazyky ?? [], true) && in_array($jazyk, config('srovnani.jazyky'), true);
    }

    public function scopeSeStrankou($q, string $jazyk)
    {
        return $q->where('rezim', 'sledovat')->whereNotNull('adresa')->where('klic', '!=', 'tuptudu')
            ->whereJsonContains('jazyky', $jazyk)->orderBy('poradi');
    }

    public const SEGMENTY = [
        'tuptudu' => 'TupTuDu',
        'spotrebitel' => 'Plánovače pro laiky',
        'profi' => 'Pokročilé a profi nástroje',
        'sken_ai' => 'Zaměření a AI',
        'exterier' => 'Zahrada a exteriér',
        'pozemek' => 'Pozemek a katastr',
        'kalkulacka' => 'Kalkulačky a výpočty',
    ];

    public function jeTuptudu(): bool
    {
        return $this->klic === 'tuptudu';
    }

    public function hodnoty()
    {
        return $this->hasMany(KonkurenceHodnota::class, 'konkurent_id');
    }

    public function udalosti()
    {
        return $this->hasMany(KonkurenceUdalost::class, 'konkurent_id');
    }
}
