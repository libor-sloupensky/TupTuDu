<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Models\KonkurenceHodnota;
use App\Models\KonkurenceMereni;
use App\Models\KonkurenceParametr;
use App\Models\Konkurent;
use App\Models\KonkurenceUdalost;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Analýza konkurence v Masterteamu (modules/konkurence.md): přehled konkurentů s vývojem,
 * katalog parametrů s režimem sledovat / tiše / nesledovat, matice posledního měření a události.
 */
class KonkurenceController extends Controller
{
    /** Jazyky, na které TupTuDu míří (pořadí trhů z modules/lokalizace.md). */
    public const CILOVE_JAZYKY = ['cs', 'sk', 'pl', 'de', 'fr', 'es', 'it', 'en'];

    public function index(Request $request)
    {
        $zalozka = in_array($request->input('z'), ['prehled', 'parametry', 'matice', 'udalosti'], true)
            ? $request->input('z') : 'prehled';

        $parametry = KonkurenceParametr::serazene()->get();
        $konkurenti = Konkurent::orderByRaw("klic = 'tuptudu' desc")->orderBy('poradi')->get();
        $mereni = KonkurenceMereni::posledni();
        $predchozi = $mereni?->predchozi();

        // Hodnoty posledního měření: [konkurent_id][parametr_id] => hodnota
        $hodnoty = [];
        if ($mereni) {
            foreach (KonkurenceHodnota::where('mereni_id', $mereni->id)->get() as $h) {
                $hodnoty[$h->konkurent_id][$h->parametr_id] = $h;
            }
        }

        $data = compact('zalozka', 'parametry', 'konkurenti', 'mereni', 'predchozi', 'hodnoty');
        $data['pocty'] = $parametry->countBy('rezim');
        $data['skupiny'] = KonkurenceParametr::SKUPINY;

        if ($zalozka === 'prehled') {
            $data['radky'] = $this->prehled($konkurenti, $parametry, $hodnoty, $mereni, $predchozi);
            $data['mesice'] = collect(range(11, 0))->map(fn ($i) => now()->startOfMonth()->subMonths($i));
        }
        if ($zalozka === 'udalosti') {
            $data['udalosti'] = KonkurenceUdalost::with('konkurent')->orderByDesc('datum')->orderBy('konkurent_id')->get();
        }

        return view('masterteam.konkurence.index', $data);
    }

    /** Řádky přehledu: funkce ze sledovaných parametrů, jazyky, signály vývoje a události po měsících. */
    private function prehled($konkurenti, $parametry, array $hodnoty, ?KonkurenceMereni $mereni, ?KonkurenceMereni $predchozi): array
    {
        $sledovaneStav = $parametry->where('rezim', 'sledovat')->where('typ', 'stav');
        $param = $parametry->keyBy('klic');
        $od = now()->startOfMonth()->subMonths(11);
        $udalosti = KonkurenceUdalost::where('datum', '>=', $od)->get()->groupBy('konkurent_id');

        // Změny proti předchozímu měření (vývoj = rozdíl dvou snímků)
        $zmeny = [];
        if ($predchozi) {
            $stare = KonkurenceHodnota::where('mereni_id', $predchozi->id)->get()
                ->keyBy(fn ($h) => $h->konkurent_id . '-' . $h->parametr_id);
            foreach ($hodnoty as $kId => $radek) {
                foreach ($radek as $pId => $h) {
                    $s = $stare[$kId . '-' . $pId] ?? null;
                    if (! $s || $s->otisk() !== $h->otisk()) {
                        $zmeny[$kId] = ($zmeny[$kId] ?? 0) + 1;
                    }
                }
            }
        }

        $radky = [];
        foreach ($konkurenti as $k) {
            $h = $hodnoty[$k->id] ?? [];
            $body = 0;
            foreach ($sledovaneStav as $p) {
                $v = $h[$p->id]->hodnota ?? null;
                $body += $v === 'ano' ? 1 : ($v === 'castecne' ? 0.5 : 0);
            }
            $hodn = fn ($klic) => isset($param[$klic]) ? ($h[$param[$klic]->id] ?? null) : null;
            $poMesicich = [];
            foreach ($udalosti[$k->id] ?? [] as $u) {
                $m = $u->datum->format('Y-m');
                $poMesicich[$m] = ($poMesicich[$m] ?? 0) + 1;
            }
            $radky[] = [
                'k' => $k,
                'body' => $body,
                'z' => $sledovaneStav->count(),
                'jazyky' => $hodn('i_jazyky_nastroj')?->data ?? [],
                'jazykyWeb' => $hodn('i_jazyky_web')?->data ?? [],
                'verdikt' => $hodn('k_verdikt'),
                'vydani' => $hodn('k_posledni_vydani')?->text,
                'vydaniPozn' => $hodn('k_posledni_vydani')?->poznamka,
                'vydani6' => $hodn('k_vydani_6m')?->cislo,
                'cena' => $hodn('j_cena_min')?->cislo,
                'udalosti' => $poMesicich,
                'udalostiCelkem' => array_sum($poMesicich),
                'zmeny' => $zmeny[$k->id] ?? null,
            ];
        }

        return $radky;
    }

