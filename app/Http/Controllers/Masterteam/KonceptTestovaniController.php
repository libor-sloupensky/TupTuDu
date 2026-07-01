<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Services\ClaudeApi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class KonceptTestovaniController extends Controller
{
    private const MODELY = [
        'claude-haiku-4-5'  => 'Haiku 4.5',
        'claude-sonnet-4-6' => 'Sonnet 4.6',
        'claude-opus-4-8'   => 'Opus 4.8',
        // 'claude-fable-5' => 'Fable 5',  // nedostupné pro tento API klíč (404 – gated access)
    ];

    private const VYCHOZI_PROMPT = 'Navrhni rodinný dům 12×8 m se třemi ložnicemi, obývacím pokojem s kuchyní, koupelnou a samostatným WC. Vstup ze severu.';

    /** Režim A — model kreslí ASCII (původní). */
    private const SYSTEM_ASCII = <<<'PROMPT'
Jsi zkušený český architekt. Na základě zadání navrhni PŮDORYS jednopodlažního objektu a nakresli ho v ASCII.

VÝSTUP:
1) ASCII půdorys: stěny čarami (`-`, `|`, rohy `+`), místnosti pojmenuj (název + m²) uvnitř, dveře = `D` nebo mezera, okna = `o`, vstup označ slovem VSTUP, uveď měřítko.
2) Krátké zdůvodnění (3–6 vět): sousednosti, komunikace, orientace.

PRAVIDLA: navrhuj jako skutečný architekt (promyšlené sousednosti, krátká komunikace, obytné místnosti na jih/východ, koupelna+WC u sebe, vstup přes zádveří). NEDĚLEJ naivní mřížku stejných kójí. Piš česky, odpověz jen výstupem.
PROMPT;

    /** Režim B — model vrací STRUKTURU (data), ASCII kreslíme my. */
    private const SYSTEM_STRUKT = <<<'PROMPT'
Jsi zkušený český architekt. Na základě zadání navrhni dispozici jednopodlažního domu a vrať ji jako STRUKTUROVANÁ DATA (JSON). NEKRESLÍŠ — jen popisuješ logiku dispozice. Přesné souřadnice počítá jiný program.

