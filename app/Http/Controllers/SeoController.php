<?php

namespace App\Http\Controllers;

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
 * Seznam stránek v sitemapě je ruční (`STRANKY_WEBU`) — nová veřejná stránka na
 * tuptudu.com = přidat sem. Každá stránka má adresu v každém jazyce, hreflang je
 * v sitemapě i v hlavě stránky. Dokumentace: modules/marketing.md, modules/lokalizace.md.
 */
class SeoController extends Controller
{
    /** Veřejné stránky tuptudu.com: cesta => priorita. */
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

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
        $jazyky = Lokalizace::jazyky();
        foreach (self::STRANKY_WEBU as $cesta => $priorita) {
            $alternativy = '';
            foreach ($jazyky as $jazyk) {
                $alternativy .= '    <xhtml:link rel="alternate" hreflang="' . $jazyk . '" href="' . e(Domeny::url('web', $cesta, $jazyk)) . '"/>' . "\n";
            }
            $alternativy .= '    <xhtml:link rel="alternate" hreflang="x-default" href="' . e(rtrim(Domeny::zaklad('web'), '/') . $cesta) . '"/>' . "\n";

            foreach ($jazyky as $jazyk) {
                $xml .= '  <url>' . "\n" . '    <loc>' . e(Domeny::url('web', $cesta, $jazyk)) . '</loc>' . "\n"
                    . $alternativy . '    <priority>' . $priorita . '</priority>' . "\n" . '  </url>' . "\n";
            }
        }
        $xml .= "</urlset>\n";

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
