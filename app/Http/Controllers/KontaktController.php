<?php

namespace App\Http\Controllers;

use App\Mail\KontaktniZprava as KontaktniZpravaMail;
use App\Models\KontaktniZprava;
use App\Support\Lokalizace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

/**
 * Kontaktní formulář (tuptudu.com/contact) — náhrada za veřejně uvedený e-mail.
 * Zpráva se uloží do kontaktni_zpravy a odejde mailem na config('app.interni_email').
 *
 * Proti spamu bez captchy: skryté pole „web" (vyplní ho jen robot) a čas zobrazení
 * formuláře v šifrovaném poli — odeslání rychleji než za 3 s je robot. Robotovi se
 * tváříme, že zpráva odešla, ať nezkouší jinak. Počet odeslání omezuje throttle v routě.
 */
class KontaktController extends Controller
{
    private const MIN_SEKUND = 3;

    public function formular(Request $request)
    {
        $tema = $request->query('tema');

        return view('kontakt.formular', [
            'temata' => KontaktniZprava::TEMATA,
            'vybraneTema' => in_array($tema, KontaktniZprava::TEMATA, true) ? $tema : 'dotaz',
            'casFormulare' => Crypt::encryptString((string) time()),
        ]);
    }

    public function odeslat(Request $request)
    {
        if ($this->jeRobot($request)) {
            return redirect()->route('kontakt')->with('odeslano', true);
        }

        // E-mail účtu se ptáme u všech témat: buď je stejný jako e-mail pro odpověď
        // (zaškrtnuto), nebo ho odesílatel napíše zvlášť. Povinný je jen u žádostí
        // ke konkrétnímu účtu — návštěvník bez účtu může u dotazu pole nechat prázdné.
        $stejnyEmail = $request->boolean('stejny_email');
        $povinnyEmailUctu = ! $stejnyEmail
            && in_array($request->input('tema'), KontaktniZprava::TEMATA_UCTU, true);

        $data = $request->validate([
            'jmeno' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:190'],
            'tema' => ['required', Rule::in(KontaktniZprava::TEMATA)],
            'email_uctu' => [Rule::requiredIf($povinnyEmailUctu), 'nullable', 'email', 'max:190'],
            'zprava' => ['required', 'string', 'min:10', 'max:5000'],
        ]);
        // null = e-mail účtu neuveden
        $data['email_uctu'] = $stejnyEmail ? $data['email'] : ($data['email_uctu'] ?? null);

        $zprava = KontaktniZprava::create($data + [
            'jazyk' => app()->getLocale(),
            'zeme' => Lokalizace::zeme(),
            'ip' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 255),
        ]);

        try {
            Mail::to(config('app.interni_email'))->send(new KontaktniZpravaMail($zprava));
            $zprava->update(['odeslano_v' => now()]);
        } catch (\Throwable $e) {
            // Zpráva je uložená v DB, odesílatel ji neopakuje — jen zápis do bugů, ať se o ní ví
            Log::error('Kontaktní formulář: odeslání mailu selhalo: ' . $e->getMessage(), ['kontaktni_zprava_id' => $zprava->id]);
        }

        return redirect()->route('kontakt')->with('odeslano', true);
    }

    private function jeRobot(Request $request): bool
    {
        if (filled($request->input('web'))) {
            return true;
        }
        try {
            $zobrazeno = (int) Crypt::decryptString((string) $request->input('cas'));
        } catch (\Throwable) {
            return true;
        }

        return time() - $zobrazeno < self::MIN_SEKUND;
    }
}
