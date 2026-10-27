<?php

namespace App\Actions\Fortify;

use App\Models\Uzivatel;
use App\Support\Domeny;
use App\Support\Lokalizace;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * Registrace zákazníka (app.tuptudu.com/register). Jazyk a země se převezmou
 * z aktuální návštěvy, souhlas s podmínkami se uloží s časem (doklad souhlasu).
 * Ověřovací e-mail pošle Laravel sám po události Registered.
 */
class CreateNewUser implements CreatesNewUsers
{
    public function create(array $input): Uzivatel
    {
        // Masterteam nemá registraci (účty členů týmu se zakládají ručně)
        abort_unless(Domeny::jeApp() || Domeny::jeNeutralniLokalne(), 404);

        Validator::make($input, [
            'jmeno' => ['required', 'string', 'max:100'],
            'prijmeni' => ['nullable', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('uzivatele', 'email')],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
            'souhlas' => ['accepted'],
        ])->validate();

        return Uzivatel::create([
            'jmeno' => $input['jmeno'],
            'prijmeni' => $input['prijmeni'] ?? null,
            'email' => $input['email'],
            'heslo' => $input['password'],
            'jazyk' => Lokalizace::jazyk(),
            'zeme' => Lokalizace::zeme(),
            'souhlas_podminky_v' => now(),
        ]);
    }
}
