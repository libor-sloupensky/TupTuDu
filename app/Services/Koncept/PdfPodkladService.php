<?php

namespace App\Services\Koncept;

use Illuminate\Support\Facades\Storage;

/**
 * Příprava podkladu pro import půdorysu — PDF přes poppler (pdfinfo, pdftocairo, pdftotext).
 *
 * Z PDF vzniká trojice:
 *   - PNG  = obrázek stránky (podklad pod kresbou, náhledy stran)
 *   - SVG  = vektorová data (z nich se počítají stěny; uživatel je nevidí)
 *   - text = pro automatické měřítko ("M 1:100") a později legendu místností
 *
 * Binárky se hledají jako v kalkuliu: nejdřív konfigurace, pak PATH. Na hostingu
 * bývá open_basedir, takže se nepoužívá file_exists, ale `command -v` / `where`.
 */
class PdfPodkladService
{
    /** Složka s podklady (relativně ke storage/app). */
    public const SLOZKA = 'koncept-v3-podklady';

    private array $binarky = [];

    /**
     * Najde cestu k binárce poppleru. Vrací null, když není k dispozici.
     */
    public function binarka(string $nazev): ?string
    {
        if (array_key_exists($nazev, $this->binarky)) {
            return $this->binarky[$nazev];
        }

        $cesta = null;
        $vlastni = rtrim((string) config('koncept.poppler_cesta'), '/\\');
        if ($vlastni !== '') {
            $kandidat = $vlastni . DIRECTORY_SEPARATOR . $nazev . (str_contains(PHP_OS_FAMILY, 'Windows') ? '.exe' : '');
            if (@is_file($kandidat)) {
                $cesta = $kandidat;
            }
        }

        if ($cesta === null) {
            $prikaz = str_contains(PHP_OS_FAMILY, 'Windows') ? "where $nazev 2>NUL" : "command -v $nazev 2>/dev/null";
            $vystup = @shell_exec($prikaz);
            $prvni = $vystup ? trim(strtok($vystup, "\n")) : '';
            if ($prvni !== '') {
                $cesta = $prvni;
            }
        }

        return $this->binarky[$nazev] = $cesta;
    }

    /**
     * Je poppler dostupný? (Kontroluje se před nabídnutím importu z PDF.)
     */
    public function dostupny(): bool
    {
        return $this->binarka('pdfinfo') !== null && $this->binarka('pdftocairo') !== null;
    }

    /**
     * Počet stran a rozměr stránky v bodech.
     *
     * @return array{stran:int, sirka_pt:float, vyska_pt:float}
     */
    public function info(string $absCesta): array
    {
        $vystup = $this->spust('pdfinfo', [$absCesta]);
        $stran = preg_match('/^Pages:\s+(\d+)/m', $vystup, $m) ? (int) $m[1] : 0;
        $sirka = $vyska = 0.0;
        if (preg_match('/^Page size:\s+([\d.]+) x ([\d.]+)/m', $vystup, $m)) {
            $sirka = (float) $m[1];
            $vyska = (float) $m[2];
        }

        // Otočení stránky. pdfinfo hlásí rozměr PŘED otočením, ale pdftocairo
        // otočení při vykreslení použije — PNG i SVG tedy vyjdou s prohozenými
        // stranami. Bez téhle výměny se podklad v editoru vykreslí v opačném
        // poměru stran a kresba na něm nelícuje (týká se 4 z 10 výkresů).
        $otoceni = preg_match('/^Page rot:\s+(-?\d+)/m', $vystup, $m) ? ((int) $m[1] % 360 + 360) % 360 : 0;
        if ($otoceni === 90 || $otoceni === 270) {
            [$sirka, $vyska] = [$vyska, $sirka];
        }

        return ['stran' => $stran, 'sirka_pt' => $sirka, 'vyska_pt' => $vyska, 'otoceni' => $otoceni];
    }

    /**
     * Vykreslí stránku do PNG. Výsledek se cachuje podle otisku souboru, strany a DPI.
     * Vrací cestu relativní ke storage/app.
     */
    public function png(string $absCesta, string $otisk, int $strana, int $dpi): string
    {
        $rel = self::SLOZKA . "/cache/$otisk/s{$strana}-{$dpi}.png";
        if (Storage::exists($rel)) {
            return $rel;
        }

        // pdftocairo si příponu doplní samo (-singlefile → základ bez .png)
        $cil = $this->docasny($otisk, "s{$strana}-{$dpi}");
        $this->spust('pdftocairo', ['-png', '-singlefile', '-r', (string) $dpi, '-f', (string) $strana, '-l', (string) $strana, $absCesta, $cil]);

        return $this->ulozVysledek($cil . '.png', $rel);
    }

    /**
     * Vektorová data stránky (SVG). Vrací cestu relativní ke storage/app.
     */
    public function svg(string $absCesta, string $otisk, int $strana): string
    {
        $rel = self::SLOZKA . "/cache/$otisk/s{$strana}.svg";
        if (Storage::exists($rel)) {
            return $rel;
        }

        $cil = $this->docasny($otisk, "s{$strana}") . '.svg';
        $this->spust('pdftocairo', ['-svg', '-f', (string) $strana, '-l', (string) $strana, $absCesta, $cil]);

        return $this->ulozVysledek($cil, $rel);
    }

    /**
     * Text stránky (pro měřítko a legendu místností).
     */
    public function text(string $absCesta, int $strana): string
    {
        if (!$this->binarka('pdftotext')) {
            return '';
        }

        return $this->spust('pdftotext', ['-f', (string) $strana, '-l', (string) $strana, $absCesta, '-']);
    }

    /**
     * Spustí binárku a vrátí standardní výstup.
     */
    private function spust(string $nazev, array $argumenty): string
    {
        $bin = $this->binarka($nazev);
        if (!$bin) {
            throw new \RuntimeException("Nástroj $nazev není na serveru k dispozici.");
        }

        $prikaz = escapeshellarg($bin);
        foreach ($argumenty as $a) {
            $prikaz .= ' ' . ($a === '-' ? '-' : escapeshellarg($a));
        }

        $vystup = @shell_exec($prikaz . ' 2>&1');

        return is_string($vystup) ? $vystup : '';
    }

    /**
     * Dočasná cesta pro výstup binárky (mimo Storage, protože poppler zapisuje přímo na disk).
     */
    private function docasny(string $otisk, string $nazev): string
    {
        // POZOR: Storage::path, ne storage_path('app/…') — disk „local“ míří
        // v Laravelu 12 do storage/app/private.
        $slozka = Storage::path(self::SLOZKA . '/cache/' . $otisk);
        if (!is_dir($slozka)) {
            @mkdir($slozka, 0775, true);
        }

        return $slozka . DIRECTORY_SEPARATOR . $nazev;
    }

    /**
     * Ověří, že binárka soubor vytvořila, a vrátí cestu relativní ke storage/app.
     */
    private function ulozVysledek(string $absSoubor, string $rel): string
    {
        clearstatcache(true, $absSoubor);
        if (!@is_file($absSoubor) || @filesize($absSoubor) === 0) {
            throw new \RuntimeException('Stránku se nepodařilo zpracovat.');
        }

        // Soubor už leží ve složce cache — jen sjednotit název.
        $cilAbs = Storage::path($rel);
        if ($absSoubor !== $cilAbs) {
            @rename($absSoubor, $cilAbs);
        }

        return $rel;
    }
}
