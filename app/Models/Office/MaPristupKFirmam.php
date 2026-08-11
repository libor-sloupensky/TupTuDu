<?php

namespace App\Models\Office;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Přístup uživatele k firmám modulu Doklady.
 *
 * Vytažené do traitu, aby se modul nerozlézal do jádra — Uzivatel jen
 * `use`ne tenhle trait a zbytek modulu si žije vlastním životem.
 *
 * Aktivní firma se drží v session pod `office_firma_ico` (odděleně od
 * `aktivni_subjekt_id` plánovací části).
 */
trait MaPristupKFirmam
{
    /** Firmy, ke kterým má uživatel přímý přístup. */
    public function officeFirmy(): BelongsToMany
    {
        return $this->belongsToMany(Firma::class, 'office_user_firma', 'user_id', 'firma_ico')
            ->withPivot('role', 'interni_role')
            ->withTimestamps();
    }

    /**
     * Firma, se kterou uživatel právě pracuje. Když v session nic není
     * (nebo na ni ztratil přístup), vezme se první dostupná.
     */
    public function officeAktivniFirma(): ?Firma
    {
        $ico = session('office_firma_ico');

        if ($ico) {
            if ($this->officeFirmy()->where('office_firmy.ico', $ico)->exists()) {
                return Firma::find($ico);
            }
            if ($this->officeJeKlientFirma($ico)) {
                return Firma::find($ico);
            }
        }

        return $this->officeFirmy()->first();
    }

    /** Je tahle firma klientem některé z účetních firem uživatele? */
    public function officeJeKlientFirma(?string $ico = null): bool
    {
        if (! $ico) {
            return false;
        }

        $ucetniIcos = $this->officeFirmy()->wherePivot('role', 'ucetni')->pluck('office_firmy.ico')->toArray();
        if (empty($ucetniIcos)) {
            return false;
        }

        return UcetniVazba::whereIn('ucetni_ico', $ucetniIcos)
            ->where('klient_ico', $ico)
            ->where('stav', 'schvaleno')
            ->exists();
    }

    /** Dívá se uživatel právě na cizí (klientskou) firmu? */
    public function officeProhlizimKlienta(): bool
    {
        $ico = session('office_firma_ico');
        if (! $ico) {
            return false;
        }

        if ($this->officeFirmy()->where('office_firmy.ico', $ico)->exists()) {
            return false;
        }

        return $this->officeJeKlientFirma($ico);
    }

    /** Vazba účetní ↔ klient — kvůli oprávněním (vkládat/upravovat/mazat). */
    public function officeUcetniVazbaProKlienta(?string $klientIco = null): ?UcetniVazba
    {
        $klientIco = $klientIco ?? session('office_firma_ico');
        if (! $klientIco) {
            return null;
        }

        $ucetniIcos = $this->officeFirmy()->wherePivot('role', 'ucetni')->pluck('office_firmy.ico')->toArray();
        if (empty($ucetniIcos)) {
            return null;
        }

        return UcetniVazba::whereIn('ucetni_ico', $ucetniIcos)
            ->where('klient_ico', $klientIco)
            ->where('stav', 'schvaleno')
            ->first();
    }

    public function officeMaRoli(string $role, ?string $ico = null): bool
    {
        $ico = $ico ?? session('office_firma_ico');

        return $this->officeFirmy()->where('office_firmy.ico', $ico)->wherePivot('role', $role)->exists();
    }

    public function officeJeSuperadmin(?string $ico = null): bool
    {
        $ico = $ico ?? session('office_firma_ico');

        return $this->officeFirmy()->where('office_firmy.ico', $ico)
            ->wherePivot('interni_role', 'superadmin')
            ->exists();
    }

    /** Všechna IČO, na která uživatel vidí — vlastní firmy i klienti. */
    public function officeDostupneIco(): array
    {
        $icos = $this->officeFirmy()->pluck('office_firmy.ico')->toArray();

        $ucetniIcos = $this->officeFirmy()->wherePivot('role', 'ucetni')->pluck('office_firmy.ico')->toArray();
        foreach ($ucetniIcos as $uIco) {
            $firma = Firma::find($uIco);
            if ($firma) {
                $icos = array_merge($icos, $firma->klienti()->pluck('office_firmy.ico')->toArray());
            }
        }

        return array_unique($icos);
    }
}
