<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Office\Pozvani;
use App\Models\Uzivatel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    /** Deep link schéma mobilní aplikace (= appId v capacitor.config.json) */
    private const APP_SCHEME = 'cz.tuptudu.office';

    public function redirect(Request $request)
    {
        // Rozlišení, kam se uživatel po přihlášení vrátí:
        // - capacitor=1 → Custom Tab v mobilní appce (token bridge, viz callback)
        // - mobile=1    → /mobile/* otevřené v běžném prohlížeči
        if ($request->query('capacitor') === '1') {
            Cookie::queue('oauth_capacitor', '1', 10);
        } elseif ($request->query('mobile') === '1') {
            Cookie::queue('oauth_mobile', '1', 10);
        }

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
        $this->prijmoutPozvankyDoFirem($uzivatel);

        // Capacitor flow: session z Custom Tabu (Chrome) se nesdílí s WebView appky.
        // Vygenerujeme one-time token, appka jej zachytí přes deep link a otevře
        // /mobile/auth-bridge/{token}, kde teprve vznikne session ve WebView.
        if ($request->cookie('oauth_capacitor') === '1') {
            Cookie::queue(Cookie::forget('oauth_capacitor'));

            $token = Str::random(48);
            Cache::put('mobile_auth_token:' . $token, $uzivatel->id, 60); // platnost 60 s

            return $this->deepLinkStranka(self::APP_SCHEME . '://auth/done?token=' . urlencode($token));
        }

        if ($request->cookie('oauth_mobile') === '1') {
            Cookie::queue(Cookie::forget('oauth_mobile'));

            return redirect()->route('office.mobile.skenovat');
        }

        return redirect()->intended('/masterteam');
    }

    /**
     * Bridge — appka sem přijde z WebView s tokenem z deep linku.
     * Token je jednorázový a max 60 s starý; po ověření založí session ve WebView.
     */
    public function mobileAuthBridge(Request $request, string $token)
    {
        $uzivatelId = Cache::pull('mobile_auth_token:' . $token); // pull = get + forget

        if (! $uzivatelId) {
            return redirect()->route('office.mobile.prihlaseni')
                ->withErrors(['email' => 'Přihlášení vypršelo, zkuste to prosím znovu.']);
        }

        Auth::loginUsingId($uzivatelId, true);
        $request->session()->regenerate();
        $this->prijmoutPozvankyDoFirem(Auth::user());

        return redirect()->route('office.mobile.skenovat');
    }

    /**
     * Pozvánky do firem modulu Doklady, které dorazily až po registraci.
     * Tabulka nemusí existovat (modul se nasazuje postupně) — pak se přeskočí.
     */
    private function prijmoutPozvankyDoFirem(Uzivatel $uzivatel): void
    {
        if (! Schema::hasTable('office_pozvani')) {
            return;
        }

        Pozvani::prijmoutCekajiciPro($uzivatel);
    }

    /**
     * Custom Tab neumí sám zavřít — vrátíme stránku, která skočí na deep link
     * mobilní aplikace. Fallback tlačítko pro případ, že se redirect nespustí.
     */
    private function deepLinkStranka(string $deepLink)
    {
        $deepLinkAttr = e($deepLink);
        $deepLinkJs = json_encode($deepLink, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);

        $html = <<<HTML
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Přihlášení dokončeno</title>
            <style>
                body { font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; text-align: center; padding: 3rem 1.5rem; color: #2c3e50; }
                a { display: inline-block; margin-top: 1.5rem; padding: 0.85rem 1.5rem; background: #dd5500; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
            </style>
        </head>
        <body>
            <h2>Přihlášení proběhlo úspěšně</h2>
            <p>Vracíme vás zpět do aplikace…</p>
            <a href="{$deepLinkAttr}">Otevřít aplikaci TupTuDu</a>
            <script>window.location.replace({$deepLinkJs});</script>
        </body>
        </html>
        HTML;

        return response($html, 200, ['Content-Type' => 'text/html; charset=utf-8']);
    }
}
