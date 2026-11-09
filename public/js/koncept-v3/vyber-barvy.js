/**
 * Společný nástroj na výběr barvy (Koncept V3). Šablona je v partials/vyber-barvy.blade.php.
 *
 * Použití: <div x-data="vyberBarvy({ hodnota, nastav, nahled, pouzite })"> @include('partials.vyber-barvy') </div>
 *   hodnota()    aktuální barva jako #rrggbb
 *   nastav(hex)  potvrzená změna (krok historie, uložení)
 *   nahled(hex)  průběžně za tahu posuvníkem, bez kroku historie (nepovinné)
 *   pouzite()    barvy jinde na domě k sjednocení, [{hex, kde}] (nepovinné)
 */
(function () {
    function hslNaHex(h, s, l) {
        s /= 100; l /= 100;
        const f = (n) => {
            const k = (n + h / 30) % 12;
            const a = s * Math.min(l, 1 - l);
            const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
            return Math.round(v * 255).toString(16).padStart(2, '0');
        };
        return '#' + f(0) + f(8) + f(4);
    }

    function hexNaHsl(hex) {
        const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        const l = (max + min) / 2;
        let h = 0;
        if (d) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h = (h * 60 + 360) % 360;
        }
        const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
        return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    /** OKLab: vzdálenost v něm odpovídá tomu, jak moc se barvy liší pro oko. */
    function hexNaLab(hex) {
        const lin = [1, 3, 5].map(i => {
            const c = parseInt(hex.slice(i, i + 2), 16) / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        const l = Math.cbrt(0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]);
        const m = Math.cbrt(0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]);
        const s = Math.cbrt(0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]);
        return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
    }

    let labRal = null;
    function nejblizsiRal(hex) {
        if (!window.RAL_KLASIK) return null;
        if (!labRal) labRal = window.RAL_KLASIK.map(r => ({ r, lab: hexNaLab(r.hex) }));
        const c = hexNaLab(hex);
        let nej = null, min = Infinity;
        for (const { r, lab } of labRal) {
            const d = (lab[0] - c[0]) ** 2 + (lab[1] - c[1]) ** 2 + (lab[2] - c[2]) ** 2;
            if (d < min) { min = d; nej = r; }
        }
        return nej;
    }

    /** Našeptávač RAL je běžný prvek prohlížeče; seznam je na stránce jen jednou. */
    function seznamRal() {
        if (document.getElementById('kk-ral-seznam') || !window.RAL_KLASIK) return;
        const dl = document.createElement('datalist');
        dl.id = 'kk-ral-seznam';
        for (const r of window.RAL_KLASIK) {
            const o = document.createElement('option');
            o.value = 'RAL ' + r.kod + ' ' + r.nazev;
            dl.appendChild(o);
        }
        document.body.appendChild(dl);
    }

    window.vyberBarvy = function (nast) {
        return {
            otevreno: false,
            hex: '#a8502f',
            puvodni: '#a8502f',
            hsl: { h: 0, s: 0, l: 0 },
            ralChyba: '',
            _posledni: null,

            init() {
                seznamRal();
                this.zHodnoty();
            },

            /** Barva změněná jinudy (Zpět, jiná hrana) se přenese do nástroje. */
            zHodnoty() {
                const v = String(nast.hodnota() || '').toLowerCase();
                if (!v || v === this._posledni) return;
                this._posledni = v;
                this.hex = v;
                this.hsl = hexNaHsl(v);
                this.ralChyba = '';
                if (!this.otevreno) this.puvodni = v;
            },

            prepni() {
                this.otevreno = !this.otevreno;
                if (this.otevreno) this.puvodni = this.hex;
            },

            /** Tah posuvníkem: jen náhled, krok historie vznikne až po puštění. */
            posun(klic, hodnota) {
                this.hsl = { ...this.hsl, [klic]: Number(hodnota) };
                this.hex = hslNaHex(this.hsl.h, this.hsl.s, this.hsl.l);
                this.ralChyba = '';
                nast.nahled?.(this.hex);
            },

            potvrd() {
                this._posledni = this.hex;
                nast.nastav(this.hex);
            },

            vyber(hex) {
                this.hex = hex.toLowerCase();
                this.hsl = hexNaHsl(this.hex);
                this.ralChyba = '';
                this.potvrd();
            },

            /** Kód barvy #rrggbb (i bez mřížky, i zkrácený #abc): jde tak přenést barvu z jiné části nebo odjinud. */
            zadejKod(text) {
                const t = String(text).trim().replace(/^#/, '').toLowerCase();
                if (!t) { this.ralChyba = ''; return; }
                if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/.test(t)) { this.ralChyba = preloz('ed_sablona.barva.kod_chyba'); return; }
                const hex = '#' + (t.length === 3 ? t.replace(/./g, '$&$&') : t);
                if (hex === this.hex) { this.ralChyba = ''; return; }
                this.vyber(hex);
            },

            /** Pole RAL: stačí čtyři číslice, z našeptávače přijde celý název. Vložený kód #rrggbb se vezme taky. */
            zadejRal(text) {
                if (/^\s*#/.test(String(text))) { this.zadejKod(text); return; }
                const kod = (String(text).match(/\d{4}/) || [])[0];
                if (!String(text).trim()) { this.ralChyba = ''; return; }
                const r = kod && (window.RAL_KLASIK || []).find(x => x.kod === kod);
                if (!r) { this.ralChyba = preloz('ed_kresba.ral_neznamy'); return; }
                this.vyber(r.hex);
            },

            /** Co je v poli RAL: přesný odstín, jinak nejbližší. Jde odtud zkopírovat do praxe. */
            get ralPole() {
                const r = this.ralPresny || this.ralNejblizsi;
                return r ? 'RAL ' + r.kod + ' ' + r.nazev : '';
            },

            get ralPresny() {
                return (window.RAL_KLASIK || []).find(r => r.hex === this.hex) || null;
            },

            get ralNejblizsi() {
                return nejblizsiRal(this.hex);
            },

            /** Krátký popis barvy vedle symbolu. */
            get popis() {
                const r = this.ralPresny;
                return r ? 'RAL ' + r.kod + ' ' + r.nazev : this.hex;
            },

            get pouzite() {
                return nast.pouzite?.() || [];
            },

            get stopaOdstin() {
                const s = Math.max(this.hsl.s, 35), l = Math.min(Math.max(this.hsl.l, 35), 65);
                return 'linear-gradient(to right,' + [0, 60, 120, 180, 240, 300, 360].map(x => `hsl(${x} ${s}% ${l}%)`).join(',') + ')';
            },
            get stopaSytost() {
                return `linear-gradient(to right,hsl(${this.hsl.h} 0% ${this.hsl.l}%),hsl(${this.hsl.h} 100% ${this.hsl.l}%))`;
            },
            get stopaJas() {
                return `linear-gradient(to right,#000,hsl(${this.hsl.h} ${this.hsl.s}% 50%),#fff)`;
            },
        };
    };
})();
