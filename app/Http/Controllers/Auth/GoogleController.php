<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Uzivatel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request)
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Throwable $e) {
            return redirect('/login')->withErrors(['email' => 'Přihlášení přes Google se nezdařilo.']);
        }

        // TupTuDu je admin nástroj — přihlásí se JEN existující uživatel.
        // Žádné automatické zakládání účtů z cizích Google účtů.
        $uzivatel = Uzivatel::where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())
            ->first();

        if (! $uzivatel) {
            return redirect('/login')->withErrors([
                'email' => 'Účet s tímto Google e-mailem neexistuje. Požádej správce o přidání do master týmu.',
            ]);
        }

        // Propojit google_id při prvním přihlášení přes Google.
        if (! $uzivatel->google_id) {
            $uzivatel->update(['google_id' => $googleUser->getId()]);
        }

        Auth::login($uzivatel, true);
        $request->session()->regenerate();

        return redirect()->intended('/masterteam');
    }
}
