<?php

namespace App\Http\Controllers\Aplikace;

use App\Http\Controllers\Controller;
use App\Support\Lokalizace;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Účet zákazníka (app.tuptudu.com/account): jméno, e-mail, jazyk, země, heslo. */
class UcetController extends Controller
{
    public function upravit(Request $request)
    {
        $zeme = $this->seznamZemi();
        $aktualni = $request->user()->zeme ?? Lokalizace::zeme();

        return view('aplikace.ucet', [
            'uzivatel' => $request->user(),
            'zeme' => $zeme,
            'vybranaZeme' => isset($zeme[$aktualni]) ? $aktualni : 'ZZ',
        ]);
    }

    public function ulozit(Request $request)
    {
        $uzivatel = $request->user();
        $data = $request->validate([
            'jmeno' => ['required', 'string', 'max:100'],
            'prijmeni' => ['nullable', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', Rule::unique('uzivatele', 'email')->ignore($uzivatel->id)],
            'jazyk' => ['required', Rule::in(Lokalizace::jazyky())],
            'zeme' => ['required', Rule::in(array_keys($this->seznamZemi()))],
        ]);

        $zmenaEmailu = $data['email'] !== $uzivatel->email;
        $uzivatel->fill($data);
        if ($zmenaEmailu) {
            // Nová adresa se musí znovu ověřit — do té doby pustí `verified` jen na výzvu k ověření
            $uzivatel->email_overen_v = null;
        }
        $uzivatel->save();

        $request->session()->put('jazyk', $data['jazyk']);
        // Hláška „Uloženo" už v nově zvoleném jazyce
        app()->setLocale($data['jazyk']);
        if ($zmenaEmailu) {
            $uzivatel->sendEmailVerificationNotification();
        }

        return redirect()->route('app.ucet')->with('stav', __('ucet.ulozeno'));
    }

    public function zmenitHeslo(Request $request)
    {
        $uzivatel = $request->user();
        $request->validate([
            // Účet založený přes Google heslo nemá — pak se současné nevyžaduje
            'current_password' => [$uzivatel->heslo ? 'required' : 'nullable', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $uzivatel->update(['heslo' => $request->input('password')]);

        return redirect()->route('app.ucet')->with('stav', __('ucet.heslo_zmeneno'));
    }

    /** Kód země => název v jazyce uživatele (lang/{jazyk}/zeme.php), seřazené podle názvu. */
    private function seznamZemi(): array
    {
        $zeme = __('zeme');
        // Řazení bez diakritiky (Česko mezi C, ne na konci) — PHP tu nemá intl/Collator
        uasort($zeme, fn ($a, $b) => strcasecmp(\Illuminate\Support\Str::ascii($a), \Illuminate\Support\Str::ascii($b)));

        // „Jiná země" na konec
        return array_diff_key($zeme, ['ZZ' => 1]) + ['ZZ' => $zeme['ZZ']];
    }
}
