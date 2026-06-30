<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiVolani extends Model
{
    protected $table = 'ai_volani';
    public $timestamps = false; // máme jen `vytvoreno`

    protected $fillable = [
        'provider', 'model', 'modul', 'uzivatel_id',
        'vstupni_tokens', 'vystupni_tokens', 'cache_read_tokens', 'cache_create_tokens',
        'cena_usd', 'batch', 'uspesne', 'http_status', 'trvani_ms',
        'poznamka', 'vytvoreno',
    ];

    protected function casts(): array
    {
        return [
            'cena_usd' => 'decimal:6',
            'batch' => 'boolean',
            'uspesne' => 'boolean',
            'vytvoreno' => 'datetime',
        ];
    }
}
