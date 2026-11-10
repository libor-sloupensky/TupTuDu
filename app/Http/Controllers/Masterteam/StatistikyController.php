<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Models\Uzivatel;
use App\Services\Google\GoogleApi;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Masterteam ▸ Přehled (statistiky)
 *
 * Návštěvy webu z GA4, registrace s počtem platících z vlastní databáze, výkon ve
 * vyhledávání a indexace ze Search Console. Popis v modules/statistiky.md.
 */
class StatistikyController extends Controller
{
    /** Stavy transakce z Paddlu, které znamenají přijaté peníze. */
    private const ZAPLACENO = ['completed', 'paid'];

    public function index(GoogleApi $google)
    {
        return view('masterteam.statistiky', [
            'googleNastaven' => $google->nastaveno(),
        ]);
    }

    /**
     * JSON pro graf návštěv z GA4: návštěvníci, relace a zobrazení stránek po dnech.
     * Odpověď Googlu se drží půl hodiny v cache.
     */
    public function navstevyData(Request $r, GoogleApi $google): JsonResponse
    {
        [$dnu, $od] = $this->obdobiMereni($r);

        try {
            $data = Cache::remember("statistiky-navstevy-{$od->toDateString()}", 1800,
                fn () => $google->navstevy($od->toDateString(), 'today'));
        } catch (\Throwable $e) {
            return $this->chybaGoogle($e, 'návštěvy');
        }

        $poDnech = collect($data['dny'])->keyBy('den');
        $vystup = ['labels' => [], 'navstevnici' => [], 'relace' => [], 'zobrazeni' => []];
        foreach ($this->dny($dnu) as $den) {
            $radek = $poDnech[$den->format('Y-m-d')] ?? null;
            $vystup['labels'][] = $this->popisek($den, $dnu);
            foreach (['navstevnici', 'relace', 'zobrazeni'] as $co) {
                $vystup[$co][] = (int) ($radek[$co] ?? 0);
            }
        }

        return response()->json($vystup + ['celkem' => $data['celkem'], 'dnu' => $dnu]);
    }

    /**
     * JSON pro grafy vyhledávání: zobrazení a kliknutí ze Search Console po dnech
     * a počet zaindexovaných adres ze sitemapy z denní kontroly (`indexace:kontrola`).
     */
    public function vyhledavaniData(Request $r, GoogleApi $google): JsonResponse
    {
        [$dnu, $od] = $this->obdobiMereni($r);

        try {
            $radky = Cache::remember("statistiky-vyhledavani-{$od->toDateString()}", 3600,
                fn () => $google->vyhledavani($od->toDateString(), now()->toDateString()));
        } catch (\Throwable $e) {
            return $this->chybaGoogle($e, 'vyhledávání');
        }

        $poDnech = collect($radky)->keyBy('den');
        // Search Console má data se zpožděním — dny po posledním známém nechat prázdné, ne nulové
        $posledni = $poDnech->keys()->max();
        $indexace = DB::table('indexace_denne')->where('den', '>=', $od->toDateString())->get()->keyBy('den');

        $vystup = ['labels' => [], 'zobrazeni' => [], 'kliknuti' => [], 'zaindexovano' => [], 'adres' => []];
        foreach ($this->dny($dnu) as $den) {
            $klic = $den->format('Y-m-d');
            $znamy = $posledni !== null && $klic <= $posledni;
            $vystup['labels'][] = $this->popisek($den, $dnu);
            $vystup['zobrazeni'][] = $znamy ? (int) ($poDnech[$klic]['zobrazeni'] ?? 0) : null;
            $vystup['kliknuti'][] = $znamy ? (int) ($poDnech[$klic]['kliknuti'] ?? 0) : null;
            $vystup['zaindexovano'][] = isset($indexace[$klic]) ? (int) $indexace[$klic]->zaindexovano : null;
            $vystup['adres'][] = isset($indexace[$klic]) ? (int) $indexace[$klic]->adres : null;
        }

        $zobrazeni = $poDnech->sum('zobrazeni');
        $stav = DB::table('indexace_url');

        return response()->json($vystup + [
            'celkem' => [
                'zobrazeni' => $zobrazeni,
                'kliknuti' => $poDnech->sum('kliknuti'),
                // Průměrná pozice vážená zobrazeními (jako v Search Console)
                'pozice' => $zobrazeni > 0 ? round($poDnech->sum(fn ($d) => $d['pozice'] * $d['zobrazeni']) / $zobrazeni, 1) : null,
            ],
            'indexace' => [
                'adres' => (clone $stav)->count(),
                'zaindexovano' => (clone $stav)->where('zaindexovano', true)->count(),
                'zkontrolovano' => ($cas = (clone $stav)->max('zkontrolovano_v')) ? Carbon::parse($cas)->format('j. n. Y H:i') : null,
                'chybi' => (clone $stav)->where('zaindexovano', false)->orderBy('adresa')
                    ->get(['adresa', 'stav', 'prochazeno'])
                    ->map(fn ($u) => [
                        'adresa' => $u->adresa,
                        'stav' => $u->stav,
                        'prochazeno' => $u->prochazeno ? Carbon::parse($u->prochazeno)->format('j. n. Y') : null,
                    ]),
            ],
            'dnu' => $dnu,
        ]);
    }

