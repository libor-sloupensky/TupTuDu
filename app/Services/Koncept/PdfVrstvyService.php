<?php

namespace App\Services\Koncept;

/**
 * Čte z PDF kresbu rozdělenou podle pojmenovaných hladin (optional content).
 *
 * Výkresy z CADu nesou hladiny jako „Stěna vnější.3D“, „Zdivo - obvodové“,
 * „Kóty výškové“ nebo „SA_27A_okna_windows“. Převod do SVG (pdftocairo) tuhle
 * informaci zahodí, takže rozpoznávání stěn pak pracně odděluje stěny od kót,
 * šraf a nábytku heuristikami. Z hladin to jde přečíst přímo.
 *
 * Záměrně minimální čtečka: jde jí o souřadnice úseček a název hladiny,
 * ne o věrné vykreslení. Souřadnice vycházejí ve stejné soustavě jako SVG
 * z poppleru (body PDF, počátek vlevo nahoře), aby se daly spárovat.
 *
 * Ne každé PDF hladiny má — vytištěné/„zploštěné“ výkresy (D.1.1.b-01) žádné
 * nemají a vrací se prázdný seznam. Volající s tím musí počítat.
 */
class PdfVrstvyService
{
    /** Hladiny, na kterých bývají stěny. Shoda = kreslí se jen z nich. */
    public const KMENY_STEN = [
        'stena', 'stěna', 'zdivo', 'zed', 'zeď', 'pricka', 'příčka',
        'wall', 'masonry', 'sloup', 'column', 'konstrukce', 'nosne', 'nosné',
    ];

    /** Hladiny, které stěna nikdy není. Použije se, když se stěnová hladina nenajde. */
    public const KMENY_SUMU = [
        'kot', 'kót', 'popis', 'text', 'srafy', 'šraf', 'hatch', 'dim',
        'nabytek', 'nábytek', 'furniture', 'zarizovac', 'zařizovac',
        'sanit', 'kuchyn', 'kuchyň', 'zony', 'zóny', 'razitko', 'razítko',
        'teren', 'terén', 'krov', 'znacka', 'značka', 'anotace', 'pozn',
    ];

    /** Hladiny s okny — zdroj otvorů, ne stěn. */
    public const KMENY_OKEN = ['okno', 'okna', 'window'];

    /** Hladiny s dveřmi — zdroj otvorů, ne stěn. */
    public const KMENY_DVERI = ['dvere', 'dveře', 'door', 'zarubn'];

    /** @var array<int, array{dict: string, stream: string}> */
    private array $objekty = [];

    /** @var array<int, string> */
    private array $zabalene = [];

    /**
     * Kresba strany rozdělená podle hladin.
     *
     * @return array{
     *     hladiny: array<int, array{nazev: string, role: string, usecky: array<int, array{0: float, 1: float, 2: float, 3: float}>}>,
     *     sirka: float, vyska: float, otoceni: int
     * }
     */
    public function hladiny(string $absCesta, int $strana = 1): array
    {
        $prazdne = ['hladiny' => [], 'sirka' => 0.0, 'vyska' => 0.0, 'otoceni' => 0];

        $data = @file_get_contents($absCesta);
        if ($data === false) {
            return $prazdne;
        }

        $this->objekty = $this->objekty($data);
        $this->zabalene = $this->zabalene();

        $nazvy = $this->nazvyHladin();
        if (!$nazvy) {
            return $prazdne;
        }

        $strankaObj = $this->strankaObjekt($strana);
        if ($strankaObj === null) {
            return $prazdne;
        }

        $slovnik = $this->objekty[$strankaObj]['dict'];
        [$sirka, $vyska] = $this->mediaBox($slovnik, $data);
        $otoceni = $this->otoceni($slovnik, $data);

        // Otočená strana se vykresluje na zrcadlený formát.
        $sirkaVen = in_array($otoceni, [90, 270], true) ? $vyska : $sirka;
        $vyskaVen = in_array($otoceni, [90, 270], true) ? $sirka : $vyska;

        $vlastnosti = $this->mapaVlastnosti($slovnik);
        $kresba = $this->obsahStrany($slovnik);
        if (trim($kresba) === '') {
            return $prazdne;
        }

        $sberac = new VrstvySberac($sirka, $vyska, $otoceni);
        $this->projdi($kresba, $this->zdroje($slovnik), $nazvy, $vlastnosti, $sberac, [1.0, 0.0, 0.0, 1.0, 0.0, 0.0], null, 0);

        $hladiny = [];
        foreach ($sberac->usecky as $nazev => $usecky) {
            $hladiny[] = ['nazev' => $nazev, 'role' => self::role($nazev), 'usecky' => $usecky];
        }

        return ['hladiny' => $hladiny, 'sirka' => $sirkaVen, 'vyska' => $vyskaVen, 'otoceni' => $otoceni];
    }

