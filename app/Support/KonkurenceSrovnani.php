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
 */
class KonkurenceSrovnani
{
    /** Skupiny, které na veřejnou stránku nepatří nikdy (vývoj konkurenta je hodnocení, ne fakt o produktu). */
    private const BEZ_SKUPIN = ['k'];

    /** Situace čtenáře: co chce udělat → které parametry rozhodují. Verdikt se počítá z dat. */
    public const SITUACE = [
        'pozemek' => ['Navrhnout dům na skutečném pozemku', ['f_parcely', 'f_teren_data', 'f_mapa', 'e_vykopy', 'e_zaklady']],
        'dum' => ['Nakreslit celý dům s patry, schody a střechou', ['b_patra', 'a_schody', 'b_strecha', 'a_koty', 'a_mistnosti']],
        'interier' => ['Zařídit interiér a mít hezké obrázky', ['d_vybaveni', 'd_kuchyne', 'd_koupelna', 'c_materialy', 'c_render']],
        'projektant' => ['Předat podklad projektantovi', ['g_vykres', 'g_cad', 'g_3dexport', 'a_koty', 'g_pdf']],
        'tablet' => ['Pracovat na tabletu nebo telefonu', ['h_mobil', 'a_dotyk', 'a_sken']],
        'jazyk' => ['Mít nástroj v češtině', ['h_cestina']],
    ];

    public function __construct(
        public Konkurent $konkurent,
        public ?Konkurent $my,
        public ?KonkurenceMereni $mereni,
        public $parametry,      // sledované parametry, seřazené
        public array $hodnoty,  // [konkurent_id][parametr_id] => KonkurenceHodnota
        public $sledovani,      // sledovaní konkurenti bez TupTuDu (pro „kolik nástrojů to má“)
    ) {}

    public static function pro(Konkurent $konkurent): self
    {
        $mereni = KonkurenceMereni::posledni();
        $parametry = KonkurenceParametr::serazene()->where('rezim', 'sledovat')
            ->whereNotIn('skupina', self::BEZ_SKUPIN)->get();
        $sledovani = Konkurent::where('rezim', 'sledovat')->where('klic', '!=', 'tuptudu')->get();
        $hodnoty = [];
        if ($mereni) {
            foreach (KonkurenceHodnota::where('mereni_id', $mereni->id)->whereIn('parametr_id', $parametry->pluck('id'))->get() as $h) {
                $hodnoty[$h->konkurent_id][$h->parametr_id] = $h;
            }
        }

        return new self($konkurent, Konkurent::where('klic', 'tuptudu')->first(), $mereni, $parametry, $hodnoty, $sledovani);
    }

    public function hodnota(?Konkurent $k, KonkurenceParametr $p): ?KonkurenceHodnota
    {
        return $k ? ($this->hodnoty[$k->id][$p->id] ?? null) : null;
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
        foreach ($this->parametry->where('typ', 'stav') as $p) {
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
        $param = $this->parametry->keyBy('klic');
        $vysledek = [];
        foreach (self::SITUACE as $klic => [$nazev, $klice]) {
            $x = $my = $pouzite = 0;
            $rozhoduje = [];
            foreach ($klice as $k) {
                if (! isset($param[$k])) {
                    continue;
                }
                $sx = $this->hodnota($this->konkurent, $param[$k])?->sila();
                $sm = $this->hodnota($this->my, $param[$k])?->sila();
                if ($sx === null || $sm === null) {
                    continue;
                }
                $x += $sx;
                $my += $sm;
                $pouzite++;
                $rozhoduje[] = $param[$k];
            }
            if ($pouzite === 0) {
                continue;
            }
            $vysledek[$klic] = [
                'nazev' => $nazev,
                'kdo' => $x === $my ? 'oba' : ($x > $my ? 'x' : 'my'),
                'rozhoduje' => $rozhoduje,
            ];
        }

        return $vysledek;
    }

    /** Kolik zobrazených hodnot nemá doklad (v náhledu varování, na webu by se nezobrazily). */
    public function bezDokladu(array $konkurenti): int
    {
        $n = 0;
        foreach ($konkurenti as $k) {
            foreach ($this->parametry as $p) {
                $h = $this->hodnota($k, $p);
                if ($h && ! $h->lzeZverejnit()) {
                    $n++;
                }
            }
        }

        return $n;
    }

    /** Ostatní sledované nástroje ze stejného segmentu (odkazy „Podobné nástroje“). */
    public function podobne()
    {
        return $this->sledovani->where('segment', $this->konkurent->segment)->where('id', '!=', $this->konkurent->id)->values();
    }
}
