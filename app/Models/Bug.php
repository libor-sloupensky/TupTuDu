<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class Bug extends Model
{
    protected $table = 'bugy';

    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $fillable = [
        'typ', 'uroven', 'hash', 'zprava', 'soubor', 'stack_trace',
        'uri', 'metoda', 'uzivatel_id', 'user_agent', 'ip', 'kontext',
        'opraveno', 'opraveno_v', 'opravil_uzivatel_id',
        'pocet_vyskytu', 'zacatek_v', 'naposledy_v', 'notifikovano_v',
    ];

    protected function casts(): array
    {
        return [
            'opraveno' => 'boolean',
            'kontext' => 'array',
            'opraveno_v' => 'datetime',
            'zacatek_v' => 'datetime',
            'naposledy_v' => 'datetime',
            'notifikovano_v' => 'datetime',
        ];
    }

    public function uzivatel(): BelongsTo
    {
        return $this->belongsTo(Uzivatel::class, 'uzivatel_id');
    }

    public function opravil(): BelongsTo
    {
        return $this->belongsTo(Uzivatel::class, 'opravil_uzivatel_id');
    }

    /**
     * Počty pro sdílenou lištu záložek (/masterteam/bugy + /masterteam/seo-404).
     * Jeden zdroj pravdy, aby obě stránky ukazovaly stejná čísla.
     * Bugové typy počítá jen aktivní (neopravené); 404 je samostatná tabulka.
     */
    public static function poctyZalozek(): array
    {
        return [
            'server'   => static::where('opraveno', false)->where('typ', 'server')->count(),
            'client'   => static::where('opraveno', false)->where('typ', 'client')->count(),
            'pomaly'   => static::where('opraveno', false)->where('typ', 'pomaly_request')->count(),
            'dotazy'   => static::where('opraveno', false)->where('typ', 'pomaly_dotaz')->count(),
            'ztraceno' => Seo404::count(),
        ];
    }

    /**
     * Zachytí nový bug. Deduplikace přes `hash`:
     *   - nový bug → INSERT
     *   - opakovaný → increment pocet_vyskytu + update naposledy_v + reaktivuj (opraveno=false)
     *
     * Bezpečné pro volání z exception handleru — chyba v zápisu se ignoruje
     * (= žádný infinite loop).
     */
    public static function zachyt(array $data): void
    {
        try {
            $hash = self::vytvorHash($data['typ'] ?? 'server', $data['soubor'] ?? '', $data['zprava'] ?? '');
            $existujici = static::where('hash', $hash)->first();

            if ($existujici) {
                $zmeny = [
                    'pocet_vyskytu' => $existujici->pocet_vyskytu + 1,
                    'naposledy_v' => now(),
                    // Pokud byl označen za opravený a zase se vyskytl, vrátit do aktivních
                    'opraveno' => false,
                    'opraveno_v' => null,
                    'opravil_uzivatel_id' => null,
                ];
                // Opravený bug se vrátil → znovu oznámit e-mailem, ale nejdřív
                // 24 h po minulém oznámení (jinak by „opraveno → vrátil se"
                // dokola plnilo schránku). Opakování aktivního bugu mail neposílá.
                if ($existujici->opraveno
                    && (! $existujici->notifikovano_v || $existujici->notifikovano_v->lt(now()->subDay()))) {
                    $zmeny['notifikovano_v'] = null;
                }
                $existujici->update($zmeny);
                return;
            }

            // Nový bug — INSERT
            static::create(array_merge([
                'hash' => $hash,
                'pocet_vyskytu' => 1,
                'zacatek_v' => now(),
                'naposledy_v' => now(),
                'opraveno' => false,
            ], $data));
        } catch (\Throwable $e) {
            // Logování bugu v error trackeru by mohlo způsobit infinite loop.
            error_log('Bug::zachyt selhalo: ' . $e->getMessage());
        }
    }

    /**
     * Výpadek AI / externí služby (Anthropic, Voyage…) — typ `ai`. Sem patří
     * i nedostatek kreditu, rate limit, timeouty a chyby sítě, aby se žádný
     * výpadek nepřehlédl (poradce, poptávkový průvodce, těžba, RAG).
     */
    public static function nahlasVypadekAi(string $sluzba, string $modul, ?int $status, string $detail, array $kontext = []): void
    {
        $detail = trim($detail);
        $kredit = $status === 400 && preg_match('/credit balance|insufficient|billing/i', $detail);
        $zprava = $kredit
            ? "{$sluzba}: NEDOSTATEK KREDITU — dobij účet ({$modul})"
            : "{$sluzba}: výpadek ({$modul})" . ($status ? " HTTP {$status}" : '') . ': ' . mb_substr($detail, 0, 300);
        static::zachyt([
            'typ' => 'ai',
            'uroven' => 'error',
            'zprava' => mb_substr($zprava, 0, 500),
            'soubor' => "{$sluzba}:{$modul}",
            'uri' => request()?->fullUrl() ? mb_substr(request()->fullUrl(), 0, 500) : null,
            'metoda' => request()?->method(),
            'uzivatel_id' => auth()->id(),
            'kontext' => array_merge(['http_status' => $status, 'detail' => mb_substr($detail, 0, 1500)], $kontext),
        ]);
    }

    /** Vstup requestu pro ladění (bez citlivých klíčů, omezená velikost). */
    public static function kontextZRequestu(): ?array
    {
        try {
            $req = request();
            if (!$req) return null;
            $vstup = $req->except(['password', 'password_confirmation', 'heslo', 'token', '_token', 'pin', 'api_key']);
            $json = json_encode($vstup, JSON_UNESCAPED_UNICODE);
            if ($json === false) return null;
            return ['vstup' => mb_substr($json, 0, 2000)];
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** Normalizovaný hash pro deduplikaci. */
    private static function vytvorHash(string $typ, string $soubor, string $zprava): string
    {
        // Sanitizace zprávy — odstranit dynamická data (čísla, hex, UUIDs)
        // aby se "SQL Error 1062" a "SQL Error 1054" deduplikovaly samostatně,
        // ale "Connection refused for IP 1.2.3.4" a "Connection refused for IP 5.6.7.8"
        // jako jedna chyba.
        $normalizovano = preg_replace('/\b\d+\b|\b[0-9a-f]{8,}\b/i', 'X', $zprava);
        return hash('sha256', $typ . '|' . $soubor . '|' . $normalizovano);
    }
}
