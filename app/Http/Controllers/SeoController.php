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
 *   app        neindexovat (titulka na app.tuptudu.com je kopie webu kvůli Paddle)
 *   masterteam neindexovat
 *
 * V sitemapě jsou jen kanonické adresy: titulka a ceník v každém jazyce, články v jejich
 * jazyce (modules/blog.md) a ruční seznam ostatních stránek (`STRANKY_WEBU`). Nová veřejná
 * stránka na tuptudu.com = přidat sem. Dokumentace: modules/marketing.md.
 */
class SeoController extends Controller
{
    /** Stránky s jazykem v adrese: cesta => priorita. */
    private const STRANKY_S_JAZYKEM = [
        '/' => '1.0',
        '/pricing' => '0.8',
    ];

    /** Ostatní veřejné stránky tuptudu.com: cesta => priorita. */
    private const STRANKY_WEBU = [
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

        $polozky = [];
        foreach (Lokalizace::jazyky() as $jazyk) {
            foreach (self::STRANKY_S_JAZYKEM as $cesta => $priorita) {
                $polozky[] = [Lokalizace::adresaWebu($cesta, $jazyk), $priorita, null];
            }
            $clanky = Clanky::vsechny($jazyk);
            if ($clanky !== []) {
                $polozky[] = [Clanky::adresaPrehledu($jazyk), '0.7', $clanky[0]['publikovano']];
            }
            foreach ($clanky as $clanek) {
                $polozky[] = [Clanky::adresa($clanek), '0.7', $clanek['overeno']];
            }
        }
        foreach (self::STRANKY_WEBU as $cesta => $priorita) {
            $polozky[] = [Domeny::url('web', $cesta), $priorita, null];
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($polozky as [$adresa, $priorita, $zmena]) {
            $xml .= '  <url><loc>' . e($adresa) . '</loc>'
                . ($zmena ? '<lastmod>' . e($zmena) . '</lastmod>' : '')
                . '<priority>' . $priorita . "</priority></url>\n";
        }
        $xml .= "</urlset>\n";

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
