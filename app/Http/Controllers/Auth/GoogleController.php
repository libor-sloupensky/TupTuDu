<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Uzivatel;
use App\Support\Domeny;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect(Request $request)
    {
        return $this->google($request)->redirect();
    }

    public function callback(Request $request)
    {
        try {
            $googleUser = $this->google($request)->user();
        } catch (\Throwable $e) {
            // Typicky zrušené přihlášení nebo prošlý stav — není to chyba aplikace, jen do logu
            \Illuminate\Support\Facades\Log::warning('Přihlášení přes Google selhalo: ' . $e->getMessage());

            return redirect('/login')->withErrors(['email' => __('prihlaseni.google_selhalo')]);
        }

        $uzivatel = Uzivatel::where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())
            ->first();

        if (! $uzivatel) {
            // Masterteam pustí jen existující účty; v aplikaci vznikne zákazníkovi nový
            // (souhlas s podmínkami dává textem u tlačítka Google, e-mail ověřil Google)
            if (! Domeny::jeApp($request)) {
                return redirect('/login')->withErrors([
                    'email' => __('prihlaseni.google_ucet_neexistuje'),
                ]);
            }

            $surova = $googleUser->getRaw();
            $uzivatel = Uzivatel::create([
                'jmeno' => $surova['given_name'] ?? $googleUser->getName() ?? '',
                'prijmeni' => $surova['family_name'] ?? null,
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'jazyk' => \App\Support\Lokalizace::jazyk(),
                'zeme' => \App\Support\Lokalizace::zeme(),
                'souhlas_podminky_v' => now(),
            ]);
        }

        // Propojit google_id při prvním přihlášení přes Google; adresu tím ověřil Google.
        $uzivatel->google_id ??= $googleUser->getId();
        $uzivatel->email_overen_v ??= now();
        $uzivatel->save();

        Auth::login($uzivatel, true);
        $request->session()->regenerate();

        return redirect()->intended(Domeny::domov($request));
    }

    /**
     * Google se musí vrátit na stejnou subdoménu, odkud přihlášení začalo —
     * session (a v ní OAuth state) je na každé subdoméně vlastní.
     * V Google Cloud Console proto musí být povolená callback adresa pro app i masterteam.
     */
    private function google(Request $request)
    {
        return Socialite::driver('google')
            ->redirectUrl($request->getSchemeAndHttpHost() . '/auth/google/callback');
    }
}
