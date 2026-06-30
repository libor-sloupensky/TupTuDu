<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Uzivatel extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'uzivatele';

    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $fillable = [
        'jmeno',
        'prijmeni',
        'email',
        'telefon',
        'heslo',
        'google_id',
        'notifikace_poptavky',
        'posledni_prihlaseni',
    ];

    protected $hidden = [
        'heslo',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_overen_v' => 'datetime',
            'heslo' => 'hashed',
            'notifikace_poptavky' => 'boolean',
            'posledni_prihlaseni' => 'datetime',
        ];
    }

    // Fortify/Auth používá sloupec `heslo` místo `password`.
    public function getAuthPassword(): string
    {
        return $this->heslo;
    }

    public function getAuthPasswordName(): string
    {
        return 'heslo';
    }

    /** Je členem master týmu? (subjekt s IČO = config('app.master_ico')) */
    public function jeMaster(): bool
    {
        return $this->subjekty()->where('ico', config('app.master_ico'))->exists();
    }

    /** Je supersprávce master týmu? (je_vlastnik na master subjektu) */
    public function jeSuperSpravce(): bool
    {
        return $this->subjekty()
            ->where('ico', config('app.master_ico'))
            ->wherePivot('je_vlastnik', true)
            ->exists();
    }

    public function subjekty(): BelongsToMany
    {
        return $this->belongsToMany(Subjekt::class, 'uzivatel_subjekt', 'uzivatel_id', 'subjekt_id')
            ->withPivot('je_vlastnik')
            ->withTimestamps('vytvoreno', 'upraveno');
    }

    /** Plné jméno "Jméno Příjmení". */
    public function celeJmeno(): string
    {
        return trim($this->jmeno . ' ' . $this->prijmeni);
    }

    public function aktivniSubjekt(): ?Subjekt
    {
        $subjektId = session('aktivni_subjekt_id');

        if ($subjektId) {
            $subjekt = $this->subjekty()->where('subjekty.id', $subjektId)->first();
            if ($subjekt) {
                return $subjekt;
            }
        }

        return $this->subjekty()->first();
    }
}
