/**
 * KonvaRenderer — zobrazuje data ze StavebníEngine na Konva.js canvas.
 *
 * Stěny se vykreslují jako uzavřené polygony (Konva.Line closed).
 * Nody jako malé kruhy (viditelné při hoveru/výběru).
 * Otvory jako bílé obdélníky přes stěnu.
 */

/**
 * Jednotné zvýraznění uchopeného objektu — stěna, otvor, bod i cokoli dalšího.
 *
 * Mění se POUZE BARVA obrysu, nikdy jeho tloušťka ani velikost. Dřív se obrys
 * zesiloval a body zvětšovaly, takže hranice objektu opticky odskočila a nedalo
 * se poznat, kde zeď doopravdy končí — zvlášť při obkreslování podkladu.
 */
const VYBER = {
    obrys: '#dc2626',        // červená — „tenhle objekt právě držím"
    obrysTmavy: '#991b1b',   // tmavší odstín tam, kde se obrys kreslí na výplň
};

/**
 * Jedno pravidlo velikosti pro všechny popisky výkresu — kóty, označení stěn
 * a otvorů, úhly. Od přiblížení `zoomMez` výš drží stálou velikost na obrazovce
 * (neporostou s výkresem). Pod ní se zmenšují spolu s výkresem: dřív zůstávaly
 * stejně velké i po oddálení a přerostly místnosti (úhly přes celý dům).
 * Písmo menší než `minPismo` px na obrazovce už není čitelné — nekreslí se.
 */
const POPISKY = {
    zoomMez: 0.8,   // 80 px na metr; úhel má pak poloměr nejvýš 0,3 m
    minPismo: 6,
};

/**
 * Podklad se zobrazuje třemi způsoby: pod kresbou, nad kresbou, nebo vůbec.
 * Starší koncepty mají jen `viditelny` — ty se čtou jako pod/skrytý.
 */
function podkladSkryty(p) {
    if (p.zobrazeni) return p.zobrazeni === 'skryt';
    return p.viditelny === false;
}

/**
 * Vrstva bez obsahu nedrží plátno přes celou kresbu: má 1×1 px a plnou velikost dostane až s prvním
 * obsahem. Vrstev je 15 a prázdná jich bývá skoro polovina, každé plátno přitom zabere grafickou
 * paměť (u integrované grafiky RAM): ve Firefoxu to dělá přes 200 MB. Zpět se plátno nezmenšuje.
 */
(function () {
    const nastavVelikost = Konva.Layer.prototype.setSize;
    const pridej = Konva.Layer.prototype.add;
    Konva.Layer.prototype.setSize = function (velikost) {
        this._plnaVelikost = velikost;
        return nastavVelikost.call(this, this._maObsah ? velikost : { width: 1, height: 1 });
    };
    Konva.Layer.prototype.add = function (...potomci) {
        const vysledek = pridej.apply(this, potomci);
        if (!this._maObsah && this.getChildren().length) {
            this._maObsah = true;
            if (this._plnaVelikost) nastavVelikost.call(this, this._plnaVelikost);
        }
        return vysledek;
    };
})();

class KonvaRenderer {
    constructor(stage, engine, options = {}) {
        this.stage = stage;
        this.engine = engine;
        this.PX_PER_M = engine.PX_PER_M;

        // Vrstvy — POŘADÍ z-orderu zdola nahoru:
        // 1) grid, 2) katastr, 3) místnosti, 4) zdi, 5) overlay (kóty/popisky/nábytek), 6) selection.
        // Místnosti MUSÍ být POD zdmi: hit rect místnosti má listening:true (pro hover),
        // takže kdyby byly nad zdmi, kradly by zdi click events a uživatel by zeď
        // nemohl uchopit. Pod zdmi: hit detection projde nejprve do wallLayeru (zeď →
        // hit), a do mistnostiLayer dopadne jen pokud user klikne mimo zeď.
        this.gridLayer = new Konva.Layer({ listening: false });      // 1: mřížka
        // Podklad importu (naskenovaný/vektorový výkres) leží úplně dole nad mřížkou —
        // kreslí se přes něj, takže nesmí brát events ani zakrývat kresbu.
        this.podkladLayer = new Konva.Layer({ listening: false });   // 1b: obrázek výkresu
        this.spodekLayer = new Konva.Layer({ listening: false });    // 3c: podlaží pod aktivním (jeden obrázek), nad výplní místností, jinak by přes ni nebylo vidět
        this.katastrLayer = new Konva.Layer({ listening: true });    // 2: katastr + mapy
        this.mistnostiLayer = new Konva.Layer({ listening: true, imageSmoothingEnabled: false });  // 3: výplň místností (bitmapa) + popisky
        this.plochyLayer = new Konva.Layer({ listening: true });     // 3b: výškové plochy a prostupy
        this.wallLayer = new Konva.Layer();                          // 4: stěny + otvory
        this.openingLayer = this.wallLayer;                          // alias
        // Listening true, aby vybavení (nábytek) přijímal click/drag events.
        // Ostatní shapes (kóty, ID popisky, highlights, temp) mají individuálně
        // listening: false — viz renderKoty, renderIds.
        this.overlayLayer = new Konva.Layer({ listening: true });    // 5: kóty + popisky + zvýrazňovač + temp + nábytek
        this.labelLayer = this.overlayLayer;                         // alias
        this.highlightLayer = this.overlayLayer;                     // alias
        this.tempLayer = this.overlayLayer;                          // alias
        // Body spojů mají vlastní vrstvu NAD otvory i nábytkem. Dřív seděly ve
        // vrstvě stěn, takže je kresba otvoru (pouzdro posuvných dveří, křídlo)
        // i nábytek překryly — opticky i pro klikání. Na bod spoje se pak nedalo
        // kliknout vůbec.
        this.nodeLayer = new Konva.Layer({ listening: true });        // 5b: body spojů
        this.schodyLayer = new Konva.Layer({ listening: true });      // 5c: schodiště přes podlaží
        this.strechaLayer = new Konva.Layer({ listening: true });     // 5d: střecha (půdorys, hrany, vodítka podkroví)
        this.selectionLayer = new Konva.Layer();                     // 6: výběr / madla
        this.kotyVyberuLayer = new Konva.Layer({ listening: false }); // 7: kóty u vybrané stěny nebo otvoru (koty-vyberu.js)

        this.stage.add(this.gridLayer);
        this.stage.add(this.podkladLayer);
        this.stage.add(this.katastrLayer);
        this.stage.add(this.mistnostiLayer);
        this.stage.add(this.plochyLayer);
        this.stage.add(this.spodekLayer);
        this.stage.add(this.wallLayer);
        this.stage.add(this.overlayLayer);
        this.stage.add(this.nodeLayer);
        this.stage.add(this.schodyLayer);
        this.stage.add(this.strechaLayer);
        this.stage.add(this.selectionLayer);
        this.stage.add(this.kotyVyberuLayer);

        // Zobrazení
        this.showKoty = options.showKoty ?? true;
        this.showPopisky = options.showPopisky ?? true;
        this.showNodes = options.showNodes ?? true;
        this.showSteny = options.showSteny ?? true;
        this.showOtvory = options.showOtvory ?? true;
        this.showGrid = options.showGrid ?? true;
        this.showIds = options.showIds ?? false;
        this.showMistnosti = options.showMistnosti ?? true;
        this.showVybaveni = options.showVybaveni ?? true;

        // Výběr
        this.selectedWalls = new Set();
        this.selectedNodes = new Set();
        this.selectedOpenings = new Set();
        this.selectedVybaveni = new Set();
        this.selectedProstory = new Set();
        this.selectedOddelovace = new Set();
        this._oddelovacShapes = [];
        this.selectedMistnosti = new Set();
        this.selectedSchody = new Set();
        this.selectedPlochy = new Set();

        // Konva objekty mapy (id → Konva shape)
        this._wallShapes = new Map();
        this._nodeShapes = new Map();
        this._openingShapes = new Map();
        this._labelShapes = new Map();
    }

    // ═══════════════════════════════════════════════════════
    // RENDER VŠE
    // ═══════════════════════════════════════════════════════
    render() {
        this.renderSpodek();
        // Vždy vyčistit shapes místností — i když je checkbox vypnutý
        // (aby po toggle showMistnosti=false zmizely polygony, hranice, labely).
        // Za tahu zůstane výplň místností, jak byla: přepočet je drahý a doběhne po usazení
        if (this.jeTah && this.jeTah() && this._mistnostiCache) {
            this._dobehMistnosti();
        } else {
            for (const s of (this._mistnostiShapes || [])) s.destroy();
            this._mistnostiShapes = [];
            if (this.showMistnosti) this.renderMistnosti();
            else if (this.mistnostiLayer) this.mistnostiLayer.batchDraw();
        }
        this.renderWalls();
        this.renderOddelovace();
        if (this.renderDum) this.renderDum();
        this.renderOpenings();
        // Uzly mají vlastní vrstvu nad otvory i nábytkem (viz nodeLayer) —
        // pořadí v rámci jedné vrstvy nestačilo, protože kresba otvoru i nábytek
        // leží v overlayLayer nad stěnami.
        this.renderNodes();
        // Vybavení (nábytek) — vždy vyčistit, vykreslit dle showVybaveni
        for (const s of (this._vybaveniShapes || [])) s.destroy();
        this._vybaveniShapes = [];
        if (this.showVybaveni) this.renderVybaveni();
        this.renderKoty();
        this.renderIds();
        window.KotyVyberu?.kresli(this);
        if (typeof this.afterRender === 'function') this.afterRender();
    }

    /**
     * Nábytek (kuchyně, koupelna, spotřebiče…). Používá pudorys-icons.js
     * createFurnitureShape (vrací Konva.Group). Engine drží polygon v metrech.
     */
    renderVybaveni() {
        if (!window.PudorysIcons || typeof window.PudorysIcons.createFurnitureShape !== 'function') return;
        // Větší dospod: stůl na koberci jde chytit, koberec jde chytit vedle stolu
        const seznam = (Array.isArray(this.engine.vybaveni) ? [...this.engine.vybaveni] : [])
            .sort((a, b) => (b.sirka || 0) * (b.hloubka || 0) - (a.sirka || 0) * (a.hloubka || 0));
        const scale = this.stage ? this.stage.scaleX() || 1 : 1;
        for (const v of seznam) {
            if (!v.polygon || v.polygon.length < 3) continue;
            try {
                const shape = window.PudorysIcons.createFurnitureShape(v, this.PX_PER_M);
                // Listening = true, aby šlo nábytek kliknout / přetahovat. Hit rectangle
                // uvnitř shape (z pudorys-icons) je téměř průhledný a chytá events.
                shape.listening(true);
                shape.setAttr('_vybaveniId', v.id);
                this.overlayLayer.add(shape);
                this._vybaveniShapes.push(shape);

                // POZN: výběr nábytku už označuje rotation handle z renderRotateHandle
                // (modrý čárkovaný OBB rámeček + madlo nad ním). Zde proto NEkreslíme
                // další outline, dříve to vedlo ke dvěma překrývajícím se rámečkům
                // (z nichž jeden u rotovaných objektů zůstával axis-aligned).
            } catch (e) {
                console.warn('[renderVybaveni] selhalo pro', v.id, v.typ, e);
                window.zalogujChybu?.(e, 'Koncept V3: vykreslení vybavení', { id: v.id, typ: v.typ });
            }
        }
        this.overlayLayer.batchDraw();
    }