    /**
     * Hladiny připravené pro rozpoznávání stěn.
     *
     * Dvě různé situace, a je potřeba je rozlišit, protože zacházet se všemi
     * výkresy stejně nejde:
     *  - CAD stěny pojmenoval („Stěna vnější.3D“, „Zdivo - obvodové“) a jde na
     *    nich většina kresby → `jen`, pracuje se VÝHRADNĚ s nimi;
     *  - stěny leží na bezejmenných hladinách („0“, „0_ROZ-0_25“) → `bez`,
     *    odebere se aspoň prokazatelný šum (kóty, popisky, šrafy).
     *
     * Vrací null, když výkres hladiny nemá (vytištěná/zploštělá PDF).
     *
     * @return array{rezim: string, usecky: array<int, array<int, float>>, hladiny: array<int, string>, okna: array<int, array<int, float>>}|null
     */
    public function proRozpoznani(string $absCesta, int $strana = 1): ?array
    {
        $v = $this->hladiny($absCesta, $strana);
        if (!$v['hladiny']) {
            return null;
        }

        $celkem = 0;
        $stenovych = 0;
        foreach ($v['hladiny'] as $h) {
            $celkem += count($h['usecky']);
            if ($h['role'] === 'stena') {
                $stenovych += count($h['usecky']);
            }
        }
        if ($celkem === 0) {
            return null;
        }

        // Pod čtvrtinou kresby je „stěnová“ hladina spíš jen doplněk (jedna
        // příčka navíc) a výběr jen podle ní by zahodil celý dům.
        $rezim = $stenovych / $celkem >= 0.25 ? 'jen' : 'bez';
        $vybrane = $rezim === 'jen' ? ['stena', 'dvere'] : ['sum'];

        $usecky = [];
        $okna = [];
        $nazvy = [];
        foreach ($v['hladiny'] as $h) {
            if (in_array($h['role'], $vybrane, true)) {
                $nazvy[] = $h['nazev'];
                array_push($usecky, ...$h['usecky']);
            }
            if ($h['role'] === 'okno') {
                array_push($okna, ...$h['usecky']);
            }
        }
        if (!$usecky) {
            return null;
        }

        return ['rezim' => $rezim, 'usecky' => $usecky, 'hladiny' => $nazvy, 'okna' => $okna];
    }

    /** K čemu hladina podle názvu je: stena / okno / dvere / sum / neznama. */
    public static function role(string $nazev): string
    {
        $maly = mb_strtolower($nazev);
        $ma = fn (array $kmeny) => (bool) array_filter($kmeny, fn ($k) => str_contains($maly, $k));

        // Pořadí rozhoduje: „Kóty — stavební povolení“ je kóta, i když obsahuje
        // „stavebn“, a „2D - výplně okna“ je okno, ne stěna.
        if ($ma(self::KMENY_SUMU)) {
            return 'sum';
        }
        if ($ma(self::KMENY_OKEN)) {
            return 'okno';
        }
        if ($ma(self::KMENY_DVERI)) {
            return 'dvere';
        }
        if ($ma(self::KMENY_STEN)) {
            return 'stena';
        }

        return 'neznama';
    }