    /**
     * Období pro data z Googlu: [počet dní, první den]. 0 = celé období od začátku měření.
     *
     * @return array{0: int, 1: Carbon}
     */
    private function obdobiMereni(Request $r): array
    {
        $dnu = (int) $r->query('dnu', 30);
        if (! in_array($dnu, [0, 7, 30, 90, 365], true)) {
            $dnu = 30;
        }
        if ($dnu === 0) {
            $dnu = (int) Carbon::parse(config('services.google_api.mereno_od'))->startOfDay()->diffInDays(Carbon::now()->startOfDay()) + 1;
        }

        return [$dnu, Carbon::now()->subDays($dnu - 1)->startOfDay()];
    }

    /** @return Carbon[] dny období od nejstaršího po dnešek */
    private function dny(int $dnu): array
    {
        return array_map(fn ($i) => Carbon::now()->subDays($i), range($dnu - 1, 0));
    }

    /** Popisek dne na ose; přes rok by se data bez roku opakovala. */
    private function popisek(Carbon $den, int $dnu): string
    {
        return $den->format($dnu > 365 ? 'j. n. Y' : 'j. n.');
    }

    /** Selhání Googlu: zápis do bugů (Log::error se zrcadlí) a srozumitelná odpověď pro stránku. */
    private function chybaGoogle(\Throwable $e, string $co): JsonResponse
    {
        Log::error("Statistiky: {$co} z Googlu se nepodařilo načíst — " . $e->getMessage());

        return response()->json(['chyba' => 'Data z Googlu se nepodařilo načíst.'], 502);
    }

    /**
     * JSON pro Chart.js — registrace per den za posledních N dní (7/30/90/365,
     * 0 = celé období) a počet platících ke konci každého dne.
     *
     * Doplní i dny bez registrace (0), aby graf měl souvislou časovou osu.
     * Master tým se nepočítá (interní účty, tarif mají bez placení).
     */
    public function registraceData(Request $r): JsonResponse
    {
        $dnu = (int) $r->query('dnu', 30);
        if (! in_array($dnu, [0, 7, 30, 90, 365], true)) {
            $dnu = 30;
        }

        $zakaznici = fn () => Uzivatel::whereNotIn('id', $this->masterIds());

        // 0 = celé období — od první registrace.
        $celeObdobi = $dnu === 0;
        if ($celeObdobi) {
            $prvni = $zakaznici()->min('vytvoreno');
            $dnu = $prvni
                ? (int) Carbon::parse($prvni)->startOfDay()->diffInDays(Carbon::now()->startOfDay()) + 1
                : 30;
        }

        // Předstih pro klouzavé průměry: aby i první den grafu měl plné okno
        // ze skutečných dat. U celého období před první registrací nic není
        // (nuly by průměr na začátku stáhly) → bez předstihu, okno se zkrátí.
        $predstih = $celeObdobi ? 0 : 29;
        $od = Carbon::now()->subDays($dnu - 1 + $predstih)->startOfDay();
        $odGrafu = Carbon::now()->subDays($dnu - 1)->startOfDay();

        $raw = $zakaznici()->where('vytvoreno', '>=', $od)
            ->select(DB::raw('DATE(vytvoreno) as den'), DB::raw('COUNT(*) as pocet'))
            ->groupBy('den')
            ->pluck('pocet', 'den');

        // Řada včetně předstihu (jen pro průměry)
        $rada = [];
        for ($i = $dnu - 1 + $predstih; $i >= 0; $i--) {
            $rada[] = (int) ($raw[Carbon::now()->subDays($i)->format('Y-m-d')] ?? 0);
        }

        $labels = [];
        $dny = [];
        for ($i = $dnu - 1; $i >= 0; $i--) {
            $den = Carbon::now()->subDays($i);
            $dny[] = $den->copy()->endOfDay();
            // Přes rok by se data bez roku opakovala (celé období)
            $labels[] = $den->format($dnu > 365 ? 'j. n. Y' : 'j. n.');
        }
        $pocty = array_slice($rada, $predstih);
        $celkem = array_sum($pocty);

        $platici = $this->platiciPoDnech($dny);

        return response()->json([
            'labels' => $labels,
            'registrace' => $pocty,
            'klouzavy_7' => array_slice($this->klouzavyPrumer($rada, 7), $predstih),
            'klouzavy_30' => array_slice($this->klouzavyPrumer($rada, 30), $predstih),
            'platici' => $platici,
            'celkem' => $celkem,
            'uzivatelu' => $zakaznici()->count(),
            'platici_ted' => $platici ? end($platici) : 0,
            'trzby' => $this->trzby($odGrafu),
            'prumer_den' => $dnu > 0 ? round($celkem / $dnu, 1) : 0,
            'dnu' => $dnu,
        ]);
    }

