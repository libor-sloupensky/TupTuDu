<?php

namespace App\Support;

use App\Models\KonceptV3;
use App\Models\Uzivatel;
use App\Services\Koncept\PdfPodkladService;
use Carbon\CarbonImmutable;
use DateTimeZone;
use Illuminate\Support\Facades\Storage;

/**
 * Vzorový projekt (modules/aplikace.md, část Vzorový projekt).
 *
 * Šablona je jeden projekt master týmu (`vzor = sablona`), používá se i na obrázky do článků. Každý uživatel
 * má její kopii (`vzor = kopie`): úpravy v ní nestojí nic z limitu tarifu, nejde smazat a každou noc
 * ve 3:00 jeho místního času se vrátí do stavu šablony.
 *
 * Šetrně k serveru (většina kopií se nikdy nepoužije): v noci (`vzor:obnovit`) se sahá jen na kopie, ve kterých
 * uživatel od poslední obnovy něco změnil. Nepoužitá kopie se nepřepisuje, novou podobu šablony dostane
 * až při otevření (`obnovPriOtevreni`).
 */
class VzorovyProjekt
{
    /** Hodina místního času, kdy se kopie vrací do stavu šablony. */
    public const HODINA_OBNOVY = 3;

    public static function sablona(): ?KonceptV3
    {
        return KonceptV3::where('vzor', 'sablona')->latest('id')->first();
    }

    public static function kopie(Uzivatel $uzivatel): ?KonceptV3
    {
        return KonceptV3::where('uzivatel_id', $uzivatel->id)->where('vzor', 'kopie')->first();
    }

    /** Kopie uživatele; když ještě není, vznikne ze šablony. Bez šablony nic. */
    public static function zajistiKopii(Uzivatel $uzivatel): ?KonceptV3
    {
        if ($kopie = self::kopie($uzivatel)) {
            return $kopie;
        }
        // Kopii dostane i autor šablony: v aplikaci má vidět totéž co ostatní uživatelé
        $sablona = self::sablona();
        if (! $sablona) {
            return null;
        }

        $kopie = new KonceptV3(['uzivatel_id' => $uzivatel->id, 'verze' => 1, 'faze' => $sablona->faze, 'chat' => []]);
        $kopie->vzor = 'kopie';
        $kopie->kod = KonceptV3::novyKod();
        self::prevezmiSablonu($kopie, $sablona, $uzivatel);
        // Bez událostí modelu: kopie není nový projekt uživatele (událost projekt_zalozen pro GA4)
        KonceptV3::withoutEvents(fn () => self::ulozBezZmeny($kopie));

        return $kopie;
    }

    /** Vrátí kopii do stavu šablony. Vyšší verze zastaví editor otevřený se starým stavem (dialog konfliktu). */
    public static function obnov(KonceptV3 $kopie): bool
    {
        $sablona = self::sablona();
        if (! $sablona || $kopie->vzor !== 'kopie') {
            return false;
        }
        self::prevezmiSablonu($kopie, $sablona, $kopie->uzivatel);
        $kopie->verze = (int) $kopie->verze + 1;
        self::ulozBezZmeny($kopie);

        return true;
    }

    /**
     * Při otevření kopie: když od poslední obnovy minula 3:00 a mezitím ji uživatel upravil nebo se změnila
     * šablona, vrátí se do stavu šablony. Jinak se nic nezapisuje.
     */
    public static function obnovPriOtevreni(KonceptV3 $kopie): void
    {
        if ($kopie->vzor !== 'kopie' || ! self::jeKObnove($kopie)) {
            return;
        }
        $sablona = self::sablona();
        $zmenena = $kopie->upraveno && $kopie->vzor_obnoveno_v && $kopie->upraveno->greaterThan($kopie->vzor_obnoveno_v);
        $novejsiSablona = $sablona?->upraveno && $kopie->vzor_obnoveno_v && $sablona->upraveno->greaterThan($kopie->vzor_obnoveno_v);
        if ($zmenena || $novejsiSablona) {
            self::obnov($kopie);
        }
    }

    /** Minula od poslední obnovy kopie 3:00 místního času uživatele? */
    public static function jeKObnove(KonceptV3 $kopie): bool
    {
        return ! $kopie->vzor_obnoveno_v || $kopie->vzor_obnoveno_v->lessThan(self::posledniTermin($kopie->uzivatel));
    }

    /** Obnova nastaví „upraveno“ stejně jako čas obnovy, jinak by kopie vypadala jako upravená uživatelem. */
    private static function ulozBezZmeny(KonceptV3 $kopie): void
    {
        $ted = now();
        $kopie->vzor_obnoveno_v = $ted;
        $kopie->upraveno = $ted;
        $kopie->timestamps = false;
        $kopie->save();
        $kopie->timestamps = true;
    }

    private static function prevezmiSablonu(KonceptV3 $kopie, KonceptV3 $sablona, ?Uzivatel $uzivatel): void
    {
        $kopie->nazev = __('projekty.vzor_nazev', [], $uzivatel?->preferredLocale());
        $kopie->data = $sablona->data;
        $kopie->metadata = $sablona->metadata;
        $kopie->historie = [];
        $kopie->historie_aktualni = null;
        $kopie->vzor_obnoveno_v = now();
    }

    /** Kdy se má kopie naposledy obnovit: poslední 3:00 místního času uživatele (v UTC). */
    public static function posledniTermin(?Uzivatel $uzivatel): CarbonImmutable
    {
        $mistne = CarbonImmutable::now(self::casovaZona($uzivatel));
        $termin = $mistne->setTime(self::HODINA_OBNOVY, 0);
        if ($mistne->lessThan($termin)) {
            $termin = $termin->subDay();
        }

        return $termin->utc();
    }

    /** Časové pásmo podle země uživatele; u zemí s více pásmy evropské. Bez země pásmo aplikace. */
    public static function casovaZona(?Uzivatel $uzivatel): string
    {
        $zeme = strtoupper((string) ($uzivatel?->zeme ?? ''));
        if (strlen($zeme) === 2) {
            $pasma = DateTimeZone::listIdentifiers(DateTimeZone::PER_COUNTRY, $zeme);
            $evropske = array_values(array_filter($pasma, fn ($p) => str_starts_with($p, 'Europe/')));
            if ($evropske || $pasma) {
                return ($evropske ?: $pasma)[0];
            }
        }

        return config('app.timezone');
    }

    /** Cesta k souboru podkladu šablony, ať ho kopie ostatních uživatelů načtou (podklady jsou po uživatelích). */
    public static function cestaPodkladu(string $otisk): ?string
    {
        $sablona = self::sablona();
        if (! $sablona) {
            return null;
        }
        $meta = $sablona->metadata ?? [];
        $otisky = array_filter([$meta['podklad']['otisk'] ?? null, ...array_map(fn ($p) => $p['otisk'] ?? null, array_filter((array) ($meta['podklady'] ?? [])))]);
        if (! in_array($otisk, $otisky, true)) {
            return null;
        }
        foreach (['pdf', 'png', 'jpg', 'jpeg'] as $pripona) {
            $rel = PdfPodkladService::SLOZKA . '/' . $sablona->uzivatel_id . "/$otisk.$pripona";
            if (Storage::exists($rel)) {
                return $rel;
            }
        }

        return null;
    }
}
