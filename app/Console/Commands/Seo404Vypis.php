<?php

namespace App\Console\Commands;

use App\Models\Seo404;
use Illuminate\Console\Command;

class Seo404Vypis extends Command
{
    protected $signature = 'seo404:vypis {--limit=10}';
    protected $description = 'Vypíše top N 404 záznamů podle počtu výskytů';

    public function handle(): int
    {
        $celkem = Seo404::count();
        $this->info("Celkem unique 404: {$celkem}");

        $zaznamy = Seo404::orderByDesc('pocet_vyskytu')
            ->orderByDesc('naposledy_v')
            ->limit((int) $this->option('limit'))
            ->get();

        foreach ($zaznamy as $z) {
            $this->line("  [{$z->pocet_vyskytu}×] " . mb_substr($z->uri, 0, 120));
            if ($z->referer) $this->line("    ← " . mb_substr($z->referer, 0, 100));
            $this->line("    naposledy: " . $z->naposledy_v?->diffForHumans());
            $this->line('');
        }
        return 0;
    }
}