    /** ID členů master týmu — do statistik zákazníků nepatří. */
    private function masterIds(): array
    {
        return DB::table('uzivatel_subjekt')
            ->join('subjekty', 'subjekty.id', '=', 'uzivatel_subjekt.subjekt_id')
            ->where('subjekty.ico', config('app.master_ico'))
            ->pluck('uzivatel_subjekt.uzivatel_id')
            ->all();
    }

    /**
     * Počet platících zákazníků ke konci každého dne.
     *
     * Historii stavů předplatného nedržíme, počítá se z jeho začátku a konce:
     * předplatné platí od založení do `ends_at`. Krátké výpadky (nezaplacené
     * obnovení, pozastavení) se v minulosti neprojeví.
     *
     * @param  Carbon[]  $dny  konce dnů
     * @return int[]
     */
    private function platiciPoDnech(array $dny): array
    {
        $predplatna = DB::table('subscriptions')
            ->where('billable_type', (new Uzivatel)->getMorphClass())
            ->whereNotIn('billable_id', $this->masterIds())
            ->get(['billable_id', 'created_at', 'ends_at'])
            ->map(fn ($p) => [
                'kdo' => $p->billable_id,
                'od' => Carbon::parse($p->created_at),
                'do' => $p->ends_at ? Carbon::parse($p->ends_at) : null,
            ]);

        return array_map(
            fn (Carbon $den) => $predplatna
                ->filter(fn ($p) => $p['od']->lte($den) && ($p['do'] === null || $p['do']->gt($den)))
                ->unique('kdo')
                ->count(),
            $dny
        );
    }

    /**
     * Tržby od daného dne podle měny, bez DPH (částky z Paddlu jsou v haléřích
     * a centech). Poplatky Paddlu a vrácené platby odečtené nejsou.
     *
     * @return array<string, float> měna => částka
     */
    private function trzby(Carbon $od): array
    {
        return DB::table('transactions')
            ->where('billable_type', (new Uzivatel)->getMorphClass())
            ->whereNotIn('billable_id', $this->masterIds())
            ->whereIn('status', self::ZAPLACENO)
            ->where('billed_at', '>=', $od)
            ->get(['total', 'tax', 'currency'])
            ->groupBy('currency')
            ->map(fn ($skupina) => round($skupina->sum(fn ($t) => ((int) $t->total - (int) $t->tax) / 100), 2))
            ->all();
    }

    /** Klouzavý průměr; na začátku řady menší okno, aby křivka nezačínala až po $okno dnech. */
    private function klouzavyPrumer(array $pocty, int $okno): array
    {
        $vysledek = [];
        foreach ($pocty as $i => $_) {
            $start = max(0, $i - $okno + 1);
            $vzorek = array_slice($pocty, $start, $i - $start + 1);
            $vysledek[] = round(array_sum($vzorek) / count($vzorek), 2);
        }

        return $vysledek;
    }
}
