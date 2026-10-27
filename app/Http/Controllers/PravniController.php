<?php

namespace App\Http\Controllers;

/**
 * Obchodní podmínky a zásady ochrany osobních údajů (tuptudu.com/terms, /privacy).
 * Text je celý dokument v jazyce návštěvníka (resources/views/pravni/{dokument}-{jazyk}),
 * když verze v jeho jazyce není, ukáže se anglická.
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

    private function stranka(string $dokument, string $titulek)
    {
        $obsah = "pravni.{$dokument}-" . app()->getLocale();

        return view('pravni.stranka', [
            'titulek' => $titulek,
            'obsah' => view()->exists($obsah) ? $obsah : "pravni.{$dokument}-en",
        ]);
    }
}