Vrať POUZE validní JSON (první znak `{`, poslední `}`, žádný text okolo, žádné ```):
{
  "footprint": { "sirka_m": <číslo>, "hloubka_m": <číslo> },
  "mistnosti": [
    { "id": "obyvak", "nazev": "Obývák + kuchyň", "typ": "LivingRoom", "plocha_m2": 32, "orientace": ["J","V"] }
  ],
  "vstup_do": "<id místnosti, do které vede vchod zvenku>",
  "dvere": [ ["zadveri","chodba"], ["chodba","obyvak"] ]
}

PRAVIDLA POLÍ:
- `typ` (anglicky z výčtu): LivingRoom, Kitchen, Bedroom, Bath, WC, Entry (zádveří), Hall (chodba), Storage, Utility, Garage, Other.
- `orientace`: pole světových stran, na kterých má místnost OKNO (podmnožina "S","J","V","Z"). Vnitřní místnost bez okna = prázdné pole [].
- `vstup_do`: id místnosti, kam se vejde zvenku (má to být Entry nebo Hall, ne obývák/ložnice).
- `dvere`: dvojice id místností, které jsou propojené dveřmi/průchodem. Přes tyto dveře se musí dát dojít do KAŽDÉ místnosti.
- Součet `plocha_m2` má přibližně odpovídat ploše footprintu (sirka×hloubka).

ARCHITEKTONICKÁ PRAVIDLA (dodrž je v datech):
- Obytné místnosti (obývák, ložnice) orientuj oknem na jih/východ; sever nech pro chodbu, koupelnu, technické.
- Koupelna a WC blízko sebe (propoj je s toutéž chodbou).
- Každá ložnice přístupná z chodby/zádveří (NE průchodem přes jinou ložnici nebo obývák).
- Vstup přes zádveří/chodbu, ne přímo do obýváku.
Odpověz POUZE JSON.
PROMPT;

    public function index()
    {
        $prompt = DB::table('koncept_test')->where('uzivatel_id', Auth::id())->value('prompt')
            ?? self::VYCHOZI_PROMPT;

        $modely = self::MODELY;

        return view('masterteam.koncept-testovani', compact('prompt', 'modely'));
    }

    public function ulozitPrompt(Request $request)
    {
        $data = $request->validate(['prompt' => ['nullable', 'string', 'max:4000']]);
        DB::table('koncept_test')->updateOrInsert(
            ['uzivatel_id' => Auth::id()],
            ['prompt' => $data['prompt'] ?? '', 'upraveno' => now()]
        );
        return response()->json(['ok' => true]);
    }

    public function generovat(Request $request)
    {
        $data = $request->validate([
            'model'  => ['required', 'string'],
            'prompt' => ['required', 'string', 'max:4000'],
            'rezim'  => ['nullable', 'in:ascii,struktura'],
        ]);

        $model = $data['model'];
        if (! isset(self::MODELY[$model])) {
            return response()->json(['ok' => false, 'error' => 'Neznámý model'], 422);
        }
        $rezim = $data['rezim'] ?? 'struktura';

        @set_time_limit(150);
        $start = microtime(true);

        try {
            $text = (new ClaudeApi())->message(
                model: $model,
                system: $rezim === 'ascii' ? self::SYSTEM_ASCII : self::SYSTEM_STRUKT,
                user: $data['prompt'],
                maxTokens: 3500,
                modul: 'koncept_test',
                poznamka: self::MODELY[$model] . ' / ' . $rezim,
                timeout: 140,
            );
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false, 'model' => $model, 'error' => $e->getMessage(),
                'ms' => (int) ((microtime(true) - $start) * 1000),
            ]);
        }

        $ms = (int) ((microtime(true) - $start) * 1000);

        if ($text === null || $text === '') {
            return response()->json(['ok' => false, 'model' => $model, 'ms' => $ms,
                'error' => 'Model nevrátil žádný text (možné odmítnutí).']);
        }

        if ($rezim === 'ascii') {
            return response()->json(['ok' => true, 'model' => $model, 'nazev' => self::MODELY[$model],
                'rezim' => 'ascii', 'text' => $text, 'ms' => $ms]);
        }

        // Strukturovaný režim: parsovat JSON → kontrola → vykreslit
        $topo = $this->parseTopologii($text);
        if ($topo === null) {
            return response()->json(['ok' => false, 'model' => $model, 'ms' => $ms, 'rezim' => 'struktura',
                'error' => 'Model nevrátil platný JSON.', 'raw' => mb_substr($text, 0, 2000)]);
        }

        [$skore, $poruseni] = $this->zkontroluj($topo);
        $ascii = $this->vykresli($topo);

        return response()->json([
            'ok' => true, 'model' => $model, 'nazev' => self::MODELY[$model], 'rezim' => 'struktura', 'ms' => $ms,
            'skore' => $skore, 'poruseni' => $poruseni, 'ascii' => $ascii,
            'raw' => json_encode($topo, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        ]);
    }

    /** Vytáhne a dekóduje JSON z odpovědi (i když je obalený textem/```). */
    private function parseTopologii(string $text): ?array
    {
        $t = trim($text);
        // Odstranit markdown fence
        if (str_starts_with($t, '```')) {
            $t = preg_replace('/^```[a-zA-Z]*\n?/', '', $t);
            $t = preg_replace('/```\s*$/', '', $t);
        }
        // Vzít od prvního { po poslední }
        $start = strpos($t, '{');
        $end = strrpos($t, '}');
        if ($start === false || $end === false || $end <= $start) return null;
        $json = substr($t, $start, $end - $start + 1);
        $data = json_decode($json, true);
        if (! is_array($data) || empty($data['mistnosti']) || ! is_array($data['mistnosti'])) return null;
        return $data;
    }

    /** Ohodnotí dispozici podle architektonických pravidel → [skóre 0–100, seznam porušení]. */
    private function zkontroluj(array $topo): array
    {
        $mist = $topo['mistnosti'];
        $fp = $topo['footprint'] ?? [];
        $dvere = $topo['dvere'] ?? [];
        $vstupDo = $topo['vstup_do'] ?? null;

        $typ = [];       // id => typ
        $orient = [];    // id => [strany]
        $nazev = [];     // id => název
        foreach ($mist as $m) {
            $id = $m['id'] ?? null; if (! $id) continue;
            $typ[$id] = $m['typ'] ?? 'Other';
            $orient[$id] = array_map('strtoupper', (array) ($m['orientace'] ?? []));
            $nazev[$id] = $m['nazev'] ?? $id;
        }
        // Sousedé (obousměrně)
        $sous = [];
        foreach ($dvere as $d) {
            if (! is_array($d) || count($d) < 2) continue;
            [$a, $b] = [$d[0], $d[1]];
            $sous[$a][] = $b; $sous[$b][] = $a;
        }
        $jeChodbaEntry = fn ($id) => in_array($typ[$id] ?? '', ['Hall', 'Entry'], true);

        $pravidla = []; // [popis, splneno(bool)]

        // 1) Součet ploch ≈ footprint
        $sumP = 0; foreach ($mist as $m) $sumP += (float) ($m['plocha_m2'] ?? 0);
        $plochaFp = (float) ($fp['sirka_m'] ?? 0) * (float) ($fp['hloubka_m'] ?? 0);
        $okPlocha = $plochaFp > 0 && $sumP >= $plochaFp * 0.75 && $sumP <= $plochaFp * 1.25;
        $pravidla[] = ["Součet ploch (" . round($sumP) . " m²) odpovídá půdorysu (" . round($plochaFp) . " m²)", $okPlocha];

        // 2) Dostupnost všech místností ze vstupu (BFS)
        $dostupne = [];
        if ($vstupDo && isset($typ[$vstupDo])) {
            $fronta = [$vstupDo]; $dostupne[$vstupDo] = true;
            while ($fronta) {
                $u = array_shift($fronta);
                foreach ($sous[$u] ?? [] as $v) {
                    if (! isset($dostupne[$v]) && isset($typ[$v])) { $dostupne[$v] = true; $fronta[] = $v; }
                }
            }
        }
        $nedostupne = array_diff(array_keys($typ), array_keys($dostupne));
        $pravidla[] = ["Každá místnost je dostupná ze vstupu" . ($nedostupne ? " (nedosažitelné: " . implode(', ', array_map(fn ($i) => $nazev[$i], $nedostupne)) . ")" : ""), empty($nedostupne)];

        // 3) Vstup přes zádveří/chodbu (ne do obýváku/ložnice)
        $okVstup = $vstupDo && $jeChodbaEntry($vstupDo);
        $pravidla[] = ["Vstup vede do zádveří/chodby (ne přímo do pokoje)", (bool) $okVstup];

        // 4) Koupelna + WC blízko (sdílí souseda nebo přímé dveře)
        $bathIds = array_keys(array_filter($typ, fn ($t) => $t === 'Bath'));
        $wcIds = array_keys(array_filter($typ, fn ($t) => $t === 'WC'));
        $okWet = true;
        if ($bathIds && $wcIds) {
            $okWet = false;
            foreach ($bathIds as $b) foreach ($wcIds as $w) {
                if (in_array($w, $sous[$b] ?? [], true)) $okWet = true;
                elseif (array_intersect($sous[$b] ?? [], $sous[$w] ?? [])) $okWet = true;
            }
            $pravidla[] = ["Koupelna a WC jsou u sebe", $okWet];
        }

        // 5) Ložnice mají okno na jih/východ
        $loznice = array_keys(array_filter($typ, fn ($t) => $t === 'Bedroom'));
        $spatneOrient = array_filter($loznice, fn ($id) => ! array_intersect($orient[$id] ?? [], ['J', 'V']));
        if ($loznice) {
            $pravidla[] = ["Ložnice mají okno na jih/východ" . ($spatneOrient ? " (chybí u: " . implode(', ', array_map(fn ($i) => $nazev[$i], $spatneOrient)) . ")" : ""), empty($spatneOrient)];
        }

        // 6) Ložnice přístupné z chodby/zádveří (ne skrz jinou obytnou místnost)
        $spatnePristup = array_filter($loznice, function ($id) use ($sous, $jeChodbaEntry) {
            foreach ($sous[$id] ?? [] as $v) if ($jeChodbaEntry($v)) return false;
            return true;
        });
        if ($loznice) {
            $pravidla[] = ["Ložnice jsou přístupné z chodby/zádveří" . ($spatnePristup ? " (ne u: " . implode(', ', array_map(fn ($i) => $nazev[$i], $spatnePristup)) . ")" : ""), empty($spatnePristup)];
        }

        // 7) Obývák má okno
        $obyvak = array_keys(array_filter($typ, fn ($t) => in_array($t, ['LivingRoom', 'Kitchen'], true)));
        $obyvakBezOkna = array_filter($obyvak, fn ($id) => empty($orient[$id]));
        if ($obyvak) {
            $pravidla[] = ["Obývák/kuchyň má okno", empty($obyvakBezOkna)];
        }

        $splneno = count(array_filter($pravidla, fn ($p) => $p[1]));
        $celkem = count($pravidla);
        $skore = $celkem ? (int) round($splneno / $celkem * 100) : 0;
        $poruseni = array_map(fn ($p) => $p[0], array_filter($pravidla, fn ($p) => ! $p[1]));

        return [$skore, array_values($poruseni)];
    }

    /** Deterministicky vykreslí dispozici do ASCII (area-proporční dělení půdorysu). */
    private function vykresli(array $topo): string
    {
        $mist = $topo['mistnosti'];
        $CW = 64; $CH = 26; // znaková mřížka

        $rooms = [];
        foreach ($mist as $m) {
            $rooms[] = [
                'nazev'  => $m['nazev'] ?? ($m['id'] ?? '?'),
                'plocha' => max(0.5, (float) ($m['plocha_m2'] ?? 1)),
            ];
        }

        $grid = array_fill(0, $CH, array_fill(0, $CW, ' '));
        $this->slice($rooms, 0, 0, $CW, $CH, $grid);

        $out = "  (rozmístění je orientační — přesné dispoziční umístění je krok 2)\n\n";
        foreach ($grid as $row) $out .= rtrim(implode('', $row)) . "\n";
        return $out;
    }

    /** Rekurzivní area-proporční dělení obdélníku (treemap slice-and-dice). */
    private function slice(array $rooms, int $x, int $y, int $w, int $h, array &$grid): void
    {
        if ($w < 2 || $h < 2 || empty($rooms)) return;
        if (count($rooms) === 1) {
            $this->kresliMistnost($x, $y, $w, $h, $rooms[0]['nazev'], $rooms[0]['plocha'], $grid);
            return;
        }
        $n = count($rooms);
        $total = array_sum(array_column($rooms, 'plocha'));
        // Najdi dělicí index k (1..n-1) tak, aby plochy obou skupin byly co nejvyrovnanější.
        $prefix = 0; $best = PHP_INT_MAX; $k = 1;
        for ($idx = 0; $idx < $n - 1; $idx++) {
            $prefix += $rooms[$idx]['plocha'];
            $diff = abs($prefix - ($total - $prefix));
            if ($diff < $best) { $best = $diff; $k = $idx + 1; }
        }
        $a = array_slice($rooms, 0, $k);
        $b = array_slice($rooms, $k);
        $sumA = array_sum(array_column($a, 'plocha'));
        $podil = $total > 0 ? $sumA / $total : 0.5;
        if ($w >= $h) { // svislý řez
            $cw = max(1, min($w - 1, (int) round($w * $podil)));
            $this->slice($a, $x, $y, $cw, $h, $grid);
            $this->slice($b, $x + $cw, $y, $w - $cw, $h, $grid);
        } else { // vodorovný řez
            $ch = max(1, min($h - 1, (int) round($h * $podil)));
            $this->slice($a, $x, $y, $w, $ch, $grid);
            $this->slice($b, $x, $y + $ch, $w, $h - $ch, $grid);
        }
    }

    private function kresliMistnost(int $x, int $y, int $w, int $h, string $nazev, float $plocha, array &$grid): void
    {
        $CH = count($grid); $CW = count($grid[0]);
        $x2 = $x + $w - 1; $y2 = $y + $h - 1;
        for ($i = $x; $i <= $x2; $i++) {
            $this->put($grid, $i, $y, '-'); $this->put($grid, $i, $y2, '-');
        }
        for ($j = $y; $j <= $y2; $j++) {
            $this->put($grid, $x, $j, '|'); $this->put($grid, $x2, $j, '|');
        }
        foreach ([[$x, $y], [$x2, $y], [$x, $y2], [$x2, $y2]] as [$cx, $cy]) $this->put($grid, $cx, $cy, '+');

        // popisky dovnitř
        $label = $this->zkratka($nazev);
        $this->text($grid, $x + 2, $y + 1, mb_substr($label, 0, max(0, $w - 3)));
        if ($h >= 4) $this->text($grid, $x + 2, $y + 2, round($plocha) . ' m2');
    }

    private function put(array &$grid, int $x, int $y, string $ch): void
    {
        if ($y >= 0 && $y < count($grid) && $x >= 0 && $x < count($grid[0])) $grid[$y][$x] = $ch;
    }

    private function text(array &$grid, int $x, int $y, string $s): void
    {
        $len = mb_strlen($s);
        for ($k = 0; $k < $len; $k++) $this->put($grid, $x + $k, $y, mb_substr($s, $k, 1));
    }

    /** Diakritiku pryč (ASCII grid) + zkrácení. */
    private function zkratka(string $s): string
    {
        $s = strtr($s, [
            'á'=>'a','č'=>'c','ď'=>'d','é'=>'e','ě'=>'e','í'=>'i','ň'=>'n','ó'=>'o','ř'=>'r','š'=>'s','ť'=>'t','ú'=>'u','ů'=>'u','ý'=>'y','ž'=>'z',
            'Á'=>'A','Č'=>'C','Ď'=>'D','É'=>'E','Ě'=>'E','Í'=>'I','Ň'=>'N','Ó'=>'O','Ř'=>'R','Š'=>'S','Ť'=>'T','Ú'=>'U','Ů'=>'U','Ý'=>'Y','Ž'=>'Z',
        ]);
        return $s;
    }
}
