/**
 * Procházka: pohled okem panáčka, společný pro editor a sdílený odkaz (modules/dum.md, část Procházka).
 *
 * Panáček stojí na nejvyšší vodorovné ploše pod sebou (podlaha, schod, terén). Schod do KROK vyjde sám,
 * z vyššího spadne, zdmi a nábytkem prochází (Libor 12. 11. 2026). Oko je ve výšce `oko` nad tím, na čem
 * stojí. Klesne-li oko pod terén, hostitel terén skryje (podZemi) a po návratu nad zem ho zase ukáže.
 *
 * Hostitel dodá scénu, plátno, co je pochozí a výšku terénu, kreslí svou smyčkou a před každým snímkem
 * volá krok(). Nic z editoru tu není, stránka sdílení načítá jen tenhle soubor (modules/sdileni.md).
 */
(function () {
    const THREE = window.THREE;
    if (!THREE) return;

    const OKO = 1.6;                // výchozí výška oka nad podlahou (m)
    const OKO_MIN = -30, OKO_MAX = 60;
    const ZARAZKA = 0.1;            // oko u země: klesání se tu zastaví, pod zem až dalším stiskem
    const KROK = 0.5;               // schod, který panáček vyjde sám (m)
    const VSTUP = 2.2;              // z terénu vystoupí na podlahu domu nad sebou nejvýš o tolik (vchod na svahu)
    const RYCHLOST = 2, BEH = 5;    // chůze a se Shiftem (m/s)
    const OTACENI = 1.5;            // šipky vlevo a vpravo (rad/s)
    const OKO_RYCHLOST = 1.2;       // Q a E (m/s), se Shiftem čtyřikrát
    const ZORNY_UHEL = 60;          // svislý zorný úhel kamery (°)
    const MYS = 0.0045;             // otočení na pixel tahu (rad)
    const SKLON_MAX = 89 * Math.PI / 180;
    const KOLECKO = 0.6, KOLECKO_SHIFT = 2;   // krok kolečkem (m)
    const TAH_PX = 6;               // menší pohyb je klik nebo ťuknutí, ne tah

    const KLAVESY = {
        KeyW: 'vpred', ArrowUp: 'vpred', KeyS: 'vzad', ArrowDown: 'vzad',
        KeyA: 'vlevo', KeyD: 'vpravo', ArrowLeft: 'otocVlevo', ArrowRight: 'otocVpravo',
        KeyQ: 'niz', PageDown: 'niz', KeyE: 'vys', PageUp: 'vys',
    };

    const MAPKA_PX = 24;            // obrázek mapky pro odkaz: px na metr

    const omez = (v, a, b) => Math.min(b, Math.max(a, v));

    /** Schody, stěny a otvory podlaží do kontextu v metrech (mapka v editoru i obrázek pro odkaz). */
    function kresliPatro(g, p) {
        for (const [polys, barva] of [[p.schody, '#cbd5e1'], [p.steny, '#374151'], [p.otvory, '#e5e7eb']]) {
            g.fillStyle = barva;
            g.beginPath();
            for (const poly of polys || []) poly.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z)));
            g.fill('nonzero');
        }
    }

    /** Rozsah podlaží v metrech: u obrázku z odkazu uložený, jinak ze stěn. */
    function obrysPatra(p) {
        if (Array.isArray(p.obal)) return { minX: p.obal[0], minZ: p.obal[1], maxX: p.obal[2], maxZ: p.obal[3] };
        let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
        for (const poly of p.steny || []) for (const [x, z] of poly) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }
        return isFinite(minX) ? { minX, minZ, maxX, maxZ } : null;
    }

    /**
     * Mapka podlaží jako obrázek PNG s rozsahem v metrech. Sdílený odkaz dostává jen grafiku, stěny a otvory
     * jako data nikam neodcházejí (modules/sdileni.md).
     */
    function obrazekMapky(p) {
        const b = obrysPatra(p);
        if (!b) return null;
        const minX = b.minX - 0.5, minZ = b.minZ - 0.5, maxX = b.maxX + 0.5, maxZ = b.maxZ + 0.5;
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.ceil((maxX - minX) * MAPKA_PX));
        cv.height = Math.max(1, Math.ceil((maxZ - minZ) * MAPKA_PX));
        const g = cv.getContext('2d');
        g.scale(MAPKA_PX, MAPKA_PX);
        g.translate(-minX, -minZ);
        kresliPatro(g, p);
        const r = (v) => Math.round(v * 100) / 100;
        return { obrazek: cv.toDataURL('image/png'), obal: [r(minX), r(minZ), r(maxX), r(maxZ)] };
    }

    /** Barva značky z CSS (plátno proměnné nezná), záloha jen pro stránku bez stylů. */
    const barvaZnacky = () => getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim() || '#2f6fed';

    const STYLY = `
.tt-pr { position: absolute; inset: 0; pointer-events: none; z-index: 12; font: 12px/1.3 system-ui, sans-serif; }
.tt-pr[hidden] { display: none; }
.tt-pr-panel { position: absolute; right: 10px; top: 10px; width: 176px; pointer-events: auto; display: flex; flex-direction: column; gap: 4px;
  background: var(--c-surface, #fff); color: var(--c-text, #1f2937); border: 1px solid var(--c-border, #d1d5db); border-radius: 8px; padding: 6px; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.tt-pr-patro { display: flex; align-items: center; gap: 4px; }
.tt-pr-patro span { flex: 1; text-align: center; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tt-pr button { width: 26px; height: 24px; border: 1px solid var(--c-border, #d1d5db); border-radius: 5px; background: var(--c-surface, #fff); color: var(--c-text, #1f2937);
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; touch-action: none; }
.tt-pr button:hover:not(:disabled) { border-color: var(--c-primary, #2f6fed); color: var(--c-primary, #2f6fed); }
.tt-pr button:disabled { opacity: .35; cursor: default; }
.tt-pr-mapka { display: block; width: 162px; height: 132px; border-radius: 5px; cursor: crosshair; background: #f8fafc; }
.tt-pr-oko { display: flex; align-items: center; gap: 6px; }
.tt-pr-oko input { width: 64px; padding: 2px 4px; border: 1px solid var(--c-border, #d1d5db); border-radius: 4px; background: var(--c-surface, #fff); color: var(--c-text, #1f2937); font: inherit; }
.tt-pr-pad { position: absolute; left: 10px; bottom: 36px; pointer-events: auto; display: grid; grid-template-columns: repeat(3, 44px); grid-template-rows: repeat(3, 44px); gap: 4px; }
.tt-pr-pad button { width: 44px; height: 44px; border-radius: 8px; background: rgba(255,255,255,.88); color: #1f2937; }
.tt-pr-pad[hidden] { display: none; }
`;

    const IKONA = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const IKONY = {
        nahoru: IKONA('<path d="m6 15 6-6 6 6"/>'),
        dolu: IKONA('<path d="m6 9 6 6 6-6"/>'),
        vlevo: IKONA('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
        vpravo: IKONA('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
        vys: IKONA('<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>'),
        niz: IKONA('<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>'),
        vychozi: IKONA('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    };

    /** Obloha kolem oka: nahoře modrá, u obzoru světlá, pod obzorem barva země (pod zemí neutrální). */
    function postavNebe() {
        const material = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            uniforms: {
                nahore: { value: new THREE.Color(0xa9c4df) },
                obzor: { value: new THREE.Color(0xeaeff3) },
                dole: { value: new THREE.Color(0xb7c2ae) },
                pozadi: { value: new THREE.Color(0xe8ecf0) },
                zem: { value: 1 },
            },
            vertexShader: 'varying vec3 vSmer; void main() { vSmer = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
            fragmentShader: `uniform vec3 nahore; uniform vec3 obzor; uniform vec3 dole; uniform vec3 pozadi; uniform float zem; varying vec3 vSmer;
void main() {
    float h = normalize( vSmer ).y;
    vec3 c = h > 0.0 ? mix( obzor, nahore, pow( h, 0.55 ) ) : mix( obzor, mix( pozadi, dole, zem ), min( 1.0, -h * 12.0 ) );
    gl_FragColor = vec4( c, 1.0 );
}`,
        });
        const nebe = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), material);
        nebe.renderOrder = -10;
        nebe.frustumCulled = false;
        nebe.userData.prochazka = true;
        return nebe;
    }

    /**
     * Postava v měřítku 1,75 m pro 3D shora (editor): nohy, trup, ruce a hlava, před sebou výseč pohledu.
     * Stojí v počátku, dívá se po −z jako kamera.
     */
    function postava(barva) {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(barva || barvaZnacky()), roughness: 0.7 });
        const valec = (r1, r2, v, x, y) => {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, v, 12), mat);
            m.position.set(x, y + v / 2, 0);
            g.add(m);
        };
        valec(0.075, 0.065, 0.86, -0.1, 0);
        valec(0.075, 0.065, 0.86, 0.1, 0);
        const trup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.62, 16), mat);
        trup.scale.z = 0.6;
        trup.position.y = 0.86 + 0.31;
        g.add(trup);
        valec(0.05, 0.045, 0.6, -0.25, 0.86);
        valec(0.05, 0.045, 0.6, 0.25, 0.86);
        const hlava = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat);
        hlava.position.y = 1.62;
        g.add(hlava);
        const nos = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), mat);
        nos.rotation.x = -Math.PI / 2;
        nos.position.set(0, 1.62, -0.13);
        g.add(nos);
        const vysec = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24, Math.PI / 3, Math.PI / 3), new THREE.MeshBasicMaterial({
            color: mat.color, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide,
        }));
        vysec.rotation.x = -Math.PI / 2;
        vysec.position.y = 0.03;
        g.add(vysec);
        g.userData.prochazka = true;
        return g;
    }

    /**
     * @param {object} o
     *   scena, platno (canvas rendereru), vrstva (prvek nad plátnem pro panel a tlačítka),
     *   pochozi() → meshe, na kterých se dá stát; cile() → meshe pro dvojklik a kroužek pod myší,
     *   nepochozi(obj) → zásah, který nikam nevede (střecha), teren(x, z) → výška terénu nebo null
     *   (počítá se i skrytý), texty {…}, podZemi(bool), zmena(stav), konec(), probud(), podlazi(id)
     */
    function vytvor(o) {
        const kamera = new THREE.PerspectiveCamera(ZORNY_UHEL, 1, 0.08, 3000);
        kamera.rotation.order = 'YXZ';
        const s = { x: 0, y: 0, z: 0, smer: 0, sklon: 0, oko: OKO };   // y = nohy
        const drzene = new Set();
        let aktivni = false, shift = false, cil = null, kolecko = 0, naposledy = 0, podZemi = false;
        let vynutit = false, usazeno = false, zarazkaPovolena = false, hover = null, mapkaDo = 0;
        let mapka = null, patro = null;

        const nebe = postavNebe();
        // Kroužek cíle: malý a vidět i přes zeď, za kterou vede
        const krouzek = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.155, 32), new THREE.MeshBasicMaterial({
            color: new THREE.Color(barvaZnacky()), transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
        }));
        krouzek.rotation.x = -Math.PI / 2;
        krouzek.renderOrder = 50;
        krouzek.visible = false;
        krouzek.userData.prochazka = true;

        // ─── Zem pod nohama ────────────────────────────────
        const paprsek = new THREE.Raycaster();
        const DOLU = new THREE.Vector3(0, -1, 0);
        const bod = new THREE.Vector3(), normala = new THREE.Vector3();
        const viditelny = (x) => { for (; x; x = x.parent) if (!x.visible) return false; return true; };

        /** Nejvyšší vodorovná plocha pod výškou yOd (podlaha, schod, terén), nebo null. */
        function zemPod(x, z, yOd) {
            return zemPodInfo(x, z, yOd).y;
        }

        /** Jako zemPod, navíc jestli jde o plochu domu (`naSiti`) a výšku terénu v bodě (`teren`, i nad yOd). */
        function zemPodInfo(x, z, yOd) {
            let nej = null, naSiti = false;
            const site = o.pochozi?.() || [];
            if (site.length) {
                paprsek.set(bod.set(x, yOd, z), DOLU);
                paprsek.near = 0;
                paprsek.far = 1000;
                for (const h of paprsek.intersectObjects(site, false)) {
                    if (!h.face || !viditelny(h.object)) continue;
                    // Svislé plochy (zdi, boky) nese jen ten, kdo do nich vrazí. Spodek desky leží vždy pod
                    // jejím vrchem, paprsek shora proto narazí nejdřív na vrch: směr normály stačí brát bez znaménka.
                    normala.copy(h.face.normal).transformDirection(h.object.matrixWorld);
                    if (Math.abs(normala.y) < 0.5) continue;
                    nej = h.point.y;
                    naSiti = true;
                    break;
                }
            }
            const t = o.teren?.(x, z);
            if (t != null && t <= yOd + 1e-6 && (nej === null || t > nej)) { nej = t; naSiti = false; }
            return { y: nej, naSiti, teren: t ?? null };
        }

        /**
         * Kam si panáček stoupne: nejvyšší plocha do KROK nad nohama. Kdo nestojí na ploše domu, se nezahrabe:
         * pod terénem vystoupí na terén a je-li nad ním do VSTUP podlaha domu (vchod z nižšího terénu na svahu,
         * panáček pod deskou), stoupne si na ni. Výš ne, ať pod přesahem patra nevyskočí nahoru (Libor 12. 11. 2026).
         */
        function kamStoupne(x, z, y) {
            const zem = zemPodInfo(x, z, y + KROK);
            if (zem.naSiti) return zem.y;
            const zaklad = Math.max(y, zem.teren ?? -Infinity);
            const nad = zemPodInfo(x, z, zaklad + VSTUP);
            if (nad.naSiti && nad.y > zaklad + KROK) return nad.y;
            return zem.teren != null && zem.teren > y + KROK ? zem.teren : zem.y;
        }

        /** Kamera v oku panáčka podle stavu (snímek ani klik nesmí brát polohu z minulého snímku). */
        function kameraZeStavu() {
            kamera.position.set(s.x, s.y + s.oko, s.z);
            kamera.rotation.set(s.sklon, s.smer, 0, 'YXZ');
            kamera.updateMatrixWorld();
        }

        /**
         * Kam vede bod na obrazovce: první podlaha nebo terén pod okem podél paprsku. Zdi, boky, nábytek ani střecha
         * ho nezastaví, zdmi se prochází (Libor 12. 11. 2026: kroužek má jít i přes zeď). Plochy nad okem se
         * přeskočí, kliknutím do stropu se do patra neskočí.
         */
        function cilZObrazovky(cx, cy) {
            const r = o.platno.getBoundingClientRect();
            if (!r.width || !r.height) return null;
            kameraZeStavu();
            paprsek.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1), kamera);
            paprsek.near = 0.05;
            paprsek.far = 2000;
            const yOka = kamera.position.y;
            for (const h of paprsek.intersectObjects(o.cile?.() || [], false)) {
                if (!h.face || h.point.y > yOka - 0.05 || !viditelny(h.object) || o.nepochozi?.(h.object)) continue;
                // Jen vrch vodorovné plochy: spodek desky (strop) a svislé plochy paprsek propustí
                normala.copy(h.face.normal).transformDirection(h.object.matrixWorld);
                if (normala.y >= 0.5) return { x: h.point.x, y: h.point.y, z: h.point.z };
            }
            return null;
        }

        // ─── Panel: patro, mapka, výška oka, tlačítka na dotyk ─
        const t = o.texty || {};
        if (!document.getElementById('tt-prochazka-styly')) {
            const st = document.createElement('style');
            st.id = 'tt-prochazka-styly';
            st.textContent = STYLY;
            document.head.appendChild(st);
        }
        const obal = document.createElement('div');
        obal.className = 'tt-pr';
        obal.hidden = true;
        obal.innerHTML = `
<div class="tt-pr-panel" data-prochazka-panel>
  <div class="tt-pr-patro"><button type="button" data-pr-patro="-1">${IKONY.dolu}</button><span data-pr-nazev></span><button type="button" data-pr-patro="1">${IKONY.nahoru}</button></div>
  <canvas class="tt-pr-mapka" data-pr-mapka></canvas>
  <div class="tt-pr-oko"><label data-pr-oko-text></label><input type="number" step="0.1" min="${OKO_MIN}" max="${OKO_MAX}" data-pr-oko><span>m</span><button type="button" data-pr-oko-vychozi>${IKONY.vychozi}</button></div>
</div>
<div class="tt-pr-pad" data-pr-pad hidden>
  <span></span><button type="button" data-pr-drz="vpred">${IKONY.nahoru}</button><button type="button" data-pr-drz="vys">${IKONY.vys}</button>
  <button type="button" data-pr-drz="otocVlevo">${IKONY.vlevo}</button><button type="button" data-pr-drz="vzad">${IKONY.dolu}</button><button type="button" data-pr-drz="otocVpravo">${IKONY.vpravo}</button>
  <span></span><span></span><button type="button" data-pr-drz="niz">${IKONY.niz}</button>
</div>`;
        o.vrstva.appendChild(obal);
        const el = (sel) => obal.querySelector(sel);
        const poleOka = el('[data-pr-oko]'), platnoMapky = el('[data-pr-mapka]'), nazevPatra = el('[data-pr-nazev]');
        const tlacitkoOka = el('[data-pr-oko-vychozi]');
        poleOka.id = 'tt-pr-oko-' + Math.random().toString(36).slice(2, 8);
        el('[data-pr-oko-text]').textContent = t.oko || 'Oko';
        el('[data-pr-oko-text]').htmlFor = poleOka.id;
        poleOka.title = t.okoTip || '';
        tlacitkoOka.title = t.okoVychozi || '';
        tlacitkoOka.setAttribute('aria-label', t.okoVychozi || '');
        // Výchozí výška oka jedním klikem (Libor 12. 11. 2026)
        tlacitkoOka.addEventListener('click', () => {
            s.oko = OKO;
            zarazkaPovolena = false;
            vynutit = true;
            ukazOko(true);
            o.probud?.();
        });
        platnoMapky.title = t.mapkaTip || '';
        el('[data-pr-patro="1"]').title = t.patroVys || '';
        el('[data-pr-patro="-1"]').title = t.patroNiz || '';
        for (const b of obal.querySelectorAll('[data-pr-drz]')) b.title = t['pad_' + b.dataset.prDrz] || '';
        el('[data-pr-pad]').hidden = !(window.matchMedia?.('(pointer: coarse)').matches);

        // Hodnota oka platí ihned, Enter ji odevzdá (v editoru to dělá jednotné chování polí, CLAUDE.md)
        poleOka.addEventListener('change', () => {
            const v = parseFloat(String(poleOka.value).replace(',', '.'));
            if (!isFinite(v)) { ukazOko(true); return; }
            s.oko = omez(v, OKO_MIN, OKO_MAX);
            vynutit = true;
            o.probud?.();
        });
        poleOka.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); poleOka.blur(); } });
        for (const b of obal.querySelectorAll('[data-pr-patro]')) {
            b.addEventListener('click', () => {
                const p = sousedniPatro(Number(b.dataset.prPatro));
                if (p) vytah(p.id);
            });
        }
        // Tlačítka na dotyk: drží se jako klávesy
        for (const b of obal.querySelectorAll('[data-pr-drz]')) {
            const akce = b.dataset.prDrz;
            const pust = () => { drzene.delete(akce); };
            b.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                b.setPointerCapture?.(e.pointerId);
                if (akce === 'niz' && s.oko <= ZARAZKA + 0.001) zarazkaPovolena = true;
                drzene.add(akce);
                o.probud?.();
            });
            b.addEventListener('pointerup', pust);
            b.addEventListener('pointercancel', pust);
            b.addEventListener('lostpointercapture', pust);
        }
        platnoMapky.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const m = mapkaMatice;
            if (!m) return;
            const r = platnoMapky.getBoundingClientRect();
            const q = m.inverse().transformPoint(new DOMPoint(e.clientX - r.left, e.clientY - r.top));
            presun(q.x, q.y);
        });

        function ukazOko(vzdy) {
            tlacitkoOka.disabled = Math.abs(s.oko - OKO) < 0.005;
            if (!vzdy && document.activeElement === poleOka) return;
            const v = String(Math.round(s.oko * 100) / 100);
            if (poleOka.value !== v) poleOka.value = v;
        }

        // ─── Podlaží a mapka ──────────────────────────────
        const podlazi = () => mapka?.podlazi || [];
        /** Podlaží, na kterém panáček stojí: nejbližší výškou podlahy. */
        function aktualniPatro() {
            let nej = null, d = Infinity;
            for (const p of podlazi()) {
                const v = Math.abs(p.y - s.y) + (p.y > s.y + 0.3 ? 0.5 : 0);
                if (v < d) { d = v; nej = p; }
            }
            return nej;
        }
        function sousedniPatro(smer) {
            const serazena = [...podlazi()].sort((a, b) => a.y - b.y);
            const i = serazena.indexOf(aktualniPatro());
            return i < 0 ? null : serazena[i + smer] || null;
        }
        // Obrázky mapky z odkazu: načtou se jednou, po načtení se mapka překreslí
        const obrazky = new Map();
        const obrazekPatra = (p) => {
            if (!obrazky.has(p.obrazek)) {
                const img = new Image();
                img.onload = () => { mapkaDo = 1; vynutit = true; o.probud?.(); };
                img.src = p.obrazek;
                obrazky.set(p.obrazek, img);
            }
            const img = obrazky.get(p.obrazek);
            return img.complete && img.naturalWidth ? img : null;
        };

        let mapkaMatice = null;
        function kresliMapku() {
            const p = aktualniPatro();
            if (p !== patro) {
                patro = p;
                if (p) o.podlazi?.(p.id);
            }
            nazevPatra.textContent = p?.nazev || '';
            el('[data-pr-patro="1"]').disabled = !sousedniPatro(1);
            el('[data-pr-patro="-1"]').disabled = !sousedniPatro(-1);
            const cv = platnoMapky, dpr = Math.min(window.devicePixelRatio || 1, 2);
            const W = cv.clientWidth || 162, H = cv.clientHeight || 132;
            if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
            const g = cv.getContext('2d');
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.clearRect(0, 0, cv.width, cv.height);
            // Rozsah: všechna podlaží a panáček, ať je vidět i před domem
            let r = null;
            for (const q of podlazi()) {
                const b = obrysPatra(q);
                if (!b) continue;
                r = r ? { minX: Math.min(r.minX, b.minX), minZ: Math.min(r.minZ, b.minZ), maxX: Math.max(r.maxX, b.maxX), maxZ: Math.max(r.maxZ, b.maxZ) } : b;
            }
            if (!r) r = { minX: s.x - 5, minZ: s.z - 5, maxX: s.x + 5, maxZ: s.z + 5 };
            r = { minX: Math.min(r.minX, s.x) - 1.5, minZ: Math.min(r.minZ, s.z) - 1.5, maxX: Math.max(r.maxX, s.x) + 1.5, maxZ: Math.max(r.maxZ, s.z) + 1.5 };
            const cx = (r.minX + r.maxX) / 2, cz = (r.minZ + r.maxZ) / 2;
            const uhel = (mapka?.otoceni || 0) * Math.PI / 180, cos = Math.cos(uhel), sin = Math.sin(uhel);
            let rw = 0, rh = 0;
            for (const [x, z] of [[r.minX, r.minZ], [r.maxX, r.minZ], [r.maxX, r.maxZ], [r.minX, r.maxZ]]) {
                const dx = x - cx, dz = z - cz;
                rw = Math.max(rw, Math.abs(dx * cos - dz * sin));
                rh = Math.max(rh, Math.abs(dx * sin + dz * cos));
            }
            const k = Math.min((W - 8) / (2 * rw || 1), (H - 8) / (2 * rh || 1));
            const m = new DOMMatrix().translate(W / 2, H / 2).scale(k).rotate(mapka?.otoceni || 0).translate(-cx, -cz);
            mapkaMatice = m;
            g.setTransform(new DOMMatrix().scale(dpr).multiply(m));
            if (p?.obrazek) {
                const img = obrazekPatra(p);
                if (img) g.drawImage(img, p.obal[0], p.obal[1], p.obal[2] - p.obal[0], p.obal[3] - p.obal[1]);
            } else if (p) kresliPatro(g, p);
            // Panáček: tečka a výseč pohledu v pixelech, ať je stejně velký při každém měřítku
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            const q = m.transformPoint(new DOMPoint(s.x, s.z));
            const fx = -Math.sin(s.smer), fz = -Math.cos(s.smer);
            const a = Math.atan2(fx * sin + fz * cos, fx * cos - fz * sin);
            const pul = Math.atan(Math.tan(ZORNY_UHEL * Math.PI / 360) * (kamera.aspect || 1));
            const barva = barvaZnacky();
            g.globalAlpha = 0.28;
            g.fillStyle = barva;
            g.beginPath();
            g.moveTo(q.x, q.y);
            g.arc(q.x, q.y, 30, a - pul, a + pul);
            g.closePath();
            g.fill();
            g.globalAlpha = 1;
            g.beginPath();
            g.arc(q.x, q.y, 4.5, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = '#fff';
            g.lineWidth = 1.5;
            g.stroke();
        }

        // ─── Pohyb ────────────────────────────────────────
        function postavNa(x, z, yOd) {
            s.x = x;
            s.z = z;
            const y = zemPod(x, z, yOd);
            s.y = y === null ? yOd - KROK : y;
            cil = null;
            kolecko = 0;
            usazeno = false;
            vynutit = true;
            o.probud?.();
        }
        /** Přesun po mapce: zůstává na stejném podlaží, je-li tam podlaha. */
        function presun(x, z) {
            const p = aktualniPatro();
            postavNa(x, z, (p ? Math.max(p.y, s.y) : s.y) + KROK);
        }
        /** Výtah na podlaží: stejné místo o patro jinde, mimo jeho obrys doprostřed podlaží. */
        function vytah(id) {
            const p = podlazi().find(q => q.id === id);
            if (!p) return false;
            let y = zemPod(s.x, s.z, p.y + KROK);
            if (y === null || y < p.y - 1) {
                const b = obrysPatra(p);
                if (b) { s.x = (b.minX + b.maxX) / 2; s.z = (b.minZ + b.maxZ) / 2; }
                y = zemPod(s.x, s.z, p.y + KROK);
            }
            s.y = y === null ? p.y : y;
            cil = null;
            kolecko = 0;
            usazeno = false;
            vynutit = true;
            o.probud?.();
            return true;
        }

        function krok() {
            if (!aktivni) return false;
            const ted = performance.now();
            const dt = naposledy ? Math.min(0.1, (ted - naposledy) / 1000) : 0;
            naposledy = ted;
            let zmena = vynutit, posun = false;
            vynutit = false;

            const otoc = (drzene.has('otocVlevo') ? 1 : 0) - (drzene.has('otocVpravo') ? 1 : 0);
            if (otoc) { s.smer += otoc * OTACENI * dt; zmena = true; }

            const sin = Math.sin(s.smer), cos = Math.cos(s.smer);
            let dx = 0, dz = 0;
            const vpred = (drzene.has('vpred') ? 1 : 0) - (drzene.has('vzad') ? 1 : 0);
            const bok = (drzene.has('vpravo') ? 1 : 0) - (drzene.has('vlevo') ? 1 : 0);
            if (vpred || bok) {
                const d = (shift ? BEH : RYCHLOST) * dt / Math.hypot(vpred, bok);
                dx += (-sin * vpred + cos * bok) * d;
                dz += (-cos * vpred - sin * bok) * d;
                cil = null;
            }
            if (Math.abs(kolecko) > 0.002) {
                const k = kolecko * Math.min(1, dt * 10);
                kolecko -= k;
                dx += -sin * k;
                dz += -cos * k;
            } else kolecko = 0;
            let doslo = null;
            if (cil) {
                const vx = cil.x - s.x, vz = cil.z - s.z, L = Math.hypot(vx, vz);
                const d = Math.max(3, L * 2.5) * dt;
                if (L <= d) { dx += vx; dz += vz; doslo = cil; cil = null; krouzek.visible = false; } else { dx += vx / L * d; dz += vz / L * d; }
            }
            if (dx || dz) { s.x += dx; s.z += dz; posun = true; }
            // V cíli stojí tam, kam kroužek ukazoval (třeba na zemi pod oknem patra), je-li to pochozí plocha
            if (doslo) {
                const y = zemPod(s.x, s.z, doslo.y + 0.05);
                if (y !== null && Math.abs(y - doslo.y) < 0.1) { s.y = y; usazeno = false; zmena = true; }
            }

            const oko = (drzene.has('vys') ? 1 : 0) - (drzene.has('niz') ? 1 : 0);
            if (oko) {
                let nove = s.oko + oko * OKO_RYCHLOST * (shift ? 4 : 1) * dt;
                // U země se klesání zastaví, pod zem až dalším stiskem (Libor 12. 11. 2026)
                if (oko < 0 && !zarazkaPovolena && s.oko >= ZARAZKA - 1e-6 && nove < ZARAZKA) nove = ZARAZKA;
                s.oko = omez(nove, OKO_MIN, OKO_MAX);
                zmena = true;
            }
            if (s.oko > ZARAZKA + 0.05) zarazkaPovolena = false;

            // Gravitace: stoupne na schod, spadne z okraje. Bez pohybu a po usazení se nepočítá.
            if (posun || !usazeno) {
                const zem = kamStoupne(s.x, s.z, s.y);
                if (zem === null || Math.abs(zem - s.y) < 0.002) {
                    if (zem !== null && zem !== s.y) { s.y = zem; zmena = true; }
                    usazeno = !posun;
                } else {
                    s.y += (zem - s.y) * Math.min(1, Math.max(dt, 1 / 60) * 12);
                    usazeno = false;
                    zmena = true;
                }
            }
            if (posun) zmena = true;

            if (hover) {
                const h = hover;
                hover = null;
                const c = cil ? null : cilZObrazovky(h.x, h.y);
                if (c) { krouzek.position.set(c.x, c.y + 0.02, c.z); krouzek.visible = true; zmena = true; }
                else if (!cil && krouzek.visible) { krouzek.visible = false; zmena = true; }
            }

            if (zmena) {
                kameraZeStavu();
                nebe.position.copy(kamera.position);
                const ter = o.teren?.(s.x, s.z);
                const pod = s.oko < 0 && ter != null && s.y + s.oko < ter - 0.02;
                if (pod !== podZemi) {
                    podZemi = pod;
                    nebe.material.uniforms.zem.value = pod ? 0 : 1;
                    o.podZemi?.(pod);
                }
                ukazOko();
                if (ted >= mapkaDo) { mapkaDo = ted + 66; kresliMapku(); }
                o.zmena?.(stav());
            } else if (mapkaDo && ted >= mapkaDo) {
                mapkaDo = 0;
                kresliMapku();   // poslední poloha po zastavení
            }
            return zmena;
        }

        // ─── Vstupy ───────────────────────────────────────
        const jePole = (n) => n && (n.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName));
        window.addEventListener('keydown', (e) => {
            if (!aktivni || jePole(e.target)) return;
            shift = e.shiftKey;
            if (e.key === 'Escape') { o.konec?.(); return; }
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const akce = KLAVESY[e.code];
            if (!akce) return;
            e.preventDefault();
            if (akce === 'niz' && !e.repeat && s.oko <= ZARAZKA + 0.001) zarazkaPovolena = true;
            drzene.add(akce);
            o.probud?.();
        }, true);
        window.addEventListener('keyup', (e) => {
            shift = e.shiftKey;
            const akce = KLAVESY[e.code];
            if (akce) drzene.delete(akce);
        }, true);
        window.addEventListener('blur', () => { drzene.clear(); shift = false; });

        const platno = o.platno;
        const ukazatele = new Map();
        let tah = null, stipnuti = null;
        platno.addEventListener('pointerdown', (e) => {
            if (!aktivni || (e.pointerType === 'mouse' && e.button !== 0)) return;
            ukazatele.set(e.pointerId, { x: e.clientX, y: e.clientY });
            platno.setPointerCapture?.(e.pointerId);
            if (ukazatele.size === 1) {
                tah = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), dotyk: e.pointerType !== 'mouse', pohnul: false };
                platno.style.cursor = 'grabbing';
            } else if (ukazatele.size === 2) {
                const [a, b] = [...ukazatele.values()];
                stipnuti = Math.hypot(a.x - b.x, a.y - b.y);
                tah = null;
            }
        });
        platno.addEventListener('pointermove', (e) => {
            if (!aktivni) return;
            if (!ukazatele.has(e.pointerId)) {
                if (e.pointerType === 'mouse' && !e.buttons) { hover = { x: e.clientX, y: e.clientY }; o.probud?.(); }
                return;
            }
            ukazatele.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (ukazatele.size === 2 && stipnuti) {
                const [a, b] = [...ukazatele.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                kolecko += (d - stipnuti) * 0.02;
                stipnuti = d;
                o.probud?.();
                return;
            }
            if (!tah) return;
            if (!tah.pohnul && Math.hypot(e.clientX - tah.x0, e.clientY - tah.y0) < TAH_PX) return;
            tah.pohnul = true;
            // Tah posouvá svět pod kurzorem jako ve Street View a v pohledu 3D
            s.smer += (e.clientX - tah.x) * MYS;
            s.sklon = omez(s.sklon + (e.clientY - tah.y) * MYS, -SKLON_MAX, SKLON_MAX);
            tah.x = e.clientX;
            tah.y = e.clientY;
            vynutit = true;
            o.probud?.();
        });
        const pust = (e) => {
            if (!ukazatele.has(e.pointerId)) return;
            ukazatele.delete(e.pointerId);
            if (ukazatele.size < 2) stipnuti = null;
            if (tah && !ukazatele.size) {
                // Ťuknutí na dotykové obrazovce = dojdi tam (myš na to má dvojklik)
                if (e.type === 'pointerup' && tah.dotyk && !tah.pohnul && performance.now() - tah.t < 500) jdiNa(e.clientX, e.clientY);
                tah = null;
            }
            if (!ukazatele.size) platno.style.cursor = aktivni ? 'grab' : '';
        };
        platno.addEventListener('pointerup', pust);
        platno.addEventListener('pointercancel', pust);
        platno.addEventListener('dblclick', (e) => { if (aktivni) { e.preventDefault(); jdiNa(e.clientX, e.clientY); } });
        platno.addEventListener('pointerleave', () => { if (aktivni && !cil && krouzek.visible) { krouzek.visible = false; vynutit = true; o.probud?.(); } });
        platno.addEventListener('wheel', (e) => {
            if (!aktivni) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            kolecko += (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? KOLECKO_SHIFT : KOLECKO);
            cil = null;
            o.probud?.();
        }, { passive: false, capture: true });

        function jdiNa(cx, cy) {
            const c = cilZObrazovky(cx, cy);
            if (!c) return;
            cil = c;
            krouzek.position.set(c.x, c.y + 0.02, c.z);
            krouzek.visible = true;
            vynutit = true;
            o.probud?.();
        }

        // ─── Rozhraní ─────────────────────────────────────
        function stav() {
            return { x: s.x, y: s.y, z: s.z, smer: s.smer, sklon: s.sklon, oko: s.oko, patro: aktualniPatro()?.id ?? null, podZemi };
        }
        function zapni(st) {
            s.smer = st.smer || 0;
            s.sklon = omez(st.sklon || 0, -SKLON_MAX, SKLON_MAX);
            s.oko = omez(typeof st.oko === 'number' ? st.oko : OKO, OKO_MIN, OKO_MAX);
            aktivni = true;
            drzene.clear();
            naposledy = 0;
            podZemi = false;
            nebe.material.uniforms.zem.value = 1;
            krouzek.material.color.set(barvaZnacky());
            o.scena.add(nebe);
            o.scena.add(krouzek);
            krouzek.visible = false;
            obal.hidden = false;
            platno.style.cursor = 'grab';
            platno.style.touchAction = 'none';
            postavNa(st.x || 0, st.z || 0, st.yOd ?? KROK);
            mapkaDo = 1;
        }
        function vypni() {
            if (!aktivni) return;
            aktivni = false;
            drzene.clear();
            cil = null;
            o.scena.remove(nebe);
            o.scena.remove(krouzek);
            obal.hidden = true;
            platno.style.cursor = '';
            platno.style.touchAction = '';
            if (podZemi) { podZemi = false; o.podZemi?.(false); }
        }

        return {
            kamera,
            get aktivni() { return aktivni; },
            krok, zapni, vypni, stav, vytah, presun, zemPod,
            /** Poměr stran plátna. */
            rozmer(w, h) {
                kamera.aspect = w / Math.max(1, h);
                kamera.updateProjectionMatrix();
                vynutit = true;
            },
            /** Scéna se přestavěla: znovu usadit na zem. */
            obnov() { usazeno = false; vynutit = true; },
            /** Dům se ve scéně posunul svisle o dy (dotažené výšky terénu, posun výšky): panáček jde s ním. */
            posunVysku(dy) {
                if (!isFinite(dy) || !dy) return;
                s.y += dy;
                if (cil) cil.y += dy;
                usazeno = false;
                vynutit = true;
            },
            /** Data mapky: { podlazi: [{ id, nazev, y, steny, otvory, schody }], otoceni } v metrech scény. */
            nastavMapku(m) { mapka = m; patro = null; mapkaDo = 1; vynutit = true; },
            /** Kroužek a obloha pryč, třeba pro export obrázku. */
            pomucky(ukazat) {
                if (!ukazat) { krouzek.visible = false; return; }
                vynutit = true;
            },
            panel: obal,
        };
    }

    window.Prochazka3d = { vytvor, postava, obrazekMapky, OKO, KROK };
})();
