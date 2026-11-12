<?php

namespace App\Http\Controllers;

use App\Models\Konkurent;
use App\Support\KonkurenceSrovnani;
use App\Support\Lokalizace;

/**
 * Veřejné srovnávací stránky (modules/srovnani.md): přehled nástrojů, profil nástroje a „X vs TupTuDu“.
 * Vše z analýzy konkurence v DB, jen sledované aplikace se stránkou v jazyce (Konkurent::maStranku)
 * a jen hodnoty s dokladem (KonkurenceSrovnani ve veřejném režimu).
 */
class SrovnaniController extends Controller
{
    private const PRIPONA_VS = '-vs-tuptudu';

    /** Adresa přehledu v jazyce. */
    public static function prehledAdresa(string $jazyk): string
    {
        return Lokalizace::adresaWebu('/' . config('srovnani.segmenty.' . $jazyk), $jazyk);
    }

    /** Adresa profilu nebo srovnání s TupTuDu. */
    public static function adresa(Konkurent $k, string $jazyk, bool $vs = false): string
    {
        return Lokalizace::adresaWebu('/' . config('srovnani.segmenty.' . $jazyk) . '/' . $k->adresa . ($vs ? self::PRIPONA_VS : ''), $jazyk);
    }

    /** Jazykové verze stránky konkurenta: kód => adresa. */
    public static function verze(Konkurent $k, bool $vs): array
    {
        $verze = [];
        foreach (config('srovnani.jazyky') as $j) {
            if ($k->maStranku($j)) {
                $verze[$j] = self::adresa($k, $j, $vs);
            }
        }

        return $verze;
    }

    /** Verze přehledu: jazyky, kde je aspoň jeden nástroj. */
    public static function verzePrehledu(): array
    {
        // Volá ho patička na každé stránce webu, proto na 10 minut do mezipaměti (jen jazyky, adresy podle hostu)
        $jazyky = \Illuminate\Support\Facades\Cache::remember('srovnani-jazyky-prehledu', 600,
            fn () => array_values(array_filter(config('srovnani.jazyky'), fn ($j) => Konkurent::seStrankou($j)->exists())));

        return collect($jazyky)->mapWithKeys(fn ($j) => [$j => self::prehledAdresa($j)])->all();
    }

    /** Kam vedou odkazy přepínače jazyka: verze stránky, jinak přehled, jinak titulka. */
    private static function prepinac(array $verze): array
    {
        $prehledy = self::verzePrehledu();

        return collect(Lokalizace::jazyky())->mapWithKeys(fn ($j) => [$j => $verze[$j] ?? $prehledy[$j] ?? Lokalizace::adresaWebu('/', $j)])->all();
    }

    public function prehled()
    {
        $jazyk = app()->getLocale();
        $nastroje = Konkurent::seStrankou($jazyk)->get();
        abort_if($nastroje->isEmpty(), 404);
        $data = $nastroje->map(fn ($k) => KonkurenceSrovnani::pro($k, $jazyk, true));
        $verze = self::verzePrehledu();

        return view('srovnani.prehled', ['data' => $data, 'jazyk' => $jazyk, 'verze' => $verze, 'prepinac' => self::prepinac($verze)]);
    }

    public function detail(string $adresa)
    {
        $jazyk = app()->getLocale();
        $vs = str_ends_with($adresa, self::PRIPONA_VS);
        $k = Konkurent::where('adresa', $vs ? substr($adresa, 0, -strlen(self::PRIPONA_VS)) : $adresa)->first();
        abort_unless($k && $k->maStranku($jazyk), 404);
        $verze = self::verze($k, $vs);

        return view($vs ? 'srovnani.vs' : 'srovnani.profil', [
            's' => KonkurenceSrovnani::pro($k, $jazyk, true),
            'verze' => $verze,
            'prepinac' => self::prepinac($verze),
            'kanonicka' => self::adresa($k, $jazyk, $vs),
        ]);
    }
}
