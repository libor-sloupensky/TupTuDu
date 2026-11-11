<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Koncept V3 — projekt v editoru.
 *
 * V zákaznické aplikaci se mu říká „projekt" a v adrese ho určuje `kod`
 * (app.tuptudu.com/projects/k7x2m), ne pořadové id.
 */
class KonceptV3 extends Model
{
    protected $table = 'koncepty_v3';

    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $fillable = [
        'uzivatel_id',
        'nazev',
        'data',
        'verze',
        'faze',
        'metadata',
        'historie',
        'chat',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'metadata' => 'array',
            'historie' => 'array',
            'chat' => 'array',
            'vzor_obnoveno_v' => 'datetime',
        ];
    }

    public function uzivatel(): BelongsTo
    {
        return $this->belongsTo(Uzivatel::class, 'uzivatel_id');
    }

    /** Bez znaků, které se pletou (0/o, 1/l/i) — kód se může opisovat. */
    private const ABECEDA_KODU = 'abcdefghjkmnpqrstuvwxyz23456789';

    private const DELKA_KODU = 5;

    protected static function booted(): void
    {
        static::creating(function (KonceptV3 $koncept) {
            $koncept->kod ??= self::novyKod();
        });
        // Klíčová událost pro Google Analytics, odejde na další stránce jen se souhlasem (App\Support\Mereni)
        static::created(fn () => \App\Support\Mereni::gaUdalost('projekt_zalozen'));
        // Cizí klíč smaže jen řádek odkazu, soubory by zůstaly na disku
        static::deleting(fn (KonceptV3 $koncept) => KonceptV3Sdileni::where('koncept_id', $koncept->id)->first()?->delete());
    }

    /**
     * Volný náhodný kód. 31^5 ≈ 28 milionů kombinací; když se po několika
     * pokusech nedaří trefit volný, kód se prodlouží (tabulka je na 12 znaků).
     */
    public static function novyKod(): string
    {
        for ($pokus = 0; ; $pokus++) {
            $delka = self::DELKA_KODU + intdiv($pokus, 10);
            $kod = '';
            for ($i = 0; $i < $delka; $i++) {
                $kod .= self::ABECEDA_KODU[random_int(0, strlen(self::ABECEDA_KODU) - 1)];
            }
            if (! static::where('kod', $kod)->exists()) {
                return $kod;
            }
        }
    }
}
