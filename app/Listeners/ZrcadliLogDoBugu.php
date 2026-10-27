<?php

namespace App\Listeners;

use App\Models\Bug;
use Illuminate\Log\Events\MessageLogged;

/**
 * Zrcadlí Log::error() / Log::critical() / alert / emergency do tabulky bugů.
 *
 * Proč: 31 míst v kódu (Comgate platby, zálohy S3, odesílání e-mailů,
 * upload souborů, RAG…) hlásí selhání jen přes Log::error → laravel.log,
 * který nikdo nečte (audit 26. 9. 2026: 29 MB, 0 přečtených). Tady se
 * každé takové volání objeví v /masterteam/bugy s deduplikací přes hash
 * (stejná zpráva ze stejného místa = jeden řádek, roste pocet_vyskytu).
 *
 * Co se NEzrcadlí:
 *   - warning a nižší (zůstávají jen v souboru, byl by to šum),
 *   - záznamy s kontextem 'exception' — to je Laravel exception handler,
 *     ten už bug zapsal přes report() v bootstrap/app.php (nechceme duplikát).
 */
class ZrcadliLogDoBugu
{
    private const UROVNE = ['error', 'critical', 'alert', 'emergency'];

    public function handle(MessageLogged $event): void
    {
        if (!in_array($event->level, self::UROVNE, true)) {
            return;
        }
        if (($event->context['exception'] ?? null) instanceof \Throwable) {
            return;
        }

        try {
            $misto = $this->mistoVolani();
            $kontext = $event->context;
            unset($kontext['exception']);
            $json = json_encode($kontext, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);

            Bug::zachyt([
                'typ' => 'server',
                'uroven' => 'error',
                'zprava' => mb_substr('Log::' . $event->level . ' — ' . (string) $event->message, 0, 500),
                'soubor' => $misto,
                'uri' => request()?->fullUrl() ? mb_substr(request()->fullUrl(), 0, 500) : null,
                'metoda' => app()->runningInConsole() ? 'CLI' : request()?->method(),
                'uzivatel_id' => auth()->id(),
                'kontext' => $json && $json !== '[]' ? ['log_kontext' => mb_substr($json, 0, 2000)] : null,
            ]);
        } catch (\Throwable $e) {
            // Zrcadlení nesmí shodit ani logování, ani volajícího.
        }
    }

    /** První frame mimo Laravel/Monolog = místo v app/, které Log::error zavolalo. */
    private function mistoVolani(): string
    {
        foreach (debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 30) as $frame) {
            $soubor = $frame['file'] ?? '';
            if ($soubor === '' || str_contains($soubor, DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR)
                || str_contains($soubor, 'ZrcadliLogDoBugu')) {
                continue;
            }
            return basename($soubor) . ':' . ($frame['line'] ?? 0);
        }
        return 'Log';
    }
}