    /** Objekty na nejvyšší úrovni souboru: číslo → slovník + nerozbalený stream. */
    private function objekty(string $data): array
    {
        $ven = [];
        $pos = 0;
        while (preg_match('~(\d+)\s+(\d+)\s+obj~', $data, $m, PREG_OFFSET_CAPTURE, $pos)) {
            $cislo = (int) $m[1][0];
            $zacatek = $m[0][1] + strlen($m[0][0]);
            $konec = strpos($data, 'endobj', $zacatek);
            if ($konec === false) {
                break;
            }
            $telo = substr($data, $zacatek, $konec - $zacatek);
            $stream = '';
            if (($sp = strpos($telo, 'stream')) !== false) {
                $z = $sp + 6;
                while ($z < strlen($telo) && ($telo[$z] === "\r" || $telo[$z] === "\n")) {
                    $z++;
                }
                $ep = strpos($telo, 'endstream', $z);
                if ($ep !== false) {
                    $stream = substr($telo, $z, $ep - $z);
                    $telo = substr($telo, 0, $sp);
                }
            }
            $ven[$cislo] = ['dict' => $telo, 'stream' => $stream];
            $pos = $konec + 6;
        }

        return $ven;
    }

    /**
     * Objekty zabalené v object streamech (/Type /ObjStm).
     *
     * ARCHICAD sem balí celé slovníky hladin, takže bez rozbalení se v souboru
     * žádná hladina nenajde a filtrování podle vrstev tiše nedělá nic.
     */
    private function zabalene(): array
    {
        $ven = [];
        foreach ($this->objekty as $o) {
            if (!str_contains($o['dict'], '/ObjStm')) {
                continue;
            }
            $obsah = $this->rozbal($o['stream']);
            if ($obsah === '') {
                continue;
            }
            preg_match('~/N\s+(\d+)~', $o['dict'], $mn);
            preg_match('~/First\s+(\d+)~', $o['dict'], $mf);
            $pocet = (int) ($mn[1] ?? 0);
            $first = (int) ($mf[1] ?? 0);
            $cisla = preg_split('~\s+~', trim(substr($obsah, 0, $first)), -1, PREG_SPLIT_NO_EMPTY) ?: [];
            for ($i = 0; $i < $pocet; $i++) {
                $num = (int) ($cisla[$i * 2] ?? 0);
                $od = (int) ($cisla[$i * 2 + 1] ?? 0);
                $do = isset($cisla[($i + 1) * 2 + 1]) ? (int) $cisla[($i + 1) * 2 + 1] : strlen($obsah) - $first;
                $ven[$num] = substr($obsah, $first + $od, $do - $od);
            }
        }

        return $ven;
    }

    /** Slovník objektu, ať leží kdekoli. */
    private function slovnik(int $cislo): string
    {
        return ($this->zabalene[$cislo] ?? '') . ($this->objekty[$cislo]['dict'] ?? '');
    }

    /** Číslo objektu hladiny → její název. */
    private function nazvyHladin(): array
    {
        $nazvy = [];
        foreach ($this->objekty as $c => $o) {
            $this->nazevZObjektu($c, $o['dict'], $nazvy);
        }
        foreach ($this->zabalene as $c => $t) {
            $this->nazevZObjektu($c, $t, $nazvy);
        }

        return $nazvy;
    }

    private function nazevZObjektu(int $cislo, string $telo, array &$nazvy): void
    {
        if (!str_contains($telo, '/OCG')) {
            return;
        }
        if (preg_match('~/Name\s*\(([^)]*)\)~', $telo, $m)) {
            $nazvy[$cislo] = $this->dekodujNazev($m[1]);
        }
    }

