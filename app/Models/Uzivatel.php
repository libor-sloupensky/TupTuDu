<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Uzivatel extends Authenticatable
{
    use HasFactory, Notifiable;
    // Přístup k firmám modulu Doklady — officeFirmy(), officeAktivniFirma() atd.
    use \App\Models\Office\MaPristupKFirmam;

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

    /**
     * Ověření e-mailu drží sloupec `email_overen_v`, ne standardní
     * `email_verified_at`. Bez těchhle dvou metod by Laravel četl neexistující
     * sloupec, hasVerifiedEmail() by vracelo vždy false a navázaná logika
     * (např. přijetí čekajících pozvánek do firmy) by tiše nedělala nic.
     */
    public function hasVerifiedEmail(): bool
    {
        return ! is_null($this->email_overen_v);
    }

    public function markEmailAsVerified(): bool
    {
        return $this->forceFill(['email_overen_v' => now()])->save();
    }

    public function getEmailForVerification(): string
    {
        return $this->email;
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

    /**
     * Zamaskovaný e-mail pro zobrazení cizímu uživateli — např. "ja***r@seznam.cz".
     * Používá se tam, kde chceme naznačit, kdo účet spravuje, ale neprozradit adresu.
     */
    public static function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);

        if (strlen($local) <= 2) {
            return $local[0] . '***@' . $domain;
        }

        return substr($local, 0, 2) . '***' . substr($local, -1) . '@' . $domain;
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
