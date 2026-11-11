<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
// Alias: tělo controlleru pracuje s Koncept, což je model tabulky koncepty_v3.
use App\Models\KonceptV3 as Koncept;
use App\Services\Katastr\KatastrService;
use App\Services\Katastr\Dmr5gService;
use App\Support\Mereni;
use App\Support\Tarif;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * Koncept V3 — editor (masterteam i zákaznická aplikace).
 */
class KonceptV3Controller extends Controller
{
    public function indexK(Request $request)
    {
        $koncepty = Koncept::where('uzivatel_id', Auth::id())
            ->orderByDesc('upraveno')
            ->get();

        $aktivniId = (int) $request->query('id', 0);
        $aktivni = $aktivniId ? $koncepty->firstWhere('id', $aktivniId) : null;

        return view('masterteam.koncept-v3', compact('koncepty', 'aktivni'));
    }

    public function ulozit(Request $request, Koncept $koncept)
    {
        $this->autorizuj($koncept);

        $request->validate([
            'nazev' => 'sometimes|string|max:255',
            'data' => 'sometimes|array',
            'akce' => 'sometimes|string|max:100',
            // metadata drží mj. stav podkladu importu (obrázek výkresu pod kresbou)
            'metadata' => 'sometimes|nullable|array',
            // Historie = časová osa kroků (stav PO akci). Klient posílá nové
            // kroky, id kroku, za který patří (`po` — co bylo za ním, se po
            // Zpět zahodí), a id kroku, na kterém uživatel stojí (`aktualni`).
            'kroky' => 'sometimes|array|max:60',
            'kroky.*.id' => 'required|string|max:40',
            'kroky.*.popis' => 'nullable|string|max:200',
            'kroky.*.data' => 'nullable|array',
            'kroky.*.cas' => 'nullable|string|max:40',
            'kroky.*.podklad' => 'nullable|array',
            'po' => 'nullable|string|max:40',
            'aktualni' => 'nullable|string|max:40',
            // Verze, ze které klient vychází. Bez ní (přejmenování) se neporovnává.
            'verze' => 'sometimes|integer',
        ]);

        // Starší karta nebo jiný počítač nesmí bez varování přepsat novější práci
        $konfliktVerze = fn ($aktualni) => $request->filled('verze') && (int) $request->input('verze') !== (int) $aktualni;
        $odpovedKonflikt = fn ($aktualni) => response()->json(['ok' => false, 'konflikt' => true, 'verze' => (int) $aktualni], 409);
        if ($konfliktVerze($koncept->verze)) {
            return $odpovedKonflikt($koncept->verze);
        }

        // Denní limit úprav tarifu (App\Support\Tarif). Úprava = nový krok historie;
        // výchozí krok nové historie (bez `po`) je stav před první úpravou, nepočítá se.
        // Dávka se přijme celá, dokud dnes něco zbývá — limit přeteče nanejvýš o pár
        // kroků, ale rozdělaná práce se neztratí. Editor hlídá zbytek sám (limit-tarifu.js).
        $uzivatel = $request->user();
        // Kopie vzorového projektu je na hraní, úpravy v ní se nepočítají (App\Support\VzorovyProjekt)
        $novychUprav = $request->filled('kroky') && $koncept->vzor !== 'kopie'
            ? max(0, count($request->input('kroky')) - ($request->input('po') === null ? 1 : 0))
            : 0;
        $zbyva = Tarif::zbyvaUprav($uzivatel);
        if ($novychUprav > 0 && $zbyva === 0) {
            return response()->json([
                'ok' => false,
                'limit' => 'upravy',
                'zbyva' => 0,
                'error' => __('tarify.limit_uprav_text', ['limit' => Tarif::limit(Tarif::uzivatele($uzivatel), 'kroku_denne')]),
            ], 402);
        }

        $updateData = [
            'nazev' => $request->input('nazev', $koncept->nazev),
        ];

        if ($request->has('data')) {
            $updateData['data'] = $request->data;
            $updateData['verze'] = $koncept->verze + 1;
        }

        if ($request->has('kroky')) {
            $kroky = $koncept->historie ?? [];
            $po = $request->input('po');
            // Bez předchůdce = historie začíná znovu. Neznámý předchůdce (třeba
            // už odrolovaný za limit 50) → připojit na konec, nic nezahodit.
            $i = $po === null ? -1 : collect($kroky)->search(fn ($k) => ($k['id'] ?? null) === $po);
            if ($i === false) $i = count($kroky) - 1;
            $kroky = array_slice($kroky, 0, $i + 1);
            foreach ($request->input('kroky') as $k) {
                $kroky[] = [
                    'id' => $k['id'],
                    'popis' => Str::limit($k['popis'] ?? __('ed_nastroje.historie.uprava'), 120),
                    'data' => $k['data'] ?? null,
                    'cas' => $k['cas'] ?? now()->toISOString(),
                    'podklad' => $k['podklad'] ?? null,
                ];
            }
            $updateData['historie'] = array_values(array_slice($kroky, -50));
        }

        if ($request->filled('aktualni')) {
            // mimo $fillable modelu — nastavit přímo, update() ho uloží s ostatním
            $koncept->historie_aktualni = $request->input('aktualni');
        }

        if ($request->has('metadata')) {
            $updateData['metadata'] = $request->input('metadata');
        }

        // Zámek řádku: dvě souběžná uložení ze stejné verze nesmí projít obě
        $konflikt = DB::transaction(function () use ($koncept, &$updateData, $konfliktVerze) {
            $aktualni = (int) Koncept::whereKey($koncept->id)->lockForUpdate()->value('verze');
            if ($konfliktVerze($aktualni)) {
                return $aktualni;
            }
            if (isset($updateData['verze'])) {
                $updateData['verze'] = $aktualni + 1;
            }
            $koncept->update($updateData);

            return null;
        });
        if ($konflikt !== null) {
            return $odpovedKonflikt($konflikt);
        }
        Tarif::zapocitejUpravy($uzivatel, $novychUprav);

        return response()->json([
            'ok' => true,
            'verze' => $koncept->verze,
            'zbyva' => $zbyva === null ? null : max(0, $zbyva - $novychUprav),
        ]);
    }