    /**
     * Název hladiny z PDF řetězce.
     *
     * PDF volí kódování podle obsahu: co se vejde do jednobajtového
     * PDFDocEncoding (≈ CP1252), uloží se tak — „Kóty výškové“. Zbytek jde
     * v UTF-16 s BOM — „Stěna vnější.3D“. Bez obou převodů česká jména
     * neprojdou slovníkem a všechny hladiny propadnou jako neznámé.
     */
    private function dekodujNazev(string $syrovy): string
    {
        $text = preg_replace_callback('~\\\\([0-7]{1,3}|.)~', function ($m) {
            if (preg_match('~^[0-7]{1,3}$~', $m[1])) {
                return chr(octdec($m[1]));
            }

            return match ($m[1]) {
                'n' => "\n", 'r' => "\r", 't' => "\t", 'b' => "\x08", 'f' => "\x0C",
                default => $m[1],
            };
        }, $syrovy) ?? $syrovy;

        if (str_starts_with($text, "\xFE\xFF")) {
            $prevod = @mb_convert_encoding(substr($text, 2), 'UTF-8', 'UTF-16BE');

            return is_string($prevod) && $prevod !== '' ? $prevod : $text;
        }

        if (!mb_check_encoding($text, 'UTF-8') || preg_match('~[\x80-\xFF]~', $text)) {
            $prevod = @mb_convert_encoding($text, 'UTF-8', 'Windows-1252');
            if (is_string($prevod) && $prevod !== '') {
                return $prevod;
            }
        }

        return $text;
    }

    /**
     * Značka v kresbě (/MC0, /oc3…) → číslo objektu hladiny.
     *
     * Jméno značky si volí generátor PDF: ARCHICAD píše /MCn, Revit /ocn.
     * Proto se čte celý slovník /Properties, ne konkrétní předpona.
     */
    private function mapaVlastnosti(string $slovnikStrany): array
    {
        $mapa = [];
        foreach ($this->zdroje($slovnikStrany) as $zdroj) {
            $i = strpos($zdroj, '/Properties');
            if ($i === false) {
                continue;
            }
            $usek = $this->vyrizniSlovnik($zdroj, $i + strlen('/Properties'));
            if (preg_match_all('~/([A-Za-z0-9_]+)\s+(\d+)\s+0\s+R~', $usek, $m, PREG_SET_ORDER)) {
                foreach ($m as $x) {
                    $mapa[$x[1]] = (int) $x[2];
                }
            }
        }

        return $mapa;
    }

    /** Slovníky, ve kterých se hledají prostředky strany (sama strana + její /Resources). */
    private function zdroje(string $slovnikStrany): array
    {
        $ven = [$slovnikStrany];
        if (preg_match('~/Resources\s+(\d+)\s+0\s+R~', $slovnikStrany, $m)) {
            $ven[] = $this->slovnik((int) $m[1]);
        }

        return $ven;
    }

    /** Text slovníku `<< … >>` začínající na pozici (včetně vnořených). */
    private function vyrizniSlovnik(string $text, int $od): string
    {
        $i = strpos($text, '<<', $od);
        if ($i === false) {
            return '';
        }
        $hloubka = 0;
        for ($j = $i; $j < strlen($text) - 1; $j++) {
            if ($text[$j] === '<' && $text[$j + 1] === '<') {
                $hloubka++;
                $j++;
            } elseif ($text[$j] === '>' && $text[$j + 1] === '>') {
                $hloubka--;
                $j++;
                if ($hloubka === 0) {
                    return substr($text, $i, $j - $i + 1);
                }
            }
        }

        return substr($text, $i);
    }

    /** Číslo objektu požadované strany. */
    private function strankaObjekt(int $strana): ?int
    {
        $nalezene = [];
        foreach ($this->objekty as $c => $o) {
            if (preg_match('~/Type\s*/Page(?![a-zA-Z])~', $o['dict'])) {
                $nalezene[] = $c;
            }
        }
        sort($nalezene);

        return $nalezene[$strana - 1] ?? null;
    }

