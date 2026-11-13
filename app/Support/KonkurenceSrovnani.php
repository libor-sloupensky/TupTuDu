<?php

namespace App\Support;

use App\Models\KonkurenceHodnota;
use App\Models\KonkurenceMereni;
use App\Models\KonkurenceParametr;
use App\Models\Konkurent;

/**
 * Data pro srovnávací stránky (modules/srovnani.md): profil nástroje a „X vs TupTuDu“.
 * Všechno se počítá z posledního měření analýzy konkurence, jen z parametrů a aplikací v režimu Sledovat.
 * Plusy a mínusy jsou souměrné: co má X lépe, je plus X, co má lépe TupTuDu, je plus TupTuDu. Nic se neupravuje ručně.
 * Veřejný režim ($verejne) bere jen hodnoty s dokladem a ověřením do 6 měsíců, ostatní jsou „nezjištěno“.
 */
class KonkurenceSrovnani
{
    /** Skupiny, které na veřejnou stránku nepatří nikdy (vývoj konkurenta je hodnocení, ne fakt o produktu). */
    private const BEZ_SKUPIN = ['k'];

    /** Parametry, které se ukazují jen v části Ceny, ne v tabulce vlastností. */
    public const CENY = ['j_cenik', 'j_limity_zdarma', 'j_cena_min'];

    /** Situace čtenáře: co chce udělat → které parametry rozhodují (název v lang srovnani.situace.*). */
    public const SITUACE = [
        'pozemek' => ['f_parcely', 'f_teren_data', 'f_mapa', 'e_vykopy', 'e_zaklady'],
        'dum' => ['b_patra', 'a_schody', 'b_strecha', 'a_koty', 'a_mistnosti'],
        'interier' => ['d_vybaveni', 'd_kuchyne', 'd_koupelna', 'c_materialy', 'c_render'],
        'projektant' => ['g_cad', 'g_3dexport', 'a_koty', 'g_pdf'],
        'tablet' => ['h_mobil', 'a_dotyk', 'a_sken'],
        'zdarma' => ['h_zdarma'],
    ];

    public function __construct(
        public Konkurent $konkurent,
        public ?Konkurent $my,
        public ?KonkurenceMereni $mereni,
        public $parametry,      // sledované parametry, seřazené
        public array $hodnoty,  // [konkurent_id][parametr_id] => KonkurenceHodnota
        public $sledovani,      // sledovaní konkurenti bez TupTuDu (pro „kolik nástrojů to má“)
        public string $jazyk = 'cs',
        public bool $verejne = false,
    ) {}

    public static function pro(Konkurent $konkurent, string $jazyk = 'cs', bool $verejne = false): self
    {
        $mereni = KonkurenceMereni::posledni();
        $parametry = KonkurenceParametr::serazene()->where('rezim', 'sledovat')
            ->whereNotIn('skupina', self::BEZ_SKUPIN)->get();
        $sledovani = Konkurent::where('rezim', 'sledovat')->where('klic', '!=', 'tuptudu')->orderBy('poradi')->get();
        $hodnoty = [];
        if ($mereni) {
            $podleId = $parametry->keyBy('id');
            foreach (KonkurenceHodnota::where('mereni_id', $mereni->id)->whereIn('parametr_id', $parametry->pluck('id'))->get() as $h) {
                $h->setRelation('parametr', $podleId[$h->parametr_id]);
                $hodnoty[$h->konkurent_id][$h->parametr_id] = $h;
            }
        }

        return new self($konkurent, Konkurent::where('klic', 'tuptudu')->first(), $mereni, $parametry, $hodnoty, $sledovani, $jazyk, $verejne);
    }

    /** Parametry pro tabulku vlastností (bez cen). */
    public function vlastnosti()
    {
        return $this->parametry->whereNotIn('klic', self::CENY);
    }

    public function parametr(string $klic): ?KonkurenceParametr
    {
        return $this->parametry->firstWhere('klic', $klic);
    }

    /** Hodnota; ve veřejném režimu jen doložená. */
    public function hodnota(?Konkurent $k, ?KonkurenceParametr $p): ?KonkurenceHodnota
    {
        $h = ($k && $p) ? ($this->hodnoty[$k->id][$p->id] ?? null) : null;
        if ($h && $this->verejne && ! $h->lzeZverejnit()) {
            return null;
        }

        return $h;
    }

    /** Poznámka k hodnotě pro čtenáře: veřejná v jazyce stránky; v náhledu záložně interní. */
    public function poznamka(?KonkurenceHodnota $h): ?string
    {
        if (! $h) {
            return null;
        }

        return $h->verejne('p', $this->jazyk) ?? ($this->verejne ? null : $h->poznamka);
    }

    /** Text hodnoty typu text (ceník, limity) v jazyce stránky; v náhledu záložně interní. */
    public function text(?KonkurenceHodnota $h): ?string
    {
        if (! $h) {
            return null;
        }

        return $h->verejne('t', $this->jazyk) ?? ($this->verejne ? null : $h->text);
    }

