<?php

namespace App\Http\Controllers;

use App\Support\Clanky;

/**
 * Články na veřejném webu (www.tuptudu.com/cs/clanky). Jazyk určuje adresa (JazykZAdresy),
 * obsah je v resources/clanky, viz App\Support\Clanky a modules/blog.md.
 */
class ClankyController extends Controller
{
    public function prehled()
    {
        $clanky = Clanky::vsechny(app()->getLocale());
        abort_if($clanky === [], 404);

        return view('clanky.prehled', ['clanky' => $clanky]);
    }

    public function detail(string $adresa)
    {
        $clanek = Clanky::najdi(app()->getLocale(), $adresa);
        abort_unless($clanek, 404);

        return view('clanky.detail', ['clanek' => $clanek, 'html' => Clanky::html($clanek)]);
    }
}
