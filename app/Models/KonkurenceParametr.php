<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Sledovaný parametr analýzy konkurence (modules/konkurence.md).
 * Režim: sledovat = v matici a smí do veřejného srovnání, tise = měří se jen interně,
 * nesledovat = neměří se. Hodnoty jsou v KonkurenceHodnota po měřeních.
 */
class KonkurenceParametr extends Model
{
    protected $table = 'konkurence_parametry';

    protected $fillable = [
        'klic', 'skupina', 'nazev', 'popis', 'typ', 'jednotka', 'rezim',
        'jak_merit', 'automaticky', 'pridano', 'poradi',
    ];

    protected function casts(): array
    {
        return [
            'automaticky' => 'boolean',
            'pridano' => 'date',
        ];
    }

    public const REZIMY = [
        'sledovat' => 'Sledovat',
        'tise' => 'Tiše',
        'nesledovat' => 'Nesledovat',
    ];

    public const TYPY = [
        'stav' => 'má / nemá',
        'cislo' => 'číslo',
        'text' => 'text',
        'seznam' => 'seznam',
        'datum' => 'datum',
    ];

    /** Skupiny v pořadí zobrazení. a–h jsou z první analýzy (1. 11. 2026), i–k přibyly 12. 11. 2026. */
    public const SKUPINY = [
        'a' => 'Kreslení půdorysu',
        'b' => 'Patra a střecha',
        'c' => '3D',
        'd' => 'Interiér',
        'e' => 'Exteriér, terén a zahrada',
        'f' => 'Pozemek a okolí',
        'g' => 'Výstupy a spolupráce',
        'h' => 'Platforma',
        'i' => 'Jazyky a země',
        'j' => 'Ceny a obchod',
        'k' => 'Vývoj a aktivita',
    ];

    public function hodnoty()
    {
        return $this->hasMany(KonkurenceHodnota::class, 'parametr_id');
    }

    public function scopeSerazene($q)
    {
        return $q->orderBy('skupina')->orderBy('poradi')->orderBy('id');
    }
}
