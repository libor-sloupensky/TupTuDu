<?php

namespace App\Http\Middleware;

use App\Support\Domeny;
use App\Support\Lokalizace;
use App\Support\PolohaIp;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

/**
 * Určí jazyk a zemi requestu (config/lokalizace.php).
 *
 * Jazyk:  1. jazyk v adrese webu (tuptudu.com/de/pricing)
 *         2. zvolený (účet, jinak přepínač v session)
 *         3. jazyk země příchodu (národní doména, jinak poloha podle IP)
 *         4. výchozí (en)
 *         Chybějící text doplní záložní jazyk (en).
 * Země:   účet → národní doména → poloha podle IP → výchozí (CZ)
 *
 * Masterteam má dokud je nastavený `masterteam_jazyk` jazyk napevno a polohu
 * podle IP nezjišťuje (stránky masterteamu nemají odkaz na DB-IP, který licence žádá).
 */
class NastavLokalizaci
{
    public function handle(Request $request, Closure $next): Response
    {
        $uzivatel = $request->user();
        $domena = config('lokalizace.domeny.' . $this->hostBezWww($request), []);
        // Lokální UI testy běží na holém 127.0.0.1, adresa /masterteam tam taky znamená Masterteam
        $jeMasterteam = Domeny::jeMasterteam($request) || (Domeny::jeNeutralniLokalne($request) && $request->is('masterteam*'));
        $pevnyJazyk = $jeMasterteam ? config('lokalizace.masterteam_jazyk') : null;
        // Poloha podle IP až když je potřeba: přihlášený uživatel má zemi i jazyk v účtu a stránka pak
        // DB-IP nepoužije, takže nepotřebuje ani odkaz na ni (v editoru zabíral místo, Libor 13. 11. 2026)
        $ip = false;
        $zemePrichodu = function () use (&$ip, $domena, $pevnyJazyk, $request) {
            if ($ip === false) {
                $ip = $domena['zeme'] ?? ($pevnyJazyk ? null : $this->zemePodleIp($request));
            }

            return $ip;
        };

        // Jazyk v adrese webu: parametr routy, u článků první část adresy (routes/web.php). Controllery ho nepotřebují.
        $jazykAdresy = $request->route()?->parameter('jazyk');
        if ($jazykAdresy !== null) {
            $request->route()->forgetParameter('jazyk');
        } elseif (Lokalizace::jeJazyk($request->segment(1))) {
            $jazykAdresy = $request->segment(1);
        }

        $jeJazyk = fn ($kod) => Lokalizace::jeJazyk($kod);
        $jazyk = $pevnyJazyk ?? collect([
            $jazykAdresy,
            $uzivatel?->jazyk,
            $request->hasSession() ? $request->session()->get('jazyk') : null,
            $domena['jazyk'] ?? null,
        ])->first($jeJazyk)
            ?? collect((array) config('lokalizace.jazyk_zeme.' . $zemePrichodu(), []))->first($jeJazyk)
            ?? config('lokalizace.vychozi_jazyk');

        // Země z účtu má přednost, zemi příchodu (a s ní polohu podle IP) pak není třeba zjišťovat
        $zeme = $uzivatel?->zeme;
        if ($jazykAdresy !== null && Lokalizace::jeJazyk($jazykAdresy)) {
            if ($request->hasSession()) {
                $request->session()->put('jazyk', $jazykAdresy);
            }
            $domov = config('lokalizace.zeme_jazyka.' . $jazykAdresy);
            if (! $zeme && $domov && ! in_array($jazykAdresy, (array) config('lokalizace.jazyk_zeme.' . $zemePrichodu(), []), true)) {
                $zeme = $domov;
            }
        }

        App::setLocale($jazyk);
        URL::defaults(['jazyk' => $jazyk]);
        Lokalizace::nastavZemi($zeme ?? $zemePrichodu());

        return $next($request);
    }

    /** Země návštěvníka (ISO kód), null = neznámá. Hlavička Cloudflare má přednost před lokální databází. */
    private function zemePodleIp(Request $request): ?string
    {
        $cloudflare = strtoupper((string) $request->headers->get('CF-IPCountry'));
        if (preg_match('/^[A-Z]{2}$/', $cloudflare) && $cloudflare !== 'XX') {
            return $cloudflare;
        }

        // Stránka výsledek z DB-IP použila → licence žádá odkaz (partials/poloha-zdroj)
        $request->attributes->set('poloha_db_ip', true);

        return PolohaIp::zeme($request->ip());
    }

    private function hostBezWww(Request $request): string
    {
        $host = strtolower($request->getHost());

        return str_starts_with($host, 'www.') ? substr($host, 4) : $host;
    }
}
