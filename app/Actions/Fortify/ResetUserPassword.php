<?php

namespace App\Actions\Fortify;

use App\Models\Uzivatel;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

/** Nastavení nového hesla z odkazu v e-mailu „Zapomenuté heslo". */
class ResetUserPassword implements ResetsUserPasswords
{
    public function reset(Uzivatel $user, array $input): void
    {
        Validator::make($input, [
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
        ])->validate();

        // Kdo si heslo obnovil přes e-mail, adresu tím zároveň ověřil
        $user->forceFill([
            'heslo' => $input['password'],
            'email_overen_v' => $user->email_overen_v ?? now(),
        ])->save();
    }
}
