<?php

namespace App\Console\Commands;

use App\Support\Mereni;
use Illuminate\Console\Command;

/**
 * Cesta od registrace k placení a používání funkcí editoru za období (modules/marketing.md, Analýza webu).
 * Počítá z dat, která už máme: uživatelé, projekty, denní úpravy, předplatné a souhrnné počty funkcí.
 * Master tým se nepočítá. Jen čte.
 */
class MereniCesta extends Command
{
    protected $signature = 'mereni:cesta {--dni=30 : Registrace za posledních N dní}';

    protected $description = 'Kolik registrovaných došlo k projektu, ke stěnám, vrátilo se a zaplatilo; použití funkcí editoru';

    public function handle(): int
    {
        $dni = max(1, (int) $this->option('dni'));
        $od = now()->subDays($dni)->startOfDay();

        $kroky = Mereni::cesta($od);
        $zaklad = max(1, $kroky[0][1]);
        $this->line("Cesta k projektu, registrace za posledních {$dni} dní (bez master týmu):");
        $this->table(['Krok', 'Uživatelů', 'Z registrací'], array_map(
            fn ($k) => [$k[0], $k[1], round($k[1] / $zaklad * 100) . ' %'],
            $kroky,
        ));

        $funkce = Mereni::pouzitiFunkci($od);
        $this->line('Funkce editoru (prohlížeč nejvýš jednou za den):');
        $this->table(['Funkce', 'Použití'], array_map(fn ($f) => [$f, $funkce[$f]], Mereni::FUNKCE));
        $this->line('Denní úpravy se drží ' . config('uchovavani.denni_upravy_mesicu') . ' měsíce, starší návraty se nezapočtou.');

        return self::SUCCESS;
    }
}