    /** Odpověď 402, když tarif nedovolí další projekt (null = smí). */
    private function limitProjektu(): ?\Illuminate\Http\JsonResponse
    {
        $uzivatel = Auth::user();
        if (Tarif::muzeZalozitProjekt($uzivatel)) {
            return null;
        }

        $limit = Tarif::limit(Tarif::uzivatele($uzivatel), 'projektu');

        return response()->json([
            'ok' => false,
            'limit' => 'projekty',
            'error' => __('tarify.limit_projektu_text', ['limit' => $limit]),
        ], 402);
    }

    public function vytvorit(Request $request)
    {
        $request->validate(['nazev' => 'required|string|max:255']);
        if ($odmitnuti = $this->limitProjektu()) {
            return $odmitnuti;
        }

        $koncept = Koncept::create([
            'uzivatel_id' => Auth::id(),
            'nazev' => $request->nazev,
            'data' => null,
            'verze' => 1,
            'faze' => 'rozhovor',
            'metadata' => null,
            'chat' => [],
            'historie' => [],
        ]);

        return response()->json([
            'ok' => true,
            'id' => $koncept->id,
            'redirect' => route('masterteam.koncept-v3', ['id' => $koncept->id]),
        ]);
    }

    public function smazat(Koncept $koncept)
    {
        $this->autorizuj($koncept);
        // Kopie vzorového projektu se nemaže, každou noc se sama vrací do výchozího stavu
        if ($koncept->vzor === 'kopie') {
            return response()->json(['ok' => false, 'error' => __('projekty.vzor_nemazat')], 422);
        }
        $koncept->delete();
        return response()->json(['ok' => true]);
    }

