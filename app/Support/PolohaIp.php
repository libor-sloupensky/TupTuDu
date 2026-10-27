<?php

namespace App\Support;

use MaxMind\Db\Reader;

/**
 * Země podle IP adresy z lokální databáze DB-IP „IP to Country Lite" (CC BY 4.0).
 * Nikam se nic neposílá. Databázi stahuje `php artisan poloha:aktualizovat`
 * (měsíčně cronem /cron/poloha/{token}). Bez databáze vrací null.
 *
 * Licence: stránky, které výsledek používají, musí odkazovat na DB-IP
 * (partials/poloha-zdroj — patička zákaznických stránek).
 */
final class PolohaIp
{
    private static Reader|false|null $ctecka = null;

    public static function soubor(): string
    {
        return storage_path('app/poloha/dbip-country-lite.mmdb');
    }

    /** ISO kód země (CZ, DE…), null = neznámá (lokální IP, chybí databáze, chyba čtení). */
    public static function zeme(?string $ip): ?string
    {
        if (! $ip || ! ($ctecka = self::ctecka())) {
            return null;
        }

        try {
            $kod = $ctecka->get($ip)['country']['iso_code'] ?? null;
        } catch (\Throwable) {
            return null; // neplatná nebo neveřejná IP — není co hlásit
        }

        return is_string($kod) && preg_match('/^[A-Z]{2}$/', $kod) ? $kod : null;
    }

    /** Uvolní soubor — před výměnou databáze (Windows nedovolí přepsat otevřený soubor). */
    public static function zavri(): void
    {
        if (self::$ctecka instanceof Reader) {
            self::$ctecka->close();
        }
        self::$ctecka = null;
    }

    private static function ctecka(): Reader|false
    {
        if (self::$ctecka === null) {
            try {
                self::$ctecka = is_file(self::soubor()) ? new Reader(self::soubor()) : false;
            } catch (\Throwable $e) {
                // Poškozený soubor = jazyk podle země přestane fungovat, uživatel to nepozná → nahlásit
                \Illuminate\Support\Facades\Log::error('Databáze polohy podle IP nejde otevřít: ' . $e->getMessage());
                self::$ctecka = false;
            }
        }

        return self::$ctecka;
    }
}
