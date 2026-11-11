<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Smaže testovací koncepty, které po sobě nechaly testy v services/import-test (název „ClaudeTest …“).
 * Spouští ho sám `prohlizec.cjs`:
 *  - při zavření prohlížeče s `--id=` konceptu, ve kterém test skončil → smaže se hned,
 *  - při startu každého testu bez `--id` → zbytky po spadlých testech, neupravované aspoň 30 minut
 *    (test běží pár minut, koncept testu, který právě běží v jiném sezení, tak zůstane).
 * Jen lokálně. Podle jiného vzoru v názvu nikdy nemaže (Test…, NEMAZAT, reference si zakládá Libor
 * a druhé sezení), kopie a šablonu vzorového projektu taky ne.
 */
class KonceptyUklidTestu extends Command
{
    protected $signature = 'koncepty:uklid-testu
        {--id=* : Smazat hned tyto koncepty (jen pokud jsou ClaudeTest)}
        {--dry-run : Jen vypsat, nic nemazat}';

    protected $description = 'Smaže lokální testovací koncepty ClaudeTest (zadaná id hned, ostatní po 30 minutách)';

    private const MIN_STARI_MINUT = 30;

    public function handle(): int
    {
        if (! app()->environment('local')) {
            $this->error('Úklid testovacích konceptů běží jen lokálně.');

            return self::FAILURE;
        }

        $id = array_filter(array_map('intval', $this->option('id')));
        $dotaz = DB::table('koncepty_v3')
            ->where('nazev', 'like', 'ClaudeTest %')
            ->whereNull('vzor');
        $id
            ? $dotaz->whereIn('id', $id)
            : $dotaz->where('upraveno', '<', now()->subMinutes(self::MIN_STARI_MINUT));
        $pocet = $this->option('dry-run') ? $dotaz->count() : $dotaz->delete();
        $this->line(($this->option('dry-run') ? 'K smazání' : 'Smazáno') . " testovacích konceptů: {$pocet}");

        return self::SUCCESS;
    }
}