    /**
     * Místnosti: plochy z rastru (mistnosti.js) — stěny a oddělovače do bitmapy,
     * záplava, každá uzavřená plocha = místnost. Výplň je bitmapa pod stěnami
     * (schody na okrajích schová stěna), popisek název + m². Jména a barvy drží
     * záznamy v engine.mistnosti podle kotvy (sladMistnosti).
     * Rastr se počítá JEN po změně geometrie (otisk engine.geoPodpis) a až po usazení
     * stěny, za tahu vůbec (viz render). Zoom a posun plátna ho nespouštějí také.
     */
    renderMistnosti() {
        for (const s of (this._mistnostiShapes || [])) s.destroy();
        this._mistnostiShapes = [];
        this._mistnostiPopisky = [];
        const R = window.MistnostiRastr;
        if (!R || this.engine.walls.size === 0) { this._mistnostiCache = null; this.mistnostiLayer.batchDraw(); return; }

        const podpis = this.engine.geoPodpis() + '#' + this._podpisMasek();
        let v = this._mistnostiCache;
        if (!v || podpis !== this._mistnostiPodpis) {
            v = R.spocitej(this.engine, this._maskyRastru());
            this._mistnostiCache = v;
            this._mistnostiPodpis = podpis;
            this._mistnostiObrazKlic = null;
        }
        if (!v) { this.mistnostiLayer.batchDraw(); return; }

        const mapa = this.engine.sladMistnosti(v.komponenty, (x, y) => R.stitekVBode(v, x, y));
        // Výškové plochy patří místnostem a obrys si berou z tohoto rastru (dum.js). Změnil-li se
        // obrys plochy bez podlahy, změnily se masky: štítky na nich nezávisí, jen m², proto
        // se plochy místností spočítají ještě jednou hned, ne až příštím překreslením.
        if (this.poRastru && this.poRastru(v, mapa)) {
            const podpis2 = this.engine.geoPodpis() + '#' + this._podpisMasek();
            if (podpis2 !== podpis) {
                v = R.spocitej(this.engine, this._maskyRastru()) || v;
                this._mistnostiCache = v;
                this._mistnostiPodpis = podpis2;
                this._mistnostiObrazKlic = null;
            }
        }
        this._mistnostiStitky = mapa;
        this._plochyMistnosti = new Map();
        this._plochyMistnostiZapocet = new Map();
        for (const k of v.komponenty) {
            const m = mapa.get(k.stitek);
            if (m) { this._plochyMistnosti.set(m.id, k.plocha_m2); this._plochyMistnostiZapocet.set(m.id, k.zapocitatelna_m2 ?? null); }
        }

        // Výplň: barva záznamu, vybraná místnost o něco sytější. Bitmapa jen při změně.
        const ztmav = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
        const klic = this._mistnostiPodpis + '|' + [...mapa.values()].map(m => m.id + m.barva + (this.selectedMistnosti.has(m.id) ? '*' : '')).join(',');
        if (klic !== this._mistnostiObrazKlic) {
            this._mistnostiObraz = R.obrazVyplne(v, (stitek) => {
                const m = mapa.get(stitek);
                if (!m) return null;
                return this.selectedMistnosti.has(m.id) ? ztmav(m.barva, 0.93) : m.barva;
            });
            this._mistnostiObrazKlic = klic;
        }
        const img = new Konva.Image({ image: this._mistnostiObraz, x: v.x0, y: v.y0, scaleX: v.krok, scaleY: v.krok, listening: true });
        img.setAttr('_mistnostiObraz', true);
        this.mistnostiLayer.add(img);
        this._mistnostiShapes.push(img);

        // Popisky: název a plocha uprostřed, vzpřímeně i při otočeném kompasu
        const rot = -(this.stage.rotation() || 0);
        const citelne = this.citelnePismo(11);
        for (const k of v.komponenty) {
            const m = mapa.get(k.stitek);
            if (!m) continue;
            // Vlastní úroveň podlahy místnosti (dum.js); přenesené zvýšení má štítek na své ploše
            const u = this.urovenMistnosti ? this.urovenMistnosti(m.id) : null;
            const radky = [m.nazev || ''];
            let plocha = prelozCislo(k.plocha_m2, 1) + ' m²';
            if (k.zapocitatelna_m2 != null && Math.abs(k.zapocitatelna_m2 - k.plocha_m2) >= 0.05) {
                plocha = prelozCislo(k.zapocitatelna_m2, 1) + ' / ' + plocha;
            }
            if (u && u.typ === 'bez_podlahy') plocha = preloz('ed_kresba.bez_podlahy');
            radky.push(plocha);
            if (u && u.dh) radky.push((u.dh > 0 ? '+' : '') + prelozCislo(u.dh, 2) + ' m');
            const text = new Konva.Text({
                x: k.stred.x, y: k.stred.y,
                text: radky.join('\n'),
                fontSize: this.velikostPopisku(12), fontFamily: 'Nunito, system-ui, sans-serif', fontStyle: '600',
                fill: '#374151', align: 'center', lineHeight: 1.25, listening: false, rotation: rot, visible: citelne,
            });
            text.setAttr('_radky', radky);
            text.setAttr('_rozmer', this.showKoty ? window.KotyRetezce?.rozmerMistnosti(this, k) : null);
            this._popisekMistnosti(text);
            this.mistnostiLayer.add(text);
            this._mistnostiShapes.push(text);
            this._mistnostiPopisky.push(text);
        }
        this.mistnostiLayer.batchDraw();
    }

    /** Pojistka: po konci tahu místnosti dopočítat, i kdyby konec tahu nic nepřekreslil. */
    _dobehMistnosti() {
        if (this._mistnostiCasovac) return;
        this._mistnostiCasovac = setTimeout(() => {
            this._mistnostiCasovac = null;
            if (this.jeTah && this.jeTah()) { this._dobehMistnosti(); return; }
            if (this.showMistnosti) { this.renderMistnosti(); if (typeof this.afterRender === 'function') this.afterRender(); }
        }, 250);
    }

    /** Výřezy a masky pro rastr: bez podlahy, prostupy, šrafa pod limitem výšky v podkroví (dům doplní). */
    _maskyRastru() {
        return this.maskyRastru ? this.maskyRastru() : {};
    }

    _podpisMasek() {
        return this.podpisMasek ? this.podpisMasek() : '';
    }

    /** Zoom: popisky místností jen změní velikost, nic se nepočítá. */
    zoomMistnosti() {
        const citelne = this.citelnePismo(11);
        const vel = this.velikostPopisku(12);
        for (const t of (this._mistnostiPopisky || [])) {
            t.fontSize(vel);
            this._popisekMistnosti(t);
            t.visible(citelne);
        }
        this.mistnostiLayer.batchDraw();
    }

    /** Text popisku podle přiblížení: rozměr místnosti jen tam, kde se do ní vejde. */
    _popisekMistnosti(t) {
        const radky = t.getAttr('_radky') || [];
        const rozmer = t.getAttr('_rozmer');
        const vel = t.fontSize();
        const vejde = rozmer && rozmer.du > rozmer.text.length * vel * 0.55 && rozmer.dv > (radky.length + 1) * vel * 1.25;
        t.text((vejde ? [...radky, rozmer.text] : radky).join('\n'));
        t.offsetX(t.width() / 2);
        t.offsetY(t.height() / 2);
    }

    /**
     * Spodní podlaží jako JEDEN předkreslený obrázek: stěny se vykreslí jednou do bitmapy
     * a při zoomu a posunu se jen škáluje s plátnem. Znovu až po změně jeho dat
     * (objekt dat se při změně vyměňuje, stačí porovnat identitu).
     */
    renderSpodek() {
        const s = this.showSpodek === false ? null : this.engine.spodekAktivniho();
        const klicData = s ? this.engine.podlaziPodleId(s.podlazi.id)?.data : null;
        if (klicData === this._spodekData) return;
        this._spodekData = klicData;
        this.spodekLayer.destroyChildren();
        this._spodekObraz = null;
        if (s && s.engine.walls.size > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const polygony = [];
            for (const w of s.engine.walls.values()) {
                const poly = s.engine.getWallPolygon(w.id);
                if (!poly || poly.length < 3) continue;
                polygony.push({ poly, nosna: w.typ === 'obvodova' || w.typ === 'nosna' });
                for (const p of poly) {
                    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
                }
            }
            if (polygony.length) {
                const M = 4;
                const sirka = maxX - minX + 2 * M, vyska = maxY - minY + 2 * M;
                const meritko = Math.min(1.5, 4096 / Math.max(sirka, vyska, 1));
                const cv = document.createElement('canvas');
                cv.width = Math.ceil(sirka * meritko); cv.height = Math.ceil(vyska * meritko);
                const g = cv.getContext('2d');
                g.scale(meritko, meritko);
                g.translate(M - minX, M - minY);
                for (const { poly, nosna } of polygony) {
                    g.beginPath();
                    poly.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
                    g.closePath();
                    g.fillStyle = nosna ? '#9ca3af' : '#d1d5db';
                    g.fill();
                    g.lineWidth = 1;
                    g.strokeStyle = '#6b7280';
                    g.stroke();
                }
                this._spodekObraz = new Konva.Image({ image: cv, x: minX - M, y: minY - M, scaleX: 1 / meritko, scaleY: 1 / meritko, opacity: 0.45, listening: false });
                this.spodekLayer.add(this._spodekObraz);
            }
        }
        this.spodekLayer.batchDraw();
    }

    /** Posun domu za tahu: obrázek spodního podlaží jede s ním, přepočet až po puštění. */
    posunSpodek(dx, dy) {
        if (!this._spodekObraz) return;
        this._spodekObraz.x(this._spodekObraz.x() + dx);
        this._spodekObraz.y(this._spodekObraz.y() + dy);
        this.spodekLayer.batchDraw();
    }

    /** Zoom: tečky a úchopy konců oddělovačů drží velikost na obrazovce bez přestavby. */
    zoomOddelovace() {
        const scale = this.stage.scaleX() || 1;
        for (const s of (this._oddelovacShapes || [])) {
            const r = s.getAttr('_rPx');
            if (r) s.radius(r / scale);
        }
        this.wallLayer.batchDraw();
    }

    /** Id místnosti pod bodem plátna (kreslicí px), nebo null. */
    mistnostVBode(x, y) {
        const R = window.MistnostiRastr;
        if (!R || !this._mistnostiCache || !this._mistnostiStitky) return null;
        const s = R.stitekVBode(this._mistnostiCache, x, y);
        const m = s >= 2 ? this._mistnostiStitky.get(s) : null;
        return m ? m.id : null;
    }

    plochaMistnosti(id) {
        return this._plochyMistnosti ? (this._plochyMistnosti.get(id) ?? null) : null;
    }