    /** Kolik sledovaných nástrojů parametr má (ano / částečně) ze všech, u kterých je hodnota zjištěná. */
    public function trh(KonkurenceParametr $p): array
    {
        $ma = $castecne = $zjisteno = 0;
        foreach ($this->sledovani as $k) {
            $s = $this->hodnota($k, $p)?->sila();
            if ($s === null) {
                continue;
            }
            $zjisteno++;
            $ma += $s === 2 ? 1 : 0;
            $castecne += $s === 1 ? 1 : 0;
        }

        return compact('ma', 'castecne', 'zjisteno');
    }

    /** Plusy X, plusy TupTuDu a shody z parametrů typu má / nemá, kde je hodnota zjištěná u obou. */
    public function rozdily(): array
    {
        $plusX = $plusMy = $shoda = $nezjisteno = [];
        foreach ($this->vlastnosti()->where('typ', 'stav') as $p) {
            $x = $this->hodnota($this->konkurent, $p);
            $my = $this->hodnota($this->my, $p);
            $sx = $x?->sila();
            $sm = $my?->sila();
            if ($sx === null || $sm === null) {
                $nezjisteno[] = $p;
                continue;
            }
            $radek = ['p' => $p, 'x' => $x, 'my' => $my];
            if ($sx > $sm) {
                $plusX[] = $radek;
            } elseif ($sm > $sx) {
                $plusMy[] = $radek;
            } elseif ($sx > 0) {
                $shoda[] = $radek;
            }
        }

        return compact('plusX', 'plusMy', 'shoda', 'nezjisteno');
    }

    /** Verdikt situací: součet síly v rozhodujících parametrech, které jsou sledované a zjištěné u obou. */
    public function situace(): array
    {
        $vysledek = [];
        foreach (self::SITUACE as $klic => $klice) {
            $x = $my = 0;
            $rozhoduje = [];
            foreach ($klice as $k) {
                $p = $this->parametr($k);
                $sx = $this->hodnota($this->konkurent, $p)?->sila();
                $sm = $this->hodnota($this->my, $p)?->sila();
                if ($sx === null || $sm === null) {
                    continue;
                }
                $x += $sx;
                $my += $sm;
                $rozhoduje[] = $p;
            }
            if (! $rozhoduje) {
                continue;
            }
            $vysledek[$klic] = ['kdo' => $x === $my ? 'oba' : ($x > $my ? 'x' : 'my'), 'rozhoduje' => $rozhoduje];
        }

        return $vysledek;
    }

    /** Kolik hodnot nemá doklad (v náhledu varování, na webu by se nezobrazily). */
    public function bezDokladu(array $konkurenti): int
    {
        $n = 0;
        foreach ($konkurenti as $k) {
            foreach ($this->parametry as $p) {
                $h = $this->hodnoty[$k->id][$p->id] ?? null;
                if ($h && ! $h->lzeZverejnit()) {
                    $n++;
                }
            }
        }

        return $n;
    }

    /** Ostatní nástroje se stránkou v tomto jazyce (ve veřejném režimu), jinak sledovaní ze stejného segmentu. */
    public function podobne()
    {
        if ($this->verejne) {
            return $this->sledovani->filter(fn ($k) => $k->id !== $this->konkurent->id && $k->maStranku($this->jazyk))->values();
        }

        return $this->sledovani->where('segment', $this->konkurent->segment)->where('id', '!=', $this->konkurent->id)->values();
    }

    /**
     * Bublina u názvu vlastnosti: co znamená „má“, „částečně“ a „nemá“ (kritéria analýzy, česky). Interní dovětky
     * („Jen interně: …“) se odstraní. V jiných jazycích zatím krátký popis, dokud se kritéria nepřeloží.
     */
    public function tip(KonkurenceParametr $p): string
    {
        // Přeložená kritéria v lang/*/srovnani.php (kr.*); nový parametr bez překladu: české kritérium, jinak popis
        if (\Illuminate\Support\Facades\Lang::has('srovnani.kr.' . $p->klic)) {
            return __('srovnani.kr.' . $p->klic);
        }
        if ($this->jazyk === 'cs' && $p->kriteria) {
            return trim(preg_replace('/\s*Jen interně:.*$/us', '', $p->kriteria));
        }

        return \Illuminate\Support\Facades\Lang::has('srovnani.pp.' . $p->klic) ? __('srovnani.pp.' . $p->klic) : (string) $p->popis;
    }

    /** Datum posledního ověření hodnot konkurenta, které se na stránce ukazují (do řádku autorství). */
    public function overeno(): ?\Carbon\Carbon
    {
        $datum = null;
        foreach ($this->parametry as $p) {
            $h = $this->hodnota($this->konkurent, $p);
            if ($h && $h->overeno && (! $datum || $h->overeno->gt($datum))) {
                $datum = $h->overeno;
            }
        }

        return $datum ?? $this->mereni?->datum;
    }

    /** Zdroje (adresy výrobce) hodnot konkurenta, které se na stránce ukazují. */
    public function zdroje(Konkurent $k): array
    {
        $z = [];
        foreach ($this->parametry as $p) {
            $h = $this->hodnota($k, $p);
            if ($h && str_starts_with((string) $h->zdroj, 'http')) {
                $z[] = $h->zdroj;
            }
        }

        return array_values(array_unique($z));
    }
}
