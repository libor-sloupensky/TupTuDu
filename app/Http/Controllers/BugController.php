<?php

namespace App\Http\Controllers;

use App\Models\Bug;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Příjem bugů z frontendu (window.onerror, unhandledrejection).
 *
 * Rate limit: max 30 záznamů / 5 min per IP — nikoli per session, aby spam
 * z 1 IP nezahltil DB. Plus dedup přes Bug::zachyt() (= 1 bug 1000×
 * volaný zapíše 1 řádek a 1000× zvedne pocet_vyskytu, ne 1000 řádků).
 */
class BugController extends Controller
{
    public function ulozit(Request $request)
    {
        $klic = 'bug-js:' . $request->ip();
        if (RateLimiter::tooManyAttempts($klic, 30)) {
            return response()->json(['ok' => false, 'reason' => 'rate-limit'], 429);
        }
        RateLimiter::hit($klic, 300);

        $data = $request->validate([
            'zprava' => 'required|string|max:500',
            'soubor' => 'nullable|string|max:255',
            'stack' => 'nullable|string|max:8000',
            'uri' => 'nullable|string|max:500',
            'uroven' => 'nullable|in:error,warning,notice',
            // Detailní kontext z místa chyby (rozepsaná data formuláře, ID
            // záznamu, parametry akce). Posílá ho window.chybaUzivateli() —
            // zásadně zrychluje ladění, protože víme CO uživatel dělal.
            // Citlivé klíče (heslo, token…) filtruje už klient.
            'kontext' => 'nullable|string|max:2000',
        ]);

        // Skip crawlery/prerendery (Facebook, Google, Bing…): spouštějí JS jen
        // částečně (blokují některé skripty), takže hlásí chyby, které reálný
        // prohlížeč nemá. 24.9.2026: 10 ReferenceError z /poptavky/nova naráz
        // z IP Meta (2a03:2880::/32) = náhled sdíleného odkazu, ne uživatel.
        $ua = strtolower((string) $request->userAgent());
        foreach (['facebookexternalhit', 'meta-externalagent', 'facebookcatalog', 'googlebot', 'bingbot', 'yandexbot',
                  'duckduckbot', 'applebot', 'twitterbot', 'linkedinbot', 'slackbot', 'discordbot', 'whatsapp',
                  'telegrambot', 'ahrefsbot', 'semrushbot', 'petalbot', 'headlesschrome', 'lighthouse'] as $bot) {
            if (str_contains($ua, $bot)) {
                return response()->json(['ok' => true, 'ignored' => true, 'reason' => 'bot']);
            }
        }

        // Skip prohlížeče starší, než pro které Vite sestavuje JS (Vite 7 výchozí
        // „baseline widely available": Chrome 107, Firefox 104, Safari/iOS 16).
        // Náš kód v nich nejde spustit (SyntaxError hned při načtení) — opravit
        // to nejde, je to jen šum (2026-10-20: Android 5.1 + Chrome 61).
        if (self::jeNepodporovanyProhlizec((string) $request->userAgent())) {
            return response()->json(['ok' => true, 'ignored' => true, 'reason' => 'stary-prohlizec']);
        }

        // Skip "Script error." — Chrome/Firefox vrací tuto generickou zprávu
        // u cross-origin scripts (= naše vendor JS které nemají CORS header).
        // Nedává nám žádnou actionable info, takže ignorujeme.
        if (trim($data['zprava']) === 'Script error.' || $data['zprava'] === '') {
            return response()->json(['ok' => true, 'ignored' => true]);
        }

        // Skip bugy z browser extensions (MetaMask, ad-blockery, translator...).
        // Stack trace obsahuje chrome-extension:// nebo moz-extension:// = neni
        // to nase kod, nemuzeme s tim nic delat.
        $stack = $data['stack'] ?? '';
        if (str_contains($stack, 'chrome-extension://')
            || str_contains($stack, 'moz-extension://')
            || str_contains($stack, 'safari-extension://')
            || str_contains($stack, 'webkit-masked-url://')) {
            return response()->json(['ok' => true, 'ignored' => true]);
        }

        // Skip benign browser warnings — nejsou to reálné bugy, jen šum:
        //   - "ResizeObserver loop completed with undelivered notifications" — vyskytuje
        //     se když callback zvětšuje element pozorovaný stejným observerem
        //     (Chrome/Firefox). Nezpůsobuje žádný problém, doporučuje se ignorovat.
        //   - "ResizeObserver loop limit exceeded" — stejný typ false-positive.
        if (str_contains($data['zprava'], 'ResizeObserver loop')) {
            return response()->json(['ok' => true, 'ignored' => true]);
        }

        // Skip krypto-peněženky vkládané do stránky (MetaMask, Brave Wallet, Phantom…).
        // Brave/Safari v stacku neukážou extension://, jen "global code@stránka:1"
        // (bug #3599, 3. 10. 2026) — poznáme je podle objektů, které sami nikdy nepoužíváme.
        foreach (['window.ethereum', 'window.solana', 'selectedAddress', 'MetaMask', 'ethereum.'] as $penezenka) {
            if (str_contains($data['zprava'], $penezenka)) {
                return response()->json(['ok' => true, 'ignored' => true, 'reason' => 'wallet-extension']);
            }
        }

        Bug::zachyt([
            'typ' => 'client',
            'uroven' => $data['uroven'] ?? 'error',
            'zprava' => $data['zprava'],
            'soubor' => $data['soubor'] ?? null,
            'stack_trace' => $data['stack'] ?? null,
            'uri' => $data['uri'] ?? mb_substr((string) $request->header('referer'), 0, 500),
            'kontext' => $data['kontext'] ?? null,
            'metoda' => 'JS',
            'uzivatel_id' => auth()->id(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            'ip' => $request->ip(),
        ]);

        return response()->json(['ok' => true]);
    }

    /** Prohlížeč pod cílem sestavení JS (viz Vite build target). */
    public static function jeNepodporovanyProhlizec(string $ua): bool
    {
        // iOS: všechny prohlížeče jedou na WebKitu verze systému
        if (preg_match('/(?:iPhone|CPU) OS (\d+)_/', $ua, $m)) {
            return (int) $m[1] < 16;
        }
        if (preg_match('/(?:Chrome|Chromium)\/(\d+)\./', $ua, $m)) {
            return (int) $m[1] < 107;
        }
        if (preg_match('/Firefox\/(\d+)\./', $ua, $m)) {
            return (int) $m[1] < 104;
        }
        if (str_contains($ua, 'Safari') && preg_match('/Version\/(\d+)\./', $ua, $m)) {
            return (int) $m[1] < 16;
        }
        return false;
    }
}
