<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Models\Uzivatel;
use App\Services\Google\GoogleApi;
use App\Support\Mereni;
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
        $this->casNaGoogle();

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
        $this->casNaGoogle();

        try {
            // Po dnech, stránkách a výrazech jedním souběžným dotazem (bug 84: za sebou přelezly 30 s)
            ['dny' => $radky, 'stranky' => $poStrankach, 'vyrazy' => $poVyrazech] = Cache::remember(
                "statistiky-vyhledavani-vse-{$od->toDateString()}", 3600,
                fn () => $google->vyhledavaniVse($od->toDateString(), now()->toDateString()));
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
            // Hledané výrazy od nejčastěji zobrazených; pozice má smysl právě u jednotlivého výrazu
            'vyrazy' => collect($poVyrazech)->map(fn ($v, $vyraz) => ['vyraz' => (string) $vyraz] + $v)
                ->sortByDesc('zobrazeni')->take(100)->values(),
            'indexace' => [
                'adres' => (clone $stav)->count(),
                'zaindexovano' => (clone $stav)->where('zaindexovano', true)->count(),
                'zkontrolovano' => ($cas = (clone $stav)->max('zkontrolovano_v')) ? Carbon::parse($cas)->format('j. n. Y H:i') : null,
                // Všechny adresy ze sitemapy se stavem a výkonem ve vyhledávání za období
                'stranky' => (clone $stav)->orderBy('adresa')
                    ->get(['adresa', 'zaindexovano', 'stav', 'prochazeno', 'robot'])
                    ->map(fn ($u) => [
                        'adresa' => $u->adresa,
                        'zaindexovano' => (bool) $u->zaindexovano,
                        'stav' => $u->stav,
                        'prochazeno' => $u->prochazeno ? Carbon::parse($u->prochazeno)->format('j. n. Y') : null,
                        'robot' => ['MOBILE' => 'mobilní', 'DESKTOP' => 'počítačový'][$u->robot] ?? null,
                        'zobrazeni' => $poStrankach[$u->adresa]['zobrazeni'] ?? 0,
                        'kliknuti' => $poStrankach[$u->adresa]['kliknuti'] ?? 0,
                        'pozice' => $poStrankach[$u->adresa]['pozice'] ?? null,
                    ])
                    // nejdřív stránky, které se ve vyhledávání ukazují nejvíc
                    ->sortByDesc('zobrazeni')->values(),
            ],
            'dnu' => $dnu,
        ]);
    }

    /** Názvy měřených funkcí editoru (App\Support\Mereni::FUNKCE) pro Přehled. */
    private const FUNKCE_NAZVY = [
        'import_vykresu' => 'Import výkresu',
        'pohled_3d' => '3D pohled',
        'export_pudorys' => 'Export půdorysu',
        'export_3d' => 'Export 3D',
        'sdileni' => 'Sdílení odkazem',
        'katalog' => 'Kus z katalogu',
        'parcela' => 'Parcela',
        'podlazi' => 'Podlaží',
        'strecha' => 'Střecha',
        'prochazka' => 'Procházka',
    ];

    /**
     * JSON pro cestu od registrace k placení (uživatelé registrovaní ve zvoleném období)
     * a použití funkcí editoru. Výpočet sdílí s příkazem `mereni:cesta`.
     */
    public function cestaData(Request $r): JsonResponse
    {
        $dnu = (int) $r->query('dnu', 30);
        if (! in_array($dnu, [0, 7, 30, 90, 365], true)) {
            $dnu = 30;
        }
        // 0 = celé období
        $od = $dnu === 0 ? Carbon::create(2000) : Carbon::now()->subDays($dnu - 1)->startOfDay();

        $funkce = [];
        foreach (Mereni::pouzitiFunkci($od) as $klic => $pocet) {
            $funkce[] = [self::FUNKCE_NAZVY[$klic] ?? $klic, $pocet];
        }

        return response()->json(['kroky' => Mereni::cesta($od), 'funkce' => $funkce]);
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

    /**
     * Selhání Googlu: zápis do bugů (Log::error se zrcadlí) a srozumitelná odpověď pro stránku.
     * Výpadek spojení (vypršel čas, nedostupný server) je šum sítě, ne chyba kódu: jen do laravel.log.
     */
    /**
     * Pojistka pro dotazy na Google: jeden smí trvat až 30 s (GoogleApi), výchozí limit PHP je také 30 s
     * a jeho překročení je fatální chyba, kterou catch nechytí (bug 84). S rezervou pomalý Google skončí
     * výjimkou a srozumitelnou hláškou.
     */
    private function casNaGoogle(): void
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit(90);
        }
    }

    private function chybaGoogle(\Throwable $e, string $co): JsonResponse
    {
        $zprava = "Statistiky: {$co} z Googlu se nepodařilo načíst — " . $e->getMessage();
        $vypadekSite = $e instanceof \GuzzleHttp\Exception\ConnectException
            || $e instanceof \Illuminate\Http\Client\ConnectionException
            || preg_match('/cURL error (6|7|28|35|52|56):/', $e->getMessage());
        $vypadekSite ? Log::warning($zprava) : Log::error($zprava);

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
            // Běžící zkouška Stavebníku zdarma (App\Support\Tarif::zacniZkousku) a kolik ji kdy zapnulo
            've_zkousce' => $zakaznici()->where('zkouska_do', '>', now())->count(),
            'zkouska_celkem' => $zakaznici()->whereNotNull('zkouska_od')->count(),
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
