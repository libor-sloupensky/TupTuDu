<?php

namespace App\Support;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Měření pro analýzu webu (modules/marketing.md, část Analýza webu).
 *
 * - Funkce editoru: souhrnný denní počet bez vazby na uživatele (tabulka statistika_funkci).
 * - Události pro Google Analytics: uloží se do session a cookie lišta je pošle na další stránce,
 *   jen pokud návštěvník souhlasil s analytikou (partials/cookies-lista).
 * Cestu od registrace k placení počítá `mereni:cesta` z dat, která už máme.
 */
class Mereni
{
    /** Funkce editoru, které se počítají. Nová funkce = přidat sem i k volání v editoru. */
    public const FUNKCE = [
        'import_vykresu', 'pohled_3d', 'export_pudorys', 'export_3d', 'sdileni',
        'katalog', 'parcela', 'podlazi', 'strecha',
    ];

    /** Připočte použití funkce k dnešku. Master tým (vlastní práce a testy) se nepočítá. */
    public static function funkce(string $funkce): void
    {
        if (! in_array($funkce, self::FUNKCE, true) || Auth::user()?->jeMaster()) {
            return;
        }

        DB::table('statistika_funkci')->upsert(
            [['den' => today()->toDateString(), 'funkce' => $funkce, 'pocet' => 1]],
            ['den', 'funkce'],
            ['pocet' => DB::raw('pocet + 1')],
        );
    }

    /** Událost pro Google Analytics na další stránce (sign_up, projekt_zalozen). */
    public static function gaUdalost(string $udalost): void
    {
        if (app()->runningInConsole() || ! request()->hasSession()) {
            return;
        }
        $fronta = (array) session('ga_udalosti', []);
        if (! in_array($udalost, $fronta, true)) {
            $fronta[] = $udalost;
        }
        session()->flash('ga_udalosti', $fronta);
    }
}
