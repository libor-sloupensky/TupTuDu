<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PravidloObjektu extends Model
{
    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $table = 'pravidla_objektu';

    protected $fillable = [
        'typ_objektu',
        'nazev',
        'kategorie',
        'keywords',
        'pravidla',
        'metadata',
        'zdroj',
        'uzivatel_id',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    const KATEGORIE = [
        'celek' => 'Celek (dům, garáž...)',
        'mistnost' => 'Místnost (koupelna, kuchyň...)',
        'konstrukce' => 'Konstrukce (stěna, střecha...)',
        'exterior' => 'Exteriér (plot, terasa...)',
        'otvor' => 'Otvor (dveře, okno...)',
    ];

    public function uzivatel()
    {
        return $this->belongsTo(Uzivatel::class);
    }
}
