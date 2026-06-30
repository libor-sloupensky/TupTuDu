<?php

namespace App\Http\Controllers;

use App\Models\Chyba;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Příjem chyb z frontendu (window.onerror, unhandledrejection).
 *
 * Rate limit: max 30 záznamů / 5 min per IP — nikoli per session, aby spam
 * z 1 IP nezahltil DB. Plus dedup přes Chyba::zachyt() (= 1 chyba 1000×
 * volaná zapíše 1 řádek a 1000× zvedne pocet_vyskytu, ne 1000 řádků).
 */
class ChybaController extends Controller
{
    public function ulozit(Request $request)
    {
        $klic = 'chyba-js:' . $request->ip();
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
        ]);

        // Skip "Script error." — Chrome/Firefox vrací tuto generickou zprávu
        // u cross-origin scripts (= naše vendor JS které nemají CORS header).
        // Nedává nám žádnou actionable info, takže ignorujeme.
        if (trim($data['zprava']) === 'Script error.' || $data['zprava'] === '') {
            return response()->json(['ok' => true, 'ignored' => true]);
        }

        Chyba::zachyt([
            'typ' => 'client',
            'uroven' => $data['uroven'] ?? 'error',
            'zprava' => $data['zprava'],
            'soubor' => $data['soubor'] ?? null,
            'stack_trace' => $data['stack'] ?? null,
            'uri' => $data['uri'] ?? mb_substr((string) $request->header('referer'), 0, 500),
            'metoda' => 'JS',
            'uzivatel_id' => auth()->id(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            'ip' => $request->ip(),
        ]);

        return response()->json(['ok' => true]);
    }
}
