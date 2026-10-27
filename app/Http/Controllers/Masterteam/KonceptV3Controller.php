<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
// Alias: tělo controlleru zůstává 1:1 s KonceptController, pracuje ale s tabulkou koncepty_v3.
use App\Models\KonceptV3 as Koncept;
use App\Services\KonceptAiService;
use App\Services\Katastr\KatastrService;
use App\Services\Katastr\Dmr5gService;
use App\Services\Pravidla\RozhovorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * Koncept V3 — kopie KonceptController pro novou verzi editoru.
 * Původní koncept zůstává beze změny; V3 se upravuje samostatně.
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
            'chat' => 'sometimes|array',
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
        ]);

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
                    'popis' => Str::limit($k['popis'] ?? 'Úprava', 120),
                    'data' => $k['data'] ?? null,
                    'cas' => $k['cas'] ?? now()->toISOString(),
                    'podklad' => $k['podklad'] ?? null,
                ];
            }
            $updateData['historie'] = array_values(array_slice($kroky, -50));
        }

        if ($request->filled('aktualni')) {
            // mimo $fillable modelu (sdílí ho V2) — nastavit přímo, update() ho uloží s ostatním
            $koncept->historie_aktualni = $request->input('aktualni');
        }

        if ($request->has('chat')) {
            $updateData['chat'] = array_slice($request->chat, -200);
        }

        if ($request->has('metadata')) {
            $updateData['metadata'] = $request->input('metadata');
        }

        $koncept->update($updateData);

        return response()->json(['ok' => true, 'verze' => $koncept->verze]);
    }

    public function vytvorit(Request $request)
    {
        $request->validate(['nazev' => 'required|string|max:255']);

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

    public function aiVytvor(Request $request)
    {
        $request->validate([
            'popis' => 'required|string|max:50000',
            'koncept_id' => 'nullable|integer',
            'rovnou_navrh' => 'nullable|boolean',
        ]);

        // Production PHP má max_execution_time=30s. AI volání s few-shot může
        // trvat až 60s, plus dvojí volání po rozhovor_hotovy=true → potřebujeme 180s.
        @set_time_limit(180);
        @ini_set('default_socket_timeout', '180');
        ignore_user_abort(true);

        $ai = app(KonceptAiService::class);
        if ($request->model) $ai->setModel($request->model);
        $rozhovor = app(RozhovorService::class);

        $koncept = null;
        if ($request->koncept_id) {
            $koncept = Koncept::findOrFail($request->koncept_id);
            $this->autorizuj($koncept);
        }

        // Přeskočit rozhovor — rovnou generovat návrh
        if ($request->rovnou_navrh) {
            if ($koncept) {
                $koncept->update(['faze' => 'navrh']);
                $koncept->refresh();
            } else {
                // Nový koncept rovnou ve fázi 'navrh' (testovací prompt přeskočí dotazník)
                $koncept = Koncept::create([
                    'uzivatel_id' => Auth::id(),
                    'nazev' => 'Test ' . now()->format('H:i:s'),
                    'data' => null,
                    'verze' => 1,
                    'faze' => 'navrh',
                    'metadata' => null,
                    'chat' => [['role' => 'user', 'text' => $request->popis, 'cas' => now()->toISOString()]],
                    'historie' => [],
                ]);
            }
        }

        // Přímý import JSON — pokud popis obsahuje hotová data se steny
        $importData = $this->detekujPrimyImport($request->popis);
        if ($importData) {
            $data = $importData;
        } else {
            try {
                $data = $ai->vytvorKoncept($request->popis, $koncept, $request->input('parcela') ?? $request->input('katastr'));
            } catch (\RuntimeException $e) {
                $chyba = $e->getMessage();
                if ($koncept) {
                    $this->pridatChat($koncept, $request->popis, 'Chyba AI: ' . $chyba);
                }
                return response()->json(['error' => $chyba, 'aiOdpoved' => 'Chyba AI: ' . $chyba], 422);
            }
        }

        if ($koncept && $koncept->faze === 'rozhovor' && $rozhovor->jeRozhovorOdpoved($data)) {
            $rozhovor->zpracujOdpoved($koncept, $data);
        }

        $dotaz = !empty($data['dotaz']) ? $data['dotaz'] : null;
        $zmena = !empty($data['zmena']) ? $data['zmena'] : null;
        $steny = count($data['steny'] ?? []);
        $otvory = count($data['otvory'] ?? []);

        // V rozhovoru: AI někdy zapíše odpověď do různých polí
        $aiOdpoved = $dotaz ?? $zmena;
        if (!$aiOdpoved && $steny > 0) {
            $aiOdpoved = "Koncept má {$steny} stěn a {$otvory} otvorů.";
        }
        // Fallback: pokud jsme v rozhovoru a AI nevrátila text, logovat
        if (!$aiOdpoved) {
            \Illuminate\Support\Facades\Log::warning('AI rozhovor bez textu', [
                'keys' => array_keys($data),
                'dotaz' => $data['dotaz'] ?? 'NULL',
                'zmena' => $data['zmena'] ?? 'NULL',
                'faze' => $koncept?->faze ?? 'new',
            ]);
        }

        if ($koncept) {
            $this->ulozitSnapshot($koncept, $request->popis);

            // Pokud AI signalizovala konec rozhovoru, ale nevrátila layout/steny —
            // přepnout fázi na 'navrh' a znovu zavolat AI ať vygeneruje návrh.
            $maData = !empty($data['layout']) || !empty($data['steny']) || !empty($data['rozmery']);
            if (!empty($data['rozhovor_hotovy']) && !$maData) {
                $koncept->update(['faze' => 'navrh']);
                $koncept->refresh();
                try {
                    $data2 = $ai->vytvorKoncept(
                        'Vygeneruj návrh dle dosavadního rozhovoru. Použij STĚNY formát s prostory[] a vybaveni[].',
                        $koncept,
                        $request->input('parcela') ?? $request->input('katastr')
                    );
                    if (!empty($data2['steny']) || !empty($data2['layout']) || !empty($data2['rozmery'])) {
                        $data = $data2; // nahradit — nový návrh je důležitější než staré rozhovor JSON
                        $dotaz = !empty($data2['dotaz']) ? $data2['dotaz'] : null;
                        $zmena = !empty($data2['zmena']) ? $data2['zmena'] : 'Návrh konceptu vytvořen.';
                        $aiOdpoved = $dotaz ?? $zmena;
                        $maData = true;
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('AI auto-návrh po rozhovor_hotovy selhal: ' . $e->getMessage());
                }
            }

            $this->pridatChat($koncept, $request->popis, $aiOdpoved);

            $updateData = ['verze' => $koncept->verze + 1];
            if ($maData) {
                $updateData['data'] = $data;
            }
            if (!empty($data['rozhovor_hotovy']) || $maData) {
                $updateData['faze'] = 'navrh';
            }
            $koncept->update($updateData);

            return response()->json([
                'ok' => true,
                'data' => $koncept->data,
                'dotaz' => $dotaz,
                'verze' => $koncept->verze,
                'aiOdpoved' => $aiOdpoved,
                'faze' => $koncept->faze,
                'metadata' => $koncept->metadata,
            ]);
        }

        // Nový koncept
        $nazev = $data['objekt'] ?? 'Nový koncept';
        $chat = [
            ['role' => 'user', 'text' => $request->popis, 'cas' => now()->toISOString()],
            ['role' => 'ai', 'text' => $aiOdpoved, 'cas' => now()->toISOString()],
        ];

        $faze = 'rozhovor';
        $metadata = null;

        if (!empty($data['layout']) || !empty($data['steny']) || !empty($data['rozmery'])) {
            $faze = 'navrh';
        }

        if (isset($data['metadata'])) {
            $metadata = $data['metadata'];
            if (!empty($data['rozhovor_hotovy'])) {
                $faze = 'navrh';
            }
        }

        $koncept = Koncept::create([
            'uzivatel_id' => Auth::id(),
            'nazev' => $nazev,
            'data' => (!empty($data['steny']) || !empty($data['rozmery'])) ? $data : null,
            'verze' => 1,
            'faze' => $faze,
            'metadata' => $metadata,
            'chat' => $chat,
            'historie' => [],
        ]);

        return response()->json([
            'ok' => true,
            'id' => $koncept->id,
            'data' => $koncept->data,
            'dotaz' => $dotaz,
            'verze' => $koncept->verze,
            'aiOdpoved' => $aiOdpoved,
            'faze' => $koncept->faze,
            'metadata' => $koncept->metadata,
            'redirect' => route('masterteam.koncept-v3', ['id' => $koncept->id]),
        ]);
    }

    public function aiUprav(Request $request, Koncept $koncept)
    {
        $this->autorizuj($koncept);

        $request->validate([
            'pozadavek' => 'required|string|max:50000',
            'prvek_id' => 'nullable|string|max:200',
            'rozhovor_metadata' => 'nullable|array',
            'katastr' => 'nullable|array',
            'zvyrazneni' => 'nullable|array',
            'oznacene' => 'nullable|array',
        ]);

        // PHP max_execution_time=30s — overridnout pro dlouhé AI volání.
        @set_time_limit(180);
        @ini_set('default_socket_timeout', '180');
        ignore_user_abort(true);

        $ai = app(KonceptAiService::class);
        if ($request->model) $ai->setModel($request->model);

        if ($request->rozhovor_metadata) {
            $koncept->update([
                'faze' => 'navrh',
                'metadata' => $request->rozhovor_metadata,
            ]);
            $koncept->refresh();

            if ($request->pozadavek === 'Uložit metadata rozhovoru') {
                return response()->json([
                    'ok' => true,
                    'data' => $koncept->data,
                    'verze' => $koncept->verze,
                    'faze' => $koncept->faze,
                    'metadata' => $koncept->metadata,
                ]);
            }
        }

        // Přímý import JSON — obejít AI
        $importData = $this->detekujPrimyImport($request->pozadavek);
        if ($importData) {
            $koncept->update([
                'data' => $importData,
                'faze' => 'navrh',
                'verze' => ($koncept->verze ?? 0) + 1,
            ]);
            $chat = $koncept->chat ?? [];
            $chat[] = ['role' => 'user', 'text' => 'Import JSON geometrie', 'cas' => now()->toISOString()];
            $chat[] = ['role' => 'ai', 'text' => 'Geometrie importována: ' . count($importData['steny'] ?? []) . ' stěn, ' . count($importData['otvory'] ?? []) . ' otvorů.', 'cas' => now()->toISOString()];
            $koncept->update(['chat' => $chat]);

            return response()->json([
                'ok' => true,
                'data' => $importData,
                'verze' => $koncept->verze,
                'faze' => 'navrh',
                'aiOdpoved' => 'Geometrie importována: ' . count($importData['steny'] ?? []) . ' stěn, ' . count($importData['otvory'] ?? []) . ' otvorů.',
            ]);
        }

        if ($koncept->faze === 'rozhovor') {
            $rozhovor = app(RozhovorService::class);
            $data = $ai->vytvorKoncept($request->pozadavek, $koncept);

            if ($rozhovor->jeRozhovorOdpoved($data)) {
                $rozhovor->zpracujOdpoved($koncept, $data);
            }

            $dotaz = $data['dotaz'] ?? null;
            $zmena = $data['zmena'] ?? null;
            $aiOdpoved = $dotaz ?: ($zmena ?: 'Rozhovor dokončen, přecházím k návrhu.');

            $this->pridatChat($koncept, $request->pozadavek, $aiOdpoved);

            $updateData = ['verze' => $koncept->verze + 1];
            if (!empty($data['steny']) || !empty($data['rozmery'])) {
                $updateData['data'] = $data;
            }
            $koncept->update($updateData);

            return response()->json([
                'ok' => true,
                'data' => $koncept->data,
                'dotaz' => $dotaz,
                'verze' => $koncept->verze,
                'aiOdpoved' => $aiOdpoved,
                'faze' => $koncept->faze,
                'metadata' => $koncept->metadata,
            ]);
        }

        // Návrhová fáze
        try {
            if (!$koncept->data) {
                $data = $ai->vytvorKoncept($request->pozadavek, $koncept);
            } else {
                $data = $ai->upravKoncept($koncept->data, $request->prvek_id, $request->pozadavek, $koncept->chat ?? [], $koncept, $request->katastr, $request->oznacene ?? $request->zvyrazneni);
            }
        } catch (\RuntimeException $e) {
            $chyba = $e->getMessage();
            $this->pridatChat($koncept, $request->pozadavek, 'Chyba AI: ' . $chyba);
            return response()->json(['error' => $chyba], 422);
        }

        $dotaz = $data['dotaz'] ?? null;
        $zmena = $data['zmena'] ?? null;
        $jeAkce = isset($data['akce']); // příkaz (smazat, undo) — nepřepisovat data v DB

        if ($jeAkce) {
            $aiOdpoved = $dotaz ?: ($zmena ?: 'Provedeno.');
            $this->pridatChat($koncept, $request->pozadavek, $aiOdpoved);

            return response()->json([
                'ok' => true,
                'data' => $data, // obsahuje {akce, ids, zmena, dotaz}
                'aiOdpoved' => $aiOdpoved,
                'verze' => $koncept->verze,
                'faze' => $koncept->faze,
            ]);
        }

        $steny = count($data['steny'] ?? []);
        $otvory = count($data['otvory'] ?? []);
        $aiOdpoved = $dotaz ?: ($zmena ?: "Hotovo! Koncept má {$steny} stěn a {$otvory} otvorů.");

        $popisZmeny = $request->pozadavek;
        if ($request->prvek_id) {
            $popisZmeny = "[{$request->prvek_id}] {$popisZmeny}";
        }

        $this->ulozitSnapshot($koncept, $popisZmeny);
        $this->pridatChat($koncept, $request->pozadavek, $aiOdpoved);

        $koncept->update([
            'data' => $data,
            'verze' => $koncept->verze + 1,
        ]);

        return response()->json([
            'ok' => true,
            'data' => $data,
            'dotaz' => $dotaz,
            'verze' => $koncept->verze,
            'aiOdpoved' => $aiOdpoved,
            'faze' => $koncept->faze,
            'metadata' => $koncept->metadata,
        ]);
    }

    public function importDxf(Request $request)
    {
        $request->validate([
            'soubor' => 'required|file|max:10240',
            'koncept_id' => 'nullable|integer',
        ]);

        $soubor = $request->file('soubor');
        $obsah = file_get_contents($soubor->getRealPath());
        $pripona = strtolower($soubor->getClientOriginalExtension());

        if (!in_array($pripona, ['dxf', 'svg', 'json'])) {
            return response()->json(['error' => 'Nepodporovaný formát. Povolené: DXF, SVG, JSON.'], 422);
        }

        if ($pripona === 'json') {
            $data = json_decode($obsah, true);
            if (!$data) {
                return response()->json(['error' => 'Nevalidní JSON soubor.'], 422);
            }
        } else {
            $ai = app(KonceptAiService::class);
            $data = $ai->vytvorKoncept(
                "Konvertuj tento {$pripona} soubor na JSON strukturu konceptu. Obsah souboru:\n\n" . mb_substr($obsah, 0, 8000)
            );
        }

        $nazevSouboru = $soubor->getClientOriginalName();

        if ($request->koncept_id) {
            $koncept = Koncept::findOrFail($request->koncept_id);
            $this->autorizuj($koncept);

            $this->ulozitSnapshot($koncept, "Import: {$nazevSouboru}");
            $this->pridatChat($koncept, "Import souboru: {$nazevSouboru}", "Soubor importován a konvertován na koncept.");

            $koncept->update([
                'data' => $data,
                'verze' => $koncept->verze + 1,
            ]);
        } else {
            $nazev = $data['objekt'] ?? pathinfo($nazevSouboru, PATHINFO_FILENAME);
            $koncept = Koncept::create([
                'uzivatel_id' => Auth::id(),
                'nazev' => $nazev,
                'data' => $data,
                'verze' => 1,
                'chat' => [
                    ['role' => 'user', 'text' => "Import souboru: {$nazevSouboru}", 'cas' => now()->toISOString()],
                    ['role' => 'ai', 'text' => 'Soubor importován a konvertován na koncept.', 'cas' => now()->toISOString()],
                ],
                'historie' => [],
            ]);
        }

        return response()->json([
            'ok' => true,
            'id' => $koncept->id,
            'data' => $data,
            'redirect' => route('masterteam.koncept-v3', ['id' => $koncept->id]),
        ]);
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
        $parcela = $katastr->nactiParcelu(
            $request->integer('ku_kod'),
            $request->input('cislo'),
            $request->input('typ', 'auto'),
            $request->boolean('refresh'),
        );

        if (!$parcela) {
            return response()->json([
                'ok' => false,
                'error' => 'Parcela nenalezena. Zkontrolujte číslo parcely a katastrální území.',
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
        $stavby = $katastr->nactiStavby($request->input('bbox'));

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
            return response()->json(['ok' => false, 'error' => 'Pojem příliš krátký'], 422);
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
            return response()->json(['ok' => false, 'error' => 'AI není k dispozici'], 503);
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
                return response()->json(['ok' => false, 'error' => 'AI odpověď selhala'], 502);
            }

            if ($popis === null) {
                \Illuminate\Support\Facades\Log::warning('Vysvetleni AI failed: null response');
                return response()->json(['ok' => false, 'error' => 'AI odpověď selhala'], 502);
            }

            $popis = trim($popis);
            if (! $popis) {
                return response()->json(['ok' => false, 'error' => 'Prázdná odpověď AI'], 502);
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
            return response()->json(['ok' => false, 'error' => 'Neočekávaná chyba'], 500);
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
            return response()->json(['ok' => false, 'error' => 'Žádný platný polygon.']);
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

    /**
     * Před tím, než server přepíše data konceptu (AI, import), musí současný
     * stav existovat v historii jako krok — jinak by se k němu nešlo vrátit.
     * Historie drží stavy PO akci, takže stačí výchozí krok u prázdné historie;
     * krok s novými daty pak zapíše klient při svém uložení.
     */
    private function ulozitSnapshot(Koncept $koncept, string $popis): void
    {
        if (!$koncept->data || !empty($koncept->historie)) return;

        $id = 'z' . $koncept->id . '-' . $koncept->verze;
        $koncept->historie = [[
            'id' => $id,
            'popis' => 'Začátek',
            'data' => $koncept->data,
            'cas' => now()->toISOString(),
        ]];
        $koncept->historie_aktualni = $id;
        $koncept->save();
    }

    private function pridatChat(Koncept $koncept, string $uzivatelText, string $aiText): void
    {
        $chat = $koncept->chat ?? [];
        $chat[] = ['role' => 'user', 'text' => $uzivatelText, 'cas' => now()->toISOString()];
        $chat[] = ['role' => 'ai', 'text' => $aiText, 'cas' => now()->toISOString()];
        $koncept->chat = array_slice($chat, -200);
        $koncept->save();
    }

    private function autorizuj(Koncept $koncept): void
    {
        if ($koncept->uzivatel_id !== Auth::id() && !Auth::user()->jeMaster()) {
            abort(403);
        }
    }

    /**
     * Detekuje přímý import JSON z promptu (např. "Vytvoř dům přesně podle těchto dat: {...}").
     * Vrátí parsed JSON pokud obsahuje validní steny[], jinak null.
     */
    private function detekujPrimyImport(string $popis): ?array
    {
        // Hledat JSON objekt v popisu
        $pos = strpos($popis, '{');
        if ($pos === false) return null;

        // Extrahovat JSON
        $depth = 0;
        $len = strlen($popis);
        for ($i = $pos; $i < $len; $i++) {
            if ($popis[$i] === '{') $depth++;
            elseif ($popis[$i] === '}') $depth--;
            if ($depth === 0) {
                $jsonStr = substr($popis, $pos, $i - $pos + 1);
                $data = json_decode($jsonStr, true);
                if ($data && !empty($data['steny']) && is_array($data['steny'])) {
                    return $data;
                }
                break;
            }
        }

        return null;
    }
}