    renderIds() {
        // Vyčistit staré ID texty (kumulovaly se po každém re-render — drag objektu, atd.)
        const toDel = [];
        for (const [key, shape] of this._labelShapes) {
            if (key.startsWith('id_')) {
                shape.destroy();
                toDel.push(key);
            }
        }
        toDel.forEach(k => this._labelShapes.delete(k));
        if (!this.showIds) { this.labelLayer.batchDraw(); return; }
        // Velikost podle společného pravidla s kótami a úhly (viz POPISKY)
        const v = (px) => this.velikostPopisku(px);
        // Wall IDs
        for (const wall of (this.showSteny && this.citelnePismo(10) ? this.engine.walls.values() : [])) {
            const nA = this.engine.nodes.get(wall.nodeA);
            const nB = this.engine.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            const cx = (nA.x + nB.x) / 2;
            const cy = (nA.y + nB.y) / 2;
            const dx = nB.x - nA.x, dy = nB.y - nA.y;
            const len = Math.hypot(dx, dy);
            if (len < 1) continue;
            const tl = wall.tloustka * this.PX_PER_M;
            // Offset NA OPAČNOU stranu než kóta (směr -nx, -ny)
            const nx = -dy / len, ny = dx / len;
            const offset = tl / 2 + v(10);
            const text = new Konva.Text({
                x: cx - nx * offset,
                y: cy - ny * offset,
                text: wall.id,
                fontSize: v(10),
                fill: '#9333ea',
                fontStyle: 'bold',
                listening: false,
            });
            text.offsetX(text.width() / 2);
            text.offsetY(text.height() / 2);
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angle > 90 || angle < -90) angle += 180;
            text.rotation(angle);
            this.labelLayer.add(text);
            this._labelShapes.set('id_' + wall.id, text);
        }
        // Opening IDs
        for (const opening of (this.showOtvory && this.citelnePismo(9) ? this.engine.openings.values() : [])) {
            const wall = this.engine.walls.get(opening.wallId);
            if (!wall) continue;
            const nA = this.engine.nodes.get(wall.nodeA);
            const nB = this.engine.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            const dx = nB.x - nA.x, dy = nB.y - nA.y;
            const len = Math.hypot(dx, dy);
            if (len < 1) continue;
            const dirX = dx / len, dirY = dy / len;
            const pozPx = opening.pozice * this.PX_PER_M + (opening.sirka * this.PX_PER_M) / 2;
            const ox = nA.x + dirX * pozPx;
            const oy = nA.y + dirY * pozPx;
            const text = new Konva.Text({
                x: ox,
                y: oy,
                text: opening.id,
                fontSize: v(9),
                fill: '#ea580c',
                fontStyle: 'bold',
                listening: false,
            });
            text.offsetX(text.width() / 2);
            text.offsetY(text.height() / 2);
            this.labelLayer.add(text);
            this._labelShapes.set('id_' + opening.id, text);
        }
        this.labelLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // STĚNY
    // ═══════════════════════════════════════════════════════
    renderWalls() {
        // Smazat staré
        for (const shape of this._wallShapes.values()) shape.destroy();
        this._wallShapes.clear();

        if (!this.showSteny) { this.wallLayer.batchDraw(); return; }

        const scale = this.stage ? this.stage.scaleX() : 1;
        for (const wall of this.engine.walls.values()) {
            const selected = this.selectedWalls.has(wall.id);
            const polygon = this.engine.getWallPolygon(wall.id);
            if (polygon.length < 3) continue;

            const points = [];
            polygon.forEach(p => { points.push(p.x, p.y); });

            const typDef = (typeof TYPY_STEN !== 'undefined' && TYPY_STEN[wall.typ]) || {};
            const fillColor = typDef.barva2d || '#4b5563';
            const strokeColor = typDef.barva2dStroke || '#1f2937';

            const shape = new Konva.Line({
                points: points,
                closed: true,
                fill: fillColor,
                stroke: selected ? VYBER.obrys : strokeColor,
                strokeWidth: 1,
                hitStrokeWidth: 20,
            });

            shape.setAttr('_wallId', wall.id);
            this.wallLayer.add(shape);
            this._wallShapes.set(wall.id, shape);
        }
        this.wallLayer.batchDraw();
    }

    /**
     * Oddělovače místností: tenká čárkovaná čára konstantní šířky na obrazovce
     * (nulová tloušťka v datech), s tečkami na koncích. Leží ve vrstvě stěn nad nimi.
     */
    renderOddelovace() {
        for (const s of this._oddelovacShapes) s.destroy();
        this._oddelovacShapes = [];
        if (!this.showSteny) { this.wallLayer.batchDraw(); return; }
        const scale = this.stage ? this.stage.scaleX() || 1 : 1;
        for (const o of this.engine.oddelovace.values()) {
            const a = this.engine.bodKonceOddelovace(o.a);
            const b = this.engine.bodKonceOddelovace(o.b);
            const selected = this.selectedOddelovace.has(o.id);
            const barva = selected ? VYBER.obrys : '#6b7280';
            const cara = new Konva.Line({
                points: [a.x, a.y, b.x, b.y],
                stroke: barva, strokeWidth: selected ? 2.5 : 1.5, strokeScaleEnabled: false,
                dash: [6, 4], lineCap: 'round', hitStrokeWidth: 12,
            });
            cara.setAttr('_oddelovacId', o.id);
            this.wallLayer.add(cara);
            this._oddelovacShapes.push(cara);
            for (const p of [a, b]) {
                const tecka = new Konva.Circle({ x: p.x, y: p.y, radius: 3 / scale, fill: barva, listening: false });
                tecka.setAttr('_rPx', 3);
                this.wallLayer.add(tecka);
                this._oddelovacShapes.push(tecka);
                // Neviditelný úchop konce nad stěnou: konec leží na líci a stisk by jinak chytil stěnu
                const uchop = new Konva.Circle({ x: p.x, y: p.y, radius: 9 / scale, fill: 'rgba(0,0,0,0.001)' });
                uchop.setAttr('_rPx', 9);
                uchop.setAttr('_oddelovacId', o.id);
                this.wallLayer.add(uchop);
                this._oddelovacShapes.push(uchop);
            }
        }
        this.wallLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // NODY (spojovací body)
    // ═══════════════════════════════════════════════════════
    renderNodes() {
        for (const shape of this._nodeShapes.values()) shape.destroy();
        this._nodeShapes.clear();

        // Vlastní vrstva se po smazání uzlů musí překreslit, jinak by na plátně
        // zůstaly viset staré kroužky.
        if (!this.showSteny) { this.nodeLayer.batchDraw(); return; }

        // Vypnutý přepínač Body: kreslí se jen body u výběru
        const jenVyber = this.showNodes ? null : this._bodyVyberu();

        // Nový režim editoru: barvy podle typu napojení (L/T/X/frozen).
        // Aktivuje se pomocí this.nodeColorByJunctionType = true (option).
        const useJunctionColors = this.nodeColorByJunctionType === true;

        for (const node of this.engine.nodes.values()) {
            if (jenVyber && !jenVyber.has(node.id)) continue;
            const selected = this.selectedNodes.has(node.id);
            let fill, stroke, radius;

            const wallsAtNode = this.engine.getNodeWalls(node.id);

            // Výběr mění JEN barvu okraje — výplň i velikost zůstávají. Přebarvený
            // celý bod překryl informaci, kterou výplň nese (typ napojení).
            if (useJunctionColors) {
                const type = this.engine.getNodeJunctionType(node.id);
                radius = 5;                                       // výběr velikost nemění
                fill = type === 'frozen' ? '#9ca3af' : '#3b82f6'; // šedá = frozen, modrá = ostatní
                stroke = selected ? VYBER.obrys : (type === 'frozen' ? '#6b7280' : '#1d4ed8');
                node._junctionType = type; // pro tooltip / další UI
            } else {
                // Původní barvy (zachovat pro produkční koncept-k)
                const hasMultipleWalls = wallsAtNode.length >= 2;
                fill = hasMultipleWalls ? '#f97316' : '#9ca3af';
                stroke = selected ? VYBER.obrys : '#6b7280';
                radius = hasMultipleWalls ? 5 : 4;
            }

            const circle = new Konva.Circle({
                x: node.x, y: node.y,
                radius, fill, stroke,
                strokeWidth: 1,
                hitStrokeWidth: 15,
            });

            circle.setAttr('_nodeId', node.id);
            this.nodeLayer.add(circle);
            this._nodeShapes.set(node.id, circle);
        }
        this.nodeLayer.batchDraw();
    }

    /**
     * Body vybrané stěny: její konce a konce stěn napojených na ni. Vybraný bod se počítá
     * se všemi svými stěnami, jinak by klik na bod ostatní schoval a na další by se nedalo přejít.
     */
    _bodyVyberu() {
        const steny = new Set(this.selectedWalls);
        for (const id of this.selectedNodes) {
            for (const w of this.engine.getNodeWalls(id)) steny.add(w.id);
        }
        const body = new Set(this.selectedNodes);
        for (const id of steny) {
            const w = this.engine.walls.get(id);
            if (!w) continue;
            body.add(w.nodeA);
            body.add(w.nodeB);
            for (const d of this.engine.getTChildren(id)) body.add(d.end === 'a' ? d.wall.nodeA : d.wall.nodeB);
        }
        return body;
    }

    // ═══════════════════════════════════════════════════════
    // OTVORY
    // ═══════════════════════════════════════════════════════
    renderOpenings() {
        for (const shape of this._openingShapes.values()) shape.destroy();
        this._openingShapes.clear();
        // Vyčistit všechny dveřní detaily (oblouky, křídla, posuvné čáry) — name="_doorDetail_*"
        this.overlayLayer.find(n => typeof n.name === 'function' && String(n.name()).startsWith('_doorDetail_'))
            .forEach(n => n.destroy());

        if (!this.showOtvory) {
            this.openingLayer.batchDraw();
            this.overlayLayer.batchDraw();
            return;
        }

        for (const opening of this.engine.openings.values()) {
            const wall = this.engine.walls.get(opening.wallId);
            if (!wall) continue;

            const nA = this.engine.nodes.get(wall.nodeA);
            const nB = this.engine.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;

            const dx = nB.x - nA.x;
            const dy = nB.y - nA.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) continue;

            const dirX = dx / len;
            const dirY = dy / len;
            const tl = wall.tloustka * this.PX_PER_M;
            const pozPx = opening.pozice * this.PX_PER_M;
            const sirPx = opening.sirka * this.PX_PER_M;
            const uhel = Math.atan2(dy, dx) * (180 / Math.PI);

            const ox = nA.x + dirX * pozPx;
            const oy = nA.y + dirY * pozPx;

            const selected = this.selectedOpenings.has(opening.id);
            const otvorDef = (typeof TYPY_OTVORU !== 'undefined' && TYPY_OTVORU[opening.typ]) || {};
            const barva = otvorDef.barva2d || '#c2410c';

            const rect = new Konva.Rect({
                x: ox,
                y: oy,
                width: sirPx,
                height: tl + 4,
                fill: '#ffffff',
                stroke: selected ? VYBER.obrys : barva,
                strokeWidth: 1.5,
                rotation: uhel,
                offsetY: (tl + 4) / 2,
                hitStrokeWidth: 15,
            });

            rect.setAttr('_openingId', opening.id);
            this.openingLayer.add(rect);
            this._openingShapes.set(opening.id, rect);

            // Dveřní oblouk / posuvné / lítačky — vykreslit na overlayLayer
            this._drawOpeningDetail(opening, { nA, dirX, dirY, pozPx, sirPx, tl, barva });
        }
        this.openingLayer.batchDraw();
        this.overlayLayer.batchDraw();
    }

