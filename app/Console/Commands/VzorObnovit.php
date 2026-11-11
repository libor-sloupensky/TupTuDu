<?php

namespace App\Console\Commands;

use App\Models\KonceptV3;
use App\Support\VzorovyProjekt;
use Illuminate\Console\Command;

/**
 * Kopie vzorového projektu vrátí do stavu šablony, když u uživatele místně minula 3:00 a od té doby
 * se ještě neobnovila (App\Support\VzorovyProjekt, modules/aplikace.md). Spouští ho plánovač každých 15 minut.
 * Bere jen kopie, ve kterých uživatel od poslední obnovy něco změnil, nepoužité kopie se vůbec nenačítají.
 */
class VzorObnovit extends Command
{
    protected $signature = 'vzor:obnovit {--dry-run : Jen vypsat, nic neměnit}';

    protected $description = 'Vrátí kopie vzorového projektu do výchozího stavu ve 3:00 místního času uživatele';

    public function handle(): int
    {
        if (! VzorovyProjekt::sablona()) {
            $this->line('vzor: šablona není, nic k obnově');

            return self::SUCCESS;
        }

        $suchy = (bool) $this->option('dry-run');
        $obnoveno = 0;
        KonceptV3::where('vzor', 'kopie')->whereColumn('upraveno', '>', 'vzor_obnoveno_v')
            ->with('uzivatel')->chunkById(100, function ($kopie) use ($suchy, &$obnoveno) {
            foreach ($kopie as $k) {
                if (! VzorovyProjekt::jeKObnove($k)) {
                    continue;
                }
                if (! $suchy) {
                    VzorovyProjekt::obnov($k);
                }
                $obnoveno++;
            }
        });
        $this->line(($suchy ? 'vzor: k obnově ' : 'vzor: obnoveno ') . $obnoveno);

        return self::SUCCESS;
    }
}
