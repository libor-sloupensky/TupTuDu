<?php

namespace App\Support;

use App\Models\KonceptV3;
use App\Models\Uzivatel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Tarif uživatele a jeho limity (config/tarify.php, modules/platby.md).
 *
 * Tarif se pozná podle produktu v platném předplatném z Paddlu (Laravel Cashier):
 * Stavebník a Profi mají každý svůj produkt s cenou měsíční a roční. Master tým
 * má vždy nejvyšší tarif, kdo nemá platné předplatné, má Zdarma.
 */
final class Tarif
{
    public const ZDARMA = 'zdarma';
    public const STAVEBNIK = 'stavebnik';
    public const PROFI = 'profi';

    /** Placené tarify od nejvyššího. */
    public const PLACENE = [self::PROFI, self::STAVEBNIK];

    public const OBDOBI = ['mesic', 'rok'];

    public static function uzivatele(Uzivatel $uzivatel): string
    {
        if ($uzivatel->jeMaster()) {
            return self::PROFI;
        }

        $predplatne = $uzivatel->subscription();
        if (! $predplatne || ! $predplatne->valid()) {
            return self::ZDARMA;
        }

        foreach (self::PLACENE as $tarif) {
            $produkt = config("tarify.tarify.{$tarif}.paddle.produkt");
            if ($produkt && $predplatne->hasProduct($produkt)) {
                return $tarif;
            }
        }

        // Platné předplatné s neznámým produktem (chybí v .env, nový produkt v Paddlu).
        // Zákazník platí, takže nesmí spadnout na Zdarma → nižší placený tarif a hlášení.
        Log::error('Tarif: platné předplatné s neznámým produktem', [
            'uzivatel_id' => $uzivatel->id,
            'predplatne' => $predplatne->paddle_id,
            'produkty' => $predplatne->items->pluck('product_id')->all(),
        ]);

        return self::STAVEBNIK;
    }

    /** Limit tarifu (`kroku_denne`, `projektu`); null = bez omezení. */
    public static function limit(string $tarif, string $co): ?int
    {
        $hodnota = config("tarify.tarify.{$tarif}.{$co}");

        return $hodnota === null ? null : (int) $hodnota;
    }

    /** Úpravy v editoru dnes (den podle časové zóny aplikace). */
    public static function upravDnes(Uzivatel $uzivatel): int
    {
        return (int) DB::table('denni_upravy')
            ->where('uzivatel_id', $uzivatel->id)
            ->where('den', today()->toDateString())
            ->value('pocet');
    }

    /** Kolik úprav dnes ještě zbývá; null = bez omezení. */
    public static function zbyvaUprav(Uzivatel $uzivatel, ?string $tarif = null): ?int
    {
        $limit = self::limit($tarif ?? self::uzivatele($uzivatel), 'kroku_denne');

        return $limit === null ? null : max(0, $limit - self::upravDnes($uzivatel));
    }

    /** Připočte úpravy k dnešku — jeden dotaz, při souběžném ukládání se nic neztratí. */
    public static function zapocitejUpravy(Uzivatel $uzivatel, int $pocet): void
    {
        if ($pocet <= 0) {
            return;
        }

        DB::table('denni_upravy')->upsert(
            [['uzivatel_id' => $uzivatel->id, 'den' => today()->toDateString(), 'pocet' => $pocet]],
            ['uzivatel_id', 'den'],
            ['pocet' => DB::raw('pocet + ' . $pocet)],
        );
    }

    public static function pocetProjektu(Uzivatel $uzivatel): int
    {
        return KonceptV3::where('uzivatel_id', $uzivatel->id)->count();
    }

    public static function muzeZalozitProjekt(Uzivatel $uzivatel): bool
    {
        $limit = self::limit(self::uzivatele($uzivatel), 'projektu');

        return $limit === null || self::pocetProjektu($uzivatel) < $limit;
    }

    /** Tarif a limity pro editor (initialData.limit) a stránku předplatného. */
    public static function stav(Uzivatel $uzivatel): array
    {
        $tarif = self::uzivatele($uzivatel);

        return [
            'tarif' => $tarif,
            'kroku_denne' => self::limit($tarif, 'kroku_denne'),
            'zbyva' => self::zbyvaUprav($uzivatel, $tarif),
            'projektu' => self::limit($tarif, 'projektu'),
            'pocet_projektu' => self::pocetProjektu($uzivatel),
            'predplatne_url' => route('app.predplatne'),
        ];
    }

    /** Jsou platby nastavené (klíče a ID cen v .env)? Bez nich se tarify jen ukazují. */
    public static function platbyZapnute(): bool
    {
        if (! config('cashier.api_key') || ! config('cashier.client_side_token')) {
            return false;
        }
        foreach (self::PLACENE as $tarif) {
            foreach (self::OBDOBI as $obdobi) {
                if (! self::cenaPaddle($tarif, $obdobi)) {
                    return false;
                }
            }
        }

        return true;
    }

    /** ID ceny v Paddlu (pri_…) pro tarif a období (`mesic`, `rok`). */
    public static function cenaPaddle(string $tarif, string $obdobi): ?string
    {
        return config("tarify.tarify.{$tarif}.paddle.{$obdobi}") ?: null;
    }

    /** Tarif a období podle ID ceny v Paddlu; null = cena není v .env. */
    public static function podleCeny(?string $cenaId): ?array
    {
        foreach (self::PLACENE as $tarif) {
            foreach (self::OBDOBI as $obdobi) {
                if ($cenaId && self::cenaPaddle($tarif, $obdobi) === $cenaId) {
                    return ['tarif' => $tarif, 'obdobi' => $obdobi];
                }
            }
        }

        return null;
    }

    /** Měna ceníku podle země — CZ platí v Kč, ostatní v eurech (stejně jako ceny v Paddlu). */
    public static function mena(?string $zeme = null): string
    {
        return ($zeme ?? Lokalizace::zeme()) === 'CZ' ? 'CZK' : 'EUR';
    }

    /** Cena tarifu z ceníku (config tarify.ceny); null u Zdarma. */
    public static function cena(string $tarif, string $obdobi, string $mena): ?float
    {
        $cena = config("tarify.ceny.{$mena}.{$tarif}.{$obdobi}");

        return $cena === null ? null : (float) $cena;
    }

    /**
     * Částka k zobrazení: česky „1 490 Kč“, „9,90 €“, anglicky „CZK 1,490“, „€9.90“.
     * Celé částky bez desetin. Bez ext-intl (lokálně ji nemáme).
     */
    public static function castka(float $castka, string $mena): string
    {
        $desetiny = fmod($castka, 1.0) == 0.0 ? 0 : 2;
        $nbsp = "\u{00A0}";

        if (app()->getLocale() === 'en') {
            $cislo = number_format($castka, $desetiny, '.', ',');

            return $mena === 'EUR' ? '€' . $cislo : $mena . $nbsp . $cislo;
        }

        $cislo = number_format($castka, $desetiny, ',', $nbsp);

        return $cislo . $nbsp . match ($mena) {
            'CZK' => 'Kč',
            'EUR' => '€',
            default => $mena,
        };
    }
}
