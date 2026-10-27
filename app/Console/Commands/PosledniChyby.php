<?php

namespace App\Console\Commands;

use App\Models\Bug;
use Illuminate\Console\Command;

/**
 * Vypíše poslední zaznamenané chyby do konzole.
 *
 * Přehled na /masterteam/bugy je za přihlášením, takže při ladění produkce
 * (kde APP_DEBUG=false a stránka ukáže jen „Server Error") je tohle nejrychlejší
 * cesta ke stack trace — přes /cron/chyby/{token}.
 */
class PosledniChyby extends Command
{
    protected $signature = 'chyby:posledni
                            {--pocet=5 : Kolik chyb vypsat}
                            {--stack : Vypsat i stack trace}';

    protected $description = 'Vypíše poslední zaznamenané chyby';

    public function handle(): int
    {
        $chyby = Bug::where('opraveno', false)
            ->orderByDesc('naposledy_v')
            ->limit((int) $this->option('pocet'))
            ->get();

        if ($chyby->isEmpty()) {
            $this->info('Žádné aktivní chyby.');

            return self::SUCCESS;
        }

        foreach ($chyby as $c) {
            $this->newLine();
            $this->line(str_repeat('─', 70));
            $this->line("[{$c->typ}/{$c->uroven}] {$c->zprava}");
            $this->line("  soubor:    {$c->soubor}");
            $this->line("  uri:       {$c->metoda} {$c->uri}");
            $this->line("  výskytů:   {$c->pocet_vyskytu}, naposledy {$c->naposledy_v}");
            if (filled($c->kontext)) {
                $kontext = is_string($c->kontext) ? $c->kontext : json_encode($c->kontext, JSON_UNESCAPED_UNICODE);
                $this->line('  kontext:   ' . mb_substr($kontext, 0, 1000));
            }

            if ($this->option('stack') && $c->stack_trace) {
                $this->line('  stack:');
                foreach (array_slice(explode("\n", $c->stack_trace), 0, 12) as $radek) {
                    $this->line('    ' . $radek);
                }
            }
        }

        return self::SUCCESS;
    }
}
