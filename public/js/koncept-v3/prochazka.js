/**
 * Procházka v editoru (Libor 12. 11. 2026): panáček v půdorysu a ve 3D, pohled jeho okem.
 * Ovládání, mapka, obloha a postava jsou společné se sdíleným odkazem (public/js/prochazka-3d.js),
 * popis v modules/dum.md, část Procházka.
 *
 * Poloha panáčka patří k projektu (metadata katastru vedle kompasu). Není to úprava: nečerpá limit tarifu
 * a nedělá krok Zpět. Procházka nemění kompas, přiblížení ani pohled ve 3D, po návratu je všechno jako dřív.
 */
(function () {
    const VZDALENOST_PRED_DOMEM = 8;      // napoprvé stojí panáček tolik metrů před vchodem
    const DVERE = ['dvere', 'pruchod', 'francouzske_okno'];   // čím se do domu vchází, v pořadí přednosti
    const zaokrouhli = (v, mista = 3) => Math.round(v * 10 ** mista) / 10 ** mista;
    const barvaZnacky = () => getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim() || '#2f6fed';

    window.KonceptProchazka = {
        rezimProchazka: false,
        panacek: null,             // { x, z, podlazi, dy, smer, sklon, oko }: metry scény, dy = nohy nad podlahou podlaží
        zobrazPanacka: true,
        prochazkaPodZemi: false,   // oko pod terénem: terén se po dobu procházky skryje
        _prochazkaOdkud: '3d',

        prochazkaInit() {
            this.panacek = this._panacekPlatny(this.metadata?.katastr?.panacek);
            try {
                const u = JSON.parse(localStorage.getItem('kv3_prochazka') || '{}');
                if (typeof u.zobrazPanacka === 'boolean') this.zobrazPanacka = u.zobrazPanacka;
            } catch (e) { /* poškozené nastavení = výchozí */ }
            const r = this.renderer;
            if (r && this.stage && window.Konva) {
                r.panacekLayer = new Konva.Layer();
                this.stage.add(r.panacekLayer);
                // Panáček má na obrazovce stálou velikost
                const puvodni = r.afterZoom;
                r.afterZoom = () => { puvodni?.call(r); this._panacek2d(); };
            }
            this.$watch('_selectionTick', () => this._panacek2d());
            this.$watch('nastroj', () => this._panacek2d());
            this.$watch('rezim3d', (v) => {
                // Do 2D se dá přepnout i odjinud (katalog, sestava): procházka tím končí
                if (!v && this.rezimProchazka) this.ukonciProchazku('nic');
                this.$nextTick(() => this._panacek2d());
            });
            this._panacek2d();
        },

        _panacekPlatny(p) {
            if (!p || typeof p !== 'object' || !isFinite(p.x) || !isFinite(p.z)) return null;
            return {
                x: +p.x, z: +p.z, podlazi: p.podlazi || null, dy: isFinite(p.dy) ? +p.dy : 0,
                smer: isFinite(p.smer) ? +p.smer : 0, sklon: isFinite(p.sklon) ? +p.sklon : 0,
                oko: isFinite(p.oko) ? +p.oko : (window.Prochazka3d?.OKO ?? 1.6),
            };
        },

        prepniZobrazPanacka() {
            try { localStorage.setItem('kv3_prochazka', JSON.stringify({ zobrazPanacka: this.zobrazPanacka })); } catch (e) { /* soukromý režim */ }
            this._panacek2d();
            this._panacek3d();
        },

        // ─── Zapnutí a vypnutí ───────────────────────────────
        /** Tlačítko Procházka v liště. Po přetažení panáčka do půdorysu klik nepřijde, ale pro jistotu se ignoruje. */
        prochazkaKlik() {
            if (this._prochazkaPretazeno) { this._prochazkaPretazeno = false; return; }
            this.prepniProchazku();
        },

        async prepniProchazku() {
            if (this.rezimProchazka || this._prochazkaStartuje) return;
            this._prochazkaStartuje = true;
            try {
                this._prochazkaOdkud = this.rezim3d ? '3d' : '2d';
                if (!this.rezim3d || !window._kk3d?.scene) await this.prepni3d();
                const _3d = window._kk3d;
                const ovladac = this._prochazkaOvladac();
                if (!ovladac) return;
                if (!this.panacek) {
                    this.panacek = this._prochazkaVychozi();
                    this._katastrAutosave?.();
                }
                this.rezimProchazka = true;
                if (_3d.controls) _3d.controls.enabled = false;
                ovladac.nastavMapku(this._prochazkaMapka(_3d.wallGroup.position.y));
                this._resize3d();
                ovladac.zapni(this._prochazkaStart());
                _3d._prochazkaY0 = _3d.wallGroup.position.y;   // výška domu, vůči které panáček stojí
                this._panacek3d();
                _3d.kresliDo = performance.now() + 500;
                this.zmerFunkci?.('prochazka');
            } catch (err) {
                window.chybaUzivateli?.(err, 'Procházka: zapnutí', { projekt: this.projektId });
            } finally {
                this._prochazkaStartuje = false;
            }
        },

        /** @param {'2d'|'3d'|'nic'} [kam] kam se vrátit; bez udání tam, odkud procházka začala */
        ukonciProchazku(kam) {
            if (!this.rezimProchazka) return;
            const _3d = window._kk3d;
            clearTimeout(this._panacekCasovac);
            this._prochazkaUlozPolohu();
            this.rezimProchazka = false;
            _3d?.prochazka?.vypni();
            if (_3d?.controls) _3d.controls.enabled = true;
            if (this.prochazkaPodZemi) {
                this.prochazkaPodZemi = false;
                this._nastavViditelnost3d?.();
            }
            this._panacek3d();
            if (_3d) _3d.kresliDo = performance.now() + 300;
            const cil = kam || this._prochazkaOdkud;
            if (cil === '2d' && this.rezim3d) this.prepni2d();
            else if (this.rezim3d) this._resize3d();
        },

        /** Klik na řádek podlaží v procházce: výtah na stejné místo o patro jinde. Skryté podlaží se ukáže. */
        prochazkaVytah(id) {
            if (this.skryte3d.includes(id)) {
                this.skryte3d = this.skryte3d.filter(x => x !== id);
                this._nastavViditelnost3d();
            }
            window._kk3d?.prochazka?.vytah(id);
            this._selectionTick++;
        },

        /**
         * Panáček přetažený z tlačítka do půdorysu (jako panáček ve Street View): postaví se tam, dívá se
         * nahoru po obrazovce, a procházka začne.
         */
        prochazkaStisk(e) {
            if (e.button !== 0 || this.rezim3d || this.rezimProchazka) return;
            const ikona = e.currentTarget?.querySelector('svg')?.outerHTML || '';
            const start = { x: e.clientX, y: e.clientY };
            let duch = null;
            const pohyb = (ev) => {
                if (!duch) {
                    if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
                    duch = document.createElement('div');
                    duch.className = 'kk-panacek-duch';
                    duch.innerHTML = ikona;
                    document.body.appendChild(duch);
                }
                duch.style.left = ev.clientX + 'px';
                duch.style.top = ev.clientY + 'px';
            };
            const pust = (ev) => {
                window.removeEventListener('pointermove', pohyb);
                window.removeEventListener('pointerup', pust);
                window.removeEventListener('pointercancel', pust);
                if (!duch) return;
                duch.remove();
                // Klik po puštění nad tlačítkem by procházku pustil podruhé jinde
                this._prochazkaPretazeno = true;
                setTimeout(() => { this._prochazkaPretazeno = false; }, 0);
                if (ev.type !== 'pointerup') return;
                const c = this.$refs.konvaContainer?.getBoundingClientRect();
                if (!c || !c.width || ev.clientX < c.left || ev.clientX > c.right || ev.clientY < c.top || ev.clientY > c.bottom) return;
                const q = this.stage.getAbsoluteTransform().copy().invert().point({ x: ev.clientX - c.left, y: ev.clientY - c.top });
                const PX = this.engine.PX_PER_M;
                this.panacek = {
                    x: zaokrouhli(q.x / PX), z: zaokrouhli(q.y / PX), podlazi: this.engine.dum.aktivni, dy: 0,
                    smer: zaokrouhli(-(this.kompasUhel || 0) * Math.PI / 180, 4), sklon: 0, oko: window.Prochazka3d?.OKO ?? 1.6,
                };
                this._katastrAutosave?.();
                this.prepniProchazku();
            };
            window.addEventListener('pointermove', pohyb);
            window.addEventListener('pointerup', pust);
            window.addEventListener('pointercancel', pust);
        },

        // ─── Ovladač a scéna ─────────────────────────────────
        _prochazkaOvladac() {
            const _3d = window._kk3d;
            if (!_3d?.scene || !window.Prochazka3d) return null;
            if (_3d.prochazka) return _3d.prochazka;
            const k = (klic) => preloz('ed_sablona.prochazka.' + klic);
            _3d.prochazka = window.Prochazka3d.vytvor({
                scena: _3d.scene,
                platno: _3d.renderer.domElement,
                vrstva: this.$refs.canvasWrap,
                pochozi: () => this._prochazkaSite().pochozi,
                cile: () => this._prochazkaSite().cile,
                nepochozi: (o) => { for (; o; o = o.parent) if (o.userData?.strecha && !(o.userData.terasa && !o.userData.zabradli)) return true; return false; },
                teren: (x, z) => (_3d.terrainHeights ? this._terrainHeightAt(x, z) : (_3d.ground ? 0 : null)),
                texty: {
                    oko: k('oko'), okoTip: k('oko_tip'), okoVychozi: k('oko_vychozi'), mapkaTip: k('mapka_tip'), patroVys: k('patro_vys'), patroNiz: k('patro_niz'),
                    pad_vpred: k('vpred'), pad_vzad: k('vzad'), pad_otocVlevo: k('otoc_vlevo'), pad_otocVpravo: k('otoc_vpravo'),
                    pad_vys: k('oko_vys'), pad_niz: k('oko_niz'),
                },
                podZemi: (pod) => {
                    this.prochazkaPodZemi = pod;
                    this._nastavViditelnost3d?.();
                },
                zmena: () => {
                    clearTimeout(this._panacekCasovac);
                    this._panacekCasovac = setTimeout(() => { if (this.rezimProchazka) this._prochazkaUlozPolohu(); }, 1500);
                },
                konec: () => this.ukonciProchazku(),
                probud: () => { _3d.kresliDo = performance.now() + 300; },
            });
            return _3d.prochazka;
        },

        /**
         * Meshe pro chůzi a pro dvojklik. Na nábytku, sestavách a střeše se nestojí, kliknout jde i na sestavu
         * a střechu (ta jen zastaví paprsek). Terén se bere zvlášť: na skrytém se stát dá, kliknout na něj ne.
         */
        _prochazkaSite() {
            const _3d = window._kk3d;
            if (!_3d._prochazkaSite) {
                const pochozi = [], cile = [];
                const projdi = (o, chuze) => {
                    const u = o.userData || {};
                    if (u.katalog || u.kus || u.prochazka) return;
                    // Na terase (plochá pochozí nižší střecha) se chodí, na zábradlí ne
                    const dal = chuze && !u.sestavy && (!u.strecha || (u.terasa && !u.zabradli));
                    if (o.isMesh) { cile.push(o); if (dal) pochozi.push(o); }
                    for (const c of o.children) projdi(c, dal);
                };
                if (_3d.wallGroup) projdi(_3d.wallGroup, true);
                _3d._prochazkaSite = { pochozi, cile };
            }
            const s = _3d._prochazkaSite;
            return { pochozi: s.pochozi, cile: [...s.cile, _3d.terrain, _3d.ground, _3d.jama].filter(o => o?.isMesh) };
        },

        /** Konec _build3d: nové meshe, panáček se znovu usadí a mapka ukáže změněný dům. */
        _prochazkaPoStavbe() {
            const _3d = window._kk3d;
            if (!_3d) return;
            _3d._prochazkaSite = null;
            const y0 = _3d.wallGroup.position.y;
            if (this.rezimProchazka && _3d.prochazka) {
                // Dům se posunul svisle (dotažené výšky terénu po startu procházky, posun výšky): panáček s ním.
                // Jinak zůstal na staré výšce pod podlahou i pod terénem (Libor 12. 11. 2026, vzorový projekt).
                if (typeof _3d._prochazkaY0 === 'number') _3d.prochazka.posunVysku(y0 - _3d._prochazkaY0);
                _3d.prochazka.nastavMapku(this._prochazkaMapka(y0));
                _3d.prochazka.obnov();
            }
            _3d._prochazkaY0 = y0;
            this._panacek3d();
        },

        /** Odkud procházka začne: uložený panáček, výšku dopočítá zem pod ním. */
        _prochazkaStart() {
            const _3d = window._kk3d, p = this.panacek;
            const kory = this.engine.kotyPodlazi();
            const id = p.podlazi && kory.has(p.podlazi) ? p.podlazi : this._podlazi1NP()?.id;
            const kota = (_3d?.wallGroup?.position.y || 0) + (kory.get(id) ?? 0);
            return { x: p.x, z: p.z, yOd: kota + (p.dy || 0) + window.Prochazka3d.KROK, smer: p.smer, sklon: p.sklon, oko: p.oko };
        },

        _prochazkaUlozPolohu() {
            const ovladac = window._kk3d?.prochazka;
            if (!ovladac?.aktivni) return;
            const st = ovladac.stav();
            const kory = this.engine.kotyPodlazi();
            const id = st.patro && kory.has(st.patro) ? st.patro : this._podlazi1NP()?.id;
            const kota = (window._kk3d.wallGroup?.position.y || 0) + (kory.get(id) ?? 0);
            this.panacek = {
                x: zaokrouhli(st.x), z: zaokrouhli(st.z), podlazi: id || null, dy: zaokrouhli(st.y - kota),
                smer: zaokrouhli(st.smer, 4), sklon: zaokrouhli(st.sklon, 4), oko: zaokrouhli(st.oko, 2),
            };
            this._katastrAutosave?.();
        },

        /**
         * Napoprvé stojí panáček venku před vchodem a dívá se na dveře. Vchod = dveře (pak průchod, francouzské okno)
         * v obvodové stěně nejnižšího nadzemního podlaží. Bez nich před domem dole na obrazovce, čelem k domu.
         */
        _prochazkaVychozi() {
            const e = this.engine, PX = e.PX_PER_M;
            const P = this._podlazi1NP();
            const eng = P ? e.enginePodlazi(P.id) : null;
            const rot = (this.kompasUhel || 0) * Math.PI / 180;
            const zaklad = { podlazi: P?.id || null, dy: 0, sklon: 0, oko: window.Prochazka3d?.OKO ?? 1.6 };
            const hotovo = (x, z, smer) => ({ ...zaklad, x: zaokrouhli(x), z: zaokrouhli(z), smer: zaokrouhli(smer, 4) });
            if (eng) {
                const rastr = this._rastrPodlazi(eng, P.id);
                let nej = null;
                for (const op of eng.openings.values()) {
                    const poradi = DVERE.indexOf(op.typ);
                    if (poradi < 0 || (nej && poradi >= nej.poradi)) continue;
                    const w = eng.walls.get(op.wallId);
                    const ven = w ? this._stranaVen(eng, w, op, rastr) : 0;
                    if (ven) nej = { op, w, ven, poradi };
                }
                if (nej) {
                    const { op, w, ven } = nej;
                    const A = eng.nodes.get(w.nodeA), B = eng.nodes.get(w.nodeB);
                    const L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
                    const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L;
                    // Vnější strana podle _stranaVen: normála (−uy, ux) se znaménkem
                    const nx = -uy * ven, nz = ux * ven;
                    const t = (op.pozice + op.sirka / 2) * PX;
                    const cx = (A.x + ux * t) / PX, cz = (A.y + uy * t) / PX;
                    // Pohled ke dveřím: dopředu (−sin s, −cos s) = (−nx, −nz)
                    return hotovo(cx + nx * VZDALENOST_PRED_DOMEM, cz + nz * VZDALENOST_PRED_DOMEM, Math.atan2(nx, nz));
                }
            }
            const uzly = [...(eng || e).nodes.values()];
            if (!uzly.length) return hotovo(0, 0, -rot);
            const xs = uzly.map(n => n.x / PX), zs = uzly.map(n => n.y / PX);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
            // Dolů po obrazovce ve světě (respektuje kompas), čelem nahoru k domu
            const dx = -Math.sin(rot), dz = Math.cos(rot);
            const dosah = Math.max(...uzly.map(n => (n.x / PX - cx) * dx + (n.y / PX - cz) * dz));
            return hotovo(cx + dx * (dosah + VZDALENOST_PRED_DOMEM), cz + dz * (dosah + VZDALENOST_PRED_DOMEM), -rot);
        },

        /**
         * Mapka v rohu procházky: stěny, otvory a schody po podlažích v metrech scény, výška podlahy `y0 + kóta`.
         * Sdílený odkaz dostane totéž s y0 = 0 (výšky vůči ±0 domu).
         */
        _prochazkaMapka(y0 = 0) {
            const e = this.engine, PX = e.PX_PER_M, kory = e.kotyPodlazi();
            const naM = (poly) => poly.map(q => [zaokrouhli(q.x / PX, 2), zaokrouhli(q.y / PX, 2)]);
            const podlazi = [];
            for (const p of e.dum.podlazi) {
                const eng = e.enginePodlazi(p.id);
                if (!eng) continue;
                const steny = [], otvory = [], schody = [];
                for (const w of eng.walls.values()) {
                    const poly = eng.getWallPolygon(w.id);
                    if (poly?.length > 2) steny.push(naM(poly));
                }
                for (const op of eng.openings.values()) {
                    const w = eng.walls.get(op.wallId);
                    const A = w && eng.nodes.get(w.nodeA), B = w && eng.nodes.get(w.nodeB);
                    if (!A || !B) continue;
                    const L = Math.hypot(B.x - A.x, B.y - A.y);
                    if (L < 1) continue;
                    const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L, kx = -uy, ky = ux;
                    const pul = ((w.tloustka || 0.3) / 2 + 0.02) * PX;
                    const a = op.pozice * PX, b = (op.pozice + op.sirka) * PX;
                    const bod = (t, k) => ({ x: A.x + ux * t + kx * k, y: A.y + uy * t + ky * k });
                    otvory.push(naM([bod(a, pul), bod(b, pul), bod(b, -pul), bod(a, -pul)]));
                }
                for (const s of e.dum.schodiste.filter(q => q.odPodlazi === p.id)) {
                    const g = window.DumGeo?.schodyGeo(s, this._vyskaMeziPodlazimi(s), PX);
                    for (const u of g?.stupne || []) schody.push(naM(u.poly));
                }
                podlazi.push({ id: p.id, nazev: p.nazev, y: zaokrouhli(y0 + (kory.get(p.id) ?? 0)), steny, otvory, schody });
            }
            return { podlazi, otoceni: this.kompasUhel || 0 };
        },

        /**
         * Panáček pro sdílený odkaz: kde začít (výšky vůči ±0 domu) a mapka. Mapka jde jako obrázek po podlažích,
         * stěny a otvory jako data do odkazu nepatří (modules/sdileni.md).
         */
        _prochazkaProOdkaz() {
            const p = this.panacek || this._prochazkaVychozi();
            const kory = this.engine.kotyPodlazi();
            const id = p.podlazi && kory.has(p.podlazi) ? p.podlazi : this._podlazi1NP()?.id;
            const mapka = this._prochazkaMapka(0);
            return {
                start: { x: p.x, z: p.z, yOd: zaokrouhli((kory.get(id) ?? 0) + (p.dy || 0) + window.Prochazka3d.KROK), smer: p.smer, sklon: p.sklon, oko: p.oko },
                mapka: {
                    otoceni: mapka.otoceni,
                    podlazi: mapka.podlazi.map(q => ({ id: q.id, nazev: q.nazev, y: q.y, ...(window.Prochazka3d.obrazekMapky(q) || {}) })),
                },
            };
        },

        // ─── Panáček ve 3D a v půdorysu ──────────────────────
        /** Postava ve 3D tam, kde panáček stojí. V procházce ne (jsme jím), do exportu a odkazu nejde. */
        _panacek3d() {
            const _3d = window._kk3d;
            if (!_3d?.scene || !window.Prochazka3d) return;
            const p = this.panacek;
            if (!p || !this.zobrazPanacka || this.rezimProchazka) {
                if (_3d.panacek3d?.visible) { _3d.panacek3d.visible = false; _3d.kresliDo = performance.now() + 300; }
                return;
            }
            if (!_3d.panacek3d) {
                _3d.panacek3d = window.Prochazka3d.postava(barvaZnacky());
                _3d.scene.add(_3d.panacek3d);
            }
            const st = this._prochazkaStart();
            const zem = this._prochazkaOvladac()?.zemPod(p.x, p.z, st.yOd);
            _3d.panacek3d.position.set(p.x, zem ?? st.yOd - window.Prochazka3d.KROK, p.z);
            _3d.panacek3d.rotation.y = p.smer || 0;
            _3d.panacek3d.visible = true;
            _3d.kresliDo = performance.now() + 300;
        },

        /**
         * Panáček v půdorysu: tělo shora s výsečí pohledu, stálá velikost na obrazovce. Tahem (nástroj Výběr) se
         * přesune na aktivní podlaží, úchytem na konci výseče otočí, dvojklikem začne procházka. Na jiném
         * podlaží je zesvětlený. Na výkres nejde (export ho skryje s ostatními pomocnými vrstvami).
         */
        _panacek2d() {
            const L = this.renderer?.panacekLayer;
            if (!L || !this.stage) return;
            L.destroyChildren();
            const p = this.panacek;
            if (p && this.zobrazPanacka && !this.rezim3d) {
                const PX = this.engine.PX_PER_M;
                const jeho = p.podlazi && this.engine.podlaziPodleId(p.podlazi) ? p.podlazi : this._podlazi1NP()?.id;
                const lze = this.nastroj === 'vyber';
                const barva = barvaZnacky();
                const mer = 1 / (this.stage.scaleX() || 1);
                // Dopředu (−sin s, −cos s) v půdorysu, tvary kreslené po +x
                const uhel = (s) => Math.atan2(-Math.cos(s || 0), -Math.sin(s || 0)) * 180 / Math.PI;
                const g = new Konva.Group({ x: p.x * PX, y: p.z * PX, draggable: lze, listening: lze, opacity: jeho === this.engine.dum.aktivni ? 1 : 0.4, name: 'panacek' });
                const telo = new Konva.Group({ scaleX: mer, scaleY: mer, rotation: uhel(p.smer) });
                telo.add(new Konva.Wedge({ radius: 44, angle: 60, rotation: -30, fill: barva, opacity: 0.22, listening: false }));
                telo.add(new Konva.Circle({ radius: 15, fill: 'rgba(0,0,0,0.001)' }));   // pohodlnější úchop
                telo.add(new Konva.Ellipse({ radiusX: 6, radiusY: 12, fill: barva, stroke: '#fff', strokeWidth: 1.5 }));
                telo.add(new Konva.Circle({ radius: 6, fill: barva, stroke: '#fff', strokeWidth: 1.5 }));
                const uchyt = new Konva.Circle({ x: 44, radius: 6, fill: '#fff', stroke: barva, strokeWidth: 2 });
                telo.add(uchyt);
                g.add(telo);
                const zastav = (ev) => { ev.cancelBubble = true; };
                g.on('mousedown touchstart mouseup touchend click tap', zastav);
                g.on('dblclick dbltap', (ev) => { ev.cancelBubble = true; this.prepniProchazku(); });
                g.on('mouseenter', () => { this.stage.container().style.cursor = 'grab'; });
                g.on('mouseleave', () => { this.stage.container().style.cursor = ''; });
                g.on('dragend', () => {
                    this.panacek = { ...this.panacek, x: zaokrouhli(g.x() / PX), z: zaokrouhli(g.y() / PX), podlazi: this.engine.dum.aktivni, dy: 0 };
                    this._katastrAutosave?.();
                    this._panacek2d();
                });
                uchyt.on('mousedown touchstart', (ev) => {
                    ev.cancelBubble = true;
                    g.draggable(false);
                    const otoc = () => {
                        const q = L.getRelativePointerPosition();
                        if (!q) return;
                        const fx = q.x - g.x(), fz = q.y - g.y();
                        if (Math.hypot(fx, fz) < 2) return;
                        this.panacek.smer = zaokrouhli(Math.atan2(-fx, -fz), 4);
                        telo.rotation(uhel(this.panacek.smer));
                        L.batchDraw();
                    };
                    const pust = () => {
                        window.removeEventListener('pointermove', otoc);
                        window.removeEventListener('pointerup', pust);
                        this._katastrAutosave?.();
                        this._panacek2d();
                    };
                    window.addEventListener('pointermove', otoc);
                    window.addEventListener('pointerup', pust);
                });
                L.add(g);
            }
            L.batchDraw();
        },
    };
})();
