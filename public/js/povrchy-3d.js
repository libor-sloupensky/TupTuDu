/**
 * Povrchy domu ve 3D blíž fotografii, společné pro editor a sdílený odkaz (modules/dum.md, část Fasáda a pohled).
 *
 * - omitka(m): fasádní omítka s jemným zrnem (Poly Haven white_stucco, CC0). Stěny nemají souřadnice
 *   textury, kresba se proto promítá podle polohy ve světě, u svislé plochy podél ní. Zrno má skutečnou
 *   velikost: zblízka je vidět, zdálky splyne. Průměr kresby je 1, material.color dál drží barvu ze vzorku.
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

    // stav() a silaOmitky() jsou pro testy: omítka načtená (síla 1); měření stínových vzorů na stěně
    // potřebuje omítku vypnout, zrno by rozptyl jasu zvedlo samo
    window.Povrchy3d = {
        omitka, nejnizsiPohled,
        stav: () => ({ omitka: omitkaUniformy.tuOmSila.value }),
        silaOmitky: (sila) => { if (omitkaUniformy.tuOmKresba.value) omitkaUniformy.tuOmSila.value = sila; },
    };
})();
