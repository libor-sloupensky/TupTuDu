<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Models\Subjekt;
use App\Models\Uzivatel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UzivateleController extends Controller
{
    /** Master subjekt (firma podle config app.master_ico), do kterého patří master tým. */
    private function masterSubjekt(): Subjekt
    {
        return Subjekt::where('ico', config('app.master_ico'))->firstOrFail();
    }

    public function index()
    {
        $uzivatele = $this->masterSubjekt()
            ->uzivatele()
            ->orderBy('prijmeni')
            ->orderBy('jmeno')
            ->get();

        return view('masterteam.uzivatele', compact('uzivatele'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'jmeno' => ['required', 'string', 'max:255'],
            'prijmeni' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'heslo' => ['required', 'string', 'min:8'],
            'je_vlastnik' => ['nullable', 'boolean'],
        ]);

        $subjekt = $this->masterSubjekt();

        $uzivatel = Uzivatel::firstOrCreate(
            ['email' => mb_strtolower($data['email'])],
            [
                'jmeno' => $data['jmeno'],
                'prijmeni' => $data['prijmeni'],
                'heslo' => Hash::make($data['heslo']),
                'email_overen_v' => now(),
            ]
        );

        $subjekt->uzivatele()->syncWithoutDetaching([
            $uzivatel->id => ['je_vlastnik' => (bool) ($data['je_vlastnik'] ?? false)],
        ]);

        return redirect()->route('masterteam.uzivatele.index')->with('ok', 'Uživatel přidán do master týmu.');
    }

    public function toggleRole(Uzivatel $uzivatel)
    {
        $subjekt = $this->masterSubjekt();
        $clen = $subjekt->uzivatele()->where('uzivatele.id', $uzivatel->id)->first();
        abort_unless($clen, 404);

        $nove = ! $clen->pivot->je_vlastnik;

        // Nesmí ubrat posledního vlastníka (jinak by tým zůstal bez supersprávce).
        if (! $nove && $this->pocetVlastniku($subjekt) <= 1) {
            return back()->with('chyba', 'Nelze odebrat roli poslednímu vlastníkovi.');
        }

        $subjekt->uzivatele()->updateExistingPivot($uzivatel->id, ['je_vlastnik' => $nove]);

        return back()->with('ok', 'Role změněna.');
    }

    public function destroy(Request $request, Uzivatel $uzivatel)
    {
        if ($uzivatel->id === $request->user()->id) {
            return back()->with('chyba', 'Nemůžeš odebrat sám sebe.');
        }

        $subjekt = $this->masterSubjekt();
        $clen = $subjekt->uzivatele()->where('uzivatele.id', $uzivatel->id)->first();
        abort_unless($clen, 404);

        if ($clen->pivot->je_vlastnik && $this->pocetVlastniku($subjekt) <= 1) {
            return back()->with('chyba', 'Nelze odebrat posledního vlastníka.');
        }

        $subjekt->uzivatele()->detach($uzivatel->id);

        return back()->with('ok', 'Uživatel odebrán z master týmu.');
    }

    private function pocetVlastniku(Subjekt $subjekt): int
    {
        return $subjekt->uzivatele()->wherePivot('je_vlastnik', true)->count();
    }
}
