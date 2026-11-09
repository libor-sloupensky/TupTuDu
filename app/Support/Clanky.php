<?php

namespace App\Support;

use Illuminate\Support\Facades\File;
use League\CommonMark\GithubFlavoredMarkdownConverter;
use RuntimeException;

/**
 * Články webu: Markdown v resources/clanky/{jazyk}/{adresa}.md s hlavičkou údajů a pevnou sadou
 * bloků (resources/views/clanky/bloky). Postup a pravidla: modules/blog.md.
 *
 * Hlavička mezi řádky `---`: `klíč: hodnota`, položky zdrojů `- Název | adresa`. Zdroje slouží jen nám
 * a revizi, na stránce se neukazují. Bloky v textu: `::nazev parametr | parametr` na jednom řádku,
 * `:::druh Titulek` … `:::` s Markdownem. Odkazy v textu: `[text](clanek:adresa)` na jiný článek
 * (dokud není vidět, zůstane jen text) a `[text](aplikace:)` do aplikace.
 *
 * Článek se `stav: koncept` je vidět jen lokálně, nasazení ho proto samo nezveřejní.
 *
 * Jazykové verze: originál je česky, verze v jiném jazyce má v hlavičce `klic: adresa-ceskeho-clanku`
 * a `zeme: DE, AT` (pro které země je psaná; angličtina zemi nemá). Podle klíče se verze propojí
 * v přepínači jazyka, v hreflang a v sitemapě. Vlastní adresu má každá verze ve svém jazyce.
 */
final class Clanky
{
    /** Část adresy podle jazyka. Nový jazyk = řádek sem a překlad lang/{jazyk}/clanky.php. */
    public const SEGMENTY = [
        'cs' => 'clanky', 'en' => 'articles', 'sk' => 'clanky', 'pl' => 'artykuly',
        'de' => 'artikel', 'fr' => 'articles', 'es' => 'articulos', 'it' => 'articoli',
    ];

    /** Jazyk originálů. Verze v ostatních jazycích se k nim vážou klíčem. */
    public const ZDROJOVY_JAZYK = 'cs';

    /** Články v jazyce, nejnovější první. */
    public static function vsechny(string $jazyk): array
    {
        static $nactene = [];
        if (isset($nactene[$jazyk])) {
            return $nactene[$jazyk];
        }
        $clanky = [];
        foreach (File::glob(resource_path('clanky/' . $jazyk . '/*.md')) as $soubor) {
            $clanek = self::nacti($soubor, $jazyk);
            if (self::jeVidet($clanek)) {
                $clanky[] = $clanek;
            }
        }
        usort($clanky, fn ($a, $b) => strcmp($b['publikovano'], $a['publikovano']));

        return $nactene[$jazyk] = $clanky;
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

    /** Společný klíč jazykových verzí: adresa českého originálu. */
    public static function klic(array $clanek): string
    {
        return $clanek['klic'] ?? $clanek['adresa'];
    }

    /** Země, pro které je verze psaná (`zeme: DE, AT`), originál bez údaje je pro Česko. */
    public static function zeme(array $clanek): array
    {
        if (isset($clanek['zeme'])) {
            return array_values(array_filter(array_map(fn ($kod) => strtoupper(trim($kod)), explode(',', $clanek['zeme']))));
        }

        return $clanek['jazyk'] === self::ZDROJOVY_JAZYK ? ['CZ'] : [];
    }

    /** Viditelné jazykové verze článku: kód jazyka => adresa (včetně článku samotného). */
    public static function verze(array $clanek): array
    {
        $klic = self::klic($clanek);
        $verze = [];
        foreach (array_keys(self::SEGMENTY) as $jazyk) {
            if ($jazyk === $clanek['jazyk']) {
                $verze[$jazyk] = self::adresa($clanek);
                continue;
            }
            foreach (self::vsechny($jazyk) as $jiny) {
                if (self::klic($jiny) === $klic) {
                    $verze[$jazyk] = self::adresa($jiny);
                    break;
                }
            }
        }

        return $verze;
    }

    /** Přehledy článků v jazycích, které nějaký článek mají: kód jazyka => adresa. */
    public static function verzePrehledu(): array
    {
        $verze = [];
        foreach (array_keys(self::SEGMENTY) as $jazyk) {
            if (self::vsechny($jazyk) !== []) {
                $verze[$jazyk] = self::adresaPrehledu($jazyk);
            }
        }

        return $verze;
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

    /** Registrace s článkem jako zdrojem (FortifyServiceProvider). */
    public static function adresaRegistrace(array $clanek): string
    {
        return Domeny::url(Domeny::APP, '/register?zdroj=' . $clanek['adresa']);
    }

    /** Související články z hlavičky (`souvisejici: adresa, adresa`), jen ty, které jsou vidět. */
    public static function souvisejici(array $clanek): array
    {
        $adresy = array_filter(array_map('trim', explode(',', $clanek['souvisejici'] ?? '')));

        return array_values(array_filter(array_map(fn ($adresa) => self::najdi($clanek['jazyk'], $adresa), $adresy)));
    }

    /** Obrázek v jazyce článku, když existuje (…/slozka/{jazyk}/soubor), jinak společný pro všechny jazyky. */
    public static function obrazekVJazyce(string $cesta, string $jazyk): string
    {
        $varianta = dirname($cesta) . '/' . $jazyk . '/' . basename($cesta);

        return File::exists(public_path($varianta)) ? $varianta : $cesta;
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
            self::blok('upozorneni', ['druh' => $m[1], 'titulek' => trim($m[2]), 'html' => self::text($m[3], $clanek)])
        ), $clanek['telo']);

        $md = preg_replace_callback('/^::([a-z-]+)[ \t]*(.*)$/m', fn ($m) => $uloz(
            self::blok($m[1], ['clanek' => $clanek, 'parametry' => array_map('trim', explode('|', $m[2]))])
        ), $md);

        return str_replace(
            array_map(fn ($znacka) => '<p>' . $znacka . '</p>', array_keys($bloky)),
            array_values($bloky),
            self::text($md, $clanek)
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

    /** Markdown na HTML s odkazy na články a do aplikace a s českou typografií. */
    private static function text(string $md, array $clanek): string
    {
        $prevod = new GithubFlavoredMarkdownConverter(['html_input' => 'strip', 'allow_unsafe_links' => false]);
        $html = $prevod->convert($md)->getContent();
        $html = str_replace(['<table>', '</table>'], ['<div class="tt-tabulka"><table>', '</table></div>'], $html);

        $html = preg_replace_callback('/<a href="clanek:([a-z0-9-]+)">(.*?)<\/a>/us', function ($m) use ($clanek) {
            $cil = self::najdi($clanek['jazyk'], $m[1]);

            return $cil ? '<a href="' . e(self::adresa($cil)) . '">' . $m[2] . '</a>' : $m[2];
        }, $html);
        $html = str_replace('<a href="aplikace:">', '<a href="' . e(self::adresaRegistrace($clanek)) . '" data-vyzva-klik data-dotyk-poslat>', $html);

        return self::vlna($html, $clanek['jazyk']);
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
