<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Services\Koncept\PdfPodkladService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

/**
 * Podklad pro import půdorysu do Konceptu V3 — nahrání výkresu, výběr strany,
 * příprava obrázku a vektorových dat. Rozpoznání stěn běží až v prohlížeči.
 */
class KonceptV3PodkladController extends Controller
{
    public function __construct(private PdfPodkladService $pdf)
    {
    }

    /**
     * Nahrání výkresu (PDF nebo obrázek). Soubor se ukládá pod otiskem obsahu,
     * takže stejný výkres nahraný dvakrát zabere místo jen jednou.
     */
    public function nahrat(Request $request)
    {
        $maxKb = ((int) config('koncept.podklad.max_mb', 40)) * 1024;
        $maxMb = (int) config('koncept.podklad.max_mb', 25);
        $request->validate([
            'soubor' => "required|file|max:$maxKb|mimes:pdf,png,jpg,jpeg",
        ], [
            'soubor.required' => 'Vyberte výkres.',
            'soubor.mimes' => 'Nahrát jde jen PDF, PNG nebo JPG.',
            'soubor.max' => "Soubor je větší než $maxMb MB.",
        ]);

        $soubor = $request->file('soubor');
        $pripona = strtolower($soubor->getClientOriginalExtension());
        $jePdf = $pripona === 'pdf';

        if ($jePdf && !$this->pdf->dostupny()) {
            return response()->json([
                'ok' => false,
                'error' => 'Na serveru chybí nástroje pro čtení PDF (poppler). Nahrajte obrázek, nebo doplňte poppler.',
            ], 422);
        }

        $otisk = sha1_file($soubor->getRealPath());
        $rel = $this->cestaOriginalu($otisk, $pripona);
        if (!Storage::exists($rel)) {
            Storage::put($rel, file_get_contents($soubor->getRealPath()));
        }

        // Název a čas se ukládají vedle souboru, aby šel výkres později
        // znovu vybrat ze seznamu (a nemusel se nahrávat podruhé).
        // Stejný soubor nahraný znovu má stejný otisk — zapamatovaná kalibrace
        // a obkreslený obvod se proto MUSÍ zachovat, jinak by je nové nahrání smazalo.
        $cestaPopisu = PdfPodkladService::SLOZKA . '/' . Auth::id() . "/$otisk.json";
        $drivejsi = Storage::exists($cestaPopisu)
            ? (json_decode(Storage::get($cestaPopisu), true) ?: [])
            : [];

        Storage::put($cestaPopisu, json_encode([
            'nazev' => $soubor->getClientOriginalName(),
            'pripona' => $pripona,
            'velikost' => $soubor->getSize(),
            'nahrano' => now()->toIso8601String(),
            'strany' => $drivejsi['strany'] ?? [],
        ], JSON_UNESCAPED_UNICODE));

        $odpoved = [
            'ok' => true,
            'otisk' => $otisk,
            'pripona' => $pripona,
            'nazev' => $soubor->getClientOriginalName(),
            'typ' => $jePdf ? 'pdf' : 'obrazek',
            // co si tenhle výkres pamatuje z dřívějška (u nového souboru prázdné)
            'strany' => (object) ($drivejsi['strany'] ?? []),
        ];

        if ($jePdf) {
            $info = $this->pdf->info(Storage::path($rel));
            $odpoved += ['stran' => $info['stran'], 'sirka_pt' => $info['sirka_pt'], 'vyska_pt' => $info['vyska_pt']];
        } else {
            $rozmer = @getimagesize(Storage::path($rel)) ?: [0, 0];
            $odpoved += ['stran' => 1, 'sirka_px' => $rozmer[0], 'vyska_px' => $rozmer[1]];
        }

        return response()->json($odpoved);
    }

