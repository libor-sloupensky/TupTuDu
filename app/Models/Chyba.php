<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class Chyba extends Model
{
    protected $table = 'chyby';

    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    /** Štítky typů pro přehled /masterteam/chyby: typ => [popisek, CSS třídy]. */
    const STITKY = [
        'server' => ['🖥 Server', 'bg-red-50 text-red-700'],
        'client' => ['💻 Klient', 'bg-amber-50 text-amber-700'],
        'cron' => ['⏱ Cron', 'bg-indigo-50 text-indigo-700'],
        'pomaly_request' => ['🐢 Pomalé', 'bg-sky-50 text-sky-700'],
    ];

    protected $fillable = [
        'typ', 'uroven', 'hash', 'zprava', 'soubor', 'stack_trace',
        'uri', 'metoda', 'uzivatel_id', 'user_agent', 'ip', 'kontext',
        'opraveno', 'opraveno_v', 'opravil_uzivatel_id',
        'pocet_vyskytu', 'zacatek_v', 'naposledy_v',
    ];

    protected function casts(): array
    {
        return [
            'opraveno' => 'boolean',
            'kontext' => 'array',
            'opraveno_v' => 'datetime',
            'zacatek_v' => 'datetime',
            'naposledy_v' => 'datetime',
        ];
    }

    /**
     * Výjimky, které už vyřídil exception handler (bootstrap/app.php) — zapsal je,
     * nebo je záměrně přeskočil jako šum. Laravel je vzápětí ještě zaloguje přes
     * Log::error → listener v AppServiceProvider by je jinak zapsal podruhé
     * (dvojí počet výskytů, v konzoli duplicitní řádek 'cron', obejitý filtr šumu).
     */
    private static ?\WeakMap $vyrizeneVyjimky = null;

    public static function oznacVyrizenou(\Throwable $e): void
    {
        self::$vyrizeneVyjimky ??= new \WeakMap();
        self::$vyrizeneVyjimky[$e] = true;
    }

    public static function jeVyrizena(\Throwable $e): bool
    {
        return isset(self::$vyrizeneVyjimky[$e]);
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
     * Zachytí novou chybu. Deduplikace přes `hash`:
     *   - nová chyba → INSERT
     *   - opakovaná → increment pocet_vyskytu + update naposledy_v + reaktivuj (opraveno=false)
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
                $existujici->update([
                    'pocet_vyskytu' => $existujici->pocet_vyskytu + 1,
                    'naposledy_v' => now(),
                    // Pokud byla označena za opravenou a zase se vyskytla, vrátit do aktivních
                    'opraveno' => false,
                    'opraveno_v' => null,
                    'opravil_uzivatel_id' => null,
                ]);
                return;
            }

            // Nová chyba — INSERT
            static::create(array_merge([
                'hash' => $hash,
                'pocet_vyskytu' => 1,
                'zacatek_v' => now(),
                'naposledy_v' => now(),
                'opraveno' => false,
            ], $data));
        } catch (\Throwable $e) {
            // Logování chyby v error trackeru by mohlo způsobit infinite loop.
            error_log('Chyba::zachyt selhalo: ' . $e->getMessage());
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