    /** Spojený obsah strany (/Contents může být pole odkazů). */
    private function obsahStrany(string $slovnik): string
    {
        if (!preg_match('~/Contents\s*(\[[^\]]*\]|\d+\s+0\s+R)~', $slovnik, $m)) {
            return '';
        }
        preg_match_all('~(\d+)\s+0\s+R~', $m[1], $mm);
        $kresba = '';
        foreach ($mm[1] as $cislo) {
            $stream = $this->objekty[(int) $cislo]['stream'] ?? '';
            if ($stream === '') {
                continue;
            }
            $kresba .= "\n" . $this->rozbal($stream);
        }

        return $kresba;
    }

    private function mediaBox(string $slovnik, string $data): array
    {
        $vzor = '~/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)~';
        if (preg_match($vzor, $slovnik, $m) || preg_match($vzor, $data, $m)) {
            return [(float) $m[3] - (float) $m[1], (float) $m[4] - (float) $m[2]];
        }

        return [0.0, 0.0];
    }

    private function otoceni(string $slovnik, string $data): int
    {
        if (preg_match('~/Rotate\s+(-?\d+)~', $slovnik, $m) || preg_match('~/Rotate\s+(-?\d+)~', $data, $m)) {
            return ((int) $m[1] % 360 + 360) % 360;
        }

        return 0;
    }

    private function rozbal(string $telo): string
    {
        $r = @gzuncompress($telo);
        if ($r === false) {
            $r = @gzinflate($telo);
        }

        return $r === false ? '' : $r;
    }

