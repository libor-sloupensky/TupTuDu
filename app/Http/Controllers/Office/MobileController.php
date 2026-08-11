<?php

namespace App\Http\Controllers\Office;

use App\Http\Controllers\Controller;

use App\Models\Office\Firma;
use App\Models\Office\Pozvani;
use App\Models\Office\UcetniVazba;
use App\Models\Uzivatel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MobileController extends Controller
{
    public function prihlaseni()
    {
        if (Auth::check()) {
            return redirect()->route('mobile.skenovat');
        }
        return view('mobile.prihlaseni');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt(['email' => $request->email, 'password' => $request->password], true)) {
            return back()->withErrors(['email' => 'Neplatné přihlašovací údaje.'])->withInput();
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();
        Pozvani::prijmoutCekajiciPro($user);

        $prvniFirma = $user->officeFirmy()->first();
        if ($prvniFirma && !session('office_firma_ico')) {
            session(['office_firma_ico' => $prvniFirma->ico]);
        }

        return redirect()->route('mobile.skenovat');
    }

    public function skenovat()
    {
        /** @var User $user */
        $user = Auth::user();

        return view('mobile.skenovat', [
            'firma' => $user->officeAktivniFirma(),
            'user' => $user,
            'firmy' => $this->dostupneFirmy($user),
        ]);
    }

    /**
     * Přepnutí aktivní firmy přímo z mobilní appky — stejná kontrola přístupu
     * jako FirmaController::prepnout, jen redirect zpět na skener.
     */
    public function prepnoutFirmu(string $ico)
    {
        /** @var User $user */
        $user = Auth::user();

        $jeVlastni = $user->officeFirmy()->where('ico', $ico)->exists();
        if (!$jeVlastni && !$user->officeJeKlientFirma($ico)) {
            abort(403, 'Nemáte přístup k této firmě.');
        }

        session(['office_firma_ico' => $ico]);

        return redirect()->route('mobile.skenovat');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('mobile.prihlaseni');
    }

    /**
     * Vlastní firmy uživatele + klientské firmy (pokud je účetní),
     * jako jeden seznam pro výběr ve skeneru.
     *
     * @return \Illuminate\Support\Collection<int, Firma>
     */
    private function dostupneFirmy(User $user)
    {
        $vlastni = $user->firmy;

        $ucetniIcos = $user->officeFirmy()->wherePivot('role', 'ucetni')->pluck('ico')->toArray();
        if (empty($ucetniIcos)) {
            return $vlastni;
        }

        $klientIcos = UcetniVazba::whereIn('ucetni_ico', $ucetniIcos)
            ->where('stav', 'schvaleno')
            ->pluck('klient_ico')
            ->toArray();

        if (empty($klientIcos)) {
            return $vlastni;
        }

        return $vlastni->concat(Firma::whereIn('ico', $klientIcos)->get())->unique('ico')->values();
    }
}
