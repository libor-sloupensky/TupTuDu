<?php

namespace App\Console\Commands;

use App\Models\KonceptV3;
use App\Services\Koncept\PdfPodkladService;
use App\Support\VzorovyProjekt;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Pracovní verze vzorového projektu se stane výchozí (Libor 11. 11. 2026, modules/aplikace.md): data a metadata
 * (i výškový profil v metadata.katastr) se zapíšou do šablony a do database/vzor, odkud je seeder při nasazení
 * přenese na produkci. Libor upravuje „Vzorový projekt – pracovní“ v Masterteamu a na jeho pokyn se pustí tohle.
 *
 * Podklad jde do veřejného repozitáře, proto nový podklad (jiný otisk než v database/vzor) projde jen s --podklad,
 * až je ověřené, že na výkresu nejsou osobní údaje.
 */
class VzorPrevzit extends Command
{
    protected $signature = 'vzor:prevzit {projekt? : id nebo kód, bez něj projekt označený jako pracovní verze (vzor = pracovni)}
        {--podklad : povolit nový podklad (výkres bez osobních údajů ověřený)}
        {--dry-run : jen vypsat, co by se změnilo}';

    protected $description = 'Pracovní verzi vzorového projektu zapíše jako výchozí (šablona + database/vzor)';

    public function handle(): int
    {
        $arg = (string) $this->argument('projekt');
        $zdroj = $arg === ''
            ? KonceptV3::where('vzor', 'pracovni')->latest('upraveno')->first()
            : KonceptV3::where('kod', $arg)->orWhere('id', ctype_digit($arg) ? (int) $arg : 0)->first();
        if (! $zdroj) {
            $this->error($arg === '' ? 'Pracovní verze (vzor = pracovni) neexistuje.' : "Projekt $arg neexistuje.");

            return self::FAILURE;
        }
        if (in_array($zdroj->vzor, ['sablona', 'kopie'], true)) {
            $this->error('Zdrojem musí být pracovní verze, ne šablona ani kopie na hraní.');

            return self::FAILURE;
        }

        // Podklad: PDF podle otisku z metadat pracovní verze, u autora pracovní verze
        $meta = $zdroj->metadata ?? [];
        $otisk = $meta['podklad']['otisk'] ?? null;
        $souborPdf = database_path(VzorovyProjekt::SOUBOR_PDF);
        $pdf = null;
        $strany = [];
        if ($otisk) {
            $cesta = PdfPodkladService::SLOZKA . '/' . $zdroj->uzivatel_id . "/$otisk";
            if (! Storage::exists("$cesta.pdf")) {
                $this->error("Podklad $otisk není u autora pracovní verze jako PDF ($cesta.pdf).");

                return self::FAILURE;
            }
            $pdf = Storage::get("$cesta.pdf");
            $strany = json_decode((string) Storage::get("$cesta.json"), true)['strany'] ?? [];
            $stary = is_file($souborPdf) ? sha1_file($souborPdf) : null;
            if ($stary !== $otisk && ! $this->option('podklad')) {
                $this->error('Pracovní verze má jiný podklad než výchozí. Jde do veřejného repozitáře: ověř, že na výkresu nejsou osobní údaje, a spusť znovu s --podklad.');

                return self::FAILURE;
            }
        }

        $obsah = [
            'nazev' => 'Vzorový projekt – výchozí',
            'faze' => $zdroj->faze,
            'data' => $zdroj->data,
            'metadata' => $zdroj->metadata,
            'podklad_strany' => $strany,
        ];
        $this->line('Zdroj: ' . $zdroj->id . ' ' . $zdroj->kod . ' „' . $zdroj->nazev . '“, upraveno ' . $zdroj->upraveno);
        if ($this->option('dry-run')) {
            $sablona = VzorovyProjekt::sablona();
            $this->line($sablona && $sablona->data == $obsah['data'] && $sablona->metadata == $obsah['metadata'] ? 'Šablona je stejná, nic by se nezměnilo.' : 'Šablona by se přepsala.');

            return self::SUCCESS;
        }

        file_put_contents(database_path(VzorovyProjekt::SOUBOR), json_encode($obsah, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        if ($pdf !== null) {
            file_put_contents($souborPdf, $pdf);
            $this->vykresliPodklad($souborPdf, $otisk, (int) ($meta['podklad']['strana'] ?? 1));
        }
        $sablona = VzorovyProjekt::zapisSablonu($obsah, $pdf, $zdroj->uzivatel);
        $this->info($sablona ? "Šablona {$sablona->id} přepsaná, database/vzor zapsané. Na produkci se projeví po nasazení." : 'Šablona už byla stejná, database/vzor zapsané.');

        return self::SUCCESS;
    }

    /**
     * Stranu podkladu vykreslí do database/vzor jako obrázek — produkce PDF sama nevykreslí
     * (shell_exec vypnutá, poppler chybí) a seeder ho tam vloží do cache podkladů.
     */
    private function vykresliPodklad(string $souborPdf, string $otisk, int $strana): void
    {
        $pdf = app(PdfPodkladService::class);
        if (! $pdf->dostupny()) {
            $this->warn('Poppler tu není: obrázek podkladu pro produkci se nevykreslil, vzorový projekt tam bude bez podkladu.');

            return;
        }
        foreach (VzorovyProjekt::vykresleneStrany() as $stary) {
            @unlink($stary);
        }
        $dpi = (int) config('koncept.podklad.dpi_podklad', 150);
        $rel = $pdf->png($souborPdf, $otisk, $strana, $dpi);
        copy(Storage::path($rel), database_path(VzorovyProjekt::PREDPONA_PNG . "$strana-$dpi.png"));
    }
}
