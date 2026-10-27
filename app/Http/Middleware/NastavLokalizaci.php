<?php

namespace App\Http\Middleware;

use App\Support\Domeny;
use App\Support\Lokalizace;
use App\Support\PolohaIp;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Určí jazyk a zemi requestu (config/lokalizace.php).
 *
 * Jazyk:  1. zvolený (účet, jinak přepínač v session)
 *         2. jazyk země příchodu (národní doména, jinak poloha podle IP)
 *         3. výchozí (en)
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
        $pevnyJazyk = Domeny::jeMasterteam($request) ? config('lokalizace.masterteam_jazyk') : null;
        $zemePrichodu = $domena['zeme'] ?? ($pevnyJazyk ? null : $this->zemePodleIp($request));

        $jazyk = $pevnyJazyk ?? collect([
            $uzivatel?->jazyk,
            $request->hasSession() ? $request->session()->get('jazyk') : null,
            $domena['jazyk'] ?? null,
            ...(array) config('lokalizace.jazyk_zeme.' . $zemePrichodu, []),
        ])->first(fn ($kod) => Lokalizace::jeJazyk($kod))
            ?? config('lokalizace.vychozi_jazyk');

        App::setLocale($jazyk);
        Lokalizace::nastavZemi($uzivatel?->zeme ?? $zemePrichodu);

        return $next($request);
    }

    /** Země návštěvníka (ISO kód), null = neznámá. Hlavička Cloudflare má přednost před lokální databází. */
    private function zemePodleIp(Request $request): ?string
    {
        $cloudflare = strtoupper((string) $request->headers->get('CF-IPCountry'));
        if (preg_match('/^[A-Z]{2}$/', $cloudflare) && $cloudflare !== 'XX') {
            return $cloudflare;
        }

        return PolohaIp::zeme($request->ip());
    }

    private function hostBezWww(Request $request): string
    {
        $host = strtolower($request->getHost());

        return str_starts_with($host, 'www.') ? substr($host, 4) : $host;
    }
}
