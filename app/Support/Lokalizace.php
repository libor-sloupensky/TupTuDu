<?php

namespace App\Support;

/**
 * Jazyk a země aktuálního requestu. Nastavuje je middleware NastavLokalizaci,
 * hodnoty a jejich význam jsou v config/lokalizace.php.
 */
final class Lokalizace
{
    private static ?string $zeme = null;

    /** Kódy jazyků, které lze zvolit (cs, en, …). */
    public static function jazyky(): array
    {
        return array_keys(config('lokalizace.jazyky'));
    }

    public static function jeJazyk(?string $kod): bool
    {
        return is_string($kod) && in_array($kod, self::jazyky(), true);
    }

    public static function jazyk(): string
    {
        return app()->getLocale();
    }

    public static function nastavZemi(?string $zeme): void
    {
        self::$zeme = $zeme ? strtoupper($zeme) : null;
    }

    public static function zeme(): string
    {
        return self::$zeme ?? config('lokalizace.vychozi_zeme');
    }

    /** Národní služby dostupné v zemi uživatele (katastr, vyskovy_profil, …). */
    public static function funkce(): array
    {
        return config('lokalizace.zeme.' . self::zeme(), []);
    }

    public static function maFunkci(string $funkce): bool
    {
        return in_array($funkce, self::funkce(), true);
    }
}
