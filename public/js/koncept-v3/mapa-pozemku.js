/**
 * Výběr pozemku na mapě (Libor 12. 11. 2026): jeden postup pro všechny země.
 * Najdi místo, klikni na parcely, nebo pozemek obkresli tam, kde katastr nemáme.
 * Zdroj dat určuje server podle polohy (config/pozemky.php, App\Services\Pozemky), popis v modules/lokalizace.md.
 *
 * Leaflet (public/js/leaflet, 1.9.4) se načítá až při prvním otevření. Mapa a vrstvy Leafletu žijí
 * mimo Alpine (proměnné modulu), reaktivní proxy by je rozbila.
 */
(function () {
    // Stejné barvy jako parcela na plátně editoru (konva-renderer renderKatastr)
    const BARVA_VYBRANE = '#FF6600';
    const BARVA_PROJEKTU = '#FFD700';
    const ZOOM_PARCEL = 16;          // od tohoto přiblížení jde klikat na parcely
    const STREDY_ZEMI = {
        CZ: [49.8, 15.5, 7], SK: [48.7, 19.5, 7], PL: [52.0, 19.4, 6], DE: [51.1, 10.4, 6], AT: [47.6, 14.1, 7],
        FR: [46.6, 2.4, 6], ES: [40.2, -3.6, 6], IT: [42.8, 12.5, 6],
    };

    let mapa = null;
    let podklad = null;
    let vrstvaWms = null;
    let klicWms = null;
    let vrstvaVybranych = null;
    let vrstvaProjektu = null;
    let navrh = null;             // rozkreslený obrys: { body: [[lat, lon]], cara, znacky }
    let casovacInfo = null;
    let casovacHledani = null;
    let slibLeafletu = null;

    function nactiLeaflet() {
        if (window.L) return Promise.resolve();
        if (slibLeafletu) return slibLeafletu;
        slibLeafletu = new Promise((hotovo, chyba) => {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = '/js/leaflet/leaflet.css';
            document.head.appendChild(css);
            const s = document.createElement('script');
            s.src = '/js/leaflet/leaflet.js';
            s.onload = () => hotovo();
            s.onerror = () => { slibLeafletu = null; chyba(new Error('Leaflet se nenačetl')); };
            document.head.appendChild(s);
        });
        return slibLeafletu;
    }

    /** Plocha obrysu [[lat, lon]] v m² (místní rovina, na pozemek stačí). */
    function plocha(body) {
        if (body.length < 3) return 0;
        const lat0 = body.reduce((s, b) => s + b[0], 0) / body.length;
        const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 111320;
        let suma = 0;
        for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
            suma += (body[j][1] * kx) * (body[i][0] * ky) - (body[i][1] * kx) * (body[j][0] * ky);
        }
        return Math.abs(suma) / 2;
    }

    function stred(body) {
        const lats = body.map(b => b[0]), lons = body.map(b => b[1]);
        return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lon: (Math.min(...lons) + Math.max(...lons)) / 2 };
    }

    async function postJson(url, data) {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window._kkInitData.csrf, 'Accept': 'application/json' },
            body: JSON.stringify(data),
        });
        const d = await r.json().catch(() => null);
        if (!d) throw new Error('HTTP ' + r.status);
        return d;
    }

    window.KonceptMapaPozemku = {
        mapaPozemku: false,
        mapaRezim: 'parcely',        // parcely | obkreslit
        mapaPodklad: 'aerial',       // aerial | basic
        mapaVybrane: [],
        mapaInfo: null,
        mapaZoom: 0,
        mapaHledani: '',
        mapaNavrhy: [],
        mapaHlaska: '',
        mapaNacitani: false,
        mapaPridavani: false,
        mapaBodu: 0,

        async otevriMapuPozemku() {
            this.mapaPozemku = true;
            this.mapaVybrane = [];
            this.mapaHlaska = '';
            this.mapaNavrhy = [];
            this.mapaRezim = 'parcely';
            this.mapaBodu = 0;
            try {
                await nactiLeaflet();
            } catch (e) {
                this.mapaHlaska = preloz('ed_ui.mapa_nenactena');
                window.zalogujChybu?.(e, 'Mapa pozemku: načtení Leafletu');
                return;
            }
            await this.$nextTick();
            requestAnimationFrame(() => this._mapaVytvor());
        },

        zavriMapuPozemku() {
            this.mapaPozemku = false;
            this._mapaZrusNavrh();
            if (mapa) { mapa.remove(); mapa = null; }
            podklad = vrstvaWms = vrstvaVybranych = vrstvaProjektu = null;
            klicWms = null;
            clearTimeout(casovacInfo);
        },

        _mapaVytvor() {
            const el = document.querySelector('[data-mapa-pozemku]');
            if (!el || !window.L) return;
            if (mapa) { mapa.remove(); mapa = null; }
            mapa = L.map(el, { zoomControl: true, attributionControl: true, maxZoom: 20 });
            window.__kkMapaPozemku = mapa;   // pro UI test (test-mapa-pozemku-ui.cjs)
            mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
            this._mapaNastavPodklad();
            vrstvaProjektu = L.layerGroup().addTo(mapa);
            vrstvaVybranych = L.layerGroup().addTo(mapa);

            // Parcely, které projekt už má: žlutě, ať je vidět, k čemu se přidává
            const projekt = (this.katastrParcely || []).filter(p => p.polygon_wgs84?.length >= 3);
            projekt.forEach(p => L.polygon(p.polygon_wgs84, { color: BARVA_PROJEKTU, weight: 3, fillOpacity: 0.12, interactive: false }).addTo(vrstvaProjektu));
            if (projekt.length) {
                mapa.fitBounds(L.latLngBounds(projekt.flatMap(p => p.polygon_wgs84)), { maxZoom: 18, padding: [40, 40] });
            } else {
                const zeme = (window.TT_LOKALIZACE && TT_LOKALIZACE.zeme) || '';
                const [lat, lon, z] = STREDY_ZEMI[zeme] || [50, 10, 4];
                mapa.setView([lat, lon], z);
            }

            mapa.on('click', (e) => this._mapaKlik(e));
            mapa.on('moveend', () => {
                this.mapaZoom = mapa.getZoom();
                clearTimeout(casovacInfo);
                casovacInfo = setTimeout(() => this._mapaNactiInfo(), 350);
            });
            this.mapaZoom = mapa.getZoom();
            this._mapaNactiInfo();
        },

        mapaPrepniPodklad(typ) {
            this.mapaPodklad = typ;
            this._mapaNastavPodklad();
        },

        _mapaNastavPodklad() {
            if (!mapa) return;
            if (podklad) mapa.removeLayer(podklad);
            const klic = window._kkInitData.mapyczApiKey || '';
            podklad = L.tileLayer(`https://api.mapy.cz/v1/maptiles/${this.mapaPodklad}/256/{z}/{x}/{y}?apikey=${klic}`, {
                minZoom: 0, maxZoom: 20, maxNativeZoom: 19,
                attribution: '<a href="https://api.mapy.cz/copyright" target="_blank" rel="noopener">&copy; Seznam.cz a.s. a další</a>',
            }).addTo(mapa);
            podklad.bringToBack();
        },

        /** Co je v místě k dispozici (země, vrstva parcel, katastr, výšky). Ptá se server, hranice zná on. */
        async _mapaNactiInfo() {
            if (!mapa || mapa.getZoom() < 12) {
                this.mapaInfo = null;
                this._mapaNastavWms(null);
                return;
            }
            const c = mapa.getCenter();
            try {
                const d = await postJson(window._kkInitData.routes.katastrInfo, { lat: c.lat, lon: c.lng });
                if (!d.ok) return;
                this.mapaInfo = d;
                this._mapaNastavWms(d);
            } catch (e) {
                window.zalogujChybu?.(e, 'Mapa pozemku: informace o místě', { lat: c.lat, lon: c.lng });
            }
        },

        _mapaNastavWms(info) {
            const w = info?.wms;
            const klic = w ? w.url + '|' + w.vrstvy : null;
            if (klic === klicWms) return;
            if (vrstvaWms) { mapa.removeLayer(vrstvaWms); vrstvaWms = null; }
            klicWms = klic;
            if (!w) return;
            const volby = {
                layers: w.vrstvy, format: 'image/png', transparent: true, version: w.verze || '1.3.0',
                minZoom: w.od_zoomu || ZOOM_PARCEL, maxZoom: 20, opacity: 0.85,
                attribution: info.atribuce || '',
            };
            // Itálie umí jen zeměpisné souřadnice ETRS89 (EPSG:4258), WMS 1.1.1 bere pořadí lon lat
            if (w.crs && w.crs !== 'EPSG:3857') volby.crs = L.extend({}, L.CRS.EPSG4326, { code: w.crs });
            // Slovensko zakazuje své obrázky na cizích stránkách (Cross-Origin-Resource-Policy): přes náš server
            const url = w.proxy ? window._kkInitData.routes.katastrDlazdice.replace(':zeme', info.zeme) : w.url;
            vrstvaWms = L.tileLayer.wms(url, volby).addTo(mapa);
        },

        async _mapaKlik(e) {
            if (this.mapaRezim === 'obkreslit') { this._mapaPridejBod(e.latlng); return; }
            this.mapaHlaska = '';
            const lat = e.latlng.lat, lon = e.latlng.lng;
            // Klik do vybrané parcely ji odebere
            const i = this.mapaVybrane.findIndex(p => this._bodVPolygonu(lat, lon, p.polygon_wgs84));
            if (i >= 0) { this.mapaOdeber(i); return; }
            if (mapa.getZoom() < ZOOM_PARCEL) { this.mapaHlaska = preloz('ed_ui.mapa_priblizit'); return; }
            if (this.mapaNacitani) return;
            this.mapaNacitani = true;
            try {
                const d = await postJson(window._kkInitData.routes.katastrBod, { lat, lon });
                if (!d.ok || !d.parcela) {
                    this.mapaHlaska = d.error || preloz('ed_ui.parcela_nenactena');
                } else if (this.mapaVybrane.some(p => p.id === d.parcela.id) || (this.katastrParcely || []).some(p => p.id && p.id === d.parcela.id)) {
                    this.mapaHlaska = preloz('ed_ui.parcela_duplicita');
                } else {
                    this.mapaVybrane.push(d.parcela);
                    this._mapaKresliVybrane();
                }
            } catch (err) {
                this.mapaHlaska = preloz('ed_ui.parcela_nenactena');
                window.zalogujChybu?.(err, 'Mapa pozemku: parcela v bodě', { lat, lon });
            }
            this.mapaNacitani = false;
        },

        _bodVPolygonu(lat, lon, poly) {
            let uvnitr = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const [yi, xi] = poly[i], [yj, xj] = poly[j];
                if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi)) uvnitr = !uvnitr;
            }
            return uvnitr;
        },

        _mapaKresliVybrane() {
            if (!vrstvaVybranych) return;
            vrstvaVybranych.clearLayers();
            this.mapaVybrane.forEach(p => {
                L.polygon(p.polygon_wgs84, { color: BARVA_VYBRANE, weight: 3, fillOpacity: 0.2, interactive: false })
                    .bindTooltip(p.cislo, { permanent: true, direction: 'center', className: 'kk-mapa-stitek' })
                    .addTo(vrstvaVybranych);
            });
        },

        mapaOdeber(i) {
            this.mapaVybrane.splice(i, 1);
            this._mapaKresliVybrane();
        },

        // ── Obkreslení pozemku (země bez katastru, nebo pozemek jinak než podle parcel) ──
        mapaObkreslit() {
            this.mapaRezim = this.mapaRezim === 'obkreslit' ? 'parcely' : 'obkreslit';
            this._mapaZrusNavrh();
            this.mapaHlaska = '';
            if (mapa) {
                if (this.mapaRezim === 'obkreslit') mapa.doubleClickZoom.disable();
                else mapa.doubleClickZoom.enable();
                mapa.getContainer().style.cursor = this.mapaRezim === 'obkreslit' ? 'crosshair' : '';
            }
        },

        _mapaPridejBod(latlng) {
            if (!navrh) navrh = { body: [], cara: L.polyline([], { color: BARVA_VYBRANE, weight: 3, dashArray: '6 4' }).addTo(mapa), znacky: [] };
            // Klik na první bod obrys uzavře
            if (navrh.body.length >= 3) {
                const prvni = mapa.latLngToContainerPoint(navrh.body[0]);
                if (prvni.distanceTo(mapa.latLngToContainerPoint(latlng)) < 12) { this.mapaDokonciObrys(); return; }
            }
            navrh.body.push([latlng.lat, latlng.lng]);
            navrh.cara.setLatLngs(navrh.body);
            navrh.znacky.push(L.circleMarker(latlng, { radius: navrh.body.length === 1 ? 6 : 4, color: BARVA_VYBRANE, fillOpacity: 1, interactive: false }).addTo(mapa));
            this.mapaBodu = navrh.body.length;
        },

        mapaZpetBod() {
            if (!navrh || !navrh.body.length) return;
            navrh.body.pop();
            mapa.removeLayer(navrh.znacky.pop());
            navrh.cara.setLatLngs(navrh.body);
            this.mapaBodu = navrh.body.length;
        },

        mapaDokonciObrys() {
            if (!navrh || navrh.body.length < 3) return;
            const body = navrh.body.map(b => [Math.round(b[0] * 1e7) / 1e7, Math.round(b[1] * 1e7) / 1e7]);
            const rucnich = this.mapaVybrane.filter(p => p.rucni).length + (this.katastrParcely || []).filter(p => p.rucni).length;
            const nazev = preloz('ed_ui.pozemek_rucni') + (rucnich ? ' ' + (rucnich + 1) : '');
            this.mapaVybrane.push({
                zeme: this.mapaInfo?.zeme || (window.TT_LOKALIZACE && TT_LOKALIZACE.zeme) || null,
                id: 'rucne-' + Date.now(),
                cislo: nazev,
                label: nazev,
                typ: null,
                rucni: true,
                polygon_wgs84: body,
                centroid_wgs84: stred(body),
                vymera: Math.round(plocha(body)),
                vymera_vypoctena: true,
            });
            this._mapaZrusNavrh();
            this._mapaKresliVybrane();
            this.mapaObkreslit();   // zpět do výběru parcel
        },

        _mapaZrusNavrh() {
            if (navrh && mapa) {
                mapa.removeLayer(navrh.cara);
                navrh.znacky.forEach(z => mapa.removeLayer(z));
            }
            navrh = null;
            this.mapaBodu = 0;
        },

        // ── Hledání místa (Mapy.com, celá Evropa) ──
        mapaHledej() {
            clearTimeout(casovacHledani);
            const q = this.mapaHledani.trim();
            if (q.length < 3) { this.mapaNavrhy = []; return; }
            casovacHledani = setTimeout(async () => {
                try {
                    const jazyk = document.documentElement.lang || 'cs';
                    const url = 'https://api.mapy.cz/v1/suggest?' + new URLSearchParams({ query: q, lang: jazyk, limit: '6', apikey: window._kkInitData.mapyczApiKey || '' });
                    const r = await fetch(url);
                    const d = await r.json();
                    this.mapaNavrhy = (d.items || []).filter(n => n.position).map(n => ({
                        nazev: n.name, misto: n.location || '', lat: n.position.lat, lon: n.position.lon, bbox: n.bbox || null,
                    }));
                } catch (e) {
                    this.mapaNavrhy = [];
                    window.zalogujChybu?.(e, 'Mapa pozemku: hledání místa', { dotaz: q });
                }
            }, 300);
        },

        mapaVyberNavrh(n) {
            this.mapaNavrhy = [];
            this.mapaHledani = n.nazev + (n.misto ? ', ' + n.misto : '');
            if (!mapa) return;
            if (n.bbox && n.bbox.length === 4 && (n.bbox[2] - n.bbox[0]) > 0.002) {
                mapa.fitBounds([[n.bbox[1], n.bbox[0]], [n.bbox[3], n.bbox[2]]], { maxZoom: 18 });
            } else {
                mapa.setView([n.lat, n.lon], 18);
            }
        },

        /** Přidá vybrané parcely do projektu stejnou cestou jako hledání podle čísla. */
        async mapaPotvrd() {
            if (!this.mapaVybrane.length || this.mapaPridavani) return;
            this.mapaPridavani = true;
            this.mapaHlaska = '';
            // Nejdřív parcely sousedící s projektem, aby prošla kontrola sousednosti
            const fronta = [...this.mapaVybrane];
            let pridano = 0;
            for (let kolo = 0; kolo < fronta.length && fronta.length; kolo++) {
                for (let i = 0; i < fronta.length; i++) {
                    const ok = await this._katastrPridejParcelu(fronta[i], { tise: true });
                    if (ok) { fronta.splice(i, 1); i--; pridano++; }
                }
            }
            this.mapaPridavani = false;
            if (fronta.length) {
                this.mapaVybrane = fronta;
                this._mapaKresliVybrane();
                this.mapaHlaska = this.katastrChyba || preloz('ed_ui.parcela_nesousedi');
                this.katastrChyba = '';
                return;
            }
            this.zavriMapuPozemku();
        },
    };
})();
