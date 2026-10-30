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

    private function stranka(string $dokument, string $titulek)
    {
        $obsah = "pravni.{$dokument}-" . app()->getLocale();

        return view('pravni.stranka', [
            'titulek' => $titulek,
            'obsah' => view()->exists($obsah) ? $obsah : "pravni.{$dokument}-en",
        ]);
    }
}
