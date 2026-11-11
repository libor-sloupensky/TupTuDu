<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;

/**
 * Nahrání loga firmy: zmenšení na nejvyšší rozměry, převod na WebP a uložení do
 * storage/app/loga/{id firmy}.webp (mimo nasazování, soubor vydává LogoFirmyController).
 *
 * Bezpečnost:
 *  - povolené typy jen JPG, PNG a WebP
 *  - vstup nejvýš 5 MB
 *  - obrázek se překreslí přes GD (zahodí EXIF a cokoli vloženého, SVG neprojde)
 *  - výstup vždy WebP
 */
class LogoUploader
{
    public const MAX_VSTUP_MB = 5;

    private const MAX_SIRKA = 800;

    private const MAX_VYSKA = 600;

    private const KVALITA_WEBP = 82;

    private const SLOZKA = 'loga';

    /**
     * Výsledek:
     *   ['ok' => true, 'path' => 'loga/12.webp']
     *   ['ok' => false, 'error' => 'popis chyby pro uživatele']
     */
    public function ulozit(UploadedFile $soubor, int $firmaId): array
    {
        // 1. Typ a velikost
        if (! in_array($soubor->getMimeType(), ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return ['ok' => false, 'error' => __('ucet.logo_chyba_format')];
        }
        if ($soubor->getSize() > self::MAX_VSTUP_MB * 1024 * 1024) {
            return ['ok' => false, 'error' => __('ucet.logo_chyba_velikost', ['mb' => self::MAX_VSTUP_MB])];
        }

        // 2. Načíst do GD
        $zdroj = function_exists('imagecreatefromstring')
            ? @imagecreatefromstring((string) file_get_contents($soubor->getRealPath()))
            : false;
        if (! $zdroj) {
            return ['ok' => false, 'error' => __('ucet.logo_chyba_obrazek')];
        }

        // 3. Zmenšit se zachováním poměru stran (vejít se do MAX_SIRKA × MAX_VYSKA, nezvětšovat)
        $sirka = imagesx($zdroj);
        $vyska = imagesy($zdroj);
        $pomer = min(self::MAX_SIRKA / $sirka, self::MAX_VYSKA / $vyska, 1.0);
        $novaSirka = max(1, (int) round($sirka * $pomer));
        $novaVyska = max(1, (int) round($vyska * $pomer));
        $cil = imagecreatetruecolor($novaSirka, $novaVyska);
        // Průhlednost z PNG a WebP
        imagealphablending($cil, false);
        imagesavealpha($cil, true);
        imagefill($cil, 0, 0, imagecolorallocatealpha($cil, 0, 0, 0, 127));
        imagecopyresampled($cil, $zdroj, 0, 0, 0, 0, $novaSirka, $novaVyska, $sirka, $vyska);

        // 4. Uložit jako WebP
        $cesta = self::SLOZKA . '/' . $firmaId . '.webp';
        $slozka = storage_path('app/' . self::SLOZKA);
        if (! is_dir($slozka)) {
            @mkdir($slozka, 0755, true);
        }
        if (! imagewebp($cil, $this->soubor($cesta), self::KVALITA_WEBP)) {
            return ['ok' => false, 'error' => __('ucet.logo_chyba_ulozeni')];
        }

        return ['ok' => true, 'path' => $cesta];
    }

    public function smazat(?string $cesta): bool
    {
        if (! $cesta) {
            return true;
        }
        // Jen soubory z naší složky
        if (! $this->jeNase($cesta)) {
            return false;
        }

        return ! is_file($this->soubor($cesta)) || @unlink($this->soubor($cesta));
    }

    /** Úplná cesta k uloženému logu, nebo null, když soubor není. */
    public function najdi(?string $cesta): ?string
    {
        return $cesta && $this->jeNase($cesta) && is_file($this->soubor($cesta)) ? $this->soubor($cesta) : null;
    }

    private function jeNase(string $cesta): bool
    {
        return preg_match('~^' . self::SLOZKA . '/\d+\.webp$~', $cesta) === 1;
    }

    private function soubor(string $cesta): string
    {
        return storage_path('app/' . $cesta);
    }
}
