<?php

namespace App\Support;

use App\Models\KonceptV3;
use App\Models\Uzivatel;
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
        'katalog', 'parcela', 'podlazi', 'strecha', 'prochazka',
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

    /**
     * Cesta od registrace k placení: kolik uživatelů registrovaných od daného dne došlo ke každému kroku.
     * Počítá z dat, která už máme, master tým se nepočítá. Používá `mereni:cesta` i Přehled v Masterteamu.
     *
     * @return array<int, array{0: string, 1: int}> [krok, počet uživatelů]
     */
    public static function cesta(\DateTimeInterface $od): array
    {
        $master = DB::table('uzivatel_subjekt')
            ->join('subjekty', 'subjekty.id', '=', 'uzivatel_subjekt.subjekt_id')
            ->where('subjekty.ico', config('app.master_ico'))
            ->pluck('uzivatel_subjekt.uzivatel_id');
        $uzivatele = Uzivatel::where(Uzivatel::CREATED_AT, '>=', $od)->whereNotIn('id', $master)->get(['id', 'email_overen_v']);
        $ids = $uzivatele->pluck('id');

        $projekty = KonceptV3::whereIn('uzivatel_id', $ids)->get(['uzivatel_id', 'data']);
        // Stěny jsou v datech aktivního podlaží nebo v uložených podlažích domu
        $seStenami = $projekty->filter(fn ($p) => str_contains(json_encode($p->data ?? []), '"steny":[{'))->pluck('uzivatel_id')->unique();
        $vratili = DB::table('denni_upravy')->whereIn('uzivatel_id', $ids)
            ->select('uzivatel_id')->groupBy('uzivatel_id')->havingRaw('COUNT(DISTINCT den) >= 2')->pluck('uzivatel_id');
        $platici = DB::table('subscriptions')->where('billable_type', (new Uzivatel)->getMorphClass())
            ->whereIn('billable_id', $ids)->whereIn('status', ['active', 'trialing', 'past_due'])->distinct()->pluck('billable_id');

        return [
            ['Registrace', $ids->count()],
            ['Ověřený e-mail', $uzivatele->whereNotNull('email_overen_v')->count()],
            ['Založil projekt', $projekty->pluck('uzivatel_id')->unique()->count()],
            ['Nakreslil stěny', $seStenami->count()],
            ['Upravoval aspoň 2 různé dny', $vratili->count()],
            ['Platí', $platici->count()],
        ];
    }

    /**
     * Použití funkcí editoru od daného dne (prohlížeč se započte nejvýš jednou za den).
     *
     * @return array<string, int> funkce => počet, v pořadí FUNKCE, včetně nepoužitých
     */
    public static function pouzitiFunkci(\DateTimeInterface $od): array
    {
        $pocty = DB::table('statistika_funkci')->where('den', '>=', $od->format('Y-m-d'))
            ->select('funkce', DB::raw('SUM(pocet) AS pocet'))
            ->groupBy('funkce')->pluck('pocet', 'funkce');

        return array_combine(self::FUNKCE, array_map(fn ($f) => (int) ($pocty[$f] ?? 0), self::FUNKCE));
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
