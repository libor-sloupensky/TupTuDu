/**
 * Společné kroky pro obrázky článků z editoru: přihlášení, kopie vzorového projektu nebo nový koncept,
 * záběr kamery ve 3D, výřez a složení snímků, uložení WebP a JPEG. Koncepty mají prefix ClaudeTest
 * a skript je na konci smaže. Šablonu vzorového projektu jen čte (kopie se dělá na serveru, šablona se neotvírá).
 *
 * Použití: const S = require('./snimky-editor.cjs'); const s = await S.zacni(); … await s.konec();
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { otevriProhlizec, pauza } = require('../import-test/prohlizec.cjs');

const KOREN = path.join(__dirname, '../..');
const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;

const tinker = (kod) => execFileSync('php', ['artisan', 'tinker', '--execute', kod], { cwd: KOREN, windowsHide: true }).toString().trim();

/** Pomocníci ve stránce: body domu ve 3D, záběr kamery, snímek scény, výřez, složení. */
const POMOCNICI = `window.__sn = (() => {
    const T = THREE;
    const d = ${D};
    const platna = {};
    const viditelny = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
    /** Body všech viditelných těles domu (stěny, desky, střecha, nábytek, schody). */
    function body() {
        const _3d = window._kk3d, out = [];
        _3d.wallGroup.updateMatrixWorld(true);
        _3d.wallGroup.traverse(o => {
            if (!o.isMesh || !viditelny(o) || !o.geometry) return;
            const pos = o.geometry.getAttribute('position');
            if (!pos) return;
            // Základy pod terénem schová zem, do záběru nepatří
            const nadZemi = (v) => v.y > -0.02;
            // Modely nábytku mají souřadnice kvantované (normalized), ty čte správně jen obálka z glTF
            if (pos.count > 4000 || pos.normalized) {
                // Obálku z glTF (min a max přístupu) nepřepočítávat, přepočet kvantování nezná
                if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
                const b = o.geometry.boundingBox;
                for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { const v = new T.Vector3(x, y, z).applyMatrix4(o.matrixWorld); if (nadZemi(v)) out.push(v); }
                return;
            }
            for (let i = 0; i < pos.count; i++) { const v = new T.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (nadZemi(v)) out.push(v); }
        });
        return out;
    }
    /** Kamera ve směru smer (od cíle ke kameře), přiblížení tak, aby body vyplnily výřez v poměru pomer bez okraje. */
    function zaber({ smer, pomer, okraj = 0.06, B = body(), posunY = 0 }) {
        const _3d = window._kk3d, cam = _3d.camera, ctl = _3d.controls;
        const box = new T.Box3().setFromPoints(B), c = box.getCenter(new T.Vector3());
        const v = new T.Vector3(...smer).normalize();
        ctl.target.copy(c); cam.position.copy(c).addScaledVector(v, 80);
        cam.zoom = 1; cam.updateProjectionMatrix(); ctl.update(); cam.updateMatrixWorld();
        const cv = _3d.renderer.domElement, Ac = cv.width / cv.height;
        const limX = Ac > pomer ? pomer / Ac : 1, limY = Ac > pomer ? 1 : Ac / pomer;
        for (let k = 0; k < 5; k++) {
            let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
            for (const b of B) { const q = b.clone().project(cam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
            const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - posunY * limY;
            const right = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
            const posun = right.multiplyScalar(cx * (cam.right - cam.left) / 2 / cam.zoom).add(up.multiplyScalar(cy * (cam.top - cam.bottom) / 2 / cam.zoom));
            ctl.target.add(posun); cam.position.add(posun);
            cam.zoom *= Math.min(limX * (1 - okraj) / ((x1 - x0) / 2), limY * (1 - okraj) / ((y1 - y0) / 2));
            cam.updateProjectionMatrix(); ctl.update(); cam.updateMatrixWorld();
        }
        return { zoom: cam.zoom, bodu: B.length };
    }
    /** Výřez snímku scény v poměru W : H, zmenšený na W × H. */
    function snimek(nazev, W, H) {
        const cv = d._snimekScény(), pomer = W / H;
        let w = cv.width, h = Math.round(w / pomer);
        if (h > cv.height) { h = cv.height; w = Math.round(h * pomer); }
        const v = document.createElement('canvas'); v.width = W; v.height = H;
        const g = v.getContext('2d'); g.imageSmoothingQuality = 'high';
        g.drawImage(cv, (cv.width - w) / 2, (cv.height - h) / 2, w, h, 0, 0, W, H);
        platna[nazev] = v;
        return [cv.width, cv.height];
    }
    /** Mřížka snímků s bílou spárou. */
    function slozit(nazev, nazvy, sloupcu, spara = 6) {
        const prvni = platna[nazvy[0]], radku = Math.ceil(nazvy.length / sloupcu);
        const v = document.createElement('canvas');
        v.width = prvni.width * sloupcu + spara * (sloupcu - 1); v.height = prvni.height * radku + spara * (radku - 1);
        const g = v.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, v.width, v.height);
        nazvy.forEach((n, i) => g.drawImage(platna[n], (i % sloupcu) * (prvni.width + spara), Math.floor(i / sloupcu) * (prvni.height + spara)));
        platna[nazev] = v;
        return [v.width, v.height];
    }
    /** Výřez z plátna (x, y, w, h v jeho pixelech) zmenšený na W × H. */
    function vyrez(nazev, zdroj, x, y, w, h, W, H) {
        const v = document.createElement('canvas'); v.width = W; v.height = H;
        const g = v.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
        g.drawImage(platna[zdroj], x, y, w, h, 0, 0, W, H);
        platna[nazev] = v;
        return [W, H];
    }
    /**
     * Půdorys aktivního podlaží jako při exportu (řídí ho přepínače zobrazení), na bílém pozadí.
     * sirkaDomu: místo pevného měřítka exportu se dům přiblíží na tuto šířku v px obrazovky (malé půdorysy;
     * písmo má stálou velikost na obrazovce, takže zůstane stejně velké jako u velkého domu).
     */
    function plan(nazev, sirkaDomu = 0) {
        let k;
        if (sirkaDomu) {
            const e = d.engine, st = d.stage, xs = [...e.nodes.values()].map(n => n.x), ys = [...e.nodes.values()].map(n => n.y);
            const s = sirkaDomu / (Math.max(...xs) - Math.min(...xs));
            st.scale({ x: s, y: s });
            st.position({ x: st.width() / 2 - (Math.max(...xs) + Math.min(...xs)) / 2 * s, y: st.height() / 2 - (Math.max(...ys) + Math.min(...ys)) / 2 * s });
            d.zoom = s; d.renderer.poZmeneZoomu(); d.renderer.render();
            k = d._kresbyPodlazi([e.dum.aktivni], { podlePohledu: true })[0];
        } else {
            k = d._kresbyPodlazi([d.engine.dum.aktivni])[0];
        }
        const v = document.createElement('canvas'); v.width = k.canvas.width; v.height = k.canvas.height;
        const g = v.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, v.width, v.height); g.drawImage(k.canvas, 0, 0);
        platna[nazev] = v;
        return { w: v.width, h: v.height, pxNaMetr: k.pxNaMetr * 2 };
    }
    /** Popisky místností jinam než doprostřed (nábytek je kreslený přes ně): { id místnosti: [x, y] v metrech plátna }. */
    function popisky(cile) {
        const r = d.renderer, X = d.engine.PX_PER_M;
        if (!r.__puvodniMistnosti) r.__puvodniMistnosti = r.renderMistnosti;
        r.renderMistnosti = function (...a) {
            const v = r.__puvodniMistnosti.apply(this, a);
            for (const t of this._mistnostiPopisky || []) {
                const c = cile[this.mistnostVBode(t.x(), t.y())];
                if (c) t.position({ x: c[0] * X, y: c[1] * X });
            }
            this.mistnostiLayer.batchDraw();
            return v;
        };
        r._mistnostiCache = null; r.render();
    }
    /** Obálka nebílých pixelů plátna (pro ořez). */
    function obalka(nazev, prah = 245) {
        const v = platna[nazev], b = v.getContext('2d').getImageData(0, 0, v.width, v.height).data;
        let x0 = v.width, y0 = v.height, x1 = 0, y1 = 0;
        for (let y = 0; y < v.height; y += 2) for (let x = 0; x < v.width; x += 2) {
            const i = (y * v.width + x) * 4;
            if (b[i] < prah || b[i + 1] < prah || b[i + 2] < prah) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        return { x0, y0, x1, y1 };
    }
    function data(nazev, kvalitaWebp = 0.82, kvalitaJpg = 0.85) {
        const v = platna[nazev];
        return { webp: v.toDataURL('image/webp', kvalitaWebp), jpg: v.toDataURL('image/jpeg', kvalitaJpg), w: v.width, h: v.height };
    }
    return { body, zaber, snimek, slozit, vyrez, plan, popisky, obalka, data, platna };
})(); true`;

