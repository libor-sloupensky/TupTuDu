<?php

namespace App\Console\Commands;

use App\Support\Clanky;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Hlídá pravidla článků (modules/blog.md), která jde ověřit strojově: délku, žádné vnější odkazy,
 * zmínky aplikace, tykání, existenci obrázků a odkazovaných článků. Odbornou správnost nehlídá,
 * tu řeší revize. Chyba = článek takhle nemá vyjít, upozornění = podívat se na to.
 */
class KontrolaClanku extends Command
{
    private const SLOV_DOPORUCENO = 500;

    private const SLOV_NEJVIC = 650;

    protected $signature = 'clanky:kontrola';

    protected $description = 'Zkontroluje články v resources/clanky podle redakčních pravidel';

    public function handle(): int
    {
        $chyb = 0;
        foreach (array_keys(Clanky::SEGMENTY) as $jazyk) {
            foreach (File::glob(resource_path('clanky/' . $jazyk . '/*.md')) as $soubor) {
                $chyb += $this->zkontroluj($soubor, $jazyk);
            }
        }

        if ($chyb > 0) {
            $this->error("Chyb v článcích: {$chyb}");

            return self::FAILURE;
        }
        $this->info('Články odpovídají pravidlům.');

        return self::SUCCESS;
    }

    private function zkontroluj(string $soubor, string $jazyk): int
    {
        $adresa = basename($soubor, '.md');
        $clanek = Clanky::najdi($jazyk, $adresa);
        $this->line("<fg=cyan>{$jazyk}/{$adresa}</> ({$clanek['stav']})");

        $chyby = [];
        $upozorneni = [];
        $telo = $clanek['telo'];

        // Délka: text bez bloků a tabulek
        $text = preg_replace('/^(::.*|:::.*|\|.*)$/m', '', $telo);
        $slov = str_word_count(strip_tags($text), 0, 'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ0123456789');
        if ($slov > self::SLOV_NEJVIC) {
            $chyby[] = "dlouhý text: {$slov} slov, nejvíc " . self::SLOV_NEJVIC;
        } elseif ($slov > self::SLOV_DOPORUCENO) {
            $upozorneni[] = "text má {$slov} slov, doporučeno do " . self::SLOV_DOPORUCENO;
        }

        // Hlavička
        if (mb_strlen($clanek['titulek']) > 65) {
            $upozorneni[] = 'titulek přes 65 znaků, ve výsledcích hledání se zkrátí';
        }
        if (mb_strlen($clanek['popis']) > 160) {
            $upozorneni[] = 'popis přes 160 znaků, ve výsledcích hledání se zkrátí';
        }
        if ($clanek['zdroje'] === []) {
            $chyby[] = 'v hlavičce chybí zdroje, revize nemá z čeho vycházet';
        }
        if ($clanek['stav'] === 'zverejneno' && ! isset($clanek['revize'])) {
            $chyby[] = 'zveřejněný článek nemá v hlavičce datum revize';
        }

        // Vnější odkazy: cílem je udržet čtenáře na webu
        if (preg_match_all('/\]\(https?:[^)]+\)/', $telo, $vnejsi)) {
            $chyby[] = 'vnější odkazy v textu: ' . count($vnejsi[0]);
        }

        // Zmínky aplikace
        $zminek = preg_match_all('/\(aplikace:\)|^::vyzva|^::kalkulacka/m', $telo);
        if ($zminek < 2) {
            $upozorneni[] = "málo cest do aplikace: {$zminek}, doporučeny aspoň 2";
        }

        // Související články a odkazy na články
        preg_match_all('/\(clanek:([a-z0-9-]+)\)/', $telo, $odkazy);
        $cile = array_merge($odkazy[1], array_filter(array_map('trim', explode(',', $clanek['souvisejici'] ?? ''))));
        foreach (array_unique($cile) as $cil) {
            if (! File::exists(resource_path('clanky/' . $jazyk . '/' . $cil . '.md'))) {
                $upozorneni[] = "článek {$cil} zatím není, odkaz se ukáže, až vznikne";
            }
        }
        if ($odkazy[1] === []) {
            $upozorneni[] = 'v textu není odkaz na jiný článek';
        }

        // Obrázky
        preg_match_all('/^::obrazek\s+(\S+)\s*\|\s*([^|]*)\|/m', $telo, $obrazky, PREG_SET_ORDER);
        foreach ($obrazky as [, $cesta, $alt]) {
            if (! File::exists(public_path($cesta))) {
                $chyby[] = "chybí obrázek {$cesta}";
            }
            if (trim($alt) === '') {
                $chyby[] = "obrázek {$cesta} nemá popis pro nevidomé";
            }
        }
        if (isset($clanek['obrazek']) && ! File::exists(public_path($clanek['obrazek']))) {
            $chyby[] = "chybí obrázek pro sdílení {$clanek['obrazek']}";
        }

        // Pravidla textu
        $celek = $clanek['titulek'] . ' ' . $clanek['popis'] . ' ' . $clanek['perex'] . ' ' . $text;
        if (preg_match('/\bjedin(ý|á|é|ého|ou|ém|ému)\b/ui', $celek)) {
            $chyby[] = 'slovo „jediný“ se bez důkazu nepoužívá';
        }
        if ($jazyk === 'cs' && preg_match_all('/\b\p{L}+(ejte|ujte|ajte|ěte)\b|\b(vy|vám|vás|váš|vaše|vašeho|vaší)\b/ui', $celek, $vykani)) {
            $upozorneni[] = 'možné vykání: ' . implode(', ', array_unique($vykani[0]));
        }

        foreach ($upozorneni as $zprava) {
            $this->line("   <fg=yellow>upozornění</> {$zprava}");
        }
        foreach ($chyby as $zprava) {
            $this->line("   <fg=red>chyba</> {$zprava}");
        }
        if ($chyby === [] && $upozorneni === []) {
            $this->line("   v pořádku, {$slov} slov");
        } elseif ($chyby === []) {
            $this->line("   {$slov} slov");
        }

        return count($chyby);
    }
}
