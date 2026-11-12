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
        'klic', 'nazev', 'kratky', 'segment', 'web', 'zeme', 'platformy', 'cilovka',
        'rezim', 'kvalita', 'navic', 'chybi', 'poznamka', 'pridano', 'poradi',
    ];

    protected function casts(): array
    {
        return [
            'platformy' => 'array',
            'navic' => 'array',
            'chybi' => 'array',
            'pridano' => 'date',
        ];
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
