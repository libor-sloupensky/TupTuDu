<?php

namespace App\Console\Commands;

use App\Models\Bug;
use Illuminate\Console\Command;

class BugyVyresitVse extends Command
{
    protected $signature = 'bugy:vyresit-vse {--limit=} {--ids= : jen tato ID (čárkou oddělená), jinak všechny aktivní}';
    protected $description = 'Označí aktivní bugy (opraveno=false) jako vyřešené — všechny, nebo jen --ids';

    public function handle(): int
    {
        $q = Bug::where('opraveno', false);
        if ($ids = $this->option('ids')) {
            $q->whereIn('id', array_map('intval', explode(',', $ids)));
        }
        $aktivni = $q->get();

        if ($aktivni->isEmpty()) {
            $this->info('Žádné aktivní bugy k vyřešení.');
            return 0;
        }

        $pocet = 0;
        foreach ($aktivni as $b) {
            $b->update([
                'opraveno' => true,
                'opraveno_v' => now(),
                'opravil_uzivatel_id' => null,
            ]);
            $this->line("  [✓] #{$b->id} [{$b->typ}] " . mb_substr($b->zprava, 0, 80));
            $pocet++;
        }

        $this->info("Označeno {$pocet} bugů jako vyřešené.");
        return 0;
    }
}
