/**
 * Export obrázků a sdílení odkazem (Koncept V3), viz modules/sdileni.md.
 *
 * Odkaz dostane jen hotové PNG a geometrii po trojúhelnících (_zapecModel): žádná data projektu,
 * žádné stěny jako objekty a žádný kód editoru. Editor všechno připraví u sebe a pošle.
 */
(function () {
    const PX_NA_METR = 60;      // půdorys: stage před zvětšením
    const ZVETSENI = 2;         // výsledek 120 px na metr
    const OKRAJ = 100;          // volno kolem kresby a kót, v px stage
    const OKOLI_SOUSEDU = 5;    // se sousedními parcelami kus okolí navíc, v metrech
    const MAX_STRANA = 4000;    // px stage; větší parcela zmenší měřítko, jinak by obrázek nešel vytvořit
    const ZAPATI = 90;          // výška zápatí se značkou při základním měřítku listu
    const ZNACKA = '/brand/znacka-svetle-1200.png';   // papír je vždy bílý

    // Texty listu rostou s obrázkem, ať jsou po zmenšení na obrazovku stejně čitelné
    const meritkoListu = (sirka) => Math.max(0.6, sirka / 1600);

    let znackaSlib = null;
    const nactiZnacku = () => znackaSlib || (znackaSlib = new Promise((ok) => {
        const obr = new Image();
        obr.onload = () => ok(obr);
        // Bez obrázku značky zůstane v zápatí adresa a popis, export kvůli tomu nepadá
        obr.onerror = () => { window.zalogujChybu?.(new Error('Značka se nenačetla'), 'Export: značka', { ZNACKA }); ok(null); };
        obr.src = ZNACKA;
    }));

    const naBase64 = (pole) => {
        const b = new Uint8Array(pole.buffer, pole.byteOffset, pole.byteLength);
        let s = '';
        for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
        return btoa(s);
    };
    const naBlob = (canvas) => new Promise((ok, chyba) => canvas.toBlob(b => (b ? ok(b) : chyba(new Error(preloz('ed_nastroje.export.obrazek_selhal')))), 'image/png'));
    const pockej = (ms) => new Promise(r => setTimeout(r, ms));

    window.KonceptExport = {
        exportBezi: false,
        sdileni: null,            // {aktivni, url, upraveno}; null = ještě nenačteno
        sdileniBezi: false,
        sdileniZkopirovano: false,

        get exportPovolen() {
            return window._kkInitData?.exporty !== false;
        },

        /** Název souboru z názvu projektu, bez diakritiky a mezer. */
        _nazevSouboru(pripona) {
            const k = this.koncepty?.find(x => String(x.id) === String(this.projektId));
            const cisty = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
            return (cisty(k?.nazev || '') || preloz('ed_nastroje.export.soubor_projekt')) + '-' + cisty(pripona) + '.png';
        },

        async _stahni(canvas, nazev) {
            const blob = await naBlob(canvas);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = nazev;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        },

        // ─── Půdorys ───────────────────────────────────────────
        /**
         * Kresby podlaží jako canvasy se stejným měřítkem. Vše proběhne v jednom běhu, takže se na
         * obrazovce nic nemihne. Aktivní podlaží, výběr i pohled se vrátí, kresba se nemění.
         * Co na výkresu bude, řídí přepínače zobrazení (panely Objekty a Parcela, tytéž jsou v sekci Export).
         * podlePohledu: výřez a přiblížení jako v editoru, jinak celý dům a parcela (odkaz, a když je otevřené 3D).
         */
        _kresbyPodlazi(ids, { podlePohledu = false } = {}) {
            const e = this.engine, r = this.renderer, st = this.stage;
            const puvodne = {
                aktivni: e.dum.aktivni, scale: st.scaleX(), x: st.x(), y: st.y(), sirka: st.width(), vyska: st.height(),
                walls: [...r.selectedWalls], nodes: [...r.selectedNodes], openings: [...r.selectedOpenings], vybaveni: [...r.selectedVybaveni],
                prostory: [...r.selectedProstory], oddelovace: [...r.selectedOddelovace], mistnosti: [...r.selectedMistnosti],
                schody: [...r.selectedSchody], plochy: [...r.selectedPlochy],
                rezimStrecha: this.rezimStrecha, strechaHrana: this.strechaHrana,
            };
            const skryte = [r.podkladLayer, r.spodekLayer, r.strechaLayer, r.selectionLayer, r.kotyVyberuLayer].filter(Boolean);
            const viditelnost = skryte.map(v => v.visible());
            // Z vrstvy katastru jde na výkres jen kresba, mapový podklad nikdy
            const schovaneKatastr = r.katastrLayer.getChildren(n => n.getAttr('_mapTile'));
            const pohled = podlePohledu && !this.rezim3d && st.width() > 1 && st.height() > 1;
            // Parcela a její stavby jsou celé na výkresu, sousedé a výškové body jen v tomhle výřezu
            const rozsah = r.katastrLayer.getChildren(n => n.getAttr('_rozsahExportu')).map(n => n.points());
            const okoli = this.katastrZobrazitSousedy && this.katastrParcely.length && this._katastrOkolni?.length ? OKOLI_SOUSEDU : 0;
            const pxNaMetr = pohled ? puvodne.scale * e.PX_PER_M : this._pxNaMetrVykresu(rozsah, MAX_STRANA / (ids.length > 1 ? 2 : 1));
            const okraj = OKRAJ + okoli * pxNaMetr;
            const s = pxNaMetr / e.PX_PER_M;
            const vysledek = [];
            try {
                this._kresbaProExport = true;
                skryte.forEach(v => v.visible(false));
                schovaneKatastr.forEach(n => n.visible(false));
                this.rezimStrecha = false;
                this.strechaHrana = null;
                if (!pohled) {
                    st.scale({ x: s, y: s });
                    st.position({ x: 0, y: 0 });
                }
                for (const id of ids) {
                    if (e.dum.aktivni !== id) e.prepniPodlazi(id);
                    r.selectedWalls.clear(); r.selectedNodes.clear(); r.selectedOpenings.clear(); r.selectedVybaveni.clear();
                    r.selectedProstory.clear(); r.selectedOddelovace.clear(); r.selectedMistnosti.clear(); r.selectedSchody.clear(); r.selectedPlochy.clear();
                    r._mistnostiCache = null;
                    r.render();
                    r.poZmeneZoomu();
                    skryte.forEach(v => v.visible(false));   // render si vrstvy mohl přepnout
                    if (pohled) {
                        vysledek.push({ id, pxNaMetr, canvas: e.walls.size ? st.toCanvas({ x: 0, y: 0, width: st.width(), height: st.height(), pixelRatio: ZVETSENI }) : null });
                        continue;
                    }
                    const t = st.getAbsoluteTransform().copy();
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    const bod = (p) => {
                        const q = t.point(p);
                        minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
                    };
                    for (const wall of e.walls.values()) (e.getWallPolygon(wall.id) || []).forEach(bod);
                    if (!isFinite(minX)) { vysledek.push({ id, canvas: null }); continue; }
                    for (const body of rozsah) {
                        for (let i = 0; i < body.length; i += 2) bod({ x: body[i], y: body[i + 1] });
                    }
                    const W = Math.ceil(maxX - minX + 2 * okraj), H = Math.ceil(maxY - minY + 2 * okraj);
                    // Plátno po dobu snímku v plné velikosti: poloprůhledné tvary se kreslí přes pomocné plátno
                    // velikosti plátna a mimo něj by se usekly (a skryté plátno ve 3D má velikost 1 px)
                    st.size({ width: W, height: H });
                    st.position({ x: okraj - minX, y: okraj - minY });
                    r.renderGrid();   // kreslí se jen v rozsahu plátna
                    vysledek.push({ id, pxNaMetr, canvas: st.toCanvas({ x: 0, y: 0, width: W, height: H, pixelRatio: ZVETSENI }) });
                    st.position({ x: 0, y: 0 });
                }
            } finally {
                this._kresbaProExport = false;
                skryte.forEach((v, i) => v.visible(viditelnost[i]));
                schovaneKatastr.forEach(n => n.visible(true));
                this.rezimStrecha = puvodne.rezimStrecha;
                this.strechaHrana = puvodne.strechaHrana;
                if (e.dum.aktivni !== puvodne.aktivni) e.prepniPodlazi(puvodne.aktivni);
                st.scale({ x: puvodne.scale, y: puvodne.scale });
                st.position({ x: puvodne.x, y: puvodne.y });
                st.size({ width: puvodne.sirka, height: puvodne.vyska });
                r.selectedWalls = new Set(puvodne.walls); r.selectedNodes = new Set(puvodne.nodes); r.selectedOpenings = new Set(puvodne.openings);
                r.selectedVybaveni = new Set(puvodne.vybaveni); r.selectedProstory = new Set(puvodne.prostory); r.selectedOddelovace = new Set(puvodne.oddelovace);
                r.selectedMistnosti = new Set(puvodne.mistnosti); r.selectedSchody = new Set(puvodne.schody); r.selectedPlochy = new Set(puvodne.plochy);
                r._mistnostiCache = null;
                r.render();
                r.poZmeneZoomu();
            }
            return vysledek;
        },

        /** Px stage na metr: základ, nebo méně, když by se parcela s výřezem nevešla do obrázku. */
        _pxNaMetrVykresu(rozsah, limit) {
            const X = rozsah.flatMap(b => b.filter((_, i) => i % 2 === 0)), Y = rozsah.flatMap(b => b.filter((_, i) => i % 2 === 1));
            if (!X.length) return PX_NA_METR;
            // Úhlopříčka, protože výkres může být otočený podle kompasu
            const metru = Math.hypot(Math.max(...X) - Math.min(...X), Math.max(...Y) - Math.min(...Y)) / this.engine.PX_PER_M;
            return Math.min(PX_NA_METR, limit / metru);
        },

        /** Značka, popis služby a adresa v pravé části zápatí, svisle kolem osy zy. */
        _kresliZnacku(g, sirka, zy, m, pismo) {
            const prava = sirka - 40 * m;
            g.save();
            g.textAlign = 'right';
            g.textBaseline = 'middle';
            g.fillStyle = '#374151';
            g.font = `500 ${22 * m}px ${pismo}`;
            const popis = preloz('ed_nastroje.export.podtitul');
            const sirkaTextu = g.measureText(popis).width;
            g.fillText(popis, prava, zy - 15 * m);
            g.font = `700 ${24 * m}px ${pismo}`;
            g.fillText('www.tuptudu.com', prava, zy + 15 * m);
            if (this._znackaExportu) {
                const v = 54 * m, s = v * this._znackaExportu.naturalWidth / this._znackaExportu.naturalHeight;
                g.imageSmoothingQuality = 'high';
                g.drawImage(this._znackaExportu, prava - sirkaTextu - 24 * m - s, zy - v / 2, s, v);
            }
            g.restore();
        },

        /** Obrázek značky připravený pro kreslení na plátno, volá se před sestavením listu. */
        async _pripravZnacku() {
            this._znackaExportu = await nactiZnacku();
        },

        /** List: bílé pozadí, nadpis, měřítko a značka. */
        _listPudorysu(kresby) {
            const e = this.engine;
            const nazev = this.koncepty?.find(x => String(x.id) === String(this.projektId))?.nazev || '';
            const platne = kresby.filter(k => k.canvas);
            if (!platne.length) return null;
            const sloupcu = platne.length > 1 ? 2 : 1;
            const radku = Math.ceil(platne.length / sloupcu);
            // Aspoň taková šířka, aby se do zápatí vešlo měřítko i značka
            const sirkaBunky = Math.max(Math.ceil(900 / sloupcu), ...platne.map(k => k.canvas.width)), vyskaBunky = Math.max(...platne.map(k => k.canvas.height));
            const sirka = sirkaBunky * sloupcu, m = meritkoListu(sirka);
            const hlava = Math.round(110 * m), zapati = Math.round(ZAPATI * m), popis = Math.round(56 * m), kraj = 40 * m;
            const cv = document.createElement('canvas');
            cv.width = sirka;
            cv.height = hlava + (vyskaBunky + popis) * radku + zapati;
            const g = cv.getContext('2d');
            g.fillStyle = '#ffffff';
            g.fillRect(0, 0, cv.width, cv.height);
            const pismo = getComputedStyle(document.body).fontFamily || 'sans-serif';
            g.fillStyle = '#1f2937';
            g.textBaseline = 'middle';
            g.font = `700 ${42 * m}px ${pismo}`;
            g.fillText(nazev, kraj, hlava / 2);
            platne.forEach((k, i) => {
                const x = (i % sloupcu) * sirkaBunky, y = hlava + Math.floor(i / sloupcu) * (vyskaBunky + popis);
                g.fillStyle = '#374151';
                g.font = `600 ${32 * m}px ${pismo}`;
                g.fillText(e.podlaziPodleId(k.id)?.nazev || '', x + kraj, y + popis / 2);
                g.drawImage(k.canvas, x + (sirkaBunky - k.canvas.width) / 2, y + popis);
            });
            // Úsečka měřítka v délce, která se vejde vedle značky a není droboučká, a značka
            const naMetr = platne[0].pxNaMetr * ZVETSENI;
            let delka = naMetr > sirka / 4 ? 0.1 : 1;
            while (delka * naMetr < 30 * m && delka < 100) delka *= 10;
            const metr = delka * naMetr, popisDelky = delka < 1 ? '10 cm' : delka + ' m';
            const zy = cv.height - zapati / 2;
            g.strokeStyle = '#374151';
            g.lineWidth = 3 * m;
            g.beginPath();
            g.moveTo(kraj, zy - 10 * m); g.lineTo(kraj, zy + 10 * m); g.moveTo(kraj, zy); g.lineTo(kraj + metr, zy); g.moveTo(kraj + metr, zy - 10 * m); g.lineTo(kraj + metr, zy + 10 * m);
            g.stroke();
            g.fillStyle = '#374151';
            g.font = `500 ${26 * m}px ${pismo}`;
            g.fillText(this.renderer.showKoty ? preloz('ed_nastroje.export.meritko_koty', { delka: popisDelky }) : popisDelky, kraj + metr + 12 * m, zy);
            this._kresliZnacku(g, cv.width, zy, m, pismo);
            return cv;
        },

        async exportPudorys(vsechna = false) {
            if (this.exportBezi || !this.exportPovolen) return;
            this.exportBezi = true;
            try {
                await this.$nextTick();
                await this._pripravZnacku();
                const e = this.engine;
                const ids = vsechna ? [...e.dum.podlazi].reverse().map(p => p.id) : [e.dum.aktivni];
                const list = this._listPudorysu(this._kresbyPodlazi(ids, { podlePohledu: true }));
                if (!list) { this._dumHlaska(preloz('ed_nastroje.export.neni_co_exportovat')); return; }
                await this._stahni(list, this._nazevSouboru(vsechna ? preloz('ed_nastroje.export.soubor_pudorysy') : preloz('ed_nastroje.export.soubor_pudorys', { podlazi: e.podlaziPodleId(ids[0])?.nazev || ids[0] })));
            } catch (err) {
                window.chybaUzivateli?.(err, 'Export půdorysu');
            } finally {
                this.exportBezi = false;
            }
        },

        // ─── 3D ────────────────────────────────────────────────
        /** Spustí práci se scénou 3D; z 2D se tam přepne jen po dobu práce. */
        async _ve3d(prace) {
            const bylo3d = this.rezim3d;
            if (!bylo3d) {
                await this.prepni3d();
                await pockej(150);
            }
            try {
                this._build3d();
                return await prace();
            } finally {
                if (!bylo3d) this.prepni2d();
            }
        },

        /** Snímek aktuálního pohledu v dvojnásobném rozlišení. */
        _snimekScény() {
            const _3d = window._kk3d;
            const puvodni = _3d.renderer.getPixelRatio();
            _3d.renderer.setPixelRatio(Math.max(2, puvodni));
            _3d.renderer.render(_3d.scene, _3d.camera);
            const zdroj = _3d.renderer.domElement;
            const cv = document.createElement('canvas');
            cv.width = zdroj.width;
            cv.height = zdroj.height;
            cv.getContext('2d').drawImage(zdroj, 0, 0);
            _3d.renderer.setPixelRatio(puvodni);
            _3d.renderer.render(_3d.scene, _3d.camera);
            return cv;
        },

        /** Snímek 3D s bílým zápatím se značkou pod obrazem, do záběru nic nekreslí. */
        _list3d(snimek) {
            const m = meritkoListu(snimek.width), zapati = Math.round(ZAPATI * m);
            const cv = document.createElement('canvas');
            cv.width = snimek.width;
            cv.height = snimek.height + zapati;
            const g = cv.getContext('2d');
            g.fillStyle = '#ffffff';
            g.fillRect(0, 0, cv.width, cv.height);
            g.drawImage(snimek, 0, 0);
            this._kresliZnacku(g, cv.width, cv.height - zapati / 2, m, getComputedStyle(document.body).fontFamily || 'sans-serif');
            return cv;
        },

        async export3d() {
            if (this.exportBezi || !this.exportPovolen) return;
            this.exportBezi = true;
            try {
                await this._pripravZnacku();
                const cv = await this._ve3d(async () => { await window.Katalog3d.hotovo(); return this._list3d(this._snimekScény()); });
                await this._stahni(cv, this._nazevSouboru('3d'));
            } catch (err) {
                window.chybaUzivateli?.(err, 'Export 3D');
            } finally {
                this.exportBezi = false;
            }
        },

        // ─── Model pro odkaz ───────────────────────────────────
        /**
         * Scéna jako trojúhelníky po materiálech a skupinách (podlaží, střecha). Souřadnice jsou
         * ve světě scény. Z konstrukce nezbude nic než tvar a barva, z terénu výšky vůči ±0 domu.
         */
        _zapecModel() {
            const THREE = window.THREE;
            const _3d = window._kk3d;
            const e = this.engine;
            const y0 = _3d.wallGroup.position.y;
            _3d.wallGroup.updateMatrixWorld(true);
            const materialy = [], klicMaterialu = new Map(), textury = {}, kbelik = new Map();
            const zapisMaterial = (m) => {
                const mapa = m.map?.image?.toDataURL ? m.map.uuid : null;
                if (mapa && !textury[mapa]) textury[mapa] = m.map.image.toDataURL('image/png');
                const popis = {
                    barva: '#' + m.color.getHexString(), drsnost: +(m.roughness ?? 0.8).toFixed(2), kov: +(m.metalness ?? 0).toFixed(2),
                    pruhlednost: m.transparent ? m.opacity : 1, mapa, reliefMapa: !!m.bumpMap, relief: m.bumpScale || 0,
                };
                const klic = JSON.stringify(popis);
                if (!klicMaterialu.has(klic)) { klicMaterialu.set(klic, materialy.length); materialy.push(popis); }
                return klicMaterialu.get(klic);
            };
            const v = new THREE.Vector3();
            const pridej = (o, skupina) => {
                if (!o.isMesh || !o.geometry) return;
                const g = o.geometry, poz = g.getAttribute('position'), uv = g.getAttribute('uv'), idx = g.index;
                if (!poz) return;
                const pocet = idx ? idx.count : poz.count;
                const useky = g.groups.length ? g.groups : [{ start: 0, count: pocet, materialIndex: 0 }];
                for (const u of useky) {
                    const m = Array.isArray(o.material) ? o.material[u.materialIndex] : o.material;
                    if (!m) continue;
                    const cislo = zapisMaterial(m);
                    const klic = skupina + '|' + cislo;
                    if (!kbelik.has(klic)) kbelik.set(klic, { skupina, material: cislo, pozice: [], uv: m.map ? [] : null });
                    const k = kbelik.get(klic);
                    for (let i = u.start; i < Math.min(u.start + u.count, pocet); i++) {
                        const j = idx ? idx.getX(i) : i;
                        v.fromBufferAttribute(poz, j).applyMatrix4(o.matrixWorld);
                        k.pozice.push(v.x, v.y - y0, v.z);
                        if (k.uv) k.uv.push(uv ? uv.getX(j) : 0, uv ? uv.getY(j) : 0);
                    }
                }
            };
            // Kusy z katalogu jdou jako odkaz na model, ne jako trojúhelníky: textury modelů by se tudy nepřenesly
            const objekty = [];
            const projdi = (o, skupina) => {
                const k = o.userData?.katalog;
                if (k) {
                    o.getWorldPosition(v);
                    objekty.push({ id: k.id, skupina, x: +v.x.toFixed(3), y: +(v.y - y0).toFixed(3), z: +v.z.toFixed(3), uhel: k.uhel, sirka: k.sirka, hloubka: k.hloubka, vyska: k.vyska, ...(k.barva ? { barva: k.barva } : {}) });
                    return;
                }
                pridej(o, skupina);
                for (const c of o.children) projdi(c, skupina);
            };
            for (const [id, g] of _3d.podlaziSkupiny) projdi(g, id);
            for (const o of _3d.dumSkupina.children) {
                const u = o.userData;
                const skupina = u.strecha ? 'strecha' : (u.podlazi || (u.stropPod ? (e.podlaziNad(u.stropPod)?.id ?? 'strecha') : 'strecha'));
                o.traverse(c => pridej(c, skupina));
            }
            const prvni = e.dum.podlazi.find(p => p.typ !== 'sklep') || e.dum.podlazi[0];
            return {
                verze: 1,
                zeme: e.kotaPodlazi(prvni.id),
                diry: this._dirySnizeni().map(d => d.poly.map(q => [+q.x.toFixed(3), +q.y.toFixed(3)])),
                skupiny: [...e.dum.podlazi].reverse().map(p => ({ id: p.id, nazev: p.nazev })),
                objekty,
                teren: this.zobrazTeren3d ? this._terenProOdkaz() : null,
                bezZeme: !this.zobrazTeren3d,
                mrizkaTerenu: this.zobrazMrizkuTerenu,
                materialy,
                textury,
                meshe: [...kbelik.values()].map(k => ({
                    skupina: k.skupina, material: k.material,
                    pozice: naBase64(new Float32Array(k.pozice)),
                    uv: k.uv ? naBase64(new Float32Array(k.uv)) : undefined,
                })),
            };
        },

        /**
         * Výkop pro odkaz podle toho, která podlaží v terénu jsou skrytá. Klíč jsou jejich id. Výšky jsou
         * v centimetrech a jen u použitých vrcholů, ostatní nuly se zkomprimují.
         */
        _jamyProOdkaz() {
            const vsechny = this._castiZakladu();
            const uhel = this._uhelSten(vsechny), fn = this._terenDomu().fn, nastaveni = this.engine.dum.zaklady;
            const vysledek = {};
            const kombinaci = vsechny.length <= 3 ? (1 << vsechny.length) : 1;
            for (let k = 1; k < kombinaci + (vsechny.length > 3 ? 1 : 0); k++) {
                const casti = vsechny.length > 3 ? vsechny : vsechny.filter((_, i) => k & (1 << i));
                const viditelne = vsechny.filter(c => !casti.includes(c));
                const j = window.Zemina.jama(casti, fn, nastaveni, uhel);
                if (!j) continue;
                const b = this._bunkyJamy(j, viditelne, 0);
                if (!b.bunky.some(x => x)) continue;
                const sCel = b.sloupcu - 1;
                const y = new Int16Array(b.y.length);
                for (let i = 0; i < b.bunky.length; i++) {
                    if (!b.bunky[i]) continue;
                    const s = i % sCel, r = (i - s) / sCel;
                    for (const v of [r * b.sloupcu + s, r * b.sloupcu + s + 1, (r + 1) * b.sloupcu + s, (r + 1) * b.sloupcu + s + 1]) y[v] = Math.round(b.y[v] * 100);
                }
                vysledek[casti.map(c => c.id).join()] = { u0: b.u0, v0: b.v0, krok: b.krok, cos: b.cos, sin: b.sin, sloupcu: b.sloupcu, radku: b.radku, bunky: naBase64(b.bunky), y: naBase64(y) };
            }
            return vysledek;
        },

        /** Terén pro odkaz bez polohy: žádné zeměpisné souřadnice ani nadmořská výška, jen tvar kolem domu. */
        _terenProOdkaz() {
            const prof = this.vyskovyProfil, stred = this.renderer?._fixedWgsCenter;
            const nula = this.maZaklady ? this._terenDomu().nula : null;
            if (!prof?.body?.length || !stred || typeof nula !== 'number') return null;
            const m = window.Zemina.mrizkaTerenu(prof.body, stred);
            const zaokrouhli = (q) => q.map(c => +c.toFixed(3));
            return {
                minX: m.minX, minZ: m.minY, sirka: m.sirka, vyska: m.vyska, sloupcu: m.sloupcu, radku: m.radku,
                vysky: naBase64(Float32Array.from(m.vysky, h => h - nula)),
                parcely: this._parcelyVeScene().map(p => p.map(zaokrouhli)),
                jamy: this._jamyProOdkaz(),
                vnitrek: this._castiZakladu().map(c => ({ skupina: c.id, uroven: +(c.kota - 0.01).toFixed(3), obrys: c.obrys.map(b => [+b.x.toFixed(3), +b.y.toFixed(3)]) })),
            };
        },

        /** Snímek pro náhled odkazu a pro prohlížeče bez WebGL: dům šikmo shora, vše viditelné. */
        _nahledModelu() {
            const THREE = window.THREE;
            const _3d = window._kk3d;
            const kam = _3d.camera;
            const puvodni = { p: kam.position.clone(), t: _3d.controls.target.clone(), z: kam.zoom };
            const skryte = this.skryte3d, strecha = this.zobrazStrechu3d;
            try {
                this.skryte3d = [];
                this.zobrazStrechu3d = true;
                this._nastavViditelnost3d();
                const obal = new THREE.Box3().setFromObject(_3d.wallGroup);
                if (!obal.isEmpty()) {
                    const stred = obal.getCenter(new THREE.Vector3());
                    const r = Math.max(...obal.getSize(new THREE.Vector3()).toArray(), 4);
                    kam.position.set(stred.x + r, stred.y + r * 0.9, stred.z + r);
                    _3d.controls.target.copy(stred);
                    kam.zoom = Math.min((kam.top - kam.bottom), (kam.right - kam.left)) / (r * 1.7);
                    kam.updateProjectionMatrix();
                    _3d.controls.update();
                }
                return this._snimekScény();
            } finally {
                kam.position.copy(puvodni.p);
                _3d.controls.target.copy(puvodni.t);
                kam.zoom = puvodni.z;
                kam.updateProjectionMatrix();
                _3d.controls.update();
                this.skryte3d = skryte;
                this.zobrazStrechu3d = strecha;
                this._nastavViditelnost3d();
            }
        },

        // ─── Odkaz ─────────────────────────────────────────────
        _adresaSdileni() {
            return window._kkInitData.routes.sdileni.replace(':id', this.projektId);
        },

        async nactiSdileni() {
            if (!this.projektId || !this.exportPovolen) return;
            try {
                const r = await fetch(this._adresaSdileni(), { headers: { Accept: 'application/json' } });
                if (!r.ok) throw new Error('Stav odkazu: HTTP ' + r.status);
                this.sdileni = await r.json();
            } catch (err) {
                window.zalogujChybu?.(err, 'Sdílení: stav', { projekt: this.projektId });
            }
        },

        /** Založí odkaz, nebo do něj nahraje aktuální stav. */
        async sdileniUloz() {
            if (this.sdileniBezi || !this.exportPovolen) return;
            this.sdileniBezi = true;
            try {
                await this.$nextTick();
                await this._pripravZnacku();
                const e = this.engine;
                const podlazi = [...e.dum.podlazi].reverse();
                const kresby = this._kresbyPodlazi(podlazi.map(p => p.id));
                const fd = new FormData();
                const zahrnuta = [];
                for (const k of kresby) {
                    const list = k.canvas ? this._listPudorysu([k]) : null;
                    if (!list) continue;
                    fd.append(`plan[${k.id}]`, await naBlob(list), 'plan.png');
                    zahrnuta.push({ id: k.id, nazev: e.podlaziPodleId(k.id)?.nazev || k.id });
                }
                if (!zahrnuta.length) { this._dumHlaska(preloz('ed_nastroje.sdileni.neni_co_sdilet')); return; }
                fd.append('podlazi', JSON.stringify(zahrnuta));
                const { model, nahled } = await this._ve3d(async () => {
                    await window.Katalog3d.hotovo();
                    return { model: this._zapecModel(), nahled: this._nahledModelu() };
                });
                let telo = new Blob([JSON.stringify(model)], { type: 'application/json' });
                // Komprese zmenší model zhruba na třetinu; bez ní jde poslat taky
                if (window.CompressionStream) {
                    telo = await new Response(telo.stream().pipeThrough(new CompressionStream('gzip'))).blob();
                }
                fd.append('model', telo, 'model.json');
                fd.append('nahled', await naBlob(nahled), 'nahled.png');
                const r = await fetch(this._adresaSdileni(), {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': window._kkInitData.csrf, Accept: 'application/json' },
                    body: fd,
                });
                const d = await r.json().catch(() => null);
                if (!r.ok || !d?.ok) {
                    this._dumHlaska(d?.error || d?.message || preloz('ed_nastroje.sdileni.odkaz_neulozen'));
                    window.zalogujChybu?.(new Error('Sdílení: HTTP ' + r.status), 'Sdílení: uložení', { projekt: this.projektId, zprava: d?.message });
                    return;
                }
                this.sdileni = d;
                this._dumHlaska(preloz('ed_nastroje.sdileni.odkaz_aktualni'));
            } catch (err) {
                window.chybaUzivateli?.(err, 'Sdílení: uložení', { projekt: this.projektId });
            } finally {
                this.sdileniBezi = false;
            }
        },

        async sdileniVypni() {
            if (this.sdileniBezi) return;
            if (!confirm(preloz('ed_nastroje.sdileni.vypnout_potvrzeni'))) return;
            this.sdileniBezi = true;
            try {
                const r = await fetch(this._adresaSdileni(), {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': window._kkInitData.csrf, Accept: 'application/json' },
                });
                if (!r.ok) throw new Error(preloz('ed_nastroje.sdileni.vypnuti_http', { status: r.status }));
                this.sdileni = await r.json();
            } catch (err) {
                window.chybaUzivateli?.(err, 'Sdílení: vypnutí', { projekt: this.projektId });
            } finally {
                this.sdileniBezi = false;
            }
        },

        async sdileniKopiruj() {
            try {
                await navigator.clipboard.writeText(this.sdileni.url);
                this.sdileniZkopirovano = true;
                setTimeout(() => { this.sdileniZkopirovano = false; }, 2000);
            } catch (err) {
                // Schránka bez HTTPS nebo povolení nejde: adresa je v poli a dá se označit ručně
                window.zalogujChybu?.(err, 'Sdílení: kopírování');
                this.$refs.sdileniAdresa?.select();
            }
        },
    };
})();
