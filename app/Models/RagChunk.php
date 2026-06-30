<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RagChunk extends Model
{
    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = null;

    protected $table = 'rag_chunky';

    protected $fillable = [
        'kolekce_id', 'obsah', 'poradi', 'sekce', 'metadata', 'embedding',
    ];

    protected $casts = [
        'poradi' => 'integer',
        'metadata' => 'array',
        'embedding' => 'array',
    ];

    public function kolekce(): BelongsTo
    {
        return $this->belongsTo(RagKolekce::class, 'kolekce_id');
    }
}
