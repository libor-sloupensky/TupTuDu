<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Událost ze života konkurenta: vydání, nová funkce, změna ceny, obsah webu. Z nich se počítá intenzita vývoje. */
class KonkurenceUdalost extends Model
{
    protected $table = 'konkurence_udalosti';

    protected $fillable = ['konkurent_id', 'datum', 'typ', 'popis', 'zdroj'];

    protected function casts(): array
    {
        return ['datum' => 'date'];
    }

    public const TYPY = [
        'vydani' => 'Vydání',
        'funkce' => 'Nová funkce',
        'cena' => 'Cena',
        'obsah' => 'Obsah webu',
        'jine' => 'Jiné',
    ];

    public function konkurent()
    {
        return $this->belongsTo(Konkurent::class, 'konkurent_id');
    }
}
