<?php

namespace Database\Seeders;

use App\Models\KonceptV3;
use App\Models\Subjekt;
use App\Services\Koncept\PdfPodkladService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Šablona vzorového projektu z database/vzor (App\Support\VzorovyProjekt, modules/aplikace.md).
 * Založí ji jen tam, kde ještě žádná není (první nasazení). Potom se šablona upravuje v editoru
 * a tenhle soubor se nepřepisuje. Podklad je výkres bez osobních údajů.
 */
class VzorovyProjektSeeder extends Seeder
{
    public function run(): void
    {
        $slozka = database_path('vzor');
        if (KonceptV3::where('vzor', 'sablona')->exists() || ! is_file("$slozka/vzorovy-projekt.json")) {
            return;
        }
        $autor = Subjekt::where('ico', config('app.master_ico'))->first()?->uzivatele()->wherePivot('je_vlastnik', true)->first();
        if (! $autor) {
            return;
        }

        $obsah = json_decode(file_get_contents("$slozka/vzorovy-projekt.json"), true);
        if (is_file("$slozka/vzorovy-projekt.pdf")) {
            $pdf = file_get_contents("$slozka/vzorovy-projekt.pdf");
            $otisk = sha1($pdf);
            $cesta = PdfPodkladService::SLOZKA . '/' . $autor->id . "/$otisk";
            Storage::put("$cesta.pdf", $pdf);
            Storage::put("$cesta.json", json_encode([
                'nazev' => 'vzorovy-projekt.pdf', 'pripona' => 'pdf', 'velikost' => strlen($pdf),
                'nahrano' => now()->toIso8601String(), 'strany' => $obsah['podklad_strany'] ?? [],
            ], JSON_UNESCAPED_UNICODE));
        }

        $sablona = new KonceptV3([
            'uzivatel_id' => $autor->id, 'nazev' => $obsah['nazev'], 'data' => $obsah['data'], 'metadata' => $obsah['metadata'],
            'verze' => 1, 'faze' => $obsah['faze'] ?? 'rozhovor', 'chat' => [], 'historie' => [],
        ]);
        $sablona->vzor = 'sablona';
        $sablona->kod = KonceptV3::novyKod();
        // Bez událostí modelu: není to nový projekt uživatele (GA4)
        KonceptV3::withoutEvents(fn () => $sablona->save());
    }
}
