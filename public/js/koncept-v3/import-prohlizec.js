/**
 * Prohlížeč výkresu v průvodci importem — posun, zoom, magnety, kalibrace, výřez.
 *
 * Chování převzato z výkazu výměr v kalkuliu (tam je odladěné):
 *   - kolečko = zoom ke kurzoru (1,15×, meze 0,1–10)
 *   - pravé tlačítko nebo nástroj ruka = posun
 *   - dvojklik = zpět na celý výkres
 *   - magnety: nejdřív koncový bod (15 px), pak průsečík, pak čára (8 px);
 *     poloměry se přepočítávají zoomem, aby na obrazovce zůstaly stejné
 *
 * Magnety se berou z vektorů PDF přes ImportAnalyza.extrahujUsecky — stejná
 * data, ze kterých se pak rozpoznávají stěny.
 *
 * Objekt se přimíchává do Alpine komponenty editoru (viz import-pudorysu.js).
 */
window.KonceptImportProhlizec = {
    // ─── Stav prohlížeče ────────────────────────────────────
    pzZoom: 1,
    pzZoomZaklad: 1,            // zvětšení, při kterém je vidět celý výkres = 100 %
    pzPanX: 0,
    pzPanY: 0,
    pzNastroj: 'kalibrace',     // kalibrace | vyrez | ruka
    pzPosouvam: false,
    pzKurzor: null,             // {x,y} v px obrázku
    pzSnap: null,               // {x,y,druh}
    pzMagnetySila: 100,
    pzMagnetuPocet: 0,
    pzNacitamMagnety: false,

    // rozměry obrázku (přirozené px)
    pzSirka: 0,
    pzVyska: 0,

    // výřez (v px obrázku)
    pzVyrez: null,
    _pzVyrezStart: null,

    // obrys domu = vnější líc obvodových zdí (v px obrázku)
    pzObrys: [],
    pzObrysUzavren: false,

    _pzSegmenty: null,
    _pzBody: null,
    _pzMrizka: null,
    _pzStart: null,

    // ─── Start / konec ──────────────────────────────────────
    pzInit() {
        this.pzZoom = 1;
        this.pzPanX = 0;
        this.pzPanY = 0;
        this.pzSnap = null;
        this.pzKurzor = null;
        this.pzVyrez = null;
        this.pzObrys = [];
        this.pzObrysUzavren = false;
        this._pzSegmenty = null;
        this._pzBody = null;
        this._pzMrizka = null;
        this.pzMagnetuPocet = 0;
    },

    /** Po načtení obrázku strany: velikost, výchozí přiblížení, magnety. */
    pzObrazekNacten(event) {
        const img = event.target;
        this.pzSirka = img.naturalWidth;
        this.pzVyska = img.naturalHeight;
        this.pzNaSirku();
        this.pzNactiMagnety();
    },

    pzViewport() {
        return this.$refs.pzViewport || null;
    },

    /**
     * Celý výkres do okna a doprostřed. Tohle zvětšení je zároveň
     * referenční „100 %“ — uživatel tak vidí, kdy je na celém podkladu.
     */
    pzCelyVykres() {
        const vp = this.pzViewport();
        if (!vp || !this.pzSirka || !this.pzVyska) return;
        const sirka = vp.clientWidth, vyska = vp.clientHeight;
        if (!sirka || !vyska) { setTimeout(() => this.pzCelyVykres(), 60); return; }

        this.pzZoomZaklad = Math.min(sirka / this.pzSirka, vyska / this.pzVyska);
        this.pzZoom = this.pzZoomZaklad;
        this.pzPanX = (sirka - this.pzSirka * this.pzZoom) / 2;
        this.pzPanY = (vyska - this.pzVyska * this.pzZoom) / 2;
    },

    /** Zvětšení proti celému výkresu v procentech. */
    pzZoomProcent() {
        return Math.round(this.pzZoom / (this.pzZoomZaklad || 1) * 100);
    },

    pzNaSirku() {
        this.pzCelyVykres();
    },

    pzStyl() {
        return `transform: translate(${this.pzPanX}px, ${this.pzPanY}px) scale(${this.pzZoom}); transform-origin: 0 0;`;
    },

    // ─── Magnety ────────────────────────────────────────────
    async pzNactiMagnety() {
        const vektor = this.impStranaData?.vektor;
        if (!vektor || !window.ImportAnalyza) return;

        this.pzNacitamMagnety = true;
        try {
            const svg = await (await fetch(vektor)).text();
            const usecky = window.ImportAnalyza.extrahujUsecky(svg);

            // body PDF → px obrázku
            const vb = svg.match(/viewBox="([^"]+)"/);
            const sirkaBodu = vb ? parseFloat(vb[1].split(/\s+/)[2]) : this.pzSirka;
            const k = this.pzSirka / (sirkaBodu || this.pzSirka);

            const segmenty = [];
            for (const u of usecky) {
                const x1 = u.x1 * k, y1 = u.y1 * k, x2 = u.x2 * k, y2 = u.y2 * k;
                if (Math.hypot(x2 - x1, y2 - y1) < 3) continue;     // drobty (písmo) nejsou magnet
                segmenty.push({ x1, y1, x2, y2 });
            }

            // koncové body (sloučené na 0,5 px)
            const klice = new Set();
            const body = [];
            for (const s of segmenty) {
                for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]]) {
                    const klic = Math.round(x * 2) + ',' + Math.round(y * 2);
                    if (klice.has(klic)) continue;
                    klice.add(klic);
                    body.push({ x, y });
                }
            }

            this._pzSegmenty = segmenty;
            this._pzBody = body;
            this._pzMrizka = this._pzPostavMrizku(segmenty, body);
            this.pzMagnetuPocet = body.length;
        } catch (e) {
            window.zalogujChybu?.(e, 'import — magnety');
        } finally {
            this.pzNacitamMagnety = false;
        }
    },

    _pzPostavMrizku(segmenty, body) {
        const bunka = 40;
        const mrizka = { bunka, data: new Map() };
        const pridej = (cx, cy, druh, i) => {
            const klic = cx + ',' + cy;
            if (!mrizka.data.has(klic)) mrizka.data.set(klic, { body: [], segy: [] });
            mrizka.data.get(klic)[druh].push(i);
        };

        body.forEach((b, i) => pridej(Math.floor(b.x / bunka), Math.floor(b.y / bunka), 'body', i));
        segmenty.forEach((s, i) => {
            const delka = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
            const kroku = Math.max(1, Math.ceil(delka / (bunka / 2)));
            for (let n = 0; n <= kroku; n++) {
                const t = n / kroku;
                pridej(Math.floor((s.x1 + (s.x2 - s.x1) * t) / bunka), Math.floor((s.y1 + (s.y2 - s.y1) * t) / bunka), 'segy', i);
            }
        });
        return mrizka;
    },

    /** Síla magnetu přepočtená zoomem (na obrazovce má být dosah stejný). */
    _pzSila() {
        const k = this.pzMagnetySila / 100;
        if (k <= 0) return 0;
        return k * Math.max(0.4, Math.min(2, 1 / Math.sqrt(this.pzZoom || 1)));
    },

    /** Najde magnet k bodu v px obrázku. Pořadí: bod → průsečík → čára. */
    pzNajdiMagnet(p) {
        if (!this._pzMrizka) return null;
        const k = this._pzSila();
        if (!k) return null;

        const zoom = this.pzZoom || 1;
        const dosahBod = 15 * k / zoom;
        const dosahCara = 8 * k / zoom;
        const bunka = this._pzMrizka.bunka;
        const okoli = Math.ceil(Math.max(dosahBod, dosahCara) / bunka);

        let nejBod = null, nejBodVzd = Infinity;
        let nejCara = null, nejCaraVzd = Infinity, nejSeg = null;

        const cx = Math.floor(p.x / bunka), cy = Math.floor(p.y / bunka);
        for (let dx = -okoli; dx <= okoli; dx++) {
            for (let dy = -okoli; dy <= okoli; dy++) {
                const bunkaData = this._pzMrizka.data.get((cx + dx) + ',' + (cy + dy));
                if (!bunkaData) continue;

                for (const i of bunkaData.body) {
                    const b = this._pzBody[i];
                    const vzd = Math.hypot(b.x - p.x, b.y - p.y);
                    if (vzd < dosahBod && vzd < nejBodVzd) { nejBodVzd = vzd; nejBod = b; }
                }
                for (const i of bunkaData.segy) {
                    const s = this._pzSegmenty[i];
                    const sx = s.x2 - s.x1, sy = s.y2 - s.y1;
                    const L2 = sx * sx + sy * sy || 1;
                    let t = ((p.x - s.x1) * sx + (p.y - s.y1) * sy) / L2;
                    t = Math.max(0, Math.min(1, t));
                    const px = s.x1 + sx * t, py = s.y1 + sy * t;
                    const vzd = Math.hypot(px - p.x, py - p.y);
                    if (vzd < dosahCara && vzd < nejCaraVzd) { nejCaraVzd = vzd; nejCara = { x: px, y: py }; nejSeg = s; }
                }
            }
        }

        // bod vyhrává, pokud není víc než 2× dál než čára (převzato z kalkulia)
        if (nejBod && (!nejCara || nejBodVzd <= 2 * nejCaraVzd)) {
            return { x: nejBod.x, y: nejBod.y, druh: 'bod' };
        }
        if (nejCara) return { x: nejCara.x, y: nejCara.y, druh: 'cara', seg: nejSeg };
        return null;
    },

    // ─── Souřadnice ─────────────────────────────────────────
    pzNaObrazek(event) {
        const vp = this.pzViewport();
        if (!vp) return null;
        const r = vp.getBoundingClientRect();
        const x = (event.clientX - r.left - this.pzPanX) / this.pzZoom;
        const y = (event.clientY - r.top - this.pzPanY) / this.pzZoom;
        if (x < 0 || y < 0 || x >= this.pzSirka || y >= this.pzVyska) return null;
        return { x, y };
    },

    /** px obrázku → px na obrazovce (pro značky nad obrázkem) */
    pzNaObrazovku(b) {
        return { x: b.x * this.pzZoom + this.pzPanX, y: b.y * this.pzZoom + this.pzPanY };
    },

    // ─── Myš ────────────────────────────────────────────────
    pzKolecko(event) {
        event.preventDefault();
        const vp = this.pzViewport();
        if (!vp) return;
        const r = vp.getBoundingClientRect();
        const cx = event.clientX - r.left, cy = event.clientY - r.top;
        const nasobek = event.deltaY > 0 ? 1 / 1.15 : 1.15;
        const novy = Math.max(0.1, Math.min(10, this.pzZoom * nasobek));
        this.pzPanX = cx - (cx - this.pzPanX) * (novy / this.pzZoom);
        this.pzPanY = cy - (cy - this.pzPanY) * (novy / this.pzZoom);
        this.pzZoom = novy;
    },

    pzZoomKrok(smer) {
        const vp = this.pzViewport();
        if (!vp) return;
        const cx = vp.clientWidth / 2, cy = vp.clientHeight / 2;
        const nasobek = smer > 0 ? 1.25 : 1 / 1.25;
        const novy = Math.max(0.1, Math.min(10, this.pzZoom * nasobek));
        this.pzPanX = cx - (cx - this.pzPanX) * (novy / this.pzZoom);
        this.pzPanY = cy - (cy - this.pzPanY) * (novy / this.pzZoom);
        this.pzZoom = novy;
    },

    pzMysDolu(event) {
        if (event.button === 2 || this.pzNastroj === 'ruka') {
            this.pzPosouvam = true;
            this._pzStart = { x: event.clientX, y: event.clientY, panX: this.pzPanX, panY: this.pzPanY };
            return;
        }
        if (this.pzNastroj === 'vyrez' && event.button === 0) {
            const p = this.pzNaObrazek(event);
            if (p) { this._pzVyrezStart = p; this.pzVyrez = { x: p.x, y: p.y, sirka: 0, vyska: 0 }; }
        }
    },

    pzMysPohyb(event) {
        if (this.pzPosouvam && this._pzStart) {
            this.pzPanX = this._pzStart.panX + (event.clientX - this._pzStart.x);
            this.pzPanY = this._pzStart.panY + (event.clientY - this._pzStart.y);
            return;
        }

        const p = this.pzNaObrazek(event);
        this.pzKurzor = p;
        if (!p) { this.pzSnap = null; return; }

        if (this._pzVyrezStart) {
            this.pzVyrez = {
                x: Math.min(this._pzVyrezStart.x, p.x),
                y: Math.min(this._pzVyrezStart.y, p.y),
                sirka: Math.abs(p.x - this._pzVyrezStart.x),
                vyska: Math.abs(p.y - this._pzVyrezStart.y),
            };
            return;
        }

        this.pzSnap = ['kalibrace', 'obrys'].includes(this.pzNastroj) ? this.pzNajdiMagnet(p) : null;
    },

    pzMysNahoru(event) {
        if (this.pzPosouvam) { this.pzPosouvam = false; this._pzStart = null; return; }

        if (this._pzVyrezStart) {
            this._pzVyrezStart = null;
            if (this.pzVyrez && (this.pzVyrez.sirka < 20 || this.pzVyrez.vyska < 20)) this.pzVyrez = null;
            return;
        }

        if (event.button !== 0) return;
        const p = this.pzNaObrazek(event);
        if (!p) return;
        const bod = this.pzSnap ? { x: this.pzSnap.x, y: this.pzSnap.y } : p;

        if (this.pzNastroj === 'kalibrace') {
            this.impKalibPridej(bod);
        } else if (this.pzNastroj === 'obrys') {
            this.pzObrysPridej(bod);
        }
    },

    // ─── Obrys domu ─────────────────────────────────────────
    pzObrysPridej(bod) {
        if (this.pzObrysUzavren) return;

        // klik do blízkosti prvního bodu obrys uzavře
        if (this.pzObrys.length >= 3) {
            const prvni = this.pzNaObrazovku(this.pzObrys[0]);
            const ted = this.pzNaObrazovku(bod);
            if (Math.hypot(prvni.x - ted.x, prvni.y - ted.y) < 14) {
                this.pzObrysUzavren = true;
                return;
            }
        }

        // nezapisovat dvakrát stejný bod
        const posledni = this.pzObrys[this.pzObrys.length - 1];
        if (posledni && Math.hypot(posledni.x - bod.x, posledni.y - bod.y) * this.pzZoom < 3) return;

        this.pzObrys.push({ x: bod.x, y: bod.y });
    },

    pzObrysUzavri() {
        if (this.pzObrys.length >= 3) this.pzObrysUzavren = true;
    },

    pzObrysZnovu() {
        this.pzObrys = [];
        this.pzObrysUzavren = false;
        this.pzNastroj = 'obrys';
    },

    pzObrysZpet() {
        if (this.pzObrysUzavren) { this.pzObrysUzavren = false; return; }
        this.pzObrys.pop();
    },

    /** Body obrysu (a rozkreslená čára) v px obrazovky — pro vykreslení. */
    pzObrysNaObrazovce() {
        const body = this.pzObrys.map(b => this.pzNaObrazovku(b));
        if (!body.length) return null;

        const kurzor = (!this.pzObrysUzavren && this.pzNastroj === 'obrys' && (this.pzSnap || this.pzKurzor))
            ? this.pzNaObrazovku(this.pzSnap || this.pzKurzor)
            : null;

        // délky úseků v metrech (pomáhají poznat, že měřítko sedí)
        const mpp = this.impMetryNaPx ? this.impMetryNaPx() : 0;
        const useky = [];
        const vsechny = kurzor ? [...body, kurzor] : body;
        const konec = this.pzObrysUzavren ? vsechny.length : vsechny.length - 1;
        for (let i = 0; i < konec; i++) {
            const a = vsechny[i], b = vsechny[(i + 1) % vsechny.length];
            useky.push({
                a, b,
                stred: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
                delka: mpp ? (Math.hypot(b.x - a.x, b.y - a.y) / this.pzZoom * mpp) : 0,
            });
        }

        return { body, kurzor, useky, uzavren: this.pzObrysUzavren };
    },

    /** Plocha obrysu v m² (kontrola pro uživatele). */
    pzObrysPlocha() {
        const mpp = this.impMetryNaPx ? this.impMetryNaPx() : 0;
        if (!mpp || this.pzObrys.length < 3) return 0;
        let s = 0;
        for (let i = 0, j = this.pzObrys.length - 1; i < this.pzObrys.length; j = i++) {
            s += (this.pzObrys[j].x + this.pzObrys[i].x) * (this.pzObrys[j].y - this.pzObrys[i].y);
        }
        return Math.abs(s / 2) * mpp * mpp;
    },

    pzDvojklik() {
        if (this.pzNastroj === 'obrys' && this.pzObrys.length >= 3) {
            this.pzObrysUzavri();
            return;
        }
        this.pzNaSirku();
    },

    pzKurzorStyl() {
        if (this.pzPosouvam) return 'grabbing';
        if (this.pzNastroj === 'ruka') return 'grab';
        return 'crosshair';
    },

    // ─── Výřez ──────────────────────────────────────────────
    pzVyrezNaObrazovce() {
        if (!this.pzVyrez) return null;
        const a = this.pzNaObrazovku({ x: this.pzVyrez.x, y: this.pzVyrez.y });
        return {
            left: a.x, top: a.y,
            sirka: this.pzVyrez.sirka * this.pzZoom,
            vyska: this.pzVyrez.vyska * this.pzZoom,
        };
    },

    /**
     * Měřicí čára — stejný styl jako nástroj Metr v editoru (čárkovaná čára,
     * body jako kolečka, popisek s délkou), jen v základní barvě aplikace.
     * Vrací body v px obrazovky; při měření se dotahuje ke kurzoru.
     */
    pzMerickaCara() {
        const body = (this.impKalibBody || []).map(b => this.pzNaObrazovku(b));
        if (!body.length) return null;

        if (body.length === 1) {
            if (this.pzNastroj !== 'kalibrace') return null;
            const konec = this.pzSnap || this.pzKurzor;
            if (!konec) return null;
            body.push(this.pzNaObrazovku(konec));
        }

        const [a, b] = body;
        const mm = parseFloat(this.impKalibMm);

        // popisek běží souběžně s čárou, ale nikdy vzhůru nohama
        let uhel = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        if (uhel > 90) uhel -= 180;
        if (uhel < -90) uhel += 180;

        return {
            a, b,
            stred: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
            // popisek nepatří na střed — tam bývá vlastní kóta výkresu.
            // Sedí v pravé třetině čáry a vypisuje se pod ní.
            popisekBod: { x: a.x + (b.x - a.x) * 0.75, y: a.y + (b.y - a.y) * 0.75 },
            uhel,
            popis: this.impKalibBody.length === 2
                ? (mm > 0 ? (mm / 1000).toFixed(2) + ' m' : 'zadejte rozměr')
                : 'klikněte na druhý bod',
            hotovo: this.impKalibBody.length === 2,
        };
    },

    /**
     * Překreslí měřicí čáru, obrys domu a značku magnetu na plátno nad výkresem.
     *
     * POZOR: nekreslí se přes SVG — Alpine neumí x-for/x-if uvnitř SVG
     * (vytváří HTML elementy, které do SVG jmenného prostoru nepatří).
     */
    pzPrekresli() {
        const platno = this.$refs?.pzPlatno;
        const vp = this.pzViewport();
        if (!platno || !vp) return;

        // reaktivní závislosti (ať Alpine ví, kdy překreslit)
        void [this.pzZoom, this.pzPanX, this.pzPanY, this.pzObrys.length, this.pzObrysUzavren,
            this.pzSnap, this.pzKurzor, this.impKalibBody?.length, this.impKalibMm, this.pzNastroj];

        const sirka = vp.clientWidth, vyska = vp.clientHeight;
        if (platno.width !== sirka) platno.width = sirka;
        if (platno.height !== vyska) platno.height = vyska;

        const g = platno.getContext('2d');
        g.clearRect(0, 0, sirka, vyska);

        const barva = getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim();
        // odsazeni: záporné = nad čarou, kladné = pod čarou (v natočení čáry)
        const popisek = (text, bod, uhel, barvaTextu, odsazeni = -8) => {
            g.save();
            g.translate(bod.x, bod.y);
            g.rotate(uhel * Math.PI / 180);
            g.translate(0, odsazeni);
            g.font = '12px monospace';
            g.textAlign = 'center';
            g.lineWidth = 3;
            g.strokeStyle = 'white';
            g.strokeText(text, 0, 0);
            g.fillStyle = barvaTextu;
            g.fillText(text, 0, 0);
            g.restore();
        };

        // ─ měřicí čára ─
        const merick = this.pzMerickaCara();
        if (merick) {
            g.save();
            g.setLineDash([6, 4]);
            g.strokeStyle = barva;
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(merick.a.x, merick.a.y);
            g.lineTo(merick.b.x, merick.b.y);
            g.stroke();
            g.restore();

            g.fillStyle = barva;
            for (const b of (merick.hotovo ? [merick.a, merick.b] : [merick.a])) {
                g.beginPath();
                g.arc(b.x, b.y, 4, 0, Math.PI * 2);
                g.fill();
                g.lineWidth = 1.5;
                g.strokeStyle = 'white';
                g.stroke();
            }
            popisek(merick.popis, merick.popisekBod, merick.uhel, barva, 14);
        }

        // ─ obrys domu ─
        const obrys = this.pzObrysNaObrazovce();
        if (obrys) {
            g.strokeStyle = '#16a34a';
            g.lineWidth = 2.5;
            for (const u of obrys.useky) {
                g.beginPath();
                g.moveTo(u.a.x, u.a.y);
                g.lineTo(u.b.x, u.b.y);
                g.stroke();
                if (u.delka > 0.3) {
                    let uhel = Math.atan2(u.b.y - u.a.y, u.b.x - u.a.x) * 180 / Math.PI;
                    if (uhel > 90) uhel -= 180;
                    if (uhel < -90) uhel += 180;
                    popisek(u.delka.toFixed(2) + ' m', u.stred, uhel, '#15803d');
                }
            }
            obrys.body.forEach((b, i) => {
                g.beginPath();
                g.arc(b.x, b.y, i === 0 ? 5 : 4, 0, Math.PI * 2);
                g.fillStyle = '#16a34a';
                g.fill();
                g.lineWidth = 1.5;
                g.strokeStyle = 'white';
                g.stroke();
            });
        }

        // ─ značka magnetu ─
        if (this.pzSnap) {
            const s = this.pzNaObrazovku(this.pzSnap);
            g.beginPath();
            g.arc(s.x, s.y, 8, 0, Math.PI * 2);
            g.lineWidth = 2;
            g.strokeStyle = this.pzSnap.druh === 'bod' ? '#dc2626' : barva;
            g.stroke();
        }
    },

    pzVyrezPopis() {
        if (!this.pzVyrez) return '';
        const mpp = this.impMetryNaPx();
        if (!mpp) return `${Math.round(this.pzVyrez.sirka)} × ${Math.round(this.pzVyrez.vyska)} px`;
        return `${(this.pzVyrez.sirka * mpp).toFixed(1)} × ${(this.pzVyrez.vyska * mpp).toFixed(1)} m`;
    },
};
