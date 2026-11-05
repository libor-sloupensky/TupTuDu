<?php

namespace App\Support;

use Illuminate\Support\Facades\File;
use League\CommonMark\GithubFlavoredMarkdownConverter;
use RuntimeException;

/**
 * Články webu: Markdown v resources/clanky/{jazyk}/{adresa}.md s hlavičkou údajů a pevnou sadou
 * bloků (resources/views/clanky/bloky). Postup a pravidla: modules/blog.md.
 *
 * Hlavička mezi řádky `---`: `klíč: hodnota`, položky zdrojů `- Název | adresa`.
 * Bloky v textu: `::nazev parametr | parametr` na jednom řádku, `:::druh Titulek` … `:::` s Markdownem.
 *
 * Článek se `stav: koncept` je vidět jen lokálně, nasazení ho proto samo nezveřejní.
 */
final class Clanky
{
    /** Část adresy podle jazyka. Nový jazyk = řádek sem a složka s texty. */
    public const SEGMENTY = ['cs' => 'clanky', 'en' => 'articles'];

    /** Články v jazyce, nejnovější první. */
    public static function vsechny(string $jazyk): array
    {
        $clanky = [];
        foreach (File::glob(resource_path('clanky/' . $jazyk . '/*.md')) as $soubor) {
            $clanek = self::nacti($soubor, $jazyk);
            if (self::jeVidet($clanek)) {
                $clanky[] = $clanek;
            }
        }
        usort($clanky, fn ($a, $b) => strcmp($b['publikovano'], $a['publikovano']));

        return $clanky;
    }

    public static function najdi(string $jazyk, string $adresa): ?array
    {
        $soubor = resource_path('clanky/' . $jazyk . '/' . $adresa . '.md');
        if (! File::exists($soubor)) {
            return null;
        }
        $clanek = self::nacti($soubor, $jazyk);

        return self::jeVidet($clanek) ? $clanek : null;
    }

    /** Adresa přehledu článků v jazyce. */
    public static function adresaPrehledu(string $jazyk): string
    {
        return Domeny::url(Domeny::WEB, '/' . self::SEGMENTY[$jazyk], $jazyk);
    }

    public static function adresa(array $clanek): string
    {
        return self::adresaPrehledu($clanek['jazyk']) . '/' . $clanek['adresa'];
    }

    /** Text článku jako HTML, bloky vykreslené ze šablon. */
    public static function html(array $clanek): string
    {
        $bloky = [];
        $uloz = function (string $html) use (&$bloky) {
            $znacka = 'TTBLOK' . count($bloky) . 'TT';
            $bloky[$znacka] = $html;

            return "\n\n" . $znacka . "\n\n";
        };

        $md = preg_replace_callback('/^:::(\w+)[ \t]*(.*?)\n(.*?)\n:::[ \t]*$/ms', fn ($m) => $uloz(
            self::blok('upozorneni', ['druh' => $m[1], 'titulek' => trim($m[2]), 'html' => self::vlna(self::markdown($m[3]), $clanek['jazyk'])])
        ), $clanek['telo']);

        $md = preg_replace_callback('/^::([a-z-]+)[ \t]*(.*)$/m', fn ($m) => $uloz(
            self::blok($m[1], ['clanek' => $clanek, 'parametry' => array_map('trim', explode('|', $m[2]))])
        ), $md);

        return str_replace(
            array_map(fn ($znacka) => '<p>' . $znacka . '</p>', array_keys($bloky)),
            array_values($bloky),
            self::vlna(self::markdown($md), $clanek['jazyk'])
        );
    }

    /** Česká typografie v HTML: za jednopísmennou předložkou a mezi číslem a jednotkou nezlomitelná mezera. */
    public static function vlna(string $html, string $jazyk): string
    {
        if ($jazyk !== 'cs') {
            return $html;
        }
        $casti = preg_split('/(<[^>]+>)/u', $html, -1, PREG_SPLIT_DELIM_CAPTURE);
        foreach ($casti as $i => $cast) {
            if ($i % 2 === 0) {
                $cast = preg_replace('/(?<=^|[\s(„])([KkSsVvZzOoUuAaIi]) /u', "$1\u{00A0}", $cast);
                $casti[$i] = preg_replace('/(\d) (m³|m²|m|cm|mm|t|%|Kč)(?![\p{L}\d])/u', "$1\u{00A0}$2", $cast);
            }
        }

        return implode('', $casti);
    }

    private static function blok(string $nazev, array $data): string
    {
        return view('clanky.bloky.' . $nazev, $data)->render();
    }

    private static function markdown(string $md): string
    {
        $prevod = new GithubFlavoredMarkdownConverter(['html_input' => 'strip', 'allow_unsafe_links' => false]);
        $html = $prevod->convert($md)->getContent();
        $html = str_replace(['<table>', '</table>'], ['<div class="tt-tabulka"><table>', '</table></div>'], $html);

        return preg_replace('/<a href="(https?:[^"]+)"/', '<a href="$1" rel="noopener"', $html);
    }

    private static function jeVidet(array $clanek): bool
    {
        return app()->environment('local')
            || ($clanek['stav'] === 'zverejneno' && $clanek['publikovano'] <= now()->toDateString());
    }

    private static function nacti(string $soubor, string $jazyk): array
    {
        $obsah = str_replace("\r\n", "\n", File::get($soubor));
        if (! preg_match('/\A---\n(.*?)\n---\n(.*)\z/s', $obsah, $casti)) {
            throw new RuntimeException('Článek bez hlavičky: ' . $soubor);
        }

        $clanek = ['jazyk' => $jazyk, 'adresa' => basename($soubor, '.md'), 'telo' => $casti[2], 'zdroje' => []];
        foreach (explode("\n", $casti[1]) as $radek) {
            if (str_starts_with($radek, '- ')) {
                [$nazev, $adresa] = array_map('trim', explode('|', substr($radek, 2), 2));
                $clanek['zdroje'][] = ['nazev' => $nazev, 'adresa' => $adresa];
            } elseif (preg_match('/^(\w+):[ \t]*(.+)$/u', $radek, $udaj)) {
                $clanek[$udaj[1]] = $udaj[2];
            }
        }

        foreach (['titulek', 'popis', 'perex', 'publikovano', 'overeno', 'stav'] as $povinne) {
            if (! isset($clanek[$povinne])) {
                throw new RuntimeException('Článek ' . $soubor . ' nemá v hlavičce ' . $povinne);
            }
        }

        return $clanek;
    }
}
