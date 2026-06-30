/**
 * Koncept K — Alpine.js UI controller
 * Deleguje na StavebníEngine (data) a KonvaRenderer (zobrazení).
 */
function konceptKEditor(initialData) {
    // Obnovit uložený stav (vše na jednom místě)
    const _s = JSON.parse(localStorage.getItem('kk_state') || '{}');
    return {
        // ─── Projekt ────────────────────────────────────────────
        projektId: initialData.projektId,
        projektNazev: initialData.projektNazev,
        projektData: initialData.projektData,
        verze: initialData.verze,
        faze: initialData.faze,
        metadata: initialData.metadata,
        chat: initialData.chat,
        historie: initialData.historie,

        // ─── UI stav (obnoveno z kk_state) ──────────────────────
        nastroj: _s.nastroj || 'vyber',
        // Fullscreen je záměrně transient — při novém načtení stránky
        // začínáme vždy v klasickém zobrazení (nepokračujeme v fullscreenu
        // z minulého sezení). Stav se nepersistuje do kk_state.
        celaObrazovka: false,
        aiVstup: '',
        aiNacitani: false,
        aiModel: _s.aiModel || 'claude-sonnet-4-6',
        napovedaOtevrena: false,
        layoutMode: _s.layoutMode ?? 0,
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
        tloustkaSteny: 0.3,
        panelOpen: JSON.parse(localStorage.getItem('kk_panelOpen') || '{"objekty":false,"parcela":false,"historie":false,"chat":true}'),

        // ─── Engine + Renderer ──────────────────────────────────
        engine: null,
        renderer: null,
        stage: null,
        PX_PER_M: 80,

        // ─── Kreslení ───────────────────────────────────────────
        kreslimStenu: false,
        stenaStart: null,

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
        get vertikalni() { return this.layoutMode >= 2; },
        get obracene() { return this.layoutMode === 1 || this.layoutMode === 3; },
        get gridStyle() {
            const g = this.splitPct, t = 100 - g;
            const first = this.obracene ? t : g;
            const third = this.obracene ? g : t;
            if (this.vertikalni) return 'display:grid;grid-template-rows:' + first + 'fr 10px ' + third + 'fr;grid-template-columns:1fr';
            return 'display:grid;grid-template-columns:' + first + 'fr 10px ' + third + 'fr;grid-template-rows:1fr';
        },
        get layoutTip() {
            const tipy = ['Grafika vlevo, text vpravo', 'Text vlevo, grafika vpravo', 'Grafika nahoře, text dole', 'Text nahoře, grafika dole'];
            return tipy[(this.layoutMode + 1) % 4];
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

        /** Aplikuje šířku na všechny vybrané otvory (se snap na standard). */
        setOpeningSirka(novaSirka) {
            if (!this.renderer || !this.engine) return;
            const ids = [...this.renderer.selectedOpenings];
            if (ids.length === 0) return;
            this.engine.pushUndo();
            for (const id of ids) {
                const o = this.engine.openings.get(id);
                if (!o) continue;
                const snapped = snapOpeningSirka(novaSirka, o.typ);
                // Respektovat délku stěny (nesmí přečnívat)
                const w = this.engine.walls.get(o.wallId);
                if (w) {
                    const nA = this.engine.nodes.get(w.nodeA);
                    const nB = this.engine.nodes.get(w.nodeB);
                    if (nA && nB) {
                        const L = Math.hypot(nB.x - nA.x, nB.y - nA.y) / this.PX_PER_M;
                        const maxSirka = L - o.pozice;
                        o.sirka = Math.min(snapped, maxSirka);
                    } else {
                        o.sirka = snapped;
                    }
                } else {
                    o.sirka = snapped;
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
        setWallTloustka(novaTloustka) {
            if (!this.renderer || !this.engine) return;
            const ids = [...this.renderer.selectedWalls];
            if (ids.length === 0) return;
            this.engine.pushUndo();
            for (const id of ids) {
                const w = this.engine.walls.get(id);
                if (!w) continue;
                w.tloustka = snapWallTloustka(novaTloustka, w.typ);
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
                const _saved = JSON.parse(localStorage.getItem('kk_state') || '{}');
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
                if (this.projektId) localStorage.setItem('kk_lastProjekt', this.projektId);

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
                    if (old === 'stena') { this.kreslimStenu = false; this.stenaStart = null; this.renderer.clearTemp(); }
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
                        this._pendingDrag = null;
                    } else if (this._pendingDrag.type === 'node') {
                        this.isDraggingNode = true;
                        this.draggingNodeId = this._pendingDrag.id;
                        // Vybrat i stěny uzlu — aby dofIndicator vykreslil úhly
                        // u OBOU endpointů taženého wallu (včetně druhého T-junction).
                        const _nw = this.engine.getNodeWalls(this._pendingDrag.id);
                        this.renderer.setSelection(_nw.map(w => w.id), [this._pendingDrag.id]);
                        // Zachytit initial perp offset uzlu od host osy (pro slide)
                        // — používá se v edge módu místo hostHalfThk, aby se uzel
                        // při slide nepřeskakoval na povrch hostitele.
                        this._dragInitialPerp = null;
                        const _c = this.engine.getNodeMovementConstraint(this._pendingDrag.id);
                        if (_c && _c.type === 'slide') {
                            const nn = this.engine.nodes.get(this._pendingDrag.id);
                            const _dx = _c.line.b.x - _c.line.a.x;
                            const _dy = _c.line.b.y - _c.line.a.y;
                            const _L = Math.hypot(_dx, _dy);
                            if (nn && _L > 0) {
                                this._dragInitialPerp = ((nn.x - _c.line.a.x) * (-_dy) + (nn.y - _c.line.a.y) * _dx) / _L;
                            }
                        }
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
                // Vývoj editor: respektuj constraint (T-junction = 1D slide, frozen = block)
                if (initialData.vyvojMode) {
                    const c = this.engine.getNodeMovementConstraint(this.draggingNodeId);
                    if (c && c.type === 'frozen') {
                        return; // ignoruj drag
                    }
                    if (c && c.type === 'slide') {
                        // RULE #1 slide + #2 perp preservation + #3 edge/middle + #4 right-angle
                        const hax = this._dragHostAxis(c.host);
                        if (hax) {
                            target = { x: pos.x, y: pos.y };
                            const scale = this.stage ? this.stage.scaleX() : 1;
                            const walls = this.engine.getNodeWalls(this.draggingNodeId);
                            // wallBodySign: na kterou stranu od host osy směřuje moje stěna
                            let wallBodySign = 0;
                            for (const myWall of walls) {
                                const otherId = myWall.nodeA === this.draggingNodeId ? myWall.nodeB : myWall.nodeA;
                                const other = this.engine.nodes.get(otherId);
                                if (!other) continue;
                                const oPerp = this._dragSignedPerp(other.x, other.y, hax);
                                if (Math.abs(oPerp) > 0.01) { wallBodySign = Math.sign(oPerp); break; }
                            }
                            const hostWall = this.engine.walls.get(c.host);
                            const hostHalfThk = hostWall ? (hostWall.tloustka * this.engine.PX_PER_M) / 2 : 0;
                            // Edge/middle magnet s hysteresis (2 px enter, 5 px exit)
                            const cursorAbsPerp = Math.abs(this._dragSignedPerp(target.x, target.y, hax));
                            const wasMiddle = this._attachMode === 'middle';
                            const middleActive = wasMiddle ? cursorAbsPerp < 5 / scale : cursorAbsPerp < 2 / scale;
                            let perpOff, attachMode;
                            if (wallBodySign !== 0 && hostHalfThk > 0) {
                                if (middleActive) { perpOff = 0; attachMode = 'middle'; }
                                else {
                                    // Preserve initial perp jen pokud user BYL reálně na okraji
                                    // (ne na středu). Bez této podmínky se node na středu
                                    // "zasekl" ve středu i v edge módu → bug #2.
                                    const initP = this._dragInitialPerp;
                                    const wasOnEdge = initP != null
                                        && Math.abs(initP) > hostHalfThk * 0.5
                                        && Math.abs(initP) <= hostHalfThk + 0.5;
                                    perpOff = wasOnEdge ? initP : wallBodySign * hostHalfThk;
                                    attachMode = 'edge';
                                }
                            } else {
                                const node = this.engine.nodes.get(this.draggingNodeId);
                                perpOff = this._dragSignedPerp(node.x, node.y, hax);
                                attachMode = 'edge';
                            }
                            // Magnetický snap na standardní úhly (tolerance 12 px podél host osy).
                            // Primární: 45/90/135. Sekundární: 30/60/120/150 (arkýře, šestiúhelníky).
                            // POZN: používáme SIGNED deltaPerp (s ohledem na perpOff v edge módu) —
                            // jinak by snap dával 135°+1° v edge režimu (perp offset posouvá geometrii).
                            let t = this._dragActualT(target.x, target.y, hax);
                            let rightAngleSnap = false;
                            const TARGET_ANGLES_DEG = [30, 45, 60, 90, 120, 135, 150];
                            const snapTolPx = 12 / scale;
                            let bestSnap = null;
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
                                    if (candT < 0.02 || candT > 0.98) continue;
                                    const distPx = Math.abs(t - candT) * hax.L;
                                    if (distPx < snapTolPx && (!bestSnap || distPx < bestSnap.dist)) {
                                        bestSnap = { t: candT, dist: distPx };
                                    }
                                }
                            }
                            if (bestSnap) { t = bestSnap.t; rightAngleSnap = true; }
                            const tc = Math.max(0.02, Math.min(0.98, t));
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
                        const tol = 20 / scale;
                        if (wallsAtNode.length <= 1) {
                            const cand = this.engine.findSnapCandidate(target.x, target.y, tol, this.draggingNodeId);
                            this._snapPreview = cand;
                        } else {
                            this._snapPreview = null;
                        }
                        // Magnetický úhel — ray snap podle host osy druhého endpointu
                        // Včetně 180° (kolineární, opačný směr) a 0° (kolineární, stejný směr).
                        const TARGET_ANGLES_DEG = [0, 30, 45, 60, 90, 120, 135, 150, 180];
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
                // T-child RESTRICTION pro node drag:
                // Pokud stěna na draggovaném uzlu má T-children, pohyb uzlu
                // musí být POUZE podél osy této stěny (zachovat směr stěny,
                // aby T-children zůstaly přesně na svých místech).
                // Pro W9 (s T-child W10) a free node W9.nodeB: pohyb jen po
                // W9 ose = vertikálně.
                if (initialData.vyvojMode) {
                    const nodeObj = this.engine.nodes.get(this.draggingNodeId);
                    if (nodeObj) {
                        const origX = nodeObj.x, origY = nodeObj.y;
                        const wallsWithTC = this.engine.getNodeWalls(this.draggingNodeId)
                            .filter(w => this.engine.getTChildren(w.id).length > 0);
                        for (const wTC of wallsWithTC) {
                            const otherId = wTC.nodeA === this.draggingNodeId ? wTC.nodeB : wTC.nodeA;
                            const other = this.engine.nodes.get(otherId);
                            if (!other) continue;
                            const wdx = origX - other.x, wdy = origY - other.y;
                            const wL2 = wdx * wdx + wdy * wdy;
                            if (wL2 < 1) continue;
                            // Promítnout pohyb (target - orig) na wall axis
                            const reqDx0 = target.x - origX, reqDy0 = target.y - origY;
                            const proj = (reqDx0 * wdx + reqDy0 * wdy) / wL2;
                            target = { x: origX + wdx * proj, y: origY + wdy * proj };
                        }
                    }
                }
                // T-child LIMIT pro node drag: kontrola zda by pohyb
                // uzlu nepřesunul T-children stěn na uzlu mimo [0, 1]
                // (aka kterýkoli T-child by se vytlačil mimo svou osu).
                if (initialData.vyvojMode) {
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
                            if (tcFactor < 1.0) {
                                target = { x: origX + reqDx * tcFactor, y: origY + reqDy * tcFactor };
                            }
                        }
                    }
                }

                // Pokud magnetický úhel snap aktivní, obejít grid snap — jinak by
                // snapToGrid posunul uzel z přesné pozice a zobrazený úhel by ukázal
                // 44° místo 45° atd.
                if (this._rightAngleNodeId === this.draggingNodeId) {
                    const _n = this.engine.nodes.get(this.draggingNodeId);
                    if (_n) { _n.x = target.x; _n.y = target.y; }
                } else {
                    this.engine.moveNode(this.draggingNodeId, target.x, target.y);
                }

                // T-children a otvory na stěně dragged node zachovávají
                // ABSOLUTNÍ pozici (neposouvají se se stěnou). Po pohybu
                // node synchronizujeme jejich stored t/pozice s new host axis.
                if (initialData.vyvojMode) {
                    const PX_PER_M = this.engine.PX_PER_M;
                    const wallsOfDraggedNode = this.engine.getNodeWalls(this.draggingNodeId);
                    for (const hostW of wallsOfDraggedNode) {
                        // Sync T-children t na novou osu (zachovává absolute pozici children)
                        this.engine.syncTChildrenT(hostW.id);
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
                    // Žlutá přerušovaná čára na OSU hostitele (middle)
                    group.add(new Konva.Line({
                        points: [info.ax, info.ay, info.ax + info.dx, info.ay + info.dy],
                        stroke: '#f59e0b',
                        strokeWidth: (this._attachMode === 'middle' ? 2.5 : 1.2) / scale,
                        dash: [6 / scale, 4 / scale],
                        opacity: this._attachMode === 'middle' ? 1.0 : 0.6,
                    }));
                    // Žlutá přerušovaná čára na POVRCH hostitele (edge) — na správné straně
                    if (info.hostHalfThk > 0 && info.wallBodySign !== 0) {
                        const ox = info.perpUx * info.wallBodySign * info.hostHalfThk;
                        const oy = info.perpUy * info.wallBodySign * info.hostHalfThk;
                        group.add(new Konva.Line({
                            points: [info.ax + ox, info.ay + oy, info.ax + info.dx + ox, info.ay + info.dy + oy],
                            stroke: '#f59e0b',
                            strokeWidth: (this._attachMode === 'edge' ? 2.5 : 1.2) / scale,
                            dash: [6 / scale, 4 / scale],
                            opacity: this._attachMode === 'edge' ? 1.0 : 0.6,
                        }));
                    }
                    // Middle attach — červené nůžky (✂) vlevo nahoru od node,
                    // varují před splitem
                    if (this._attachMode === 'middle') {
                        const n = this.engine.nodes.get(this.draggingNodeId);
                        if (n) {
                            const scissor = new Konva.Text({
                                x: n.x - 38 / scale,
                                y: n.y - 34 / scale,
                                text: '\u2702',
                                fontSize: 24 / scale,
                                fill: '#dc2626',
                            });
                            group.add(scissor);
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
                        const applyCornerLimit = (node, constraint, initActualT) => {
                            if (!node || !constraint) return;
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
                                let factor = 1.0;
                                for (const other of this.engine.walls.values()) {
                                    if (other.id === w.id) continue;
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
                                        if (allowed <= 0) continue;
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
                                        if (allowed <= 0) continue;
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
                                        if (allowed <= 0) continue;
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
                                        if (allowed <= 0) continue;
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
                        const tol = 14 / scale;
                        const tryMagnet = (nodeId, free) => {
                            if (!free) return null;
                            const n = this.engine.nodes.get(nodeId);
                            const px = n.x + dx, py = n.y + dy;
                            // 1) node magnet (priority)
                            let best = null, bestD = tol;
                            for (const other of this.engine.nodes.values()) {
                                if (other.id === a.id || other.id === b.id) continue;
                                const d = Math.hypot(px - other.x, py - other.y);
                                if (d < bestD) { bestD = d; best = { x: other.x, y: other.y }; }
                            }
                            if (best) return { delta: { x: best.x - px, y: best.y - py } };
                            // 2) wall axis magnet (T-junction)
                            const cand = this.engine.findSnapCandidate(px, py, tol, nodeId);
                            if (cand) return { delta: { x: cand.point.x - px, y: cand.point.y - py } };
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
                            const novaPozice = Math.max(minP, Math.min(maxP, mousePozice + offset));
                            opening.pozice = Math.round(novaPozice * 10) / 10; // snap na 0.1m
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
            if (this.kreslimStenu && this.stenaStart) {
                const snapped = this.engine.snapPoint(pos.x, pos.y);
                this.renderer.drawTempWall(
                    this.stenaStart.x, this.stenaStart.y,
                    snapped.x, snapped.y,
                    this.tloustkaSteny
                );
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
                    this._pendingDrag = { type: 'node', id: hit.id, startPos: { x: pos.x, y: pos.y } };
                    const _nw = this.engine.getNodeWalls(hit.id);
                    this.renderer.setSelection(_nw.map(w => w.id), [hit.id]);
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
                    // Middle attachment → split host wall into two. Node se stane
                    // sdíleným uzlem mezi oběma polovinami (+ svou vlastní stěnou).
                    if (this._attachMode === 'middle' && initialData.vyvojMode) {
                        const draggingNodeId = this.draggingNodeId;
                        const nw = this.engine.getNodeWalls(draggingNodeId);
                        for (const w of nw) {
                            const isEndA = w.nodeA === draggingNodeId;
                            const ck = isEndA ? 'odConstraint' : 'doConstraint';
                            const constraint = w[ck];
                            if (!constraint) continue;
                            const hostId = constraint.host;
                            const tSplit = constraint.t;
                            const newId = this.engine.splitWall(hostId, tSplit, draggingNodeId);
                            if (newId) {
                                // Constraint už není potřeba — node je sdílený
                                w[ck] = null;
                            }
                        }
                    }
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
                    // 1) Merge s blízkým nodem (přednost před T-snap)
                    let merged = false;
                    for (const other of this.engine.nodes.values()) {
                        if (other.id === node.id) continue;
                        if (slideHostIds.has(other.id)) continue;  // ne endpointy hostitele
                        if (Math.hypot(node.x - other.x, node.y - other.y) < this.engine.MAGNET_DIST) {
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
                    if (!merged && !nodeHasConstraint && initialData.vyvojMode) {
                        const scale = this.stage ? this.stage.scaleX() : 1;
                        const tol = 20 / scale;
                        const cand = this.engine.findSnapCandidate(node.x, node.y, tol, this.draggingNodeId);
                        if (cand) {
                            // Posun node na pozici průmětu na ose hostitele
                            node.x = cand.point.x;
                            node.y = cand.point.y;
                            // Najít stěnu s tímto endpointem a vytvořit constraint
                            const walls = this.engine.getNodeWalls(this.draggingNodeId);
                            for (const w of walls) {
                                if (w.id === cand.wall.id) continue;
                                const isEndA = w.nodeA === this.draggingNodeId;
                                const newC = { host: cand.wall.id, t: cand.t };
                                if (isEndA) w.odConstraint = newC;
                                else w.doConstraint = newC;
                            }
                        }
                    }
                }
                this.isDraggingNode = false;
                this.draggingNodeId = null;
                this._snapPreview = null;
                this._rightAngleNodeId = null;
                this._attachMode = null;
                this._attachSlideInfo = null;
                if (this._attachOverlayGroup) { this._attachOverlayGroup.destroy(); this._attachOverlayGroup = null; }
                this.renderer.render();
                this.autoSave('Posun bodu');
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
                this._dragRealOrigin = null;
                this.isDraggingWall = false;
                this.draggingWallId = null;
                this.renderer.render();
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
            const pos = this.getPointerPos();
            const hit = this.renderer.hitTest(e.target);

            // Stěna nástroj
            if (this.nastroj === 'stena') {
                const snapped = this.engine.snapPoint(pos.x, pos.y);

                if (!this.kreslimStenu) {
                    this.kreslimStenu = true;
                    this.stenaStart = snapped;
                } else {
                    const start = this.stenaStart;
                    const delka = Math.hypot(snapped.x - start.x, snapped.y - start.y);

                    if (delka > this.engine.SNAP_STEP) {
                        this.engine.pushUndo();
                        this.engine.addWall(start.x, start.y, snapped.x, snapped.y, this.tloustkaSteny);
                        this.renderer.render();
                        this.autoSave("Nová stěna");
                    }

                    // Pokračovat od posledního bodu
                    this.stenaStart = snapped;
                    this.renderer.clearTemp();
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
            this.renderer.renderGrid();
            this.renderer.renderKoty(); this.renderer.resizeVysky();
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
            this.renderer.renderGrid();
            this.renderer.renderKoty(); this.renderer.resizeVysky();
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
            this.renderer.renderGrid();
            this.renderer.renderKoty(); this.renderer.resizeVysky();
        },

        // ═══════════════════════════════════════════════════════
        // KEYBOARD
        // ═══════════════════════════════════════════════════════
        onKeyDown(e) {
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

            // Mezerník blokován v capture fázi (init)
            if (isInput) return;

            if (e.key === 'Escape') {
                if (this.kreslimStenu) {
                    this.kreslimStenu = false;
                    this.stenaStart = null;
                    this.renderer.clearTemp();
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
                if (e.key === 'z') {
                    e.preventDefault();
                    if (this.engine.undo()) {
                        this.renderer.clearSelection();
                        this.renderer.render();
                        this.autoSave("Vrácení změny");
                    }
                    return;
                }
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
                } catch (e) { console.warn('Katastry.json:', e); return; }
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
                if (d.error) { this.katastrChyba = d.error; this.katastrNacitani = false; return; }

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
                    } catch (e) { parcela._sousedi = null; }
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
            } catch (e) { parcela.stavby = []; }
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
            } catch (e) { /* ignore */ }
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
            } catch (e) { /* ignore */ }
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
            const cacheKey = 'kk_vysky_g_' + cacheHash; // g = globální
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
                const old = JSON.parse(localStorage.getItem('kk_vysky_' + (this.projektId || '0')) || 'null');
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
                                if (k.startsWith('kk_vysky_') && k !== cacheKey) {
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
            } catch (e) { console.warn('Okolní parcely:', e); }
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
                    await fetch(url, {
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
                } catch (e) { /* tiché */ }
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
        _posledniAkce: '',

        autoSave(akce) {
            if (akce) this._posledniAkce = akce;
            if (!this.projektId) return;
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => this.ulozit(), 2000);
        },

        async ulozit() {
            if (!this.projektId || !this.engine) return;
            try {
                const url = initialData.routes.ulozit.replace(':id', this.projektId);
                const resp = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({ data: this.engine.toJSON(), nazev: this.projektNazev, chat: this.chat, akce: this._posledniAkce || 'Automatické uložení' }),
                });
                if (resp.ok) {
                    const d = await resp.json();
                    this.verze = d.verze || this.verze + 1;
                    // Přidat do lokální historie
                    this.historie.push({
                        verze: this.verze,
                        popis: this._posledniAkce || 'Automatické uložení',
                        data: this.engine.toJSON(),
                        cas: new Date().toISOString(),
                    });
                    if (this.historie.length > 50) this.historie = this.historie.slice(-50);
                    this._posledniAkce = null;
                }
            } catch (e) { console.warn('Auto-save chyba:', e); }
        },

        ulozitPanely() {
            localStorage.setItem('kk_panelOpen', JSON.stringify(this.panelOpen));
        },

        ulozitNastaveni() {
            const state = {
                layoutMode: this.layoutMode,
                splitPct: this.splitPct,
                zoom: this.zoom,
                nastroj: this.nastroj,
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
            localStorage.setItem('kk_state', JSON.stringify(state));
            // Zpětná kompatibilita pro klíče čtené jinde
            if (this.projektId) localStorage.setItem('kk_lastProjekt', this.projektId);
        },

        undo() {
            if (this.engine && this.engine.undo()) {
                this.renderer.clearSelection();
                this.renderer.render();
                this.autoSave("Vrácení změny");
            }
        },

        toggleObjekty() {
            if (this.renderer) {
                this.renderer.wallLayer.visible(this.showObjekty);
                this.renderer.labelLayer.visible(this.showObjekty);
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
            }

            this.aiNacitani = false;
            this.scrollChat();
        },

        /** Provede AI příkaz (smazání, undo...) místo přímé JSON manipulace */
        _provedAkci(cmd) {
            const akce = cmd.akce;

            if (akce === 'undo') {
                if (this.engine.undo()) {
                    this.renderer.clearSelection();
                    this.renderer.render();
                }
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
            if (!this.projektId) {
                this.projektNazev = '';
                this.projektData = {};
                this.chat = [];
                this.historie = [];
                this.faze = 'rozhovor';
                if (this.engine) { this.engine.fromJSON({}); this.renderer.render(); }
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
            // Aktualizovat text v selectu — přímo v DOM
            this.$nextTick(() => {
                document.querySelectorAll('select option').forEach(opt => {
                    if (opt.value === String(this.projektId)) opt.textContent = novyNazev;
                });
            });
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
                if (d.id) window.location.href = initialData.routes.indexK + '?id=' + d.id;
            } catch (e) { console.error('Chyba:', e); window.zalogujChybu?.(e, 'koncept novy projekt'); }
        },

        nactiHistorii(index) {
            if (!this.historie[index]) return;
            this.engine.pushUndo();
            this.engine.fromJSON(this.historie[index].data);
            this.renderer.render();
        },

        // ═══════════════════════════════════════════════════════
        // LAYOUT
        // ═══════════════════════════════════════════════════════
        cyklujLayout() {
            this.layoutMode = (this.layoutMode + 1) % 4;
            if (this.layoutMode === 2 || this.layoutMode === 0) this.splitPct = 50;
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
