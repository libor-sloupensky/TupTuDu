<?php

namespace App\Http\Controllers;

/**
 * Obchodní podmínky, zásady ochrany osobních údajů a vrácení peněz
 * (tuptudu.com/terms, /privacy, /refunds). Text je celý dokument v jazyce návštěvníka
 * (resources/views/pravni/{dokument}-{jazyk}), když verze v jeho jazyce není, ukáže se anglická.
 */
class PravniController extends Controller
{
    public function podminky()
    {
        return $this->stranka('podminky', __('pravni.podminky_titulek'));
    }

    public function soukromi()
    {
        return $this->stranka('soukromi', __('pravni.soukromi_titulek'));
    }

    /** Vrácení peněz — Paddle ho chce mít na webu jako samostatnou stránku (modules/platby.md). */
    public function vraceni()
    {
        return $this->stranka('vraceni', __('pravni.vraceni_titulek'));
    }

    /** Autoři modelů z katalogu podle public/katalog/katalog.json, vyžaduje to licence CC BY. */
    public function autoriModelu()
    {
        $katalog = json_decode((string) @file_get_contents(public_path('katalog/katalog.json')), true) ?: [];
        $polozky = collect($katalog['polozky'] ?? []);
        $pocty = $polozky->countBy('zdroj');
        // Zdroj s autory po kusech (Blend Swap): každé dílo jednou, i když z něj máme víc kusů
        $dila = $polozky->filter(fn ($p) => ! empty($p['autor']))->groupBy('zdroj')
            ->map(fn ($kusy) => $kusy->unique(fn ($p) => ($p['dilo'] ?? '') . '|' . $p['autor'])
                ->map(fn ($p) => ['dilo' => $p['dilo'] ?? null, 'autor' => $p['autor'], 'odkaz' => $p['odkaz'] ?? null])
                ->sortBy('autor', SORT_NATURAL | SORT_FLAG_CASE)->values());
        $zdroje = collect($katalog['zdroje'] ?? [])
            ->filter(fn ($z, $klic) => $pocty->has($klic))
            ->map(fn ($z, $klic) => $z + ['pocet' => $pocty[$klic], 'dila' => $dila[$klic] ?? collect()])
            ->values();

        return view('pravni.autori-modelu', ['zdroje' => $zdroje]);
    }

    private function stranka(string $dokument, string $titulek)
    {
        $obsah = "pravni.{$dokument}-" . app()->getLocale();

        return view('pravni.stranka', [
            'titulek' => $titulek,
            'obsah' => view()->exists($obsah) ? $obsah : "pravni.{$dokument}-en",
        ]);
    }
}