    /**
     * Dříve nahrané výkresy přihlášeného uživatele — ať se stejný výkres
     * nemusí nahrávat znovu při každém pokusu.
     */
    public function seznam()
    {
        $slozka = PdfPodkladService::SLOZKA . '/' . Auth::id();
        $vykresy = [];

        foreach (Storage::files($slozka) as $cesta) {
            if (!str_ends_with($cesta, '.json')) {
                continue;
            }
            $otisk = pathinfo($cesta, PATHINFO_FILENAME);
            $popis = json_decode(Storage::get($cesta), true) ?: [];
            $pripona = $popis['pripona'] ?? 'pdf';
            if (!Storage::exists($this->cestaOriginalu($otisk, $pripona))) {
                continue;                       // popis bez souboru (ruční úklid)
            }

            $zaznam = [
                'otisk' => $otisk,
                'nazev' => $popis['nazev'] ?? ($otisk . '.' . $pripona),
                'pripona' => $pripona,
                'typ' => $pripona === 'pdf' ? 'pdf' : 'obrazek',
                'velikost' => $popis['velikost'] ?? null,
                'nahrano' => $popis['nahrano'] ?? null,
                'stran' => 1,
                // zapamatovaná kalibrace a obkreslený obvod po stranách
                'strany' => $popis['strany'] ?? new \stdClass(),
            ];

            if ($zaznam['typ'] === 'pdf' && $this->pdf->dostupny()) {
                $zaznam['stran'] = $this->pdf->info(Storage::path($this->cestaOriginalu($otisk, $pripona)))['stran'] ?: 1;
            }

            $vykresy[] = $zaznam;
        }

        usort($vykresy, fn ($a, $b) => strcmp($b['nahrano'] ?? '', $a['nahrano'] ?? ''));

        return response()->json(['ok' => true, 'vykresy' => array_slice($vykresy, 0, 20)]);
    }

    /**
     * Zapamatuje si k výkresu měřítko a obkreslený obvod (po stranách).
     *
     * Kalibrace ani obkreslení obvodu se u téhož výkresu nemění, a opakovat
     * je při každém pokusu je zdržení — proto se drží u souboru, ne u konceptu.
     * Souřadnice jsou v bodech PDF (u obrázku v px), takže nezávisí na DPI.
     */
    public function nastaveni(Request $request, string $otisk)
    {
        $data = $request->validate([
            'strana' => 'required|integer|min:1|max:999',
            'kalibBody' => 'nullable|array|size:2',
            'kalibBody.*' => 'array|size:2',
            'kalibBody.*.*' => 'numeric',
            'kalibMm' => 'nullable|numeric|min:1',
            'obrys' => 'nullable|array|max:500',
            'obrys.*' => 'array|size:2',
            'obrys.*.*' => 'numeric',
        ]);

        $cesta = PdfPodkladService::SLOZKA . '/' . Auth::id() . "/$otisk.json";
        if (!Storage::exists($cesta)) {
            return response()->json(['ok' => false, 'error' => 'Výkres neexistuje.'], 404);
        }

        $popis = json_decode(Storage::get($cesta), true) ?: [];
        $strana = (string) $data['strana'];
        $ulozeno = $popis['strany'][$strana] ?? [];

        // posílá se jen to, co uživatel právě dodělal — zbytek zůstane
        foreach (['kalibBody', 'kalibMm', 'obrys'] as $klic) {
            if (array_key_exists($klic, $data) && $data[$klic] !== null) {
                $ulozeno[$klic] = $data[$klic];
            }
        }
        $popis['strany'][$strana] = $ulozeno;
        Storage::put($cesta, json_encode($popis, JSON_UNESCAPED_UNICODE));

        return response()->json(['ok' => true]);
    }

    /**
     * Malý náhled strany pro mřížku výběru.
     */
    public function nahled(string $otisk, int $strana)
    {
        $orig = $this->najdiOriginal($otisk);
        $dpi = (int) config('koncept.podklad.dpi_nahled', 40);

        if (!str_ends_with($orig, '.pdf')) {
            return $this->posliSoubor($orig, 'image/png');
        }

        $rel = $this->pdf->png(Storage::path($orig), $otisk, $strana, $dpi);

        return $this->posliSoubor($rel, 'image/png');
    }

