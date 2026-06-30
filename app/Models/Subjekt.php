<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Subjekt extends Model
{
    protected $table = 'subjekty';

    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $fillable = [
        'ico',
        'nazev',
        'slug',
        'aktivni',
    ];

    protected function casts(): array
    {
        return [
            'aktivni' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function scopeAktivni(Builder $query): Builder
    {
        return $query->where('aktivni', true);
    }

    public function uzivatele(): BelongsToMany
    {
        return $this->belongsToMany(Uzivatel::class, 'uzivatel_subjekt', 'subjekt_id', 'uzivatel_id')
            ->withPivot('je_vlastnik')
            ->withTimestamps('vytvoreno', 'upraveno');
    }
}