    /**
     * Kreslí detail otvoru podle křídel: dveřní oblouky, posuvné křídlo s pouzdrem,
     * u oken trojúhelník otevírání (značka V podle ČSN 01 3420: otevřená strana
     * u závěsů, hrot od osy otáčení) a dělicí příčle mezi křídly.
     */
    _drawOpeningDetail(opening, ctx) {
        // Vyčistit předchozí shapes tohoto otvoru
        this.overlayLayer.find('._doorDetail_' + opening.id).forEach(n => n.destroy());
        const kridla = (typeof kridlaOtvoru === 'function') ? kridlaOtvoru(opening) : [];
        if (kridla.length === 0) return; // průchod / otvor bez křídla = nic nekreslit

        const { nA, dirX, dirY, pozPx, sirPx, barva } = ctx;
        const nx = -dirY, ny = dirX; // normála zdi
        const PX = this.PX_PER_M;
        const wall = this.engine.walls.get(opening.wallId);
        const tlPx = wall ? wall.tloustka * PX : 10;
        const pas = tlPx + 4; // výška obdélníku otvoru (viz renderOpenings)
        // Okna se otvírají dovnitř automaticky, dveře podle uložené strany (viz engine.stranaOtvoru)
        const strana = this.engine.stranaOtvoru ? this.engine.stranaOtvoru(opening) : (opening.strana || 'in');
        const sideSign = strana === 'in' ? 1 : -1;
        // Každý díl může mít vlastní parapet (dvojokno); díl k podlaze se kreslí jako dveře
        const dilKPodlaze = (k) => ((typeof parapetKridla === 'function') ? parapetKridla(opening, k) : 0) < 0.05;
        const name = '_doorDetail_' + opening.id;
        // Značky jsou jen dekorace: listening:false, jinak kliknutí dopadlo na
        // trojúhelník okna (leží v pásu stěny), hitTest nenašel _openingId a výběr
        // se zrušil — proto se u oken „někdy" neukázal panel vlastností.
        // Bod: t = vzdálenost podél stěny od uzlu A (px), s = odsazení kolmo (px)
        const bod = (t, s) => ({ x: nA.x + dirX * t + nx * s, y: nA.y + dirY * t + ny * s });
        const cara = (body, extra = {}) => this.overlayLayer.add(new Konva.Line({
            points: body.flatMap(b => [b.x, b.y]),
            stroke: barva, strokeWidth: 1, name, listening: false,
            ...extra,
        }));

        // Rozsahy křídel podél stěny; poslední křídlo dorovná na konec otvoru
        const rozsahy = [];
        let t = pozPx;
        kridla.forEach((k, i) => {
            const t1 = i === kridla.length - 1 ? pozPx + sirPx : Math.min(pozPx + sirPx, t + k.sirka * PX);
            rozsahy.push([t, t1]);
            t = t1;
        });

        // Dělicí příčle mezi křídly
        for (let i = 1; i < rozsahy.length; i++) {
            cara([bod(rozsahy[i][0], -pas / 2), bod(rozsahy[i][0], pas / 2)], { strokeWidth: 1.2 });
        }

        // Samotné posuvné křídlo — zasouvá se do pouzdra ve stěně
        if (kridla.length === 1 && kridla[0].otv === 'posuvne') {
            this._drawPosuvneSPouzdrem(opening, { nA, dirX, dirY, nx, ny, pozPx, sirPx, tlPx, barva, name });
            return;
        }

        // Dveřní křídlo s obloukem — hingeT = pant, closedSign = směr zavřeného křídla podél stěny
        const drawLeaf = (hingeT, closedSign, wingLen) => {
            const hingeX = nA.x + dirX * hingeT;
            const hingeY = nA.y + dirY * hingeT;
            const closedDX = dirX * closedSign, closedDY = dirY * closedSign;
            const openDX = nx * sideSign, openDY = ny * sideSign;
            const a0 = Math.atan2(closedDY, closedDX);
            const a1 = Math.atan2(openDY, openDX);
            let delta = a1 - a0;
            while (delta > Math.PI) delta -= 2 * Math.PI;
            while (delta < -Math.PI) delta += 2 * Math.PI;
            const counterclockwise = delta < 0;
            this.overlayLayer.add(new Konva.Shape({
                sceneFunc: function (c, s) {
                    c.beginPath();
                    c.arc(hingeX, hingeY, wingLen, a0, a1, counterclockwise);
                    c.strokeShape(s);
                },
                stroke: barva, strokeWidth: 1.2, name, listening: false,
            }));
            this.overlayLayer.add(new Konva.Line({
                points: [hingeX, hingeY, hingeX + openDX * wingLen, hingeY + openDY * wingLen],
                stroke: barva, strokeWidth: 1.5, name, listening: false,
            }));
        };

        kridla.forEach((k, i) => {
            const [t0, t1] = rozsahy[i];
            const sklopne = (typeof kridloSklopne === 'function') ? kridloSklopne(k) : false;
            if (t1 - t0 < 1 || (k.otv === 'fix' && !sklopne)) return;
            // Sklopné (i u posuvného a u pevného = větračka): čárkovaný trojúhelník napříč —
            // základna podél křídla na odvrácené straně, hrot uprostřed na straně otvírání
            if (sklopne) {
                cara([bod(t0, -sideSign * pas / 2), bod(t1, -sideSign * pas / 2), bod((t0 + t1) / 2, sideSign * pas / 2)],
                     { closed: true, dash: [3, 2] });
            }
            if (k.otv === 'fix') return;

            if (k.otv === 'posuvne') {
                // HS portál: křídlo vysunuté na stranu otvírání + šipka k pevnému dílu, před který se zasouvá
                const s = sideSign * pas / 4;
                const tloustkaKridla = Math.min(3, tlPx * 0.3);
                cara([bod(t0, s - tloustkaKridla / 2), bod(t1, s - tloustkaKridla / 2),
                      bod(t1, s + tloustkaKridla / 2), bod(t0, s + tloustkaKridla / 2)],
                     { closed: true, fill: barva, opacity: 0.35 });
                const kPevnemu = (typeof smerPosunuKridla === 'function') ? smerPosunuKridla(kridla, i) : 1;
                const stredT = (t0 + t1) / 2;
                const delkaSipky = Math.min((t1 - t0) * 0.4, 20);
                const od = bod(stredT - kPevnemu * delkaSipky / 2, s);
                const kam = bod(stredT + kPevnemu * delkaSipky / 2, s);
                this.overlayLayer.add(new Konva.Arrow({
                    points: [od.x, od.y, kam.x, kam.y],
                    stroke: barva, strokeWidth: 1.5, fill: barva,
                    pointerLength: 5, pointerWidth: 5, opacity: 0.8, name, listening: false,
                }));
                return;
            }

            const panty = (typeof kridloPanty === 'function') ? kridloPanty(k.otv) : null;
            if (panty) {
                const hingeT = panty === 'levy' ? t0 : t1;
                const volnyT = panty === 'levy' ? t1 : t0;
                if (dilKPodlaze(k)) {
                    drawLeaf(hingeT, panty === 'levy' ? 1 : -1, t1 - t0);
                } else {
                    // Okno: tenký trojúhelník — základna přes pás u pantů, hrot u volného konce
                    cara([bod(hingeT, -pas / 2), bod(hingeT, pas / 2), bod(volnyT, 0)], { closed: true });
                }
            }
        });
    }

    /** Posuvné křídlo do pouzdra: křídlo přes otvor, čárkované pouzdro vedle a šipka směru zasunutí. */
    _drawPosuvneSPouzdrem(opening, ctx) {
        const { nA, dirX, dirY, nx, ny, pozPx, sirPx, tlPx, barva, name } = ctx;
        // Strana zasunutí: strana='in' = směr nodeA, strana='out' = směr nodeB.
        const strana = opening.strana || 'in';
        const slideToNodeA = (strana === 'in');
        // Křídlo (tenký obdélník přes otvor)
        const wingThk = Math.min(3, tlPx * 0.3);
        const wingStartT = pozPx;
        const wingEndT = pozPx + sirPx;
        const wingPts = [
            nA.x + dirX * wingStartT - nx * wingThk / 2, nA.y + dirY * wingStartT - ny * wingThk / 2,
            nA.x + dirX * wingEndT - nx * wingThk / 2, nA.y + dirY * wingEndT - ny * wingThk / 2,
            nA.x + dirX * wingEndT + nx * wingThk / 2, nA.y + dirY * wingEndT + ny * wingThk / 2,
            nA.x + dirX * wingStartT + nx * wingThk / 2, nA.y + dirY * wingStartT + ny * wingThk / 2,
        ];
        this.overlayLayer.add(new Konva.Line({
            points: wingPts, closed: true,
            fill: barva, opacity: 0.35,
            stroke: barva, strokeWidth: 1,
            name, listening: false,
        }));
        // Pouzdro — čárkovaný obdélník vedle otvoru, délka = sirPx, výška = tloušťka stěny
        const pouzdroStart = slideToNodeA ? (pozPx - sirPx) : (pozPx + sirPx);
        const pouzdroEnd = slideToNodeA ? pozPx : (pozPx + 2 * sirPx);
        const halfTl = tlPx / 2;
        const pts = [
            nA.x + dirX * pouzdroStart - nx * halfTl, nA.y + dirY * pouzdroStart - ny * halfTl,
            nA.x + dirX * pouzdroEnd - nx * halfTl, nA.y + dirY * pouzdroEnd - ny * halfTl,
            nA.x + dirX * pouzdroEnd + nx * halfTl, nA.y + dirY * pouzdroEnd + ny * halfTl,
            nA.x + dirX * pouzdroStart + nx * halfTl, nA.y + dirY * pouzdroStart + ny * halfTl,
        ];
        this.overlayLayer.add(new Konva.Line({
            points: pts, closed: true,
            stroke: barva, strokeWidth: 1,
            dash: [5, 3],
            opacity: 0.7,
            name, listening: false,
        }));
        // Šipka směru zasunutí (malá, uprostřed pouzdra)
        const arrowMidT = (pouzdroStart + pouzdroEnd) / 2;
        const arrowMidX = nA.x + dirX * arrowMidT;
        const arrowMidY = nA.y + dirY * arrowMidT;
        const arrowLen = Math.min(sirPx * 0.3, 20);
        const arrowDirSign = slideToNodeA ? -1 : 1;
        this.overlayLayer.add(new Konva.Arrow({
            points: [
                arrowMidX - dirX * arrowLen / 2 * arrowDirSign,
                arrowMidY - dirY * arrowLen / 2 * arrowDirSign,
                arrowMidX + dirX * arrowLen / 2 * arrowDirSign,
                arrowMidY + dirY * arrowLen / 2 * arrowDirSign,
            ],
            stroke: barva, strokeWidth: 1.5,
            fill: barva,
            pointerLength: 5, pointerWidth: 5,
            opacity: 0.8,
            name, listening: false,
        }));
    }

