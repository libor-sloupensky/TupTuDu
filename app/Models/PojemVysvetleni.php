<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PojemVysvetleni extends Model
{
    protected $table = 'pojmy_vysvetleni';

    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $fillable = [
        'termin',
        'kontext',
        'popis',
    ];

    /** Normalizace termínu pro cache lookup (trim + lowercase). */
    public static function normalizuj(string $termin): string
    {
        return mb_strtolower(trim($termin));
    }
}