    /**
     * Import z pudorys parseru — vytvoří nový Koncept s JSON daty ze samples.
     * Redirect na /masterteam/koncept-v3?id=X (unifikovaný editor).
     */
    public function importZPudorysu(Request $request)
    {
        $data = $request->validate([
            'sample_id' => 'required|string|max:100',
            'nazev' => 'nullable|string|max:255',
        ]);

        $jsonPath = base_path('services/pudorys-parser/samples/' . $data['sample_id'] . '/output.json');
        if (!\Illuminate\Support\Facades\File::exists($jsonPath)) {
            return back()->withErrors(['import' => 'Vzorek nebyl nalezen: ' . $data['sample_id']]);
        }
        $json = json_decode(\Illuminate\Support\Facades\File::get($jsonPath), true);

        $koncept = Koncept::create([
            'uzivatel_id' => Auth::id(),
            'nazev' => $data['nazev'] ?? ('Půdorys ' . $data['sample_id']),
            'data' => $json,
            'metadata' => [
                'source' => 'pudorys',
                'externi_id' => $data['sample_id'],
                'imported_at' => now()->toIso8601String(),
            ],
            'verze' => 1,
            'faze' => 'navrh',
            'chat' => [],
            'historie' => [],
        ]);

        return redirect()->route('masterteam.koncept-v3', ['id' => $koncept->id]);
    }

    public function exportJson(Koncept $koncept)
    {
        $this->autorizuj($koncept);
        $nazev = Str::slug($koncept->nazev) ?: 'koncept';
        return response()->json($koncept->data)
            ->header('Content-Disposition', "attachment; filename=\"{$nazev}.json\"");
    }

    // ─── Katastr ──────────────────────────────────────

    /**
     * Uloží katastrální data (parcely, KÚ, podklad) do metadata konceptu.
     */
    public function ulozitKatastr(Request $request, Koncept $koncept)
    {
        $this->autorizuj($koncept);

        $request->validate([
            'katastr' => 'required|array',
        ]);

        $metadata = $koncept->metadata ?? [];
        $metadata['katastr'] = $request->input('katastr');
        $koncept->update(['metadata' => $metadata]);

        return response()->json(['ok' => true]);
    }

    /**
     * Načte parcelu z katastru (WFS CPX).
     */
    public function nactiParcelu(Request $request)
    {
        $request->validate([
            'ku_kod' => 'required|integer',
            'cislo' => 'required|string|max:20',
            'typ' => 'sometimes|in:auto,pozemkova,stavebni',
            'refresh' => 'sometimes|boolean',
        ]);

        $katastr = app(KatastrService::class);
        try {
            $parcela = $katastr->nactiParcelu(
                $request->integer('ku_kod'),
                $request->input('cislo'),
                $request->input('typ', 'auto'),
                $request->boolean('refresh'),
            );
        } catch (ConnectionException $e) {
            return $this->katastrNedostupny($e);
        }

        if (!$parcela) {
            return response()->json([
                'ok' => false,
                'error' => __('ed_nastroje.katastr.parcela_nenalezena'),
            ], 404);
        }

        return response()->json(['ok' => true, 'parcela' => $parcela]);
    }

    /**
     * Načte stavby na parcele (WFS BU).
     */
    public function nactiStavby(Request $request)
    {
        $request->validate([
            'bbox' => 'required|array',
            'bbox.min_lat' => 'required|numeric',
            'bbox.min_lon' => 'required|numeric',
            'bbox.max_lat' => 'required|numeric',
            'bbox.max_lon' => 'required|numeric',
        ]);

        $katastr = app(KatastrService::class);
        try {
            $stavby = $katastr->nactiStavby($request->input('bbox'));
        } catch (ConnectionException $e) {
            return $this->katastrNedostupny($e);
        }

        return response()->json(['ok' => true, 'stavby' => $stavby]);
    }

    /**
     * Načte okolní parcely v oblasti (BBOX ve WGS84).
     */
    public function nactiOkolniParcely(Request $request)
    {
        $request->validate([
            'bbox' => 'required|array',
            'bbox.min_lat' => 'required|numeric',
            'bbox.min_lon' => 'required|numeric',
            'bbox.max_lat' => 'required|numeric',
            'bbox.max_lon' => 'required|numeric',
        ]);

        $katastr = app(KatastrService::class);
        $parcely = $katastr->nactiOkolniParcely($request->input('bbox'));

        return response()->json(['ok' => true, 'parcely' => $parcely]);
    }

