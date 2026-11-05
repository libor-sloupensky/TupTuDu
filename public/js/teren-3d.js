/**
 * Terén ve 3D, společný pro editor a sdílený odkaz: barvy podle parcely a sklonu, maska vnitřku domu a výkop.
 * Stavbu mřížky a výkop řeší zemina.js a dum.js (modules/zemina.md, modules/sdileni.md).
 */
(function () {
    const THREE = window.THREE;
    if (!THREE) return;

    /** Maska parcel: uvnitř bílá. Polygony [[x, z]] ve scéně. */
    function maskaParcel(parcely, minX, minZ, sirka, vyska) {
        const ROZLISENI = 1024;
        const platno = document.createElement('canvas');
        platno.width = platno.height = ROZLISENI;
        const g = platno.getContext('2d');
        g.fillStyle = '#000';
        g.fillRect(0, 0, ROZLISENI, ROZLISENI);
        g.fillStyle = '#fff';
        // Sčítání: na společné hraně se vyhlazené okraje dvou parcel doplní do plné bílé, jinak tu zůstane čára
        g.globalCompositeOperation = 'lighter';
        for (const poly of parcely) {
            if (poly.length < 3) continue;
            g.beginPath();
            poly.forEach(([x, z], i) => {
                const mx = (x - minX) / sirka * ROZLISENI, my = (z - minZ) / vyska * ROZLISENI;
                if (i) g.lineTo(mx, my); else g.moveTo(mx, my);
            });
            g.closePath();
            g.fill();
        }
        const textura = new THREE.CanvasTexture(platno);
        textura.magFilter = THREE.LinearFilter;
        textura.minFilter = THREE.LinearFilter;
        textura.flipY = false;  // canvas má Y dolů, UV také — netřeba flip
        return textura;
    }

    /** Barva terénu: v parcele zelená do hněda podle sklonu, mimo ni světle šedá. */
    function shaderBarev(shader, maska, minX, minZ, sirka, vyska) {
        shader.uniforms.uMask = { value: maska };
        shader.uniforms.uMaskMin = { value: new THREE.Vector2(minX, minZ) };
        shader.uniforms.uMaskSize = { value: new THREE.Vector2(sirka, vyska) };
        shader.vertexShader = 'varying vec3 vWorldPosCustom;\nvarying vec3 vNormalCustom;\n'
            + shader.vertexShader.replace(
                '#include <fog_vertex>',
                `#include <fog_vertex>
vWorldPosCustom = (modelMatrix * vec4(transformed, 1.0)).xyz;
vNormalCustom = normalize((modelMatrix * vec4(normal, 0.0)).xyz);`
            );
        shader.fragmentShader = 'uniform sampler2D uMask;\nuniform vec2 uMaskMin;\nuniform vec2 uMaskSize;\nvarying vec3 vWorldPosCustom;\nvarying vec3 vNormalCustom;\n'
            + shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
{
    vec2 uv = (vWorldPosCustom.xz - uMaskMin) / uMaskSize;
    float mask = 0.0;
    if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
        mask = texture2D(uMask, uv).r;
    }
    vec3 nrm = normalize(vNormalCustom);
    float slope = sqrt(max(0.0, 1.0 - abs(nrm.y) * abs(nrm.y)));
    float t = pow(slope, 0.4);
    vec3 insideCol = mix(vec3(0.663, 0.761, 0.522), vec3(0.435, 0.322, 0.204), t);
    vec3 outsideCol = vec3(0.9, 0.9, 0.9);
    diffuseColor.rgb = tuVzorekNaLin(mix(outsideCol, insideCol, mask));
}`
            );
    }

    function uniformyVnitrku() {
        return {
            uVnitrek: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat) },
            uVnitrekMin: { value: new THREE.Vector2() },
            uVnitrekRozmer: { value: new THREE.Vector2(1, 1) },
            uVnitrekUroven: { value: new THREE.Vector2(0, 1) },
            uVnitrekZap: { value: 0 },
        };
    }

    /** Do shaderu terénu přidá: uvnitř domu se nad podlahou nekreslí. */
    function shaderVnitrku(shader, u) {
        Object.assign(shader.uniforms, u);
        shader.vertexShader = 'varying vec3 vVnitrekPoloha;\n' + shader.vertexShader.replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvVnitrekPoloha = (modelMatrix * vec4(transformed, 1.0)).xyz;'
        );
        shader.fragmentShader = 'uniform sampler2D uVnitrek;\nuniform vec2 uVnitrekMin;\nuniform vec2 uVnitrekRozmer;\nuniform vec2 uVnitrekUroven;\nuniform float uVnitrekZap;\nvarying vec3 vVnitrekPoloha;\n'
            + shader.fragmentShader.replace(
                '#include <clipping_planes_fragment>',
                `#include <clipping_planes_fragment>
if (uVnitrekZap > 0.5) {
    vec2 vnUv = (vVnitrekPoloha.xz - uVnitrekMin) / uVnitrekRozmer;
    if (vnUv.x >= 0.0 && vnUv.x <= 1.0 && vnUv.y >= 0.0 && vnUv.y <= 1.0) {
        vec4 vn = texture2D(uVnitrek, vnUv);
        if (vn.r > 0.5 && vVnitrekPoloha.y > uVnitrekUroven.x + vn.g / vn.r * uVnitrekUroven.y) discard;
    }
}`
            );
    }

    /**
     * Nastaví masku vnitřku: v obrysu je červená, zelená nese úroveň podlahy. Zemina se tu nekreslí, jen když
     * je nad ní, níž ji kryje podlaha a pod stěnou nesvítí díra. Přepočítá se jen po změně.
     * @param {Array} casti zdola nahoru: { obrys: [{x, y}], uroven } ve scéně (y je osa z)
     */
    function nastavVnitrek(u, casti) {
        u.uVnitrekZap.value = casti.length ? 1 : 0;
        if (!casti.length) return;
        const klic = JSON.stringify(casti);
        if (u.klic === klic) return;
        u.klic = klic;
        const body = casti.flatMap(c => c.obrys);
        const x0 = Math.min(...body.map(b => b.x)) - 0.5, x1 = Math.max(...body.map(b => b.x)) + 0.5;
        const z0 = Math.min(...body.map(b => b.y)) - 0.5, z1 = Math.max(...body.map(b => b.y)) + 0.5;
        const dole = Math.min(...casti.map(c => c.uroven)) - 0.01;
        const rozsah = Math.max(Math.max(...casti.map(c => c.uroven)) - dole, 0.02);
        const meritko = 2048 / Math.max(x1 - x0, z1 - z0);
        const platno = document.createElement('canvas');
        platno.width = Math.ceil((x1 - x0) * meritko);
        platno.height = Math.ceil((z1 - z0) * meritko);
        const g = platno.getContext('2d');
        // Shora dolů: kde stojí víc podlaží, platí to nejnižší, zemina je nad ním všude pryč
        [...casti].reverse().forEach((c) => {
            g.fillStyle = `rgb(255,${Math.round((c.uroven - dole) / rozsah * 255)},0)`;
            g.beginPath();
            c.obrys.forEach((b, i) => {
                const x = (b.x - x0) * meritko, y = (b.y - z0) * meritko;
                if (i) g.lineTo(x, y); else g.moveTo(x, y);
            });
            g.closePath();
            g.fill();
        });
        u.uVnitrek.value.dispose();
        const textura = new THREE.CanvasTexture(platno);
        textura.flipY = false;
        textura.magFilter = THREE.LinearFilter;
        textura.minFilter = THREE.LinearFilter;
        textura.generateMipmaps = false;
        u.uVnitrek.value = textura;
        u.uVnitrekMin.value.set(x0, z0);
        u.uVnitrekRozmer.value.set(platno.width / meritko, platno.height / meritko);
        u.uVnitrekUroven.value.set(dole, rozsah);
    }

    function uniformyJamy() {
        return {
            uJama: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat) },
            uJamaMin: { value: new THREE.Vector2() },
            uJamaRozmer: { value: new THREE.Vector2(1, 1) },
            uJamaOsa: { value: new THREE.Vector2(1, 0) },
            uJamaZap: { value: 0 },
        };
    }

    /** Do shaderu terénu přidá díru: co leží nad výkopem, nekreslí se. */
    function shaderJamy(shader, u) {
        Object.assign(shader.uniforms, u);
        shader.vertexShader = 'varying vec3 vJamaPoloha;\n' + shader.vertexShader.replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvJamaPoloha = (modelMatrix * vec4(transformed, 1.0)).xyz;'
        );
        shader.fragmentShader = 'uniform sampler2D uJama;\nuniform vec2 uJamaMin;\nuniform vec2 uJamaRozmer;\nuniform vec2 uJamaOsa;\nuniform float uJamaZap;\nvarying vec3 vJamaPoloha;\n'
            + shader.fragmentShader.replace(
                '#include <clipping_planes_fragment>',
                `#include <clipping_planes_fragment>
if (uJamaZap > 0.5) {
    vec2 jamaUv = (vec2(dot(vJamaPoloha.xz, uJamaOsa), dot(vJamaPoloha.xz, vec2(-uJamaOsa.y, uJamaOsa.x))) - uJamaMin) / uJamaRozmer;
    if (jamaUv.x >= 0.0 && jamaUv.x <= 1.0 && jamaUv.y >= 0.0 && jamaUv.y <= 1.0 && texture2D(uJama, jamaUv).r > 0.5) discard;
}`
            );
    }

    let materialJamy = null;

    /**
     * Síť výkopu z buněk natočené mřížky a maska, která je v terénu vyřízne.
     * @param {Object} j { u0, v0, krok, cos, sin, sloupcu, radku, bunky: po buňkách 0/1, y: výšky vrcholů ve scéně }
     */
    function sitJamy(j) {
        const { u0, v0, krok, cos, sin, sloupcu, radku, bunky, y } = j;
        const sCel = sloupcu - 1, rCel = radku - 1;
        const maska = new Uint8Array(sCel * rCel * 4);
        const cislo = new Int32Array(sloupcu * radku).fill(-1);
        const pozice = [], trojuhelniky = [];
        const vrchol = (s, r) => {
            const i = r * sloupcu + s;
            if (cislo[i] >= 0) return cislo[i];
            const u = u0 + s * krok, v = v0 + r * krok;
            cislo[i] = pozice.length / 3;
            pozice.push(u * cos - v * sin, y[i], u * sin + v * cos);
            return cislo[i];
        };
        for (let r = 0; r < rCel; r++) {
            for (let s = 0; s < sCel; s++) {
                if (!bunky[r * sCel + s]) continue;
                maska[(r * sCel + s) * 4] = 255;
                const a = vrchol(s, r), b = vrchol(s + 1, r), c = vrchol(s, r + 1), d = vrchol(s + 1, r + 1);
                trojuhelniky.push(a, c, b, b, c, d);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pozice, 3));
        geo.setIndex(trojuhelniky);
        geo.computeVertexNormals();
        if (!materialJamy) materialJamy = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 1, flatShading: true });
        const sit = new THREE.Mesh(geo, materialJamy);
        sit.receiveShadow = true;
        sit.castShadow = true;
        const textura = new THREE.DataTexture(maska, sCel, rCel, THREE.RGBAFormat);
        textura.magFilter = THREE.NearestFilter;
        textura.minFilter = THREE.NearestFilter;
        textura.needsUpdate = true;
        sit.userData.maska = textura;
        sit.userData.mrizka = { u0, v0, krok, cos, sin, sloupcu, radku };
        return sit;
    }

    /** Vyřízne v terénu místo pro danou síť výkopu; bez sítě je terén celý. */
    function nastavJamu(u, sit) {
        u.uJamaZap.value = sit ? 1 : 0;
        if (!sit) return;
        const m = sit.userData.mrizka;
        u.uJama.value = sit.userData.maska;
        u.uJamaOsa.value.set(m.cos, m.sin);
        u.uJamaMin.value.set(m.u0, m.v0);
        u.uJamaRozmer.value.set((m.sloupcu - 1) * m.krok, (m.radku - 1) * m.krok);
    }

    /**
     * Terén sdíleného odkazu z modelu: mřížka výšek vůči ±0 domu, tvar parcel.
     * @param {Object} t { minX, minZ, sirka, vyska, sloupcu, radku, parcely }
     * @param {Float32Array} vysky po řádcích
     */
    function postav(t, vysky) {
        const u = uniformyVnitrku();
        const uj = uniformyJamy();
        const geo = new THREE.PlaneGeometry(t.sirka, t.vyska, t.sloupcu - 1, t.radku - 1);
        geo.rotateX(-Math.PI / 2);
        geo.translate(t.minX + t.sirka / 2, 0, t.minZ + t.vyska / 2);
        const poz = geo.attributes.position;
        for (let i = 0; i < poz.count; i++) poz.setY(i, vysky[i]);
        poz.needsUpdate = true;
        geo.computeVertexNormals();
        const maska = maskaParcel(t.parcely || [], t.minX, t.minZ, t.sirka, t.vyska);
        const material = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
        material.onBeforeCompile = (shader) => {
            shaderVnitrku(shader, u);
            shaderJamy(shader, uj);
            shaderBarev(shader, maska, t.minX, t.minZ, t.sirka, t.vyska);
        };
        const plocha = new THREE.Mesh(geo, material);
        plocha.receiveShadow = true;
        const materialMrizky = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.4 });
        materialMrizky.onBeforeCompile = (shader) => { shaderVnitrku(shader, u); shaderJamy(shader, uj); };
        const mrizka = new THREE.LineSegments(new THREE.WireframeGeometry(geo), materialMrizky);
        mrizka.position.y = 0.02;
        return { plocha, mrizka, uniformy: u, uniformyJamy: uj };
    }

    window.Teren3d = { maskaParcel, shaderBarev, uniformyVnitrku, shaderVnitrku, nastavVnitrek, uniformyJamy, shaderJamy, sitJamy, nastavJamu, postav };
})();
