<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Services\ClaudeApi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class KonceptTestovaniController extends Controller
{
    /** Modely k testování (labely pro UI). */
    private const MODELY = [
        'claude-haiku-4-5'  => 'Haiku 4.5',
        'claude-sonnet-4-6' => 'Sonnet 4.6',
        'claude-opus-4-8'   => 'Opus 4.8',
        // 'claude-fable-5' => 'Fable 5',  // nedostupné pro tento API klíč (404 – Anthropic gated access)
    ];

    private const VYCHOZI_PROMPT = 'Navrhni rodinný dům 12×8 m se třemi ložnicemi, obývacím pokojem s kuchyní, koupelnou a samostatným WC. Vstup ze severu.';

    /** Systémový prompt — stejný pro všechny modely (proto je porovnání férové). */
    private const SYSTEM = <<<'PROMPT'
Jsi zkušený český architekt. Na základě zadání navrhni PŮDORYS jednopodlažního objektu a nakresli ho v ASCII.

VÝSTUP (přesně v tomto pořadí):
1) ASCII půdorys:
   - Stěny kresli čarami: vodorovné znakem `-`, svislé znakem `|`, rohy `+`.
   - Každou místnost pojmenuj (název + přibližná plocha v m²) a popisek umísti dovnitř místnosti.
   - Dveře/průchody = mezera ve stěně nebo znak `D`. Okna = znak `o` na obvodové stěně.
   - Vstup do domu zvenku zřetelně označ slovem VSTUP.
   - Uveď měřítko (kolik metrů odpovídá jednomu znaku, např. „1 znak ≈ 0,5 m") a dodrž proporce podle zadání.
2) Krátké zdůvodnění (3–6 vět): dispoziční logika — které místnosti spolu sousedí a proč, kudy vede komunikace (chodba/zádveří), orientace ke světovým stranám.

PRAVIDLA:
- Navrhuj jako skutečný architekt: promyšlené sousednosti, krátká komunikace, obytné místnosti spíš na jih/východ, koupelna a WC u sebe, vstup přes zádveří/chodbu (ne přímo do obýváku).
- NEDĚLEJ naivní mřížku stejně velkých kójí („králíkárnu"). Místnosti mají mít realisticky různé velikosti a tvar podle své funkce.
- Piš česky. Odpověz POUZE požadovaným výstupem, bez úvodních frází.
PROMPT;

    public function index()
    {
        $prompt = DB::table('koncept_test')->where('uzivatel_id', Auth::id())->value('prompt')
            ?? self::VYCHOZI_PROMPT;

        $modely = self::MODELY;

        return view('masterteam.koncept-testovani', compact('prompt', 'modely'));
    }

    /** Autosave předdefinovaného promptu. */
    public function ulozitPrompt(Request $request)
    {
        $data = $request->validate(['prompt' => ['nullable', 'string', 'max:4000']]);

        DB::table('koncept_test')->updateOrInsert(
            ['uzivatel_id' => Auth::id()],
            ['prompt' => $data['prompt'] ?? '', 'upraveno' => now()]
        );

        return response()->json(['ok' => true]);
    }

    /** Vygeneruje ASCII návrh jedním modelem (volá se paralelně pro každý model zvlášť). */
    public function generovat(Request $request)
    {
        $data = $request->validate([
            'model' => ['required', 'string'],
            'prompt' => ['required', 'string', 'max:4000'],
        ]);

        $model = $data['model'];
        if (! isset(self::MODELY[$model])) {
            return response()->json(['ok' => false, 'error' => 'Neznámý model'], 422);
        }

        // Delší běh pro Opus/Fable — na sdíleném hostingu zvednout limit (pokud povoleno).
        @set_time_limit(150);

        $start = microtime(true);
        try {
            $text = (new ClaudeApi())->message(
                model: $model,
                system: self::SYSTEM,
                user: $data['prompt'],
                maxTokens: 3500,
                modul: 'koncept_test',
                poznamka: self::MODELY[$model],
                timeout: 140,
            );
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'model' => $model,
                'error' => $e->getMessage(),
                'ms' => (int) ((microtime(true) - $start) * 1000),
            ]);
        }

        return response()->json([
            'ok' => $text !== null && $text !== '',
            'model' => $model,
            'nazev' => self::MODELY[$model],
            'text' => $text ?? '(model nevrátil žádný text — mohlo jít o odmítnutí požadavku)',
            'ms' => (int) ((microtime(true) - $start) * 1000),
        ]);
    }
}
