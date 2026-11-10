<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Smaže testovací koncepty, které po sobě nechaly testy v services/import-test (název „ClaudeTest …“).
 * Spouští ho sám `prohlizec.cjs` při startu každého testu. Jen lokálně a jen koncepty starší než 2 hodiny,
 * aby nesmazal koncept testu, který právě běží v jiném sezení. Podle jiného vzoru v názvu nikdy nemaže
 * (Test…, NEMAZAT, reference si zakládá Libor a druhé sezení).
 */
class KonceptyUklidTestu extends Command
{
    protected $signature = 'koncepty:uklid-testu {--dry-run : Jen vypsat, nic nemazat}';

    protected $description = 'Smaže lokální testovací koncepty ClaudeTest starší než 2 hodiny';

    private const MIN_STARI_HODIN = 2;

    public function handle(): int
    {
        if (! app()->environment('local')) {
            $this->error('Úklid testovacích konceptů běží jen lokálně.');

            return self::FAILURE;
        }

        $dotaz = DB::table('koncepty_v3')
            ->where('nazev', 'like', 'ClaudeTest %')
            ->where('upraveno', '<', now()->subHours(self::MIN_STARI_HODIN));
        $pocet = $this->option('dry-run') ? $dotaz->count() : $dotaz->delete();
        $this->line(($this->option('dry-run') ? 'K smazání' : 'Smazáno') . " testovacích konceptů: {$pocet}");

        return self::SUCCESS;
    }
}