    // ═══════════════════════════════════════════════════════
    // KÓTY (rozměry stěn)
    // ═══════════════════════════════════════════════════════
    renderKoty() {
        // Jen kóty — označení stěn a otvorů (id_*) sdílí tutéž mapu a dřív
        // tady mizela s nimi, takže po zoomu kolečkem nebyla vidět.
        for (const [key, shape] of this._labelShapes) {
            if (!key.startsWith('kota_')) continue;
            shape.destroy();
            this._labelShapes.delete(key);
        }

        this._kotyRetezce = [];
        if (!this.showSteny) { this.labelLayer.batchDraw(); return; }

        const v = (px) => this.velikostPopisku(px);
        const tah = !!(this.jeTah && this.jeTah());

        // Řetězce kolem domu; za tahu ne, po puštění se nakreslí znovu
        if (this.showKoty && !tah && window.KotyRetezce) {
            const skupina = new Konva.Group({ listening: false });
            this._kotyRetezce = window.KotyRetezce.kresli(this, skupina);
            this.labelLayer.add(skupina);
            this._labelShapes.set('kota_retezce', skupina);
        }

        if (!this.citelnePismo(11)) { this.labelLayer.batchDraw(); return; }

        // Délka jen u toho, s čím se pracuje. Za tahu i u navazujících stěn, těm se mění.
        const sDelkou = new Set(this.selectedWalls);
        for (const id of this.selectedNodes) {
            for (const w of this.engine.getNodeWalls(id)) sDelkou.add(w.id);
        }
        if (tah) {
            for (const id of [...sDelkou]) {
                const w = this.engine.walls.get(id);
                if (!w) continue;
                for (const n of [w.nodeA, w.nodeB]) {
                    for (const s of this.engine.getNodeWalls(n)) sDelkou.add(s.id);
                }
            }
        }

        for (const id of sDelkou) {
            const wall = this.engine.walls.get(id);
            if (!wall) continue;
            const nA = this.engine.nodes.get(wall.nodeA);
            const nB = this.engine.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;

            const delka = this.engine.getWallLength(wall.id);
            if (delka < 0.2) continue;

            const cx = (nA.x + nB.x) / 2;
            const cy = (nA.y + nB.y) / 2;
            const tl = wall.tloustka * this.PX_PER_M;

            // Posunout kótu nad stěnu
            const dx = nB.x - nA.x;
            const dy = nB.y - nA.y;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len;
            const ny = dx / len;
            const offset = tl / 2 + v(10); // 10 px od kraje stěny (viz POPISKY)

            const text = new Konva.Text({
                x: cx + nx * offset,
                y: cy + ny * offset,
                text: prelozCislo(delka, 2) + ' m',
                fontSize: v(11),
                fill: '#6b7280',
                align: 'center',
                offsetX: 0,
                offsetY: 0,
                listening: false,
            });

            // Vycentrovat
            text.offsetX(text.width() / 2);
            text.offsetY(text.height() / 2);

            // Rotovat aby sledoval stěnu
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angle > 90 || angle < -90) angle += 180;
            text.rotation(angle);

            this.labelLayer.add(text);
            this._labelShapes.set('kota_' + wall.id, text);
        }
        this.labelLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // MŘÍŽKA
    // ═══════════════════════════════════════════════════════
    highlightWall(wallId) {
        for (const [id, shape] of this._wallShapes) {
            const wall = this.engine.walls.get(id);
            const typDef = (typeof TYPY_STEN !== 'undefined' && wall && TYPY_STEN[wall.typ]) || {};
            const defaultFill = typDef.barva2d || '#4b5563';
            const defaultStroke = typDef.barva2dStroke || '#1f2937';
            const selected = this.selectedWalls.has(id);
            const hovered = id === wallId;
            shape.fill(hovered ? '#2563eb' : defaultFill);
            shape.stroke(selected ? VYBER.obrys : (hovered ? '#1d4ed8' : defaultStroke));
            shape.opacity(hovered ? 0.8 : 1);
        }
        this.wallLayer.batchDraw();
    }

    highlightOpening(openingId) {
        for (const [id, shape] of this._openingShapes) {
            const opening = this.engine.openings.get(id);
            const otvorDef = (typeof TYPY_OTVORU !== 'undefined' && opening && TYPY_OTVORU[opening.typ]) || {};
            const selected = this.selectedOpenings.has(id);
            const hovered = id === openingId;
            shape.fill(hovered ? '#2563eb' : '#ffffff');
            shape.stroke(selected ? VYBER.obrys : (hovered ? '#1d4ed8' : (otvorDef.barva2d || '#c2410c')));
            shape.opacity(hovered ? 0.8 : 1);
        }
        this.openingLayer.batchDraw();
    }

    /** Velikost popisku ve výkresu pro `px` obrazovkových pixelů (viz POPISKY). */
    velikostPopisku(px) {
        return px / Math.max(this.stage.scaleX() || 1, POPISKY.zoomMez);
    }

    /** Je písmo velikosti `px` (při plném zobrazení) na obrazovce ještě čitelné? */
    citelnePismo(px) {
        return px * Math.min(1, (this.stage.scaleX() || 1) / POPISKY.zoomMez) >= POPISKY.minPismo;
    }

    /**
     * Překreslí vše, co závisí na přiblížení. Jediné místo — kolečko, tlačítka
     * zoomu i „zobrazit vše" volají tohle, ať se nic nezapomene (dřív se úhly
     * při zoomu nepřekreslily a označení stěn zmizela).
     */
    poZmeneZoomu() {
        this.renderGrid();
        this.renderKoty();
        this.renderIds();
        this.resizeVysky();
        // Tečky a popisky jen změní velikost — zoom nepřestavuje kresbu ani nepočítá rastr
        this.zoomOddelovace();
        this.zoomMistnosti();
        if (this.zoomDum) this.zoomDum();
        window.KotyVyberu?.kresli(this);
        if (typeof this.afterZoom === 'function') this.afterZoom();
    }

    resizeVysky() {
        if (!this._vyskyShapes || this._vyskyShapes.length === 0) return;
        const scale = this.stage.scaleX();
        const r = 3 / scale;
        this._vyskyShapes.forEach(c => c.radius(r));
        this.katastrLayer.batchDraw();
    }

