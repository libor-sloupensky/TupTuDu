<?php

namespace App\Console\Commands;

use App\Models\KonceptV3Sdileni;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Smaže složky sdílených odkazů, které už nemají záznam v tabulce (smazaný účet maže řádky cizím
 * klíčem, bez modelu), a nedokončená nahrávání. Čerstvé složky nechává, mohou se právě ukládat.
 */
class SdileniUklid extends Command
{
    protected $signature = 'sdileni:uklid {--dry-run : Jen vypsat, nic nemazat}';

    protected $description = 'Smaže soubory sdílených odkazů bez záznamu v databázi';

    private const MIN_STARI_S = 3600;

    public function handle(): int
    {
        $koren = storage_path('app/sdileni');
        if (! is_dir($koren)) {
            $this->line('sdileni: nic k úklidu');

            return self::SUCCESS;
        }

        $suchy = (bool) $this->option('dry-run');
        $platne = KonceptV3Sdileni::pluck('token')->flip();
        $smazano = 0;
        foreach (File::directories($koren) as $slozka) {
            if ($platne->has(basename($slozka)) || time() - filemtime($slozka) < self::MIN_STARI_S) {
                continue;
            }
            if (! $suchy) {
                File::deleteDirectory($slozka);
            }
            $smazano++;
        }
        $this->line(($suchy ? '[dry-run] ' : '') . "sdileni: {$smazano} složek bez záznamu");

        return self::SUCCESS;
    }
}
