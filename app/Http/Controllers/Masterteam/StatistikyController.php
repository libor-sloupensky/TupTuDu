<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Models\Uzivatel;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Masterteam ▸ Statistiky
 *
 * Návštěvy webu (vložený přehled z Looker Studia nad GA4) a graf registrací
 * s počtem platících z vlastní databáze. Popis v modules/statistiky.md.
 */
class StatistikyController extends Controller
{
    /** Stavy transakce z Paddlu, které znamenají přijaté peníze. */
    private const ZAPLACENO = ['completed', 'paid'];

    public function index()
    {
        return view('masterteam.statistiky', [
            'lookerUrl' => config('services.looker.navstevy_url'),
        ]);
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
