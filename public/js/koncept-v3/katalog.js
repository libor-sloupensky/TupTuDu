/**
 * Katalog nábytku a vybavení v editoru: výběr v panelu, vložení klikem nebo přetažením, zarážka o zdi,
 * panel vybraného kusu a modely ve 3D. Soubory a výroba viz modules/katalog.md.
 *
 * Kus je obyčejný záznam engine.vybaveni s polem `katalog`, takže uložení, Zpět, výběr, otáčení a mazání
 * jdou stejnou cestou jako u dosavadního vybavení. Poloha je v metrech s y nahoru, předek míří při uhel = 0
 * dolů v půdorysu (+z ve 3D), záda jsou nahoře.
 */
(function () {
    // Obraz a zrcadlo patří na zeď: jen ty se ke zdi přichytí a otočí zády k ní
    const NA_ZED = new Set(['obrazy', 'zrcadla']);
    const DOSAH_ZDI = 0.35;
    const TOLERANCE_PX = 0.01;
    const ROZMERY = [['sirka', 'ed_nastroje.katalog.sirka'], ['hloubka', 'ed_nastroje.katalog.hloubka'], ['vyska', 'ed_nastroje.katalog.vyska']];

    // Duch kusu pod kurzorem a náhled při tažení z panelu, mimo reaktivní data (Konva nesnese proxy)
    let duch = null;
    let tazenyNahled = null;

    /** Konvexní obal, stěna v rohu může mít víc než čtyři body. */
    function konvexniObal(body) {
        const b = [...body].sort((p, q) => p.x - q.x || p.y - q.y);
        const krizem = (o, p, q) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
        const pul = (seznam) => {
            const v = [];
            for (const p of seznam) {
                while (v.length >= 2 && krizem(v[v.length - 2], v[v.length - 1], p) <= 0) v.pop();
                v.push(p);
            }
            v.pop();
            return v;
        };
        return [...pul(b), ...pul([...b].reverse())];
    }

    /** Nejkratší posun, který dostane konvexní A z konvexního B. Null, když se nepřekrývají. */
    function vytlaceni(A, B) {
        let nej = Infinity, nx = 0, ny = 0;
        for (const P of [A, B]) {
            for (let i = 0; i < P.length; i++) {
                const a = P[i], b = P[(i + 1) % P.length];
                let ox = -(b.y - a.y), oy = b.x - a.x;
                const L = Math.hypot(ox, oy);
                if (L < 1e-6) continue;
                ox /= L; oy /= L;
                let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
                for (const q of A) { const s = q.x * ox + q.y * oy; if (s < minA) minA = s; if (s > maxA) maxA = s; }
                for (const q of B) { const s = q.x * ox + q.y * oy; if (s < minB) minB = s; if (s > maxB) maxB = s; }
                const presah = Math.min(maxA, maxB) - Math.max(minA, minB);
                if (presah <= TOLERANCE_PX) return null;
                if (presah < nej) {
                    nej = presah;
                    const znamenko = (minA + maxA) < (minB + maxB) ? -1 : 1;
                    nx = ox * znamenko; ny = oy * znamenko;
                }
            }
        }
        return { x: nx * nej, y: ny * nej };
    }

    window.KonceptKatalog = {
        katalog: null,
        katalogKategorie: 'pohovky',
        katalogHledat: '',
        katalogVybrany: null,
        katalogRetez: true,

        async _katalogNacti() {
            if (this.katalog) return;
            try {
                const r = await fetch('/katalog/katalog.json');
                if (!r.ok) throw new Error(preloz('ed_nastroje.katalog.chyba_http', { status: r.status }));
                const data = await r.json();
                // Názvy kategorií jdou ze slovníku podle id, JSON zůstává česky
                data.kategorie.forEach(k => { k.nazev = preloz('ed_nastroje.kategorie.' + k.id); });
                // Názvy kusů přes slovník podle českého názvu, nový kus bez překladu zůstane česky
                data.polozky.forEach(p => { p.nazevZdroj = p.nazev; p.nazev = window.TT_LOKALIZACE.texty['ed_katalog.' + p.nazev] ?? p.nazev; });
                this.katalog = data;
            } catch (e) {
                window.chybaUzivateli?.(e, 'Načtení katalogu');
            }
        },

        /** Tlačítko nástroje: otevře sekci v pravém panelu, ať je panel zrovna skrytý, nebo ne. */
        async prepniKatalog() {
            const otevrit = !this.panelOpen.katalog;
            this.panelOpen.katalog = otevrit;
            this.ulozitPanely();
            if (!otevrit) { this._katalogZrusVyber(); return; }
            await this._katalogNacti();
            await this.$nextTick();
            document.getElementById('kk-sekce-katalog')?.scrollIntoView({ block: 'nearest' });
        },

        get katalogPolozky() {
            if (!this.katalog) return [];
            const q = this.katalogHledat.trim().toLowerCase();
            return this.katalog.polozky.filter(p => (q ? p.nazev.toLowerCase().includes(q) : p.kategorie === this.katalogKategorie));
        },

        katalogRozmery(p) {
            const cm = (m) => Math.round(m * 100);
            return cm(p.sirka) + ' × ' + cm(p.hloubka) + ' cm';
        },

        katalogVyber(p) {
            if (this._katalogPoTazeni) return;
            if (this.katalogVybrany?.id === p.id) { this._katalogZrusVyber(); return; }
            this._katalogPriprav(p);
        },

        _katalogPriprav(p) {
            if (this.rezim3d) this.prepni2d();
            this._zrusRozkreslene?.();
            this.renderer.clearSelection?.();
            this.showVybaveni = true;
            this.renderer.showVybaveni = true;
            this.katalogVybrany = p;
            this.nastroj = 'katalog';
        },

        _katalogZrusVyber() {
            this.katalogVybrany = null;
            this._katalogDuchPryc();
            if (this.nastroj === 'katalog') this.nastroj = 'vyber';
        },

        katalogEsc() {
            if (!this.katalogVybrany) return false;
            this._katalogZrusVyber();
            return true;
        },

        /** Obdélník kusu v metrech, y nahoru. Úhel je ve stupních v půdorysu, kde y míří dolů. */
        _katalogPolygon(stred, sirka, hloubka, uhel) {
            const a = uhel * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), w = sirka / 2, h = hloubka / 2;
            return [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => [stred[0] + x * c - y * s, stred[1] - (x * s + y * c)]);
        },

        /**
         * Přichycení na zeď: bod v metrech (y nahoru) a hloubka kusu. Vrací střed a úhel, záda míří ke zdi.
         * Bere nejbližší stěnu, před jejímž lícem střed kusu stojí a kam dosáhne se zády do DOSAH_ZDI.
         */
        _katalogKeZdi(stred, hloubka) {
            const PX = this.engine.PX_PER_M;
            const px = stred[0] * PX, py = -stred[1] * PX;
            let nej = null;
            for (const w of this.engine.walls.values()) {
                const a = this.engine.nodes.get(w.nodeA), b = this.engine.nodes.get(w.nodeB);
                if (!a || !b) continue;
                const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
                if (L2 < 1) continue;
                const t = ((px - a.x) * dx + (py - a.y) * dy) / L2;
                if (t < 0 || t > 1) continue;
                const qx = a.x + dx * t, qy = a.y + dy * t;
                const d = Math.hypot(px - qx, py - qy) / PX;
                const lic = (w.tloustka || 0) / 2;
                const mezera = d - lic - hloubka / 2;
                if (mezera > DOSAH_ZDI || d < 1e-6 || (nej && d >= nej.d)) continue;
                nej = { d, qx, qy, lic, nx: (qx - px) / PX / d, ny: (qy - py) / PX / d };
            }
            if (!nej) return null;
            const odstup = nej.lic + hloubka / 2;
            return {
                stred: [nej.qx / PX - nej.nx * odstup, -(nej.qy / PX - nej.ny * odstup)],
                uhel: Math.atan2(nej.nx, -nej.ny) * 180 / Math.PI,
            };
        },

        /**
         * Zarážka: nejbližší poloha, kde celý obdélník kusu nezasahuje do žádné zdi. U zdi tak kus klouže po ní,
         * a teprve když střed přejde přes osu zdi, přeskočí do vedlejší místnosti. `volno` je false,
         * když se nikam nevejde (užší mezera než kus).
         */
        _katalogMimoZdi(stred, sirka, hloubka, uhel) {
            const PX = this.engine.PX_PER_M;
            const zdi = [];
            for (const id of this.engine.walls.keys()) {
                const p = this.engine.getWallPolygon(id);
                if (p && p.length >= 3) zdi.push(konvexniObal(p.map(q => ({ x: q.x, y: q.y }))));
            }
            const roh = this._katalogPolygon(stred, sirka, hloubka, uhel).map(([x, y]) => ({ x: x * PX, y: -y * PX }));
            let dx = 0, dy = 0;
            for (let i = 0; i < 8; i++) {
                let posun = false;
                const ted = roh.map(q => ({ x: q.x + dx, y: q.y + dy }));
                for (const z of zdi) {
                    const m = vytlaceni(ted, z);
                    if (!m) continue;
                    dx += m.x; dy += m.y;
                    posun = true;
                    break;
                }
                if (!posun) return { stred: [stred[0] + dx / PX, stred[1] - dy / PX], volno: true };
            }
            return { stred: [stred[0] + dx / PX, stred[1] - dy / PX], volno: false };
        },

        _katalogAlt(e) {
            return e && e.evt && typeof e.evt.altKey === 'boolean' ? e.evt.altKey : !!this._altDrzen;
        },

        /** Kam kus doopravdy dopadne. Alt zarážku i přichycení vypne. */
        _katalogUsad(stred, uhel, kus, e) {
            if (this._katalogAlt(e)) return { stred, uhel, volno: true };
            if (NA_ZED.has(kus.kategorie)) {
                const u = this._katalogKeZdi(stred, kus.hloubka);
                if (u) return { ...u, volno: true };
            }
            return { ...this._katalogMimoZdi(stred, kus.sirka, kus.hloubka, uhel), uhel };
        },

        _katalogBodKurzoru(pos) {
            const PX = this.engine.PX_PER_M;
            return [pos.x / PX, -pos.y / PX];
        },

        _katalogDuchPryc() {
            if (duch) { duch.destroy(); duch = null; this.renderer?.overlayLayer?.batchDraw(); }
        },

        katalogPohyb(pos, e) {
            const p = this.katalogVybrany;
            if (!p) return;
            const u = this._katalogUsad(this._katalogBodKurzoru(pos), 0, p, e);
            this._katalogDuchPryc();
            const zaznam = {
                id: '_duch', typ: 'Katalog', katalog: p.id, nazev: p.nazev, tvar: 'rect', uhel: u.uhel, sirka: p.sirka, hloubka: p.hloubka,
                polygon: this._katalogPolygon(u.stred, p.sirka, p.hloubka, u.uhel),
            };
            duch = window.PudorysIcons.createFurnitureShape(zaznam, this.engine.PX_PER_M);
            duch.listening(false);
            duch.opacity(0.75);
            this.renderer.overlayLayer.add(duch);
            this.renderer.overlayLayer.batchDraw();
        },

        katalogKlik(pos, e) {
            const p = this.katalogVybrany;
            if (!p) return;
            const u = this._katalogUsad(this._katalogBodKurzoru(pos), 0, p, e);
            const v = this._katalogZaznam(p, u.stred, u.uhel);
            this.engine.vybaveni.push(v);
            this._katalogZrusVyber();
            this.renderer.setSelection([], [], [], [v.id]);
            this._poZmeneDomu(preloz('ed_nastroje.katalog.akce_vlozeni', { nazev: p.nazev }));
        },

        _katalogZaznam(p, stred, uhel) {
            return {
                id: 'vb' + (this.engine.nextId++),
                typ: 'Katalog', podtyp: null, kategorie: p.kategorie, katalog: p.id, nazev: p.nazev, nazevZdroj: p.nazevZdroj, tvar: 'rect', zadni_strana: null,
                stred: [stred[0], stred[1]], uhel, sirka: p.sirka, hloubka: p.hloubka, vyska: p.vyska, uroven: p.uroven || 0,
                zaklad: { sirka: p.sirka, hloubka: p.hloubka, vyska: p.vyska },
                polygon: this._katalogPolygon(stred, p.sirka, p.hloubka, uhel),
            };
        },

        // ─── Přetažení z panelu ────────────────────────────────
        /** Stisk na kartě v panelu. Klik zůstává klikem, tažení začne až po pár pixelech. */
        katalogTazeniStart(e, p) {
            if (e.button !== 0) return;
            const start = { x: e.clientX, y: e.clientY };
            const prst = e.pointerType !== 'mouse';
            let bezi = false;
            const pohyb = (ev) => {
                if (!bezi) {
                    const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
                    if (Math.hypot(dx, dy) < 6) return;
                    // Svislý pohyb prstem je posouvání seznamu, ne tažení
                    if (prst && Math.abs(dy) > Math.abs(dx)) { konec(); return; }
                    bezi = true;
                    this._katalogPriprav(p);
                    this._katalogNahledTazeni(p);
                }
                ev.preventDefault();
                this._katalogTazeniPohyb(ev);
            };
            const pusteni = (ev) => {
                konec();
                if (!bezi) return;
                // Puštěním nad kartou prohlížeč vyvolá ještě klik, ten po tažení nemá nic vybírat
                this._katalogPoTazeni = true;
                setTimeout(() => { this._katalogPoTazeni = false; }, 0);
                this._katalogTazeniKonec(ev);
            };
            const zruseni = () => {
                konec();
                if (bezi) { this._katalogNahledTazeni(null); this._katalogZrusVyber(); }
            };
            const konec = () => {
                window.removeEventListener('pointermove', pohyb);
                window.removeEventListener('pointerup', pusteni);
                window.removeEventListener('pointercancel', zruseni);
            };
            window.addEventListener('pointermove', pohyb, { passive: false });
            window.addEventListener('pointerup', pusteni);
            window.addEventListener('pointercancel', zruseni);
        },

        _katalogNahledTazeni(p) {
            if (tazenyNahled) { tazenyNahled.remove(); tazenyNahled = null; }
            if (!p) return;
            const img = document.createElement('img');
            img.src = window.Katalog3d.soubor('nahledy/' + p.id + '.webp');
            img.alt = '';
            img.style.cssText = 'position:fixed;width:96px;height:72px;pointer-events:none;z-index:1000;opacity:.9;transform:translate(-50%,-50%)';
            document.body.appendChild(img);
            tazenyNahled = img;
        },

        /** Bod půdorysu pod ukazatelem, null když ukazatel není přímo nad plátnem (panel, mimo). */
        _katalogBodZUdalosti(ev) {
            const kontejner = this.stage.container();
            const pod = document.elementFromPoint(ev.clientX, ev.clientY);
            if (!pod || !kontejner.contains(pod)) return null;
            const r = kontejner.getBoundingClientRect();
            return this.stage.getAbsoluteTransform().copy().invert().point({ x: ev.clientX - r.left, y: ev.clientY - r.top });
        },

        _katalogTazeniPohyb(ev) {
            const pos = this._katalogBodZUdalosti(ev);
            if (tazenyNahled) {
                tazenyNahled.style.left = ev.clientX + 'px';
                tazenyNahled.style.top = ev.clientY + 'px';
                tazenyNahled.style.display = pos ? 'none' : 'block';
            }
            if (pos) this.katalogPohyb(pos, { evt: ev });
            else this._katalogDuchPryc();
        },

        _katalogTazeniKonec(ev) {
            this._katalogNahledTazeni(null);
            const pos = this._katalogBodZUdalosti(ev);
            if (pos) this.katalogKlik(pos, { evt: ev });
            else this._katalogZrusVyber();
        },

        // ─── Tažení vloženého kusu ─────────────────────────────
        /** Tažení vybraného kusu se zarážkou o zdi. Volá ho editor místo prostého posunu. */
        katalogTah(ids, dxM, dyM, e) {
            if (ids.size !== 1) return false;
            const id = [...ids][0];
            const v = (this.engine.vybaveni || []).find(x => x.id === id);
            if (!v || !v.katalog) return false;
            // Volný střed drží, kde by kus byl bez zarážky, jinak by se o zeď zasekl a nešel zpátky
            if (this._katalogTahId !== id) { this._katalogTahId = id; this._katalogVolny = [v.stred[0], v.stred[1]]; }
            this._katalogVolny[0] += dxM;
            this._katalogVolny[1] -= dyM;
            const u = this._katalogUsad([...this._katalogVolny], v.uhel || 0, v, e);
            if (!u.volno) return true;   // užší mezera než kus: zůstane, kde byl
            v.stred = [u.stred[0], u.stred[1]];
            v.uhel = u.uhel;
            v.polygon = this._katalogPolygon(v.stred, v.sirka, v.hloubka, v.uhel);
            return true;
        },

        katalogTahKonec() {
            this._katalogTahId = null;
        },

        /** Po otočení nebo změně rozměru: kus, který by zasahoval do zdi, se vysune ven. */
        _katalogVytlac(v) {
            if (!NA_ZED.has(v.kategorie)) {
                const u = this._katalogMimoZdi(v.stred, v.sirka, v.hloubka, v.uhel || 0);
                if (u.volno) v.stred = u.stred;
            }
            v.polygon = this._katalogPolygon(v.stred, v.sirka, v.hloubka, v.uhel || 0);
        },

        /**
         * Magnet otáčení: kus zaskočí, když je rovnoběžný nebo kolmý k některé zdi podlaží. Vrací nové otočení
         * v radiánech, null když k žádné zdi nemíří, undefined když se neotáčí jeden kus z katalogu.
         */
        katalogMagnetRotace(delta) {
            const snimek = this._rotateVybaveniSnap;
            if (!snimek || snimek.size !== 1 || this._rotateNodeSnap?.size) return undefined;
            const [id, puvodni] = [...snimek][0];
            const v = (this.engine.vybaveni || []).find(x => x.id === id);
            if (!v || !v.katalog) return undefined;
            const smery = [];
            for (const w of this.engine.walls.values()) {
                const a = this.engine.nodes.get(w.nodeA), b = this.engine.nodes.get(w.nodeB);
                if (a && b && Math.hypot(b.x - a.x, b.y - a.y) > 1) smery.push(Math.atan2(b.y - a.y, b.x - a.x));
            }
            if (!smery.length) smery.push(0);
            const ctvrt = Math.PI / 2, uhel = (puvodni.uhel || 0) * Math.PI / 180 + delta;
            let nej = null, nejD = this._silaUhlu(4);
            for (const a of smery) {
                const r = uhel - a;
                const d = Math.round(r / ctvrt) * ctvrt - r;
                if (Math.abs(d) < nejD) {
                    nejD = Math.abs(d);
                    nej = delta + d;
                    this._katalogSmerMagnetu = a;
                }
            }
            return nej;
        },

        katalogPoOtoceni() {
            for (const id of this.renderer.selectedVybaveni || []) {
                const v = (this.engine.vybaveni || []).find(x => x.id === id);
                if (v && v.katalog) this._katalogVytlac(v);
            }
        },

        // ─── Panel vybraného kusu ──────────────────────────────
        get katalogObjekt() {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            const r = this.renderer;
            if (!r || !this.engine || r.selectedVybaveni?.size !== 1 || r.selectedWalls.size || r.selectedOpenings.size) return null;
            const id = [...r.selectedVybaveni][0];
            const v = (this.engine.vybaveni || []).find(x => x.id === id);
            return v && v.katalog ? v : null;
        },

        /** Původní rozměry kusu. Starší záznamy je nemají, vezmou se z katalogu, jinak ze současných. */
        _katalogZaklad(v) {
            if (v.zaklad) return v.zaklad;
            const p = this.katalog?.polozky.find(x => x.id === v.katalog);
            return p ? { sirka: p.sirka, hloubka: p.hloubka, vyska: p.vyska } : { sirka: v.sirka, hloubka: v.hloubka, vyska: v.vyska };
        },

        katalogInspektor() {
            const v = this.katalogObjekt;
            if (!v) return null;
            const z = this._katalogZaklad(v);
            return {
                kind: 'katalog', count: 1, id: v.id, nazev: v.nazev,
                urovenCm: Math.round((v.uroven || 0) * 100),
                rozmery: ROZMERY.map(([osa, klic]) => ({ osa, nazev: preloz(klic), cm: Math.round(v[osa] * 100), procenta: Math.round(v[osa] / z[osa] * 100) })),
                zmeneno: ROZMERY.some(([osa]) => Math.abs(v[osa] - z[osa]) > 0.0005),
                barva: v.barva || '',
                barvy: this._katalogBarvy(v),
            };
        },

        /** Paleta kusu z katalogu: jen když má kus masku potahu. Katalog se dotáhne, kdyby ještě nebyl načtený. */
        _katalogBarvy(v) {
            if (!this.katalog) { this._katalogNacti().then(() => { this._selectionTick++; }); return []; }
            const p = this.katalog.polozky.find(x => x.id === v.katalog);
            return window.Katalog3d.barvy(p?.maska).map(b => ({ ...b, nazev: preloz(b.klic ? 'ed_sablona.katalog.barvy.' + b.klic : 'ed_sablona.katalog.barva_puvodni') }));
        },

        /** Barva potahu, prázdný klíč vrátí původní. */
        katalogBarva(klic) {
            const v = this.katalogObjekt;
            if (!v || (v.barva || '') === klic) return;
            if (klic) v.barva = klic;
            else delete v.barva;
            this.renderer.setSelection([], [], [], [v.id]);
            this._poZmeneDomu(preloz('ed_nastroje.katalog.akce_barva'));
        },

        /** Změna rozměru v cm nebo %. Se spojeným řetízkem se ostatní rozměry mění ve stejném poměru. */
        katalogRozmer(osa, hodnota, jednotka) {
            const v = this.katalogObjekt;
            const cislo = Number(hodnota);
            if (!v || !Number.isFinite(cislo) || cislo <= 0) { this._selectionTick++; return; }
            const z = this._katalogZaklad(v);
            v.zaklad = z;
            const novy = Math.max(0.01, Math.min(30, jednotka === '%' ? z[osa] * cislo / 100 : cislo / 100));
            if (this.katalogRetez) {
                const k = novy / v[osa];
                for (const [o] of ROZMERY) v[o] *= k;
            } else {
                v[osa] = novy;
            }
            this._katalogVytlac(v);
            this.renderer.setSelection([], [], [], [v.id]);
            this._poZmeneDomu(preloz('ed_nastroje.katalog.akce_rozmer'));
        },

        katalogPuvodni() {
            const v = this.katalogObjekt;
            if (!v) return;
            const z = this._katalogZaklad(v);
            for (const [o] of ROZMERY) v[o] = z[o];
            this._katalogVytlac(v);
            this.renderer.setSelection([], [], [], [v.id]);
            this._poZmeneDomu(preloz('ed_nastroje.katalog.akce_puvodni'));
        },

        katalogOtoc() {
            const v = this.katalogObjekt;
            if (!v) return;
            v.uhel = (((v.uhel || 0) + 90) % 360);
            this._katalogVytlac(v);
            this.renderer.setSelection([], [], [], [v.id]);
            this._poZmeneDomu(preloz('ed_nastroje.katalog.akce_otoceni'));
        },

        katalogKopie() {
            const v = this.katalogObjekt;
            if (!v) return;
            // Vedle originálu podél jeho šířky: zůstane u stejné zdi, jde tak řadit třeba židle
            const a = (v.uhel || 0) * Math.PI / 180, krok = v.sirka + 0.1;
            const stred = [v.stred[0] + Math.cos(a) * krok, v.stred[1] - Math.sin(a) * krok];
            const nova = { ...v, id: 'vb' + (this.engine.nextId++), stred };
            this._katalogVytlac(nova);
            this.engine.vybaveni.push(nova);
            this.renderer.setSelection([], [], [], [nova.id]);
            this._poZmeneDomu(preloz('ed_nastroje.katalog.akce_kopie'));
        },

        katalogSmaz() {
            const v = this.katalogObjekt;
            if (!v) return;
            this.engine.removeVybaveni(v.id);
            this.renderer.clearSelection?.();
            this._poZmeneDomu(preloz('ed_nastroje.katalog.akce_smazani'));
        },

        katalogUroven(cm) {
            const v = this.katalogObjekt;
            const hodnota = Number(cm);
            if (!v || !Number.isFinite(hodnota)) return;
            v.uroven = Math.max(0, Math.min(300, hodnota)) / 100;
            this._poZmeneDomu(preloz('ed_nastroje.katalog.akce_vyska'));
        },

        // ─── 3D ────────────────────────────────────────────────
        /** Modely podlaží do skupiny g. Výška počítá se zvýšenou nebo sníženou podlahou místnosti pod kusem. */
        _vybaveni3d(eng, podl, g) {
            const _3d = window._kk3d;
            for (const v of eng.vybaveni || []) {
                if (!v.katalog || !Array.isArray(v.stred)) continue;
                const PX = eng.PX_PER_M;
                const dh = this._nulaBodu?.(podl.id, { x: v.stred[0] * PX, y: -v.stred[1] * PX }) || 0;
                window.Katalog3d.vloz(g, {
                    id: v.katalog, x: v.stred[0], y: dh + (v.uroven || 0), z: -v.stred[1],
                    uhel: v.uhel || 0, sirka: v.sirka, hloubka: v.hloubka, vyska: v.vyska, ...(v.barva ? { barva: v.barva } : {}),
                }, () => window.Svetlo3d.prekresliStiny(_3d.renderer));
            }
        },
    };
})();
