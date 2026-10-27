<?php

namespace App\Console\Commands;

use App\Models\Bug;
use Illuminate\Console\Command;

class BugyVypis extends Command
{
    protected $signature = 'bugy:vypis {--limit=20}';
    protected $description = 'Vypíše aktuální bugy (pro deploy-hook diagnostiku)';

    public function handle(): int
    {
        $bugy = Bug::orderByDesc('naposledy_v')->limit((int) $this->option('limit'))->get();
        if ($bugy->isEmpty()) {
            $this->info('Žádné bugy.');
            return 0;
        }
        foreach ($bugy as $b) {
            $stav = $b->opraveno ? '[OK]' : '[!!]';
            $this->line("{$stav} #{$b->id} [{$b->typ}] {$b->pocet_vyskytu}× naposledy {$b->naposledy_v?->diffForHumans()}");
            $this->line("    " . mb_substr($b->zprava, 0, 200));
            if ($b->soubor) $this->line("    soubor: {$b->soubor}");
            if ($b->uri) $this->line("    URL: " . mb_substr($b->uri, 0, 120));
            $this->line('');
        }
        return 0;
    }
}
