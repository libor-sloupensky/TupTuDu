<?php

namespace App\Models\Office;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Číselník dodavatelů sdílený napříč firmami, klíčem je IČO. */
class Dodavatel extends Model
{
    protected $table = 'office_dodavatele';
    protected $primaryKey = 'ico';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'ico', 'nazev', 'dic', 'ulice', 'mesto', 'psc',
    ];

    public function doklady(): HasMany
    {
        return $this->hasMany(Doklad::class, 'dodavatel_ico', 'ico');
    }
}