    renderGrid() {
        this.gridLayer.destroyChildren();
        if (this.showGrid === false) { this.gridLayer.batchDraw(); return; }
        const w = this.stage.width();
        const h = this.stage.height();
        const scale = this.stage.scaleX();
        const rot = this.stage.rotation() * Math.PI / 180;
        const pos = this.stage.position();

        // Viewport corners v world space (zohledňuje rotaci + offset)
        const ox = this.stage.offsetX();
        const oy = this.stage.offsetY();
        const cosR = Math.cos(-rot), sinR = Math.sin(-rot);
        const corners = [
            { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }
        ].map(c => {
            const dx = (c.x - pos.x) / scale;
            const dy = (c.y - pos.y) / scale;
            return {
                x: dx * cosR - dy * sinR + ox,
                y: dx * sinR + dy * cosR + oy,
            };
        });
        const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
        // Větší margin pro pokrytí rotovaného viewport
        const diag = Math.hypot(w, h) / scale;
        const margin = diag * 0.3;
        const startX = Math.min(...xs) - margin;
        const endX = Math.max(...xs) + margin;
        const startY = Math.min(...ys) - margin;
        const endY = Math.max(...ys) + margin;

        // Multi-level adaptive grid
        // Úrovně: 100m, 10m, 1m, 10cm — zobrazují se podle zoomu
        const pxM = this.PX_PER_M;
        const levels = [
            { step: pxM * 100, color: '#c4c9d1', width: 0.8, minScale: 0.05 },  // 100m — skrýt při extrémním oddálení
            { step: pxM * 10,  color: '#b8bdc5', width: 0.8, minScale: 0.12 },  // 10m
            { step: pxM * 1,   color: '#c4c9d1', width: 0.5, minScale: 0.3 },   // 1m
            { step: pxM * 0.1, color: '#d1d5db', width: 0.3, minScale: 1.5 },   // 10cm
        ];

        const rangeX = endX - startX, rangeY = endY - startY;

        let anyDrawn = false;
        for (const lvl of levels) {
            if (scale < lvl.minScale) continue;
            // Přeskočit level pokud by generoval víc než 600 čar (X+Y dohromady)
            const countX = rangeX / lvl.step;
            const countY = rangeY / lvl.step;
            if (countX + countY > 600) continue;
            anyDrawn = true;

            const minX = Math.floor(startX / lvl.step) * lvl.step;
            const minY = Math.floor(startY / lvl.step) * lvl.step;

            for (let x = minX; x <= endX; x += lvl.step) {
                this.gridLayer.add(new Konva.Line({
                    points: [x, startY, x, endY],
                    stroke: lvl.color,
                    strokeWidth: lvl.width / scale,
                }));
            }
            for (let y = minY; y <= endY; y += lvl.step) {
                this.gridLayer.add(new Konva.Line({
                    points: [startX, y, endX, y],
                    stroke: lvl.color,
                    strokeWidth: lvl.width / scale,
                }));
            }
        }

        // Fallback — pokud žádný level neprošel, vykresli nejhrubší
        if (!anyDrawn) {
            const fb = levels[0]; // 100m
            const minX = Math.floor(startX / fb.step) * fb.step;
            const minY = Math.floor(startY / fb.step) * fb.step;
            for (let x = minX; x <= endX; x += fb.step) {
                this.gridLayer.add(new Konva.Line({ points: [x, startY, x, endY], stroke: fb.color, strokeWidth: fb.width / scale }));
            }
            for (let y = minY; y <= endY; y += fb.step) {
                this.gridLayer.add(new Konva.Line({ points: [startX, y, endX, y], stroke: fb.color, strokeWidth: fb.width / scale }));
            }
        }

        // Osy
        this.gridLayer.add(new Konva.Line({ points: [0, startY, 0, endY], stroke: '#94a3b8', strokeWidth: 1 / scale }));
        this.gridLayer.add(new Konva.Line({ points: [startX, 0, endX, 0], stroke: '#94a3b8', strokeWidth: 1 / scale }));

        this.gridLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // SELECTION
    // ═══════════════════════════════════════════════════════
    setSelection(wallIds = [], nodeIds = [], openingIds = [], vybaveniIds = [], prostoryIds = [], oddelovaceIds = [], mistnostiIds = []) {
        this.selectedWalls = new Set(wallIds);
        this.selectedNodes = new Set(nodeIds);
        this.selectedOpenings = new Set(openingIds);
        this.selectedVybaveni = new Set(vybaveniIds);
        this.selectedProstory = new Set(prostoryIds);
        this.selectedOddelovace = new Set(oddelovaceIds);
        this.selectedMistnosti = new Set(mistnostiIds);
        this.selectedSchody = new Set();
        this.selectedPlochy = new Set();
        this.render();
    }

    clearSelection() {
        this.selectedWalls.clear();
        this.selectedNodes.clear();
        this.selectedOpenings.clear();
        this.selectedVybaveni.clear();
        this.selectedOddelovace.clear();
        this.selectedMistnosti.clear();
        this.selectedSchody.clear();
        this.selectedPlochy.clear();
        this.selectedProstory.clear();
        this.render();
    }

    toggleVybaveniSelection(id) {
        if (this.selectedVybaveni.has(id)) {
            this.selectedVybaveni.delete(id);
        } else {
            this.selectedVybaveni.add(id);
        }
        this.render();
    }

    toggleProstorSelection(id) {
        if (this.selectedProstory.has(id)) {
            this.selectedProstory.delete(id);
        } else {
            this.selectedProstory.add(id);
        }
        this.render();
    }

    toggleWallSelection(wallId) {
        if (this.selectedWalls.has(wallId)) {
            this.selectedWalls.delete(wallId);
        } else {
            this.selectedWalls.add(wallId);
        }
        this.render();
    }

    toggleOpeningSelection(openingId) {
        if (this.selectedOpenings.has(openingId)) {
            this.selectedOpenings.delete(openingId);
        } else {
            this.selectedOpenings.add(openingId);
        }
        this.render();
    }

    selectAll() {
        for (const wall of this.engine.walls.values()) {
            this.selectedWalls.add(wall.id);
        }
        for (const opening of this.engine.openings.values()) {
            this.selectedOpenings.add(opening.id);
        }
        for (const v of (this.engine.vybaveni || [])) {
            this.selectedVybaveni.add(v.id);
        }
        for (const p of (this.engine.prostory || [])) {
            this.selectedProstory.add(p.id);
        }
        this.render();
    }

    // ═══════════════════════════════════════════════════════
    // TEMP (preview při kreslení)
    // ═══════════════════════════════════════════════════════
    drawTempWall(x1, y1, x2, y2, tloustka = 0.3) {
        this.overlayLayer.find('.temp').forEach(n => n.destroy());

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;

        const tl = tloustka * this.PX_PER_M;
        const half = tl / 2;
        const nx = -dy / len;
        const ny = dx / len;

        const points = [
            x1 + nx * half, y1 + ny * half,
            x2 + nx * half, y2 + ny * half,
            x2 - nx * half, y2 - ny * half,
            x1 - nx * half, y1 - ny * half,
        ];

        this.overlayLayer.add(new Konva.Line({
            points: points,
            closed: true,
            fill: 'rgba(75, 85, 99, 0.4)',
            stroke: '#6b7280',
            strokeWidth: 1,
            dash: [4, 4],
            name: 'temp',
        }));

        this.overlayLayer.batchDraw();
    }

    clearTemp() {
        this.overlayLayer.find('.temp').forEach(n => n.destroy());
        this.overlayLayer.batchDraw();
    }

    clearMapTiles() {
        if (this.mapLayer) {
            this.mapLayer.destroyChildren();
            this.mapLayer.batchDraw();
        }
    }

    // Rubber-band selection rect
    drawSelectionRect(x, y, w, h) {
        this.selectionLayer.find('.rubberband').forEach(n => n.destroy());
        if (Math.abs(w) > 2 || Math.abs(h) > 2) {
            this.selectionLayer.add(new Konva.Rect({
                x: w < 0 ? x + w : x,
                y: h < 0 ? y + h : y,
                width: Math.abs(w),
                height: Math.abs(h),
                stroke: '#3b82f6',
                strokeWidth: 1 / this.stage.scaleX(),
                fill: 'rgba(59, 130, 246, 0.08)',
                name: 'rubberband',
            }));
        }
        this.selectionLayer.batchDraw();
    }

    clearSelectionRect() {
        this.selectionLayer.find('.rubberband').forEach(n => n.destroy());
        this.selectionLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // HIT TEST
    // ═══════════════════════════════════════════════════════
    /** Z Konva eventu zjistí co bylo kliknuto */
    hitTest(konvaTarget) {
        if (konvaTarget?.getAttr?.('_rotateHandle')) {
            return { type: 'rotate' };
        }

        if (konvaTarget?.getAttr?.('_spojMadlo')) {
            return { type: 'spoj' };
        }

        const wallId = konvaTarget?.getAttr?.('_wallId');
        if (wallId) return { type: 'wall', id: wallId };

        const nodeId = konvaTarget?.getAttr?.('_nodeId');
        if (nodeId) return { type: 'node', id: nodeId };

        const openingId = konvaTarget?.getAttr?.('_openingId');
        if (openingId) return { type: 'opening', id: openingId };

        const oddelovacId = konvaTarget?.getAttr?.('_oddelovacId');
        if (oddelovacId) return { type: 'oddelovac', id: oddelovacId };

        const hranaStrechy = konvaTarget?.getAttr?.('_hranaStrechy');
        if (hranaStrechy) return { type: 'hranaStrechy', klic: hranaStrechy };
        const schodyOtocId = konvaTarget?.getAttr?.('_schodyOtocId');
        if (schodyOtocId) return { type: 'schodyOtoc', id: schodyOtocId };
        const schodisteId = konvaTarget?.getAttr?.('_schodisteId');
        if (schodisteId) return { type: 'schodiste', id: schodisteId };
        // Přenesená zvýšená plocha nesmí zakrýt místnost (výběr, přejmenování): kde místnost je, patří klik jí
        const plochaId = konvaTarget?.getAttr?.('_plochaId');
        if (plochaId) {
            const p = this.stage?.getPointerPosition();
            const q = p ? this.stage.getAbsoluteTransform().copy().invert().point(p) : null;
            const idMistnosti = q ? this.mistnostVBode(q.x, q.y) : null;
            return idMistnosti ? { type: 'mistnost', id: idMistnosti } : { type: 'plocha', id: plochaId };
        }

        // _vybaveniId je nastavené na Konva.Group v renderVybaveni; klik
        // dopadne na vnitřní hit Rect, jehož parent je tato group.
        let cursor = konvaTarget;
        for (let i = 0; i < 4 && cursor; i++) {
            const vid = cursor?.getAttr?.('_vybaveniId');
            if (vid) return { type: 'vybaveni', id: vid };
            cursor = cursor.getParent ? cursor.getParent() : null;
        }

        const prostorId = konvaTarget?.getAttr?.('_prostorId');
        if (prostorId) return { type: 'prostor', id: prostorId };

        // Bitmapa místností je jeden obraz — která místnost, řekne mřížka pod kurzorem
        if (konvaTarget?.getAttr?.('_mistnostiObraz') && this.stage) {
            const p = this.stage.getPointerPosition();
            if (p) {
                const q = this.stage.getAbsoluteTransform().copy().invert().point(p);
                const id = this.mistnostVBode(q.x, q.y);
                if (id) return { type: 'mistnost', id };
            }
            return { type: 'empty' };
        }

        return { type: 'empty' };
    }

    // ═══════════════════════════════════════════════════════
    // ROTATE HANDLE — rámeček + madlo naproti předku (nejdelší stěně)
    // bbox = OBB { cx, cy, halfW, halfH, angle, handleLocalV }
    // ═══════════════════════════════════════════════════════
    renderRotateHandle(bbox, blockReason = null) {
        this.selectionLayer.find('.rotateHandle').forEach(n => n.destroy());
        if (!bbox) { this.selectionLayer.batchDraw(); return; }

        const scale = this.stage.scaleX() || 1;
        const pad = 12 / scale;
        const handleDist = 28 / scale;
        const r = 10 / scale;

        const halfW = bbox.halfW + pad;
        const halfH = bbox.halfH + pad;
        // Madlo na straně naproti předku (znaménko = směr od středu ven)
        const sign = bbox.handleLocalV >= 0 ? 1 : -1;
        const handleV = sign * (halfH + handleDist);
        const edgeV = sign * halfH;

        const blocked = !!blockReason;
        const color = blocked ? '#9ca3af' : '#3b82f6';

        // Group rotovaná do orientace předku — OBB je v lokálním frame axis-aligned.
        const group = new Konva.Group({
            x: bbox.cx,
            y: bbox.cy,
            rotation: bbox.angle * 180 / Math.PI,
            name: 'rotateHandle',
        });

        // Rámeček OBB (čárkovaný)
        group.add(new Konva.Rect({
            x: -halfW, y: -halfH,
            width: 2 * halfW, height: 2 * halfH,
            stroke: color,
            strokeWidth: 1 / scale,
            dash: [6 / scale, 4 / scale],
            listening: false,
        }));

        // Spojovací čára k madlu
        group.add(new Konva.Line({
            points: [0, edgeV, 0, handleV - sign * r],
            stroke: color,
            strokeWidth: 1 / scale,
            listening: false,
        }));

        // Kruhové madlo
        const handle = new Konva.Circle({
            x: 0, y: handleV,
            radius: r,
            fill: blocked ? '#e5e7eb' : '#dbeafe',
            stroke: color,
            strokeWidth: 1.5 / scale,
            _rotateHandle: true,
        });
        group.add(handle);

        // Ikona ↻ (kompenzujeme rotaci group → šipka zůstává svislá,
        // align/verticalAlign + offset na střed = přesné centrování v kruhu)
        const ts = 2 * r;
        group.add(new Konva.Text({
            x: 0, y: handleV,
            text: '↻',
            fontSize: 14 / scale,
            fontStyle: 'bold',
            fill: color,
            width: ts, height: ts,
            align: 'center',
            verticalAlign: 'middle',
            offsetX: ts / 2,
            offsetY: ts / 2,
            rotation: -bbox.angle * 180 / Math.PI,
            listening: false,
        }));

        this.selectionLayer.add(group);
        this.selectionLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // MADLO SLOUČENÍ — nad uzlem, kde se dají spojit dvě stěny v jednu
    // ═══════════════════════════════════════════════════════
    /** @param {?{x: number, y: number}} uzel  null = madlo schovat */
    renderSpojMadlo(uzel) {
        this.selectionLayer.find('.spojMadlo').forEach(n => n.destroy());
        if (!uzel) { this.selectionLayer.batchDraw(); return; }

        const scale = this.stage.scaleX() || 1;
        const rot = this.stage.rotation() * Math.PI / 180;
        const odsazeni = 28 / scale;
        const r = 11 / scale;
        const barva = '#3b82f6';

        // Madlo má být nad uzlem na OBRAZOVCE, ne ve světě — plátno se dá otočit.
        const group = new Konva.Group({
            x: uzel.x - Math.sin(rot) * odsazeni,
            y: uzel.y - Math.cos(rot) * odsazeni,
            rotation: -this.stage.rotation(),
            name: 'spojMadlo',
        });

        group.add(new Konva.Circle({
            x: 0, y: 0,
            radius: r,
            fill: '#dbeafe',
            stroke: barva,
            strokeWidth: 1.5 / scale,
            _spojMadlo: true,
        }));

        // Dvě šipky proti sobě = „sluč tyhle dvě stěny v jednu“.
        for (const znamenko of [-1, 1]) {
            group.add(new Konva.Arrow({
                points: [znamenko * 6.5 / scale, 0, znamenko * 1.8 / scale, 0],
                pointerLength: 3.2 / scale,
                pointerWidth: 3.6 / scale,
                fill: barva,
                stroke: barva,
                strokeWidth: 1.4 / scale,
                listening: false,
            }));
        }
        // Svislá čárka uprostřed = rušený spoj
        group.add(new Konva.Line({
            points: [0, -4.5 / scale, 0, 4.5 / scale],
            stroke: barva,
            strokeWidth: 1.2 / scale,
            listening: false,
        }));

        this.selectionLayer.add(group);
        this.selectionLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // KATASTR RENDERING
    // ═══════════════════════════════════════════════════════
    renderKatastr(parcely, showParcely, showStavby, showSousedy, zvyraznenyIndex, okolni, kompasUhel, vyskovyProfil) {
        // Smazat jen katastr objekty, NE map tiles
        this.katastrLayer.find('Line').forEach(l => l.destroy());
        this.katastrLayer.find('Text').forEach(t => t.destroy());
        this.katastrLayer.find('Circle').forEach(c => c.destroy());
        if (!parcely || parcely.length === 0) {
            this._fixedWgsCenter = null;
            this.katastrLayer.batchDraw();
            return;
        }

        // WGS84 centroid — zakotvit po první parcele (nepřepočítávat!)
        if (!this._fixedWgsCenter) {
            this._fixedWgsCenter = this._wgs84Center(parcely);
        }
        const wgsCenter = this._fixedWgsCenter;

        // Parcely — preferovat WGS84 (sjednoceno s mapou)
        if (showParcely) {
            parcely.forEach((p, i) => {
                const poly = p.polygon_wgs84 || p.polygon_sjtsk;
                if (!poly || poly.length < 3) return;

                const pts = p.polygon_wgs84
                    ? this._wgs84NaCanvas(poly, wgsCenter)
                    : this._sjtskNaCanvas(poly, this._katastrCentroid(parcely));
                if (pts.length < 3) return;

                const flatPts = [];
                pts.forEach(pt => { flatPts.push(pt.x, pt.y); });

                const highlighted = i === zvyraznenyIndex;
                this.katastrLayer.add(new Konva.Line({
                    points: flatPts,
                    closed: true,
                    fill: highlighted ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.08)',
                    stroke: highlighted ? '#FF6600' : '#FFD700',
                    strokeWidth: highlighted ? 6 : 4,
                    _rozsahExportu: true,
                }));
            });
        }

        // Stavby — WGS84
        if (showStavby) {
            parcely.forEach(p => {
                (p.stavby || []).forEach(s => {
                    if (!s.polygon_wgs84 || s.polygon_wgs84.length < 3) return;
                    const pts = this._wgs84NaCanvas(s.polygon_wgs84, wgsCenter);
                    if (pts.length < 3) return;

                    const flatPts = [];
                    pts.forEach(pt => { flatPts.push(pt.x, pt.y); });

                    this.katastrLayer.add(new Konva.Line({
                        points: flatPts,
                        closed: true,
                        fill: 'rgba(158, 158, 158, 0.3)',
                        stroke: '#9E9E9E',
                        strokeWidth: 1,
                        dash: [4, 2],
                        _rozsahExportu: true,
                    }));
                });
            });
        }

        // Sousední parcely — WGS84
        if (showSousedy && okolni && okolni.length > 0) {
            okolni.forEach(op => {
                const poly = op.polygon_wgs84 || op.polygon_sjtsk;
                if (!poly || poly.length < 3) return;

                const pts = op.polygon_wgs84
                    ? this._wgs84NaCanvas(poly, wgsCenter)
                    : this._sjtskNaCanvas(poly, this._katastrCentroid(parcely));
                if (pts.length < 3) return;

                const flatPts = [];
                pts.forEach(pt => { flatPts.push(pt.x, pt.y); });

                this.katastrLayer.add(new Konva.Line({
                    points: flatPts,
                    closed: true,
                    fill: 'rgba(200, 200, 200, 0.08)',
                    stroke: 'rgba(140, 140, 140, 0.7)',
                    strokeWidth: 2,
                    dash: [8, 4],
                }));

                // Label — přesná logika z původního konceptu (chains, ray-casting)
                if (op.label) {
                    const lpos = this._vypoctiLabelPozici(pts, parcely, wgsCenter);
                    this.katastrLayer.add(new Konva.Text({
                        x: lpos.x, y: lpos.y,
                        text: op.label,
                        fontSize: 22,
                        fontStyle: 'bold',
                        fill: 'rgba(60, 60, 60, 0.85)',
                        rotation: -(kompasUhel || 0),
                        offsetX: op.label.length * 5,
                        offsetY: 11,
                    }));
                }
            });
        }

        // Výškové body — barevné tečky (body jsou ve WGS84 [lat, lon, z])
        if (vyskovyProfil && vyskovyProfil.body && vyskovyProfil.body.length > 0 && this._fixedWgsCenter) {
            const vMin = vyskovyProfil.vyska_min;
            const vMax = vyskovyProfil.vyska_max;
            const vRange = vMax - vMin || 1;
            const scale = this.stage.scaleX();
            const vizRadius = 3 / scale; // vizuální radius
            const hitRadius = 6 / scale; // hit area 2× větší

            const wgsPts = vyskovyProfil.body.map(b => [b[0], b[1]]);
            const canvasPts = this._wgs84NaCanvas(wgsPts, this._fixedWgsCenter);

            // Uložit reference pro dynamický resize při zoomu
            this._vyskyShapes = [];

            canvasPts.forEach((pt, i) => {
                const z = vyskovyProfil.body[i][2];
                const rozdilM = Math.max(0, z - vMin).toFixed(2);
                const t = (z - vMin) / vRange;
                const r = Math.round(255 * t);
                const g = Math.round(255 * (1 - t));

                const circle = new Konva.Circle({
                    x: pt.x, y: pt.y,
                    radius: vizRadius,
                    fill: `rgb(${r},${g},60)`,
                    opacity: 0.7,
                    _vyskaZ: z,
                    _rozdilM: rozdilM,
                    hitFunc: function(context) {
                        // Hit area 2× větší než vizuální radius
                        context.beginPath();
                        context.arc(0, 0, this.radius() * 2, 0, Math.PI * 2, true);
                        context.closePath();
                        context.fillStrokeShape(this);
                    },
                });

                // Tooltip přes globální kk-tooltip
                circle.on('mouseenter', () => {
                    const tip = document.getElementById('kk-tooltip');
                    if (!tip) return;
                    tip.textContent = preloz('ed_kresba.tip_vyska_bodu', { rozdil: rozdilM, vyska: z.toFixed(1) });
                    tip.classList.add('visible');
                    // Pozice tipu — nad kurzorem
                    const stage = this.stage;
                    const pos = stage.getPointerPosition();
                    if (pos) {
                        const container = stage.container().getBoundingClientRect();
                        let left = container.left + pos.x - tip.offsetWidth / 2;
                        let top = container.top + pos.y - tip.offsetHeight - 10;
                        if (left < 4) left = 4;
                        if (left + tip.offsetWidth > window.innerWidth - 4) left = window.innerWidth - tip.offsetWidth - 4;
                        if (top < 4) top = container.top + pos.y + 15;
                        tip.style.left = left + 'px';
                        tip.style.top = top + 'px';
                    }
                });
                circle.on('mouseleave', () => {
                    const tip = document.getElementById('kk-tooltip');
                    if (tip) tip.classList.remove('visible');
                });

                this.katastrLayer.add(circle);
                this._vyskyShapes.push(circle);
            });
        }

        this.katastrLayer.batchDraw();
    }

    _katastrCentroid(parcely) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        parcely.forEach(p => {
            (p.polygon_sjtsk || []).forEach(([x, y]) => {
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            });
        });
        return [(minX + maxX) / 2, (minY + maxY) / 2];
    }

    _sjtskNaCanvas(polygonSjtsk, centroid) {
        // S-JTSK: X roste na jih, Y roste na západ (obojí záporné hodnoty)
        // Canvas: X vpravo (= -deltaY), Y dolů (= deltaX)
        // S-JTSK je v metrech → násobíme PX_PER_M pro canvas pixely
        return (polygonSjtsk || []).map(([x, y]) => ({
            x: -(y - centroid[1]) * this.PX_PER_M,
            y: (x - centroid[0]) * this.PX_PER_M,
        }));
    }

    _wgs84Center(parcely) {
        let sumLat = 0, sumLon = 0, count = 0;
        parcely.forEach(p => {
            if (p.centroid_wgs84) {
                sumLat += p.centroid_wgs84.lat;
                sumLon += p.centroid_wgs84.lon;
                count++;
            }
        });
        return count > 0 ? { lat: sumLat / count, lon: sumLon / count } : { lat: 49.8, lon: 15.5 };
    }

    _wgs84NaCanvas(polygonWgs84, center) {
        const cosLat = Math.cos(center.lat * Math.PI / 180);
        return (polygonWgs84 || []).map(([lat, lon]) => ({
            x: (lon - center.lon) * 111320 * cosLat * this.PX_PER_M,
            y: -(lat - center.lat) * 111320 * this.PX_PER_M,
        }));
    }

    // Vzdálenost bodu od úsečky
    _vzdBodHrana(px, py, ax, ay, bx, by) {
        const abx = bx - ax, aby = by - ay, apx = px - ax, apy = py - ay;
        const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby || 1)));
        return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
    }

    // Výpočet pozice labelu sousední parcely (přeneseno z původního konceptu)
    _vypoctiLabelPozici(pts, parcely, wgsCenter) {
        const centroidX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const centroidY = pts.reduce((s, p) => s + p.y, 0) / pts.length;

        // Vlastní hrany
        const vlastniPolygony = parcely.map(p => p.polygon_wgs84 ? this._wgs84NaCanvas(p.polygon_wgs84, wgsCenter) : []);
        const vlastniHrany = [];
        vlastniPolygony.forEach(vp => {
            for (let i = 0; i < vp.length; i++) {
                vlastniHrany.push({ a: vp[i], b: vp[(i + 1) % vp.length] });
            }
        });
        const vAllPts = vlastniHrany.flatMap(h => [h.a, h.b]);
        const vlastniCx = vAllPts.length > 0 ? vAllPts.reduce((s, p) => s + p.x, 0) / vAllPts.length : 0;
        const vlastniCy = vAllPts.length > 0 ? vAllPts.reduce((s, p) => s + p.y, 0) / vAllPts.length : 0;

        // Ray-casting: bod v polygonu
        const _bodVPoly = (px, py, polygon) => {
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[j].x, yj = polygon[j].y;
                if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
            }
            return inside;
        };

        // Obklopená parcela → label na centroid
        const jeObklopena = vlastniPolygony.some(vp => vp.length >= 3 && _bodVPoly(centroidX, centroidY, vp));
        if (jeObklopena) return { x: centroidX, y: centroidY };

        // Kontaktní hrany (chains)
        const blizko = 50;
        const hranyKontakt = [];
        for (let i = 0; i < pts.length; i++) {
            const pa = pts[i], pb = pts[(i + 1) % pts.length];
            let jeKontakt = false;
            for (const vh of vlastniHrany) {
                if (this._vzdBodHrana(pa.x, pa.y, vh.a.x, vh.a.y, vh.b.x, vh.b.y) < blizko &&
                    this._vzdBodHrana(pb.x, pb.y, vh.a.x, vh.a.y, vh.b.x, vh.b.y) < blizko) {
                    jeKontakt = true; break;
                }
            }
            hranyKontakt.push(jeKontakt);
        }

        // Seskupit do řetězců
        const chains = [];
        let aktChain = null;
        for (let i = 0; i < pts.length; i++) {
            if (hranyKontakt[i]) {
                if (!aktChain) aktChain = [];
                if (aktChain.length === 0) aktChain.push(pts[i]);
                aktChain.push(pts[(i + 1) % pts.length]);
            } else {
                if (aktChain) { chains.push(aktChain); aktChain = null; }
            }
        }
        if (aktChain) chains.push(aktChain);

        // Nejdelší řetězec
        let kontaktniBody = [];
        let bestLen = 0;
        for (const ch of chains) {
            let len = 0;
            for (let i = 0; i < ch.length - 1; i++) len += Math.hypot(ch[i + 1].x - ch[i].x, ch[i + 1].y - ch[i].y);
            if (len > bestLen) { bestLen = len; kontaktniBody = ch; }
        }

        // Fallback: jednotlivé body
        if (kontaktniBody.length < 2) {
            kontaktniBody = [];
            for (let i = 0; i < pts.length; i++) {
                for (const vh of vlastniHrany) {
                    if (this._vzdBodHrana(pts[i].x, pts[i].y, vh.a.x, vh.a.y, vh.b.x, vh.b.y) < blizko) {
                        kontaktniBody.push(pts[i]); break;
                    }
                }
            }
        }

        // Střed kontaktní linie + kolmice
        let mx, my, n1x = 0, n1y = 0;
        if (kontaktniBody.length >= 2) {
            const segD = [];
            let celkem = 0;
            for (let i = 0; i < kontaktniBody.length - 1; i++) {
                segD.push(Math.hypot(kontaktniBody[i + 1].x - kontaktniBody[i].x, kontaktniBody[i + 1].y - kontaktniBody[i].y));
                celkem += segD[i];
            }
            let zbyva = celkem / 2;
            mx = kontaktniBody[0].x; my = kontaktniBody[0].y;
            let tx = 1, ty = 0;
            for (let i = 0; i < segD.length; i++) {
                if (zbyva <= segD[i]) {
                    const t = zbyva / (segD[i] || 1);
                    mx = kontaktniBody[i].x + (kontaktniBody[i + 1].x - kontaktniBody[i].x) * t;
                    my = kontaktniBody[i].y + (kontaktniBody[i + 1].y - kontaktniBody[i].y) * t;
                    tx = kontaktniBody[i + 1].x - kontaktniBody[i].x;
                    ty = kontaktniBody[i + 1].y - kontaktniBody[i].y;
                    break;
                }
                zbyva -= segD[i];
            }
            n1x = -ty; n1y = tx;
        } else if (kontaktniBody.length === 1) {
            mx = kontaktniBody[0].x; my = kontaktniBody[0].y;
            const idx = pts.findIndex(p => Math.hypot(p.x - mx, p.y - my) < 2);
            if (idx >= 0) {
                const prev = pts[(idx - 1 + pts.length) % pts.length];
                const next = pts[(idx + 1) % pts.length];
                const d1x = prev.x - mx, d1y = prev.y - my;
                const d2x = next.x - mx, d2y = next.y - my;
                const l1 = Math.hypot(d1x, d1y) || 1, l2 = Math.hypot(d2x, d2y) || 1;
                n1x = d1x / l1 + d2x / l2; n1y = d1y / l1 + d2y / l2;
            } else {
                n1x = centroidX - mx; n1y = centroidY - my;
            }
        } else {
            mx = centroidX; my = centroidY;
            n1x = centroidX - vlastniCx; n1y = centroidY - vlastniCy;
        }

        // Normalizace
        const nlen = Math.hypot(n1x, n1y) || 1;
        n1x /= nlen; n1y /= nlen;

        // Ray-casting: vybrat stranu ven
        const testDist = 10;
        const posA = { x: mx + n1x * testDist, y: my + n1y * testDist };
        const posB = { x: mx - n1x * testDist, y: my - n1y * testDist };
        const aVlastni = vlastniPolygony.some(vp => vp.length >= 3 && _bodVPoly(posA.x, posA.y, vp));
        const bVlastni = vlastniPolygony.some(vp => vp.length >= 3 && _bodVPoly(posB.x, posB.y, vp));
        let nx, ny;
        if (aVlastni && !bVlastni) { nx = -n1x; ny = -n1y; }
        else if (!aVlastni && bVlastni) { nx = n1x; ny = n1y; }
        else { const dl = Math.hypot(centroidX - mx, centroidY - my) || 1; nx = (centroidX - mx) / dl; ny = (centroidY - my) / dl; }

        return { x: mx + nx * 80, y: my + ny * 80 };
    }

    // Map tiles
    loadMapTiles(parcely, typ, apiKey) {
        this.clearMapTiles();
        if (!parcely || parcely.length === 0 || !apiKey) return;

        const typeMap = { zakladni: 'basic', ortofoto: 'aerial', turisticka: 'outdoor' };
        const mapType = typeMap[typ] || 'basic';
        const center = this._fixedWgsCenter || this._wgs84Center(parcely);
        const cosLat = Math.cos(center.lat * Math.PI / 180);
        const tileZoom = 19;
        const mPerTilePx = 156543.03 * cosLat / Math.pow(2, tileZoom);
        const tileSizeM = 256 * mPerTilePx;
        const tileSizeCanvasPx = tileSizeM * this.PX_PER_M;

        // Bbox
        const allWgs = parcely.flatMap(p => p.polygon_wgs84 || []);
        const lats = allWgs.map(c => c[0]);
        const lons = allWgs.map(c => c[1]);
        const marginDeg = 100 / 111320;
        const minLat = Math.min(...lats) - marginDeg;
        const maxLat = Math.max(...lats) + marginDeg;
        const minLon = Math.min(...lons) - marginDeg;
        const maxLon = Math.max(...lons) + marginDeg;

        const lon2tile = (lon) => Math.floor((lon + 180) / 360 * Math.pow(2, tileZoom));
        const lat2tile = (lat) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, tileZoom));

        const txMin = lon2tile(minLon);
        const txMax = lon2tile(maxLon);
        const tyMin = lat2tile(maxLat);
        const tyMax = lat2tile(minLat);

        for (let tx = txMin; tx <= txMax; tx++) {
            for (let ty = tyMin; ty <= tyMax; ty++) {
                const tileLon = (tx / Math.pow(2, tileZoom)) * 360 - 180;
                const tileLatRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * ty / Math.pow(2, tileZoom))));
                const tileLat = tileLatRad * 180 / Math.PI;

                const pxLeft = (tileLon - center.lon) * 111320 * cosLat * this.PX_PER_M;
                const pxTop = -(tileLat - center.lat) * 111320 * this.PX_PER_M;

                const url = `https://api.mapy.cz/v1/maptiles/${mapType}/256/${tileZoom}/${tx}/${ty}?apikey=${apiKey}`;

                Konva.Image.fromURL(url, (img) => {
                    img.setAttrs({
                        x: pxLeft,
                        y: pxTop,
                        width: tileSizeCanvasPx,
                        height: tileSizeCanvasPx,
                        opacity: 0.7,
                        listening: false,
                    });
                    img.setAttr('_mapTile', true);
                    this.katastrLayer.add(img);
                    img.moveToBottom();
                    this.katastrLayer.batchDraw();
                });
            }
        }
    }

    clearMapTiles() {
        this.katastrLayer.find('Image').forEach(img => {
            if (img.getAttr('_mapTile')) img.destroy();
        });
        this.katastrLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // PODKLAD IMPORTU (obrázek výkresu pod kresbou)
    // ═══════════════════════════════════════════════════════
    /**
     * Vloží obrázek výkresu jako podklad.
     * @param {object} p {url, stredX, stredY, sirkaM, vyskaM, uhel, pruhlednost, viditelny}
     * @param {function} hotovo volitelný callback po načtení obrázku
     */
    nactiPodklad(p, hotovo) {
        this.smazPodklad();
        if (!p || !p.url) return;

        this._podklad = { ...p };
        // Adresa podkladu se u starších konceptů uložila i s hostitelem
        // (http://localhost:8000/…). Při otevření na jiné adrese (127.0.0.1,
        // jiný port, doména) je to cizí původ — obrázek se nenačte a podklad
        // je prostě neviditelný. Bereme proto jen cestu a doplníme dnešní server.
        let adresa = p.url;
        try {
            const u = new URL(p.url, window.location.origin);
            adresa = u.pathname + u.search;
        } catch (_) { /* nestandardní adresa — zkusíme ji tak, jak je */ }

        Konva.Image.fromURL(adresa, (img) => {
            // Mezitím mohl uživatel podklad zrušit nebo nahradit jiným.
            if (!this._podklad || this._podklad.url !== p.url) { img.destroy(); return; }
            img.setAttr('_podklad', true);
            this._podkladImg = img;
            this.podkladLayer.add(img);
            this.aktualizujPodklad(this._podklad);
            if (hotovo) hotovo(img);
        }, () => {
            this._podklad = null;
            if (hotovo) hotovo(null);
        });
    }

    /**
     * Zařadí podklad pod kresbu, nebo nad ni.
     *
     * Nad kresbou jde obkreslovat i tam, kde už stěna leží — jinak ji výkres
     * pod ní nevidí. Výběrová vrstva zůstává úplně nahoře, ať jsou vidět madla.
     */
    podkladNahoru(nahoru) {
        if (nahoru) {
            this.podkladLayer.moveToTop();
            this.selectionLayer.moveToTop();
        } else {
            this.podkladLayer.zIndex(1);      // hned nad mřížkou, pod vším ostatním
        }
    }

    /**
     * Změní umístění/průhlednost podkladu bez znovunačtení obrázku.
     */
    aktualizujPodklad(zmeny = {}) {
        if (!this._podklad) return;
        Object.assign(this._podklad, zmeny);
        if ('zobrazeni' in zmeny || 'viditelny' in zmeny) {
            this.podkladNahoru(this._podklad.zobrazeni === 'nad');
        }
        const img = this._podkladImg;
        if (!img) return;

        const p = this._podklad;
        const sirkaPx = (p.sirkaM || 1) * this.PX_PER_M;
        const vyskaPx = (p.vyskaM || 1) * this.PX_PER_M;
        img.setAttrs({
            width: sirkaPx,
            height: vyskaPx,
            // střed obrázku drží pozici i při otáčení a změně měřítka
            offsetX: sirkaPx / 2,
            offsetY: vyskaPx / 2,
            x: p.stredX || 0,
            y: p.stredY || 0,
            rotation: p.uhel || 0,
            opacity: podkladSkryty(p) ? 0 : (p.pruhlednost ?? 0.5),
            visible: !podkladSkryty(p),
            listening: false,
        });
        this.podkladLayer.batchDraw();
    }

    smazPodklad() {
        this._podklad = null;
        this._podkladImg = null;
        this.podkladLayer.destroyChildren();
        this.podkladLayer.batchDraw();
    }

    /** Aktuální stav podkladu (pro uložení do konceptu). */
    stavPodkladu() {
        return this._podklad ? { ...this._podklad } : null;
    }
}

if (typeof window !== 'undefined') {
    window.KonvaRenderer = KonvaRenderer;
}
