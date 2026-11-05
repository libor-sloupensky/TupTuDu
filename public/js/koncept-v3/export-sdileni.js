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

    const naBase64 = (pole) => {
        const b = new Uint8Array(pole.buffer, pole.byteOffset, pole.byteLength);
        let s = '';
        for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
        return btoa(s);
    };
    const naBlob = (canvas) => new Promise((ok, chyba) => canvas.toBlob(b => (b ? ok(b) : chyba(new Error('Obrázek se nepodařilo vytvořit'))), 'image/png'));
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
            return (cisty(k?.nazev || '') || 'projekt') + '-' + cisty(pripona) + '.png';
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
         * Co na výkresu bude, řídí přepínače zobrazení (panel Objekty, tytéž jsou v sekci Export).
         */
        _kresbyPodlazi(ids) {
            const e = this.engine, r = this.renderer, st = this.stage;
            const puvodne = {
                aktivni: e.dum.aktivni, scale: st.scaleX(), x: st.x(), y: st.y(), sirka: st.width(), vyska: st.height(),
                walls: [...r.selectedWalls], nodes: [...r.selectedNodes], openings: [...r.selectedOpenings], vybaveni: [...r.selectedVybaveni],
                prostory: [...r.selectedProstory], oddelovace: [...r.selectedOddelovace], mistnosti: [...r.selectedMistnosti],
                schody: [...r.selectedSchody], plochy: [...r.selectedPlochy],
                rezimStrecha: this.rezimStrecha, strechaHrana: this.strechaHrana,
            };
            const skryte = [r.gridLayer, r.podkladLayer, r.katastrLayer, r.spodekLayer, r.strechaLayer, r.selectionLayer, r.kotyVyberuLayer].filter(Boolean);
            const viditelnost = skryte.map(v => v.visible());
            const s = PX_NA_METR / e.PX_PER_M;
            const vysledek = [];
            try {
                this._kresbaProExport = true;
                skryte.forEach(v => v.visible(false));
                this.rezimStrecha = false;
                this.strechaHrana = null;
                st.scale({ x: s, y: s });
                st.position({ x: 0, y: 0 });
                for (const id of ids) {
                    if (e.dum.aktivni !== id) e.prepniPodlazi(id);
                    r.selectedWalls.clear(); r.selectedNodes.clear(); r.selectedOpenings.clear(); r.selectedVybaveni.clear();
                    r.selectedProstory.clear(); r.selectedOddelovace.clear(); r.selectedMistnosti.clear(); r.selectedSchody.clear(); r.selectedPlochy.clear();
                    r._mistnostiCache = null;
                    r.render();
                    r.poZmeneZoomu();
                    skryte.forEach(v => v.visible(false));   // render si vrstvy mohl přepnout
                    const t = st.getAbsoluteTransform().copy();
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    const bod = (p) => {
                        const q = t.point(p);
                        minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
                    };
                    for (const wall of e.walls.values()) (e.getWallPolygon(wall.id) || []).forEach(bod);
                    if (!isFinite(minX)) { vysledek.push({ id, canvas: null }); continue; }
                    const W = Math.ceil(maxX - minX + 2 * OKRAJ), H = Math.ceil(maxY - minY + 2 * OKRAJ);
                    // Plátno po dobu snímku v plné velikosti: poloprůhledné tvary se kreslí přes pomocné plátno
                    // velikosti plátna a mimo něj by se usekly (a skryté plátno ve 3D má velikost 1 px)
                    st.size({ width: W, height: H });
                    st.position({ x: OKRAJ - minX, y: OKRAJ - minY });
                    vysledek.push({ id, canvas: st.toCanvas({ x: 0, y: 0, width: W, height: H, pixelRatio: ZVETSENI }) });
                    st.position({ x: 0, y: 0 });
                }
            } finally {
                this._kresbaProExport = false;
                skryte.forEach((v, i) => v.visible(viditelnost[i]));
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

        /** List: bílé pozadí, nadpis, měřítko a značka. */
        _listPudorysu(kresby) {
            const e = this.engine;
            const nazev = this.koncepty?.find(x => String(x.id) === String(this.projektId))?.nazev || '';
            const platne = kresby.filter(k => k.canvas);
            if (!platne.length) return null;
            const sloupcu = platne.length > 1 ? 2 : 1;
            const radku = Math.ceil(platne.length / sloupcu);
            const sirkaBunky = Math.max(...platne.map(k => k.canvas.width)), vyskaBunky = Math.max(...platne.map(k => k.canvas.height));
            const HLAVA = 110, ZAPATI = 90, POPIS = 56;
            const cv = document.createElement('canvas');
            cv.width = sirkaBunky * sloupcu;
            cv.height = HLAVA + (vyskaBunky + POPIS) * radku + ZAPATI;
            const g = cv.getContext('2d');
            g.fillStyle = '#ffffff';
            g.fillRect(0, 0, cv.width, cv.height);
            const pismo = getComputedStyle(document.body).fontFamily || 'sans-serif';
            g.fillStyle = '#1f2937';
            g.textBaseline = 'middle';
            g.font = '700 42px ' + pismo;
            g.fillText(nazev, 40, HLAVA / 2);
            platne.forEach((k, i) => {
                const x = (i % sloupcu) * sirkaBunky, y = HLAVA + Math.floor(i / sloupcu) * (vyskaBunky + POPIS);
                g.fillStyle = '#374151';
                g.font = '600 32px ' + pismo;
                g.fillText(e.podlaziPodleId(k.id)?.nazev || '', x + 40, y + POPIS / 2);
                g.drawImage(k.canvas, x + (sirkaBunky - k.canvas.width) / 2, y + POPIS);
            });
            // Měřítko 1 m a značka
            const metr = PX_NA_METR * ZVETSENI;
            const zy = cv.height - ZAPATI / 2;
            g.strokeStyle = '#374151';
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(40, zy - 10); g.lineTo(40, zy + 10); g.moveTo(40, zy); g.lineTo(40 + metr, zy); g.moveTo(40 + metr, zy - 10); g.lineTo(40 + metr, zy + 10);
            g.stroke();
            g.fillStyle = '#374151';
            g.font = '500 26px ' + pismo;
            g.fillText(this.renderer.showKoty ? '1 m  ·  kóty v cm' : '1 m', 52 + metr, zy);
            g.textAlign = 'right';
            g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim() || '#374151';
            g.fillText('tuptudu.com', cv.width - 40, zy);
            g.textAlign = 'left';
            return cv;
        },

        async exportPudorys(vsechna = false) {
            if (this.exportBezi || !this.exportPovolen) return;
            this.exportBezi = true;
            try {
                await this.$nextTick();
                const e = this.engine;
                const ids = vsechna ? [...e.dum.podlazi].reverse().map(p => p.id) : [e.dum.aktivni];
                const list = this._listPudorysu(this._kresbyPodlazi(ids));
                if (!list) { this._dumHlaska('Není co exportovat, podlaží nemá stěny.'); return; }
                await this._stahni(list, this._nazevSouboru(vsechna ? 'pudorysy' : 'pudorys-' + (e.podlaziPodleId(ids[0])?.nazev || ids[0])));
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

        async export3d() {
            if (this.exportBezi || !this.exportPovolen) return;
            this.exportBezi = true;
            try {
                const cv = await this._ve3d(async () => { await window.Katalog3d.hotovo(); return this._snimekScény(); });
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
                    objekty.push({ id: k.id, skupina, x: +v.x.toFixed(3), y: +(v.y - y0).toFixed(3), z: +v.z.toFixed(3), uhel: k.uhel, sirka: k.sirka, hloubka: k.hloubka, vyska: k.vyska });
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
                teren: this._terenProOdkaz(),
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
                if (!zahrnuta.length) { this._dumHlaska('Není co sdílet, dům nemá stěny.'); return; }
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
                    this._dumHlaska(d?.error || d?.message || 'Odkaz se nepodařilo uložit.');
                    window.zalogujChybu?.(new Error('Sdílení: HTTP ' + r.status), 'Sdílení: uložení', { projekt: this.projektId, zprava: d?.message });
                    return;
                }
                this.sdileni = d;
                this._dumHlaska('Odkaz ukazuje aktuální stav.');
            } catch (err) {
                window.chybaUzivateli?.(err, 'Sdílení: uložení', { projekt: this.projektId });
            } finally {
                this.sdileniBezi = false;
            }
        },

        async sdileniVypni() {
            if (this.sdileniBezi) return;
            if (!confirm('Vypnout odkaz? Kdo ho má, už projekt neuvidí. Další sdílení dostane novou adresu.')) return;
            this.sdileniBezi = true;
            try {
                const r = await fetch(this._adresaSdileni(), {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': window._kkInitData.csrf, Accept: 'application/json' },
                });
                if (!r.ok) throw new Error('Vypnutí odkazu: HTTP ' + r.status);
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
