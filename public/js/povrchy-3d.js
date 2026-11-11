/**
 * Povrchy domu ve 3D blíž fotografii, společné pro editor a sdílený odkaz (modules/dum.md, část Fasáda, skla a pohled).
 *
 * - omitka(m): fasádní omítka s jemným zrnem (Poly Haven white_stucco, CC0). Stěny nemají souřadnice
 *   textury, kresba se proto promítá podle polohy ve světě, u svislé plochy podél ní. Zrno má skutečnou
 *   velikost: zblízka je vidět, zdálky splyne. Průměr kresby je 1, material.color dál drží barvu ze vzorku.
 * - sklo(): sklo oken. Odráží okolí podle úhlu pohledu (Fresnel ve fyzikálním materiálu): kolmo je tmavé
 *   a prosvítá, šikmo odráží oblohu a terén.
 * - zachytOdrazy(): okolí domu (terén a obloha, bez domu samotného) do mapy prostředí pro skla.
 * - nejnizsiPohled(): nejnižší sklon kamery, při kterém terén pořád zakryje, co je pod ním.
 */
(function () {
    const THREE = window.THREE;
    if (!THREE) return;

    const ZAKLAD = '/textury/omitka/';
    const adresa = (soubor) => ZAKLAD + soubor + (window.POVRCHY_VERZE ? '?v=' + window.POVRCHY_VERZE : '');
    // Velikost dlaždice zrna (rozměr zdroje) a velkých skvrn tónu, které rozbijí jednolitou plochu
    const OMITKA_METRU = 2.0;
    const SKVRNY_METRU = 9.7;

    // Uniformy sdílené všemi materiály omítky: síla 0, dokud textury nedorazí (nenačtená textura je černá)
    const omitkaUniformy = {
        tuOmKresba: { value: null },
        tuOmNormala: { value: null },
        tuOmSila: { value: 0 },
    };
    let omitkaNacitani = null;
    const omitkaCekaji = [];
    function nactiOmitku(priNacteni) {
        if (priNacteni) omitkaCekaji.push(priNacteni);
        if (omitkaNacitani) return;
        const nacti = (soubor) => new Promise((ok, chyba) => {
            const t = new THREE.TextureLoader().load(adresa(soubor), ok, undefined, chyba);
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 8;
        });
        omitkaNacitani = Promise.all([nacti('kresba.webp'), nacti('normala.webp')]).then(([kresba, normala]) => {
            omitkaUniformy.tuOmKresba.value = kresba;
            omitkaUniformy.tuOmNormala.value = normala;
            omitkaUniformy.tuOmSila.value = 1;
            omitkaCekaji.splice(0).forEach(f => f());
        }).catch((chyba) => {
            window.zalogujChybu?.(chyba instanceof Error ? chyba : new Error('Textura omítky se nenačetla'), 'Fasáda: textura omítky', {});
        });
    }

    const OMITKA_VERTEX = `
vTuPoz = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
vTuNormW = normalize( mat3( modelMatrix ) * objectNormal );`;
    // Rám plochy ve světě: u svislé plochy vodorovně podél ní a nahoru, jinak podle osy x
    const OMITKA_RAM = `
vec3 tuN = normalize( vTuNormW ) * ( gl_FrontFacing ? 1.0 : - 1.0 );
vec3 tuT = abs( tuN.y ) < 0.7 ? normalize( vec3( - tuN.z, 0.0, tuN.x ) ) : normalize( vec3( 1.0, 0.0, 0.0 ) - tuN * tuN.x );
vec3 tuB = cross( tuT, tuN );
vec2 tuUv = vec2( dot( vTuPoz, tuT ), dot( vTuPoz, tuB ) );
float tuJemne = texture2D( tuOmKresba, tuUv / ${OMITKA_METRU.toFixed(2)} ).r;
float tuSkvrny = texture2D( tuOmKresba, tuUv / ${SKVRNY_METRU.toFixed(2)} + vec2( 0.37, 0.61 ) ).g;
diffuseColor.rgb *= mix( 1.0, ( 1.0 + ( tuJemne - 0.5 ) * 2.0 ) * ( 1.0 + ( tuSkvrny - 0.5 ) * 2.0 ), tuOmSila );`;
    const OMITKA_NORMALA = `
vec3 tuNm = texture2D( tuOmNormala, tuUv / ${OMITKA_METRU.toFixed(2)} ).xyz * 2.0 - 1.0;
vec3 tuNw = normalize( tuT * tuNm.x + tuB * tuNm.y + tuN * tuNm.z );
normal = normalize( mix( normal, ( viewMatrix * vec4( tuNw, 0.0 ) ).xyz, tuOmSila ) );`;

    /** Materiál fasády dostane omítku. Volá se jednou na materiál, `priNacteni` po dotažení textur. */
    function omitka(m, priNacteni) {
        if (!m || m.userData.omitka) return m;
        m.userData.omitka = true;
        if (omitkaUniformy.tuOmSila.value === 0) nactiOmitku(priNacteni);
        const puvodni = m.onBeforeCompile;
        m.onBeforeCompile = (shader, renderer) => {
            if (puvodni && puvodni !== THREE.Material.prototype.onBeforeCompile) puvodni.call(m, shader, renderer);
            Object.assign(shader.uniforms, omitkaUniformy);
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vTuPoz;\nvarying vec3 vTuNormW;')
                .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>' + OMITKA_VERTEX);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\nuniform sampler2D tuOmKresba;\nuniform sampler2D tuOmNormala;\nuniform float tuOmSila;\nvarying vec3 vTuPoz;\nvarying vec3 vTuNormW;')
                .replace('#include <color_fragment>', '#include <color_fragment>' + OMITKA_RAM)
                .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + OMITKA_NORMALA);
        };
        m.customProgramCacheKey = () => 'tu-omitka';
        m.needsUpdate = true;
        return m;
    }

    // Sklo: tmavé s nádechem do modrozelena jako izolační dvojsklo zvenku. Odrazivost F0 0,16 je součet
    // čtyř ploch dvou tabulí.
    const SKLO_BARVA = '#1d2830';
    // Obloha je ve skutečnosti mnohem jasnější než země i interiér, scéna má ale terén světlý kvůli
    // čitelnosti. Odraz oblohy se proto zesílí a odraz země ztlumí podle směru odraženého paprsku:
    // shora okna odrážejí zem a jsou tmavá jako na snímcích z dronu, nízký pohled je rozjasní obzorem.
    const SKLO_ODRAZ = `#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
	vec3 tuOdrazSvet = inverseTransformDirection( reflect( - geometry.viewDir, geometry.normal ), viewMatrix );
	radiance *= mix( 0.45, 2.2, smoothstep( - 0.12, 0.12, tuOdrazSvet.y ) );
#endif`;
    let odrazy = null;
    /** Nový materiál skla; mapu odrazů dostane hned, je-li zachycená, jinak bere obecnou oblohu scény. */
    function sklo() {
        const m = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(SKLO_BARVA), roughness: 0.04, metalness: 0, reflectivity: 1,
            transparent: true, opacity: 0.88, side: THREE.DoubleSide,
        });
        m.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_maps>', SKLO_ODRAZ);
        };
        m.customProgramCacheKey = () => 'tu-sklo';
        m.userData.sklo = true;
        if (odrazy) m.envMap = odrazy;
        return m;
    }

    /** Okolí do mapy prostředí: obloha k zenitu modřejší, pod obzorem země, terén ze scény. */
    function obloha() {
        return new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
            side: THREE.BackSide, depthWrite: false,
            vertexShader: 'varying vec3 vSmer; void main() { vSmer = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
            fragmentShader: `varying vec3 vSmer;
void main() {
    float v = normalize( vSmer ).y;
    vec3 zenit = vec3( 0.32, 0.47, 0.72 ), obzor = vec3( 0.78, 0.82, 0.86 ), zem = vec3( 0.20, 0.24, 0.16 );
    vec3 c = v > 0.0 ? mix( obzor, zenit, smoothstep( 0.0, 0.6, v ) ) : mix( obzor, zem, smoothstep( 0.0, 0.08, -v ) );
    gl_FragColor = vec4( c, 1.0 );
}`,
        }));
    }

    let generator = null;
    /**
     * Zachytí okolí z bodu `stred` (Vector3) do mapy prostředí a dá ji všem sklům pod `koren`.
     * Vidět zůstane jen `nechat` (terén, země) a světla; dům by z vnitřku zakryl všechno.
     * Krychle 256 px a filtrování drsnosti, desítky milisekund, volá se jen po změně scény.
     */
    function zachytOdrazy(renderer, scene, stred, nechat, koren) {
        const rt = new THREE.WebGLCubeRenderTarget(256, { format: THREE.RGBAFormat, generateMipmaps: false });
        const kamera = new THREE.CubeCamera(0.1, 2000, rt);
        kamera.position.copy(stred);
        const nebe = obloha();
        nebe.position.copy(stred);
        const skryte = [];
        for (const o of scene.children) {
            if (o.visible && !o.isLight && !nechat.includes(o)) { o.visible = false; skryte.push(o); }
        }
        const pozadi = scene.background;
        scene.background = null;
        scene.add(nebe, kamera);
        try {
            kamera.update(renderer, scene);
        } finally {
            scene.remove(nebe, kamera);
            scene.background = pozadi;
            skryte.forEach(o => { o.visible = true; });
            nebe.geometry.dispose();
            nebe.material.dispose();
        }
        if (!generator) generator = new THREE.PMREMGenerator(renderer);
        const vysledek = generator.fromCubemap(rt.texture);
        rt.dispose();
        const stare = odrazy;
        odrazy = vysledek.texture;
        koren.traverse((o) => {
            for (const m of [].concat(o.material || [])) {
                if (!m.userData?.sklo) continue;
                if (!m.envMap) m.needsUpdate = true;
                m.envMap = odrazy;
            }
        });
        if (stare) stare.dispose();
        return odrazy;
    }

    /**
     * Nejnižší pohled kamery (maxPolarAngle): skoro vodorovně, ale tak, aby šikmý pohled pořád dopadl
     * na terén dřív než na to, co je pod ním (základy, sklep). `dum` a `teren` jsou Box3, `zeme` výška
     * podlahy 1.NP. Ortografická kamera nemá polohu oka, pohled zespodu by šel pod terén vždy.
     */
    function nejnizsiPohled(dum, teren, zeme) {
        const DOSAVADNI = Math.PI / 2.1;
        if (!dum || dum.isEmpty() || !teren || teren.isEmpty()) return DOSAVADNI;
        const hloubka = Math.max(0.3, (zeme ?? 0) - dum.min.y);
        const okraj = Math.min(dum.min.x - teren.min.x, teren.max.x - dum.max.x, dum.min.z - teren.min.z, teren.max.z - dum.max.z);
        if (!(okraj > 2)) return DOSAVADNI;
        const uhel = Math.atan(hloubka / okraj) + 0.005;
        return Math.min(Math.PI / 2 - 0.005, Math.max(DOSAVADNI, Math.PI / 2 - uhel));
    }

    // stav() a silaOmitky() jsou pro testy: omítka načtená (síla 1), zachycená mapa odrazů; měření
    // stínových vzorů na stěně potřebuje omítku vypnout, zrno by rozptyl jasu zvedlo samo
    window.Povrchy3d = {
        omitka, sklo, zachytOdrazy, nejnizsiPohled,
        stav: () => ({ omitka: omitkaUniformy.tuOmSila.value, odrazy }),
        silaOmitky: (sila) => { if (omitkaUniformy.tuOmKresba.value) omitkaUniformy.tuOmSila.value = sila; },
    };
})();
