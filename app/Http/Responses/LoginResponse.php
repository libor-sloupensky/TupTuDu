<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        // Volitelný interní redirect z formuláře (chráněno proti open redirect).
        $kam = $request->input('kam');
        if (is_string($kam) && str_starts_with($kam, '/') && !str_starts_with($kam, '//')) {
            return redirect($kam);
        }

        return $request->wantsJson()
            ? response()->json(['two_factor' => false])
            : redirect()->intended(config('fortify.home'));
    }
}
