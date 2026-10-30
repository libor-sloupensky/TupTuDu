<?php

namespace App\Http\Controllers\Aplikace;

use App\Http\Controllers\Controller;
use App\Models\KonceptV3;
use App\Support\Tarif;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Projekty zákazníka (app.tuptudu.com). Projekt = KonceptV3, editor je stejná
 * šablona jako v masterteamu (masterteam/koncept-v3), jen s routami app.projekty.*
 * a zákaznickým layoutem. Ukládání, import atd. obsluhuje KonceptV3Controller.
 */
class ProjektyController extends Controller
{
    /**
     * /projects — editor si mezi projekty přechází přes /projects?id={id}
     * (adresu skládá JS editoru), tady se to převede na /projects/{kod}.
     * Bez parametru: poslední upravený projekt, bez projektů úvodní obrazovka.
     */
    public function index(Request $request)
    {
        $projekty = $this->mojeProjekty();

        if ($request->filled('id')) {
            $projekt = $projekty->firstWhere('id', (int) $request->query('id'));
            if ($projekt) {
                // ?nove=1 si editor po založení projektu sám odebere
                return redirect()->route('app.projekty.editor', ['kod' => $projekt->kod] + $request->only('nove'));
            }
        }

        if ($projekty->isNotEmpty()) {
            return redirect()->route('app.projekty.editor', $projekty->first()->kod);
        }

        return view('aplikace.prvni-projekt');
    }

    public function editor(string $kod)
    {
        $koncepty = $this->mojeProjekty();
        $aktivni = $koncepty->firstWhere('kod', $kod);
        abort_unless($aktivni, 404);

        return view('masterteam.koncept-v3', [
            'koncepty' => $koncepty,
            'aktivni' => $aktivni,
            'trasaV3' => 'app.projekty',
            'layoutV3' => 'layouts.zakaznik',
            'titulekV3' => $aktivni->nazev . ' — TupTuDu',
            // limity tarifu pro editor (limit-tarifu.js); masterteam je nepředává = bez omezení
            'limitTarifu' => Tarif::stav(Auth::user()),
        ]);
    }

    /** Založení projektu z úvodní obrazovky (v editoru se zakládá přes KonceptV3Controller::vytvorit). */
    public function novy()
    {
        if (! Tarif::muzeZalozitProjekt(Auth::user())) {
            return redirect()->route('app.predplatne')->with('chyba', __('tarify.limit_projektu_nadpis'));
        }

        $projekt = KonceptV3::create([
            'uzivatel_id' => Auth::id(),
            'nazev' => __('projekty.novy_nazev'),
            'data' => null,
            'verze' => 1,
            'faze' => 'rozhovor',
            'metadata' => null,
            'chat' => [],
            'historie' => [],
        ]);

        return redirect()->route('app.projekty.editor', ['kod' => $projekt->kod, 'nove' => 1]);
    }

    private function mojeProjekty()
    {
        return KonceptV3::where('uzivatel_id', Auth::id())->orderByDesc('upraveno')->get();
    }
}