    /**
     * Připraví vybranou stranu: obrázek pod kresbu, vektorová data a text
     * (z textu se hledá měřítko „M 1:100“).
     */
    public function strana(Request $request, string $otisk)
    {
        $request->validate(['strana' => 'required|integer|min:1|max:999']);
        $strana = $request->integer('strana');
        $orig = $this->najdiOriginal($otisk);
        $dpi = (int) config('koncept.podklad.dpi_podklad', 150);

        if (!str_ends_with($orig, '.pdf')) {
            $rozmer = @getimagesize(Storage::path($orig)) ?: [0, 0];

            return response()->json([
                'ok' => true,
                'typ' => 'obrazek',
                'obrazek' => route('masterteam.koncept-v3.podklad.nahled', [$otisk, 1]),
                'sirka_px' => $rozmer[0],
                'vyska_px' => $rozmer[1],
                'vektor' => null,
            ]);
        }

        $absCesta = Storage::path($orig);
        $this->pdf->png($absCesta, $otisk, $strana, $dpi);
        $this->pdf->svg($absCesta, $otisk, $strana);
        $text = $this->pdf->text($absCesta, $strana);
        $info = $this->pdf->info($absCesta);

        return response()->json([
            'ok' => true,
            'typ' => 'pdf',
            'strana' => $strana,
            'dpi' => $dpi,
            'obrazek' => route('masterteam.koncept-v3.podklad.obrazek', [$otisk, $strana, $dpi]),
            'vektor' => route('masterteam.koncept-v3.podklad.vektor', [$otisk, $strana]),
            'sirka_pt' => $info['sirka_pt'],
            'vyska_pt' => $info['vyska_pt'],
            // Měřítko z popisku výkresu se ZÁMĚRNĚ nepřebírá — u printscreenu,
            // scanu nebo ořezaného PDF neplatí. Uživatel rozměr vždy změří.
            'text' => mb_substr($text, 0, 20000),
        ]);
    }

    /**
     * Obrázek stránky ve zvoleném DPI (podklad pod kresbou).
     */
    public function obrazek(string $otisk, int $strana, int $dpi)
    {
        $orig = $this->najdiOriginal($otisk);
        abort_unless(in_array($dpi, [40, 150, 300], true), 404);

        if (!str_ends_with($orig, '.pdf')) {
            return $this->posliSoubor($orig, 'image/png');
        }

        return $this->posliSoubor($this->pdf->png(Storage::path($orig), $otisk, $strana, $dpi), 'image/png');
    }

    /**
     * Vektorová data stránky (SVG) — čte je jen analyzátor v prohlížeči.
     */
    public function vektor(string $otisk, int $strana)
    {
        $orig = $this->najdiOriginal($otisk);
        abort_unless(str_ends_with($orig, '.pdf'), 404);

        return $this->posliSoubor($this->pdf->svg(Storage::path($orig), $otisk, $strana), 'image/svg+xml');
    }

    /**
     * Cesta k originálu — jen ve složce přihlášeného uživatele.
     */
    private function cestaOriginalu(string $otisk, string $pripona): string
    {
        return PdfPodkladService::SLOZKA . '/' . Auth::id() . "/$otisk.$pripona";
    }

    private function najdiOriginal(string $otisk): string
    {
        abort_unless(preg_match('/^[a-f0-9]{40}$/', $otisk) === 1, 404);

        foreach (['pdf', 'png', 'jpg', 'jpeg'] as $pripona) {
            $rel = $this->cestaOriginalu($otisk, $pripona);
            if (Storage::exists($rel)) {
                return $rel;
            }
        }

        abort(404, 'Podklad nenalezen.');
    }

    private function posliSoubor(string $rel, string $typ)
    {
        abort_unless(Storage::exists($rel), 404);

        return response()->file(Storage::path($rel), [
            'Content-Type' => $typ,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
