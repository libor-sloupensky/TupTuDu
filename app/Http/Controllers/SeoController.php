<?php

namespace App\Http\Controllers;

use App\Support\Clanky;
use App\Support\Domeny;
use App\Support\Lokalizace;
use Illuminate\Http\Response;

/**
 * robots.txt a sitemap.xml — generované, protože všechny tři části (web, app,
 * masterteam) sdílejí jeden `public/` a každá potřebuje jiný obsah:
 *
 *   web        indexovat, sitemapa veřejných stránek
 *   app        neindexovat (titulka na app.tuptudu.com je kopie webu kvůli Paddle, roboti na ni smí)
 *   masterteam neindexovat
 *
 * V sitemapě jsou kanonické adresy: stránky ze `STRANKY_WEBU` v každém jazyce s hreflang a články
 * v jejich jazyce (modules/blog.md). Nová veřejná stránka na tuptudu.com = přidat sem.
 * Dokumentace: modules/marketing.md, modules/lokalizace.md.
 */
class SeoController extends Controller
{
    /** Veřejné stránky tuptudu.com, každá v každém jazyce: cesta => priorita. */
    private const STRANKY_WEBU = [
        '/' => '1.0',
        '/pricing' => '0.8',
        '/contact' => '0.5',
        '/terms' => '0.3',
        '/privacy' => '0.3',
        '/refunds' => '0.3',
    ];

    public function robots(): Response
    {
        if (Domeny::jeWeb()) {
            $radky = [
                'User-agent: *',
                'Disallow: /cron/',
                'Disallow: /jazyk/',
                'Disallow: /api/',
                '',
                'Sitemap: ' . Domeny::url('web', '/sitemap.xml'),
            ];
        } elseif (Domeny::jeApp()) {
            // Titulku app.tuptudu.com musí vidět kontrola domény v Paddlu (pokladna), úplný zákaz
            // robotů bere jako „ochranu proti botům" a doménu neschválí. Do vyhledávačů se
            // titulka stejně nedostane: má <meta name="robots" content="noindex">.
            $radky = ['User-agent: *', 'Allow: /$', 'Disallow: /'];
        } else {
            $radky = ['User-agent: *', 'Disallow: /'];
        }

        return response(implode("\n", $radky) . "\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemap(): Response
    {
        if (! Domeny::jeWeb()) {
            abort(404);
        }

        // Položka: adresa, priorita, poslední změna, jazykové verze
        $polozky = [];
        foreach (self::STRANKY_WEBU as $cesta => $priorita) {
            $verze = Lokalizace::verzeStranky($cesta);
            foreach ($verze as $adresa) {
                $polozky[] = [$adresa, $priorita, null, $verze];
            }
        }
        foreach (Lokalizace::jazyky() as $jazyk) {
            $clanky = Clanky::vsechny($jazyk);
            if ($clanky !== []) {
                $polozky[] = [Clanky::adresaPrehledu($jazyk), '0.7', $clanky[0]['publikovano'], []];
            }
            foreach ($clanky as $clanek) {
                $polozky[] = [Clanky::adresa($clanek), '0.7', $clanek['overeno'], []];
            }
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
        foreach ($polozky as [$adresa, $priorita, $zmena, $verze]) {
            $xml .= '  <url>' . "\n" . '    <loc>' . e($adresa) . '</loc>' . "\n";
            foreach ($verze as $kod => $alternativa) {
                $xml .= '    <xhtml:link rel="alternate" hreflang="' . $kod . '" href="' . e($alternativa) . '"/>' . "\n";
            }
            if ($verze !== []) {
                $xml .= '    <xhtml:link rel="alternate" hreflang="x-default" href="' . e($verze[config('lokalizace.vychozi_jazyk')]) . '"/>' . "\n";
            }
            $xml .= ($zmena ? '    <lastmod>' . e($zmena) . '</lastmod>' . "\n" : '')
                . '    <priority>' . $priorita . '</priority>' . "\n" . '  </url>' . "\n";
        }
        $xml .= "</urlset>\n";

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
