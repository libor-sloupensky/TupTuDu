<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Jedno kolo měření konkurence (zhruba měsíčně). Obsahuje úplný snímek hodnot:
 * co se v kole znovu neověřilo, převezme se z minulého kola se starým datem `overeno`.
 */
class KonkurenceMereni extends Model
{
    protected $table = 'konkurence_mereni';

    protected $fillable = ['datum', 'nazev', 'poznamka'];

    protected function casts(): array
    {
        return ['datum' => 'date'];
    }

    public function hodnoty()
    {
        return $this->hasMany(KonkurenceHodnota::class, 'mereni_id');
    }

    public static function posledni(): ?self
    {
        return static::orderByDesc('datum')->first();
    }

    public function predchozi(): ?self
    {
        return static::where('datum', '<', $this->datum)->orderByDesc('datum')->first();
    }
}
