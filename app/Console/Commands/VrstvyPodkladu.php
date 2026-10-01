<?php

namespace App\Console\Commands;

use App\Services\Koncept\PdfPodkladService;
use App\Services\Koncept\PdfVrstvyService;
use Illuminate\Console\Command;

/**
 * Vypíše hladiny výkresu (a jejich geometrii) jako JSON na výstup.
 *
 * Měřicí smyčka v Node si tím bere stejná data, jaká dostane prohlížeč —
 * jinak by se ladilo nad něčím jiným, než co uvidí uživatel.
 */
class VrstvyPodkladu extends Command
{
    protected $signature = 'koncept-v3:vrstvy {otisk} {--strana=1} {--uzivatel=1} {--prehled}';

    protected $description = 'Hladiny PDF podkladu pro rozpoznávání stěn (JSON na výstup)';

    public function handle(PdfVrstvyService $vrstvy): int
    {
        $cesta = storage_path('app/private/' . PdfPodkladService::SLOZKA
            . '/' . $this->option('uzivatel') . '/' . $this->argument('otisk') . '.pdf');

        if (!is_file($cesta)) {
            $this->error("PDF nenalezeno: $cesta");

            return self::FAILURE;
        }

        $strana = max(1, (int) $this->option('strana'));

        if ($this->option('prehled')) {
            $v = $vrstvy->hladiny($cesta, $strana);
            foreach ($v['hladiny'] as $h) {
                $this->line(sprintf('%-8s %6d  %s', $h['role'], count($h['usecky']), $h['nazev']));
            }

            return self::SUCCESS;
        }

        $this->output->write(json_encode($vrstvy->proRozpoznani($cesta, $strana)));

        return self::SUCCESS;
    }
}
