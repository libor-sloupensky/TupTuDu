<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Paddle\Billable;

class Uzivatel extends Authenticatable implements MustVerifyEmail, HasLocalePreference
{
    // Billable = předplatné přes Paddle (Laravel Cashier) — tabulky customers, subscriptions, transactions
    use Billable, HasFactory, Notifiable;

    protected $table = 'uzivatele';

    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $fillable = [
        'jmeno',
        'prijmeni',
        'email',
        'telefon',
        'jazyk',
        'zeme',
        'heslo',
        'google_id',
        'souhlas_podminky_v',
        'zdroj_registrace',
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
            'souhlas_podminky_v' => 'datetime',
            'heslo' => 'hashed',
            'notifikace_poptavky' => 'boolean',
            'posledni_prihlaseni' => 'datetime',
        ];
    }

    // Fortify/Auth používá sloupec `heslo` místo `password`.
    public function getAuthPassword(): string
    {
        // Účet založený přes Google heslo nemá (NULL) — prázdný řetězec žádnému heslu neodpovídá
        return (string) $this->heslo;
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

    /** E-maily (ověření, obnova hesla) v jazyce uživatele, jinak v jazyce aktuální návštěvy. */
    public function preferredLocale(): string
    {
        return \App\Support\Lokalizace::jeJazyk($this->jazyk) ? $this->jazyk : app()->getLocale();
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new \App\Notifications\OvereniEmailu);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\ObnovaHesla($token));
    }

    protected static function booted(): void
    {
        // Klíčová událost pro Google Analytics (registrace e-mailem i přes Google), odejde jen se souhlasem
        static::created(fn () => \App\Support\Mereni::gaUdalost('sign_up'));
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

    /**
     * Firma uživatele: subjekt, kterému patří firemní věci (zatím jen logo pro tarif Profi).
     * Dnes má každý nejvýš jednu a je v ní sám; až půjde firmu sdílet, přibudou k subjektu další
     * uživatelé a tady se nic nemění. Master tým sdílí master subjekt.
     */
    public function firma(): ?Subjekt
    {
        return $this->subjekty()->orderByPivot('je_vlastnik', 'desc')->orderBy('subjekty.id')->first();
    }

    /** Založí uživateli vlastní firmu (bez IČO, pojmenovanou po něm) a vrátí ji. */
    public function zalozFirmu(): Subjekt
    {
        $firma = Subjekt::create(['nazev' => $this->celeJmeno() ?: $this->email, 'aktivni' => true]);
        $this->subjekty()->attach($firma->id, ['je_vlastnik' => true]);

        return $firma;
    }

    /** Soubor loga firmy, pokud ho uživatel smí používat (tarif Profi) a je nahrané. Jinak null. */
    public function logoFirmy(): ?string
    {
        if (\App\Support\Tarif::uzivatele($this) !== \App\Support\Tarif::PROFI) {
            return null;
        }

        return app(\App\Services\LogoUploader::class)->najdi($this->firma()?->logo);
    }

    /** Plné jméno "Jméno Příjmení". */
    public function celeJmeno(): string
    {
        return trim($this->jmeno . ' ' . $this->prijmeni);
    }

    /** Jméno zákazníka pro Paddle — Cashier jinak čte neexistující sloupec `name`. */
    public function paddleName(): ?string
    {
        return $this->celeJmeno() ?: null;
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
