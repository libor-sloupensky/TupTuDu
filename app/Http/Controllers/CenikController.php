<?php

namespace App\Http\Controllers;

use App\Support\Tarif;

/**
 * Ceník na veřejném webu (tuptudu.com/pricing). Tarify a ceny z config/tarify.php,
 * měna podle země návštěvníka (CZ → Kč, jinak eura) — stejné ceny jsou v Paddlu.
 * Paddle ceník na webu vyžaduje (schválení domény), viz modules/platby.md.
 */
class CenikController extends Controller
{
    public function index()
    {
        return view('vitrina.cenik', [
            'mena' => Tarif::mena(),
            'limity' => config('tarify.tarify'),
        ]);
    }
}