    /** Náhled veřejného profilu nástroje (modules/srovnani.md). Na web zatím nic nejde. */
    public function nahledProfilu(Konkurent $konkurent)
    {
        abort_if($konkurent->jeTuptudu(), 404);

        return view('srovnani.profil', ['s' => \App\Support\KonkurenceSrovnani::pro($konkurent), 'nahled' => true]);
    }

    /** Náhled stránky „X vs TupTuDu“ (modules/srovnani.md). */
    public function nahledSrovnani(Konkurent $konkurent)
    {
        abort_if($konkurent->jeTuptudu(), 404);

        return view('srovnani.vs', ['s' => \App\Support\KonkurenceSrovnani::pro($konkurent), 'nahled' => true]);
    }

    public function rezimParametru(Request $request, KonkurenceParametr $parametr)
    {
        $parametr->update($request->validate(['rezim' => 'required|in:sledovat,tise,nesledovat']));

        return response()->json(['ok' => true, 'pocty' => KonkurenceParametr::query()->get()->countBy('rezim')]);
    }

    public function rezimKonkurenta(Request $request, Konkurent $konkurent)
    {
        $konkurent->update($request->validate(['rezim' => 'required|in:sledovat,tise,nesledovat']));

        return response()->json(['ok' => true]);
    }

    /**
     * Přenos dat analýzy na produkci (modules/konkurence.md, Import): POST JSON ve tvaru konkurence:import,
     * hlavička X-DB-Token = CRON_TOKEN. Data jsou mimo veřejný repozitář, proto nejdou seederem.
     * Režim existujících řádků nepřepíše, jen s ?prepsat-rezim=1.
     */
    public function importPresToken(Request $request)
    {
        $token = (string) config('services.cron_token');
        if ($token === '' || ! hash_equals($token, (string) $request->header('X-DB-Token'))) {
            abort(404);
        }
        $data = json_decode($request->getContent(), true);
        // Filtr hostingu vrací 400 na některé texty v těle (URL, slova jako v SQL), proto data chodí
        // zabalená: {"gz": base64(gzip(JSON))}. Prostý JSON funguje dál (lokálně).
        if (is_array($data) && isset($data['gz'])) {
            $rozbalene = @gzdecode((string) base64_decode((string) $data['gz'], true));
            $data = $rozbalene === false ? null : json_decode($rozbalene, true);
        }
        if (! is_array($data)) {
            return response()->json(['ok' => false, 'chyba' => 'Tělo není platný JSON.'], 422);
        }
        $souhrn = \App\Support\KonkurenceImport::importuj($data, $request->boolean('prepsat-rezim'));
        if ($souhrn['chyby']) {
            \Illuminate\Support\Facades\Log::error('Import konkurence: ' . count($souhrn['chyby']) . ' chyb', ['prvni' => array_slice($souhrn['chyby'], 0, 5)]);
        }

        return response()->json(['ok' => ! $souhrn['chyby'], 'souhrn' => $souhrn]);
    }

    /** Barva verdiktu vývoje pro štítek (CSS proměnné brandu). */
    public static function barvaVerdiktu(?string $verdikt): string
    {
        $v = mb_strtolower((string) $verdikt);

        return match (true) {
            str_contains($v, 'aktivní') => 'var(--c-ok)',
            str_contains($v, 'údržba') => 'var(--c-warn)',
            str_contains($v, 'stagnace'), str_contains($v, 'zanikl') => 'var(--c-error)',
            default => 'var(--c-text-secondary)',
        };
    }

    /** Datum z textu hodnoty (2026-10-28 nebo 2026-10) jako Carbon, jinak null. */
    public static function datum(?string $text): ?Carbon
    {
        if ($text && preg_match('/^(\d{4})-(\d{2})(?:-(\d{2}))?/', $text, $m)) {
            return Carbon::create((int) $m[1], (int) $m[2], (int) ($m[3] ?? 1));
        }

        return null;
    }
}
