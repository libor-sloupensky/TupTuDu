<?php

namespace App\Models;

/**
 * Koncept V3 — stejný model jako Koncept, jen vlastní tabulka.
 * Dědí z Koncept, takže projde všude, kde služby očekávají Koncept
 * (KonceptAiService, PravidlaService, RozhovorService).
 *
 * V zákaznické aplikaci se mu říká „projekt" a v adrese ho určuje `kod`
 * (app.tuptudu.com/projects/k7x2m), ne pořadové id.
 */
class KonceptV3 extends Koncept
{
    protected $table = 'koncepty_v3';

    /** Bez znaků, které se pletou (0/o, 1/l/i) — kód se může opisovat. */
    private const ABECEDA_KODU = 'abcdefghjkmnpqrstuvwxyz23456789';

    private const DELKA_KODU = 5;

    protected static function booted(): void
    {
        static::creating(function (KonceptV3 $koncept) {
            $koncept->kod ??= self::novyKod();
        });
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