    /**
     * Projde kreslicí operátory a posbírá úsečky po hladinách.
     *
     * Rekurzivně vstupuje i do Form XObjectů (operátor `Do`) — ARCHICAD do nich
     * dává šipky kót a symboly, které by jinak zůstaly bez hladiny.
     */
    private function projdi(
        string $kresba,
        array $zdroje,
        array $nazvy,
        array $vlastnosti,
        VrstvySberac $sberac,
        array $ctm,
        ?string $hladina,
        int $hloubka,
    ): void {
        if ($hloubka > 6) {
            return;
        }

        $tokeny = preg_split('~\s+~', $kresba, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $zasobnikCTM = [];
        $zasobnikHladin = [];
        $zasobnik = [];
        $x = $y = 0.0;

        foreach ($tokeny as $t) {
            if (is_numeric($t) || ($t !== '' && ($t[0] === '/' || $t[0] === '[' || $t[0] === '('))) {
                $zasobnik[] = $t;
                continue;
            }

            switch ($t) {
                case 'q':
                    $zasobnikCTM[] = $ctm;
                    break;

                case 'Q':
                    if ($zasobnikCTM) {
                        $ctm = array_pop($zasobnikCTM);
                    }
                    break;

                case 'cm':
                    if (count($zasobnik) >= 6) {
                        $ctm = $this->nasob(array_map('floatval', array_slice($zasobnik, -6)), $ctm);
                    }
                    break;

                case 'BDC':
                    $zasobnikHladin[] = $hladina;
                    $znacka = null;
                    foreach (array_reverse($zasobnik) as $z) {
                        if (strlen($z) > 1 && $z[0] === '/' && $z !== '/OC') {
                            $znacka = substr($z, 1);
                            break;
                        }
                    }
                    $cislo = $znacka !== null ? ($vlastnosti[$znacka] ?? null) : null;
                    $hladina = $cislo !== null ? ($nazvy[$cislo] ?? $hladina) : $hladina;
                    break;

                case 'EMC':
                    if ($zasobnikHladin) {
                        $hladina = array_pop($zasobnikHladin);
                    }
                    break;

                case 'm':
                    if (count($zasobnik) >= 2) {
                        [$x, $y] = array_map('floatval', array_slice($zasobnik, -2));
                    }
                    break;

                case 'l':
                    if (count($zasobnik) >= 2) {
                        [$nx, $ny] = array_map('floatval', array_slice($zasobnik, -2));
                        $sberac->uloz($hladina, $ctm, $x, $y, $nx, $ny);
                        $x = $nx;
                        $y = $ny;
                    }
                    break;

                case 'c':
                case 'v':
                case 'y':
                    $potreba = $t === 'c' ? 6 : 4;
                    if (count($zasobnik) >= $potreba) {
                        $p = array_map('floatval', array_slice($zasobnik, -$potreba));
                        [$nx, $ny] = [$p[$potreba - 2], $p[$potreba - 1]];
                        $sberac->uloz($hladina, $ctm, $x, $y, $nx, $ny);
                        $x = $nx;
                        $y = $ny;
                    }
                    break;

                case 're':
                    if (count($zasobnik) >= 4) {
                        [$rx, $ry, $rw, $rh] = array_map('floatval', array_slice($zasobnik, -4));
                        $rohy = [[$rx, $ry], [$rx + $rw, $ry], [$rx + $rw, $ry + $rh], [$rx, $ry + $rh]];
                        for ($i = 0; $i < 4; $i++) {
                            $sberac->uloz($hladina, $ctm, $rohy[$i][0], $rohy[$i][1], $rohy[($i + 1) % 4][0], $rohy[($i + 1) % 4][1]);
                        }
                        $x = $rx;
                        $y = $ry;
                    }
                    break;

                case 'Do':
                    $jmeno = null;
                    foreach (array_reverse($zasobnik) as $z) {
                        if (strlen($z) > 1 && $z[0] === '/') {
                            $jmeno = substr($z, 1);
                            break;
                        }
                    }
                    if ($jmeno !== null) {
                        $this->vloz($jmeno, $zdroje, $nazvy, $vlastnosti, $sberac, $ctm, $hladina, $hloubka);
                    }
                    break;
            }

            $zasobnik = [];
        }
    }

    /** Vykreslí Form XObject na místě operátoru `Do`. */
    private function vloz(
        string $jmeno,
        array $zdroje,
        array $nazvy,
        array $vlastnosti,
        VrstvySberac $sberac,
        array $ctm,
        ?string $hladina,
        int $hloubka,
    ): void {
        $cislo = null;
        foreach ($zdroje as $zdroj) {
            $i = strpos($zdroj, '/XObject');
            if ($i === false) {
                continue;
            }
            $usek = $this->vyrizniSlovnik($zdroj, $i + strlen('/XObject'));
            if (preg_match('~/' . preg_quote($jmeno, '~') . '\s+(\d+)\s+0\s+R~', $usek, $m)) {
                $cislo = (int) $m[1];
                break;
            }
        }
        if ($cislo === null || !isset($this->objekty[$cislo])) {
            return;
        }

        $slovnik = $this->objekty[$cislo]['dict'];
        if (!str_contains($slovnik, '/Form')) {
            return;     // obrázky nás nezajímají
        }

        // Hladina může být přišpendlená i na samotném formuláři.
        if (preg_match('~/OC\s+(\d+)\s+0\s+R~', $slovnik, $m)) {
            $hladina = $nazvy[(int) $m[1]] ?? $hladina;
        }

        if (preg_match('~/Matrix\s*\[\s*([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)~', $slovnik, $m)) {
            $ctm = $this->nasob(array_map('floatval', array_slice($m, 1, 6)), $ctm);
        }

        $obsah = $this->rozbal($this->objekty[$cislo]['stream']);
        if ($obsah === '') {
            return;
        }

        $this->projdi($obsah, array_merge([$slovnik], $this->zdroje($slovnik)), $nazvy, $vlastnosti, $sberac, $ctm, $hladina, $hloubka + 1);
    }

    private function nasob(array $a, array $b): array
    {
        return [
            $a[0] * $b[0] + $a[1] * $b[2], $a[0] * $b[1] + $a[1] * $b[3],
            $a[2] * $b[0] + $a[3] * $b[2], $a[2] * $b[1] + $a[3] * $b[3],
            $a[4] * $b[0] + $a[5] * $b[2] + $b[4], $a[4] * $b[1] + $a[5] * $b[3] + $b[5],
        ];
    }
}