    /**
     * Vysvětlení pojmu přes AI (Haiku) s DB cache v tabulce pojmy_vysvetleni.
     * Request: { termin: "spraš, sprašová hlína", kontext: "geologie" }
     * Response: { ok, popis, cached }
     *
     * Termín se normalizuje (trim + lowercase). Kontext upřesní AI prompt.
     */
    /** Editor hlásí použití funkce (import, 3D, export…), počítá se souhrnně bez uživatele (App\Support\Mereni). */
    public function zmerFunkci(Request $request)
    {
        $request->validate(['funkce' => 'required|string|in:' . implode(',', Mereni::FUNKCE)]);
        Mereni::funkce($request->input('funkce'));

        return response()->noContent();
    }

    public function vysvetleniPojmu(Request $request)
    {
        $request->validate([
            'termin' => 'required|string|max:255',
            'kontext' => 'nullable|string|max:50',
            'force' => 'nullable|boolean',
        ]);

        $termin = \App\Models\PojemVysvetleni::normalizuj($request->input('termin'));
        $kontext = $request->input('kontext');
        $force = $request->boolean('force');
        if (mb_strlen($termin) < 2) {
            return response()->json(['ok' => false, 'error' => __('ed_nastroje.katastr.pojem_kratky')], 422);
        }

        // DB cache lookup (přeskočit při force=true)
        $cached = \App\Models\PojemVysvetleni::where('termin', $termin)
            ->where('kontext', $kontext)
            ->first();
        if ($cached && ! $force) {
            return response()->json(['ok' => true, 'popis' => $cached->popis, 'cached' => true]);
        }

        // AI call — Haiku
        if (! config('services.anthropic.key')) {
            return response()->json(['ok' => false, 'error' => __('ed_nastroje.katastr.ai_nedostupna')], 503);
        }

        $kontextHint = match ($kontext) {
            'radon' => 'Kontext: radonový index pozemku (stavební klasifikace).',
            'geologie' => 'Kontext: geologická hornina a útvar pod pozemkem.',
            'ig' => 'Kontext: inženýrskogeologický rajon (vhodnost pro zakládání staveb).',
            default => '',
        };

        $prompt = "Vysvětli stavebníkovi rodinného domu v 1-2 větách, co znamená tento odborný pojem:\n\n"
            . "\"{$request->input('termin')}\"\n\n"
            . ($kontextHint ? $kontextHint . "\n\n" : "")
            . "Styl odpovědi:\n"
            . "- Česky, stručně, bez úvodních frází typu \"Tento pojem označuje…\"\n"
            . "- Informativně, nepiš autoritativně — obraty \"pravděpodobně\", \"obvykle\", \"často\", \"bývá\" místo \"musíte\", \"budete potřebovat\"\n"
            . "- Pokud je dopad na stavbu zjevný, zmiň ho stručně jako možnou úvahu (max 1 věta)\n"
            . "- NIC nepiš o tom, že situace se liší podle místa, že je potřeba průzkum apod. — tato informace se doplňuje automaticky\n"
            . "- Neopakuj samotný pojem v odpovědi\n"
            . "- Max 2 věty";

        try {
            try {
                $popis = app(\App\Services\ClaudeApi::class)->message(
                    model: config('services.anthropic.model', 'claude-haiku-4-5-20251001'),
                    system: '',
                    user: $prompt,
                    maxTokens: 200,
                    modul: 'koncept',
                    poznamka: 'pojem: ' . \Illuminate\Support\Str::limit($termin, 80) . ($kontext ? ' / ' . $kontext : ''),
                    timeout: 30,
                );
            } catch (\RuntimeException $e) {
                \Illuminate\Support\Facades\Log::warning('Vysvetleni AI failed: ' . $e->getMessage());
                return response()->json(['ok' => false, 'error' => __('ed_nastroje.katastr.ai_selhala')], 502);
            }

            if ($popis === null) {
                \Illuminate\Support\Facades\Log::warning('Vysvetleni AI failed: null response');
                return response()->json(['ok' => false, 'error' => __('ed_nastroje.katastr.ai_selhala')], 502);
            }

            $popis = trim($popis);
            if (! $popis) {
                return response()->json(['ok' => false, 'error' => __('ed_nastroje.katastr.ai_prazdna')], 502);
            }

            // Suffix dle kontextu — fixní připomínka že přesná data zjistí odborné posouzení.
            // Napojí se za AI odpověď, aby ji AI nemusela vymýšlet vždy znovu.
            $suffix = match ($kontext) {
                'radon' => 'Přesnou hodnotu radonu na vašem pozemku určí měření radonu v podloží.',
                'geologie' => 'Přesnou skladbu hornin pod vaším pozemkem prokáže geologický průzkum.',
                'ig' => 'Vhodný způsob zakládání pro váš pozemek určí inženýrskogeologický průzkum.',
                default => '',
            };
            if ($suffix) {
                $popis = rtrim($popis) . ' ' . $suffix;
            }

            // Uložit do cache (updateOrCreate — při force přepíše existující)
            \App\Models\PojemVysvetleni::updateOrCreate(
                ['termin' => $termin, 'kontext' => $kontext],
                ['popis' => $popis]
            );

            return response()->json(['ok' => true, 'popis' => $popis, 'cached' => false]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Vysvetleni exception: ' . $e->getMessage());
            return response()->json(['ok' => false, 'error' => __('ed_nastroje.katastr.neocekavana_chyba')], 500);
        }
    }

    /**
     * Načte výškový profil pro polygon parcely.
     */
    public function nactiVyskovy(Request $request)
    {
        // Přijímá buď jeden polygon nebo pole polygonů (více parcel najednou)
        $polygony = $request->input('polygony') ?? [$request->input('polygon')];
        $polygony = array_filter($polygony, fn($p) => is_array($p) && count($p) >= 3);

        if (empty($polygony)) {
            return response()->json(['ok' => false, 'error' => __('ed_nastroje.katastr.zadny_polygon')]);
        }

        try {
            $dmr = app(Dmr5gService::class);
            $vsechnyBody = [];
            $globalMin = PHP_FLOAT_MAX;
            $globalMax = PHP_FLOAT_MIN;

            foreach ($polygony as $polygon) {
                $profil = $dmr->nactiVyskovyProfil($polygon);
                $vsechnyBody = array_merge($vsechnyBody, $profil['body']);
                $globalMin = min($globalMin, $profil['vyska_min']);
                $globalMax = max($globalMax, $profil['vyska_max']);
            }

            $prumer = count($vsechnyBody) > 0
                ? round(array_sum(array_column($vsechnyBody, 2)) / count($vsechnyBody), 1)
                : 0;

            return response()->json(['ok' => true, 'profil' => [
                'body' => $vsechnyBody,
                'pocet_bodu' => count($vsechnyBody),
                'vyska_min' => round($globalMin, 1),
                'vyska_max' => round($globalMax, 1),
                'vyskovy_rozdil' => round($globalMax - $globalMin, 1),
                'vyska_prumerna' => $prumer,
            ]]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Ověří sousednost parcely se stávajícími.
     */
    public function overSousednost(Request $request)
    {
        $request->validate([
            'nova' => 'required|array|min:3',
            'stavajici' => 'required|array',
        ]);

        $katastr = app(KatastrService::class);
        $sousedi = $katastr->overSousednost(
            $request->input('nova'),
            $request->input('stavajici'),
        );

        return response()->json(['ok' => true, 'sousedi' => $sousedi]);
    }

    // ─── Helpers ─────────────────────────────────────

    /** Výpadek služby ČÚZK není chyba aplikace: hláška uživateli, do logu jen varování (bez e-mailu o bugu). */
    private function katastrNedostupny(ConnectionException $e): \Illuminate\Http\JsonResponse
    {
        \Illuminate\Support\Facades\Log::warning('Katastr neodpovídá: ' . mb_substr($e->getMessage(), 0, 200));

        return response()->json(['ok' => false, 'error' => __('projekty.katastr_nedostupny')], 503);
    }

    private function autorizuj(Koncept $koncept): void
    {
        if ($koncept->uzivatel_id !== Auth::id() && !Auth::user()->jeMaster()) {
            abort(403);
        }
    }
}
