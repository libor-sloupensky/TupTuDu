<?php

namespace App\Http\Controllers;

use App\Models\KonceptV3;
use App\Models\KonceptV3Sdileni;
use App\Support\Domeny;
use App\Support\Tarif;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sdílení projektu odkazem pro čtení (modules/sdileni.md).
 *
 * Odkaz ukazuje uložený stav, ne živý projekt. Veřejná stránka nenačítá kód editoru a nedostane
 * data projektu: jen PNG půdorysů a předpočítanou 3D geometrii, kterou připraví editor.
 */
class KonceptV3SdileniController extends Controller
{
    private const MAX_PODLAZI = 20;

    private const HLAVICKY = [
        'X-Robots-Tag' => 'noindex, nofollow, noarchive',
        'Referrer-Policy' => 'no-referrer',
        'X-Content-Type-Options' => 'nosniff',
    ];

    // ─── Správa z editoru ──────────────────────────────────

    public function stav(KonceptV3 $koncept): JsonResponse
    {
        $this->autorizuj($koncept);

        return response()->json($this->popis($koncept));
    }

    /** Založí odkaz, nebo u existujícího nahradí stav. Adresa zůstává stejná. */
    public function uloz(Request $request, KonceptV3 $koncept): JsonResponse
    {
        $this->autorizuj($koncept);
        if (! Tarif::maExporty(Auth::user())) {
            return response()->json(['ok' => false, 'error' => __('tarify.exporty_jen_placene')], 403);
        }

        $request->validate([
            'podlazi' => 'required|json',
            'model' => 'required|file|max:40960',
            'nahled' => 'required|file|mimes:png|max:10240',
            'plan' => 'required|array|max:' . self::MAX_PODLAZI,
            'plan.*' => 'file|mimes:png|max:10240',
        ]);

        $podlazi = collect(json_decode($request->input('podlazi'), true))
            ->filter(fn ($p) => is_array($p) && preg_match('/^[A-Za-z0-9_-]{1,20}$/', (string) ($p['id'] ?? '')))
            ->map(fn ($p) => ['id' => $p['id'], 'nazev' => mb_substr((string) ($p['nazev'] ?? ''), 0, 40)])
            ->values();
        $plany = $request->file('plan');
        if ($podlazi->isEmpty() || $podlazi->contains(fn ($p) => ! isset($plany[$p['id']]))) {
            return response()->json(['ok' => false, 'error' => __('ed_nastroje.sdileni.chybi_plan')], 422);
        }
        if (! $this->jePlatnyModel($request->file('model')->getPathname())) {
            return response()->json(['ok' => false, 'error' => __('ed_nastroje.sdileni.neplatny_model')], 422);
        }

        $sdileni = KonceptV3Sdileni::firstOrNew(['koncept_id' => $koncept->id]);
        $sdileni->token ??= Str::random(40);

        // Nový stav se připraví vedle a vymění najednou: čtenář nikdy neuvidí půlku
        $slozka = KonceptV3Sdileni::slozka($sdileni->token);
        $nova = $slozka . '.nova';
        File::deleteDirectory($nova);
        File::ensureDirectoryExists($nova);
        $request->file('model')->move($nova, 'model.json');
        $request->file('nahled')->move($nova, 'nahled.png');
        foreach ($podlazi as $p) {
            $plany[$p['id']]->move($nova, 'plan-' . $p['id'] . '.png');
        }
        File::deleteDirectory($slozka);
        File::moveDirectory($nova, $slozka);

        $sdileni->nazev = $koncept->nazev;
        $sdileni->podlazi = $podlazi->all();
        $sdileni->upraveno = now();
        $sdileni->save();

        return response()->json($this->popis($koncept));
    }

    /** Vypne odkaz a smaže soubory. Další sdílení dostane novou adresu, stará zůstane mrtvá. */
    public function vypni(KonceptV3 $koncept): JsonResponse
    {
        $this->autorizuj($koncept);
        KonceptV3Sdileni::where('koncept_id', $koncept->id)->first()?->delete();

        return response()->json($this->popis($koncept));
    }

    // ─── Veřejná stránka ───────────────────────────────────

    public function zobraz(string $token): Response
    {
        $sdileni = $this->najdi($token);
        if ($sdileni->jeUzamceny()) {
            return response()->view('sdileni.uzamceno', [], 403)->withHeaders(self::HLAVICKY);
        }

        return response()
            ->view('sdileni.zobraz', ['sdileni' => $sdileni])
            ->withHeaders(self::HLAVICKY + ['Cache-Control' => 'private, no-cache']);
    }

    public function model(string $token): Response
    {
        $sdileni = $this->najdi($token);
        abort_if($sdileni->jeUzamceny(), 404);
        $cesta = KonceptV3Sdileni::slozka($sdileni->token) . '/model.json';
        $hlavicky = self::HLAVICKY + ['Content-Type' => 'application/json', 'Cache-Control' => 'private, no-cache'];
        if ($this->jeGzip($cesta)) {
            $hlavicky['Content-Encoding'] = 'gzip';
        }

        return response()->file($cesta, $hlavicky);
    }

    public function obrazek(string $token, string $soubor): Response
    {
        $sdileni = $this->najdi($token);
        abort_if($sdileni->jeUzamceny(), 404);
        $cesta = KonceptV3Sdileni::slozka($sdileni->token) . '/' . $soubor;
        abort_unless(preg_match('/^(nahled|plan-[A-Za-z0-9_-]{1,20})\.png$/', $soubor) && is_file($cesta), 404);

        return response()->file($cesta, self::HLAVICKY + ['Content-Type' => 'image/png', 'Cache-Control' => 'private, no-cache']);
    }

    // ─── Pomocné ───────────────────────────────────────────

    private function najdi(string $token): KonceptV3Sdileni
    {
        abort_unless(preg_match('/^[A-Za-z0-9]{40}$/', $token), 404);

        return KonceptV3Sdileni::where('token', $token)->firstOrFail();
    }

    private function popis(KonceptV3 $koncept): array
    {
        $s = KonceptV3Sdileni::where('koncept_id', $koncept->id)->first();

        return [
            'ok' => true,
            'aktivni' => (bool) $s,
            'url' => $s ? Domeny::url('web', '/share/' . $s->token) : null,
            'upraveno' => $s?->upraveno?->toIso8601String(),
        ];
    }

    private function jeGzip(string $cesta): bool
    {
        $h = @fopen($cesta, 'rb');
        if (! $h) {
            return false;
        }
        $zacatek = fread($h, 2);
        fclose($h);

        return $zacatek === "\x1f\x8b";
    }

    /** Stačí začátek souboru: JSON se servíruje jako data a prohlížeč z něj bere jen čísla a obrázky. */
    private function jePlatnyModel(string $cesta): bool
    {
        try {
            $h = $this->jeGzip($cesta) ? gzopen($cesta, 'rb') : fopen($cesta, 'rb');
            $zacatek = $h ? fread($h, 16) : '';
            if ($h) {
                fclose($h);
            }

            return str_starts_with((string) $zacatek, '{"verze":');
        } catch (\Throwable $e) {
            Log::error('Sdílení: model nejde přečíst', ['chyba' => $e->getMessage()]);

            return false;
        }
    }

    private function autorizuj(KonceptV3 $koncept): void
    {
        if ($koncept->uzivatel_id !== Auth::id() && ! Auth::user()->jeMaster()) {
            abort(403);
        }
    }
}
