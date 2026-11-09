<?php

namespace App\Console\Commands;

use App\Support\Clanky;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Hlídá pravidla článků (modules/blog.md), která jde ověřit strojově: délku, autora, klíčové slovo,
 * žádné vnější odkazy ani vlastní HTML, výzvu a cesty do aplikace, provázání s dalšími články oběma
 * směry, tón, tykání, existenci obrázků. Odbornou správnost nehlídá, tu řeší revize.
 * Chyba = článek takhle nemá vyjít, upozornění = podívat se na to.
 */
class KontrolaClanku extends Command
{
    private const SLOV_DOPORUCENO = 500;

    private const SLOV_NEJVIC = 650;

    /** Podpis všech článků (Libor 9. 11. 2026). */
    private const AUTOR = 'Libor z TupTuDu';

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
        if (($clanek['autor'] ?? null) !== self::AUTOR) {
            $chyby[] = 'autor v hlavičce má být „' . self::AUTOR . '“, je „' . ($clanek['autor'] ?? '') . '“';
        }
        if (mb_strlen($clanek['titulek']) > 65) {
            $chyby[] = 'titulek přes 65 znaků, ve výsledcích hledání se zkrátí';
        } elseif (mb_strlen($clanek['titulek']) > 60) {
            $upozorneni[] = 'titulek přes 60 znaků';
        }
        if (mb_strlen($clanek['popis']) > 160) {
            $upozorneni[] = 'popis přes 160 znaků, ve výsledcích hledání se zkrátí';
        } elseif (mb_strlen($clanek['popis']) < 120) {
            $upozorneni[] = 'popis pod 120 znaků';
        }
        if (! isset($clanek['revize'])) {
            $upozorneni[] = 'chybí datum odborné revize';
        }

        // Hlavní klíčové slovo (SEO pravidla): titulek, perex a aspoň jeden mezititulek
        if (! isset($clanek['klicove_slovo'])) {
            $chyby[] = 'v hlavičce chybí klicove_slovo';
        } else {
            $vzor = $this->vzorSlova($clanek['klicove_slovo']);
            preg_match_all('/^#{2,3}\s+(.+)$/m', $telo, $mezititulky);
            foreach (['titulek' => [$clanek['titulek']], 'perex' => [$clanek['perex']], 'mezititulek' => $mezititulky[1]] as $kde => $texty) {
                if (! array_filter($texty, fn ($s) => preg_match($vzor, $s))) {
                    $upozorneni[] = "klíčové slovo „{$clanek['klicove_slovo']}“ chybí v: {$kde}";
                }
            }
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
        // Grafika jen z hotových prvků šablony
        if (preg_match('/<\/?[a-z][a-z0-9]*[\s>]|style=/i', $telo)) {
            $chyby[] = 'vlastní HTML nebo styly v textu, použij Markdown a bloky';
        }

        // Výzva k akci a cesty do aplikace (pravidlo 3: aspoň jedna výzva, celkem 2 až 3 místa)
        if (! preg_match('/^::vyzva/m', $telo)) {
            $chyby[] = 'chybí výzva k akci (::vyzva)';
        }
        $zminek = preg_match_all('/\(aplikace:\)|^::vyzva|^::kalkulacka/m', $telo);
        if ($zminek < 2) {
            $chyby[] = "málo cest do aplikace: {$zminek}, mají být 2 až 3";
        } elseif ($zminek > 3) {
            $upozorneni[] = "cest do aplikace je {$zminek}, víc než 3 působí dotěrně";
        }

        // Tón (pravidlo 9) a text odkazů
        $prosty = preg_replace('/^(::.*|:::.*)$/m', '', $telo);
        if (preg_match('/!(?=\s|$)/u', $clanek['titulek'] . ' ' . $clanek['perex'] . ' ' . $prosty)) {
            $upozorneni[] = 'vykřičník, tón má být věcný';
        }
        if (preg_match('/[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]/u', $telo . $clanek['perex'])) {
            $chyby[] = 'emoji v textu';
        }
        if (preg_match_all('/v dnešní době|není nic jednoduššího|připravujeme|\[(zde|tady|klikni[^\]]*)\]/ui', $telo . ' ' . $clanek['perex'], $fraze)) {
            $chyby[] = 'zakázané fráze: ' . implode(', ', array_unique($fraze[0]));
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
        } elseif (count($odkazy[1]) > 5) {
            $upozorneni[] = 'odkazů na články je ' . count($odkazy[1]) . ', raději méně a přesně';
        }
        // Provázání oběma směry: na článek má odkazovat aspoň jeden jiný
        $odkazujici = array_filter(File::glob(resource_path('clanky/' . $jazyk . '/*.md')), fn ($jiny) => basename($jiny, '.md') !== $adresa
            && preg_match('/\(clanek:' . preg_quote($adresa, '/') . '\)|^souvisejici:.*\b' . preg_quote($adresa, '/') . '\b/m', File::get($jiny)));
        if ($odkazujici === []) {
            $upozorneni[] = 'na článek zatím neodkazuje žádný jiný článek, doplň odkaz do starších';
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

    /** Klíčové slovo jako regex: slova ve stejném pořadí, delší slova jen podle začátku kvůli pádům. */
    private function vzorSlova(string $slovo): string
    {
        $casti = array_map(fn ($s) => preg_quote(mb_strlen($s) > 5 ? mb_substr($s, 0, mb_strlen($s) - 2) : $s, '/'),
            preg_split('/\s+/u', mb_strtolower(trim($slovo))));

        return '/(?<!\p{L})' . implode('\p{L}*\s+(?:\p{L}+\s+){0,2}?', $casti) . '/iu';
    }
}