async function zacni({ sirka = 1900, vyska = 1200 } = {}) {
    const p = await otevriProhlizec({ sirka, vyska });
    const koncepty = [];
    const js = (t) => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; ${t} })()`);
    const jsA = (t) => p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; const cek = (ms) => new Promise(r => setTimeout(r, ms)); ${t} })()`);

    await p.jdiNa(ZAKLAD + '/login');
    await p.cekej(`!!document.querySelector('input[name=password]')`, 20000, 'login');
    await p.vyhodnot(`(() => { document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
        document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
        document.querySelector('form').submit(); return true; })()`);
    await pauza(3000);

    const s = {
        p, js, jsA, D,
        /** Kopie dat šablony vzorového projektu (bez parcely a podkladu) jako nový koncept, vrací id. */
        kopieVzoru(nazev) {
            const id = tinker(`$k = App\\Models\\KonceptV3::where('vzor', 'sablona')->firstOrFail();
                $n = App\\Models\\KonceptV3::create(['uzivatel_id' => $k->uzivatel_id, 'nazev' => ${JSON.stringify('ClaudeTest ' + nazev)}, 'data' => $k->data, 'verze' => 1, 'faze' => 'rozhovor', 'metadata' => null, 'chat' => [], 'historie' => []]);
                echo $n->id;`);
            koncepty.push(id);
            return id;
        },
        /** Prázdný koncept. */
        novy(nazev) {
            const id = tinker(`$u = App\\Models\\KonceptV3::where('vzor', 'sablona')->firstOrFail()->uzivatel_id;
                $n = App\\Models\\KonceptV3::create(['uzivatel_id' => $u, 'nazev' => ${JSON.stringify('ClaudeTest ' + nazev)}, 'data' => null, 'verze' => 1, 'faze' => 'rozhovor', 'metadata' => null, 'chat' => [], 'historie' => []]);
                echo $n->id;`);
            koncepty.push(id);
            return id;
        },
        async otevri(id) {
            await p.jdiNa(`${ZAKLAD}/masterteam/koncept-v3?id=${id}`);
            await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && window.THREE)`, 30000, 'editor');
            await pauza(1200);
            // Editor si pamatuje 3D z minulého konceptu, začíná se vždy ve 2D
            await p.vyhodnot(`(async () => { const d = ${D}; if (d.rezim3d) { d.prepni2d(); await new Promise(r => setTimeout(r, 600)); d.fitView(); } return true; })()`);
            // Skryté plátno 2D má po návratu ze 3D chvíli rozměr 1 px, půdorys z pohledu by pak byl prázdný
            await p.cekej(`${D}.stage.width() > 200 && ${D}.stage.height() > 200`, 15000, 'plátno 2D');
            await p.vyhodnot(`${D}.fitView(), true`);
            await p.vyhodnot(POMOCNICI);
        },
        /** Přepne do 3D, přestaví scénu, schová mřížku a počká na modely nábytku a omítku. */
        async do3d() {
            await jsA(`if (!d.rezim3d) { await d.prepni3d(); await cek(800); } d._build3d(); await window.Katalog3d?.hotovo?.(); await cek(600);
                const _3d = window._kk3d; if (_3d.grid) _3d.grid.visible = false; if (_3d.gridLines) _3d.gridLines.visible = false; return true;`);
            await s.povrchy();
        },
        async prestav3d() {
            await jsA(`d._build3d(); await window.Katalog3d?.hotovo?.(); await cek(500); const _3d = window._kk3d; if (_3d.grid) _3d.grid.visible = false; return true;`);
            await s.povrchy();
        },
        /** Omítka fasády se načítá asynchronně (Povrchy3d.stav().omitka, test-fasada-3d-ui.cjs). */
        async povrchy() {
            await p.cekej(`!window.Povrchy3d?.stav || window.Povrchy3d.stav().omitka === 1`, 30000, 'omítka fasády');
            await pauza(300);
        },
        async uloz(nazev, slozka, soubor, { webp = true, jpg = true, kvalitaWebp, kvalitaJpg } = {}) {
            const data = await p.vyhodnot(`window.__sn.data(${JSON.stringify(nazev)}, ${kvalitaWebp ?? 0.82}, ${kvalitaJpg ?? 0.85})`);
            const cil = path.join(KOREN, 'public/img/clanky', slozka);
            fs.mkdirSync(cil, { recursive: true });
            const vysledek = [];
            for (const [pripona, url, chci] of [['webp', data.webp, webp], ['jpg', data.jpg, jpg]]) {
                if (!chci) continue;
                const f = path.join(cil, soubor + '.' + pripona);
                fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
                vysledek.push(`${slozka}/${soubor}.${pripona} ${data.w}×${data.h} ${Math.round(fs.statSync(f).size / 1024)} kB`);
            }
            console.log('   ' + vysledek.join(', '));
            return data;
        },
        async konec() {
            try { await p.zavri(); } catch { /* končíme */ }
            for (const id of koncepty) {
                tinker(`App\\Models\\KonceptV3::where('id', ${Number(id)})->where('nazev', 'like', 'ClaudeTest %')->whereNull('vzor')->delete();`);
                console.log('smazán koncept', id);
            }
        },
    };
    return s;
}

module.exports = { zacni, pauza, D, KOREN };
