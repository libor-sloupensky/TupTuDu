<?php

namespace App\Http\Controllers\Aplikace;

use App\Http\Controllers\Controller;
use App\Services\LogoUploader;
use App\Support\Tarif;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Logo firmy v tarifu Profi (app.tuptudu.com/account/logo): nahrání, odstranění a vydání obrázku
 * pro stránku Účet a pro export v editoru. Logo patří firmě uživatele (Uzivatel::firma),
 * ne uživateli samotnému. Popis v modules/platby.md.
 */
class LogoFirmyController extends Controller
{
    /**
     * Uložené logo firmy pro stránku Účet a pro export v editoru. Bez loga 204, ne 404 (ta se hlásí
     * mezi ztracené adresy). Tarif tu nerozhoduje, vlastník své logo vidí vždy; na exportech ho editor
     * použije jen v tarifu Profi a veřejný odkaz si tarif hlídá sám (Uzivatel::logoFirmy).
     */
    public function zobraz(Request $request, LogoUploader $loga): Response
    {
        $soubor = $loga->najdi($request->user()->firma()?->logo);
        if (! $soubor) {
            return response()->noContent();
        }

        return response()->file($soubor, ['Content-Type' => 'image/webp', 'Cache-Control' => 'private, no-cache']);
    }

    public function ulozit(Request $request, LogoUploader $loga): JsonResponse
    {
        $uzivatel = $request->user();
        if (Tarif::uzivatele($uzivatel) !== Tarif::PROFI) {
            return response()->json(['ok' => false, 'error' => __('ucet.logo_jen_profi')], 403);
        }
        $request->validate(['logo' => 'required|file|max:' . LogoUploader::MAX_VSTUP_MB * 1024]);

        $firma = $uzivatel->firma() ?? $uzivatel->zalozFirmu();
        // Soubor má pevné jméno podle firmy, nové logo staré přepíše
        $vysledek = $loga->ulozit($request->file('logo'), $firma->id);
        if (! $vysledek['ok']) {
            return response()->json($vysledek, 422);
        }
        $firma->update(['logo' => $vysledek['path']]);

        return response()->json(['ok' => true, 'url' => route('app.ucet.logo') . '?v=' . time()]);
    }

    /** Odstranit jde i po skončení tarifu. */
    public function smazat(Request $request, LogoUploader $loga): JsonResponse
    {
        $firma = $request->user()->firma();
        if ($firma?->logo) {
            $loga->smazat($firma->logo);
            $firma->update(['logo' => null]);
        }

        return response()->json(['ok' => true]);
    }
}
