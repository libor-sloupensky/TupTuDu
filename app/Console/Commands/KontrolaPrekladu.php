<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File;

/**
 * Hlídá úplnost překladů: každý klíč z lang/cs (zdrojový jazyk) musí mít
 * i každý další aktivní jazyk z config/lokalizace.php. Počítají se i výchozí
 * překlady Laravelu (auth, validation…), takže je není nutné kopírovat.
 */
class KontrolaPrekladu extends Command
{
    protected $signature = 'preklady:kontrola';

    protected $description = 'Najde texty, které v některém jazyce chybí';

    public function handle(): int
    {
        $zdroj = config('lokalizace.zdrojovy_jazyk');
        $loader = app('translator')->getLoader();
        $chybi = 0;

        foreach (File::files(lang_path($zdroj)) as $soubor) {
            $skupina = $soubor->getFilenameWithoutExtension();
            $klice = array_keys(Arr::dot($loader->load($zdroj, $skupina)));

            foreach (array_keys(config('lokalizace.jazyky')) as $jazyk) {
                if ($jazyk === $zdroj) {
                    continue;
                }

                $preklad = Arr::dot($loader->load($jazyk, $skupina));
                foreach (array_diff($klice, array_keys($preklad)) as $klic) {
                    $this->line("<fg=red>{$jazyk}</> {$skupina}.{$klic}");
                    $chybi++;
                }
            }
        }

        if ($chybi > 0) {
            $this->error("Chybí {$chybi} překladů.");

            return self::FAILURE;
        }

        $this->info('Překlady jsou úplné.');

        return self::SUCCESS;
    }
}
