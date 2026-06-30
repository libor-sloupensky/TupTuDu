<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Models\PravidloObjektu;
use App\Models\RagChunk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class PravidlaObjektuController extends Controller
{
    public function index()
    {
        $pravidla = PravidloObjektu::orderBy('kategorie')->orderBy('nazev')->get();
        $kategorie = PravidloObjektu::KATEGORIE;

        return view('masterteam.pravidla-objektu.index', compact('pravidla', 'kategorie'));
    }

    public function create()
    {
        $kategorie = PravidloObjektu::KATEGORIE;
        return view('masterteam.pravidla-objektu.form', compact('kategorie'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'nazev' => 'required|string|max:100',
            'kategorie' => 'required|string|max:30',
            'keywords' => 'nullable|string|max:255',
            'pravidla' => 'required|string',
        ]);

        PravidloObjektu::create([
            'typ_objektu' => \Illuminate\Support\Str::slug($request->nazev, '_'),
            ...$request->only('nazev', 'kategorie', 'keywords', 'pravidla'),
            'zdroj' => 'manual',
            'uzivatel_id' => Auth::id(),
        ]);

        return redirect()->route('masterteam.pravidla-objektu.index')
            ->with('success', 'Pravidlo vytvořeno.');
    }

    public function edit(PravidloObjektu $pravidlo)
    {
        $kategorie = PravidloObjektu::KATEGORIE;
        return view('masterteam.pravidla-objektu.form', compact('pravidlo', 'kategorie'));
    }

    public function update(Request $request, PravidloObjektu $pravidlo)
    {
        $request->validate([
            'nazev' => 'required|string|max:100',
            'kategorie' => 'required|string|max:30',
            'pravidla' => 'required|string',
        ]);

        $zdroj = $pravidlo->zdroj;
        if ($zdroj === 'ai_rag') $zdroj = 'ai_rag+manual';

        $pravidlo->update([
            ...$request->only('nazev', 'kategorie', 'pravidla'),
            'zdroj' => $zdroj,
            'uzivatel_id' => Auth::id(),
        ]);

        return redirect()->route('masterteam.pravidla-objektu.index')
            ->with('success', 'Pravidlo aktualizováno.');
    }

    public function destroy(PravidloObjektu $pravidlo)
    {
        $pravidlo->delete();

        return redirect()->route('masterteam.pravidla-objektu.index')
            ->with('success', 'Pravidlo smazáno.');
    }

    /**
     * AI generuje pravidlo z RAG znalostní báze.
     */
    public function generovat(Request $request)
    {
        $request->validate([
            'nazev' => 'required|string|max:100',
            'kategorie' => 'required|string|max:30',
            'keywords' => 'nullable|string|max:255',
        ]);

        $nazev = $request->nazev;
        $kategorie = $request->kategorie;
        $keywords = $request->keywords ?? '';
        $typObjektu = \Illuminate\Support\Str::slug($nazev, '_');

        // Hledat v RAG — lokálně nebo vzdáleně (název + keywords)
        $hledaniTermy = $nazev . ' ' . $keywords;
        $chunky = $this->hledejVRag($hledaniTermy, $typObjektu);

        // AI prompt — vždy Opus pro nejvyšší kvalitu pravidel
        $model = AppServicesClaudeApi::modelOpus();

        $ragKontext = mb_strlen($chunky) > 0
            ? "Doplňující informace ze znalostní báze (normy, předpisy):\n\n{$chunky}"
            : "";

        // Seznam dostupných typů objektů (z JS engine)
        $typyObjektu = "Stěny: obvodová, nosná, příčka, plot, zídka\n"
            . "Otvory: dveře, okno, garážová vrata, francouzské okno, průchod\n"
            . "Plochy: terasa, chodník, příjezdová cesta, trávník, záhon, parkoviště, bazén, pískoviště\n"
            . "Střechy: sedlová, pultová, plochá, valbová, mansardová\n"
            . "Příslušenství: pergola, přístřešek, komín, sloup, schody, branka, brána";

        $prompt = <<<PROMPT
Jsi seniorní architekt a stavební inženýr specializovaný na české stavebnictví.
Vytvoř pravidla pro typ objektu "{$nazev}" (kategorie: {$kategorie}).

{$ragKontext}

SYSTÉM UMÍ VYTVOŘIT TYTO TYPY OBJEKTŮ:
{$typyObjektu}

Pravidla navrhuj POUZE s použitím výše uvedených typů. Pokud typ neexistuje, nezmiňuj ho.

POUŽIJ KOMBINACI svých vlastních znalostí + informací z RAG.
Tvé vlastní znalosti o architektuře jsou klíčové — RAG doplňuje normy a předpisy.

ÚROVEŇ DETAILU: KONCEPT (ne projekt)
- Řeš: dispozici, rozložení, propojení místností, základní rozměry
- NEřeš: typ zasklení, izolace, materiál omítky, přesné tloušťky — ty patří do projektové fáze

Pravidla piš česky. Struktura:

## 1. Definice
Co to je, k čemu slouží, v jakém kontextu se používá.

## 2. Checklist otázek
Rozděl na dvě skupiny:

### Klíčové (AI se zeptá uživatele):
Otázky které NELZE odvodit a výrazně ovlivňují návrh.
Formát: "- **Otázka** → nabídni 3-5 voleb (výchozí: X)"
Příklad: "- **Kolik podlaží?** → a) přízemní b) s patrem c) s podkrovím (výchozí: přízemní)"
Max 4-6 klíčových otázek. NE detaily jako typ oken, materiál fasády.

### Odvoditelné (AI rozhodne sama):
Otázky které AI dokáže zodpovědět z kontextu nebo použít výchozí hodnotu.
Formát: "- **Otázka**: Jak odvodit (výchozí: X)"
Příklad: "- **Plocha místností**: Odvodit z celkových rozměrů domu (výchozí: proporcionálně)"

## 3. Složení / součásti
Z čeho se tento objekt skládá — jaké další typy objektů obsahuje nebo na ně navazuje.
Příklad pro dům: obvodové stěny, příčky, chodba, koupelna, WC, kuchyň, střecha, základy, vstup.

## 4. Dispoziční pravidla
Logická pravidla pro umístění a uspořádání. Ne rozměry ale LOGIKA.
Příklad: "WC a koupelna se obvykle umisťují vedle sebe (sdílená instalační stěna)"
Příklad: "Vstup do WC a koupelny vede z chodby, nikdy přímo z kuchyně"
Příklad: "Každá obytná místnost má alespoň jedno okno na obvodové stěně"
Příklad: "Mezi každými dvěma sousedními místnostmi jsou dveře"

## 5. Rozměry a hodnoty
Běžné rozměry, rozsahy, výchozí hodnoty. Uveď min/max/doporučené.

## 6. Typické materiály a varianty
Běžně používané materiály, alternativy.

## 7. Častá chyby
Co se často dělá špatně při návrhu tohoto objektu. Praktické, ne teoretické.

DŮLEŽITÉ:
- Nepoužívej striktní příkazy ("musí", "nesmí") — piš doporučení ("běžně se", "doporučuje se", "alternativně lze")
- Piš prakticky a konkrétně — ne obecné fráze
- Zaměř se na logiku dispozice — to je nejdůležitější
- Piš jen pravidla, žádné úvody ani závěry

Na konci přidej řádek:
KLÍČOVÁ SLOVA: (seznam 8-15 slov/frází oddělených čárkou)
PROMPT;

        try {
            $aiText = app(\App\Services\ClaudeApi::class)->message(
                model: $model,
                system: '',
                user: $prompt,
                maxTokens: 4096,
                modul: 'pravidla_objektu',
                poznamka: 'generovat: ' . \Illuminate\Support\Str::limit($nazev . ' / ' . $kategorie, 150),
                timeout: 120,
            );

            if ($aiText === null) {
                return back()->with('error', 'AI chyba: prázdná odpověď.');
            }

            // Extrahovat AI-generovaná klíčová slova
            $aiKeywords = $keywords;
            if (preg_match('/KL[ÍI]ČOV[ÁA]\s*SLOVA:\s*(.+)/iu', $aiText, $kwMatch)) {
                $aiKeywords = trim($kwMatch[1]);
                $aiText = trim(preg_replace('/KL[ÍI]ČOV[ÁA]\s*SLOVA:\s*.+/iu', '', $aiText));
            }

            $pravidlo = PravidloObjektu::updateOrCreate(
                ['typ_objektu' => $typObjektu],
                [
                    'nazev' => $nazev,
                    'kategorie' => $kategorie,
                    'keywords' => $aiKeywords ?: null,
                    'pravidla' => $aiText,
                    'zdroj' => 'ai_rag',
                    'uzivatel_id' => Auth::id(),
                    'metadata' => [
                        'rag_chunky' => $chunky ? mb_substr($chunky, 0, 200) . '...' : null,
                        'model' => $model,
                    ],
                ]
            );

            return redirect()->route('masterteam.pravidla-objektu.edit', $pravidlo)
                ->with('success', 'Pravidlo vygenerováno z RAG. Zkontrolujte a případně upravte.');

        } catch (\Throwable $e) {
            return back()->with('error', 'Chyba: ' . $e->getMessage());
        }
    }

    /**
     * API seed — vygeneruje základní sadu pravidel. Zabezpečeno tokenem.
     */
    public function apiSeed(Request $request)
    {
        if ($request->query('token') !== config('services.cron_token')) {
            return response()->json(['error' => 'Neplatný token'], 403);
        }

        $typy = [
            // Celky
            ['dum', 'Rodinný dům', 'celek'],
            ['garaz', 'Garáž', 'celek'],
            ['zahradni_domek_ulozny', 'Zahradní domek — úložný', 'celek'],
            ['zahradni_domek_obytny', 'Zahradní domek — obytný', 'celek'],
            ['zahradni_domek_dilna', 'Zahradní domek — dílna', 'celek'],
            ['pristresek', 'Přístřešek / Pergola', 'celek'],
            // Místnosti
            ['koupelna', 'Koupelna', 'mistnost'],
            ['wc', 'WC', 'mistnost'],
            ['kuchyn', 'Kuchyň', 'mistnost'],
            ['obyvak', 'Obývací pokoj', 'mistnost'],
            ['chodba', 'Chodba', 'mistnost'],
            ['loznice', 'Ložnice', 'mistnost'],
            ['technicka_mistnost', 'Technická místnost', 'mistnost'],
            ['pracovna', 'Pracovna', 'mistnost'],
            ['satna', 'Šatna', 'mistnost'],
            ['spiz', 'Spíž', 'mistnost'],
            ['sklep', 'Sklep / Suterén', 'mistnost'],
            ['podkrovi', 'Podkrovní obytné prostory', 'mistnost'],
            // Konstrukce
            ['strecha', 'Střecha', 'konstrukce'],
            ['zaklady', 'Základy', 'konstrukce'],
            ['schodiste', 'Schodiště', 'konstrukce'],
            ['balkon', 'Balkon / Lodžie', 'konstrukce'],
            // Exteriér
            ['plot_pravidla', 'Plot / Oplocení', 'exterior'],
            ['terasa', 'Terasa', 'exterior'],
            ['prijezdova_cesta', 'Příjezdová cesta', 'exterior'],
            ['bazen', 'Bazén', 'exterior'],
        ];

        // ?reset=1 → smazat všechna pravidla a přegenerovat
        if ($request->query('reset')) {
            \App\Models\PravidloObjektu::truncate();
        }

        $results = [];
        foreach ($typy as [$typ, $nazev, $kat]) {
            if (\App\Models\PravidloObjektu::where('typ_objektu', $typ)->exists()) {
                $results[] = "{$nazev}: přeskočeno (existuje)";
                continue;
            }

            $fakeRequest = new Request();
            $fakeRequest->merge(['nazev' => $nazev, 'kategorie' => $kat, 'keywords' => '']);
            \Illuminate\Support\Facades\Auth::loginUsingId(1);

            try {
                $this->generovat($fakeRequest);
                $results[] = "{$nazev}: OK";
            } catch (\Throwable $e) {
                $results[] = "{$nazev}: CHYBA - {$e->getMessage()}";
            }
        }

        return response()->json(['ok' => true, 'results' => $results]);
    }

    /**
     * Smaže všechna pravidla a přegeneruje z RAG.
     */
    public function obnovitVse(Request $request)
    {
        \App\Models\PravidloObjektu::truncate();

        // Přesměrovat na seed endpoint
        return $this->apiSeed($request->merge(['token' => config('services.cron_token')]));
    }

    /**
     * Hledá v RAG — nejdřív lokální DB, pokud prázdná pak vzdálený server.
     */
    private function hledejVRag(string $hledaniTermy, string $typObjektu): string
    {
        // Lokální RAG — přes RagRetrieval (sdílená logika se stop words)
        $retrieval = new \App\Services\RagRetrieval();
        $chunky = $retrieval->sestavKontext($hledaniTermy, 10);

        if (mb_strlen($chunky) > 50) return $chunky;

        // Vzdálený RAG (produkce)
        $remoteUrl = config('app.env') === 'local'
            ? 'https://kalkulio.cz/api/rag/search'
            : null;

        if (!$remoteUrl) return $chunky;

        try {
            $token = config('services.cron_token');
            $resp = Http::timeout(15)->get($remoteUrl, [
                'token' => $token,
                'q' => $nazev,
                'limit' => 10,
            ]);

            if ($resp->successful() && $resp->json('ok')) {
                $remoteChunky = collect($resp->json('chunky', []))
                    ->pluck('obsah')
                    ->join("\n\n---\n\n");

                if (mb_strlen($remoteChunky) > 50) return $remoteChunky;
            }
        } catch (\Throwable $e) {
            // Tiché — fallback na lokální
        }

        return $chunky;
    }
}
