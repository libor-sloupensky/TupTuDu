<?php

namespace App\Console\Commands;

use App\Models\Seo404;
use Illuminate\Console\Command;

class Seo404Cleanup extends Command
{
    protected $signature = 'seo-404:cleanup {--dry-run : Jen vypsat, nemazat} {--limit= : ignorovano (deploy-hook posila vzdy)}';
    protected $description = 'Smaze ze seo_404 sumove zaznamy (security skeny, assety) podle Seo404::jeSum()';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $smazano = 0;
        $zustava = 0;

        Seo404::query()->chunkById(500, function ($chunk) use (&$smazano, &$zustava, $dryRun) {
            foreach ($chunk as $z) {
                if (Seo404::jeSum($z->uri)) {
                    if (!$dryRun) $z->delete();
                    $smazano++;
                } else {
                    $zustava++;
                }
            }
        });

        $this->info(($dryRun ? '[dry-run] ' : '') . "Smazano: {$smazano}, zustava: {$zustava}");
        return 0;
    }
}
