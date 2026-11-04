/**
 * Světlo a barvy 3D scény, společné pro editor a sdílený odkaz (modules/dum.md, část Světlo).
 *
 * Barvy materiálů a vrcholů zůstávají v hodnotách ze vzorku: material.color je přesně to, co si
 * uživatel vybral. Na lineární je převádí až shader, proto výběr barvy, sdílení ani testy
 * o převodu nic nevědí. Model z glTF má ale barvy lineární, po načtení mu je převeď přes
 * convertLinearToSRGB. Textury s barvou potřebují encoding = sRGBEncoding, GLTFLoader ho dává sám.
 */
(function () {
    const THREE = window.THREE;
    if (!THREE) return;

    // Prostředí a slunce dávají vodorovné ploše na slunci zhruba 1,05× barvy ze vzorku a stěnám
    // 0,75–0,95×, měří to test-svetlo-3d-ui. Slunce je odpolední z jihozápadu: +z je v editoru jih,
    // výchozí kamera se dívá z jihovýchodu, takže jižní stěna svítí, východní je ve stínu a stín domu je vidět.
    const NEBE = [0.66, 0.68, 0.71];
    const OBZOR = [0.58, 0.58, 0.57];
    const ZEM = [0.44, 0.43, 0.41];
    const SLUNCE_BARVA = 0xfff6ea;
    const SLUNCE_SILA = 0.52;
    const SMER_SLUNCE = new THREE.Vector3(-7, 14, 11).normalize();

    THREE.ShaderChunk.common += `
vec3 tuVzorekNaLin( vec3 c ) { return mix( c / 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, c ) ); }
`;
    for (const shader of Object.values(THREE.ShaderLib)) {
        shader.fragmentShader = shader.fragmentShader.replace(
            /vec4 diffuseColor = vec4\( diffuse, (opacity|alpha) \);/,
            'vec4 diffuseColor = vec4( tuVzorekNaLin( diffuse ), $1 );'
        );
    }
    THREE.ShaderChunk.color_fragment = THREE.ShaderChunk.color_fragment.replace(
        'diffuseColor.rgb *= vColor;', 'diffuseColor.rgb *= tuVzorekNaLin( vColor );'
    );
    // Do 0,85 (na obrazovce asi 0,93) se nic nemění, barva sedí se vzorkem. Výš se světlo měkce stlačuje, ať se bílá nepřepálí.
    THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
        'vec3 CustomToneMapping( vec3 color ) { return color; }',
        `vec3 CustomToneMapping( vec3 color ) {
    const float a = 0.85;
    vec3 nad = max( color - a, vec3( 0.0 ) ) / ( 1.0 - a );
    return min( color, vec3( a ) ) + ( 1.0 - a ) * ( 1.0 - exp( -nad ) );
}`
    );

    // Matný nekovový povrch odráží prostředí jen málo. Plný odraz by mu přidal závoj a barva by proti vzorku vybledla.
    THREE.ShaderChunk.lights_physical_pars_fragment = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
        'vec3 diffuse = material.diffuseColor * ( 1.0 - ( singleScattering + multiScattering ) );',
        `float tuOdraz = mix( mix( 1.0, 0.1, smoothstep( 0.35, 0.8, material.specularRoughness ) ), 1.0, smoothstep( 0.04, 0.2, max( max( material.specularColor.r, material.specularColor.g ), material.specularColor.b ) ) );
    singleScattering *= tuOdraz;
    multiScattering *= tuOdraz;
    vec3 diffuse = material.diffuseColor * ( 1.0 - ( singleScattering + multiScattering ) );`
    );

    /** Obloha s obzorem a zemí jako zdroj měkkého světla a odrazů. Nic se nestahuje, barvy jsou neutrální. */
    function prostredi(renderer) {
        const scena = new THREE.Scene();
        const koule = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            uniforms: {
                nebe: { value: new THREE.Vector3(...NEBE) },
                obzor: { value: new THREE.Vector3(...OBZOR) },
                zem: { value: new THREE.Vector3(...ZEM) },
            },
            vertexShader: 'varying vec3 vSmer; void main() { vSmer = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
            fragmentShader: `varying vec3 vSmer; uniform vec3 nebe; uniform vec3 obzor; uniform vec3 zem;
void main() {
    float v = normalize( vSmer ).y;
    vec3 c = v > 0.0 ? mix( obzor, nebe, smoothstep( 0.0, 0.5, v ) ) : mix( obzor, zem, smoothstep( 0.0, 0.15, -v ) );
    gl_FragColor = vec4( c, 1.0 );
    #include <encodings_fragment>
}`,
        }));
        scena.add(koule);
        const generator = new THREE.PMREMGenerator(renderer);
        const textura = generator.fromScene(scena).texture;
        generator.dispose();
        koule.geometry.dispose();
        koule.material.dispose();
        return textura;
    }

    window.Svetlo3d = {
        /** Nastaví renderer a scénu, vrátí slunce. Stíny se přepočítávají jen po změně scény (prekresliStiny). */
        nastav(renderer, scene) {
            renderer.outputEncoding = THREE.sRGBEncoding;
            renderer.toneMapping = THREE.CustomToneMapping;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFShadowMap;
            renderer.shadowMap.autoUpdate = false;
            scene.environment = prostredi(renderer);

            const slunce = new THREE.DirectionalLight(SLUNCE_BARVA, SLUNCE_SILA);
            slunce.castShadow = true;
            const dotyk = (window.navigator?.maxTouchPoints || 0) > 0;
            const mapa = Math.min(dotyk ? 2048 : 4096, renderer.capabilities.maxTextureSize);
            slunce.shadow.mapSize.set(mapa, mapa);
            slunce.shadow.bias = -0.0004;
            slunce.shadow.normalBias = 0.03;
            slunce.shadow.radius = 2.5;
            scene.add(slunce, slunce.target);
            return slunce;
        },

        /** Nastaví objektům stín podle materiálu: průhledné a neosvětlované stín nevrhají. */
        stinyObjektu(koren) {
            koren.traverse((o) => {
                if (!o.isMesh) return;
                const materialy = [].concat(o.material);
                o.receiveShadow = materialy.some(m => m.isMeshStandardMaterial);
                o.castShadow = materialy.every(m => m.isMeshStandardMaterial && !m.transparent);
            });
        },

        /** Natočí stínovou kameru na objekt nebo obal (Box3), stín dopadne i kolem něj. */
        usadSlunce(slunce, kde) {
            const obal = kde.isBox3 ? kde : new THREE.Box3().setFromObject(kde);
            if (obal.isEmpty()) return;
            const stred = obal.getCenter(new THREE.Vector3());
            const velikost = obal.getSize(new THREE.Vector3());
            const r = velikost.length() / 2 + velikost.y + 2;
            slunce.target.position.copy(stred);
            slunce.position.copy(stred).addScaledVector(SMER_SLUNCE, r * 2);
            slunce.target.updateMatrixWorld();
            slunce.updateMatrixWorld();
            const k = slunce.shadow.camera;
            k.left = -r; k.right = r; k.top = r; k.bottom = -r;
            k.near = 0.1; k.far = r * 4;
            k.updateProjectionMatrix();
        },

        prekresliStiny(renderer) {
            renderer.shadowMap.needsUpdate = true;
        },
    };
})();
