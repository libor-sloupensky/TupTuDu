<?php

namespace App\Models\Office;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Kategorie extends Model
{
    protected $table = 'office_kategorie';

    protected $fillable = [
        'firma_ico',
        'nazev',
        'popis',
        'poradi',
    ];

    public function firma(): BelongsTo
    {
        return $this->belongsTo(Firma::class, 'firma_ico', 'ico');
    }
}
