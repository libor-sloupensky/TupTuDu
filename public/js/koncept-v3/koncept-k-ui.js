/**
 * Koncept K — Alpine.js UI controller
 * Deleguje na StavebníEngine (data) a KonvaRenderer (zobrazení).
 */
function konceptKEditor(initialData) {
    // Obnovit uložený stav (vše na jednom místě)
    const _s = JSON.parse(localStorage.getItem('kv3_state') || '{}');
    return {
        // ─── Projekt ────────────────────────────────────────────
        projektId: initialData.projektId,
        projektNazev: initialData.projektNazev,
        koncepty: initialData.koncepty || [],   // seznam do nabídky (reaktivní)
        projektData: initialData.projektData,
        verze: initialData.verze,
        faze: initialData.faze,
        metadata: initialData.metadata,
        chat: initialData.chat,
        // Historie = časová osa kroků, každý krok je stav PO akci (i s polohou
        // podkladu). Ctrl+Z / Ctrl+Shift+Z i klik v panelu jen posouvají
        // `historiePozice`; nová úprava zahodí kroky za ní (jako v grafických
        // editorech). Server drží totéž, ukazatel přežije i obnovení stránky.
        historie: (initialData.historie || []).filter(k => k && k.id),
        historiePozice: -1,
        _stavKroku: null,          // toJSON() kresby na aktuálním kroku — co je „beze změny“
        _neodeslaneKroky: [],      // id kroků, které server ještě nemá

        // ─── UI stav (obnoveno z kk_state) ──────────────────────
        nastroj: _s.nastroj || 'vyber',
        // nástroj Otvor — typ a šířka se drží mezi kliky i mezi sezeními
        // Lišta nabízí jen dveře a okno; „průchod" z dřívějška spadne na dveře
        otvorTyp: ['dvere', 'okno'].includes(_s.otvorTyp) ? _s.otvorTyp : 'dvere',
        otvorSirka: _s.otvorSirka || 0.9,
        otvorZprava: '',            // krátká hláška u nástroje Otvor
        _otvorCasovac: null,
        // Fullscreen je záměrně transient — při novém načtení stránky
        // začínáme vždy v klasickém zobrazení (nepokračujeme v fullscreenu
        // z minulého sezení). Stav se nepersistuje do kk_state.
        celaObrazovka: false,
        aiVstup: '',
        aiNacitani: false,
        aiModel: _s.aiModel || 'claude-sonnet-4-6',
        napovedaOtevrena: false,
        // uložené 2/3 (dřívější rozložení nahoře/dole) se sklopí na vlevo/vpravo
        layoutMode: (_s.layoutMode ?? 0) % 2,
        splitPct: _s.splitPct ?? 60,
        editorHeight: Math.max(400, window.innerHeight - 80),
        zoom: _s.zoom ?? 1,
        kurzorX: 0,
        kurzorY: 0,

        // Měřítko — dynamické dle zoomu
        get meritkoText() {
            const scale = this.stage ? this.stage.scaleX() : 1;
            const mPerPx = 1 / (this.PX_PER_M * scale);
            const targetPx = 100; // cílová šířka měřítka v px
            const realM = targetPx * mPerPx;
            // Zaokrouhlit na hezké číslo
            const nice = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
            const best = nice.reduce((a, b) => Math.abs(b - realM) < Math.abs(a - realM) ? b : a);
            return best >= 1 ? best + ' m' : (best * 100) + ' cm';
        },
        get meritkoPx() {
            const scale = this.stage ? this.stage.scaleX() : 1;
            const mPerPx = 1 / (this.PX_PER_M * scale);
            const targetPx = 100;
            const realM = targetPx * mPerPx;
            const nice = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
            const best = nice.reduce((a, b) => Math.abs(b - realM) < Math.abs(a - realM) ? b : a);
            return Math.round(best / mPerPx);
        },
        showObjekty: _s.showObjekty ?? true,
        // spaceDown odstraněn — mezerník se nepoužívá pro posun
        showKoty: _s.showKoty ?? true,
        showNodes: _s.showNodes ?? true,
        showGrid: _s.showGrid ?? true,
        showMistnosti: _s.showMistnosti ?? true,
        showVybaveni: _s.showVybaveni ?? true,
        rezim3d: _s.rezim3d || false,
        // Three.js objekty jsou MIMO Alpine (proxy konflikt s modelViewMatrix)
        // Uloženy v window._kk3d
        // Výchozí parametry kreslené stěny (lišta u nástroje „Kreslit stěnu")
        stenaTyp: _s.stenaTyp || 'obvodova',
        tloustkaSteny: _s.tloustkaSteny || 0.3,
        panelOpen: JSON.parse(localStorage.getItem('kv3_panelOpen') || '{"objekty":false,"parcela":false,"historie":false,"chat":true}'),

        // ─── Engine + Renderer ──────────────────────────────────
        engine: null,
        renderer: null,
        stage: null,
        PX_PER_M: 80,

        // ─── Kreslení ───────────────────────────────────────────
        kreslimStenu: false,
        stenaStart: null,
        stenaUseky: [],   // úseky nakreslené v rozdělaném tahu — pro Esc (zpět po bodech)
        _stenaUsekId: null,       // rozkreslený úsek (táhne se s kurzorem)
        _stenaPreskocKlik: false, // klik, kterým se úsek dokončil

        // ─── Dragging ───────────────────────────────────────────
        isPanning: false,
        panStart: null,
        stageStartPos: null,
        isDraggingNode: false,
        draggingNodeId: null,
        clipboard: null, // {walls: [...], openings: [...]}
        pasteCount: 0, // pro kumulativní offset

        // ─── Katastr ─────────────────────────────────────────
        katastrKuHledani: '',
        katastrKuVysledky: [],
        katastrKuNabidk: false,
        katastrVybraneKu: null,
        katastrCislo: '',
        katastrTyp: 'auto',
        katastrNacitani: false,
        katastrChyba: '',
        katastrParcely: [],
        katastrNacitaniProfil: false,
        katastrProfil: null,
        katastrZobrazitParcely: _s.showParcely ?? true,
        katastrZobrazitStavby: _s.showStavby ?? true,
        katastrZobrazitSousedy: _s.showSousedy ?? true,
        katastrZobrazitVysky: _s.showVysky ?? false,
        vyskovyProfil: null,
        katastrMapaPodklad: _s.mapaPodklad || 'zadny',
        kompasUhel: _s.kompasUhel ?? 0,
        _katastrData: null,
        _katastrOkolni: null,
        _katastrDruhCz: {
            'ArableGround': 'Orná půda', 'Grassland': 'Trvalý travní porost', 'Garden': 'Zahrada',
            'Orchard': 'Ovocný sad', 'Forest': 'Lesní pozemek', 'WaterArea': 'Vodní plocha',
            'BuiltUpArea': 'Zastavěná plocha', 'OtherArea': 'Ostatní plocha',
        },

        // ─── Zvýrazňovač ──────────────────────────────────────
        zvyrazneniBody: [], // [{points: [x1,y1,x2,y2,...], id}]
        _zvyrazKresba: null, // aktuální tah
        _zvyrazLastPt: null, // pro Shift+click rovné čáry
        _zvyrazNextId: 1,

        isDraggingWall: false,
        draggingWallId: null,
        dragWallStart: null,
        isDraggingOpening: false,
        draggingOpeningId: null,
        isDraggingVybaveni: false,
        draggingVybaveniId: null,
        dragVybaveniStart: null,
        _pendingDrag: null,
        _dragRealOrigin: null, // počáteční pozice myši po aktivaci dragu — pro detekci „drag, ale ve skutečnosti jen klik" (krátký nezamýšlený pohyb)
        selectionStart: null,
        spaceDown: false,
        dragging: false, // divider

        // ─── Computed ───────────────────────────────────────────
        // rozložení je jen vlevo/vpravo (0 = grafika vlevo, 1 = grafika vpravo)
        get vertikalni() { return false; },
        get obracene() { return this.layoutMode === 1; },
        get gridStyle() {
            const g = this.splitPct, t = 100 - g;
            const first = this.obracene ? t : g;
            const third = this.obracene ? g : t;
            if (this.vertikalni) return 'display:grid;grid-template-rows:' + first + 'fr 10px ' + third + 'fr;grid-template-columns:1fr';
            return 'display:grid;grid-template-columns:' + first + 'fr 10px ' + third + 'fr;grid-template-rows:1fr';
        },
        get layoutTip() {
            return this.layoutMode === 0 ? 'Text vlevo, grafika vpravo' : 'Grafika vlevo, text vpravo';
        },
        get seznamObjektu() {
            return this.engine ? this.engine.getObjectList() : [];
        },
        get vybraneIds() {
            return this.renderer ? [...this.renderer.selectedWalls, ...this.renderer.selectedNodes, ...this.renderer.selectedOpenings] : [];
        },

        // Alpine reactivity trigger — bumpuje se po každém render(), aby gettery
        // závislé na selekci (inspector) re-evaluovaly.
        _selectionTick: 0,

        /**
         * Inspector data — null nebo objekt popisující co se dá editovat.
         * kind: 'opening' | 'opening_multi' | 'wall' | 'wall_multi' | null
         */
        get inspector() {
            // Dummy read, aby Alpine věděl o závislosti na tiku
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            if (!this.renderer || !this.engine) return null;
            const sw = this.renderer.selectedWalls;
            const so = this.renderer.selectedOpenings;
            const sn = this.renderer.selectedNodes;
            if (sn.size > 0) return null;
            // Jen otvory
            if (so.size > 0 && sw.size === 0) {
                const openings = [...so].map(id => this.engine.openings.get(id)).filter(Boolean);
                if (openings.length === 0) return null;
                const typ0 = openings[0].typ;
                const sameTyp = openings.every(o => o.typ === typ0);
                const sameSirka = openings.every(o => Math.abs(o.sirka - openings[0].sirka) < 0.001);
                const sameSmer = openings.every(o => (o.smer || null) === (openings[0].smer || null));
                const sameStrana = openings.every(o => (o.strana || 'in') === (openings[0].strana || 'in'));
                const cfg = TYPY_OTVORU[typ0];
                // Směr otvírání — jen pro typy s dveřmi (ne okno)
                const hasDoor = typ0 && (typ0 === 'dvere' || typ0 === 'francouzske_okno' || typ0 === 'garazova_vrata' || typ0 === 'pruchod');
                const smeryVolby = hasDoor ? [
                    { key: 'pravy', label: 'Pravé' },
                    { key: 'levy', label: 'Levé' },
                    { key: 'posuvne', label: 'Posuvné' },
                    { key: 'otvor', label: 'Otvor (bez křídla)' },
                ] : [];
                const smerAktual = sameSmer ? (openings[0].smer || null) : null;
                return {
                    kind: openings.length > 1 ? 'opening_multi' : 'opening',
                    count: openings.length,
                    typ: sameTyp ? typ0 : null,
                    typLabel: sameTyp && cfg ? cfg.nazev : 'Různé typy',
                    sirka: sameSirka ? openings[0].sirka : null,
                    sirky: sameTyp && cfg ? cfg.standardSirky : [],
                    hasDoor,
                    smer: smerAktual,
                    smeryVolby,
                    strana: sameStrana ? (openings[0].strana || 'in') : null,
                    canFlipStrana: hasDoor && (smerAktual === 'levy' || smerAktual === 'pravy' || smerAktual === 'posuvne'),
                };
            }
            // Jen stěny
            if (sw.size > 0 && so.size === 0) {
                const walls = [...sw].map(id => this.engine.walls.get(id)).filter(Boolean);
                if (walls.length === 0) return null;
                const typ0 = walls[0].typ;
                const sameTyp = walls.every(w => w.typ === typ0);
                const sameTl = walls.every(w => Math.abs(w.tloustka - walls[0].tloustka) < 0.001);
                const cfg = TYPY_STEN[typ0];
                // Nabízené typy — pouze konstrukční (exterior jako plot/zídka řešíme jinde)
                const typyVolby = ['obvodova', 'nosna', 'pricka'].map(k => ({ key: k, label: TYPY_STEN[k].nazev }));
                return {
                    kind: walls.length > 1 ? 'wall_multi' : 'wall',
                    count: walls.length,
                    typ: sameTyp ? typ0 : null,
                    typLabel: sameTyp && cfg ? cfg.nazev : 'Různé typy',
                    typyVolby,
                    tloustka: sameTl ? walls[0].tloustka : null,
                    tloustky: sameTyp && cfg ? cfg.standardTloustky : [],
                };
            }
            return null;
        },

        /** Screen pozice inspector panelu (relativní ke kk-canvas-wrap). */
        get inspectorPos() {
            // Dummy tick read pro reaktivitu
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            if (!this.renderer || !this.stage || !this.inspector) return null;
            // Bbox výběru v canvas souřadnicích
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const push = (x, y) => {
                if (x < minX) minX = x; if (y < minY) minY = y;
                if (x > maxX) maxX = x; if (y > maxY) maxY = y;
            };
            for (const wId of this.renderer.selectedWalls) {
                const w = this.engine.walls.get(wId);
                if (!w) continue;
                const a = this.engine.nodes.get(w.nodeA);
                const b = this.engine.nodes.get(w.nodeB);
                if (a) push(a.x, a.y);
                if (b) push(b.x, b.y);
            }
            for (const oId of this.renderer.selectedOpenings) {
                const o = this.engine.openings.get(oId);
                if (!o) continue;
                const w = this.engine.walls.get(o.wallId);
                if (!w) continue;
                const a = this.engine.nodes.get(w.nodeA);
                const b = this.engine.nodes.get(w.nodeB);
                if (!a || !b) continue;
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                if (L === 0) continue;
                const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
                const start = { x: a.x + ux * o.pozice * this.PX_PER_M, y: a.y + uy * o.pozice * this.PX_PER_M };
                const end = { x: a.x + ux * (o.pozice + o.sirka) * this.PX_PER_M, y: a.y + uy * (o.pozice + o.sirka) * this.PX_PER_M };
                push(start.x, start.y); push(end.x, end.y);
            }
            if (!isFinite(minX)) return null;
            const tCx = (minX + maxX) / 2;
            const topScreen = this.stage.getAbsoluteTransform().point({ x: tCx, y: minY });
            const botScreen = this.stage.getAbsoluteTransform().point({ x: tCx, y: maxY });
            // Nad bbox top. Pokud by šel nad obrazovku, přesunout pod bbox.
            let y = topScreen.y - 55;
            if (y < 6) y = Math.min(botScreen.y + 20, this.stage.height() - 40);
            // Horizontální clamp aby panel nevyjel ze stránky
            let x = topScreen.x;
            const margin = 100;
            if (x < margin) x = margin;
            if (x > this.stage.width() - margin) x = this.stage.width() - margin;
            return { x: Math.round(x), y: Math.round(y) };
        },

        /** Aplikuje směr otvírání (pravy/levy/litaci/posuvne/otvor) na vybrané otvory. */
        setOpeningSmer(novySmer) {
            if (!this.renderer || !this.engine) return;
            const ids = [...this.renderer.selectedOpenings];
            if (ids.length === 0) return;
            this.engine.pushUndo();
            for (const id of ids) {
                const o = this.engine.openings.get(id);
                if (!o) continue;
                o.smer = novySmer;
            }
            this.renderer.render();
            this.autoSave('Směr otvírání');
            this._selectionTick++;
        },

        /** Převrátí stranu zdi (in/out) na vybraných otvorech — smysl jen pro levé/pravé. */
        flipOpeningStrana() {
            if (!this.renderer || !this.engine) return;
            const ids = [...this.renderer.selectedOpenings];
            if (ids.length === 0) return;
            this.engine.pushUndo();
            for (const id of ids) {
                const o = this.engine.openings.get(id);
                if (!o) continue;
                if (o.smer !== 'levy' && o.smer !== 'pravy' && o.smer !== 'posuvne') continue;
                o.strana = (o.strana === 'out') ? 'in' : 'out';
            }
            this.renderer.render();
            this.autoSave('Otočit dveře');
            this._selectionTick++;
        },

        /**
         * Aplikuje šířku na vybrané otvory.
         *
         * Zadané číslo se bere doslova — okna mají spoustu atypických rozměrů
         * (230, 175…) a přichytávání na normovou řadu je tiše měnilo.
         * Otvor se zkracuje i prodlužuje na obě strany, takže jeho STŘED
         * zůstane na místě; jinak by se při každé změně posunul.
         */
        setOpeningSirka(novaSirka) {
            if (!this.renderer || !this.engine) return;
            const ids = [...this.renderer.selectedOpenings];
            if (ids.length === 0) return;
            this.engine.pushUndo();
            for (const id of ids) {
                const o = this.engine.openings.get(id);
                if (!o) continue;
                const pozadovana = Math.max(0.05, novaSirka);
                const stred = o.pozice + o.sirka / 2;

                const w = this.engine.walls.get(o.wallId);
                let delkaSteny = null;
                if (w) {
                    const nA = this.engine.nodes.get(w.nodeA);
                    const nB = this.engine.nodes.get(w.nodeB);
                    if (nA && nB) delkaSteny = Math.hypot(nB.x - nA.x, nB.y - nA.y) / this.PX_PER_M;
                }

                o.sirka = delkaSteny !== null ? Math.min(pozadovana, delkaSteny) : pozadovana;
                if (delkaSteny !== null) {
                    o.pozice = Math.max(0, Math.min(delkaSteny - o.sirka, stred - o.sirka / 2));
                } else {
                    o.pozice = Math.max(0, stred - o.sirka / 2);
                }
            }
            this.renderer.render();
            this.autoSave('Šířka otvoru');
            this._selectionTick++;
        },

        /** Aplikuje typ na všechny vybrané stěny. Pokud se typ změní, snap tloušťky do nového rozsahu. */
        setWallTyp(novyTyp) {
            if (!this.renderer || !this.engine) return;
            if (!TYPY_STEN[novyTyp]) return;
            const ids = [...this.renderer.selectedWalls];
            if (ids.length === 0) return;
            this.engine.pushUndo();
            for (const id of ids) {
                const w = this.engine.walls.get(id);
                if (!w) continue;
                if (w.typ === novyTyp) continue;
                w.typ = novyTyp;
                // Snap tloušťky do rozsahu nového typu (např. nosna 30cm → pricka → snap na 19cm)
                w.tloustka = snapWallTloustka(w.tloustka, novyTyp);
            }
            this.renderer.render();
            this.autoSave('Typ stěny');
            this._selectionTick++;
        },

        /** Aplikuje tloušťku na všechny vybrané stěny (se snap na standard). */
        /**
         * @param {boolean} presna  true = vzít zadanou hodnotu beze změny.
         *        Z ručně psaného pole, kde by přichytávání na normovou řadu
         *        přepisovalo, co uživatel napsal (stejně jako u šířky okna).
         */
        setWallTloustka(novaTloustka, presna = false) {
            if (!this.renderer || !this.engine) return;
            if (!(novaTloustka > 0)) return;
            const ids = [...this.renderer.selectedWalls];
            if (ids.length === 0) return;
            this.engine.pushUndo();
            for (const id of ids) {
                const w = this.engine.walls.get(id);
                if (!w) continue;
                w.tloustka = presna
                    ? Math.min(1, Math.max(0.02, novaTloustka))
                    : snapWallTloustka(novaTloustka, w.typ);
            }
            this.renderer.render();
            this.autoSave('Tloušťka stěny');
            this._selectionTick++;
        },

        // ═══════════════════════════════════════════════════════
        // DRAG HELPERS — pure funkce pro drag logic
        // ═══════════════════════════════════════════════════════

        /**
         * Vrátí host osu (ha, hb, dx, dy, L, L2, perpU) pro constraint/wall host.
         * Používáno všemi slide/projection výpočty.
         */
        _dragHostAxis(hostId) {
            const h = this.engine.walls.get(hostId);
            if (!h) return null;
            const a = this.engine.nodes.get(h.nodeA);
            const b = this.engine.nodes.get(h.nodeB);
            if (!a || !b) return null;
            const dx = b.x - a.x, dy = b.y - a.y;
            const L = Math.hypot(dx, dy);
            if (L === 0) return null;
            return { a, b, dx, dy, L, L2: L * L, perpUx: -dy / L, perpUy: dx / L };
        },

        /** Projekce (dx, dy) na zadanou osu (axisDx, axisDy). */
        _dragProject(dx, dy, axisDx, axisDy) {
            const L2 = axisDx * axisDx + axisDy * axisDy;
            if (L2 === 0) return { dx: 0, dy: 0 };
            const proj = (dx * axisDx + dy * axisDy) / L2;
            return { dx: axisDx * proj, dy: axisDy * proj };
        },

        /**
         * Vrátí povolený směr pohybu endpointu (jedna strana taženého wallu).
         * Pravidlo #10: omezí drag podle constraintů / L-corners / frozen.
         * @param {string} nodeId
         * @param {object} ownConstraint — od/doConstraint téhož wallu, nebo null
         * @param {string} excludeWallId — wall, který se sám táhne (vyloučen ze sousedů)
         * @returns {{type: 'free'}|{type: 'axis', dx, dy}|{type: 'frozen'}}
         */
        _dragEndpointAxis(nodeId, ownConstraint, excludeWallId) {
            if (ownConstraint && ownConstraint.konec) {
                // Napojení na ČELO klouže po čele, tedy KOLMO na hostitele —
                // ne podél něj. S osou hostitele vycházel posun kolmo na ni
                // vždycky nula a stěna nešla posunout vůbec.
                const stena = this.engine.walls.get(excludeWallId);
                const celo = this.engine.celoHostitele(ownConstraint.host, ownConstraint.konec,
                    stena ? stena.tloustka : 0);
                return celo
                    ? { type: 'axis', dx: celo.kolmice.x, dy: celo.kolmice.y }
                    : { type: 'free' };
            }
            if (ownConstraint) {
                const ax = this._dragHostAxis(ownConstraint.host);
                return ax ? { type: 'axis', dx: ax.dx, dy: ax.dy } : { type: 'free' };
            }
            const neighbors = this.engine.getNodeWalls(nodeId).filter(w => w.id !== excludeWallId);
            if (neighbors.length === 0) return { type: 'free' };
            if (neighbors.length >= 2) return { type: 'frozen' };
            const n = neighbors[0];
            const na = this.engine.nodes.get(n.nodeA);
            const nb = this.engine.nodes.get(n.nodeB);
            if (!na || !nb) return { type: 'free' };
            return { type: 'axis', dx: nb.x - na.x, dy: nb.y - na.y };
        },

        /**
         * Signovaná perpendikulární vzdálenost bodu od osy hostitele.
         * Kladná/záporná podle strany (použito pro edge magnet sign).
         */
        _dragSignedPerp(pointX, pointY, hostAxis) {
            return ((pointX - hostAxis.a.x) * (-hostAxis.dy) + (pointY - hostAxis.a.y) * hostAxis.dx) / hostAxis.L;
        },

        /**
         * Spočítá skutečné t uzlu na ose hostitele (projekce podél axis).
         */
        _dragActualT(nodeX, nodeY, hostAxis) {
            return ((nodeX - hostAxis.a.x) * hostAxis.dx + (nodeY - hostAxis.a.y) * hostAxis.dy) / hostAxis.L2;
        },

        /**
         * Rozsah t, ve kterém smí uzel jezdit po hostiteli (viz engine.rozsahNapojeni).
         * Směr a tloušťka se berou ze stěn v uzlu, úhel pro polohu tZkus;
         * u víc stěn v uzlu platí nejužší rozsah.
         */
        _rozsahNaHostiteli(nodeId, hostId, hax, perpOff, tZkus) {
            const bod = { x: hax.a.x + tZkus * hax.dx + hax.perpUx * perpOff, y: hax.a.y + tZkus * hax.dy + hax.perpUy * perpOff };
            let od = -Infinity, d = Infinity;
            for (const w of this.engine.getNodeWalls(nodeId)) {
                const druhy = this.engine.nodes.get(w.nodeA === nodeId ? w.nodeB : w.nodeA);
                if (!druhy) continue;
                const sx = druhy.x - bod.x, sy = druhy.y - bod.y;
                const sL = Math.hypot(sx, sy);
                const r = this.engine.rozsahNapojeni(hostId, perpOff, sL > 1 ? { x: sx / sL, y: sy / sL } : null,
                    (w.tloustka || 0) / 2 * this.PX_PER_M);
                od = Math.max(od, r.od); d = Math.min(d, r.do);
            }
            if (!isFinite(od) || !isFinite(d)) return { od: 0.02, do: 0.98 };
            return od <= d ? { od, do: d } : { od: (od + d) / 2, do: (od + d) / 2 };
        },

        /** Čára rovnoběžná s osou hostitele, odsazená o perpOff (líc hostitele). */
        _caraLice(hax, perpOff) {
            const ox = hax.perpUx * perpOff, oy = hax.perpUy * perpOff;
            return {
                a: { x: hax.a.x + ox, y: hax.a.y + oy },
                b: { x: hax.a.x + hax.dx + ox, y: hax.a.y + hax.dy + oy },
            };
        },

        /** Do jaké hloubky od osy hostitele se napojení bere jako střih (díl polotloušťky). */
        STRIH_PODIL: 0.5,

        /**
         * Kolmé napojení stěny na jinou stěnu má jen DVĚ podoby a tahle funkce
         * rozhodne, o kterou jde:
         *
         *   'okraj' — stěna končí na BLIŽŠÍM líci hostitele a klouže po něm;
         *             hostitel zůstane celý, protilehlý líc není v nabídce
         *   'strih' — stěna dojede na osu hostitele a tím ho rozstřihne
         *
         * Rozhoduje se jedním výpočtem pro náhled při tažení, pro napojení po
         * puštění i pro posouvání už napojené stěny. Dřív to byly tři různé
         * cesty, takže první napojení skočilo na osu (ale nestřihlo) a teprve
         * druhé tažení nabídlo líc.
         *
         * @param {string} nodeId  napojovaný konec
         * @param {object} hostStena  hostitelská stěna
         * @param {{x:number,y:number}} cil  kam míří kurzor
         * @returns {?{hax:object, rezim:string, perpOff:number, polotl:number, znamenko:number}}
         */
        _rezimNapojeni(nodeId, hostStena, cil) {
            if (!hostStena) return null;
            const hax = this._dragHostAxis(hostStena.id);
            if (!hax) return null;
            const polotl = (hostStena.tloustka || 0) * this.engine.PX_PER_M / 2;

            // Bližší líc = ten na straně, kde leží tělo mojí stěny. Nejde-li to
            // určit (stěna míří po ose hostitele), rozhodne strana kurzoru.
            let znamenko = 0;
            for (const moje of this.engine.getNodeWalls(nodeId)) {
                const druhyId = moje.nodeA === nodeId ? moje.nodeB : moje.nodeA;
                const druhy = this.engine.nodes.get(druhyId);
                if (!druhy) continue;
                const p = this._dragSignedPerp(druhy.x, druhy.y, hax);
                if (Math.abs(p) > 0.01) { znamenko = Math.sign(p); break; }
            }
            const perpKurzor = this._dragSignedPerp(cil.x, cil.y, hax);
            if (znamenko === 0) znamenko = Math.sign(perpKurzor) || 1;

            // Střih = kurzor zajel do vnitřní poloviny stěny. Hystereze, aby to
            // na hranici nepřeskakovalo tam a zpět.
            const scale = this.stage ? this.stage.scaleX() : 1;
            const hranice = polotl * this.STRIH_PODIL;
            const vule = 3 / scale;
            const jeStrih = polotl <= 0
                ? true
                : (this._attachMode === 'strih'
                    ? Math.abs(perpKurzor) < hranice + vule
                    : Math.abs(perpKurzor) < hranice);

            return {
                hax, polotl, znamenko,
                rezim: jeStrih ? 'strih' : 'okraj',
                perpOff: jeStrih ? 0 : znamenko * polotl,
            };
        },

        // ═══════════════════════════════════════════════════════
        // ROTATE HELPERS — bbox, blokace, rotace uzlů
        // ═══════════════════════════════════════════════════════

        /** Množina ID uzlů, které rotace zasahuje (endpointy vybraných stěn + samostatně vybrané uzly). */
        _rotateNodeIds() {
            const r = this.renderer;
            const ids = new Set();
            if (!r) return ids;
            for (const nId of r.selectedNodes) ids.add(nId);
            for (const wId of r.selectedWalls) {
                const w = this.engine.walls.get(wId);
                if (!w) continue;
                ids.add(w.nodeA);
                ids.add(w.nodeB);
            }
            return ids;
        },

        /** Nejdelší stěna ve výběru = "předek" objektu (definuje orientaci OBB). */
        _findPredekWall() {
            const r = this.renderer;
            if (!r || r.selectedWalls.size === 0) return null;
            let best = null, bestLen = -1;
            for (const wId of r.selectedWalls) {
                const w = this.engine.walls.get(wId);
                if (!w) continue;
                const a = this.engine.nodes.get(w.nodeA);
                const b = this.engine.nodes.get(w.nodeB);
                if (!a || !b) continue;
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                if (L > bestLen) { best = { wall: w, a, b, L }; bestLen = L; }
            }
            return best;
        },

        /**
         * OBB kolem výběru (včetně tloušťky stěn), zarovnaný na předek (nejdelší stěnu).
         * Každá stěna přispívá 4 rohy (endpoint ± kolmice × půl-tloušťky), aby rámeček
         * opisoval vnější hranu stěn bez ohledu na rozdílné tloušťky.
         * Vrací { cx, cy, halfW, halfH, angle, handleLocalV }:
         *   - cx, cy: střed OBB v canvas souřadnicích
         *   - halfW, halfH: poloviční rozměry v lokálním frame (U = směr předku, V = kolmice)
         *   - angle: úhel U osy (předku) v rad
         *   - handleLocalV: V pozice madla v lokálním frame (naproti předku)
         */
        _rotateBbox() {
            const r = this.renderer;
            if (!r) return null;
            const selWalls = r.selectedWalls;
            const standalone = r.selectedNodes;
            const selVybaveni = r.selectedVybaveni || new Set();
            // Rotace povolena pokud máme alespoň jednu stěnu, 2+ samostatné uzly,
            // nebo aspoň jeden kus vybavení.
            if (selWalls.size === 0 && standalone.size < 2 && selVybaveni.size === 0) return null;
            // Body k zahrnutí do OBB — rohy stěn (4 na stěnu) + samostatné uzly + rohy polygonu vybavení
            const points = [];
            for (const wId of selWalls) {
                const w = this.engine.walls.get(wId);
                if (!w) continue;
                const a = this.engine.nodes.get(w.nodeA);
                const b = this.engine.nodes.get(w.nodeB);
                if (!a || !b) continue;
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                if (L === 0) continue;
                const halfThk = (w.tloustka || 0.1) * this.engine.PX_PER_M / 2;
                const px = -(b.y - a.y) / L * halfThk;
                const py = (b.x - a.x) / L * halfThk;
                points.push({ x: a.x + px, y: a.y + py });
                points.push({ x: a.x - px, y: a.y - py });
                points.push({ x: b.x + px, y: b.y + py });
                points.push({ x: b.x - px, y: b.y - py });
            }
            for (const nId of standalone) {
                const n = this.engine.nodes.get(nId);
                if (n) points.push({ x: n.x, y: n.y });
            }
            // Vybavení — polygon je v metrech (+y nahoru), konverze na canvas px (+y dolů)
            const PX_PER_M = this.engine.PX_PER_M;
            for (const vbId of selVybaveni) {
                const vb = (this.engine.vybaveni || []).find(v => v.id === vbId);
                if (!vb || !Array.isArray(vb.polygon)) continue;
                for (const pt of vb.polygon) {
                    points.push({ x: pt[0] * PX_PER_M, y: -pt[1] * PX_PER_M });
                }
            }
            if (points.length < 2) return null;
            const predek = this._findPredekWall();
            // Fallback: bez předku zkusit orientaci podle prvního kusu vybavení.
            // Hledáme úhel ve dvou krocích:
            //   1) vb.uhel (engine ho aktualizuje při rotaci, v Konva-stupních)
            //   2) polygon: c0 → c1 jako lokální X osa (4-bodový rect)
            // Pak body z `points` promítneme do tohoto rotovaného frame a vrátíme OBB.
            if (!predek) {
                let angRad = null;
                if (selVybaveni.size > 0) {
                    const firstVb = (this.engine.vybaveni || []).find(v => selVybaveni.has(v.id));
                    if (firstVb) {
                        if (typeof firstVb.uhel === 'number' && Math.abs(firstVb.uhel) > 1e-6) {
                            angRad = firstVb.uhel * Math.PI / 180;
                        } else if (Array.isArray(firstVb.polygon) && firstVb.polygon.length >= 2) {
                            const c0 = { x: firstVb.polygon[0][0] * PX_PER_M, y: -firstVb.polygon[0][1] * PX_PER_M };
                            const c1 = { x: firstVb.polygon[1][0] * PX_PER_M, y: -firstVb.polygon[1][1] * PX_PER_M };
                            const dx = c1.x - c0.x, dy = c1.y - c0.y;
                            if (Math.hypot(dx, dy) > 0.5) angRad = Math.atan2(dy, dx);
                        }
                    }
                }
                if (angRad !== null) {
                    const ux = Math.cos(angRad), uy = Math.sin(angRad);
                    const vx = -uy, vy = ux;
                    let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
                    for (const p of points) {
                        const u = p.x * ux + p.y * uy;
                        const v = p.x * vx + p.y * vy;
                        if (u < minU) minU = u;
                        if (v < minV) minV = v;
                        if (u > maxU) maxU = u;
                        if (v > maxV) maxV = v;
                    }
                    const cU = (minU + maxU) / 2, cV = (minV + maxV) / 2;
                    // Center zpět do canvas frame: ux, uy + vx, vy jsou ortonormální báze.
                    const cx = cU * ux + cV * vx;
                    const cy = cU * uy + cV * vy;
                    return {
                        cx, cy,
                        halfW: (maxU - minU) / 2, halfH: (maxV - minV) / 2,
                        angle: angRad,
                        handleLocalV: -(maxV - minV) / 2,
                    };
                }
                // Úplný fallback: AABB bez rotace (např. žádný kus s definovanou orientací)
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const p of points) {
                    if (p.x < minX) minX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y > maxY) maxY = p.y;
                }
                return {
                    cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
                    halfW: (maxX - minX) / 2, halfH: (maxY - minY) / 2,
                    angle: 0, handleLocalV: -(maxY - minY) / 2,
                };
            }
            // Lokální osy: U podél předku, V kolmo (CCW)
            const ux = (predek.b.x - predek.a.x) / predek.L;
            const uy = (predek.b.y - predek.a.y) / predek.L;
            const vx = -uy, vy = ux;
            let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
            // Počítáme body výrazně na +V / -V straně — robustnější než sign(cV),
            // který u single-wall selekcí osciluje kolem nuly (corners ±halfThk se ruší)
            // a madlo skáče při každé drobné změně pozice během drag.
            let posCount = 0, negCount = 0;
            const tol = 0.5; // 0.5 px tolerance
            for (const p of points) {
                const dx = p.x - predek.a.x, dy = p.y - predek.a.y;
                const u = dx * ux + dy * uy;
                const v = dx * vx + dy * vy;
                if (u < minU) minU = u;
                if (v < minV) minV = v;
                if (u > maxU) maxU = u;
                if (v > maxV) maxV = v;
                if (v > tol) posCount++;
                else if (v < -tol) negCount++;
            }
            const cU = (minU + maxU) / 2;
            const cV = (minV + maxV) / 2;
            const cx = predek.a.x + cU * ux + cV * vx;
            const cy = predek.a.y + cU * uy + cV * vy;
            const halfW = (maxU - minU) / 2;
            const halfH = (maxV - minV) / 2;
            // Madlo na straně, kde je víc "tělesnosti" objektu. Při remíze (single wall)
            // použít poslední stabilní volbu (hysterze), jinak default +V.
            let handleSign;
            if (posCount > negCount) handleSign = 1;
            else if (negCount > posCount) handleSign = -1;
            else handleSign = this._lastHandleSign || 1;
            this._lastHandleSign = handleSign;
            const handleLocalV = handleSign * halfH;
            return { cx, cy, halfW, halfH, angle: Math.atan2(uy, ux), handleLocalV };
        },

        /** Zjistí, zda je výběr napojen na stěnu mimo výběr. Vrátí null nebo string s důvodem. */
        _rotateBlockedReason() {
            const r = this.renderer;
            if (!r) return null;
            const selWalls = r.selectedWalls;
            if (selWalls.size === 0) return null;
            const nodeIds = this._rotateNodeIds();
            // A) constraint z vybrané stěny míří ven
            for (const wId of selWalls) {
                const w = this.engine.walls.get(wId);
                if (!w) continue;
                if (w.odConstraint && !selWalls.has(w.odConstraint.host)) {
                    return 'Napojení na stěnu ' + w.odConstraint.host + ' mimo výběr';
                }
                if (w.doConstraint && !selWalls.has(w.doConstraint.host)) {
                    return 'Napojení na stěnu ' + w.doConstraint.host + ' mimo výběr';
                }
            }
            // B) nevybraná stěna sdílí uzel s výběrem (roh)
            // C) nevybraná stěna má constraint na vybranou stěnu (T-child venku)
            for (const w of this.engine.walls.values()) {
                if (selWalls.has(w.id)) continue;
                if (nodeIds.has(w.nodeA) || nodeIds.has(w.nodeB)) {
                    return 'Sdílený roh se stěnou ' + w.id + ' mimo výběr';
                }
                if (w.odConstraint && selWalls.has(w.odConstraint.host)) {
                    return 'Stěna ' + w.id + ' je napojena na výběr';
                }
                if (w.doConstraint && selWalls.has(w.doConstraint.host)) {
                    return 'Stěna ' + w.id + ' je napojena na výběr';
                }
            }
            return null;
        },

        /** Zaktualizuje rotační madlo podle aktuálního stavu výběru. */
        _updateRotateHandle() {
            if (!this.renderer) return;
            const bbox = this._rotateBbox();
            const reason = bbox ? this._rotateBlockedReason() : null;
            this.renderer.renderRotateHandle(bbox, reason);
        },

        /** O kolik smí úhel v uzlu chybět do 180°, aby šly stěny sloučit. */
        SPOJ_MAX_ODCHYLKA_DEG: 5,

        /** Uzel, nad kterým se právě nabízí sloučení stěn (null = nikde). */
        _uzelKeSpojeni() {
            const r = this.renderer;
            if (!r || !this.engine) return null;
            if (r.selectedNodes.size !== 1) return null;
            if (r.selectedOpenings.size || r.selectedVybaveni.size || r.selectedProstory.size) return null;

            const uzelId = [...r.selectedNodes][0];
            // Klik na uzel vybere i jeho stěny — to je v pořádku. Širší výběr
            // (rámeček přes půl domu) už ale sloučení nabízet nemá.
            const steny = new Set(this.engine.getNodeWalls(uzelId).map(w => w.id));
            for (const id of r.selectedWalls) if (!steny.has(id)) return null;

            if (!this.engine.lzeSpojitVUzlu(uzelId, this.SPOJ_MAX_ODCHYLKA_DEG).ok) return null;
            return this.engine.nodes.get(uzelId) || null;
        },

        /** Do kolika stupňů se stěny vracejí do pravého úhlu. */
        PRAVY_UHEL_TOLERANCE_DEG: 2,

        /**
         * Vrátí stěny do pravých úhlů, pokud jsou mimo jen o kousek.
         *
         * Volá se po každé dokončené úpravě (dotažení uzlu, dokreslený úsek,
         * převzetí z importu). Rozdíl desetiny stupně na obrazovce nepoznáte,
         * ale v konstrukci se sčítá — viz měření v enginu u srovnejPraveUhly.
         */
        _srovnejPraveUhly() {
            if (!this.engine) return;
            this.engine.srovnejPraveUhly(this.PRAVY_UHEL_TOLERANCE_DEG);
        },

        /** Zaktualizuje madlo pro sloučení stěn podle výběru. */
        _updateSpojMadlo() {
            if (!this.renderer) return;
            this.renderer.renderSpojMadlo(this._uzelKeSpojeni());
        },

        /**
         * Sloučí dvě stěny v uzlu do jedné a spoj zruší.
         * Napojené stěny se dotáhnou (viz spojSteny v enginu), ne posunou.
         */
        spojSteny() {
            const uzel = this._uzelKeSpojeni();
            if (!uzel) return;

            this.engine.pushUndo();
            const stena = this.engine.spojSteny(uzel.id, this.SPOJ_MAX_ODCHYLKA_DEG);
            if (!stena) { this.engine.undo(); return; }

            this.renderer.setSelection([stena.id], []);
            this.renderer.render();
            this.autoSave('Sloučení stěn');
        },

        // ═══════════════════════════════════════════════════════
        // INIT
        // ═══════════════════════════════════════════════════════
        init() {
            this.$nextTick(() => {
                const wrap = this.$refs.konvaContainer;
                if (!wrap) return;

                // Stage
                this.stage = new Konva.Stage({
                    container: wrap,
                    width: wrap.offsetWidth,
                    height: wrap.offsetHeight,
                });

                // Engine
                this.engine = new StavebniEngine({ pxPerM: this.PX_PER_M });
                // Čelo taženého konce leží na líci už v náhledu přichycení na okraj
                this.engine.nahledNapojeni = (nodeId) => {
                    const sp = this._snapPreview;
                    return sp && sp.rezim === 'okraj' && sp.wall && nodeId === this.draggingNodeId
                        ? { host: sp.wall.id } : null;
                };
                // Podklad se hýbe s celým domem → Zpět musí vracet i jeho polohu
                this.engine.undoDoplnek = {
                    zachyt: () => {
                        const s = this.podkladPolohaZachyt?.() ?? null;
                        // Těsně před úpravou je podklad ještě na místě kroku, na kterém
                        // se stojí. Krok vzniklý před vložením podkladu jeho polohu
                        // nezná — doplnit, jinak by Zpět sem podklad nevrátil.
                        const k = this.historie[this.historiePozice];
                        if (k && s && (!k.podklad || k.podklad.url !== s.url)) {
                            k.podklad = { ...s };
                            // poslat znovu, jen když je na konci osy (neodeslané musí být její konec)
                            if (this.historiePozice === this.historie.length - 1
                                    && !this._neodeslaneKroky.includes(k.id)) this._neodeslaneKroky.push(k.id);
                        }
                        return s;
                    },
                    obnov: (s) => this.podkladPolohaObnov?.(s),
                };

                // Renderer
                this.renderer = new KonvaRenderer(this.stage, this.engine, {
                    showKoty: this.showKoty,
                    showNodes: this.showNodes,
                    showGrid: this.showGrid,
                    showMistnosti: this.showMistnosti,
                    showVybaveni: this.showVybaveni,
                });
                // Rotate handle + inspector panel se překreslují při každém render()
                this.renderer.afterRender = () => {
                    this._updateRotateHandle();
                    this._updateSpojMadlo();
                    this._selectionTick++;
                };

                // Vývoj editor: zapnout barvy nodů podle typu napojení (L/T/X/frozen)
                // + vypnout grid snap (cc/px zaokrouhlování mění délky stěn)
                // + zobrazit technické ID u stěn a otvorů
                if (initialData.vyvojMode) {
                    this.renderer.nodeColorByJunctionType = true;
                    this.renderer.showIds = true;
                    this.engine.SNAP_STEP = 0.1; // sub-pixel — prakticky žádný snap
                }

                // Aplikovat uložený zoom a pozici
                if (this.zoom !== 1) {
                    this.stage.scale({ x: this.zoom, y: this.zoom });
                }
                const _saved = JSON.parse(localStorage.getItem('kv3_state') || '{}');
                if (_saved.stageOffsetX !== undefined && _saved.stageOffsetY !== undefined) {
                    this.stage.offsetX(_saved.stageOffsetX);
                    this.stage.offsetY(_saved.stageOffsetY);
                }
                if (_saved.stageX !== undefined && _saved.stageY !== undefined) {
                    this.stage.position({ x: _saved.stageX, y: _saved.stageY });
                }

                // Mřížka
                this.renderer.renderGrid();

                // Uložit aktuální koncept pro auto-redirect
                if (this.projektId) localStorage.setItem('kv3_lastProjekt', this.projektId);

                // Právě vytvořený koncept (?nove=1) — rovnou nabídnout přejmenování,
                // aby vytvoření a pojmenování byl jeden krok. Parametr z URL uklidit,
                // ať se při obnovení stránky input neotevírá znovu.
                if (new URLSearchParams(location.search).get('nove') === '1') {
                    const url = new URL(location.href);
                    url.searchParams.delete('nove');
                    history.replaceState({}, '', url);
                    this.zahajPreimenovaniKonceptu();
                }

                // Eventy
                this.stage.on('wheel', (e) => this.onWheel(e));
                this.stage.on('mousemove', (e) => this.onMouseMove(e));
                this.stage.on('mousedown', (e) => this.onMouseDown(e));
                this.stage.on('mouseup', (e) => this.onMouseUp(e));
                this.stage.on('dblclick', (e) => {
                    if (this.nastroj === 'metr' && this._metrMeri) this.metrDblclick();
                });
                this.stage.on('click tap', (e) => this.onClick(e));

                // Globální mouseup safety net: pokud uživatel pustí tlačítko myši
                // mimo canvas (nebo i mimo okno prohlížeče), Konva mouseup event
                // se nevyvolá a drag stěny / nábytku / otvoru by zůstal aktivní —
                // objekt by jezdil s kurzorem i po puštění tlačítka. Tady to
                // odchytíme a zavoláme onMouseUp ručně.
                this._globalMouseUpHandler = (e) => {
                    // Tah dokončuje JEN levé tlačítko. Pravým se posouvá plátno
                    // a Konva si ho odbaví sama (větev isPanning v onMouseUp);
                    // tahle pojistka by se spustila hned po ní, isPanning už by
                    // bylo false a rozkreslený úsek stěny by se tím dokreslil —
                    // pravý klik při kreslení tak zakládal bod.
                    if (!this.isPanning && e.button != null && e.button !== 0) return;
                    if (this.isDraggingWall || this.isDraggingNode || this.isDraggingVybaveni
                            || this.isDraggingOpening || this.isRotating || this.isPanning
                            || this.selectionStart || this._pendingDrag) {
                        this.onMouseUp({ evt: e });
                    }
                };
                window.addEventListener('mouseup', this._globalMouseUpHandler);

                // Mezerník — zablokovat úplně (capture fáze, před Alpinem i browseru)
                document.addEventListener('keydown', (e) => {
                    if (e.code === 'Space' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    }
                }, true);
                document.addEventListener('keyup', (e) => {
                    if (e.code === 'Space' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    }
                }, true);

                // Resize
                const ro = new ResizeObserver(() => {
                    this.stage.width(wrap.offsetWidth);
                    this.stage.height(wrap.offsetHeight);
                    this.renderer.renderGrid();
                });
                ro.observe(wrap);

                // Context menu
                wrap.addEventListener('contextmenu', e => e.preventDefault());

                // Načíst data
                if (this.projektData && this.projektData.steny) {
                    this.engine.fromJSON(this.projektData);
                    this.renderer.render();
                }
                this._historieInit(initialData.historieAktualni);

                // Obnovit 3D režim z localStorage (pokud byl při posledním
                // zavření aktivní, zinicializovat Three.js scénu).
                if (this.rezim3d) {
                    // rezim3d=true načten z _s.rezim3d; prepni3d spustí _init3d
                    this.rezim3d = false;  // reset aby prepni3d() vykonal inicializaci
                    this.prepni3d();
                }

                // Cleanup při přepnutí nástroje
                this.$watch('nastroj', (val, old) => {
                    if (old === 'metr') this.metrEscape();
                    if (old === 'stena') { this.zrusRozkreslenyUsek(); this.kreslimStenu = false; this.stenaStart = null; this.stenaUseky = []; this._stenaPreskocKlik = false; this.renderer.clearTemp(); }
                    // Kreslicí nástroj → zrušit výběr, ať nad plátnem nezůstane viset
                    // panel s vlastnostmi objektu, který se právě needituje.
                    // Výběr a posun (ruka) selekci nechávají — tam dává smysl.
                    if (val !== 'vyber' && val !== 'posun') this.renderer.clearSelection();
                });

                // Přebudovat 3D terrain při změně výškového profilu
                this.$watch('vyskovyProfil', () => {
                    if (this.rezim3d) {
                        this._buildTerrain3D();
                        this._build3d();  // obnovit i buildingY snap
                    }
                });

                // Při změně parcel přebudovat terrain (= nová maska shaderu)
                this.$watch('katastrParcely', () => {
                    if (this.rezim3d) {
                        this._buildTerrain3D();
                    }
                }, { deep: true });

                // Obnovit katastr z metadat (parcely, KÚ, kompas)
                // UI nastavení (podklad, checkboxy, zoom, pozice) se berou z localStorage kk_state
                if (this.metadata && this.metadata.katastr) {
                    const kat = this.metadata.katastr;
                    if (kat.parcely) this.katastrParcely = kat.parcely;
                    if (kat.ku) { this.katastrVybraneKu = kat.ku; this.katastrKuHledani = kat.ku.n + ' (' + kat.ku.o + ')'; }
                    if (kat.kompasUhel && !this.kompasUhel) this.kompasUhel = kat.kompasUhel;
                    if (kat.aiModel) this.aiModel = kat.aiModel;
                    if (this.katastrParcely.length > 0) {
                        // Načíst stavby a okolní parcely (neukládají se do DB)
                        // Vždy znovu načíst stavby a sousedy (neukládají se spolehlivě do DB)
                        this.katastrParcely.forEach(p => { delete p.stavby; delete p.bbox; });
                        Promise.all([
                            ...this.katastrParcely.map(p => this.katastrNactiStavbyParcely(p)),
                            ...this.katastrParcely.map(p => this.katastrNactiLimityParcely(p)),
                            this._katastrNactiOkolni(),
                        ]).then(() => {
                            this.katastrPrekreslitCanvas();
                            this.katastrNactiProfil(); // async, nečekáme
                        });
                        if (this.katastrMapaPodklad !== 'zadny') this.katastrZmenPodklad();
                    }
                    if (this.kompasUhel !== 0) this.aplikujRotaci(true);
                }

                this.scrollChat();
            });
        },

        // ═══════════════════════════════════════════════════════
        // POINTER & SCREEN ORIENTATION
        // ═══════════════════════════════════════════════════════
        getPointerPos() {
            const pos = this.stage.getPointerPosition();
            if (!pos) return { x: 0, y: 0 };
            const transform = this.stage.getAbsoluteTransform().copy().invert();
            return transform.point(pos);
        },

        /** Vektor "nahoru na obrazovce" v world space (respektuje rotaci kompasu) */
        screenUp() {
            const rot = (this.kompasUhel || 0) * Math.PI / 180;
            return { x: Math.sin(rot), y: -Math.cos(rot) };
        },

        /** Rotace pro text aby byl vodorovný na obrazovce (ve stupních, pro Konva rotation) */
        screenTextRotation() {
            return -(this.kompasUhel || 0);
        },

        // Screen-space selection rectangle (vždy vodorovný/svislý)
        _drawScreenSelectionRect(sx1, sy1, sx2, sy2) {
            this._removeScreenSelectionRect();
            const container = this.stage.container();
            const div = document.createElement('div');
            div.id = 'kk-screen-sel';
            div.style.cssText = `position:absolute;border:1.5px solid #3b82f6;background:rgba(59,130,246,0.08);pointer-events:none;z-index:5;`;
            div.style.left = Math.min(sx1, sx2) + 'px';
            div.style.top = Math.min(sy1, sy2) + 'px';
            div.style.width = Math.abs(sx2 - sx1) + 'px';
            div.style.height = Math.abs(sy2 - sy1) + 'px';
            container.style.position = 'relative';
            container.appendChild(div);
        },

        _removeScreenSelectionRect() {
            const el = document.getElementById('kk-screen-sel');
            if (el) el.remove();
        },

        // ═══════════════════════════════════════════════════════
        // MOUSE EVENTS
        // ═══════════════════════════════════════════════════════
        onMouseMove(e) {
            const pos = this.getPointerPos();
            this.kurzorX = pos.x / this.PX_PER_M;
            this.kurzorY = -pos.y / this.PX_PER_M;

            // Panning
            if (this.isPanning) {
                const dx = e.evt.clientX - this.panStart.x;
                const dy = e.evt.clientY - this.panStart.y;
                this.stage.position({
                    x: this.stageStartPos.x + dx,
                    y: this.stageStartPos.y + dy,
                });
                // Bump tick aby inspector panel následoval pan
                this._selectionTick++;
                this.renderer.renderGrid();
                // Force batchDraw na všech vrstvách — někdy Konva neflushne
                // některé layery po stage.position a vidí se desync (grid
                // posunutý, stěny zůstaly).
                if (this.stage.children) {
                    this.stage.children.forEach(layer => {
                        if (typeof layer.batchDraw === 'function') layer.batchDraw();
                    });
                }
                return;
            }

            // Zvýrazňovač — kreslení tahu
            if (this.nastroj === 'zvyraznovac' && this._zvyrazKresba) {
                this._zvyrazKresba.points.push(pos.x, pos.y);
                this.renderZvyrazTemp();
                return;
            }

            // Aktivovat pending drag po dostatečném pohybu.
            // Threshold 5 px (dříve 3) — při 3 px se drag aktivoval i nechtěným malým
            // pohybem při kliknutí, takže klik na objekt v multi-výběru se chápal jako
            // drag celé skupiny místo přepnutí výběru na ten jeden objekt.
            if (this._pendingDrag && !this.isDraggingNode && !this.isDraggingWall && !this.isDraggingVybaveni && !this.isRotating) {
                const dist = Math.hypot(pos.x - this._pendingDrag.startPos.x, pos.y - this._pendingDrag.startPos.y);
                if (dist > 5) {
                    // Uložit pravou počáteční pozici myši pro click-vs-drag detekci v mouseUp:
                    // pokud po celém dragu je net delta od originu malá (< 5 px), interpretujeme
                    // to jako klik a redukujeme výběr — uživatel chtěl jen vybrat tenhle objekt,
                    // ne ho táhnout.
                    this._dragRealOrigin = { x: this._pendingDrag.startPos.x, y: this._pendingDrag.startPos.y, type: this._pendingDrag.type, id: this._pendingDrag.id };
                    this.engine.pushUndo();
                    if (this._pendingDrag.type === 'rotate') {
                        this.isRotating = true;
                        this._rotateCx = this._pendingDrag.cx;
                        this._rotateCy = this._pendingDrag.cy;
                        this._rotateStartAngle = this._pendingDrag.startAngle;
                        this._rotateDelta = 0;
                        // Snapshot pozic všech zasažených uzlů (rotujeme z původní pozice, ne cumulativně)
                        this._rotateNodeSnap = new Map();
                        for (const nId of this._rotateNodeIds()) {
                            const n = this.engine.nodes.get(nId);
                            if (n) this._rotateNodeSnap.set(nId, { x: n.x, y: n.y });
                        }
                        // Snapshot vybavení (stred, polygon, uhel) — rotujeme z původních hodnot.
                        this._rotateVybaveniSnap = new Map();
                        for (const vbId of (this.renderer.selectedVybaveni || [])) {
                            const vb = (this.engine.vybaveni || []).find(v => v.id === vbId);
                            if (!vb) continue;
                            this._rotateVybaveniSnap.set(vbId, {
                                stred: Array.isArray(vb.stred) ? [vb.stred[0], vb.stred[1]] : null,
                                polygon: Array.isArray(vb.polygon) ? vb.polygon.map(p => [p[0], p[1]]) : null,
                                uhel: vb.uhel || 0,
                            });
                        }
                        // Otáčí se celý dům → podklad se otáčí s ním (z výchozí polohy)
                        this._rotatePodkladSnap = this.podkladJedeSVyberem?.()
                            ? this.podkladPolohaZachyt() : null;
                        this._pendingDrag = null;
                    } else if (this._pendingDrag.type === 'node') {
                        this.isDraggingNode = true;
                        this.draggingNodeId = this._pendingDrag.id;
                        // Vybrat i stěny uzlu — aby dofIndicator vykreslil úhly
                        // u OBOU endpointů taženého wallu (včetně druhého T-junction).
                        const _nw = this.engine.getNodeWalls(this._pendingDrag.id);
                        this.renderer.setSelection(_nw.map(w => w.id), [this._pendingDrag.id]);
                        // Režim napojení (okraj/střih) se při novém uchopení neurčuje
                        // z minulosti — rozhodne ho poloha kurzoru v _rezimNapojeni().
                        this._attachMode = null;
                    } else if (this._pendingDrag.type === 'vybaveni') {
                        this.isDraggingVybaveni = true;
                        this.draggingVybaveniId = this._pendingDrag.id;
                        this.dragVybaveniStart = { x: pos.x, y: pos.y };
                    } else if (this._pendingDrag.type === 'opening') {
                        this.isDraggingOpening = true;
                        this.draggingOpeningId = this._pendingDrag.id;
                        this.dragOpeningStart = this._pendingDrag.startPos;
                        // Offset = pozice levého okraje otvoru - t kliku (v metrech
                        // na stěně). Aplikuje se při drag, aby otvor "neposkočil"
                        // když user klikl jinde než na levý okraj.
                        this._dragOpeningOffset = 0;
                        const _op = this.engine.openings.get(this._pendingDrag.id);
                        const _w = _op ? this.engine.walls.get(_op.wallId) : null;
                        if (_op && _w) {
                            const _nA = this.engine.nodes.get(_w.nodeA);
                            const _nB = this.engine.nodes.get(_w.nodeB);
                            if (_nA && _nB) {
                                const _dx = _nB.x - _nA.x, _dy = _nB.y - _nA.y;
                                const _L = Math.hypot(_dx, _dy);
                                const _sp = this._pendingDrag.startPos;
                                const _clickT = ((_sp.x - _nA.x) * _dx + (_sp.y - _nA.y) * _dy) / (_L * _L);
                                const _clickPozice = _clickT * _L / this.engine.PX_PER_M;
                                this._dragOpeningOffset = _op.pozice - _clickPozice;
                            }
                        }
                    } else {
                        this.isDraggingWall = true;
                        this.draggingWallId = this._pendingDrag.id;
                        this.dragWallStart = { x: pos.x, y: pos.y };
                        // Zachytit initial actual t constraint endpointů taženého wallu.
                        // LIMIT bude používat upper = max(stored_cap, initial_actual_t)
                        // aby user mohl vrátit stěnu na PŮVODNÍ pozici, i když je
                        // stored t (zaokrouhlený parser) pod skutečnou počáteční t.
                        this._dragInitialT = {};
                        const _w = this.engine.walls.get(this._pendingDrag.id);
                        if (_w) {
                            const computeActualT = (node, constraint) => {
                                if (!node || !constraint) return null;
                                const h = this.engine.walls.get(constraint.host);
                                if (!h) return null;
                                const ha = this.engine.nodes.get(h.nodeA);
                                const hb = this.engine.nodes.get(h.nodeB);
                                if (!ha || !hb) return null;
                                const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
                                const hL2 = hdx * hdx + hdy * hdy;
                                if (hL2 === 0) return null;
                                return ((node.x - ha.x) * hdx + (node.y - ha.y) * hdy) / hL2;
                            };
                            if (_w.odConstraint) this._dragInitialT.a = computeActualT(this.engine.nodes.get(_w.nodeA), _w.odConstraint);
                            if (_w.doConstraint) this._dragInitialT.b = computeActualT(this.engine.nodes.get(_w.nodeB), _w.doConstraint);
                        }
                        // Snapshot "původních" absolutních pozic otvorů na začátku
                        // drag sekvence. Použije se pro intended pozice (ne current
                        // state), takže otvory se při extensi stěny vrací na původní
                        // pozici, ne zůstávají na pushed místě.
                        this._dragOpeningAbs = new Map();
                        for (const op of this.engine.openings.values()) {
                            const wall = this.engine.walls.get(op.wallId);
                            if (!wall) continue;
                            const nA = this.engine.nodes.get(wall.nodeA);
                            const nB = this.engine.nodes.get(wall.nodeB);
                            if (!nA || !nB) continue;
                            const dx = nB.x - nA.x, dy = nB.y - nA.y;
                            const L = Math.hypot(dx, dy);
                            if (L === 0) continue;
                            const absX = nA.x + (dx / L) * op.pozice * this.engine.PX_PER_M;
                            const absY = nA.y + (dy / L) * op.pozice * this.engine.PX_PER_M;
                            this._dragOpeningAbs.set(op.id, { x: absX, y: absY });
                        }
                    }
                    this._pendingDrag = null;
                }
            }

            // Rotace celého výběru kolem středu bboxu (snap 5°)
            if (this.isRotating) {
                const curAngle = Math.atan2(pos.y - this._rotateCy, pos.x - this._rotateCx);
                let delta = curAngle - this._rotateStartAngle;
                // Normalizovat do (-π, π]
                while (delta > Math.PI) delta -= 2 * Math.PI;
                while (delta < -Math.PI) delta += 2 * Math.PI;
                // Snap po 1°
                const step = 1 * Math.PI / 180;
                if (!e.evt.altKey) {
                    delta = Math.round(delta / step) * step;
                }
                this._rotateDelta = delta;
                const cos = Math.cos(delta), sin = Math.sin(delta);
                for (const [nId, p0] of this._rotateNodeSnap) {
                    const node = this.engine.nodes.get(nId);
                    if (!node) continue;
                    const rx = p0.x - this._rotateCx;
                    const ry = p0.y - this._rotateCy;
                    node.x = this._rotateCx + rx * cos - ry * sin;
                    node.y = this._rotateCy + rx * sin + ry * cos;
                }
                // Vybavení rotujeme okolo stejného středu, ale v metrech
                // a s opačným znaménkem osy Y (engine drží polygon v +y nahoru,
                // Konva má +y dolů). Vzorec se proto mění na: y' = -((-y)·cos + (-x)·sin)
                // což zjednodušíme tak, že použijeme negovaný úhel.
                if (this._rotateVybaveniSnap && this._rotateVybaveniSnap.size > 0) {
                    const PX_PER_M = this.engine.PX_PER_M;
                    const cxM = this._rotateCx / PX_PER_M;
                    const cyM = -this._rotateCy / PX_PER_M;
                    const cosM = Math.cos(-delta), sinM = Math.sin(-delta);
                    for (const [vbId, snap] of this._rotateVybaveniSnap) {
                        const vb = (this.engine.vybaveni || []).find(v => v.id === vbId);
                        if (!vb) continue;
                        if (snap.stred) {
                            const rx = snap.stred[0] - cxM;
                            const ry = snap.stred[1] - cyM;
                            vb.stred = [cxM + rx * cosM - ry * sinM, cyM + rx * sinM + ry * cosM];
                        }
                        if (snap.polygon) {
                            vb.polygon = snap.polygon.map(p => {
                                const rx = p[0] - cxM;
                                const ry = p[1] - cyM;
                                return [cxM + rx * cosM - ry * sinM, cyM + rx * sinM + ry * cosM];
                            });
                        }
                        // uhel jen informativně (renderer ho ignoruje, geometrie je v polygonu).
                        vb.uhel = (snap.uhel || 0) + delta * 180 / Math.PI;
                    }
                }
                if (this._rotatePodkladSnap) {
                    this.podkladOtoc(this._rotatePodkladSnap, this._rotateCx, this._rotateCy, delta);
                }
                this.renderer.render();
                return;
            }

            // Dragging node
            if (this.isDraggingNode && this.draggingNodeId) {
                // Snapshot node pozic před pohybem (pro propagateTChildren perp-snap)
                const oldNodePosForDrag = new Map();
                for (const n of this.engine.nodes.values()) {
                    oldNodePosForDrag.set(n.id, { x: n.x, y: n.y });
                }
                // Výchozí target = raw mouse pos. snapPoint() magnetuje k blízkým
                // node uzlům (MAGNET_DIST 16 px) — to by způsobilo skokové
                // "chytání" k ostatním uzlům, což user nechce. Magnet se zapíná
                // jen explicitně pro volný uzel níže.
                let target = { x: pos.x, y: pos.y };
                // Pozici určilo napojení na čelo — mřížka ani úhlový magnet do ní nesmí
                let magnetUhluPreskocit = false;
                // Navázané příčky, které se při tomhle posunu povezou se stěnou
                let detiNaVezeni = null;
                // Vývoj editor: respektuj constraint (T-junction = 1D slide, frozen = block)
                if (initialData.vyvojMode) {
                    const c = this.engine.getNodeMovementConstraint(this.draggingNodeId);
                    if (c && c.type === 'frozen') {
                        return; // ignoruj drag
                    }
                    // Napojení „I" — uzel jezdí po čele hostitele mezi lícováním
                    // s jednou a druhou stranou. Magnet cvaká na líc / osu / líc.
                    if (c && c.type === 'slide' && c.cela) {
                        const bod = this._posunPoCele(c, pos);
                        const uzel = this.engine.nodes.get(this.draggingNodeId);
                        if (uzel && bod) {
                            // Bez snapToGrid — mřížka by lícování rozhodila
                            const dx = bod.x - uzel.x, dy = bod.y - uzel.y;
                            uzel.x = bod.x;
                            uzel.y = bod.y;
                            // Volný druhý konec vzít s sebou, ať se stěna posune celá
                            // a nenaklonila se. Navázaný nebo sdílený konec zůstává.
                            const moje = this.engine.getNodeWalls(this.draggingNodeId)[0];
                            if (moje) {
                                const druhyId = moje.nodeA === this.draggingNodeId ? moje.nodeB : moje.nodeA;
                                const druhy = this.engine.nodes.get(druhyId);
                                const vazbaDruhy = moje.nodeA === druhyId ? moje.odConstraint : moje.doConstraint;
                                if (druhy && !vazbaDruhy && this.engine.getNodeWalls(druhyId).length === 1) {
                                    druhy.x += dx;
                                    druhy.y += dy;
                                }
                            }
                        }
                        this._snapPreview = null;
                        this.renderer.render();
                        return;
                    }

                    if (c && c.type === 'slide') {
                        // Okraj / střih rozhoduje _rezimNapojeni() — týž výpočet jako
                        // u prvního napojení, aby stěna neklouzala po jiné čáře, než
                        // na kterou se chytila.
                        const hostWall = this.engine.walls.get(c.host);
                        const rez = this._rezimNapojeni(this.draggingNodeId, hostWall, pos);
                        if (rez) {
                            const hax = rez.hax;
                            target = { x: pos.x, y: pos.y };
                            const scale = this.stage ? this.stage.scaleX() : 1;
                            const walls = this.engine.getNodeWalls(this.draggingNodeId);
                            const hostHalfThk = rez.polotl;
                            const wallBodySign = rez.znamenko;
                            const perpOff = rez.perpOff;
                            const attachMode = rez.rezim;
                            // Uzel navázaný na stěnu patří na její osu/líc a nikam jinam.
                            // Obecný magnet úhlů (vodorovná/svislá) i mřížka ho odsud
                            // stahovaly: u hostitele natočeného po importu o 0,2° srovnaly
                            // stěnu na absolutní svislou a ze spoje vyšlo 89,8° místo 90°.
                            // Úhly si tady řeší vlastní magnet níž — vůči hostiteli.
                            magnetUhluPreskocit = true;
                            // Magnetický snap na standardní úhly (tolerance 12 px podél host osy).
                            // Primární: 45/90/135. Sekundární: 30/60/120/150 (arkýře, šestiúhelníky).
                            // POZN: používáme SIGNED deltaPerp (s ohledem na perpOff v edge módu) —
                            // jinak by snap dával 135°+1° v edge režimu (perp offset posouvá geometrii).
                            let t = this._dragActualT(target.x, target.y, hax);
                            let rightAngleSnap = false;
                            // Společný seznam úhlů (MAGNET_UHLY); 0 a 180 by znamenaly
                            // stěnu ležící v ose hostitele — to tu nedává smysl.
                            const TARGET_ANGLES_DEG = this.MAGNET_UHLY.filter(a => a > 0 && a < 180 && a % 180 !== 0);
                            const snapTolPx = 12 / scale;
                            let bestSnap = null;
                            const rozsah = (tZkus) => this._rozsahNaHostiteli(this.draggingNodeId, hostWall.id, hax, perpOff, tZkus);
                            for (const myWall of walls) {
                                const otherNodeId = myWall.nodeA === this.draggingNodeId ? myWall.nodeB : myWall.nodeA;
                                const otherNode = this.engine.nodes.get(otherNodeId);
                                if (!otherNode) continue;
                                const footT = this._dragActualT(otherNode.x, otherNode.y, hax);
                                // Signed perp distance od host osy k otherNode
                                const dSigned = (otherNode.x - hax.a.x) * hax.perpUx + (otherNode.y - hax.a.y) * hax.perpUy;
                                const deltaPerp = dSigned - perpOff; // target má perp = perpOff
                                if (Math.abs(deltaPerp) < 0.5) continue; // otherNode efektivně na ose — úhel nedefinovaný
                                for (const ang of TARGET_ANGLES_DEG) {
                                    const L = (ang === 90) ? 0 : -deltaPerp / Math.tan(ang * Math.PI / 180);
                                    if (!isFinite(L)) continue;
                                    const candT = footT + L / hax.L;
                                    const r = rozsah(candT);
                                    if (candT < r.od || candT > r.do) continue;
                                    const distPx = Math.abs(t - candT) * hax.L;
                                    if (distPx < snapTolPx && (!bestSnap || distPx < bestSnap.dist)) {
                                        bestSnap = { t: candT, dist: distPx };
                                    }
                                }
                            }
                            if (bestSnap) { t = bestSnap.t; rightAngleSnap = true; }
                            // Mez z geometrie (konec líce minus stopa čela). Stopa závisí
                            // na úhlu stěny a ten na poloze uzlu — proto dvakrát.
                            let tc = t;
                            for (let i = 0; i < 2; i++) { const r = rozsah(tc); tc = Math.max(r.od, Math.min(r.do, t)); }
                            target = {
                                x: hax.a.x + tc * hax.dx + hax.perpUx * perpOff,
                                y: hax.a.y + tc * hax.dy + hax.perpUy * perpOff,
                            };
                            // State pro vizuální indikátory + update stored t
                            this._rightAngleNodeId = rightAngleSnap ? this.draggingNodeId : null;
                            this._attachMode = attachMode;
                            this._attachSlideInfo = {
                                ax: hax.a.x, ay: hax.a.y, dx: hax.dx, dy: hax.dy,
                                L: hax.L, L2: hax.L2, perpUx: hax.perpUx, perpUy: hax.perpUy,
                                hostHalfThk, wallBodySign, tc,
                            };
                            for (const w of walls) {
                                const isEndA = w.nodeA === this.draggingNodeId;
                                const ck = isEndA ? 'odConstraint' : 'doConstraint';
                                if (w[ck]) w[ck] = { ...w[ck], t: tc };
                            }
                        }
                    } else if (c === null) {
                        // Volný node — preview snap kandidáta + magnetický úhel, pokud
                        // druhý konec wallu je ukotven (slide constraint na host).
                        const wallsAtNode = this.engine.getNodeWalls(this.draggingNodeId);
                        const scale = this.stage ? this.stage.scaleX() : 1;
                        // Strop ve výkrese: bez něj dosah při odzoomování rostl
                        // bez omezení (scale 0,5 → půl metru) a konec se chytal
                        // i na odvrácený líc zdi nebo na stěnu, která vedle
                        // vůbec není. Přiblížením se dosah dál zmenšuje.
                        const tol = Math.min(20 / scale, this.engine.MAGNET_DIST * 1.5);
                        // Napojení „I" na čelo souosé stěny má přednost — kurzor
                        // se rovnou přitáhne na čelo (líc/osa/líc) a náhled ukáže,
                        // kam to sedne. Bez toho by se konec choval jako volný a
                        // po puštění skočil na osu.
                        const celo = this._kandidatCela(this.draggingNodeId, target);
                        if (celo) {
                            target = celo.bod;
                            this._snapPreview = {
                                cela: true, line: celo.line, zobrazLine: celo.zobrazLine, point: celo.bod,
                                wall: celo.host, t: celo.konec === 'A' ? 0 : 1,
                            };
                            magnetUhluPreskocit = true;   // pozice je daná čelem, mřížka ani úhel do ní nesmí
                        } else if (wallsAtNode.length <= 1) {
                            // Blízký uzel má přednost před napojením na stěnu: spojit
                            // konce (zavřít obrys) je častější gesto a přichycení na
                            // líc by konec odtáhlo mimo dosah sloučení — obrys pak
                            // nešel uzavřít vůbec.
                            let uzelNablizku = null;
                            for (const jiny of this.engine.nodes.values()) {
                                if (jiny.id === this.draggingNodeId) continue;
                                if (wallsAtNode.some(w => w.nodeA === jiny.id || w.nodeB === jiny.id)) continue;
                                // dosah v pixelech obrazovky, jako ostatní přichytávání
                                if (Math.hypot(target.x - jiny.x, target.y - jiny.y) < 15 / scale) { uzelNablizku = jiny; break; }
                            }
                            // Dosah se měří od POVRCHU stěny, aby šlo přichytit se na
                            // líc i zvenčí — ne teprve po zajetí kurzoru do stěny.
                            const cand = uzelNablizku
                                ? null
                                : this.engine.findSnapCandidate(target.x, target.y, tol, this.draggingNodeId, true);
                            const rez = cand && this._rezimNapojeni(this.draggingNodeId, cand.wall, target);
                            if (rez) {
                                // Bod leží na líci (okraj), nebo na ose (střih), a drží
                                // magnetovaný úhel. Náhled i výsledek z jednoho výpočtu —
                                // po puštění tedy zůstane přesně to, co náhled slíbil.
                                const podUhlem = this._bodNaStenePodUhlem(this.draggingNodeId, cand.wall, target, rez.perpOff);
                                const bod = podUhlem ? podUhlem.bod : {
                                    x: rez.hax.a.x + cand.t * rez.hax.dx + rez.hax.perpUx * rez.perpOff,
                                    y: rez.hax.a.y + cand.t * rez.hax.dy + rez.hax.perpUy * rez.perpOff,
                                };
                                const tc = Math.max(0.02, Math.min(0.98, this._dragActualT(bod.x, bod.y, rez.hax)));
                                target = bod;
                                this._attachMode = rez.rezim;
                                this._snapPreview = {
                                    wall: cand.wall, t: tc, point: bod, rezim: rez.rezim,
                                    line: this._caraLice(rez.hax, rez.perpOff),
                                };
                                magnetUhluPreskocit = true;   // pozici určil spoj, mřížka ani úhel do ní nesmí
                            } else {
                                this._snapPreview = null;
                                this._attachMode = null;
                            }
                        } else {
                            this._snapPreview = null;
                        }
                        // Magnetický úhel — ray snap podle host osy druhého endpointu
                        // Včetně 180° (kolineární, opačný směr) a 0° (kolineární, stejný směr).
                        // Společný seznam úhlů (MAGNET_UHLY) — paprsky se zkoušejí
                        // na obě strany, takže stačí hodnoty do 180°.
                        const TARGET_ANGLES_DEG = this.MAGNET_UHLY.filter(a => a <= 180);
                        const snapTolPx = 12 / scale;
                        let bestSnap = null;
                        for (const myWall of wallsAtNode) {
                            const otherCon = myWall.nodeA === this.draggingNodeId ? myWall.doConstraint : myWall.odConstraint;
                            if (!otherCon) continue;
                            const hostW = this.engine.walls.get(otherCon.host);
                            if (!hostW) continue;
                            const ha = this.engine.nodes.get(hostW.nodeA);
                            const hb = this.engine.nodes.get(hostW.nodeB);
                            if (!ha || !hb) continue;
                            const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
                            const hL = Math.hypot(hdx, hdy);
                            if (hL === 0) continue;
                            const hux = hdx / hL, huy = hdy / hL;
                            const otherNodeId = myWall.nodeA === this.draggingNodeId ? myWall.nodeB : myWall.nodeA;
                            const otherNode = this.engine.nodes.get(otherNodeId);
                            if (!otherNode) continue;
                            const projT = ((otherNode.x - ha.x) * hdx + (otherNode.y - ha.y) * hdy) / (hL * hL);
                            const Ax = ha.x + projT * hdx, Ay = ha.y + projT * hdy;
                            for (const ang of TARGET_ANGLES_DEG) {
                                // 0° a 180° jsou symetrické — jeden paprsek stačí
                                const signs = (ang === 0 || ang === 180) ? [1] : [1, -1];
                                for (const sign of signs) {
                                    const angRad = sign * ang * Math.PI / 180;
                                    const cosA = Math.cos(angRad), sinA = Math.sin(angRad);
                                    const rayX = hux * cosA - huy * sinA;
                                    const rayY = hux * sinA + huy * cosA;
                                    const relX = target.x - Ax, relY = target.y - Ay;
                                    const alongLen = relX * rayX + relY * rayY;
                                    if (alongLen < 1) continue;
                                    const projX = Ax + alongLen * rayX;
                                    const projY = Ay + alongLen * rayY;
                                    const dist = Math.hypot(target.x - projX, target.y - projY);
                                    if (dist < snapTolPx && (!bestSnap || dist < bestSnap.dist)) {
                                        bestSnap = { x: projX, y: projY, dist };
                                    }
                                }
                            }
                        }
                        if (bestSnap) {
                            target = { x: bestSnap.x, y: bestSnap.y };
                            this._rightAngleNodeId = this.draggingNodeId;
                        } else if (this._rightAngleNodeId === this.draggingNodeId) {
                            this._rightAngleNodeId = null;
                        }
                    }
                }
                // Stěna s navázanými příčkami se dřív směla posouvat JEN po své ose,
                // aby příčky zůstaly přesně na místě. Zvenčí to ale vypadalo, že je
                // stěna pořád přichycená — nešla odtáhnout do strany ani po odpojení
                // rohu a nebylo poznat proč. Nově se příčky vezou s sebou: drží si
                // svoje místo na stěně (uložené t) a stěna jde posouvat volně.
                if (initialData.vyvojMode) {
                    const naVezeni = [];
                    for (const hostWall of this.engine.getNodeWalls(this.draggingNodeId)) {
                        for (const ch of this.engine.getTChildren(hostWall.id)) {
                            const vazba = ch.end === 'a' ? ch.wall.odConstraint : ch.wall.doConstraint;
                            if (!vazba || vazba.konec) continue;   // napojení na čelo se neveze
                            const uzelDiteteId = ch.end === 'a' ? ch.wall.nodeA : ch.wall.nodeB;
                            const uD = this.engine.nodes.get(uzelDiteteId);
                            const hA = this.engine.nodes.get(hostWall.nodeA);
                            const hB = this.engine.nodes.get(hostWall.nodeB);
                            if (!uD || !hA || !hB) continue;
                            // Kolmé odsazení od osy hostitele je součást polohy příčky —
                            // napojená na líc musí na líci zůstat, i když se hostitelem hne.
                            const hL = Math.hypot(hB.x - hA.x, hB.y - hA.y) || 1;
                            const odsazeni = ((uD.x - hA.x) * (-(hB.y - hA.y)) + (uD.y - hA.y) * (hB.x - hA.x)) / hL;
                            // Vzdálený konec příčky a její směr — podle nich se příčka
                            // při pohybu hostitele jen prodlouží/zkrátí po své ose,
                            // místo aby se naklonila (viz níž).
                            const dalekyId = ch.end === 'a' ? ch.wall.nodeB : ch.wall.nodeA;
                            const daleky = this.engine.nodes.get(dalekyId);
                            let smer = null;
                            if (daleky) {
                                const sx = uD.x - daleky.x, sy = uD.y - daleky.y;
                                const sL = Math.hypot(sx, sy);
                                if (sL > 1) smer = { x: sx / sL, y: sy / sL };
                            }
                            naVezeni.push({
                                hostId: hostWall.id,
                                stenaId: ch.wall.id,
                                konec: ch.end,
                                uzelId: uzelDiteteId,
                                dalekyId, smer,
                                t: vazba.t,
                                odsazeni,
                            });
                        }
                    }
                    if (naVezeni.length) detiNaVezeni = naVezeni;
                }
                // T-child LIMIT pro node drag: kontrola zda by pohyb
                // uzlu nepřesunul T-children stěn na uzlu mimo [0, 1]
                // (aka kterýkoli T-child by se vytlačil mimo svou osu).
                // Když příčky vezeme s sebou, ořezávat pohyb netřeba.
                if (initialData.vyvojMode && !detiNaVezeni) {
                    const nodeObj = this.engine.nodes.get(this.draggingNodeId);
                    if (nodeObj) {
                        const nA = nodeObj;
                        const origX = nA.x, origY = nA.y;
                        const reqDx = target.x - origX;
                        const reqDy = target.y - origY;
                        if (Math.abs(reqDx) > 0.01 || Math.abs(reqDy) > 0.01) {
                            const wallsOnDrag = this.engine.getNodeWalls(this.draggingNodeId);
                            let tcFactor = 1.0;
                            for (const hostWall of wallsOnDrag) {
                                const children = this.engine.getTChildren(hostWall.id);
                                if (children.length === 0) continue;
                                const otherEndId = hostWall.nodeA === this.draggingNodeId ? hostWall.nodeB : hostWall.nodeA;
                                const otherNode = this.engine.nodes.get(otherEndId);
                                if (!otherNode) continue;
                                for (const ch of children) {
                                    const childNodeId = ch.end === 'a' ? ch.wall.nodeA : ch.wall.nodeB;
                                    const childNode = this.engine.nodes.get(childNodeId);
                                    if (!childNode) continue;
                                    // Spočítat initial perp vzdálenost childNode od současné
                                    // host osy (počítáno s dragovaným node jako aktuální).
                                    const initHdx = otherNode.x - origX, initHdy = otherNode.y - origY;
                                    const initL2 = initHdx * initHdx + initHdy * initHdy;
                                    if (initL2 === 0) continue;
                                    const initL = Math.sqrt(initL2);
                                    const initPerp = Math.abs(((childNode.x - origX) * (-initHdy) + (childNode.y - origY) * initHdx) / initL);
                                    // Tolerance = initial perp + 1 px. Motion může perp udržet
                                    // nebo zmenšit, ale ne podstatně zhoršit (jinak T-junction
                                    // visuálně odjede od hostitele).
                                    const perpTol = initPerp + 1.0;
                                    const checkS = (s) => {
                                        const nAx = origX + reqDx * s, nAy = origY + reqDy * s;
                                        const hdx = otherNode.x - nAx, hdy = otherNode.y - nAy;
                                        const L2 = hdx * hdx + hdy * hdy;
                                        if (L2 === 0) return false;
                                        const L = Math.sqrt(L2);
                                        const t = ((childNode.x - nAx) * hdx + (childNode.y - nAy) * hdy) / L2;
                                        if (t < 0 || t > 1) return false;
                                        const perp = Math.abs(((childNode.x - nAx) * (-hdy) + (childNode.y - nAy) * hdx) / L);
                                        return perp <= perpTol;
                                    };
                                    if (!checkS(1.0)) {
                                        let lo = 0, hi = 1;
                                        for (let k = 0; k < 20; k++) {
                                            const mid = (lo + hi) / 2;
                                            if (checkS(mid)) lo = mid; else hi = mid;
                                        }
                                        if (lo < tcFactor) tcFactor = Math.max(0, lo);
                                    }
                                }
                            }
                            // Dřív se pohyb v tomhle místě ořízl (tcFactor), aby navázané
                            // příčky zůstaly na svém místě. Stěna pak ale šla odtáhnout
                            // jen o kousek a vypadalo to, že je pořád přichycená — bez
                            // zjevného důvodu. Místo blokování vezmeme příčky s sebou:
                            // drží si svoje místo na stěně (uložené t) a jedou s ní.
                    if (tcFactor < 1.0) {
                                detiNaVezeni = [];
                                for (const hostWall of wallsOnDrag) {
                                    for (const ch of this.engine.getTChildren(hostWall.id)) {
                                        const vazba = ch.end === 'a' ? ch.wall.odConstraint : ch.wall.doConstraint;
                                        if (!vazba || vazba.konec) continue;   // napojení na čelo se neveze
                                        detiNaVezeni.push({
                                            hostId: hostWall.id,
                                            uzelId: ch.end === 'a' ? ch.wall.nodeA : ch.wall.nodeB,
                                            t: vazba.t,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                // Magnet na běžné úhly (90°, 45°, 30°…). Bez něj vznikají stěny
                // typu 90,5°, které vypadají jako pravý úhel, ale nejsou.
                // Neaplikuje se, když zabral constraint snap — ten má vlastní úhly.
                let magnetUhluZabral = false;
                if (!magnetUhluPreskocit && this._rightAngleNodeId !== this.draggingNodeId) {
                    const snapnuty = this._magnetUhlu(this.draggingNodeId, target);
                    if (snapnuty) { target = snapnuty; magnetUhluZabral = true; }
                }

                // Pokud magnetický úhel snap aktivní, obejít grid snap — jinak by
                // snapToGrid posunul uzel z přesné pozice a zobrazený úhel by ukázal
                // 44° místo 45° atd.
                if (this._rightAngleNodeId === this.draggingNodeId || magnetUhluZabral || magnetUhluPreskocit) {
                    const _n = this.engine.nodes.get(this.draggingNodeId);
                    if (_n) { _n.x = target.x; _n.y = target.y; }
                } else {
                    this.engine.moveNode(this.draggingNodeId, target.x, target.y);
                }

                // Příčky navázané na posouvanou stěnu se PRODLUŽUJÍ A ZKRACUJÍ:
                // drží si svůj směr i vzdálený konec a jejich napojený konec jede
                // po (posunuté) ose hostitele — tedy přesně tam, kde se obě osy
                // protnou. Stejná úvaha jako u srovnání rohu: stěna mění délku po
                // své ose, ne polohu napříč. Dřív se příčka vezla na uloženém t,
                // takže se s hostitelem naklápěla.
                if (detiNaVezeni && detiNaVezeni.length) {
                    for (const dite of detiNaVezeni) {
                        const hostStena = this.engine.walls.get(dite.hostId);
                        const uzelDitete = this.engine.nodes.get(dite.uzelId);
                        if (!hostStena || !uzelDitete) continue;
                        const a = this.engine.nodes.get(hostStena.nodeA);
                        const b = this.engine.nodes.get(hostStena.nodeB);
                        if (!a || !b) continue;
                        const hx = b.x - a.x, hy = b.y - a.y;
                        const hL2 = hx * hx + hy * hy;
                        const dL = Math.sqrt(hL2) || 1;
                        const kx = -hy / dL, ky = hx / dL;
                        const odsaz = dite.odsazeni || 0;
                        // Čára, po které má konec příčky zůstat (osa, nebo líc hostitele)
                        const lx = a.x + kx * odsaz, ly = a.y + ky * odsaz;
                        const daleky = dite.dalekyId ? this.engine.nodes.get(dite.dalekyId) : null;
                        let hotovo = false;
                        if (daleky && dite.smer && hL2 > 0) {
                            const jmenovatel = dite.smer.x * hy - dite.smer.y * hx;
                            if (Math.abs(jmenovatel) > 1e-9) {
                                const krok = ((lx - daleky.x) * hy - (ly - daleky.y) * hx) / jmenovatel;
                                const px = daleky.x + dite.smer.x * krok;
                                const py = daleky.y + dite.smer.y * krok;
                                const t = ((px - a.x) * hx + (py - a.y) * hy) / hL2;
                                // Jen když příčka zůstane v rozsahu hostitele a nepřevrátí se
                                if (krok > 1 && t > 0.02 && t < 0.98) {
                                    uzelDitete.x = px;
                                    uzelDitete.y = py;
                                    const stena = this.engine.walls.get(dite.stenaId);
                                    if (stena) {
                                        const ck = dite.konec === 'a' ? 'odConstraint' : 'doConstraint';
                                        if (stena[ck]) stena[ck] = { ...stena[ck], t };
                                    }
                                    hotovo = true;
                                }
                            }
                        }
                        if (!hotovo) {
                            // Rovnoběžná s hostitelem nebo mimo jeho rozsah — nechat ji
                            // na jejím místě na stěně (uložené t), ať nikam neuteče.
                            uzelDitete.x = a.x + hx * dite.t + kx * odsaz;
                            uzelDitete.y = a.y + hy * dite.t + ky * odsaz;
                        }
                    }
                }

                // T-children a otvory na stěně dragged node zachovávají
                // ABSOLUTNÍ pozici (neposouvají se se stěnou). Po pohybu
                // node synchronizujeme jejich stored t/pozice s new host axis.
                if (initialData.vyvojMode) {
                    const PX_PER_M = this.engine.PX_PER_M;
                    const wallsOfDraggedNode = this.engine.getNodeWalls(this.draggingNodeId);
                    const vezeneHosty = new Set((detiNaVezeni || []).map(d => d.hostId));
                    for (const hostW of wallsOfDraggedNode) {
                        // Sync T-children t na novou osu (zachovává absolute pozici children).
                        // U vezených příček se t nepřepočítává — to je jejich místo na stěně.
                        if (!vezeneHosty.has(hostW.id)) this.engine.syncTChildrenT(hostW.id);
                        // Přepočítat pozice otvorů (zachovává absolute pozice)
                        const oldA = oldNodePosForDrag.get(hostW.nodeA);
                        const oldB = oldNodePosForDrag.get(hostW.nodeB);
                        const newA = this.engine.nodes.get(hostW.nodeA);
                        const newB = this.engine.nodes.get(hostW.nodeB);
                        if (oldA && oldB && newA && newB) {
                            const oldDx = oldB.x - oldA.x, oldDy = oldB.y - oldA.y;
                            const oldLen = Math.hypot(oldDx, oldDy);
                            const newDx = newB.x - newA.x, newDy = newB.y - newA.y;
                            const newLen = Math.hypot(newDx, newDy);
                            if (oldLen > 0 && newLen > 0) {
                                for (const op of this.engine.openings.values()) {
                                    if (op.wallId !== hostW.id) continue;
                                    const oldAbsX = oldA.x + (oldDx / oldLen) * op.pozice * PX_PER_M;
                                    const oldAbsY = oldA.y + (oldDy / oldLen) * op.pozice * PX_PER_M;
                                    const relX = oldAbsX - newA.x, relY = oldAbsY - newA.y;
                                    const newP = (relX * (newDx / newLen) + relY * (newDy / newLen)) / PX_PER_M;
                                    const maxP = (newLen / PX_PER_M) - op.sirka;
                                    op.pozice = Math.max(0, Math.min(maxP, newP));
                                }
                            }
                        }
                    }
                }

                // Vizuální overlays — vyčistit předchozí
                if (this._attachOverlayGroup) { this._attachOverlayGroup.destroy(); this._attachOverlayGroup = null; }

                if (initialData.vyvojMode && this._attachSlideInfo) {
                    const scale = this.stage.scaleX();
                    const info = this._attachSlideInfo;
                    const group = new Konva.Group();
                    // Obě čáry jsou zelené jako každé jiné přichytávání — střih
                    // i napojení na líc jsou rovnocenné výsledky, ne varování.
                    // Aktivní z nich je výrazná, druhá jen slabě napovídá.
                    const ZELENA = '#10b981';
                    group.add(new Konva.Line({
                        points: [info.ax, info.ay, info.ax + info.dx, info.ay + info.dy],
                        stroke: ZELENA,
                        strokeWidth: (this._attachMode === 'strih' ? 2.5 : 1.2) / scale,
                        dash: [6 / scale, 4 / scale],
                        opacity: this._attachMode === 'strih' ? 1.0 : 0.5,
                    }));
                    // Líc hostitele — jen ten BLIŽŠÍ, protilehlý není v nabídce
                    if (info.hostHalfThk > 0 && info.wallBodySign !== 0) {
                        const ox = info.perpUx * info.wallBodySign * info.hostHalfThk;
                        const oy = info.perpUy * info.wallBodySign * info.hostHalfThk;
                        group.add(new Konva.Line({
                            points: [info.ax + ox, info.ay + oy, info.ax + info.dx + ox, info.ay + info.dy + oy],
                            stroke: ZELENA,
                            strokeWidth: (this._attachMode === 'okraj' ? 2.5 : 1.2) / scale,
                            dash: [6 / scale, 4 / scale],
                            opacity: this._attachMode === 'okraj' ? 1.0 : 0.5,
                        }));
                    }
                    // Nůžky (✂) u uzlu říkají, že puštění hostitele rozstřihne
                    if (this._attachMode === 'strih') {
                        const n = this.engine.nodes.get(this.draggingNodeId);
                        if (n) {
                            group.add(new Konva.Text({
                                x: n.x - 38 / scale,
                                y: n.y - 34 / scale,
                                text: '\u2702',
                                fontSize: 24 / scale,
                                fill: ZELENA,
                            }));
                        }
                    }
                    // POZN: úhly u dragged nodu vykresluje dofIndicator (blade) přes
                    // selection walls — viz setSelection v aktivaci node drag. Zde už
                    // arc nekreslíme, aby neduplikoval metodiku a nedržel se driftovaného uzlu.
                    this.renderer.selectionLayer.add(group);
                    this._attachOverlayGroup = group;
                }

                this.renderer.render();
                if (this._attachOverlayGroup) this.renderer.selectionLayer.batchDraw();
                return;
            }

            // Dragging wall (nebo celý výběr)
            if (this.isDraggingWall && this.draggingWallId) {
                let dx = pos.x - this.dragWallStart.x;
                let dy = pos.y - this.dragWallStart.y;

                // Pokud je vybráno víc stěn (multi-select celého objektu), přeskočit
                // constraint/collision projekce — uživatel chce volně posouvat celý výběr.
                const isMultiSelect = this.renderer.selectedWalls.size > 1 && this.renderer.selectedWalls.has(this.draggingWallId);
                const w = this.engine.walls.get(this.draggingWallId);
                const engine = this.engine;
                if (initialData.vyvojMode && !isMultiSelect && w) {
                    // RULE #10: endpoint-axis projekce (drag jen ve směru povoleném oběma endpointy)
                    const axisA = this._dragEndpointAxis(w.nodeA, w.odConstraint, this.draggingWallId);
                    const axisB = this._dragEndpointAxis(w.nodeB, w.doConstraint, this.draggingWallId);
                    if (axisA.type === 'frozen' || axisB.type === 'frozen') {
                        dx = 0; dy = 0;
                    } else {
                        if (axisA.type === 'axis') { const p = this._dragProject(dx, dy, axisA.dx, axisA.dy); dx = p.dx; dy = p.dy; }
                        if (axisB.type === 'axis') { const p = this._dragProject(dx, dy, axisB.dx, axisB.dy); dx = p.dx; dy = p.dy; }
                    }
                    // RULE #11: HOST perpendicular — stěna s T-children se hýbe jen kolmo
                    if (this.engine.getTChildren(this.draggingWallId).length > 0) {
                        const a = this.engine.nodes.get(w.nodeA);
                        const b = this.engine.nodes.get(w.nodeB);
                        if (a && b) {
                            const wdx = b.x - a.x, wdy = b.y - a.y;
                            if (wdx || wdy) {
                                const p = this._dragProject(dx, dy, -wdy, wdx);
                                dx = p.dx; dy = p.dy;
                            }
                        }
                    }
                    // RULE #12 + #13: corner cap + initial actual t tolerance
                    if (w.odConstraint || w.doConstraint) {
                        const initT = this._dragInitialT || {};
                        // Napojení na čelo se neřídí parametrem t podél hostitele —
                        // jezdí po jeho čele a dál než na líc nesmí.
                        const applyCeloLimit = (node, constraint) => {
                            if (!node || !constraint || !constraint.konec) return;
                            const celo = this.engine.celoHostitele(constraint.host, constraint.konec, w.tloustka);
                            if (!celo) return;
                            const kx = celo.kolmice.x, ky = celo.kolmice.y;
                            const u0 = (node.x - celo.stred.x) * kx + (node.y - celo.stred.y) * ky;
                            const u1 = Math.max(-celo.dosah, Math.min(celo.dosah, u0 + dx * kx + dy * ky));
                            dx = (u1 - u0) * kx;
                            dy = (u1 - u0) * ky;
                        };
                        const applyCornerLimit = (node, constraint, initActualT) => {
                            if (!node || !constraint || constraint.konec) return;
                            const ax = this._dragHostAxis(constraint.host);
                            if (!ax) return;
                            const along_req = (dx * ax.dx + dy * ax.dy) / ax.L2;
                            const perp_dx = dx - along_req * ax.dx;
                            const perp_dy = dy - along_req * ax.dy;
                            const current_t = this._dragActualT(node.x, node.y, ax);
                            const new_t = current_t + along_req;
                            const cap = constraint.t;
                            let lower = 0, upper = 1;
                            if (cap > 0.9) {
                                const initMax = (typeof initActualT === 'number') ? initActualT : cap;
                                upper = Math.min(1, Math.max(cap, initMax) + 0.003);
                            } else if (cap < 0.1) {
                                const initMin = (typeof initActualT === 'number') ? initActualT : cap;
                                lower = Math.max(0, Math.min(cap, initMin) - 0.003);
                            }
                            let target_t;
                            if (current_t > upper) {
                                target_t = Math.min(current_t, Math.max(lower, new_t));
                            } else if (current_t < lower) {
                                target_t = Math.max(current_t, Math.min(upper, new_t));
                            } else {
                                if (new_t >= lower && new_t <= upper) return;
                                target_t = Math.max(lower, Math.min(upper, new_t));
                            }
                            const along_delta = target_t - current_t;
                            dx = along_delta * ax.dx + perp_dx;
                            dy = along_delta * ax.dy + perp_dy;
                        };
                        applyCeloLimit(this.engine.nodes.get(w.nodeA), w.odConstraint);
                        applyCeloLimit(this.engine.nodes.get(w.nodeB), w.doConstraint);
                        applyCornerLimit(this.engine.nodes.get(w.nodeA), w.odConstraint, initT.a);
                        applyCornerLimit(this.engine.nodes.get(w.nodeB), w.doConstraint, initT.b);
                    }
                    // POZN: constraint.t se BĚHEM drag NEaktualizuje — stored t
                    // představuje PARSER-DANÉ ukotvení (často t=0.98 u rohu).
                    // Uživatel chce, aby ukotvení viselo vizuálně na kraji
                    // hostitele i když se stěna fyzicky posouvá. Physical
                    // slide pozice je dána node.x/y, stored t je jen marker
                    // pro propagateTChildren (když by se hostitel hýbal).

                    // COLLISION: stěna se nesmí srazit s jinou. Kontrolujeme
                    // pouze axis-aligned kolize (běžné v půdorysech). Pro každou
                    // jinou stěnu spočítáme maximální faktor t ∈ [0, 1] pohybu
                    // tak, aby surface nebyly blíž než součet half-thicknesses.
                    if (w && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
                        const nA = this.engine.nodes.get(w.nodeA);
                        const nB = this.engine.nodes.get(w.nodeB);
                        if (nA && nB) {
                            const w1_thk_half = (w.tloustka * engine.PX_PER_M) / 2;
                            // Is w1 horizontal or vertical?
                            const w1_horiz = Math.abs(nA.y - nB.y) < 0.5;
                            const w1_vert = Math.abs(nA.x - nB.x) < 0.5;
                            if (w1_horiz || w1_vert) {
                                // Stěny, které se s taženou vezou (její příčky) nebo po
                                // kterých klouže (její hostitelé), nejsou překážka —
                                // pohybují se spolu s ní. Dokud se počítaly, stačilo mít
                                // příčku na doraz u líce a stěna šla posunout jen na jednu
                                // stranu: na druhé vycházela povolená vůle nula a o
                                // zablokování rozhodlo zaokrouhlení.
                                const vezeneSteny = new Set(engine.getTChildren(w.id).map(ch => ch.wall.id));
                                if (w.odConstraint && w.odConstraint.host) vezeneSteny.add(w.odConstraint.host);
                                if (w.doConstraint && w.doConstraint.host) vezeneSteny.add(w.doConstraint.host);
                                let factor = 1.0;
                                for (const other of this.engine.walls.values()) {
                                    if (other.id === w.id) continue;
                                    if (vezeneSteny.has(other.id)) continue;
                                    // Skip walls sharing a node with w (adjacent L-corners)
                                    if (other.nodeA === w.nodeA || other.nodeA === w.nodeB ||
                                        other.nodeB === w.nodeA || other.nodeB === w.nodeB) continue;
                                    const oA = this.engine.nodes.get(other.nodeA);
                                    const oB = this.engine.nodes.get(other.nodeB);
                                    if (!oA || !oB) continue;
                                    const o_thk_half = (other.tloustka * engine.PX_PER_M) / 2;
                                    const sep = w1_thk_half + o_thk_half;
                                    const o_horiz = Math.abs(oA.y - oB.y) < 0.5;
                                    const o_vert = Math.abs(oA.x - oB.x) < 0.5;
                                    if (w1_horiz && o_horiz) {
                                        // Both horizontal → collision when y's meet
                                        const w1_x_lo = Math.min(nA.x, nB.x);
                                        const w1_x_hi = Math.max(nA.x, nB.x);
                                        const o_x_lo = Math.min(oA.x, oB.x);
                                        const o_x_hi = Math.max(oA.x, oB.x);
                                        if (Math.min(w1_x_hi, o_x_hi) <= Math.max(w1_x_lo, o_x_lo)) continue;
                                        const gap = oA.y - nA.y;
                                        const sign = Math.sign(dy);
                                        if (sign === 0 || Math.sign(gap) !== sign) continue;
                                        const allowed = Math.abs(gap) - sep;
                                        if (allowed <= 0.01) continue;   // na doraz = neomezovat (ne hra zaokrouhlení)
                                        const f = allowed / Math.abs(dy);
                                        if (f < factor) factor = Math.max(0, f);
                                    } else if (w1_horiz && o_vert) {
                                        // Horizontal w1, vertical other
                                        const w1_x_lo = Math.min(nA.x, nB.x);
                                        const w1_x_hi = Math.max(nA.x, nB.x);
                                        if (oA.x < w1_x_lo - sep || oA.x > w1_x_hi + sep) continue;
                                        const o_y_lo = Math.min(oA.y, oB.y);
                                        const o_y_hi = Math.max(oA.y, oB.y);
                                        // Which edge of other to collide with
                                        const sign = Math.sign(dy);
                                        if (sign === 0) continue;
                                        const o_edge = sign > 0 ? o_y_lo : o_y_hi;
                                        const gap = o_edge - nA.y;
                                        if (Math.sign(gap) !== sign) continue;
                                        const allowed = Math.abs(gap) - sep;
                                        if (allowed <= 0.01) continue;   // na doraz = neomezovat (ne hra zaokrouhlení)
                                        const f = allowed / Math.abs(dy);
                                        if (f < factor) factor = Math.max(0, f);
                                    } else if (w1_vert && o_vert) {
                                        const w1_y_lo = Math.min(nA.y, nB.y);
                                        const w1_y_hi = Math.max(nA.y, nB.y);
                                        const o_y_lo = Math.min(oA.y, oB.y);
                                        const o_y_hi = Math.max(oA.y, oB.y);
                                        if (Math.min(w1_y_hi, o_y_hi) <= Math.max(w1_y_lo, o_y_lo)) continue;
                                        const gap = oA.x - nA.x;
                                        const sign = Math.sign(dx);
                                        if (sign === 0 || Math.sign(gap) !== sign) continue;
                                        const allowed = Math.abs(gap) - sep;
                                        if (allowed <= 0.01) continue;   // na doraz = neomezovat (ne hra zaokrouhlení)
                                        const f = allowed / Math.abs(dx);
                                        if (f < factor) factor = Math.max(0, f);
                                    } else if (w1_vert && o_horiz) {
                                        const w1_y_lo = Math.min(nA.y, nB.y);
                                        const w1_y_hi = Math.max(nA.y, nB.y);
                                        if (oA.y < w1_y_lo - sep || oA.y > w1_y_hi + sep) continue;
                                        const o_x_lo = Math.min(oA.x, oB.x);
                                        const o_x_hi = Math.max(oA.x, oB.x);
                                        const sign = Math.sign(dx);
                                        if (sign === 0) continue;
                                        const o_edge = sign > 0 ? o_x_lo : o_x_hi;
                                        const gap = o_edge - nA.x;
                                        if (Math.sign(gap) !== sign) continue;
                                        const allowed = Math.abs(gap) - sep;
                                        if (allowed <= 0.01) continue;   // na doraz = neomezovat (ne hra zaokrouhlení)
                                        const f = allowed / Math.abs(dx);
                                        if (f < factor) factor = Math.max(0, f);
                                    }
                                }
                                if (factor < 1.0) {
                                    dx *= factor;
                                    dy *= factor;
                                }
                            }
                        }
                    }
                }

                // Otvor-squeeze LIMIT: pokud by stěna zkrátila pod součet šířek
                // otvorů (otvory by se v modelu "vagónků" naskládaly a přetekly
                // za druhý konec), zkrátíme drag factor. Řeší i sekvenci drag→push.
                if (initialData.vyvojMode && w && !isMultiSelect && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
                    const movingNodeIds = new Set([w.nodeA, w.nodeB]);
                    const PX_PER_M_val = this.engine.PX_PER_M;
                    let opFactor = 1.0;
                    for (const wall of this.engine.walls.values()) {
                        if (wall.id === this.draggingWallId) continue;
                        const aMoves = movingNodeIds.has(wall.nodeA);
                        const bMoves = movingNodeIds.has(wall.nodeB);
                        if (!aMoves && !bMoves) continue;
                        let totalSirkaPx = 0;
                        for (const o of this.engine.openings.values()) {
                            if (o.wallId === wall.id) totalSirkaPx += o.sirka * PX_PER_M_val;
                        }
                        if (totalSirkaPx === 0) continue;
                        const nA = this.engine.nodes.get(wall.nodeA);
                        const nB = this.engine.nodes.get(wall.nodeB);
                        if (!nA || !nB) continue;
                        const oldLen = Math.hypot(nB.x - nA.x, nB.y - nA.y);
                        const newAx = nA.x + (aMoves ? dx : 0);
                        const newAy = nA.y + (aMoves ? dy : 0);
                        const newBx = nB.x + (bMoves ? dx : 0);
                        const newBy = nB.y + (bMoves ? dy : 0);
                        const newLen = Math.hypot(newBx - newAx, newBy - newAy);
                        if (newLen < totalSirkaPx) {
                            const maxShrink = oldLen - totalSirkaPx;
                            const requestedShrink = oldLen - newLen;
                            if (requestedShrink > 0) {
                                const f = Math.max(0, maxShrink / requestedShrink);
                                if (f < opFactor) opFactor = f;
                            }
                        }
                    }
                    if (opFactor < 1.0) {
                        dx *= opFactor;
                        dy *= opFactor;
                    }
                }

                // T-child LIMIT: pokud deformace hostitele (posun endpointu) by
                // způsobila, že T-child sedí mimo rozsah hostitele (t_actual ∉ [0,1]),
                // omezit drag. Zachová se vizuální napojení W4-W7 apod.
                if (initialData.vyvojMode && w && !isMultiSelect && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
                    const movingNodeIds = new Set([w.nodeA, w.nodeB]);
                    let tcFactor = 1.0;
                    for (const hostWall of this.engine.walls.values()) {
                        if (hostWall.id === this.draggingWallId) continue;
                        const aMoves = movingNodeIds.has(hostWall.nodeA);
                        const bMoves = movingNodeIds.has(hostWall.nodeB);
                        if (!aMoves && !bMoves) continue;
                        // Najít T-children tohoto hosta
                        const children = this.engine.getTChildren(hostWall.id);
                        if (children.length === 0) continue;
                        const nA = this.engine.nodes.get(hostWall.nodeA);
                        const nB = this.engine.nodes.get(hostWall.nodeB);
                        if (!nA || !nB) continue;
                        // Parametrizujeme drag podle faktoru s ∈ [0, 1] a hledáme
                        // nejvyšší s, kde všechny t_actual zůstávají v [0, 1].
                        for (const ch of children) {
                            // Stěna navázaná na ČELO hostitele tenhle limit neřeší:
                            // drží se end-face, ne délky hostitele, a v rohu leží
                            // dokonce kousek ZA jeho koncovým uzlem (t < 0). Dokud
                            // se počítala, jeden takový spoj zmrazil všechny stěny,
                            // které s hostitelem sdílejí uzel — nešly posunout vůbec.
                            const vazbaDitete = ch.end === 'a' ? ch.wall.odConstraint : ch.wall.doConstraint;
                            if (vazbaDitete && vazbaDitete.konec) continue;
                            const childNodeId = ch.end === 'a' ? ch.wall.nodeA : ch.wall.nodeB;
                            const childNode = this.engine.nodes.get(childNodeId);
                            if (!childNode) continue;
                            // t_actual(s) = ((childNode - newA(s)) · (newB(s) - newA(s))) / |newB-newA|²
                            // Kvadratická/racionální v s, těžké analytické řešení.
                            // Bisekce: najít max s ∈ [0, 1] kde t_actual ∈ [0, 1].
                            const checkS = (s) => {
                                const nAx = nA.x + (aMoves ? dx * s : 0);
                                const nAy = nA.y + (aMoves ? dy * s : 0);
                                const nBx = nB.x + (bMoves ? dx * s : 0);
                                const nBy = nB.y + (bMoves ? dy * s : 0);
                                const hdx = nBx - nAx, hdy = nBy - nAy;
                                const L2 = hdx * hdx + hdy * hdy;
                                if (L2 === 0) return false;
                                const t = ((childNode.x - nAx) * hdx + (childNode.y - nAy) * hdy) / L2;
                                return t >= 0 && t <= 1;
                            };
                            if (!checkS(1.0)) {
                                // Příčka, která je MIMO rozsah už teď, nesmí tah
                                // zablokovat: bisekce by skončila na nule a stěna
                                // by ztuhla úplně. Pohybem se nic nezhorší.
                                if (!checkS(0)) continue;
                                // Bisekce v [0, 1]
                                let lo = 0, hi = 1;
                                for (let k = 0; k < 20; k++) {
                                    const mid = (lo + hi) / 2;
                                    if (checkS(mid)) lo = mid; else hi = mid;
                                }
                                if (lo < tcFactor) tcFactor = Math.max(0, lo);
                            }
                        }
                    }
                    if (tcFactor < 1.0) {
                        dx *= tcFactor;
                        dy *= tcFactor;
                    }
                }

                // Magnet volných endpointů při dragu celé stěny — endpoint se
                // přichytí k uzlu nebo ose jiné stěny, i když user nedrží za konec.
                // Platí jen pro single-wall drag s alespoň 1 volným endpointem.
                if (!isMultiSelect && w) {
                    const a = this.engine.nodes.get(w.nodeA);
                    const b = this.engine.nodes.get(w.nodeB);
                    if (a && b) {
                        const nAw = this.engine.getNodeWalls(a.id);
                        const nBw = this.engine.getNodeWalls(b.id);
                        const aFree = nAw.length === 1 && !w.odConstraint;
                        const bFree = nBw.length === 1 && !w.doConstraint;
                        const scale = this.stage ? this.stage.scaleX() : 1;
                        const tol = Math.min(14 / scale, this.engine.MAGNET_DIST * 1.5);
                        const tryMagnet = (nodeId, free) => {
                            if (!free) return null;
                            const n = this.engine.nodes.get(nodeId);
                            const px = n.x + dx, py = n.y + dy;
                            // 0) napojení „I" na čelo souosé stěny — má přednost před
                            //    uzlem, protože uzel by stěnu posadil na osu hostitele.
                            //    Vzdálený konec se veze se stěnou, proto posunutý „odkud".
                            const druhyId = nodeId === a.id ? b.id : a.id;
                            const druhy = this.engine.nodes.get(druhyId);
                            const celo = this._kandidatCela(nodeId, { x: px, y: py },
                                druhy ? { x: druhy.x + dx, y: druhy.y + dy } : null);
                            if (celo) return { delta: { x: celo.bod.x - px, y: celo.bod.y - py }, celo };
                            // 1) node magnet (priority)
                            let best = null, bestD = tol;
                            for (const other of this.engine.nodes.values()) {
                                if (other.id === a.id || other.id === b.id) continue;
                                const d = Math.hypot(px - other.x, py - other.y);
                                if (d < bestD) { bestD = d; best = { x: other.x, y: other.y }; }
                            }
                            if (best) return { delta: { x: best.x - px, y: best.y - py } };
                            // 2) kolmé napojení na stěnu — stejné pravidlo jako při tažení
                            //    za bod: konec sedne na LÍC hostitele, u osy na osu.
                            //    Dřív tudy končil vždy na ose, takže posun celé stěny
                            //    dával jiný výsledek než posun jejího konce.
                            const cand = this.engine.findSnapCandidate(px, py, tol, nodeId, true);
                            const rez = cand && this._rezimNapojeni(nodeId, cand.wall, { x: px, y: py });
                            if (rez) {
                                const bod = {
                                    x: rez.hax.a.x + cand.t * rez.hax.dx + rez.hax.perpUx * rez.perpOff,
                                    y: rez.hax.a.y + cand.t * rez.hax.dy + rez.hax.perpUy * rez.perpOff,
                                };
                                return { delta: { x: bod.x - px, y: bod.y - py } };
                            }
                            return null;
                        };
                        const magA = tryMagnet(a.id, aFree);
                        const magB = tryMagnet(b.id, bFree);
                        // Pick stronger magnet (menší delta = blíž)
                        let pick = null;
                        if (magA && magB) {
                            const dA = Math.hypot(magA.delta.x, magA.delta.y);
                            const dB = Math.hypot(magB.delta.x, magB.delta.y);
                            pick = dA <= dB ? magA : magB;
                        } else {
                            pick = magA || magB;
                        }
                        if (pick) { dx += pick.delta.x; dy += pick.delta.y; }
                        // Zelený náhled napojení „I" se ukáže i při posouvání celé
                        // stěny — přichytávání je stejné jako při tažení za bod.
                        this._snapPreview = (pick && pick.celo)
                            ? { cela: true, line: pick.celo.line, zobrazLine: pick.celo.zobrazLine, point: pick.celo.bod }
                            : null;
                    }
                }

                // Snapshot node pozic před pohybem — pro zachování absolutních
                // pozic otvorů u stěn, jejichž endpoint se posune.
                const oldNodePos = new Map();
                for (const node of this.engine.nodes.values()) {
                    oldNodePos.set(node.id, { x: node.x, y: node.y });
                }

                if (this.renderer.selectedWalls.size > 1 && this.renderer.selectedWalls.has(this.draggingWallId)) {
                    const movedNodes = new Set();
                    for (const wId of this.renderer.selectedWalls) {
                        const wall = this.engine.walls.get(wId);
                        if (!wall) continue;
                        if (!movedNodes.has(wall.nodeA)) {
                            movedNodes.add(wall.nodeA);
                            const n = this.engine.nodes.get(wall.nodeA);
                            if (n) { n.x += dx; n.y += dy; }
                        }
                        if (!movedNodes.has(wall.nodeB)) {
                            movedNodes.add(wall.nodeB);
                            const n = this.engine.nodes.get(wall.nodeB);
                            if (n) { n.x += dx; n.y += dy; }
                        }
                    }

                    // Rigid translation celého půdorysu (Ctrl+A): pokud uživatel vybral
                    // VŠECHNY stěny, posunout i fixní vrcholy místností a vybavení (nábytek).
                    // Bez toho by zůstávaly na původním místě:
                    //   - vrcholy místnosti s fixními {x,y} (open-plan, balkóny — bez 2 zdí poblíž)
                    //   - fallbackX/Y u wallA+wallB vertices (záloha pro selhání průsečíku)
                    //   - vybavení (engine.vybaveni má polygon+stred v metrech, ne v px)
                    // Pro neúplný multi-select (jen část stěn) tohle NEděláme, jinak by se
                    // místnosti deformovaly při lokálních úpravách.
                    if (this.renderer.selectedWalls.size === this.engine.walls.size) {
                        const PX_PER_M = this.engine.PX_PER_M;
                        const dxM = dx / PX_PER_M;
                        const dyM = dy / PX_PER_M;
                        // Celý dům = výkres i s podkladem (uloží se po puštění)
                        if (this.podkladJedeSVyberem?.() && (dx || dy)) {
                            this.podkladPosun(dx, dy);
                            this._podkladPohnut = true;
                        }
                        for (const prostor of (this.engine.prostory || [])) {
                            for (const v of (prostor.vertices || [])) {
                                if (v.refNodeId) continue; // hýbe se s wall nodem
                                if (v.wallA && v.wallB) {
                                    // pozice se počítá z node průsečíku, ale fallback ano
                                    if (typeof v.fallbackX === 'number') v.fallbackX += dx;
                                    if (typeof v.fallbackY === 'number') v.fallbackY += dy;
                                    continue;
                                }
                                if (typeof v.x === 'number') v.x += dx;
                                if (typeof v.y === 'number') v.y += dy;
                            }
                        }
                        for (const vb of (this.engine.vybaveni || [])) {
                            if (Array.isArray(vb.stred)) {
                                vb.stred[0] += dxM;
                                vb.stred[1] -= dyM; // engine používá invertované Y v px → metr osa "+y nahoru"
                            }
                            if (Array.isArray(vb.polygon)) {
                                for (const p of vb.polygon) {
                                    p[0] += dxM;
                                    p[1] -= dyM;
                                }
                            }
                        }
                    }
                } else {
                    // Před pohybem: sync t parametrů T-children podle skutečné
                    // pozice (pro případ, že se pozice rozjely od stored t).
                    if (initialData.vyvojMode) {
                        this.engine.syncTChildrenT(this.draggingWallId);
                    }
                    this.engine.moveWall(this.draggingWallId, dx, dy);
                    if (initialData.vyvojMode) {
                        // Předat dx/dy — T-children se translatují o stejnou
                        // hodnotu (zachová perpendikulární offset od osy).
                        this.engine.propagateTChildren(this.draggingWallId, dx, dy);
                    }
                }

                // Aktualizace otvorů: zachovat absolutní pozice, push-sequence (vagónky).
                // Pro každou stěnu s přesunutým endpointem: 1) spočítat intended pozice
                // každého otvoru (aby absolutní pozice zůstala), 2) projít seřazené
                // otvory od nodeA k nodeB — clamp od min=last_end, 3) poslední otvor
                // (+ sirka) nesmí přetéct za nodeB (bylo by už ošetřeno opFactor limitem,
                // tohle je safety clamp).
                // POZN: pro MULTI-SELECT (rigid translation celého objektu) skipnout —
                // stěny se posouvají společně, otvory se s nimi přirozeně hýbou, žádný
                // přepočet není potřeba. Jinak by otvory klouzaly po stěnách.
                if (isMultiSelect) {
                    this.dragWallStart = { x: pos.x, y: pos.y };
                    this.renderer.render();
                    return;
                }
                const PX_PER_M = this.engine.PX_PER_M;
                const wallsWithMovedEndpoint = new Set();
                for (const wall of this.engine.walls.values()) {
                    const oldA = oldNodePos.get(wall.nodeA);
                    const oldB = oldNodePos.get(wall.nodeB);
                    const newA = this.engine.nodes.get(wall.nodeA);
                    const newB = this.engine.nodes.get(wall.nodeB);
                    if (!oldA || !oldB || !newA || !newB) continue;
                    if (oldA.x !== newA.x || oldA.y !== newA.y || oldB.x !== newB.x || oldB.y !== newB.y) {
                        wallsWithMovedEndpoint.add(wall.id);
                    }
                }
                for (const wallId of wallsWithMovedEndpoint) {
                    const wall = this.engine.walls.get(wallId);
                    if (!wall) continue;
                    const newA = this.engine.nodes.get(wall.nodeA);
                    const newB = this.engine.nodes.get(wall.nodeB);
                    const newDx = newB.x - newA.x, newDy = newB.y - newA.y;
                    const newLen = Math.hypot(newDx, newDy);
                    if (newLen === 0) continue;
                    const newWallLenM = newLen / PX_PER_M;
                    const openingsOnWall = [];
                    for (const o of this.engine.openings.values()) {
                        if (o.wallId === wallId) openingsOnWall.push(o);
                    }
                    // Spočítat intended pozice — použij "drag-start" absolutní pozici
                    // otvoru (zachycenou při aktivaci drag). Tím se otvor vrací
                    // na původní místo když stěna extenduje zpět, nezůstává pushed.
                    const intended = openingsOnWall.map(o => {
                        const abs = this._dragOpeningAbs && this._dragOpeningAbs.get(o.id);
                        if (!abs) return { opening: o, intended: o.pozice };
                        const relX = abs.x - newA.x, relY = abs.y - newA.y;
                        const p = (relX * (newDx / newLen) + relY * (newDy / newLen)) / PX_PER_M;
                        return { opening: o, intended: p };
                    });
                    // Seřadit podle intended ascending (směr od nodeA k nodeB)
                    intended.sort((a, b) => a.intended - b.intended);
                    // Forward pass: push-sequence (každý otvor včetně pouzdra posuvných >= previous.end, >= 0)
                    let lastEnd = 0;
                    for (const x of intended) {
                        const ext = getOpeningExtent(x.opening);
                        // pozice - leftExt >= lastEnd → pozice >= lastEnd + leftExt
                        let p = Math.max(lastEnd + ext.leftExt, x.intended);
                        if (p - ext.leftExt < 0) p = ext.leftExt; // effStart >= 0
                        x.opening.pozice = p;
                        lastEnd = p + ext.rightExt;
                    }
                    // Backward pass: push leftward pokud překročí wall nebo next.effStart
                    let nextStart = newWallLenM;
                    for (let i = intended.length - 1; i >= 0; i--) {
                        const op = intended[i].opening;
                        const ext = getOpeningExtent(op);
                        const maxP = nextStart - ext.rightExt;
                        if (op.pozice > maxP) op.pozice = Math.max(ext.leftExt, maxP);
                        nextStart = op.pozice - ext.leftExt;
                    }
                }

                this.dragWallStart = { x: pos.x, y: pos.y };
                this.renderer.render();
                return;
            }

            // Dragging vybavení (jeden objekt nebo celý vybraný blok). Posouvá se
            // všechno, co je v selectedVybaveni (nebo aspoň aktuálně tažený objekt).
            if (this.isDraggingVybaveni && this.draggingVybaveniId) {
                const dx = pos.x - this.dragVybaveniStart.x;
                const dy = pos.y - this.dragVybaveniStart.y;
                const PX_PER_M = this.engine.PX_PER_M;
                const dxM = dx / PX_PER_M;
                const dyM = dy / PX_PER_M;
                // Engine vybavení: stred a polygon v metrech, +y nahoru. Drag je v px,
                // +y dolů (Konva), takže Y musíme invertovat.
                const ids = this.renderer.selectedVybaveni.size > 0
                    ? this.renderer.selectedVybaveni
                    : new Set([this.draggingVybaveniId]);
                for (const vb of (this.engine.vybaveni || [])) {
                    if (!ids.has(vb.id)) continue;
                    if (Array.isArray(vb.stred)) {
                        vb.stred[0] += dxM;
                        vb.stred[1] -= dyM;
                    }
                    if (Array.isArray(vb.polygon)) {
                        for (const p of vb.polygon) {
                            p[0] += dxM;
                            p[1] -= dyM;
                        }
                    }
                }
                this.dragVybaveniStart = { x: pos.x, y: pos.y };
                this.renderer.render();
                return;
            }

            // Dragging opening (posun po stěně)
            if (this.isDraggingOpening && this.draggingOpeningId) {
                const opening = this.engine.openings.get(this.draggingOpeningId);
                if (opening) {
                    const wall = this.engine.walls.get(opening.wallId);
                    if (wall) {
                        const nA = this.engine.nodes.get(wall.nodeA);
                        const nB = this.engine.nodes.get(wall.nodeB);
                        if (nA && nB) {
                            // Projektovat pozici myši na osu stěny
                            const dx = nB.x - nA.x;
                            const dy = nB.y - nA.y;
                            const len = Math.hypot(dx, dy);
                            const t = ((pos.x - nA.x) * dx + (pos.y - nA.y) * dy) / (len * len);
                            const mousePozice = t * len / this.PX_PER_M;
                            // Aplikovat offset z drag-startu, aby otvor neposkočil
                            const offset = this._dragOpeningOffset || 0;
                            // Respektovat pouzdro posuvných — efektivní footprint musí zůstat uvnitř stěny
                            const ext = getOpeningExtent(opening);
                            const maxP = len / this.PX_PER_M - ext.rightExt;
                            const minP = ext.leftExt;
                            // Otvor klouže plynule. Zaokrouhlení na 10 cm dělalo
                            // při tažení skoky a nešlo trefit místo mezi krokem.
                            opening.pozice = Math.max(minP, Math.min(maxP, mousePozice + offset));
                            this.renderer.render();
                        }
                    }
                }
                return;
            }

            // Metr — preview
            if (this.nastroj === 'metr' && this._metrMeri) {
                const snapped = this.engine.snapPoint(pos.x, pos.y);
                this.metrRender({ x: snapped.x, y: snapped.y });
            }

            // Kreslení stěny — preview
            // Kreslení stěny: jakmile se kurzor vzdálí od výchozího bodu, vznikne
            // SKUTEČNÁ stěna a její konec se odteď táhne jako každý jiný uzel
            // (větev isDraggingNode výš). Kreslení tím dostane stejné magnety,
            // pravé úhly, T-napojení i úhelník jako hotové stěny — jedna logika.
            if (this.kreslimStenu && this.stenaStart && !this.isDraggingNode && !this._stenaUsekId) {
                const snapped = this.engine.snapPoint(pos.x, pos.y);
                if (Math.hypot(snapped.x - this.stenaStart.x, snapped.y - this.stenaStart.y) > this.engine.SNAP_STEP) {
                    this.zacniUsekSteny(snapped);
                }
            }

            // Rubber-band selection (screen space — vždy rovný obdélník)
            if (this.selectionStart) {
                const ptr = this.stage.getPointerPosition();
                this._drawScreenSelectionRect(this.selectionStart.sx, this.selectionStart.sy, ptr.x, ptr.y);
            }
        },

        onMouseDown(e) {
            // Pravé tlačítko nebo posun → pan
            if (e.evt.button === 2 || (e.evt.button === 0 && this.nastroj === 'posun')) {
                e.evt.preventDefault();
                this.isPanning = true;
                this.panStart = { x: e.evt.clientX, y: e.evt.clientY };
                this.stageStartPos = { ...this.stage.position() };
                return;
            }

            if (e.evt.button !== 0) return;

            const pos = this.getPointerPos();
            const hit = this.renderer.hitTest(e.target);

            // Zvýrazňovač — začít kresbu
            if (this.nastroj === 'zvyraznovac') {
                if (e.evt.shiftKey && this._zvyrazLastPt) {
                    // Shift+klik — rovná čára
                    const id = 'Z' + this._zvyrazNextId++;
                    this.zvyrazneniBody.push({
                        id, points: [this._zvyrazLastPt.x, this._zvyrazLastPt.y, pos.x, pos.y]
                    });
                    this._zvyrazLastPt = { x: pos.x, y: pos.y };
                    this.renderZvyrazneni();
                } else {
                    this._zvyrazKresba = { points: [pos.x, pos.y] };
                    this._zvyrazLastPt = { x: pos.x, y: pos.y };
                }
                return;
            }

            if (this.nastroj === 'vyber') {
                // Klik na madlo sloučení → rovnou spojit, žádné tažení
                if (hit.type === 'spoj') {
                    this.spojSteny();
                    return;
                }

                // Klik na rotační madlo → zahájit rotaci (i bez shift, a má přednost)
                if (hit.type === 'rotate') {
                    const bbox = this._rotateBbox();
                    const reason = bbox ? this._rotateBlockedReason() : null;
                    if (!bbox || reason) return;
                    this._pendingDrag = {
                        type: 'rotate',
                        cx: bbox.cx, cy: bbox.cy,
                        startAngle: Math.atan2(pos.y - bbox.cy, pos.x - bbox.cx),
                        startPos: { x: pos.x, y: pos.y },
                    };
                    return;
                }

                // Shift/Ctrl klik → toggle výběr, ne drag
                if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) return;

                // Klik na node → připravit drag (spustí se při pohybu) +
                // ihned vybrat stěny uzlu, aby se hned při uchopení zobrazily úhly
                // (ne až po překročení 3 px threshold).
                if (hit.type === 'node') {
                    const uzelId = this._uzelProTazeni(hit.id);
                    this._pendingDrag = { type: 'node', id: uzelId, startPos: { x: pos.x, y: pos.y } };
                    const _nw = this.engine.getNodeWalls(uzelId);
                    this.renderer.setSelection(_nw.map(w => w.id), [uzelId]);
                    return;
                }

                // Klik na otvor → připravit drag (posun po stěně)
                if (hit.type === 'opening') {
                    if (!this.renderer.selectedOpenings.has(hit.id)) {
                        this.renderer.setSelection([], [], [hit.id]);
                    }
                    this._pendingDrag = { type: 'opening', id: hit.id, startPos: { x: pos.x, y: pos.y } };
                    return;
                }

                // Klik na stěnu → připravit drag (celý výběr pokud je ve výběru)
                if (hit.type === 'wall') {
                    // Pokud stěna není ve výběru, vybrat ji
                    if (!this.renderer.selectedWalls.has(hit.id)) {
                        this.renderer.setSelection([hit.id]);
                    }
                    this._pendingDrag = { type: 'wall', id: hit.id, startPos: { x: pos.x, y: pos.y } };
                    return;
                }

                // Klik na nábytek/vybavení → připravit drag (jeden objekt nebo celý výběr).
                if (hit.type === 'vybaveni') {
                    if (!this.renderer.selectedVybaveni.has(hit.id)) {
                        this.renderer.setSelection([], [], [], [hit.id]);
                    }
                    this._pendingDrag = { type: 'vybaveni', id: hit.id, startPos: { x: pos.x, y: pos.y } };
                    return;
                }

                // Klik na prázdno → rubber-band (screen space pro rovný obdélník)
                if (hit.type === 'empty') {
                    const ptr = this.stage.getPointerPosition();
                    this.selectionStart = { x: pos.x, y: pos.y, sx: ptr.x, sy: ptr.y };
                }
            }
        },

        onMouseUp(e) {
            // POZOR: drag/click-detection větve níže používají `pos.x` / `pos.y`
            // pro výpočet net delta. Bez této deklarace by onMouseUp vyhodila
            // ReferenceError uprostřed wall/opening/vybavení drag větve a drag
            // flag by se nikdy neresetoval — objekt by jezdil s kurzorem dál.
            const pos = this.getPointerPos();

            // Pan konec — flag pro onClick, aby se nezrušil výběr (prohlížeč
            // fires click po mouseup i u pravého tlačítka / Konva.click tap).
            if (this.isPanning) {
                this.isPanning = false;
                this._justPanned = true;
                this.ulozitNastaveni();
                return;
            }

            // Zvýrazňovač — dokončit tah
            if (this._zvyrazKresba && this._zvyrazKresba.points.length >= 4) {
                const id = 'Z' + this._zvyrazNextId++;
                this.zvyrazneniBody.push({ id, points: [...this._zvyrazKresba.points] });
                this._zvyrazKresba = null;
                this._zvyrazLastPt = { x: pos.x, y: pos.y };
                this.renderer.clearTemp();
                this.renderZvyrazneni();
                return;
            }
            this._zvyrazKresba = null;

            // Pending drag zrušen (klik bez tažení) — zpracuje se v onClick
            if (this._pendingDrag) {
                this._pendingDrag = null;
            }

            // Rotace konec — commit + cleanup
            if (this.isRotating) {
                this.isRotating = false;
                this._rotateNodeSnap = null;
                this._rotateVybaveniSnap = null;
                if (this._rotatePodkladSnap) {
                    this._rotatePodkladSnap = null;
                    if (Math.abs(this._rotateDelta || 0) > 1e-6) this.podkladUloz?.();
                }
                // Resync T-children t parametrů pro stěny hostující další stěny ve výběru
                for (const wId of this.renderer.selectedWalls) {
                    this.engine.syncTChildrenT(wId);
                }
                this.renderer.render();
                if (Math.abs(this._rotateDelta || 0) > 1e-6) {
                    const deg = (this._rotateDelta * 180 / Math.PI).toFixed(1);
                    this.autoSave('Rotace ' + deg + '°');
                }
                this._rotateDelta = 0;
                return;
            }

            // Opening drag konec
            if (this.isDraggingOpening) {
                const draggedOpId = this.draggingOpeningId;
                if (this._dragRealOrigin && this._dragRealOrigin.type === 'opening') {
                    const netDist = Math.hypot(pos.x - this._dragRealOrigin.x, pos.y - this._dragRealOrigin.y);
                    if (netDist < 5 && draggedOpId) {
                        this.renderer.setSelection([], [], [draggedOpId]);
                    }
                }
                this._dragRealOrigin = null;
                this.isDraggingOpening = false;
                this.draggingOpeningId = null;
                this.renderer.render();
                this.autoSave('Posun otvoru');
                return;
            }

            // Vybavení drag konec
            if (this.isDraggingVybaveni) {
                const draggedVbId = this.draggingVybaveniId;
                if (this._dragRealOrigin && this._dragRealOrigin.type === 'vybaveni') {
                    const netDist = Math.hypot(pos.x - this._dragRealOrigin.x, pos.y - this._dragRealOrigin.y);
                    if (netDist < 5 && draggedVbId) {
                        this.renderer.setSelection([], [], [], [draggedVbId]);
                    }
                }
                this._dragRealOrigin = null;
                this.isDraggingVybaveni = false;
                this.draggingVybaveniId = null;
                this.dragVybaveniStart = null;
                this.renderer.render();
                this.autoSave('Posun nábytku');
                return;
            }

            // Node drag konec — merge blízkých nodů + auto T-snap (vyvojMode)
            if (this.isDraggingNode) {
                const node = this.engine.nodes.get(this.draggingNodeId);
                if (node) {
                    // Najít sliding hostitele — jeho endpointy vyloučit z merge,
                    // jinak by slide-ukotvený node sloučil s rohem hostitele
                    // a rozbil by strukturu (W4.B se přilepí k W7.A).
                    const slideHostIds = new Set();
                    const nodeWalls = this.engine.getNodeWalls(this.draggingNodeId);
                    for (const w of nodeWalls) {
                        const isEndA = w.nodeA === this.draggingNodeId;
                        const c = isEndA ? w.odConstraint : w.doConstraint;
                        if (c && c.host) {
                            const host = this.engine.walls.get(c.host);
                            if (host) {
                                slideHostIds.add(host.nodeA);
                                slideHostIds.add(host.nodeB);
                            }
                        }
                    }
                    // 0) Napojení „I" na konec souosé stěny jiné tloušťky —
                    //    má přednost před sloučením uzlů, protože sloučení by
                    //    tenčí stěnu natvrdo posadilo na osu tlustší.
                    if (this._napojNaCelo(this.draggingNodeId)) {
                        this.isDraggingNode = false;
                        this.draggingNodeId = null;
                        this._snapPreview = null;
                        this._rightAngleNodeId = null;
                        this._attachMode = null;
                        this._attachSlideInfo = null;
                        if (this._attachOverlayGroup) { this._attachOverlayGroup.destroy(); this._attachOverlayGroup = null; }
                        if (this.nastroj === 'stena' && this.kreslimStenu) {
                            const konecUzel = this.engine.nodes.get(node.id);
                            this.stenaStart = konecUzel ? { x: konecUzel.x, y: konecUzel.y } : this.stenaStart;
                            this._stenaUsekId = null;
                            this._stenaPreskocKlik = true;
                            this.renderer.clearSelection();
                        }
                        this.renderer.render();
                        this.autoSave('Napojení na čelo stěny');
                        return;
                    }

                    // Po puštění stěny odemknout případná nová napojení „I"
                    // (sloučený uzel dvou souosých stěn různé tloušťky).
                    this._odemkniCelaPoUprave = true;

                    // 1) Merge s blízkým nodem (přednost před T-snap)
                    let merged = false;
                    for (const other of this.engine.nodes.values()) {
                        if (other.id === node.id) continue;
                        if (slideHostIds.has(other.id)) continue;  // ne endpointy hostitele
                        // Uzel na PROTĚJŠÍM líci je blíž než dosah magnetu (14 cm zeď
                        // vs. 16 px), takže se konec slučoval přes celou zeď a příčka
                        // skončila na druhé straně — viz naOpacnychLicich.
                        if (this.engine.naOpacnychLicich(node, other)) continue;
                        // Dosah roste s oddálením jako ostatní přichytávání. V kresebných
                        // pixelech znamenal při odzoomovaném pohledu pár pixelů obrazovky
                        // a obrys se pak nedal uzavřít (konec zůstal volný).
                        if (Math.hypot(node.x - other.x, node.y - other.y)
                            < Math.max(this.engine.MAGNET_DIST, 15 / (this.stage ? this.stage.scaleX() : 1))) {
                            // Roh ze dvou konců: dopočítat ho tak, aby úhel seděl přesně.
                            // Samotné sloučení uzlů posadí roh tam, kde byl druhý konec,
                            // takže z pravého úhlu zbude třeba 91°.
                            this._srovnejRohNaUhel(this.draggingNodeId, other);
                            this.engine.mergeNodes(other.id, node.id);
                            merged = true;
                            break;
                        }
                    }
                    // 2) Vývoj editor: T-snap na blízkou stěnu (re-attach).
                    // Pokud už má node slide constraint (attached via T-junction),
                    // PŘESKOČIT — jinak by se node přetáhnul z okraje zpět na osu.
                    const nodeHasConstraint = (() => {
                        const nw = this.engine.getNodeWalls(this.draggingNodeId);
                        return nw.some(w => {
                            const isEndA = w.nodeA === this.draggingNodeId;
                            return isEndA ? !!w.odConstraint : !!w.doConstraint;
                        });
                    })();
                    // Napojí se přesně to, co ukazoval zelený náhled (líc, nebo osa
                    // u střihu). Dřív se poloha po puštění počítala znovu a konec pak
                    // skočil na osu, i když se náhled chytal na líc.
                    const nahled = this._snapPreview;
                    if (!merged && !nodeHasConstraint && initialData.vyvojMode
                        && nahled && nahled.wall && !nahled.cela && nahled.point) {
                        node.x = nahled.point.x;
                        node.y = nahled.point.y;
                        for (const w of this.engine.getNodeWalls(this.draggingNodeId)) {
                            if (w.id === nahled.wall.id) continue;
                            const isEndA = w.nodeA === this.draggingNodeId;
                            const nova = { host: nahled.wall.id, t: nahled.t };
                            if (isEndA) w.odConstraint = nova;
                            else w.doConstraint = nova;
                        }
                    }

                    // 3) Střih — stěna dojela na osu hostitele, takže ho rozdělí na
                    //    dvě a uzel zůstane sdílený. Platí pro první napojení i pro
                    //    pozdější posun už napojené stěny na osu.
                    if (!merged && this._attachMode === 'strih' && initialData.vyvojMode) {
                        const draggingNodeId = this.draggingNodeId;
                        for (const w of this.engine.getNodeWalls(draggingNodeId)) {
                            const isEndA = w.nodeA === draggingNodeId;
                            const ck = isEndA ? 'odConstraint' : 'doConstraint';
                            const vazba = w[ck];
                            if (!vazba || vazba.konec) continue;   // napojení na čelo se nestříhá
                            const noveId = this.engine.splitWall(vazba.host, vazba.t, draggingNodeId);
                            if (noveId) w[ck] = null;   // uzel je teď sdílený, vazba není potřeba
                        }
                    }
                }
                // Srovnat dřív, než se odsud vezme začátek dalšího úseku —
                // jinak by další stěna začala o zlomek pixelu vedle.
                this._srovnejPraveUhly();

                // Kreslení stěny: puštěný konec úseku je začátkem toho dalšího,
                // ať tah plynule pokračuje (případný merge uzlů je už vyřešený výš).
                let dalsiStart = null;
                if (this.nastroj === 'stena' && this.kreslimStenu) {
                    const koncovy = this.engine.nodes.get(this.draggingNodeId);
                    dalsiStart = koncovy
                        ? { x: koncovy.x, y: koncovy.y }
                        : this.engine.snapPoint(pos.x, pos.y);
                }

                this.isDraggingNode = false;
                this.draggingNodeId = null;
                this._snapPreview = null;
                this._rightAngleNodeId = null;
                this._attachMode = null;
                this._attachSlideInfo = null;
                if (this._attachOverlayGroup) { this._attachOverlayGroup.destroy(); this._attachOverlayGroup = null; }

                if (dalsiStart) {
                    this.stenaStart = dalsiStart;
                    this._stenaUsekId = null;
                    this._stenaPreskocKlik = true;   // klik, který úsek dokončil, už bod nepřidává
                    this.renderer.clearSelection();
                }

                if (this._odemkniCelaPoUprave) {
                    this._odemkniCelaPoUprave = false;
                    this.engine.oddelVsechnaCelaNapojeni();
                }

                this.renderer.render();
                this.autoSave(dalsiStart ? 'Nová stěna' : 'Posun bodu');
                return;
            }

            // Wall drag konec
            if (this.isDraggingWall) {
                const draggedId = this.draggingWallId;
                // Drag-as-click detekce: pokud net delta od počátku byla pod 5 px,
                // chápeme to jako klik (uživatel jen pohnul myší při klikání) a
                // redukujeme výběr na ten držený objekt. Bez toho by klik na stěnu
                // ve multi-výběru s nechtěným malým pohybem ponechal celý starý výběr.
                if (this._dragRealOrigin && this._dragRealOrigin.type === 'wall') {
                    const netDist = Math.hypot(pos.x - this._dragRealOrigin.x, pos.y - this._dragRealOrigin.y);
                    if (netDist < 5 && draggedId) {
                        this.renderer.setSelection([draggedId]);
                    }
                }
                // Napojení „I" na čelo souosé stěny vzniká i při posunu CELÉ stěny.
                // Dřív se stěna k čelu jen přimagnetovala, vazba ale nevznikla —
                // po dalším pohybu hostitele se zase odlepila.
                const tazena = this.engine.walls.get(draggedId);
                if (initialData.vyvojMode && tazena && this.renderer.selectedWalls.size <= 1) {
                    for (const uzelId of [tazena.nodeA, tazena.nodeB]) {
                        if (this.engine.getNodeWalls(uzelId).length !== 1) continue;
                        if (this._napojNaCelo(uzelId)) break;
                    }
                }
                this._snapPreview = null;
                this._dragRealOrigin = null;
                this.isDraggingWall = false;
                this.draggingWallId = null;
                this.renderer.render();
                if (this._podkladPohnut) {
                    this._podkladPohnut = false;
                    this.podkladUloz?.();
                }
                this.autoSave('Posun stěny');
                return;
            }

            // Rubber-band konec
            if (this.selectionStart) {
                const ptr = this.stage.getPointerPosition();
                const sx1 = this.selectionStart.sx, sy1 = this.selectionStart.sy;
                const sx2 = ptr.x, sy2 = ptr.y;
                // Čistý klik bez tažení (< 4 px) — nechat onClick zrušit výběr běžným flow
                const dragDist = Math.hypot(sx2 - sx1, sy2 - sy1);
                if (dragDist < 4) {
                    this.selectionStart = null;
                    this.renderer.clearSelectionRect();
                    this._removeScreenSelectionRect();
                    return;
                }
                const transform = this.stage.getAbsoluteTransform().copy().invert();
                const corners = [
                    transform.point({ x: Math.min(sx1, sx2), y: Math.min(sy1, sy2) }),
                    transform.point({ x: Math.max(sx1, sx2), y: Math.min(sy1, sy2) }),
                    transform.point({ x: Math.max(sx1, sx2), y: Math.max(sy1, sy2) }),
                    transform.point({ x: Math.min(sx1, sx2), y: Math.max(sy1, sy2) }),
                ];
                // Pokud není rotace, použít rychlý findInRect, jinak findInPolygon
                const rotation = this.stage.rotation() || 0;
                const result = Math.abs(rotation) < 0.01
                    ? this.engine.findInRect(corners[0].x, corners[0].y, corners[2].x, corners[2].y)
                    : this.engine.findInPolygon(corners);
                const wallIds = result.map(w => w.id);
                // Najít i otvory na vybraných stěnách
                const openingIds = [];
                for (const o of this.engine.openings.values()) {
                    if (wallIds.includes(o.wallId)) openingIds.push(o.id);
                }
                // Najít i vybavení (nábytek) jehož bbox protíná rámeček.
                // Polygon vybavení je v metrech, +y nahoru → konverze na canvas px (+y dolů).
                const PX_PER_M = this.engine.PX_PER_M;
                const rectMinX = Math.min(corners[0].x, corners[2].x);
                const rectMaxX = Math.max(corners[0].x, corners[2].x);
                const rectMinY = Math.min(corners[0].y, corners[2].y);
                const rectMaxY = Math.max(corners[0].y, corners[2].y);
                const vybaveniIds = [];
                for (const vb of (this.engine.vybaveni || [])) {
                    if (!Array.isArray(vb.polygon) || vb.polygon.length === 0) continue;
                    let vbMinX = Infinity, vbMinY = Infinity, vbMaxX = -Infinity, vbMaxY = -Infinity;
                    for (const pt of vb.polygon) {
                        const px = pt[0] * PX_PER_M;
                        const py = -pt[1] * PX_PER_M;
                        if (px < vbMinX) vbMinX = px;
                        if (px > vbMaxX) vbMaxX = px;
                        if (py < vbMinY) vbMinY = py;
                        if (py > vbMaxY) vbMaxY = py;
                    }
                    // AABB intersect (bez rotace stage; rotovaný polygon by potřeboval
                    // findInPolygon — pro nábytek prostý AABB vystačí v 99 % případů).
                    if (vbMaxX < rectMinX || vbMinX > rectMaxX) continue;
                    if (vbMaxY < rectMinY || vbMinY > rectMaxY) continue;
                    vybaveniIds.push(vb.id);
                }
                // Vždy zavolat setSelection — i když rubber-band nepokryl nic, je správné
                // vyčistit původní výběr (uživatel označil prázdnou oblast = chce odznačit).
                this.renderer.setSelection(wallIds, [], openingIds, vybaveniIds);
                this.selectionStart = null;
                this.renderer.clearSelectionRect();
                this._removeScreenSelectionRect();
                // Flag pro onClick: rubber-band právě proběhl, NEzrušit výběr
                // (prohlížeč fires click po mouseup, onClick pak clearSelection()).
                this._justRubberBand = true;
            }
        },

        onClick(e) {
            // Jen levé tlačítko. Pravé slouží k posunu plátna — Konva i po něm
            // pošle click a bez téhle pojistky by se při kreslení přichytil bod.
            // (Dotyk/tap button nemá → undefined projde.)
            if (e.evt && e.evt.button != null && e.evt.button !== 0) return;

            const pos = this.getPointerPos();
            const hit = this.renderer.hitTest(e.target);

            // Stěna nástroj — klik jen zakládá tah. Vlastní úsek vzniká při pohybu
            // (zacniUsekSteny) a dokončí se puštěním myši, stejně jako tažení uzlu.
            if (this.nastroj === 'stena') {
                // Klik, kterým uživatel dokončil úsek, už nový bod nezakládá
                if (this._stenaPreskocKlik) {
                    this._stenaPreskocKlik = false;
                    return;
                }
                if (!this.kreslimStenu) {
                    // Navázání po Esc — seznam úseků se nemaže, ať jimi jde dál
                    // ubírat zpět (vynuluje se až při přepnutí nástroje).
                    this.kreslimStenu = true;
                    this.stenaStart = this.engine.snapPoint(pos.x, pos.y);
                }
                return;
            }

            // Otvor — klik na stěnu ji prorazí v daném místě
            if (this.nastroj === 'otvor') {
                const wall = this.engine.findWallAt(pos.x, pos.y);
                if (!wall) {
                    this.otvorHlaska('Klikněte na stěnu, do které má otvor přijít.');
                    return;
                }
                const nA = this.engine.nodes.get(wall.nodeA);
                const nB = this.engine.nodes.get(wall.nodeB);
                if (!nA || !nB) return;

                const dx = nB.x - nA.x, dy = nB.y - nA.y;
                const L = Math.hypot(dx, dy);
                if (!L) return;
                const delkaM = L / this.engine.PX_PER_M;

                // poloha podél stěny v metrech od nodeA
                let t = ((pos.x - nA.x) * dx + (pos.y - nA.y) * dy) / (L * L);
                let pozice = Math.max(0, Math.min(1, t)) * delkaM;

                if (delkaM < this.otvorSirka) {
                    this.otvorHlaska('Stěna je kratší než otvor — měří jen ' + delkaM.toFixed(2) + ' m.');
                    return;
                }

                // `pozice` je v enginu LEVÝ okraj otvoru. Uživatel ale míří jeho
                // středem, tak se od kliku odečte polovina šířky.
                const zacatek = Math.max(0, Math.min(delkaM - this.otvorSirka, pozice - this.otvorSirka / 2));

                this.engine.pushUndo();
                const otvor = this.engine.addOpening(wall.id, zacatek, this.otvorSirka, this.otvorTyp, { presnaSirka: true });
                if (otvor) {
                    // Hotový otvor rovnou vybrat a přepnout na výběr — na ploše se tím
                    // ukážou jeho parametry k doladění. Na další otvor se nástroj
                    // zapíná znovu (jedno kliknutí = jeden otvor).
                    this.nastroj = 'vyber';
                    this.renderer.setSelection([], [], [otvor.id !== undefined ? otvor.id : otvor]);
                    this.autoSave('Nový otvor');
                }
                return;
            }

            // Metr nástroj
            if (this.nastroj === 'metr') {
                const snapped = this.engine.snapPoint(pos.x, pos.y);
                this.metrClick(snapped.x, snapped.y);
                return;
            }

            // Výběr
            if (this.nastroj === 'vyber') {
                const multiSelect = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;

                if (hit.type === 'wall') {
                    if (multiSelect) {
                        this.renderer.toggleWallSelection(hit.id);
                    } else {
                        this.renderer.setSelection([hit.id]);
                    }
                } else if (hit.type === 'opening') {
                    if (multiSelect) {
                        this.renderer.toggleOpeningSelection(hit.id);
                    } else {
                        this.renderer.setSelection([], [], [hit.id]);
                    }
                } else if (hit.type === 'node') {
                    if (multiSelect) {
                        // Toggle node ve výběru
                        if (this.renderer.selectedNodes.has(hit.id)) {
                            this.renderer.selectedNodes.delete(hit.id);
                        } else {
                            this.renderer.selectedNodes.add(hit.id);
                        }
                        this.renderer.render();
                    } else {
                        this.renderer.setSelection([], [hit.id]);
                    }
                } else if (hit.type === 'vybaveni') {
                    if (multiSelect) {
                        this.renderer.toggleVybaveniSelection(hit.id);
                    } else {
                        this.renderer.setSelection([], [], [], [hit.id]);
                    }
                } else if (hit.type === 'prostor') {
                    if (multiSelect) {
                        this.renderer.toggleProstorSelection(hit.id);
                    } else {
                        this.renderer.setSelection([], [], [], [], [hit.id]);
                    }
                } else if (hit.type === 'empty' && !multiSelect) {
                    // POZN: po rubber-band výběru prohlížeč fires click event na empty
                    // oblast (kam uživatel táhl). Bez tohoto flagu by se výběr hned smazal.
                    if (this._justRubberBand) {
                        this._justRubberBand = false;
                        return;
                    }
                    // Pan (pravé tlačítko / nástroj posun) nesmí rušit výběr —
                    // standard CAD/design tools (Figma, SketchUp, AutoCAD).
                    if (this._justPanned) {
                        this._justPanned = false;
                        return;
                    }
                    this.renderer.clearSelection();
                }
            }
        },

        // ═══════════════════════════════════════════════════════
        // ZOOM
        // ═══════════════════════════════════════════════════════
        onWheel(e) {
            e.evt.preventDefault();
            const oldScale = this.stage.scaleX();
            const pointer = this.stage.getPointerPosition();
            const dir = e.evt.deltaY > 0 ? -1 : 1;
            let newScale = dir > 0 ? oldScale * 1.08 : oldScale / 1.08;
            newScale = Math.max(0.1, Math.min(5, newScale));

            const mousePointTo = {
                x: (pointer.x - this.stage.x()) / oldScale,
                y: (pointer.y - this.stage.y()) / oldScale,
            };
            this.stage.scale({ x: newScale, y: newScale });
            this.stage.position({
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
            });
            this.zoom = newScale;
            this._selectionTick++;
            this.renderer.poZmeneZoomu();   // mřížka, kóty, označení, úhly
            this._updateSpojMadlo();   // madlo má pevnou velikost na obrazovce
            this.ulozitNastaveni();
        },

        zoomIn() { this.setZoom(this.zoom * 1.3); },
        zoomOut() { this.setZoom(this.zoom / 1.3); },
        setZoom(z) {
            z = Math.max(0.05, Math.min(10, z));
            const center = { x: this.stage.width() / 2, y: this.stage.height() / 2 };
            const oldScale = this.stage.scaleX();
            const mpt = { x: (center.x - this.stage.x()) / oldScale, y: (center.y - this.stage.y()) / oldScale };
            this.stage.scale({ x: z, y: z });
            this.stage.position({ x: center.x - mpt.x * z, y: center.y - mpt.y * z });
            this.zoom = z;
            this.renderer.poZmeneZoomu();   // mřížka, kóty, označení, úhly
            this._updateSpojMadlo();   // madlo má pevnou velikost na obrazovce
            this.ulozitNastaveni();
        },

        fitView() {
            if (!this.engine || this.engine.walls.size === 0) {
                this.stage.position({ x: this.stage.width() / 2, y: this.stage.height() / 2 });
                this.stage.scale({ x: 1, y: 1 });
                this.zoom = 1;
                this.renderer.renderGrid();
                return;
            }
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const node of this.engine.nodes.values()) {
                minX = Math.min(minX, node.x); minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x); maxY = Math.max(maxY, node.y);
            }
            const pad = 100;
            const cw = this.stage.width() - pad * 2;
            const ch = this.stage.height() - pad * 2;
            const scale = Math.min(cw / (maxX - minX || 1), ch / (maxY - minY || 1), 2);
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
            this.stage.scale({ x: scale, y: scale });
            this.stage.position({ x: this.stage.width() / 2 - cx * scale, y: this.stage.height() / 2 - cy * scale });
            this.zoom = scale;
            this.renderer.poZmeneZoomu();   // mřížka, kóty, označení, úhly
            this._updateSpojMadlo();   // madlo má pevnou velikost na obrazovce
        },

        /** Výchozí tloušťka zvoleného typu stěny (z definic v enginu). */
        vychoziTloustka(typ) {
            const def = window.TYPY_STEN?.[typ]?.['tloušťka'];
            return def?.default ?? this.tloustkaSteny;
        },

        /**
         * Po odemknutí napojení „I" leží uzel tenčí stěny přesně na uzlu tlustší.
         * Kliknutí by chytlo ten pevný (nejde s ním hnout), takže dáme přednost
         * uzlu, který je posuvný po čele — jinak by se posun nedal vůbec uchopit.
         */
        _uzelProTazeni(nodeId) {
            const n = this.engine.nodes.get(nodeId);
            if (!n) return nodeId;

            const naMiste = [];
            for (const jiny of this.engine.nodes.values()) {
                if (Math.hypot(jiny.x - n.x, jiny.y - n.y) <= 1) naMiste.push(jiny.id);
            }
            if (naMiste.length <= 1) return nodeId;

            // Posuvný po čele první — o ten jde skoro vždy
            const posuvny = (id) => {
                const c = this.engine.getNodeMovementConstraint(id);
                return !!(c && c.type === 'slide');
            };
            naMiste.sort((a, b) => (posuvny(b) ? 1 : 0) - (posuvny(a) ? 1 : 0));

            // Opakovaný klik na stejné místo přepíná mezi uzly, které tam leží
            // (jinak by se na roh a jeho odpojovací šipky nedalo vůbec dostat).
            const vybrany = naMiste.findIndex(id => this.renderer.selectedNodes.has(id));
            if (vybrany >= 0) return naMiste[(vybrany + 1) % naMiste.length];
            return naMiste[0];
        },

        /** Do kolika stupňů se dvě stěny berou jako souosé (napojení „I"). */
        CELO_TOLERANCE_DEG: 5,

        /**
         * Zkusí napojit puštěný konec stěny na KONEC jiné, souosé stěny jiné
         * tloušťky (napojení „I"). Místo sloučení uzlů vznikne klouzavá vazba
         * po čele tlustší stěny — tenčí pak jde srovnat na líc, ne jen na osu.
         *
         * Výchozí poloha se vybere podle toho, kam uživatel konec pustil:
         * přichytí se na nejbližší z poloh líc / osa / líc. Tím automatické
         * napojení odpovídá tomu, jak stěny leží ve skutečnosti.
         *
         * @returns {boolean} true = napojeno (volající už uzly neslučuje)
         */
        _napojNaCelo(nodeId) {
            const uzel = this.engine.nodes.get(nodeId);
            if (!uzel) return false;
            const kandidat = this._kandidatCela(nodeId, uzel);
            if (!kandidat) return false;

            // Uzel zůstane přesně tam, kam ho ukázal náhled (včetně líce)
            uzel.x = kandidat.bod.x;
            uzel.y = kandidat.bod.y;

            const moje = kandidat.moje;

            // Srovnat stěnu přesně do osy hostitele (do spoje se najíždí od oka,
            // takže bývá o pár stupňů nakřivo). Jen když je druhý konec volný —
            // jinak bychom táhli i geometrii, která na něm visí.
            const druhyId = moje.nodeA === nodeId ? moje.nodeB : moje.nodeA;
            const druhy = this.engine.nodes.get(druhyId);
            const vazbaDruhy = moje.nodeA === druhyId ? moje.odConstraint : moje.doConstraint;
            if (druhy && !vazbaDruhy && this.engine.getNodeWalls(druhyId).length === 1) {
                const hostA = this.engine.nodes.get(kandidat.host.nodeA);
                const hostB = this.engine.nodes.get(kandidat.host.nodeB);
                if (hostA && hostB) {
                    // Směr „pryč od hostitele" = opačný, než kam hostitel od spoje vede
                    const konecUzel = kandidat.konec === 'A' ? hostA : hostB;
                    const protiUzel = kandidat.konec === 'A' ? hostB : hostA;
                    const dx = konecUzel.x - protiUzel.x, dy = konecUzel.y - protiUzel.y;
                    const L = Math.hypot(dx, dy);
                    if (L > 0) {
                        const delka = Math.hypot(druhy.x - uzel.x, druhy.y - uzel.y);
                        druhy.x = uzel.x + (dx / L) * delka;
                        druhy.y = uzel.y + (dy / L) * delka;
                    }
                }
            }
            const vazba = { host: kandidat.host.id, konec: kandidat.konec };
            if (moje.nodeA === nodeId) moje.odConstraint = vazba; else moje.doConstraint = vazba;
            return true;
        },

        /**
         * Kandidát na napojení „I" pro daný volný konec a cílovou pozici.
         *
         * Jediné místo, kde se počítá, KAM konec sedne — používá ho zelený
         * náhled při tažení i vlastní napojení po puštění. Díky tomu po puštění
         * zůstane přesně to, co náhled ukazoval (dřív to skočilo na osu).
         *
         * Poloha se přichytává na líc / osu / líc, jinak jde plynule po čele.
         *
         * @param {?{x:number,y:number}} odkud  odkud stěna do spoje přichází —
         *        poloha vzdáleného konce. Při posouvání CELÉ stěny se i vzdálený
         *        konec hýbe, takže ten uložený v uzlech už neplatí.
         * @returns {?{host, konec, moje, celo, bod, line}}
         */
        _kandidatCela(nodeId, cil, odkud = null) {
            const uzel = this.engine.nodes.get(nodeId);
            if (!uzel || !cil) return null;
            const mojeSteny = this.engine.getNodeWalls(nodeId);
            if (mojeSteny.length !== 1) return null;       // jen volný konec
            const moje = mojeSteny[0];
            const jeKonecA = moje.nodeA === nodeId;
            if (jeKonecA ? moje.odConstraint : moje.doConstraint) return null;  // už je navázaná

            const druhyMujId = jeKonecA ? moje.nodeB : moje.nodeA;
            const druhyMuj = odkud || this.engine.nodes.get(druhyMujId);
            if (!druhyMuj) return null;
            const mujSmer = Math.atan2(cil.y - druhyMuj.y, cil.x - druhyMuj.x) * 180 / Math.PI;

            const scale = this.stage ? this.stage.scaleX() : 1;
            let nej = null;
            for (const host of this.engine.walls.values()) {
                if (host.id === moje.id) continue;
                // Tloušťky se musí lišit — na stejně tlustou stěnu není kam klouzat
                // (tam je správné sloučení uzlů). Na směr rozdílu se nehledí, takže
                // jde napojit tenčí stěnu na tlustší i tlustší na tenčí.
                if (Math.abs((host.tloustka || 0) - (moje.tloustka || 0)) < 0.001) continue;
                for (const konec of ['A', 'B']) {
                    const konecUzel = this.engine.nodes.get(konec === 'A' ? host.nodeA : host.nodeB);
                    if (!konecUzel || konecUzel.id === nodeId) continue;
                    const protiUzel = this.engine.nodes.get(konec === 'A' ? host.nodeB : host.nodeA);
                    if (!protiUzel) continue;

                    // Blízkost se měří k celému ČELU hostitele, ne k jeho uzlu uprostřed.
                    // Jinak šlo napojení chytit jen u spojovacího bodu — a u rohu leží
                    // čelo navíc až na jeho vnější hraně, tedy jinde než uzel.
                    const celoK = this.engine.celoHostitele(host.id, konec, moje.tloustka);
                    if (!celoK) continue;
                    const vzdalenost = this.engine._pointToSegmentDist(cil.x, cil.y,
                        celoK.zobrazA.x, celoK.zobrazA.y, celoK.zobrazB.x, celoK.zobrazB.y);
                    // Dosah se NEzvětšuje s odzoomováním. Dřív tu bylo
                    // max(MAGNET_DIST * 1.5, 24 / scale), aby magnet působil na
                    // obrazovce pořád stejně — jenže bez stropu roste i ve
                    // výkrese: při běžném odzoomování domu z toho vyšlo přes půl
                    // metru a napojení vzniklo mezi stěnami, které spolu vůbec
                    // nesousedí (Na bělidle: W53 na čelo W96 0,55 m daleko).
                    // Napojení je konstrukční vazba, ne výběr objektu — co je
                    // „u sebe" musí rozhodovat výkres, ne zvětšení. 24 px je
                    // při 80 px/m 0,3 m, tedy půlka nejtlustší zdi.
                    if (vzdalenost > this.engine.MAGNET_DIST * 1.5) continue;

                    // Souosost: hostitel míří od svého konce opačným směrem než moje stěna
                    const hostSmer = Math.atan2(protiUzel.y - konecUzel.y, protiUzel.x - konecUzel.x) * 180 / Math.PI;
                    // mujSmer je směr, KTERÝM stěna do spoje přichází (od svého druhého
                    // konce), hostSmer vede od spoje po hostiteli — u souosého
                    // pokračování jsou tyhle dva směry shodné (odchylka kolem 0°).
                    const odchylka = Math.abs(((mujSmer - hostSmer + 540) % 360) - 180);
                    if (odchylka > this.CELO_TOLERANCE_DEG) continue;

                    if (!nej || vzdalenost < nej.vzdalenost) nej = { host, konec, vzdalenost, celo: celoK };
                }
            }
            if (!nej) return null;

            const celo = nej.celo;

            // Kam na čele: vždy na LÍC, nikdy na osu. Osa vede středem spoje, kde
            // leží spojovací uzly — tam napojení opticky splyne s uzlem a hrozí,
            // že se místo klouzavé vazby uzly natvrdo sloučí. Osa zůstává dostupná
            // dodatečným posunutím po čele (_posunPoCele má zarážku i na ose).
            const odchylka = (cil.x - celo.stred.x) * celo.kolmice.x + (cil.y - celo.stred.y) * celo.kolmice.y;
            const strana = Math.abs(odchylka) > 4 / scale
                ? Math.sign(odchylka)                                        // bližší líc podle kurzoru
                : this._vnejsiStranaRohu(nej.host, nej.konec, celo.kolmice); // kurzor na ose → vnější líc rohu
            const u = strana * celo.dosah;

            return {
                host: nej.host, konec: nej.konec, moje, celo,
                bod: { x: celo.stred.x + celo.kolmice.x * u, y: celo.stred.y + celo.kolmice.y * u },
                line: { a: celo.a, b: celo.b },                   // sem se dá přichytit
                zobrazLine: { a: celo.zobrazA, b: celo.zobrazB }, // celá šířka čela — jen pro viditelnost
            };
        },

        /**
         * Na kterou stranu čela hostitele padne „vnější" líc rohu.
         *
         * V čele hostitele se v rohu schází další stěna. Vnější strana je ta
         * odvrácená od směru, kterým soused z rohu vede — po té pokračuje obvodová
         * čára dál. Bez souseda v čele (volný konec) se strana určit nedá, vrací +1.
         */
        _vnejsiStranaRohu(host, konec, kolmice) {
            return this.engine.vnejsiStranaCela(host.id, konec, kolmice) || 1;
        },

        /**
         * Poloha uzlu na čele hostitele (napojení „I").
         *
         * Promítne kurzor na vodicí úsečku čela, ořízne na její konce (dál než
         * líc to nejde) a přichytí na tři polohy: líc / osa / líc.
         */
        _posunPoCele(c, pos) {
            const a = c.line.a, b = c.line.b;
            const dx = b.x - a.x, dy = b.y - a.y;
            const L2 = dx * dx + dy * dy;
            const stred = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            if (L2 === 0) return stred;   // stejné tloušťky → není kam uhnout

            let t = ((pos.x - a.x) * dx + (pos.y - a.y) * dy) / L2;
            t = Math.max(0, Math.min(1, t));

            // Magnet na líc (0 a 1) a osu (0,5) — v pixelech obrazovky
            const scale = this.stage ? this.stage.scaleX() : 1;
            const tolT = (10 / scale) / Math.sqrt(L2);
            for (const cil of [0, 0.5, 1]) {
                if (Math.abs(t - cil) < tolT) { t = cil; break; }
            }
            return { x: a.x + t * dx, y: a.y + t * dy };
        },

        /**
         * Bod na hostitelské stěně, který drží magnetovaný úhel.
         *
         * Při napojení konce stěny na jinou stěnu se bod dřív jen promítl kolmo
         * na osu hostitele. Do spoje se ale nikdy netrefíte přesně, takže průmět
         * pravý úhel zase rozhodil. Místo toho necháme stát OBA vzdálené konce
         * (hostitele i napojované stěny) a dopočítáme průsečík osy hostitele
         * s paprskem, který s ním svírá magnetovaný úhel (90°, 45°…).
         * Používá společné MAGNET_UHLY a MAGNET_TOLERANCE_DEG jako ostatní magnety.
         *
         * @param {number} perpOff  kolmé odsazení od osy hostitele, do kterého se
         *        paprsek protíná — líc hostitele u napojení na okraj (0 = osa).
         * @returns {?{bod:{x,y}, t:number}} null = žádný úhel nablízku, platí průmět
         */
        _bodNaStenePodUhlem(nodeId, hostStena, cil, perpOff = 0) {
            const steny = this.engine.getNodeWalls(nodeId);
            if (steny.length !== 1) return null;            // jen volný konec jedné stěny
            const moje = steny[0];
            if (!hostStena || moje.id === hostStena.id) return null;

            const druhyId = moje.nodeA === nodeId ? moje.nodeB : moje.nodeA;
            const opora = this.engine.nodes.get(druhyId);   // vzdálený konec — ten se nehýbe
            const ha = this.engine.nodes.get(hostStena.nodeA);
            const hb = this.engine.nodes.get(hostStena.nodeB);
            if (!opora || !ha || !hb) return null;

            const hostUhel = Math.atan2(hb.y - ha.y, hb.x - ha.x) * 180 / Math.PI;
            const uhel = Math.atan2(cil.y - opora.y, cil.x - opora.x) * 180 / Math.PI;

            let nej = null;
            for (const u of this.MAGNET_UHLY) {
                for (const cilovy of [hostUhel + u, hostUhel - u]) {
                    const odchylka = Math.abs(((uhel - cilovy + 540) % 360) - 180);
                    if (odchylka > this.MAGNET_TOLERANCE_DEG) continue;
                    if (!nej || odchylka < nej.odchylka) nej = { odchylka, uhel: cilovy };
                }
            }
            if (!nej) return null;

            // Průsečík paprsku z opory s osou hostitele
            const rad = nej.uhel * Math.PI / 180;
            const rx = Math.cos(rad), ry = Math.sin(rad);
            const hx = hb.x - ha.x, hy = hb.y - ha.y;
            const jmenovatel = rx * hy - ry * hx;
            if (Math.abs(jmenovatel) < 1e-9) return null;   // rovnoběžné, průsečík není
            // Paprsek se protíná s čárou, na které bod opravdu skončí: s osou
            // hostitele u střihu, s jeho lícem u napojení na okraj. Jinak by úhel
            // vyšel pro osu a po odsazení na líc se o kousek rozhodil.
            const hL0 = Math.hypot(hx, hy) || 1;
            const lic = { x: ha.x + (-hy / hL0) * perpOff, y: ha.y + (hx / hL0) * perpOff };
            const krok = ((lic.x - opora.x) * hy - (lic.y - opora.y) * hx) / jmenovatel;
            if (krok <= 0) return null;                     // průsečík by byl za zády
            const bod = { x: opora.x + rx * krok, y: opora.y + ry * krok };

            // Musí padnout do stěny hostitele a zůstat u místa, kam uživatel mířil
            // (kolmé odsazení průmět neovlivní, t platí pro osu hostitele)
            const t = ((bod.x - lic.x) * hx + (bod.y - lic.y) * hy) / (hx * hx + hy * hy);
            if (t < 0.02 || t > 0.98) return null;
            const scale = this.stage ? this.stage.scaleX() : 1;
            if (Math.hypot(bod.x - cil.x, bod.y - cil.y) > 40 / scale) return null;

            return { bod, t };
        },

        /**
         * Srovná roh dvou spojovaných konců na magnetovaný úhel.
         *
         * Spojení konců samo o sobě jen sloučí uzly, takže roh zůstane tam, kde
         * byl cílový konec — a z pravého úhlu zbude třeba 91°. Tady se místo toho
         * drží OBA vzdálené konce a roh se dopočítá:
         *   - cílová stěna si nechá směr a jen se prodlouží/zkrátí po své ose,
         *   - tažená stěna se o ten kousek dorovná (otočí kolem svého vzdáleného konce),
         *   - roh = průsečík obou os.
         * Příčné posouvání konce, které úhel rozhazovalo, tím odpadá.
         *
         * Dělá se to jen u volných konců (každý uzel jen jedna stěna) — jinak by
         * posun uzlu táhl i další stěny, které na něm visí.
         */
        _srovnejRohNaUhel(nodeId, cilovyUzel) {
            const mojeSteny = this.engine.getNodeWalls(nodeId);
            const ciziSteny = this.engine.getNodeWalls(cilovyUzel.id);
            if (mojeSteny.length !== 1 || ciziSteny.length !== 1) return false;

            const moje = mojeSteny[0], ciziStena = ciziSteny[0];
            if (moje.id === ciziStena.id) return false;
            // Navázané konce se nesrovnávají — ty řídí vazba
            if ((moje.nodeA === nodeId ? moje.odConstraint : moje.doConstraint)) return false;
            const ciziVazba = ciziStena.nodeA === cilovyUzel.id ? ciziStena.odConstraint : ciziStena.doConstraint;
            if (ciziVazba) return false;

            const mujVzdalenyId = moje.nodeA === nodeId ? moje.nodeB : moje.nodeA;
            const ciziVzdalenyId = ciziStena.nodeA === cilovyUzel.id ? ciziStena.nodeB : ciziStena.nodeA;
            const mujVzdaleny = this.engine.nodes.get(mujVzdalenyId);
            const ciziVzdaleny = this.engine.nodes.get(ciziVzdalenyId);
            if (!mujVzdaleny || !ciziVzdaleny) return false;

            // Směr cílové stěny (od jejího vzdáleného konce k rohu) zůstává
            const cx = cilovyUzel.x - ciziVzdaleny.x, cy = cilovyUzel.y - ciziVzdaleny.y;
            const cL = Math.hypot(cx, cy);
            if (cL < 1) return false;
            const ciziUhel = Math.atan2(cy, cx) * 180 / Math.PI;
            const mujUhel = Math.atan2(cilovyUzel.y - mujVzdaleny.y, cilovyUzel.x - mujVzdaleny.x) * 180 / Math.PI;

            let nej = null;
            for (const u of this.MAGNET_UHLY) {
                for (const cilovy of [ciziUhel + u, ciziUhel - u]) {
                    const odchylka = Math.abs(((mujUhel - cilovy + 540) % 360) - 180);
                    if (odchylka > this.MAGNET_TOLERANCE_DEG) continue;
                    if (!nej || odchylka < nej.odchylka) nej = { odchylka, uhel: cilovy };
                }
            }
            if (!nej || nej.odchylka < 1e-9) return false;   // není co srovnávat

            // Průsečík: osa cílové stěny × paprsek z mého vzdáleného konce pod správným úhlem
            const rad = nej.uhel * Math.PI / 180;
            const rx = Math.cos(rad), ry = Math.sin(rad);
            const jmenovatel = rx * cy - ry * cx;
            if (Math.abs(jmenovatel) < 1e-9) return false;   // rovnoběžné
            const krok = ((ciziVzdaleny.x - mujVzdaleny.x) * cy - (ciziVzdaleny.y - mujVzdaleny.y) * cx) / jmenovatel;
            if (krok <= 0) return false;                     // roh by byl za zády
            const roh = { x: mujVzdaleny.x + rx * krok, y: mujVzdaleny.y + ry * krok };

            // Roh nesmí utéct daleko (to by nebylo srovnání, ale skok)
            const scale = this.stage ? this.stage.scaleX() : 1;
            const limit = Math.max(this.engine.MAGNET_DIST, 30 / scale);
            if (Math.hypot(roh.x - cilovyUzel.x, roh.y - cilovyUzel.y) > limit) return false;
            // Cílová stěna se smí jen prodloužit/zkrátit, ne obrátit
            const novaDelka = (roh.x - ciziVzdaleny.x) * (cx / cL) + (roh.y - ciziVzdaleny.y) * (cy / cL);
            if (novaDelka < this.engine.SNAP_STEP) return false;

            const uzel = this.engine.nodes.get(nodeId);
            cilovyUzel.x = roh.x; cilovyUzel.y = roh.y;
            if (uzel) { uzel.x = roh.x; uzel.y = roh.y; }
            return true;
        },

        /** Úhly, na které se stěna při tažení uzlu přichytává (vůči ose i sousední stěně). */
        MAGNET_UHLY: [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330],
        /** Do kolika stupňů od těchto úhlů magnet přichytí (míň = volnější kreslení). */
        MAGNET_TOLERANCE_DEG: 3,

        /**
         * Magnet na běžné úhly při tažení uzlu.
         *
         * Pro každou stěnu v uzlu zkusí natočit ji na „rozumný" úhel — vůči
         * vodorovné ose a zároveň vůči sousedním stěnám v jejím druhém konci
         * (pravý úhel na šikmou stěnu). Vybere přichycení s nejmenší odchylkou.
         *
         * Tolerance je ÚHLOVÁ (MAGNET_TOLERANCE_DEG), ne v pixelech. Přesně proti
         * rohům typu 90,5°: ty jsou od pravého úhlu půl stupně, ale u dlouhé stěny
         * je to na obrazovce kus — pixelová tolerance by je propustila. Kdo chce
         * šikmou stěnu, odchýlí se víc než o toleranci a magnet nezasáhne.
         *
         * @returns {?{x:number,y:number}} přichycená pozice, nebo null (žádný úhel nablízku)
         */
        _magnetUhlu(nodeId, target) {
            const steny = this.engine.getNodeWalls(nodeId);
            if (!steny.length) return null;
            let nej = null;

            for (const stena of steny) {
                const druhyId = stena.nodeA === nodeId ? stena.nodeB : stena.nodeA;
                const opora = this.engine.nodes.get(druhyId);
                if (!opora) continue;
                const dx = target.x - opora.x, dy = target.y - opora.y;
                const delka = Math.hypot(dx, dy);
                if (delka < 1) continue;
                const uhel = Math.atan2(dy, dx) * 180 / Math.PI;

                // Reference: vodorovná osa + směry sousedních stěn ve druhém konci
                const reference = [0];
                for (const soused of this.engine.getNodeWalls(druhyId)) {
                    if (soused.id === stena.id) continue;
                    const a = this.engine.nodes.get(soused.nodeA);
                    const b = this.engine.nodes.get(soused.nodeB);
                    if (!a || !b) continue;
                    const sdx = soused.nodeA === druhyId ? b.x - a.x : a.x - b.x;
                    const sdy = soused.nodeA === druhyId ? b.y - a.y : a.y - b.y;
                    if (Math.hypot(sdx, sdy) < 1) continue;
                    reference.push(Math.atan2(sdy, sdx) * 180 / Math.PI);
                }

                for (const ref of reference) {
                    for (const u of this.MAGNET_UHLY) {
                        const cil = ref + u;
                        const odchylka = Math.abs(((uhel - cil + 540) % 360) - 180);
                        if (odchylka > this.MAGNET_TOLERANCE_DEG) continue;
                        if (!nej || odchylka < nej.odchylka) {
                            const rad = cil * Math.PI / 180;
                            nej = {
                                odchylka,
                                bod: { x: opora.x + Math.cos(rad) * delka, y: opora.y + Math.sin(rad) * delka },
                            };
                        }
                    }
                }
            }
            return nej ? nej.bod : null;
        },

        /**
         * Začne nový úsek stěny: založí skutečnou stěnu z posledního bodu ke
         * kurzoru a předá její konec standardnímu tažení uzlu. Od téhle chvíle
         * se kreslení chová jako manipulace s hotovou stěnou (magnety, pravé
         * úhly, T-napojení, náhled přichycení) — nic se nezdvojuje.
         */
        zacniUsekSteny(konec) {
            this.engine.pushUndo();
            const stena = this.engine.addWall(
                this.stenaStart.x, this.stenaStart.y, konec.x, konec.y,
                this.tloustkaSteny, this.stenaTyp
            );
            if (!stena) return;

            this.stenaUseky.push({ id: stena.id, start: { ...this.stenaStart } });
            this._stenaUsekId = stena.id;

            // Hned při vzniku srovnat úhel — konec se zakládá na mřížce, což u
            // krátkého úseku znamená naklonění o pár stupňů. Bez toho by první
            // úsek zůstal šikmý a všechny pravé úhly by se měřily od něj.
            const srovnany = this._magnetUhlu(stena.nodeB, konec);
            if (srovnany) {
                const uzel = this.engine.nodes.get(stena.nodeB);
                if (uzel) { uzel.x = srovnany.x; uzel.y = srovnany.y; }
            }

            // Tažení konce úseku. Vybírá se jen uzel (ne stěna) — panel s
            // vlastnostmi tím při kreslení nevyskakuje, úhelník se kreslí
            // podle rozkresleného úseku.
            this.isDraggingNode = true;
            this.draggingNodeId = stena.nodeB;
            this._attachMode = null;
            this.renderer.setSelection([], [stena.nodeB]);
            this.renderer.render();
        },

        /** Zahodí rozkreslený (dosud neukotvený) úsek stěny. */
        zrusRozkreslenyUsek() {
            if (!this._stenaUsekId) return;
            const id = this._stenaUsekId;
            this._stenaUsekId = null;
            this.isDraggingNode = false;
            this.draggingNodeId = null;
            this._snapPreview = null;
            if (this.stenaUseky.length && this.stenaUseky[this.stenaUseky.length - 1].id === id) {
                this.stenaUseky.pop();
            }
            this.engine.removeWall(id);
            this.renderer.clearSelection();
            this.renderer.render();
        },

        /**
         * Esc u nástroje stěny — po krocích zpět:
         *   1×  rozkreslená (neukotvená) stěna zmizí a kreslení skončí,
         *       nakreslené úseky zůstanou. Klik do plátna kreslení zase spustí.
         *   2×  a dál: ubere vždy poslední nakreslený úsek.
         */
        stenaEsc() {
            // 1) Ukončit kreslení — zahodí se jen rozkreslený (neukotvený) úsek,
            //    hotové úseky zůstanou
            if (this.kreslimStenu) {
                this.zrusRozkreslenyUsek();
                this.kreslimStenu = false;
                this.stenaStart = null;
                // Příznak „tenhle klik už úsek dokončil" patří k právě ukončenému
                // kreslení. Kdyby zůstal, spolkl by první klik, kterým chce
                // uživatel kreslení znovu spustit — musel by klikat dvakrát.
                this._stenaPreskocKlik = false;
                this.renderer.clearTemp();
                this.renderer.render();
                return;
            }

            // 2) Ubrat poslední nakreslený úsek (jde vrátit i přes Zpět)
            const posledni = this.stenaUseky.pop();
            if (!posledni) return;
            this.engine.pushUndo();
            this.engine.removeWall(posledni.id);
            this.renderer.render();
            this.autoSave('Zpět po bodech');
        },

        // ═══════════════════════════════════════════════════════
        // KEYBOARD
        // ═══════════════════════════════════════════════════════
        onKeyDown(e) {
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

            // Mezerník blokován v capture fázi (init)
            if (isInput) return;

            if (e.key === 'Escape') {
                // Nástroj stěny: 1. Esc ukončí rozkreslenou stěnu, další ubírají body
                if (this.nastroj === 'stena' && (this.kreslimStenu || this.stenaUseky.length)) {
                    this.stenaEsc();
                }
                if (this._metrMeri) {
                    this.metrEscape();
                }
                // Escape uprostřed dragu = abort: vrátit změny a uvolnit objekt.
                // pushUndo() se volá při aktivaci dragu, takže máme co vrátit.
                if (this.isDraggingWall || this.isDraggingNode || this.isDraggingVybaveni
                        || this.isDraggingOpening || this.isRotating || this._pendingDrag) {
                    if (this.isDraggingWall || this.isDraggingNode || this.isDraggingVybaveni
                            || this.isDraggingOpening || this.isRotating) {
                        this.engine.undo();
                    }
                    this.isDraggingWall = false;
                    this.draggingWallId = null;
                    this.dragWallStart = null;
                    this.isDraggingNode = false;
                    this.draggingNodeId = null;
                    this.isDraggingVybaveni = false;
                    this.draggingVybaveniId = null;
                    this.dragVybaveniStart = null;
                    this.isDraggingOpening = false;
                    this.draggingOpeningId = null;
                    this.isRotating = false;
                    this._rotateNodeSnap = null;
                    this._rotateVybaveniSnap = null;
                    // polohu podkladu už vrátil engine.undo() přes undoDoplnek
                    this._rotatePodkladSnap = null;
                    this._podkladPohnut = false;
                    this._pendingDrag = null;
                    this._dragRealOrigin = null;
                    this.renderer.render();
                }
                this.renderer.clearSelection();
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Během drag — smazat držený objekt
                if (this.isDraggingWall && this.draggingWallId) {
                    this.engine.pushUndo();
                    this.engine.removeWall(this.draggingWallId);
                    this.isDraggingWall = false;
                    this.draggingWallId = null;
                    this.renderer.clearSelection();
                    this.renderer.render();
                    this.autoSave("Smazání stěny");
                    return;
                }
                if (this.isDraggingNode && this.draggingNodeId) {
                    this.engine.pushUndo();
                    // Smazat všechny stěny na tomto uzlu
                    const walls = this.engine.getNodeWalls(this.draggingNodeId);
                    for (const w of walls) this.engine.removeWall(w.id);
                    this.isDraggingNode = false;
                    this.draggingNodeId = null;
                    if (this._attachOverlayGroup) { this._attachOverlayGroup.destroy(); this._attachOverlayGroup = null; }
                    this._attachMode = null;
                    this._attachSlideInfo = null;
                    this.renderer.clearSelection();
                    this.renderer.render();
                    this.autoSave("Smazání bodu");
                    return;
                }
                if (this.isDraggingOpening && this.draggingOpeningId) {
                    this.engine.pushUndo();
                    this.engine.openings.delete(this.draggingOpeningId);
                    this.isDraggingOpening = false;
                    this.draggingOpeningId = null;
                    this.renderer.clearSelection();
                    this.renderer.render();
                    this.autoSave("Smazání otvoru");
                    return;
                }
                if (this.isDraggingVybaveni && this.draggingVybaveniId) {
                    this.engine.pushUndo();
                    this.engine.removeVybaveni(this.draggingVybaveniId);
                    this.isDraggingVybaveni = false;
                    this.draggingVybaveniId = null;
                    this.renderer.clearSelection();
                    this.renderer.render();
                    this.autoSave("Smazání nábytku");
                    return;
                }
                // Jinak smazat vybrané — stěny + otvory + volné uzly + vybavení + místnosti
                const hasSel = this.renderer.selectedWalls.size > 0
                    || this.renderer.selectedOpenings.size > 0
                    || this.renderer.selectedNodes.size > 0
                    || this.renderer.selectedVybaveni.size > 0
                    || this.renderer.selectedProstory.size > 0;
                if (hasSel) {
                    this.engine.pushUndo();
                    for (const id of this.renderer.selectedOpenings) {
                        this.engine.openings.delete(id);
                    }
                    for (const id of this.renderer.selectedWalls) {
                        this.engine.removeWall(id);
                    }
                    for (const id of this.renderer.selectedVybaveni) {
                        this.engine.removeVybaveni(id);
                    }
                    for (const id of this.renderer.selectedProstory) {
                        this.engine.removeProstor(id);
                    }
                    for (const id of this.renderer.selectedNodes) {
                        // Smazat všechny stěny napojené na uzel
                        const walls = this.engine.getNodeWalls(id);
                        for (const w of walls) this.engine.removeWall(w.id);
                    }
                    // Po mazání stěn projít prostory a smazat ty, kterým chybí
                    // dost platných referenčních vrcholů (refNodeId/wallA+wallB).
                    // Jinak by po smazání všech stěn zůstaly viset názvy místností
                    // bez geometrie.
                    this.engine.cleanupOrphanProstory();
                    this.renderer.clearSelection();
                    this.renderer.render();
                    this.autoSave("Smazání objektu");
                }
                return;
            }

            if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.renderer.selectAll();
                return;
            }

            // Ctrl+Z/C/V/D — jen pokud focus NENÍ v textovém poli a není vybraný text
            if (!isInput && !window.getSelection()?.toString() && (e.ctrlKey || e.metaKey)) {
                // Zpět / Vpřed po krocích historie (se Shiftem dává klávesa „Z“)
                if (e.key === 'z' || e.key === 'Z') {
                    e.preventDefault();
                    if (e.shiftKey) this.redo(); else this.undo();
                    return;
                }
                if (e.key === 'y') { e.preventDefault(); this.redo(); return; }
                if (e.key === 'c') { e.preventDefault(); this.kopirovat(); return; }
                if (e.key === 'v') { e.preventDefault(); this.vlozit(); return; }
                if (e.key === 'd') { e.preventDefault(); this.kopirovat(); this.vlozit(); return; }
            }

            // F odstraněno — reset pozice přes dvojklik na kompas
            if (e.key === 'b' || e.key === 'B') {
                this.nastroj = this.nastroj === 'zvyraznovac' ? 'vyber' : 'zvyraznovac';
                return;
            }
            if (e.key === '1') this.nastroj = 'vyber';
            if (e.key === '2') this.nastroj = 'posun';
            if (e.key === '3') this.nastroj = 'zvyraznovac';
            if (e.key === '4') this.nastroj = 'stena';
            if (e.key === '5' || e.key === 'm' || e.key === 'M') this.nastroj = this.nastroj === 'metr' ? 'vyber' : 'metr';
            if (e.key === '6' || e.key === 'o' || e.key === 'O') this.nastroj = this.nastroj === 'otvor' ? 'vyber' : 'otvor';
        },

        /** Krátká hláška nástroje Otvor — sama zmizí. */
        otvorHlaska(text) {
            this.otvorZprava = text;
            clearTimeout(this._otvorCasovac);
            this._otvorCasovac = setTimeout(() => { this.otvorZprava = ''; }, 3500);
        },

        // ═══════════════════════════════════════════════════════
        // MĚŘENÍ VZDÁLENOSTI (Metr)
        // ═══════════════════════════════════════════════════════
        _metrBody: [],       // [{x,y}, ...] body měření
        _metrMeri: false,    // probíhá měření

        metrClick(worldX, worldY) {
            if (!this._metrMeri) {
                this._metrBody = [{ x: worldX, y: worldY }];
                this._metrMeri = true;
            } else {
                this._metrBody.push({ x: worldX, y: worldY });
            }
            this.metrRender();
        },

        metrDblclick() {
            // Ukončí měření, nechá výsledek na canvasu
            this._metrMeri = false;
        },

        metrEscape() {
            this._metrBody = [];
            this._metrMeri = false;
            if (this.renderer.tempLayer) {
                this.renderer.tempLayer.find('.metr-temp').forEach(n => n.destroy());
                this.renderer.tempLayer.batchDraw();
            }
        },

        metrRender(mouseWorld) {
            // Smazat jen metr objekty (ne overlay/stěnový preview)
            if (this.renderer.tempLayer) {
                this.renderer.tempLayer.find('.metr-temp').forEach(n => n.destroy());
            }
            const pts = [...this._metrBody];
            if (mouseWorld && this._metrMeri) pts.push(mouseWorld);
            if (pts.length < 1) return;

            const pxM = this.PX_PER_M;
            const scale = this.stage.scaleX();
            let celkem = 0;

            for (let i = 1; i < pts.length; i++) {
                const x1 = pts[i-1].x, y1 = pts[i-1].y;
                const x2 = pts[i].x, y2 = pts[i].y;
                const segLen = Math.hypot(x2 - x1, y2 - y1) / pxM;
                celkem += segLen;

                // Čára segmentu
                this.renderer.tempLayer.add(new Konva.Line({
                    points: [x1, y1, x2, y2],
                    stroke: '#2563eb',
                    strokeWidth: 2 / scale,
                    dash: [6 / scale, 4 / scale],
                    name: 'metr-temp',
                }));

                // Délka segmentu — na středu čáry, souběžně, nad čárou z pohledu uživatele
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                const uhel = Math.atan2(y2 - y1, x2 - x1);
                const kompRad = (this.kompasUhel || 0) * Math.PI / 180;
                // Kolmice na čáru (normála) — vždy na stranu "nahoru na obrazovce"
                // Normála čáry: (-sin(uhel), cos(uhel))
                // Tuto normálu transformujeme do screen space a vybereme tu co míří nahoru (screen Y < 0)
                const n1x = -Math.sin(uhel), n1y = Math.cos(uhel);
                // Screen Y normály: otočit o stage rotation
                const cosR = Math.cos(kompRad), sinR = Math.sin(kompRad);
                const screenY1 = n1x * sinR + n1y * cosR;
                // Pokud screenY1 < 0, normála míří nahoru na obrazovce → použít ji
                // Pokud screenY1 > 0, míří dolů → otočit
                const nx = screenY1 < 0 ? n1x : -n1x;
                const ny = screenY1 < 0 ? n1y : -n1y;
                const offsetDist = 12 / scale;
                const ox = nx * offsetDist;
                const oy = ny * offsetDist;
                // Rotaci textu — souběžně s čárou, nikdy vzhůru nohama
                let textRot = (uhel + kompRad) * 180 / Math.PI;
                while (textRot > 90) textRot -= 180;
                while (textRot < -90) textRot += 180;
                textRot -= (this.kompasUhel || 0);
                const label = segLen.toFixed(2) + ' m';
                const labelW = label.length * 6.5 / scale;
                this.renderer.tempLayer.add(new Konva.Text({
                    x: mx + ox, y: my + oy,
                    text: label,
                    fontSize: 11 / scale,
                    fill: '#2563eb',
                    fontFamily: 'monospace',
                    rotation: textRot,
                    offsetX: labelW / 2,
                    offsetY: 6 / scale, // střed textu na offset pozici
                    name: 'metr-temp',
                }));
            }

            // Body (kruhy)
            for (const p of pts) {
                this.renderer.tempLayer.add(new Konva.Circle({
                    x: p.x, y: p.y, radius: 4 / scale,
                    fill: '#2563eb', stroke: 'white', strokeWidth: 1.5 / scale,
                    name: 'metr-temp',
                }));
            }

            // Celková délka — nad koncovým bodem, od 2+ uchycených bodů + kurzor (= 3+ v pts)
            if (this._metrBody.length >= 2 && pts.length >= 3) {
                const last = pts[pts.length - 1];
                const text = celkem.toFixed(2) + ' m';
                const textW = text.length * 7 / scale;
                const up = this.screenUp();
                const dist = 35 / scale;
                const textRot = this.screenTextRotation();
                this.renderer.tempLayer.add(new Konva.Text({
                    x: last.x + up.x * dist,
                    y: last.y + up.y * dist,
                    text: text,
                    fontSize: 12 / scale,
                    fill: '#1d4ed8',
                    fontFamily: 'monospace',
                    fontStyle: 'bold',
                    rotation: textRot,
                    offsetX: textW / 2, // align center
                    offsetY: 12 / scale, // spodní hrana textu
                    name: 'metr-temp',
                }));
            }

            this.renderer.tempLayer.batchDraw();
        },

        // ═══════════════════════════════════════════════════════
        // ZVÝRAZŇOVAČ — rendering
        // ═══════════════════════════════════════════════════════
        renderZvyrazneni() {
            if (!this.renderer || !this.renderer.highlightLayer) return;
            // Překreslit všechny zvýraznění (ne mazat a kreslit znovu — to způsobuje blikání)
            // Smazat jen ty co tam už nejsou
            this.renderer.overlayLayer.find('.highlight').forEach(n => n.destroy());
            for (const z of this.zvyrazneniBody) {
                const line = new Konva.Line({
                    points: z.points,
                    stroke: 'rgba(255, 105, 180, 0.45)',
                    strokeWidth: 13 / (this.stage.scaleX() || 1),
                    lineCap: 'round',
                    lineJoin: 'round',
                    listening: false,
                    name: 'highlight',
                });
                this.renderer.overlayLayer.add(line);
            }
            this.renderer.overlayLayer.batchDraw();
        },

        renderZvyrazTemp() {
            this.renderer.clearTemp();
            if (!this._zvyrazKresba || this._zvyrazKresba.points.length < 4) return;
            const line = new Konva.Line({
                points: this._zvyrazKresba.points,
                stroke: 'rgba(255, 105, 180, 0.45)',
                strokeWidth: 13 / this.stage.scaleX(),
                lineCap: 'round',
                lineJoin: 'round',
                listening: false,
                name: 'temp', // aby clearTemp() / smazZvyrazneni() preview našly
            });
            this.renderer.tempLayer.add(line);
            this.renderer.tempLayer.batchDraw();
        },

        smazZvyrazneni() {
            this.zvyrazneniBody = [];
            this._zvyrazLastPt = null;
            this._zvyrazNextId = 1;
            // POZOR: tempLayer === overlayLayer === labelLayer === highlightLayer
            // (alias na stejný Konva.Layer). Dříve tu bylo tempLayer.destroyChildren(),
            // což smazalo i kóty, popisky, místnosti a nábytek — všechno se kreslí
            // do overlayLayer. Teď selektivní find/destroy: jen highlights a temp shapes.
            if (this.renderer && this.renderer.overlayLayer) {
                this.renderer.overlayLayer.find('.highlight').forEach(n => n.destroy());
                this.renderer.overlayLayer.find('.temp').forEach(n => n.destroy());
                this.renderer.overlayLayer.batchDraw();
            }
        },

        // ═══════════════════════════════════════════════════════
        // KATASTR
        // ═══════════════════════════════════════════════════════
        async katastrHledejKu() {
            const q = this.katastrKuHledani.trim().toLowerCase();
            if (q.length < 2) { this.katastrKuVysledky = []; this.katastrKuNabidk = false; return; }

            if (!this._katastrData) {
                try {
                    const resp = await fetch('/data/katastry.json');
                    this._katastrData = await resp.json();
                } catch (e) {
                    console.warn('Katastry.json:', e);
                    window.zalogujChybu?.(e, 'Koncept V3: načtení katastry.json');
                    return;
                }
            }

            this.katastrKuVysledky = this._katastrData
                .filter(ku => ku.n.toLowerCase().includes(q) || (ku.o && ku.o.toLowerCase().includes(q)))
                .slice(0, 15);
            this.katastrKuNabidk = this.katastrKuVysledky.length > 0;
        },

        katastrVyberKu(ku) {
            this.katastrVybraneKu = ku;
            this.katastrKuHledani = ku.n + ' (' + ku.o + ')';
            this.katastrKuNabidk = false;
        },

        async katastrNactiParcelu() {
            if (!this.katastrVybraneKu || !this.katastrCislo.trim()) return;
            this.katastrNacitani = true;
            this.katastrChyba = '';

            try {
                const resp = await fetch(initialData.routes.katastrParcela, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({ ku_kod: this.katastrVybraneKu.k, cislo: this.katastrCislo.trim(), typ: this.katastrTyp }),
                });
                const d = await resp.json();
                if (d.error || !d.parcela) {
                    // Chyba serveru (500) vrací jen {message} — bez parcely nepokračovat
                    this.katastrChyba = d.error || d.message || 'Parcelu se nepodařilo načíst.';
                    this.katastrNacitani = false;
                    return;
                }

                const parcela = d.parcela;
                parcela.druh_pozemku_cz = this._katastrDruhCz[parcela.druh_pozemku] || parcela.druh_pozemku || '—';

                // Duplicita — parcela se stejným KÚ kódem + číslem + typem už nesmí být přidaná
                const jeDuplicita = this.katastrParcely.some(p =>
                    p.cislo === parcela.cislo
                    && (p.typ || 'pozemkova') === (parcela.typ || 'pozemkova')
                    && (p.ku_kod || '') === (parcela.ku_kod || '')
                );
                if (jeDuplicita) {
                    this.katastrChyba = 'Tato parcela už je přidaná.';
                    this.katastrNacitani = false;
                    return;
                }

                // Sousednost — nová parcela musí sousedit s některou existující
                if (this.katastrParcely.length > 0) {
                    try {
                        const sResp = await fetch(initialData.routes.katastrSousednost, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                            body: JSON.stringify({
                                nova: parcela.polygon_sjtsk,
                                stavajici: this.katastrParcely.map(p => p.polygon_sjtsk),
                            }),
                        });
                        const sD = await sResp.json();
                        parcela._sousedi = sD.sousedi;
                        if (!sD.sousedi || sD.sousedi === false) {
                            this.katastrChyba = 'Parcela nesousedí s žádnou z načtených parcel. Lze přidat pouze sousedící parcely.';
                            this.katastrNacitani = false;
                            return;
                        }
                    } catch (e) {
                        parcela._sousedi = null;
                        window.zalogujChybu?.(e, 'Koncept V3: ověření sousednosti parcel', { projektId: this.projektId, parcela: parcela.label || parcela.cislo });
                    }
                }

                this.katastrParcely.push(parcela);

                // Stavby
                await this.katastrNactiStavbyParcely(parcela);
                // User-triggered add → force AI regeneraci (odstranění + znovupřidání = čerstvé vysvětlení)
                this.katastrNactiLimityParcely(parcela, { force: true });

                // Načíst okolní parcely + výškový profil
                await this._katastrNactiOkolni();
                this.katastrNactiProfil(); // async, nečekáme

                // Překreslit vše — katastr i mapy (přepočítat pro novou parcelu)
                this.katastrPrekreslitCanvas();
                if (this.katastrMapaPodklad !== 'zadny') {
                    this.katastrZmenPodklad();
                }
                this.katastrCislo = '';
                this._katastrAutosave();

            } catch (e) {
                this.katastrChyba = 'Chyba: ' + e.message;
                window.zalogujChybu?.(e, 'Koncept V3: načtení parcely', {
                    projektId: this.projektId, ku: this.katastrVybraneKu, cislo: this.katastrCislo, typ: this.katastrTyp,
                });
            }
            this.katastrNacitani = false;
        },

        async katastrNactiStavbyParcely(parcela) {
            // Vypočítat bbox z polygon_wgs84 pokud chybí
            if (!parcela.bbox) {
                const poly = parcela.polygon_wgs84;
                if (!poly || poly.length === 0) return; // Bez WGS84 nelze
                const lats = poly.map(c => c[0]).filter(v => !isNaN(v));
                const lons = poly.map(c => c[1]).filter(v => !isNaN(v));
                if (lats.length === 0 || lons.length === 0) return;
                parcela.bbox = {
                    min_lat: Math.min(...lats),
                    max_lat: Math.max(...lats),
                    min_lon: Math.min(...lons),
                    max_lon: Math.max(...lons),
                };
            }
            if (!parcela.bbox || isNaN(parcela.bbox.min_lat)) return;
            try {
                const resp = await fetch(initialData.routes.katastrStavby, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({ bbox: parcela.bbox }),
                });
                const d = await resp.json();
                if (d.ok && d.stavby) {
                    parcela.stavby = d.stavby;
                } else {
                    parcela.stavby = [];
                }
            } catch (e) {
                parcela.stavby = [];
                window.zalogujChybu?.(e, 'Koncept V3: načtení staveb parcely', { projektId: this.projektId, parcela: parcela.label || parcela.cislo });
            }
        },

        /**
         * Načte textové limity a rizika pro parcelu přes ArcGIS Identify API:
         *   - radon index + geologie (ČGS radon50 layer 1)
         *   - inženýrskogeologický rajon pro základy (ČGS IG_rajony50 layer 1)
         * Záplavové mapy zatím ne — VÚV/DIBAVOD nemá stabilní veřejný endpoint.
         *
         * Výsledky uloží na parcelu jako p.radon, p.geologie, p.ig_rajon (strings).
         */
        async katastrNactiLimityParcely(parcela, opts = {}) {
            const forceAi = !!opts.force;
            const poly = parcela.polygon_wgs84;
            if (!poly || poly.length === 0) return;
            // Centroid parcely
            const lats = poly.map(c => c[0]); const lons = poly.map(c => c[1]);
            const cLat = lats.reduce((a,b)=>a+b,0)/lats.length;
            const cLon = lons.reduce((a,b)=>a+b,0)/lons.length;
            const geom = encodeURIComponent(JSON.stringify({ x: cLon, y: cLat, spatialReference: { wkid: 4326 } }));
            const baseParams = [
                'geometry=' + geom,
                'geometryType=esriGeometryPoint',
                'sr=4326',
                'tolerance=5',
                'mapExtent=' + (cLon-0.05) + ',' + (cLat-0.05) + ',' + (cLon+0.05) + ',' + (cLat+0.05),
                'imageDisplay=400,400,96',
                'returnGeometry=false',
                'f=pjson',
            ].join('&');
            const RADON_IDX = { '1': 'nízký', '2': 'přechodný', '3': 'střední', '4': 'vysoký' };
            // Radon + geologie (layer 1). layers=all:1 = prohledat layer 1 bez ohledu
            // na scale visibility (visible:1 občas selže pokud scale mimo layer range).
            try {
                const r = await fetch('https://mapy.geology.cz/arcgis/rest/services/Geohazardy/radon50/MapServer/identify?layers=all:1&' + baseParams);
                const d = await r.json();
                const f = (d.results || [])[0];
                if (f) {
                    const a = f.attributes || {};
                    const idx = a['Převažující radonový index'];
                    const popis = a['Radonový index - popis'];
                    parcela.radon = (RADON_IDX[idx] || idx || '?') + (popis ? ' (' + popis + ')' : '');
                    parcela.geologie = (a['Hornina'] || '') + (a['Útvar'] ? ' — ' + a['Útvar'] : '');
                }
            } catch (e) {
                // Externí služba mapy.geology.cz — bez dat parcela jen nemá radon/geologii
                window.zalogujChybu?.(e, 'Koncept V3: radon a geologie (ČGS)', { parcela: parcela.label || parcela.cislo });
            }
            // IG rajon 1:50 000 — pro základy (preferujeme detail před 1:500 000)
            try {
                const r = await fetch('https://mapy.geology.cz/arcgis/rest/services/Geohazardy/IG_rajony50/MapServer/identify?layers=all:1&' + baseParams);
                const d = await r.json();
                const f = (d.results || [])[0];
                if (f) {
                    const a = f.attributes || {};
                    const nazev = a['Název IG rajonu'] || a['Název rajonu'] || '';
                    const charakt = a['IG charakteristika rajonu'] || '';
                    parcela.ig_rajon = nazev + (charakt ? ' — ' + charakt : '');
                }
            } catch (e) {
                window.zalogujChybu?.(e, 'Koncept V3: IG rajon (ČGS)', { parcela: parcela.label || parcela.cislo });
            }
            // Při force (user-triggered add / re-add) vygenerujeme AI vysvětlení čerstvě
            // pro všechny 3 pole a rovnou uložíme do parcela._vysvetleni (nastavuje se
            // i po prvním [?] kliku, takže user vidí hned čerstvou verzi, ne cached old).
            if (forceAi) {
                const map = [
                    { txt: parcela.radon, kontext: 'radon', field: 'radon' },
                    { txt: parcela.geologie, kontext: 'geologie', field: 'geologie' },
                    { txt: parcela.ig_rajon, kontext: 'ig', field: 'ig_rajon' },
                ];
                // Vynulovat existující AI cache v parcela state
                if (parcela._vysvetleni) parcela._vysvetleni = {};
                const self = this;
                for (const item of map) {
                    if (!item.txt) continue;
                    this.vysvetliPojem(item.txt, item.kontext, true).then(res => {
                        if (!res.ok || !res.popis) return;
                        const idx = self.katastrParcely.indexOf(parcela);
                        if (idx < 0) return; // parcela mezitím smazána
                        const curr = self.katastrParcely[idx];
                        self.katastrParcely[idx] = {
                            ...curr,
                            _vysvetleni: {
                                ...(curr._vysvetleni || {}),
                                [item.field]: { loading: false, popis: res.popis },
                            },
                        };
                    });
                }
            }
        },

        /**
         * Reusable helper pro AI vysvětlení pojmů s DB cache.
         * Použití: await this.vysvetliPojem('spraš', 'geologie')
         * @param {boolean} force - true přeskočí cache, regeneruje a přepíše
         * @returns {Promise<{ok, popis?, error?, cached?}>}
         */
        async vysvetliPojem(termin, kontext = null, force = false) {
            try {
                const resp = await fetch(initialData.routes.vysvetleni, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({ termin, kontext, force }),
                });
                return await resp.json();
            } catch (e) {
                window.zalogujChybu?.(e, 'Koncept V3: AI vysvětlení pojmu', { termin, kontext, force });
                return { ok: false, error: e.message };
            }
        },

        /**
         * Otevře/zavře inline vysvětlivku u parcely. Toggle behavior —
         * klik na stejné pole zavře. Používá p._vysvetleni (Alpine-reactivní
         * přes reassign).
         */
        async otevriVysvetleni(parcelaIdx, pole) {
            const p = this.katastrParcely[parcelaIdx];
            if (!p) return;
            const textMap = { radon: p.radon, geologie: p.geologie, ig_rajon: p.ig_rajon };
            const kontextMap = { radon: 'radon', geologie: 'geologie', ig_rajon: 'ig' };
            const text = textMap[pole];
            if (!text) return;
            const cache = p._vysvetleni || {};
            // Toggle — pokud právě otevřeno, zavřít
            if (p._vysvetleni_open === pole) {
                this.katastrParcely[parcelaIdx] = { ...p, _vysvetleni_open: null };
                return;
            }
            // Již načteno — jen otevřít
            if (cache[pole] && !cache[pole].loading) {
                this.katastrParcely[parcelaIdx] = { ...p, _vysvetleni_open: pole };
                return;
            }
            // Fetch poprvé
            this.katastrParcely[parcelaIdx] = {
                ...p,
                _vysvetleni: { ...cache, [pole]: { loading: true } },
                _vysvetleni_open: pole,
            };
            const res = await this.vysvetliPojem(text, kontextMap[pole]);
            const current = this.katastrParcely[parcelaIdx];
            const val = res.ok ? { loading: false, popis: res.popis } : { loading: false, error: res.error || 'Chyba' };
            this.katastrParcely[parcelaIdx] = {
                ...current,
                _vysvetleni: { ...(current._vysvetleni || {}), [pole]: val },
            };
        },

        async katastrOdeberParcelu(index) {
            // Varování při odebírání poslední parcely
            if (this.katastrParcely.length === 1) {
                if (!confirm('Opravdu odebrat poslední parcelu? Ukotvení objektů k pozemku se tím ztratí.')) return;
            }
            this.katastrParcely.splice(index, 1);
            this.katastrProfil = null;
            // Výškové body NEmazat — data z DMR 5G se mění pomalu (měsíčně),
            // ponechat v cache pro budoucí reconnect. katastrNactiProfil si
            // sám ověří cache hash a případně fetchne aktuální sadu.
            this._vyskyNacitani = false;

            if (this.katastrParcely.length === 0) {
                this._katastrOkolni = null;
                this.katastrMapaPodklad = 'zadny';
                this._katastrMapTiles = [];
                if (this.renderer) this.renderer.clearMapTiles();
            }

            await this._katastrNactiOkolni();
            this.katastrPrekreslitCanvas();
            if (this.katastrParcely.length > 0 && this.katastrMapaPodklad !== 'zadny') {
                this.katastrZmenPodklad();
            }
            this._katastrAutosave();
            // Přepočítat výškový profil pro zbylé parcely
            if (this.katastrParcely.length > 0) {
                this.katastrNactiProfil();
            }
        },

        katastrZvyrazniParcelu(index) {
            this._katastrZvyraznenyIndex = index;
            this.katastrPrekreslitCanvas();
        },

        zvyrazniObjekt(wallId) {
            this.hoverObjektId = wallId;
            if (this.renderer) {
                this.renderer.highlightWall(wallId);
            }
        },

        katastrCelkovaVymera() {
            return this.katastrParcely.reduce((sum, p) => sum + (p.vymera || 0), 0);
        },

        async katastrNactiProfil() {
            if (this.katastrParcely.length === 0 || this._vyskyNacitani) return;

            // Cache GLOBÁLNÍ (per-parcel-set, ne per-project) — stejná sada
            // parcel z jiného konceptu = cache hit. DMR 5G se mění pomalu,
            // invalidace časová 30 dní.
            const cacheHash = this.katastrParcely.map(p => p.label || p.cislo).sort().join('|');
            const cacheKey = 'kv3_vysky_g_' + cacheHash; // g = globální
            const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
            try {
                const c = JSON.parse(localStorage.getItem(cacheKey) || 'null');
                if (c) {
                    const age = Date.now() - (c._timestamp || 0);
                    if (age < MAX_CACHE_AGE_MS) {
                        this.vyskovyProfil = c;
                        if (this.katastrZobrazitVysky) this.katastrPrekreslitCanvas();
                        return;
                    }
                }
            } catch(_) {}
            // Migrace ze staré per-project cache (kk_vysky_{id}) pokud existuje
            // a aktuální global cache nemáme — zkopírovat to novému klíči.
            try {
                const old = JSON.parse(localStorage.getItem('kv3_vysky_' + (this.projektId || '0')) || 'null');
                if (old && old._hash === cacheHash) {
                    const age = Date.now() - (old._timestamp || 0);
                    if (age < MAX_CACHE_AGE_MS) {
                        this.vyskovyProfil = old;
                        try { localStorage.setItem(cacheKey, JSON.stringify(old)); } catch(_) {}
                        if (this.katastrZobrazitVysky) this.katastrPrekreslitCanvas();
                        return;
                    }
                }
            } catch(_) {}

            this._vyskyNacitani = true;
            this.katastrNacitaniProfil = true;
            try {
                const polygony = this.katastrParcely
                    .map(p => p.polygon_wgs84)
                    .filter(p => p && p.length >= 3);
                if (polygony.length === 0) { this.katastrNacitaniProfil = false; this._vyskyNacitani = false; return; }

                const resp = await fetch(initialData.routes.katastrVyskovy, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({ polygony }),
                });
                const d = await resp.json();
                if (d.ok && d.profil && d.profil.body && d.profil.body.length > 0) {
                    d.profil._hash = cacheHash;
                    d.profil._timestamp = Date.now();
                    this.vyskovyProfil = d.profil;
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(d.profil));
                    } catch (e) {
                        // localStorage full — vymazat staré per-project kk_vysky_
                        // a starší global kk_vysky_g_
                        try {
                            const keys = Object.keys(localStorage);
                            for (const k of keys) {
                                if (k.startsWith('kv3_vysky_') && k !== cacheKey) {
                                    localStorage.removeItem(k);
                                }
                            }
                            localStorage.setItem(cacheKey, JSON.stringify(d.profil));
                        } catch (_) {}
                    }
                    if (this.katastrZobrazitVysky) this.katastrPrekreslitCanvas();
                }
            } catch (e) {
                console.warn('Výškový profil chyba:', e.message);
                window.zalogujChybu?.(e, 'Koncept V3: výškový profil', { projektId: this.projektId, parcel: this.katastrParcely.length });
            }
            this.katastrNacitaniProfil = false;
            this._vyskyNacitani = false;
        },

        katastrPrekreslitCanvas() {
            if (!this.renderer) return;
            this.renderer.renderKatastr(
                this.katastrParcely,
                this.katastrZobrazitParcely,
                this.katastrZobrazitStavby,
                this.katastrZobrazitSousedy,
                this._katastrZvyraznenyIndex,
                this._katastrOkolni,
                this.kompasUhel,
                this.katastrZobrazitVysky ? this.vyskovyProfil : null
            );
        },

        katastrZmenPodklad() {
            if (this.katastrParcely.length === 0 && this.katastrMapaPodklad !== 'zadny') {
                this.katastrMapaPodklad = 'zadny';
                return;
            }
            if (!this.renderer) return;
            if (this.katastrMapaPodklad === 'zadny') {
                this.renderer.clearMapTiles();
            } else {
                this.renderer.loadMapTiles(
                    this.katastrParcely,
                    this.katastrMapaPodklad,
                    initialData.mapyczApiKey
                );
            }
        },

        kompasStart(e) {
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
            const startKompas = this.kompasUhel;

            const onMove = (ev) => {
                const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
                // Snap po 0.1° — plynulá rotace, minimální zaokrouhlovací šum
                this.kompasUhel = Math.round((startKompas + (angle - startAngle)) * 10) / 10;
                this.aplikujRotaci();
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                this._katastrAutosave();
                this.ulozitNastaveni();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        },

        aplikujRotaci(keepPosition = false) {
            if (!this.stage) return;
            const sw = this.stage.width() / 2;
            const sh = this.stage.height() / 2;
            if (keepPosition) {
                // Init restore — uložený offset/pozici nepřepisovat, jen aplikovat rotaci
                this.stage.rotation(this.kompasUhel);
            } else {
                // User akce (drag kompasu, dblclick reset) — zachovat to, co user vidí:
                // world bod pod středem obrazovky zůstane pod středem i po změně rotace.
                const worldCenter = this.stage.getAbsoluteTransform().copy().invert().point({ x: sw, y: sh });
                this.stage.offsetX(worldCenter.x);
                this.stage.offsetY(worldCenter.y);
                this.stage.x(sw);
                this.stage.y(sh);
                this.stage.rotation(this.kompasUhel);
            }
            this.stage.batchDraw();
            // Překreslit katastr labely (orientace textů)
            this.katastrPrekreslitCanvas();
        },

        async _katastrNactiOkolni() {
            if (this.katastrParcely.length === 0) { this._katastrOkolni = null; return; }
            try {
                // Bbox ze všech parcel WGS84 + margin
                const allWgs = this.katastrParcely.flatMap(p => p.polygon_wgs84 || []);
                if (allWgs.length === 0) return;
                const lats = allWgs.map(c => c[0]);
                const lons = allWgs.map(c => c[1]);
                const margin = 0.0002; // ~20m bbox pro WFS dotaz
                const bbox = {
                    min_lat: Math.min(...lats) - margin,
                    max_lat: Math.max(...lats) + margin,
                    min_lon: Math.min(...lons) - margin,
                    max_lon: Math.max(...lons) + margin,
                };
                const resp = await fetch(initialData.routes.katastrOkolni, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({ bbox }),
                });
                const d = await resp.json();
                if (d.ok && d.parcely) {
                    // Odfiltrovat vlastní parcely a vzdálené (>5m od hranice)
                    const vlastniLabels = new Set(this.katastrParcely.map(p => p.label));
                    const maxDist = 0.000045; // ~5m v degrees
                    this._katastrOkolni = d.parcely.filter(p => {
                        if (vlastniLabels.has(p.label)) return false;
                        if (!p.polygon_wgs84 || p.polygon_wgs84.length < 3) return false;
                        // Kontrola min vzdálenosti od vlastní hranice
                        for (const vp of this.katastrParcely) {
                            if (!vp.polygon_wgs84) continue;
                            for (const pt of p.polygon_wgs84) {
                                for (const vpt of vp.polygon_wgs84) {
                                    const d = Math.hypot(pt[0] - vpt[0], pt[1] - vpt[1]);
                                    if (d < maxDist) return true;
                                }
                            }
                        }
                        return false;
                    });
                    this.katastrPrekreslitCanvas();
                }
            } catch (e) {
                console.warn('Okolní parcely:', e);
                window.zalogujChybu?.(e, 'Koncept V3: okolní parcely', { projektId: this.projektId, parcel: this.katastrParcely.length });
            }
        },

        hoverObjektId: null,
        _katastrZvyraznenyIndex: null,
        _katastrSaveTimer: null,
        _katastrAutosave() {
            if (!this.projektId) return;
            clearTimeout(this._katastrSaveTimer);
            this._katastrSaveTimer = setTimeout(async () => {
                try {
                    const url = (initialData.routes.katastrUlozit || '').replace(':id', this.projektId);
                    if (!url) return;
                    const resp = await fetch(url, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                        body: JSON.stringify({
                            katastr: {
                                // Ukládat jen persistentní data (stavby/bbox se načítají znovu z ČÚZK)
                                parcely: this.katastrParcely.map(p => ({
                                    cislo: p.cislo, typ: p.typ, label: p.label,
                                    polygon_wgs84: p.polygon_wgs84,
                                    polygon_sjtsk: p.polygon_sjtsk,
                                    centroid_wgs84: p.centroid_wgs84,
                                    vymera: p.vymera, druh_pozemku: p.druh_pozemku,
                                    druh_pozemku_cz: p.druh_pozemku_cz,
                                    _sousedi: p._sousedi,
                                })),
                                ku: this.katastrVybraneKu,
                                podklad: this.katastrMapaPodklad,
                                kompasUhel: this.kompasUhel,
                                aiModel: this.aiModel,
                            },
                        }),
                    });
                    if (!resp.ok) {
                        window.zalogujChybu?.('Uložení katastru selhalo (HTTP ' + resp.status + ')', 'Koncept V3: autosave katastru', { projektId: this.projektId, status: resp.status });
                    }
                } catch (e) {
                    // Uživatel nic nevidí, ale data parcel se neuložila
                    window.zalogujChybu?.(e, 'Koncept V3: autosave katastru', { projektId: this.projektId });
                }
            }, 1000);
        },

        // ═══════════════════════════════════════════════════════
        // COPY / PASTE
        // ═══════════════════════════════════════════════════════
        kopirovat() {
            if (!this.renderer || this.renderer.selectedWalls.size === 0) return;

            const walls = [];
            const nodeMap = new Map(); // starý nodeId → {x, y}

            for (const wallId of this.renderer.selectedWalls) {
                const wall = this.engine.walls.get(wallId);
                if (!wall) continue;
                const nA = this.engine.nodes.get(wall.nodeA);
                const nB = this.engine.nodes.get(wall.nodeB);
                if (!nA || !nB) continue;

                nodeMap.set(wall.nodeA, { x: nA.x, y: nA.y });
                nodeMap.set(wall.nodeB, { x: nB.x, y: nB.y });

                walls.push({
                    nodeA: wall.nodeA,
                    nodeB: wall.nodeB,
                    tloustka: wall.tloustka,
                    typ: wall.typ,
                    nazev: wall.nazev,
                });
            }

            // Kopírovat i otvory na vybraných stěnách
            const openings = [];
            for (const opening of this.engine.openings.values()) {
                if (this.renderer.selectedWalls.has(opening.wallId)) {
                    openings.push({ ...opening });
                }
            }

            this.clipboard = { walls, openings, nodes: Object.fromEntries(nodeMap) };
            this.pasteCount = 0;
        },

        vlozit() {
            if (!this.clipboard || this.clipboard.walls.length === 0) return;

            this.engine.pushUndo();
            this.pasteCount++;
            const offset = this.pasteCount * 40; // 40px = 0.5m

            // Mapování starých nodeId → nové nodeId
            const nodeRemap = new Map();
            const newWallIds = [];

            for (const [oldNodeId, pos] of Object.entries(this.clipboard.nodes)) {
                const newNode = this.engine.addNode(pos.x + offset, pos.y + offset);
                nodeRemap.set(oldNodeId, newNode.id);
            }

            // Vytvořit stěny s novými nody
            const wallRemap = new Map();
            for (const w of this.clipboard.walls) {
                const newNodeA = nodeRemap.get(w.nodeA);
                const newNodeB = nodeRemap.get(w.nodeB);
                if (!newNodeA || !newNodeB) continue;

                const nA = this.engine.nodes.get(newNodeA);
                const nB = this.engine.nodes.get(newNodeB);
                if (!nA || !nB) continue;

                const id = this.engine._id('S');
                const newWall = { id, nodeA: newNodeA, nodeB: newNodeB, tloustka: w.tloustka, typ: w.typ, nazev: w.nazev };
                this.engine.walls.set(id, newWall);
                newWallIds.push(id);

                // Remap pro otvory
                const oldWallKey = w.nodeA + '_' + w.nodeB;
                wallRemap.set(oldWallKey, id);
            }

            // Kopírovat otvory
            for (const o of this.clipboard.openings) {
                const oldWall = this.clipboard.walls.find(w => {
                    const wId = this.engine.walls.get(o.wallId);
                    return false; // fallback — hledáme přes wallId
                });
                // Jednodušší: najít novou stěnu se stejným indexem
                const origWallIdx = this.clipboard.walls.findIndex(w => {
                    // Původní wallId neznáme, ale otvor odkazuje na wallId
                    return true; // přiřadíme k první stěně jako fallback
                });
                if (newWallIds.length > 0) {
                    this.engine.addOpening(newWallIds[0], o.pozice, o.sirka, o.typ);
                }
            }

            // Vybrat nové objekty
            this.renderer.setSelection(newWallIds);
            this.autoSave("Ctrl+V vložení");
        },

        // ═══════════════════════════════════════════════════════
        // OBJECT PANEL
        // ═══════════════════════════════════════════════════════
        editObjektId: null,
        editObjektNazev: '',

        zacniEditObjekt(id, nazev) {
            this.editObjektId = id;
            this.editObjektNazev = nazev;
            this.$nextTick(() => {
                // Najít input v seznamu objektů (x-ref nefunguje v x-for)
                const inputs = this.$el.querySelectorAll('input[x-model="editObjektNazev"]');
                const input = inputs.length > 0 ? inputs[inputs.length - 1] : null;
                if (input) { input.focus(); input.select(); }
            });
        },

        ulozitEditObjekt() {
            if (!this.editObjektId || !this.editObjektNazev.trim()) {
                this.editObjektId = null;
                return;
            }
            // Uložit název do engine (wall nebo opening)
            const wall = this.engine.walls.get(this.editObjektId);
            if (wall) {
                wall.nazev = this.editObjektNazev.trim();
            }
            const opening = this.engine.openings.get(this.editObjektId);
            if (opening) {
                opening.nazev = this.editObjektNazev.trim();
            }
            this.editObjektId = null;
            this.autoSave("Přejmenování objektu");
        },

        smazatObjekt(id) {
            this.engine.pushUndo();
            if (this.engine.walls.has(id)) {
                this.engine.removeWall(id);
            } else if (this.engine.openings.has(id)) {
                this.engine.removeOpening(id);
            }
            this.renderer.clearSelection();
            this.renderer.render();
            this.autoSave("Smazání objektu");
        },

        vyberObjekt(id) {
            if (this.editObjektId) return; // probíhá editace
            const wall = this.engine.walls.get(id);
            if (wall) {
                this.renderer.setSelection([id]);
                return;
            }
            const opening = this.engine.openings.get(id);
            if (opening) {
                this.renderer.setSelection([], [], [id]);
            }
        },

        // ═══════════════════════════════════════════════════════
        // SAVE / LOAD
        // ═══════════════════════════════════════════════════════
        autoSaveTimer: null,
        _zakladamKoncept: false,
        _posledniAkce: '',

        autoSave(akce) {
            // Krok vzniká hned — uložení se odkládá a spojilo by víc akcí do jedné.
            this._zapisKrok(akce);
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => this.ulozit(), 2000);
        },

        // ─── Historie (časová osa kroků) ───────────────────────
        _historieInit(aktualniId) {
            this._stavKroku = this.engine ? JSON.stringify(this.engine.toJSON()) : null;
            const i = this.historie.findIndex(k => k.id === aktualniId);
            this.historiePozice = i >= 0 ? i : this.historie.length - 1;
            // Uložené adresy podkladu mohou patřit jinému hostu — porovnává se podle nich
            for (const k of this.historie) {
                if (k.podklad) k.podklad = this.podkladAdresy?.(k.podklad) ?? k.podklad;
            }
            // Kroky z doby před vezením podkladu jeho polohu neznají. U kroku,
            // na kterém se stojí, platí ta uložená — Zpět sem ji pak umí vrátit.
            const aktualni = this.historie[this.historiePozice];
            if (aktualni && !aktualni.podklad) aktualni.podklad = this.podkladPolohaZachyt?.() ?? null;
            // Bez historie (nový koncept, data ze serveru) — výchozí krok, ať se
            // dá vrátit i úplně první úprava. Odešle se s první uloženou změnou.
            if (!this.historie.length && this.engine) {
                const krok = this._novyKrok('Začátek', JSON.parse(this._stavKroku));
                this.historie = [krok];
                this.historiePozice = 0;
                this._neodeslaneKroky.push(krok.id);
            }
        },

        _novyKrok(popis, data) {
            return {
                id: 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
                popis: popis || 'Úprava',
                data,
                cas: new Date().toISOString(),
                podklad: this.podkladPolohaZachyt?.() ?? null,
            };
        },

        /**
         * Zapíše současnou kresbu jako nový krok za aktuální pozici (kroky
         * po Zpět se zahodí). Beze změny kresby nevznikne nic.
         */
        _zapisKrok(popis) {
            if (!this.engine) return false;
            const json = JSON.stringify(this.engine.toJSON());
            if (json === this._stavKroku) return false;
            // denní limit úprav tarifu (limit-tarifu.js) — nad limit se kresba vrátí
            if (this._limitPovolKrok?.() === false) return false;
            const krok = this._novyKrok(popis, JSON.parse(json));
            let kroky = this.historie.slice(0, this.historiePozice + 1);
            kroky.push(krok);
            if (kroky.length > 50) kroky = kroky.slice(-50);
            this.historie = kroky;
            this.historiePozice = kroky.length - 1;
            this._stavKroku = json;
            this._neodeslaneKroky.push(krok.id);
            this._limitPoKroku?.();
            return true;
        },

        /**
         * Krátce rozsvítí šipku, nadpis Historie a aktuální řádek — změna
         * kresby po Zpět nemusí být vidět, a tak aspoň tohle řekne, co se stalo.
         * Animace se při rychlém opakování spouští znovu od začátku.
         */
        _bliknoutHistorii(smer) {
            const blik = (el, trida) => {
                if (!el) return;
                el.classList.remove(trida);
                void el.offsetWidth;            // reflow — jinak by se stejná animace nespustila znovu
                el.classList.add(trida);
            };
            blik(document.querySelector('[data-historie-' + smer + ']'), 'kk-blik-tlacitko');
            blik(document.querySelector('[data-historie-souhrn]'), 'kk-blik');
            this.$nextTick(() => {
                const radek = document.querySelector('[data-krok="' + this.historie[this.historiePozice]?.id + '"]');
                if (!radek || !radek.offsetParent) return;      // sbalený panel
                radek.scrollIntoView({ block: 'nearest' });
                blik(radek, 'kk-blik');
            });
        },

        /** Přejde na krok historie i (Zpět, Vpřed, klik v panelu). */
        _prejdiNaKrok(i) {
            if (!this.engine || i < 0 || i >= this.historie.length || i === this.historiePozice) return false;
            // uprostřed tažení by výměna kresby nechala viset uzel, který už neexistuje
            if (this.isDraggingWall || this.isDraggingNode || this.isDraggingVybaveni
                    || this.isDraggingOpening || this.isRotating) return false;
            if (this.kreslimStenu || this.stenaUseky.length) {
                this.zrusRozkreslenyUsek();
                this.kreslimStenu = false;
                this.stenaStart = null;
                this.stenaUseky = [];
                this.renderer.clearTemp();
            }

            const krok = this.historie[i];
            const smer = i < this.historiePozice ? 'zpet' : 'vpred';
            this.engine.fromJSON(krok.data);
            this.podkladPolohaObnov?.(krok.podklad);
            this.historiePozice = i;
            this._bliknoutHistorii(smer);
            this._stavKroku = JSON.stringify(this.engine.toJSON());
            this.renderer.clearSelection();
            this.renderer.render();
            // uložit jen posun ukazatele (a data), žádný nový krok
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => this.ulozit(), 2000);
            return true;
        },

        /**
         * Založí koncept, když uživatel začne kreslit bez vybraného projektu.
         *
         * Dřív se v takovém případě ukládání tiše přeskočilo a celá práce se
         * po zavření stránky ztratila — bez jediné hlášky.
         */
        async _zalozKoncept() {
            if (this.projektId || this._zakladamKoncept) return;
            this._zakladamKoncept = true;
            try {
                const nazev = this.projektNazev
                    || ('Koncept ' + new Date().toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }));
                const resp = await fetch(initialData.routes.vytvorit, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({ nazev }),
                });
                const d = await resp.json().catch(() => ({}));
                // tarif nedovolí další projekt — nabídka předplatného, ne chyba
                if (resp.status === 402) { this.limitDialog?.('projekty'); return; }
                if (!resp.ok || !d.ok) throw new Error(d.message || ('HTTP ' + resp.status));
                this.projektId = d.id;
                this.projektNazev = nazev;
                localStorage.setItem('kv3_lastProjekt', String(d.id));
                this.doplnKonceptDoSeznamu(d.id, nazev);
            } catch (e) {
                chybaUzivateli(e, 'Koncept V3: založení konceptu pro uložení práce');
            } finally {
                this._zakladamKoncept = false;
            }
        },

        /**
         * Doplní nově založený koncept do výběru.
         *
         * Seznam konceptů vykresluje server (@foreach), takže koncept vzniklý
         * za běhu by se v něm objevil až po znovunačtení stránky.
         */
        doplnKonceptDoSeznamu(id, nazev) {
            const select = document.querySelector('select[x-model="projektId"]');
            if (!select || select.querySelector('option[value="' + id + '"]')) return;
            const volba = document.createElement('option');
            volba.value = String(id);
            volba.textContent = nazev;
            select.appendChild(volba);
            select.value = String(id);
        },

        async ulozit() {
            if (!this.engine) return;
            // rozkreslená práce bez konceptu → nejdřív ho založit, ať se neztratí
            if (!this.projektId) await this._zalozKoncept();
            if (!this.projektId) return;
            // Změna, která prošla bez autoSave (import, AI), dostane krok tady.
            this._zapisKrok(this._posledniAkce || 'Úprava');
            this._posledniAkce = null;

            // Neodeslané kroky jsou vždy souvislý konec osy — server je připojí
            // za krok `po` a co bylo za ním (vrácené Zpět), zahodí.
            const kroky = this.historie.filter(k => this._neodeslaneKroky.includes(k.id));
            const prvni = kroky.length ? this.historie.indexOf(kroky[0]) : -1;
            const telo = {
                data: this.engine.toJSON(), nazev: this.projektNazev, chat: this.chat,
                aktualni: this.historie[this.historiePozice]?.id ?? null,
            };
            if (kroky.length) {
                telo.kroky = kroky;
                telo.po = prvni > 0 ? this.historie[prvni - 1].id : null;
            }
            try {
                const url = initialData.routes.ulozit.replace(':id', this.projektId);
                const resp = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify(telo),
                });
                if (resp.ok) {
                    const d = await resp.json();
                    this.verze = d.verze || this.verze + 1;
                    const odeslane = kroky.map(k => k.id);
                    this._neodeslaneKroky = this._neodeslaneKroky.filter(id => !odeslane.includes(id));
                    this._limitZeServeru?.(d.zbyva);
                } else if (resp.status === 402) {
                    // Denní limit úprav vyčerpaný jinde (druhá karta) — server dávku nepřijal.
                    // Kroky zůstávají neodeslané; nabídka předplatného, ne chyba.
                    this._limitZeServeru?.(0);
                    this.limitDialog?.('upravy');
                } else {
                    // Neuložená práce — nejbolestivější tichý pád
                    window.zalogujChybu?.('Uložení projektu selhalo (HTTP ' + resp.status + ')', 'Koncept V3: autosave projektu', {
                        projektId: this.projektId, verze: this.verze, akce: this.historie[this.historiePozice]?.popis, kroku: kroky.length, status: resp.status,
                    });
                }
            } catch (e) {
                console.warn('Auto-save chyba:', e);
                window.zalogujChybu?.(e, 'Koncept V3: autosave projektu', { projektId: this.projektId, verze: this.verze, akce: this.historie[this.historiePozice]?.popis, kroku: kroky.length });
            }
        },

        ulozitPanely() {
            localStorage.setItem('kv3_panelOpen', JSON.stringify(this.panelOpen));
        },

        ulozitNastaveni() {
            const state = {
                layoutMode: this.layoutMode,
                splitPct: this.splitPct,
                zoom: this.zoom,
                nastroj: this.nastroj,
                otvorTyp: this.otvorTyp,
                otvorSirka: this.otvorSirka,
                stenaTyp: this.stenaTyp,
                tloustkaSteny: this.tloustkaSteny,
                mapaPodklad: this.katastrMapaPodklad,
                aiModel: this.aiModel,
                showObjekty: this.showObjekty,
                showKoty: this.showKoty,
                showNodes: this.showNodes,
                showGrid: this.showGrid,
                showMistnosti: this.showMistnosti,
                showVybaveni: this.showVybaveni,
                showParcely: this.katastrZobrazitParcely,
                showStavby: this.katastrZobrazitStavby,
                showSousedy: this.katastrZobrazitSousedy,
                showVysky: this.katastrZobrazitVysky,
                kompasUhel: this.kompasUhel,
                rezim3d: this.rezim3d,
                // celaObrazovka záměrně NEUKLÁDAT — fullscreen je per-sezení
                lastProjekt: this.projektId || null,
                stageX: this.stage ? this.stage.x() : 0,
                stageY: this.stage ? this.stage.y() : 0,
                // Offset (pivot pro rotaci) — nutné pro korektní restore při nenulovém kompasu
                stageOffsetX: this.stage ? this.stage.offsetX() : 0,
                stageOffsetY: this.stage ? this.stage.offsetY() : 0,
            };
            localStorage.setItem('kv3_state', JSON.stringify(state));
            // Zpětná kompatibilita pro klíče čtené jinde
            if (this.projektId) localStorage.setItem('kv3_lastProjekt', this.projektId);
        },

        undo() {
            return this._prejdiNaKrok(this.historiePozice - 1);
        },

        redo() {
            return this._prejdiNaKrok(this.historiePozice + 1);
        },

        toggleObjekty() {
            if (this.renderer) {
                this.renderer.wallLayer.visible(this.showObjekty);
                this.renderer.labelLayer.visible(this.showObjekty);
                this.renderer.nodeLayer.visible(this.showObjekty);   // body spojů mají vlastní vrstvu
                this.stage.batchDraw();
            }
            this.ulozitNastaveni();
        },

        toggleKoty() {
            if (this.renderer) {
                this.renderer.showKoty = this.showKoty;
                this.renderer.renderKoty(); this.renderer.resizeVysky();
            }
            this.ulozitNastaveni();
        },

        toggleGrid() {
            if (this.renderer) {
                this.renderer.showGrid = this.showGrid;
                this.renderer.renderGrid();
            }
            this.ulozitNastaveni();
        },

        // ═══════════════════════════════════════════════════════
        // AI CHAT
        // ═══════════════════════════════════════════════════════
        async posliAi() {
            let text = this.aiVstup.trim();
            if (!text || this.aiNacitani) return;

            // Zkratka /navrh → přeskočí rozhovor a rovnou generuje návrh
            // Užitečné pro testování. Příklad: "/navrh dům 4+kk 130 m² bungalov"
            let rovnouNavrh = false;
            if (/^\/navrh\b/i.test(text)) {
                rovnouNavrh = true;
                text = text.replace(/^\/navrh\b\s*/i, '').trim();
                if (!text) text = 'Navrhni typický rodinný dům dle tvého uvážení.';
            }

            this.aiVstup = '';
            this.chat.push({ role: 'user', text: (rovnouNavrh ? '/navrh ' : '') + text, cas: new Date().toISOString() });
            this.aiNacitani = true;
            this.scrollChat();

            try {
                let url, body;
                const maData = this.engine && this.engine.walls.size > 0;

                // Kontext parcely pro AI — tvar, rozměry, výšková data
                const parcelaKontext = this._sestavParcelaKontext();

                // Detekovat stěny pod zvýrazňovačem → kontext pro AI
                const oznaceneSteny = this._detekujOznaceneSteny();

                if (this.projektId && this.faze === 'navrh' && maData) {
                    url = initialData.routes.aiUprav.replace(':id', this.projektId);
                    body = { pozadavek: text, data: this.engine.toJSON(), katastr: parcelaKontext };
                    if (oznaceneSteny.length > 0) body.oznacene = oznaceneSteny;
                } else if (this.projektId) {
                    url = initialData.routes.aiVytvor;
                    body = { popis: text, koncept_id: this.projektId, parcela: parcelaKontext };
                    if (rovnouNavrh) body.rovnou_navrh = true;
                } else {
                    url = initialData.routes.aiVytvor;
                    body = { popis: text, parcela: parcelaKontext };
                    if (rovnouNavrh) body.rovnou_navrh = true;
                }

                body.model = this.aiModel;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify(body),
                });
                const d = await resp.json();

                console.log('[AI response]', JSON.stringify(d).substring(0, 500));
                if (d.error) {
                    this.chat.push({ role: 'ai', text: 'Chyba: ' + d.error, cas: new Date().toISOString() });
                    window.zalogujChybu?.(d.error, 'Koncept V3: AI chat', { projektId: this.projektId, model: this.aiModel, faze: this.faze, status: resp.status });
                } else {
                    const newData = d.data;

                    // Hybridní zpracování: layout vs. příkaz vs. návrh
                    if (newData?.layout) {
                        // Mřížkový layout — engine přeloží do stěn
                        this.engine.pushUndo();
                        const layoutResult = this.engine.fromLayout(newData.layout);
                        this.renderer.render();
                        this.fitView();
                        this.projektData = this.engine.toJSON();
                        // Uložit střechu
                        if (layoutResult.strecha) {
                            this.projektData.strecha = layoutResult.strecha;
                        }
                        if (newData.objekt) this.projektData.objekt = newData.objekt;
                    } else if (newData?.akce) {
                        this._provedAkci(newData);
                    } else if (newData && newData.steny !== undefined && (newData.steny.length > 0 || newData.rozmery)) {
                        // Ochrana: varovat pokud AI nahrazuje většinu stěn
                        const aktualniPocet = this.engine.walls.size;
                        const novyPocet = (newData.steny || []).length;
                        if (aktualniPocet > 3 && novyPocet > 0 && novyPocet < aktualniPocet * 0.5) {
                            if (!confirm('AI chce nahradit ' + aktualniPocet + ' stěn za ' + novyPocet + '. Pokračovat?')) {
                                this.chat.push({ role: 'ai', text: 'Změna zrušena uživatelem.', cas: new Date().toISOString() });
                                this.aiNacitani = false;
                                this.scrollChat();
                                return;
                            }
                        }
                        this.engine.pushUndo();
                        this.engine.fromJSON(newData);
                        this.renderer.render();
                        if (newData.steny && newData.steny.length > 0) this.fitView();
                        this.projektData = newData;
                    }

                    if (d.id && !this.projektId) {
                        this.projektId = d.id;
                        window.location.href = initialData.routes.indexK + '?id=' + d.id;
                        return;
                    }
                    if (d.nazev) this.projektNazev = d.nazev;
                    if (d.verze) this.verze = d.verze;
                    if (d.faze) this.faze = d.faze;

                    const aiText = d.aiOdpoved || d.dotaz || newData?.zmena || newData?.dotaz || '';
                    if (aiText) {
                        this.chat.push({ role: 'ai', text: aiText, cas: new Date().toISOString() });
                    } else if (d.faze === 'rozhovor' || this.faze === 'rozhovor') {
                        // Rozhovor pokračuje ale AI nevrátila text — zkusit znovu
                        this.chat.push({ role: 'ai', text: 'Rozumím. Můžeš pokračovat nebo upřesnit požadavek.', cas: new Date().toISOString() });
                    } else {
                        this.chat.push({ role: 'ai', text: 'Koncept aktualizován.', cas: new Date().toISOString() });
                    }
                    this.ulozit();
                }
            } catch (e) {
                this.chat.push({ role: 'ai', text: 'Chyba: ' + e.message, cas: new Date().toISOString() });
                window.zalogujChybu?.(e, 'Koncept V3: AI chat', { projektId: this.projektId, model: this.aiModel, faze: this.faze });
            }

            this.aiNacitani = false;
            this.scrollChat();
        },

        /** Provede AI příkaz (smazání, undo...) místo přímé JSON manipulace */
        _provedAkci(cmd) {
            const akce = cmd.akce;

            if (akce === 'undo') {
                this.undo();
                return;
            }

            if (akce === 'smazat' && Array.isArray(cmd.ids)) {
                this.engine.pushUndo();
                for (const id of cmd.ids) {
                    // Zkusit smazat jako stěnu, otvor, sloupek...
                    if (this.engine.walls.has(id)) {
                        this.engine.removeWall(id);
                    } else if (this.engine.openings.has(id)) {
                        this.engine.removeOpening(id);
                    }
                }
                this.renderer.clearSelection();
                this.renderer.render();
                this.autoSave(cmd.zmena || 'AI: smazání');
                return;
            }

            // Neznámý příkaz — logovat
            console.warn('[AI] Neznámý příkaz:', akce, cmd);
        },

        /** Detekuje objekty pod zvýrazňovačem — objekt je označen pokud ≥5% jeho délky je pokryto */
        _detekujOznaceneSteny() {
            if (!this.zvyrazneniBody || this.zvyrazneniBody.length === 0 || !this.engine) return [];
            const oznacene = new Set();
            const pxM = this.PX_PER_M;

            // Sesbírat všechny body zvýrazňovače
            const zvBody = [];
            for (const zv of this.zvyrazneniBody) {
                const pts = zv.points;
                for (let i = 0; i < pts.length; i += 2) {
                    zvBody.push({ x: pts[i], y: pts[i + 1] });
                }
            }
            if (zvBody.length === 0) return [];

            // Pro každou stěnu: kolik % její délky je pokryto zvýrazňovačem
            for (const wall of this.engine.walls.values()) {
                const nA = this.engine.nodes.get(wall.nodeA);
                const nB = this.engine.nodes.get(wall.nodeB);
                if (!nA || !nB) continue;
                const dx = nB.x - nA.x, dy = nB.y - nA.y;
                const len = Math.hypot(dx, dy);
                if (len < 1) continue;
                const tl = (wall.tloustka || 0.3) * pxM;

                // Rozdělit stěnu na segmenty a zjistit které jsou pokryté
                const segmentu = Math.max(10, Math.ceil(len / 5)); // segment ~5px
                let pokryto = 0;
                for (let s = 0; s < segmentu; s++) {
                    const t = (s + 0.5) / segmentu;
                    const sx = nA.x + dx * t, sy = nA.y + dy * t;
                    // Je nějaký bod zvýrazňovače blízko tohoto segmentu?
                    for (const zb of zvBody) {
                        if (Math.hypot(zb.x - sx, zb.y - sy) < tl + 10) {
                            pokryto++;
                            break;
                        }
                    }
                }

                if (pokryto / segmentu >= 0.05) {
                    oznacene.add(wall.id);
                }
            }

            // Vrátit názvy označených stěn
            if (oznacene.size === 0) return [];
            let wallNum = 1;
            const result = [];
            for (const wall of this.engine.walls.values()) {
                const nazev = wall.nazev || ('Stěna ' + wallNum);
                if (oznacene.has(wall.id)) {
                    result.push({ id: wall.id, nazev, delka: this.engine.getWallLength(wall.id) });
                }
                wallNum++;
            }
            return result;
        },

        /** Sestaví kontext parcely pro AI — tvar, rozměry, výšková data */
        _sestavParcelaKontext() {
            if (!this.katastrParcely || this.katastrParcely.length === 0) return null;

            const pxM = this.PX_PER_M;
            const parcely = this.katastrParcely.map(p => {
                const info = {
                    label: p.label,
                    ku: p.ku,
                    druh: p.druh_pozemku_cz || p.druh_pozemku,
                };

                // Polygon v metrech — ve STEJNÉM souřadném systému jako stěny konceptu
                // Použít canvas body z rendereru (po WGS84→canvas konverzi) dělené PX_PER_M
                if (p.polygon_wgs84 && p.polygon_wgs84.length > 0 && this.renderer && this.renderer._fixedWgsCenter) {
                    const canvasPts = this.renderer._wgs84NaCanvas(p.polygon_wgs84, this.renderer._fixedWgsCenter);
                    info.polygon_m = canvasPts.map(pt => [
                        Math.round((pt.x / pxM) * 100) / 100,
                        Math.round((-pt.y / pxM) * 100) / 100, // Y invertováno (canvas Y dolů, metry Y nahoru)
                    ]);
                    // Rozměry z canvas bodů
                    const xs = canvasPts.map(pt => pt.x / pxM);
                    const ys = canvasPts.map(pt => pt.y / pxM);
                    info.sirka_m = Math.round((Math.max(...xs) - Math.min(...xs)) * 100) / 100;
                    info.delka_m = Math.round((Math.max(...ys) - Math.min(...ys)) * 100) / 100;
                } else if (p.polygon_sjtsk && p.polygon_sjtsk.length > 0) {
                    // Fallback — S-JTSK relativní souřadnice
                    const cx = p.polygon_sjtsk.reduce((s, pt) => s + pt[0], 0) / p.polygon_sjtsk.length;
                    const cy = p.polygon_sjtsk.reduce((s, pt) => s + pt[1], 0) / p.polygon_sjtsk.length;
                    info.polygon_m = p.polygon_sjtsk.map(pt => [
                        Math.round((pt[0] - cx) * 100) / 100,
                        Math.round((pt[1] - cy) * 100) / 100,
                    ]);
                    const xs = p.polygon_sjtsk.map(pt => pt[0]);
                    const ys = p.polygon_sjtsk.map(pt => pt[1]);
                    info.sirka_m = Math.round((Math.max(...xs) - Math.min(...xs)) * 100) / 100;
                    info.delka_m = Math.round((Math.max(...ys) - Math.min(...ys)) * 100) / 100;
                }

                // Obvod a plocha z polygon_m
                if (info.polygon_m && info.polygon_m.length > 2) {
                    let obvod = 0, plocha = 0;
                    for (let i = 0; i < info.polygon_m.length; i++) {
                        const j = (i + 1) % info.polygon_m.length;
                        obvod += Math.hypot(info.polygon_m[j][0] - info.polygon_m[i][0], info.polygon_m[j][1] - info.polygon_m[i][1]);
                        plocha += info.polygon_m[i][0] * info.polygon_m[j][1];
                        plocha -= info.polygon_m[j][0] * info.polygon_m[i][1];
                    }
                    info.obvod_m = Math.round(obvod * 100) / 100;
                    info.plocha_m2 = Math.round(Math.abs(plocha / 2) * 100) / 100;
                }

                return info;
            });

            const result = { parcely };

            // Výškový profil
            if (this.katastrProfil) {
                const body = this.katastrProfil.body || this.katastrProfil;
                if (Array.isArray(body) && body.length > 0) {
                    const vysky = body.map(b => b.vyska || b.z).filter(v => v != null);
                    if (vysky.length > 0) {
                        result.vyskovy_profil = {
                            min_m: Math.round(Math.min(...vysky) * 100) / 100,
                            max_m: Math.round(Math.max(...vysky) * 100) / 100,
                            rozdil_m: Math.round((Math.max(...vysky) - Math.min(...vysky)) * 100) / 100,
                            pocet_bodu: vysky.length,
                        };
                    }
                }
            }

            return result;
        },

        // formatujChat a scrollChat → sdílené v chat-widget.js (kkFormatujChat, kkScrollChat)

        /**
         * Kliknutí na volbu v chatu — okamžitě odešle (bez nutnosti Enter).
         */
        kkKlikVolba(celyText) {
            if (this.aiNacitani) return;
            this.aiVstup = celyText;
            this.posliAi();
        },

        scrollChat() {
            kkScrollChat(this.$refs.chatBox);
        },

        // ═══════════════════════════════════════════════════════
        // PROJEKTY
        // ═══════════════════════════════════════════════════════
        prepniProjekt() {
            // Volba „Vytvořit nový koncept" ho rovnou založí a otevře přejmenování
            if (!this.projektId) {
                this.novyProjekt();
                return;
            }
            window.location.href = initialData.routes.indexK + '?id=' + this.projektId;
        },

        // Přejmenování konceptu
        _prejmenovaniKonceptu: false,
        _novyNazevKonceptu: '',

        zahajPreimenovaniKonceptu() {
            if (!this.projektId) return;
            this._novyNazevKonceptu = this.projektNazev || '';
            this._prejmenovaniKonceptu = true;
            // Dvojitý nextTick — x-if potřebuje čas na vytvoření DOM elementu
            this.$nextTick(() => {
                setTimeout(() => {
                    const inp = this.$refs.konceptRenameInput;
                    if (inp) { inp.focus(); inp.select(); }
                }, 50);
            });
        },

        async potvrdPreimenovaniKonceptu() {
            if (!this._prejmenovaniKonceptu) return;
            this._prejmenovaniKonceptu = false;
            const novyNazev = this._novyNazevKonceptu.trim();
            if (!novyNazev || novyNazev === this.projektNazev) return;
            this.projektNazev = novyNazev;
            // Přejmenovat i v seznamu pro nabídku (ta se z něj vykresluje)
            const polozka = this.koncepty.find(k => String(k.id) === String(this.projektId));
            if (polozka) polozka.nazev = novyNazev;
            try {
                await fetch(initialData.routes.ulozit.replace(':id', this.projektId), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({ nazev: novyNazev }),
                });
            } catch (e) { console.error('Chyba přejmenování:', e); window.zalogujChybu?.(e, 'koncept přejmenování'); }
        },

        async smazatKoncept() {
            if (!this.projektId) return;
            if (!confirm('Smazat koncept "' + (this.projektNazev || 'Nový koncept') + '"?')) return;
            try {
                await fetch(initialData.routes.smazat.replace(':id', this.projektId), {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                });
                window.location.href = initialData.routes.indexK;
            } catch (e) { console.error('Chyba smazání:', e); window.zalogujChybu?.(e, 'koncept smazání'); }
        },

        async novyProjekt() {
            try {
                const resp = await fetch(initialData.routes.vytvorit, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({ nazev: 'Nový koncept' }),
                });
                const d = await resp.json();
                // tarif nedovolí další projekt — vrátit výběr a nabídnout předplatné (ne chyba)
                if (resp.status === 402) {
                    this.projektId = initialData.projektId || '';
                    this.limitDialog?.('projekty');
                    return;
                }
                // ?nove=1 → po načtení se rovnou otevře input s názvem (viz init)
                if (d.id) {
                    window.location.href = initialData.routes.indexK + '?id=' + d.id + '&nove=1';
                    return;
                }
                this._zrusVytvoreni('Vytvoření konceptu nevrátilo ID', { status: resp.status, odpoved: d });
            } catch (e) {
                console.error('Chyba:', e);
                this._zrusVytvoreni(e);
            }
        },

        /** Vytvoření selhalo — vrátit select na původní koncept, ať neukazuje „Vytvořit nový". */
        _zrusVytvoreni(chyba, detaily) {
            this.projektId = initialData.projektId || '';
            window.zalogujChybu?.(chyba, 'Koncept V3: vytvoření konceptu', detaily);
            alert('Nový koncept se nepodařilo vytvořit. Zkuste to prosím znovu.');
        },

        /** Klik v panelu Historie = skok na krok (jako několikrát Zpět/Vpřed). */
        nactiHistorii(index) {
            this._prejdiNaKrok(index);
        },

        // ═══════════════════════════════════════════════════════
        // LAYOUT
        // ═══════════════════════════════════════════════════════
        cyklujLayout() {
            // jen prohození stran — šířky si uživatel nastavil posuvníkem
            this.layoutMode = this.layoutMode === 0 ? 1 : 0;
            this.ulozitNastaveni();
            this.$nextTick(() => this.resizeKonva());
        },

        prepniFullscreen() {
            this.celaObrazovka = !this.celaObrazovka;
            const header = document.querySelector('header, nav');
            const footer = document.querySelector('footer');
            if (this.celaObrazovka) {
                if (header) header.style.display = 'none';
                if (footer) footer.style.display = 'none';
                this.editorHeight = window.innerHeight;
                document.body.style.overflow = 'hidden';
            } else {
                if (header) header.style.display = '';
                if (footer) footer.style.display = '';
                this.editorHeight = Math.max(400, window.innerHeight - 80);
                document.body.style.overflow = '';
            }
            this.$nextTick(() => this.resizeKonva());
        },

        startDrag(e) {
            this.dragging = true;
            const rect = (this.$refs.gridWrap || this.$el).getBoundingClientRect();
            const onMove = (ev) => {
                ev.preventDefault();
                const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
                const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
                let pct = this.vertikalni
                    ? ((cy - rect.top) / rect.height) * 100
                    : ((cx - rect.left) / rect.width) * 100;
                const grafika = this.obracene ? (100 - pct) : pct;
                this.splitPct = Math.max(20, Math.min(80, grafika));
                this.resizeKonva(false);
            };
            const onUp = () => {
                this.dragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                this.resizeKonva(true);
                this.ulozitNastaveni();
            };
            document.body.style.cursor = this.vertikalni ? 'row-resize' : 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
        },

        resizeKonva(renderGrid = true) {
            if (!this.stage) return;
            const c = this.$refs.konvaContainer;
            if (!c) return;
            this.stage.width(c.offsetWidth);
            this.stage.height(c.offsetHeight);
            if (renderGrid && this.renderer) this.renderer.renderGrid();
        },

        // ═══════════════════════════════════════════════════════
        // 3D POHLED (Three.js)
        // ═══════════════════════════════════════════════════════
        prepni2d() {
            this.rezim3d = false;
            this.ulozitNastaveni();
            // Po přepnutí 3D→2D: Konva canvas byla skrytá (display:none přes
            // x-show), po návratu obsah může být prázdný (browser vymazal
            // canvas pixely) i když layer children existují. Proto FULL rebuild
            // všech vrstev z engine stavu.
            const self = this;
            let tries = 0;
            const doRedraw = () => {
                if (!self.stage) return;
                const c = self.$refs.konvaContainer;
                if ((!c || c.offsetWidth < 10) && tries < 20) {
                    tries++;
                    setTimeout(doRedraw, 50);
                    return;
                }
                self.resizeKonva(true);
                if (self.renderer) {
                    // Explicitní rebuild všech vrstev
                    self.renderer.renderWalls();
                    self.renderer.renderNodes();
                    self.renderer.renderOpenings();
                    if (self.renderer.showKoty) self.renderer.renderKoty();
                }
                // Překreslit katastr a mapy (uložené mimo renderer.render)
                if (typeof self.katastrPrekreslitCanvas === 'function') {
                    self.katastrPrekreslitCanvas();
                }
                // stage.draw() vynutí okamžité vykreslení všech vrstev
                if (typeof self.stage.draw === 'function') {
                    self.stage.draw();
                }
            };
            this.$nextTick(() => requestAnimationFrame(doRedraw));
        },

        async prepni3d() {
            this.rezim3d = true;
            this.ulozitNastaveni();
            await this.$nextTick();
            // Počkat na layout — kontejner musí mít rozměry
            await new Promise(r => setTimeout(r, 100));

            if (!window._kk3d?.scene) {
                await this._init3d();
            } else {
                this._start3dLoop();
            }
            this._buildTerrain3D();
            this._build3d();
            this._resize3d();
        },

        async _init3d() {
            if (typeof THREE === 'undefined') { console.error('[3D] Three.js se nenačetl!'); window.zalogujChybu?.('Three.js se nenačetl', 'koncept 3D init'); return; }
            if (typeof THREE.OrbitControls === 'undefined') { console.error('[3D] OrbitControls se nenačetly!'); window.zalogujChybu?.('OrbitControls se nenačetly', 'koncept 3D init'); return; }
            const OrbitControls = THREE.OrbitControls;

            // Inicializace mimo Alpine scope — Three.js nesnese Alpine proxy
            window._kk3d = {};
            const _3d = window._kk3d;

            const container = this.$refs.threeContainer;
            if (!container) { console.error('[3D] Container nenalezen!'); window.zalogujChybu?.('Container nenalezen', 'koncept 3D init'); return; }
            let w = container.offsetWidth, h = container.offsetHeight;
            if (w < 10 || h < 10) {
                await new Promise(r => setTimeout(r, 300));
                w = container.offsetWidth;
                h = container.offsetHeight;
            }
            if (w < 10 || h < 10) { w = 800; h = 600; }

            // Scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xe8ecf0);

            // Camera — ortografická, 1m world = PX_PER_M screen px (stejné měřítko jako 2D).
            // Frustum v metrech: půl-šířka = w/(2*pxM), půl-výška = h/(2*pxM).
            // camera.zoom pak drží aktuální 2D zoom (OrbitControls.dollyTo).
            const pxM = this.PX_PER_M;
            const halfW = w / (2 * pxM);
            const halfH = h / (2 * pxM);
            const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, -500, 500);
            camera.zoom = this.zoom || 1;
            camera.updateProjectionMatrix();
            camera.position.set(15, 20, 15);
            camera.lookAt(0, 0, 0);

            // Renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            // Controls
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.maxPolarAngle = Math.PI / 2.1;

            // Lights — méně ambient + silnější sun = výraznější stínování sklonu
            const ambient = new THREE.AmbientLight(0xffffff, 0.3);
            scene.add(ambient);
            const sun = new THREE.DirectionalLight(0xffffff, 1.2);
            sun.position.set(10, 20, 10);
            sun.castShadow = true;
            scene.add(sun);
            // Fill light z opačné strany pro jemné vyvážení tmavých stran
            const fill = new THREE.DirectionalLight(0xffffff, 0.25);
            fill.position.set(-8, 12, -8);
            scene.add(fill);

            // Terrain mesh + grid (buildTerrain3D vytvoří/nahradí _3d.terrain/gridLines
            // při změně vyskovyProfil). Výchozí: plochý plane do doby načtení profilu.
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(200, 200),
                new THREE.MeshStandardMaterial({ color: 0xc8d6c0, roughness: 0.95 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);
            _3d.ground = ground;

            const grid = new THREE.GridHelper(50, 50, 0x999999, 0xcccccc);
            grid.position.y = 0.01;
            scene.add(grid);
            _3d.grid = grid;

            // Axes
            const axes = new THREE.AxesHelper(3);
            scene.add(axes);

            // Nápověda 3D — přesunuta do Blade .kk-3d-help (řádek vedle kk-coords)
            container.style.position = 'relative';

            _3d.scene = scene;
            _3d.camera = camera;
            _3d.renderer = renderer;
            _3d.controls = controls;
            _3d.wallGroup = new THREE.Group();
            scene.add(_3d.wallGroup);

            // Animation loop
            this._start3dLoop();

            // Resize
            const ro = new ResizeObserver(() => this._resize3d());
            ro.observe(container);
        },

        _start3dLoop() {
            if (this._3dLoopRunning) return;
            this._3dLoopRunning = true;
            const self = this;
            const animate = () => {
                if (!self.rezim3d) { self._3dLoopRunning = false; return; }
                requestAnimationFrame(animate);
                const _3d = window._kk3d;
                if (!_3d) return;
                if (_3d.controls) _3d.controls.update();
                if (_3d.renderer && _3d.scene && _3d.camera) {
                    _3d.renderer.render(_3d.scene, _3d.camera);
                }
            };
            animate();
        },

        _resize3d() {
            const _3d = window._kk3d;
            if (!_3d || !_3d.renderer) return;
            const c = this.$refs.threeContainer;
            if (!c) return;
            const w = c.offsetWidth, h = c.offsetHeight;
            if (w < 10 || h < 10) return;
            // Orto frustum přepočítat na aktuální rozměr (měřítko 1m = PX_PER_M px drží).
            const pxM = this.PX_PER_M;
            const halfW = w / (2 * pxM);
            const halfH = h / (2 * pxM);
            _3d.camera.left = -halfW;
            _3d.camera.right = halfW;
            _3d.camera.top = halfH;
            _3d.camera.bottom = -halfH;
            _3d.camera.updateProjectionMatrix();
            _3d.renderer.setSize(w, h);
            // Line2 material potřebuje aktuální rozlišení pro screen-space šířku
            if (_3d.parcelOutlines) {
                for (const obj of _3d.parcelOutlines) {
                    if (obj.material && obj.material.resolution) {
                        obj.material.resolution.set(w, h);
                    }
                }
            }
        },

        /**
         * Postavit 3D terrain z DMR 5G výškového profilu.
         * Profile.body = [[lat, lon, vyska_m], ...] ve WGS84.
         * Transformace WGS84 → scene coords shodná s 2D canvas
         * (renderer._wgs84NaCanvas / PX_PER_M).
         * Grid 5 m (= DMR 5G hustota), bbox = bbox parcel + 20 m.
         */
        _buildTerrain3D() {
            const _3d = window._kk3d;
            if (!_3d || !_3d.scene || typeof THREE === 'undefined') return;
            const prof = this.vyskovyProfil;
            if (!prof || !prof.body || prof.body.length === 0) return;
            if (!this.renderer || !this.renderer._fixedWgsCenter) return;
            const center = this.renderer._fixedWgsCenter;
            const cosLat = Math.cos(center.lat * Math.PI / 180);
            const METERS_PER_DEG = 111320;

            // Převést body z WGS84 na scene coords.
            // Wall v _build3d: scene.z = canvas.y / pxM (po ExtrudeGeometry +
            // rotation.x=-PI/2 se y z 2D stane z v 3D s pozitivním znaménkem).
            // Pro terrain stejně: canvas.y = -(lat - center.lat) * M_PER_DEG * pxM
            // → scene.z (same as wall) = canvas.y / pxM = -(lat - center.lat) * M_PER_DEG.
            const pts = prof.body.map(bod => {
                const lat = bod[0], lon = bod[1], h = bod[2] || 0;
                return {
                    x: (lon - center.lon) * METERS_PER_DEG * cosLat,
                    z: -(lat - center.lat) * METERS_PER_DEG,
                    h,
                };
            });
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            let minH = Infinity, maxH = -Infinity;
            pts.forEach(p => {
                if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
                if (p.h < minH) minH = p.h; if (p.h > maxH) maxH = p.h;
            });
            // Rozšířit bbox o 20 m
            const PAD = 20;
            minX -= PAD; maxX += PAD;
            minZ -= PAD; maxZ += PAD;

            // Grid resolution 2 m (odpovídá zhruba hustotě DMR 5G bodů)
            const STEP = 2;
            const cols = Math.max(2, Math.ceil((maxX - minX) / STEP) + 1);
            const rows = Math.max(2, Math.ceil((maxZ - minZ) / STEP) + 1);

            // Heightmap — IDW interpolation z profile body (3 nejbližší)
            // Normalizujeme výšky k minH (terrain začíná na 0)
            const heights = new Float32Array(cols * rows);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const gx = minX + c * STEP;
                    const gz = minZ + r * STEP;
                    // Najít 3 nejbližší body
                    const dists = pts.map(p => ({
                        h: p.h,
                        d: Math.hypot(p.x - gx, p.z - gz)
                    })).sort((a, b) => a.d - b.d).slice(0, 3);
                    if (dists[0].d < 0.5) {
                        heights[r * cols + c] = dists[0].h;
                    } else {
                        let sumW = 0, sumH = 0;
                        for (const d of dists) {
                            const w = 1 / (d.d * d.d + 0.01);
                            sumW += w; sumH += d.h * w;
                        }
                        heights[r * cols + c] = sumH / sumW;
                    }
                }
            }

            // Odstranit starý terrain / grid
            if (_3d.terrain) {
                _3d.scene.remove(_3d.terrain);
                _3d.terrain.geometry.dispose();
                _3d.terrain.material.dispose();
                _3d.terrain = null;
            }
            if (_3d.gridLines) {
                _3d.scene.remove(_3d.gridLines);
                _3d.gridLines.geometry.dispose();
                _3d.gridLines.material.dispose();
                _3d.gridLines = null;
            }
            if (_3d.ground) { _3d.scene.remove(_3d.ground); _3d.ground = null; }
            if (_3d.grid) { _3d.scene.remove(_3d.grid); _3d.grid = null; }

            // Terrain mesh — PlaneGeometry se segmenty
            const geometry = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, cols - 1, rows - 1);
            geometry.rotateX(-Math.PI / 2);
            // Posun ke středu bboxu
            const cx = (minX + maxX) / 2;
            const cz = (minZ + maxZ) / 2;
            geometry.translate(cx, 0, cz);
            // Aplikovat výšky na vertices
            const posAttr = geometry.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                // Find grid index by position
                const px = posAttr.getX(i);
                const pz = posAttr.getZ(i);
                const c = Math.round((px - minX) / STEP);
                const r = Math.round((pz - minZ) / STEP);
                const ci = Math.max(0, Math.min(cols - 1, c));
                const ri = Math.max(0, Math.min(rows - 1, r));
                const h = heights[ri * cols + ci];
                posAttr.setY(i, h - minH); // normalizováno k 0
            }
            posAttr.needsUpdate = true;
            geometry.computeVertexNormals();

            // Vertexy bez colors — shader pracuje s normálami + maskou parcely.
            // Příprava masky v canvas: 1 = uvnitř parcely, 0 = mimo, AA edges.
            const MASK_RES = 1024;
            const canvas2d = document.createElement('canvas');
            canvas2d.width = MASK_RES;
            canvas2d.height = MASK_RES;
            const ctx2d = canvas2d.getContext('2d');
            ctx2d.fillStyle = '#000';
            ctx2d.fillRect(0, 0, MASK_RES, MASK_RES);
            ctx2d.fillStyle = '#fff';
            const bboxW = maxX - minX, bboxH = maxZ - minZ;
            const toMaskX = (sceneX) => ((sceneX - minX) / bboxW) * MASK_RES;
            const toMaskY = (sceneZ) => ((sceneZ - minZ) / bboxH) * MASK_RES;
            for (const p of (this.katastrParcely || [])) {
                if (!p.polygon_wgs84 || p.polygon_wgs84.length < 3) continue;
                ctx2d.beginPath();
                p.polygon_wgs84.forEach(([lat, lon], i) => {
                    const sx = (lon - center.lon) * METERS_PER_DEG * cosLat;
                    const sz = -(lat - center.lat) * METERS_PER_DEG;
                    const mx = toMaskX(sx), my = toMaskY(sz);
                    if (i === 0) ctx2d.moveTo(mx, my);
                    else ctx2d.lineTo(mx, my);
                });
                ctx2d.closePath();
                ctx2d.fill();
            }
            const maskTexture = new THREE.CanvasTexture(canvas2d);
            maskTexture.magFilter = THREE.LinearFilter;
            maskTexture.minFilter = THREE.LinearFilter;
            maskTexture.flipY = false;  // canvas má Y dolů, UV také — netřeba flip
            maskTexture.needsUpdate = true;
            _3d.terrainMask = maskTexture;
            _3d.terrainMaskRange = { minX, minZ, bboxW, bboxH };

            // MeshStandardMaterial + flatShading → barvy obohacené o lighting
            // (výraznější slope variance než plochá barva). Terrain nepřijímá
            // stíny (house shadow nebude na terénu), ale světlo ho ovlivní.
            const mat = new THREE.MeshStandardMaterial({
                roughness: 0.95,
                flatShading: true,
            });
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uMask = { value: _3d.terrainMask };
                shader.uniforms.uMaskMin = { value: new THREE.Vector2(minX, minZ) };
                shader.uniforms.uMaskSize = { value: new THREE.Vector2(bboxW, bboxH) };
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
    diffuseColor.rgb = mix(outsideCol, insideCol, mask);
}`
                    );
            };
            const terrain = new THREE.Mesh(geometry, mat);
            terrain.receiveShadow = false;  // stíny domu na terénu nevykreslovat
            _3d.scene.add(terrain);
            _3d.terrain = terrain;

            // Grid čáry podél terrainu — wireframe z terrain geometry
            const wireframe = new THREE.WireframeGeometry(geometry);
            const gridMat = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.4 });
            const gridLines = new THREE.LineSegments(wireframe, gridMat);
            gridLines.position.y = 0.02;
            _3d.scene.add(gridLines);
            _3d.gridLines = gridLines;

            // Uložit heightmap pro object snap
            _3d.terrainHeights = heights;
            _3d.terrainMinX = minX;
            _3d.terrainMinZ = minZ;
            _3d.terrainCols = cols;
            _3d.terrainRows = rows;
            _3d.terrainStep = STEP;
            _3d.terrainMinH = minH;

            // Odstranit tube outlines + overlays (nahrazeny shader maskou)
            for (const key of ['parcelOutlines', 'parcelOverlays']) {
                if (_3d[key]) {
                    for (const obj of _3d[key]) {
                        _3d.scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    }
                    _3d[key] = [];
                }
            }
        },

        /**
         * Vytvoří barevný overlay nad terrainem pro každou parcelu.
         * Geometrie = polygon parcely (ShapeGeometry), výšky = z heightmap,
         * barva = zelená→hnědá dle sklonu normály.
         * Hranice následuje přesně polygon parcely (ne mřížku).
         */
        _buildParcelOverlay3D() {
            const _3d = window._kk3d;
            if (!_3d || !_3d.scene || typeof THREE === 'undefined') return;
            if (!this.renderer || !this.renderer._fixedWgsCenter) return;
            if (!this.katastrParcely || this.katastrParcely.length === 0) return;
            const center = this.renderer._fixedWgsCenter;
            const cosLat = Math.cos(center.lat * Math.PI / 180);
            const METERS_PER_DEG = 111320;

            // Odstranit staré overlays
            if (_3d.parcelOverlays) {
                for (const obj of _3d.parcelOverlays) {
                    _3d.scene.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                }
            }
            _3d.parcelOverlays = [];

            const SHADE_GAMMA = 0.4;
            const FLAT_COLOR = [169 / 255, 194 / 255, 133 / 255];   // světle zelená
            const SLOPE_COLOR = [111 / 255, 82 / 255, 52 / 255];    // hnědá
            const LIFT = 0.03;

            this.katastrParcely.forEach(p => {
                const poly = p.polygon_wgs84;
                if (!poly || poly.length < 3) return;
                const corners = poly.map(([lat, lon]) => ({
                    x: (lon - center.lon) * METERS_PER_DEG * cosLat,
                    z: -(lat - center.lat) * METERS_PER_DEG,
                }));
                // Shape v 2D (x, y kde y = -z v scéně)
                const shape = new THREE.Shape();
                shape.moveTo(corners[0].x, -corners[0].z);
                for (let i = 1; i < corners.length; i++) shape.lineTo(corners[i].x, -corners[i].z);
                shape.closePath();
                const geom = new THREE.ShapeGeometry(shape);
                // Shape je v XY plane → rotate -PI/2 kolem X, takže mapuje na XZ
                geom.rotateX(-Math.PI / 2);
                // Geometry teď v XZ, ale y-osa původní Y se stala -Z. Oprava:
                // původní shape y = -scene.z, po rotation.x = -PI/2 → scene.z = y → matching.
                // Nastavit výšku z terrainu + lift
                const posAttr = geom.attributes.position;
                for (let i = 0; i < posAttr.count; i++) {
                    const x = posAttr.getX(i);
                    const z = posAttr.getZ(i);
                    const h = this._terrainHeightAt(x, z);
                    posAttr.setY(i, (h !== null ? h : 0) + LIFT);
                }
                posAttr.needsUpdate = true;
                geom.computeVertexNormals();
                // Vertex colors dle sklonu
                const normals = geom.attributes.normal;
                const colors = new Float32Array(posAttr.count * 3);
                for (let i = 0; i < posAttr.count; i++) {
                    const ny = normals.getY(i);
                    let slope = Math.sqrt(Math.max(0, 1 - ny * ny));
                    const t = Math.min(1, Math.pow(slope, SHADE_GAMMA));
                    colors[i * 3 + 0] = FLAT_COLOR[0] * (1 - t) + SLOPE_COLOR[0] * t;
                    colors[i * 3 + 1] = FLAT_COLOR[1] * (1 - t) + SLOPE_COLOR[1] * t;
                    colors[i * 3 + 2] = FLAT_COLOR[2] * (1 - t) + SLOPE_COLOR[2] * t;
                }
                geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                const mat = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.95,
                    flatShading: true,
                });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.receiveShadow = true;
                _3d.scene.add(mesh);
                _3d.parcelOverlays.push(mesh);
            });
        },

        /**
         * Vykreslit hranice pozemků na 3D terrainu (follow terrain výšku).
         * Styl: #FFD700 stroke, tenká transparent fill. Z WGS84 → scene coords.
         */
        _buildParcelOutlines3D() {
            const _3d = window._kk3d;
            if (!_3d || !_3d.scene || typeof THREE === 'undefined') return;
            if (!this.renderer || !this.renderer._fixedWgsCenter) return;
            if (!this.katastrParcely || this.katastrParcely.length === 0) return;
            const center = this.renderer._fixedWgsCenter;
            const cosLat = Math.cos(center.lat * Math.PI / 180);
            const METERS_PER_DEG = 111320;

            // Odstranit staré outlines
            if (_3d.parcelOutlines) {
                for (const obj of _3d.parcelOutlines) {
                    _3d.scene.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                }
            }
            _3d.parcelOutlines = [];

            const LIFT = 0.1;
            // Každá hrana rozdělena na 0.5 m segmenty, výška z terrainu.
            // Line2 (pokud je k dispozici) umí screen-space linewidth = pixely,
            // invariantní k zoomu. Fallback TubeGeometry pokud Line2 nenaběhl.
            const SAMPLE_STEP = 0.5;
            const LINE_WIDTH_PX = 3;      // pixelů na obrazovce
            const TUBE_FALLBACK_R = 0.05; // pokud Line2 není
            const c = this.$refs.threeContainer;
            const vpW = c ? c.offsetWidth : 800;
            const vpH = c ? c.offsetHeight : 600;
            this.katastrParcely.forEach(p => {
                const poly = p.polygon_wgs84;
                if (!poly || poly.length < 3) return;
                const corners = poly.map(([lat, lon]) => ({
                    x: (lon - center.lon) * METERS_PER_DEG * cosLat,
                    z: -(lat - center.lat) * METERS_PER_DEG,
                }));
                const flat = [];  // flat array [x,y,z,x,y,z,...] pro Line2
                const pts = [];   // THREE.Vector3 pro tube fallback
                for (let i = 0; i < corners.length; i++) {
                    const a = corners[i];
                    const b = corners[(i + 1) % corners.length];
                    const dx = b.x - a.x, dz = b.z - a.z;
                    const edgeLen = Math.hypot(dx, dz);
                    const nSeg = Math.max(1, Math.ceil(edgeLen / SAMPLE_STEP));
                    for (let k = 0; k < nSeg; k++) {
                        const t = k / nSeg;
                        const x = a.x + dx * t;
                        const z = a.z + dz * t;
                        const h = this._terrainHeightAt(x, z);
                        const y = (h !== null ? h : 0) + LIFT;
                        flat.push(x, y, z);
                        pts.push(new THREE.Vector3(x, y, z));
                    }
                }
                // Uzavřít smyčku
                flat.push(flat[0], flat[1], flat[2]);
                pts.push(pts[0].clone());

                if (typeof THREE.Line2 === 'function' && typeof THREE.LineMaterial === 'function') {
                    const lineGeom = new THREE.LineGeometry();
                    lineGeom.setPositions(flat);
                    const lineMat = new THREE.LineMaterial({
                        color: 0xffd700,
                        linewidth: LINE_WIDTH_PX,  // pixely obrazovky
                    });
                    lineMat.resolution.set(vpW, vpH);
                    const line2 = new THREE.Line2(lineGeom, lineMat);
                    line2.computeLineDistances();
                    _3d.scene.add(line2);
                    _3d.parcelOutlines.push(line2);
                } else {
                    // Fallback — TubeGeometry
                    try {
                        const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.01);
                        const tubeGeom = new THREE.TubeGeometry(curve, pts.length * 2, TUBE_FALLBACK_R, 6, true);
                        const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
                        const tube = new THREE.Mesh(tubeGeom, tubeMat);
                        _3d.scene.add(tube);
                        _3d.parcelOutlines.push(tube);
                    } catch (e) {
                        window.zalogujChybu?.(e, 'Koncept V3: 3D obrys parcely (TubeGeometry)', { bodu: pts.length });
                        const geom = new THREE.BufferGeometry().setFromPoints(pts);
                        const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xffd700 }));
                        _3d.scene.add(line);
                        _3d.parcelOutlines.push(line);
                    }
                }
            });
        },

        /**
         * Vrátí výšku terrainu (v scene units) v bodě (x, z) pomocí IDW.
         * Nebo null pokud mimo terrain.
         */
        _terrainHeightAt(x, z) {
            const _3d = window._kk3d;
            if (!_3d || !_3d.terrainHeights) return null;
            const cols = _3d.terrainCols, rows = _3d.terrainRows;
            const step = _3d.terrainStep;
            const c = (x - _3d.terrainMinX) / step;
            const r = (z - _3d.terrainMinZ) / step;
            if (c < 0 || c > cols - 1 || r < 0 || r > rows - 1) return null;
            // Bilineární interpolace
            const c0 = Math.floor(c), r0 = Math.floor(r);
            const c1 = Math.min(cols - 1, c0 + 1), r1 = Math.min(rows - 1, r0 + 1);
            const fc = c - c0, fr = r - r0;
            const h = _3d.terrainHeights;
            const h00 = h[r0 * cols + c0], h10 = h[r0 * cols + c1];
            const h01 = h[r1 * cols + c0], h11 = h[r1 * cols + c1];
            const top = h00 * (1 - fc) + h10 * fc;
            const bot = h01 * (1 - fc) + h11 * fc;
            return (top * (1 - fr) + bot * fr) - _3d.terrainMinH;
        },

        /**
         * Vrátit 70. percentil výšky terrainu pod bbox objektu v (xmin, xmax, zmin, zmax).
         */
        _terrainP70Under(xmin, xmax, zmin, zmax) {
            const _3d = window._kk3d;
            if (!_3d || !_3d.terrainHeights) return 0;
            const step = _3d.terrainStep;
            const heights = [];
            // Sample v kroku step/2 pro rozumnou hustotu
            const ds = step / 2;
            for (let x = xmin; x <= xmax; x += ds) {
                for (let z = zmin; z <= zmax; z += ds) {
                    const h = this._terrainHeightAt(x, z);
                    if (h !== null) heights.push(h);
                }
            }
            if (heights.length === 0) return 0;
            heights.sort((a, b) => a - b);
            const idx = Math.floor(heights.length * 0.70);
            return heights[Math.min(idx, heights.length - 1)];
        },

        _build3d() {
            const _3d = window._kk3d;
            if (!_3d || !_3d.scene || !this.engine) return;
            const THREE = window.THREE;
            const group = _3d.wallGroup;
            while (group.children.length > 0) {
                const child = group.children[0];
                group.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }

            const pxM = this.PX_PER_M;
            const defaultVyskaSteny = 2.8;

            // Vertikální snap objektů na 70. percentil výšky terénu pod nimi.
            // Spočteme bbox všech stěn (building footprint) a použijeme jedno y
            // pro celou skupinu — budova leží na společné úrovni.
            let buildingY = 0;
            if (_3d.terrainHeights && this.engine.nodes.size > 0) {
                let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity;
                for (const n of this.engine.nodes.values()) {
                    const x = n.x / pxM, z = -n.y / pxM;
                    if (x < xmin) xmin = x; if (x > xmax) xmax = x;
                    if (z < zmin) zmin = z; if (z > zmax) zmax = z;
                }
                if (xmin < xmax && zmin < zmax) {
                    buildingY = this._terrainP70Under(xmin, xmax, zmin, zmax);
                }
            }
            group.position.y = buildingY;

            console.log('[3D] Build: walls=' + this.engine.walls.size + ', nodes=' + this.engine.nodes.size + ', pxM=' + pxM);
            if (this.engine.walls.size === 0) {
                console.warn('[3D] Žádné stěny k zobrazení!');
                return;
            }

            // Stěny — extruze z 2D polygonu (mitre join, konzistentní s 2D)
            for (const wall of this.engine.walls.values()) {
                const poly = this.engine.getWallPolygon(wall.id);
                if (!poly || poly.length < 3) continue;

                const typDef = (typeof TYPY_STEN !== 'undefined' && TYPY_STEN[wall.typ]) || {};
                const vyskaSteny = typDef.vyska?.default || defaultVyskaSteny;

                const shape = new THREE.Shape();
                shape.moveTo(poly[0].x / pxM, -poly[0].y / pxM);
                for (let i = 1; i < poly.length; i++) {
                    shape.lineTo(poly[i].x / pxM, -poly[i].y / pxM);
                }
                shape.closePath();

                const geom = new THREE.ExtrudeGeometry(shape, {
                    depth: vyskaSteny,
                    bevelEnabled: false,
                });
                const mat = new THREE.MeshStandardMaterial({
                    color: typDef.barva3d || 0x8b8b8b,
                    roughness: 0.85,
                });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                // ExtrudeGeometry vytahuje v ose Z — otočíme aby výška šla do Y
                mesh.rotation.x = -Math.PI / 2;

                group.add(mesh);
            }

            // Otvory — jednoduché průhledné boxy
            for (const op of this.engine.openings.values()) {
                const wall = this.engine.walls.get(op.wallId);
                if (!wall) continue;
                const nA = this.engine.nodes.get(wall.nodeA);
                const nB = this.engine.nodes.get(wall.nodeB);
                if (!nA || !nB) continue;

                const x1 = nA.x / pxM, z1 = -nA.y / pxM;
                const x2 = nB.x / pxM, z2 = -nB.y / pxM;
                const dx = x2 - x1, dz = z2 - z1;
                const delka = Math.hypot(dx, dz);
                if (delka < 0.01) continue;

                const uhel = -Math.atan2(dz, dx);
                const posX = x1 + dx * op.position;
                const posZ = z1 + dz * op.position;
                const otvorDef = (typeof TYPY_OTVORU !== 'undefined' && TYPY_OTVORU[op.type]) || {};
                const sirka = op.width / pxM;
                const tl = wall.tloustka || 0.3;
                const vyska = otvorDef.vyska?.default || 2.1;
                const spodek = otvorDef.parapet ?? 0;

                const geom = new THREE.BoxGeometry(sirka, vyska, tl + 0.02);
                const mat = new THREE.MeshStandardMaterial({
                    color: otvorDef.barva3d || 0x6b4226,
                    transparent: true,
                    opacity: 0.7,
                });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.set(posX, spodek + vyska / 2, posZ);
                mesh.rotation.y = uhel;
                group.add(mesh);
            }

            // Střecha — jednoduchá sedlová/pultová/plochá
            const streData = this.projektData?.strecha;
            if (streData && this.engine.walls.size > 0) {
                let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
                for (const n of this.engine.nodes.values()) {
                    const wx = n.x / pxM, wz = -n.y / pxM;
                    if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
                    if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;
                }

                const presah = streData.presah || 0.5;
                const rx1 = minX - presah, rx2 = maxX + presah;
                const rz1 = minZ - presah, rz2 = maxZ + presah;
                const sirkaDomu = rx2 - rx1;
                const delkaDomu = rz2 - rz1;
                const sklon = (streData.sklon || 35) * Math.PI / 180;
                const typDef = (typeof TYPY_STRECHY !== 'undefined' && TYPY_STRECHY[streData.typ]) || {};
                const barva = typDef.barva3d || 0xb84c2c;

                const roofMat = new THREE.MeshStandardMaterial({ color: barva, roughness: 0.7, side: THREE.DoubleSide });

                if (streData.typ === 'plocha') {
                    // Plochá — jednoduchý obdélník
                    const geom = new THREE.PlaneGeometry(sirkaDomu, delkaDomu);
                    const mesh = new THREE.Mesh(geom, roofMat);
                    mesh.rotation.x = -Math.PI / 2;
                    mesh.position.set((rx1+rx2)/2, defaultVyskaSteny + 0.05, (rz1+rz2)/2);
                    group.add(mesh);
                } else if (streData.typ === 'pultova') {
                    // Pultová — nakloněná plocha
                    const vyska = Math.tan(sklon) * delkaDomu;
                    const geom = new THREE.BufferGeometry();
                    const v = new Float32Array([
                        rx1, defaultVyskaSteny, rz1, rx2, defaultVyskaSteny, rz1,
                        rx2, defaultVyskaSteny + vyska, rz2, rx1, defaultVyskaSteny + vyska, rz2,
                        rx1, defaultVyskaSteny, rz1, rx2, defaultVyskaSteny + vyska, rz2,
                    ]);
                    geom.setAttribute('position', new THREE.BufferAttribute(v, 3));
                    geom.computeVertexNormals();
                    group.add(new THREE.Mesh(geom, roofMat));
                } else {
                    // Sedlová (default), valbová, mansardová — dvě nakloněné plochy s hřebenem
                    const vyska = Math.tan(sklon) * (delkaDomu / 2);
                    const hrebenY = defaultVyskaSteny + vyska;
                    const cz = (rz1 + rz2) / 2;

                    // Přední strana
                    const g1 = new THREE.BufferGeometry();
                    const v1 = new Float32Array([
                        rx1, defaultVyskaSteny, rz1, rx2, defaultVyskaSteny, rz1,
                        rx2, hrebenY, cz, rx1, defaultVyskaSteny, rz1,
                        rx2, hrebenY, cz, rx1, hrebenY, cz,
                    ]);
                    g1.setAttribute('position', new THREE.BufferAttribute(v1, 3));
                    g1.computeVertexNormals();
                    group.add(new THREE.Mesh(g1, roofMat));

                    // Zadní strana
                    const g2 = new THREE.BufferGeometry();
                    const v2 = new Float32Array([
                        rx1, defaultVyskaSteny, rz2, rx2, defaultVyskaSteny, rz2,
                        rx2, hrebenY, cz, rx1, defaultVyskaSteny, rz2,
                        rx2, hrebenY, cz, rx1, hrebenY, cz,
                    ]);
                    g2.setAttribute('position', new THREE.BufferAttribute(v2, 3));
                    g2.computeVertexNormals();
                    group.add(new THREE.Mesh(g2, roofMat));

                    // Štíty (trojúhelníky na bocích)
                    const gs1 = new THREE.BufferGeometry();
                    gs1.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
                        rx1, defaultVyskaSteny, rz1, rx1, defaultVyskaSteny, rz2, rx1, hrebenY, cz,
                    ]), 3));
                    gs1.computeVertexNormals();
                    group.add(new THREE.Mesh(gs1, new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.8, side: THREE.DoubleSide })));

                    const gs2 = new THREE.BufferGeometry();
                    gs2.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
                        rx2, defaultVyskaSteny, rz1, rx2, defaultVyskaSteny, rz2, rx2, hrebenY, cz,
                    ]), 3));
                    gs2.computeVertexNormals();
                    group.add(new THREE.Mesh(gs2, new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.8, side: THREE.DoubleSide })));
                }
            }

            // Centrovat kameru na stavbu — jen při prvním vstupu do 3D.
            // Při přepínání 2D→3D zachovat uživatelem natočený pohled (orbit controls).
            if (!_3d.cameraInitialized && this.engine.walls.size > 0) {
                let sumX = 0, sumZ = 0, count = 0;
                for (const n of this.engine.nodes.values()) {
                    sumX += n.x / pxM;
                    sumZ += -n.y / pxM;
                    count++;
                }
                if (count > 0) {
                    const cx = sumX / count, cz = sumZ / count;
                    _3d.controls.target.set(cx, 1.5, cz);
                    _3d.camera.position.set(cx + 15, 20, cz + 15);
                    // Synchronizovat zoom s 2D — ortografická kamera, 1m = PX_PER_M × zoom px
                    _3d.camera.zoom = this.zoom || 1;
                    _3d.camera.updateProjectionMatrix();
                    _3d.controls.update();
                    _3d.cameraInitialized = true;
                }
            }

            // Restart animation pokud byl zastavený
            const animate = () => {
                if (!this.rezim3d) return;
                requestAnimationFrame(animate);
                _3d.controls.update();
                _3d.renderer.render(_3d.scene, _3d.camera);
            };
            animate();
        },
    };
}
