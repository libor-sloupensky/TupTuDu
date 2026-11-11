/**
 * Střešní krytiny ze skutečných textur, společné pro editor a sdílený odkaz (modules/dum.md, část Krytiny).
 *
 * Seznam vzhledů je window.KRYTINY_VZHLEDY. Vyrábí ho services/krytiny/sestav.py a šablona ho vloží
 * do stránky. Tašky, bobrovka, šindel a břidlice mají barvu danou fotografií, uživatel volí vzhled.
 * V datech střechy se vzhled ukládá jako jeho průměrná barva (`strecha.barva`), takže 2D, historie
 * i starší projekty fungují beze změny: hledá se přesná shoda, jinak nejbližší barva. Plech a asfaltový
 * pás se prodávají v libovolném odstínu, jejich textura nese jen jas a barvu volí uživatel.
 *
 * Souřadnice textury jsou v metrech vydělených `metru` vzhledu (dum.js, _troj3d), nahoře je hřeben.
 */
(function () {
    const ZAKLAD = '/textury/krytiny/';
    // Verze podle vzhledy.json: po nové výrobě textur prohlížeč nevezme staré z mezipaměti
    const adresa = (soubor) => ZAKLAD + soubor + (window.KRYTINY_VERZE ? '?v=' + window.KRYTINY_VERZE : '');
    const vzhledy = () => window.KRYTINY_VZHLEDY || [];
    const zHexu = (h) => [1, 3, 5].map(i => parseInt(String(h).slice(i, i + 2), 16) || 0);

    // Rozdíl barev v Lab (ΔE 76), blíž lidskému vnímání než RGB: šedá nespadne k červené
    const lab = (hex) => {
        const [r, g, b] = zHexu(hex).map(c => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; });
        const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
        const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b), z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
        return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
    };
    const vzdalenost = (a, b) => {
        const p = lab(a), q = lab(b);
        return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    };

    const podleId = (id) => vzhledy().find(v => v.id === id) || null;
    const typu = (typ) => vzhledy().filter(v => v.typ === typ);

    /**
     * Vzhled pro typ krytiny a uloženou barvu. Přebarvitelný typ má jediný. Bez přesné shody
     * (starší projekt, barva z plechu) vybírá jen z čistých vzhledů: zvětralost si nikdo nevybral.
     */
    function vzhled(typ, hex) {
        const moznosti = typu(typ);
        if (!moznosti.length) return null;
        if (moznosti[0].prebarvit || !hex) return moznosti[0];
        const h = String(hex).toLowerCase();
        const presny = moznosti.find(v => v.hex === h);
        if (presny) return presny;
        const zakladni = moznosti.filter(v => v.zakladni);
        return (zakladni.length ? zakladni : moznosti).reduce((a, b) => (vzdalenost(b.hex, h) < vzdalenost(a.hex, h) ? b : a));
    }

    const textury = new Map();
    const cekajici = new Map();
    /** Sdílená textura, při přestavbě scény se nemaže. `priNacteni` se zavolá po dotažení. */
    function textura(soubor, barevna, priNacteni) {
        const THREE = window.THREE;
        let t = textury.get(soubor);
        if (!t) {
            cekajici.set(soubor, []);
            t = new THREE.TextureLoader().load(adresa(soubor), () => {
                const fronta = cekajici.get(soubor) || [];
                cekajici.delete(soubor);
                fronta.forEach(f => f());
            }, undefined, (chyba) => {
                cekajici.delete(soubor);
                window.zalogujChybu?.(chyba instanceof Error ? chyba : new Error('Textura krytiny se nenačetla: ' + soubor), 'Krytina: textura', { soubor });
            });
            if (barevna) t.encoding = THREE.sRGBEncoding;
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 8;
            textury.set(soubor, t);
        }
        if (priNacteni && cekajici.has(soubor)) cekajici.get(soubor).push(priNacteni);
        return t;
    }

    /**
     * Materiál krytiny. U pevného vzhledu je barva bílá a určuje ji textura, u přebarvitelného
     * je `material.color` zvolená barva (hodnota ze vzorku jako všude, viz svetlo-3d.js).
     */
    function material(v, hex, priNacteni) {
        const THREE = window.THREE;
        if (typeof v === 'string') v = podleId(v);
        if (!v) return null;
        const kov = ['falc', 'trapez', 'vlnity'].includes(v.typ);
        // Stíny se přepočítají jednou, až dorazí všechny ještě nenačtené mapy
        let zbyva = ['barva', 'normala', 'arm'].filter(f => !textury.has(v.id + '/' + f + '.webp') || cekajici.has(v.id + '/' + f + '.webp')).length;
        const hotovo = priNacteni && zbyva ? () => { if (--zbyva === 0) priNacteni(); } : null;
        const arm = textura(v.id + '/arm.webp', false, hotovo);
        const m = new THREE.MeshStandardMaterial({
            color: new THREE.Color(v.prebarvit ? (hex || '#8a8d90') : '#ffffff'),
            roughness: 1, metalness: kov ? 0.25 : 0,
            side: THREE.DoubleSide,
            map: textura(v.id + '/barva.webp', true, hotovo),
            normalMap: textura(v.id + '/normala.webp', false, hotovo),
            roughnessMap: arm,
            aoMap: arm,
        });
        m.userData.krytinaVzhled = v.id;
        return m;
    }

    window.Krytiny3d = { vzhled, podleId, typu, material, nahled: (id) => adresa(id + '/nahled.webp') };
})();
