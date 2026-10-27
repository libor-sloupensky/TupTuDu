<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Ad-hoc detail zaznamu z tabulky bugy — pro diagnostiku aktivnich bugu.
 */
class BugDetail extends Command
{
    protected $signature = 'bug:detail {--id= : ID bugu} {--limit= : ignorovano}';
    protected $description = 'Zobrazi kompletni detail bugu vcetne stacktrace/kontextu';

    public function handle(): int
    {
        $id = (int) $this->option('id');
        if ($id <= 0) {
            $this->error('Zadej --id=N');
            return 1;
        }

        $b = DB::table('bugy')->find($id);
        if (!$b) {
            $this->error("Bug #{$id} neexistuje");
            return 1;
        }

        foreach ((array) $b as $klic => $hodnota) {
            $this->line("=== {$klic} ===");
            $this->line(is_string($hodnota) ? $hodnota : json_encode($hodnota, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $this->newLine();
        }
        return 0;
    }
}
