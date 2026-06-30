/**
 * KonvaRenderer — zobrazuje data ze StavebníEngine na Konva.js canvas.
 *
 * Stěny se vykreslují jako uzavřené polygony (Konva.Line closed).
 * Nody jako malé kruhy (viditelné při hoveru/výběru).
 * Otvory jako bílé obdélníky přes stěnu.
 */
class KonvaRenderer {
    constructor(stage, engine, options = {}) {
        this.stage = stage;
        this.engine = engine;
        this.PX_PER_M = engine.PX_PER_M;

        // Vrstvy — POŘADÍ z-orderu zdola nahoru:
        // 1) grid, 2) katastr, 3) místnosti, 4) zdi, 5) overlay (kóty/popisky/nábytek), 6) selection.
        // Místnosti MUSÍ být POD zdmi: hit rect místnosti má listening:true (pro hover),
        // takže kdyby byly nad zdmi, kradly by zdi click events a uživatel by zeď
        // nemohl uchopit. Pod zdmi: hit detection projde nejprve do wallLayeru (zeď →
        // hit), a do mistnostiLayer dopadne jen pokud user klikne mimo zeď.
        this.gridLayer = new Konva.Layer({ listening: false });      // 1: mřížka
        this.katastrLayer = new Konva.Layer({ listening: true });    // 2: katastr + mapy
        this.mistnostiLayer = new Konva.Layer({ listening: true });  // 3: vyplněné plochy místností + label
        this.wallLayer = new Konva.Layer();                          // 4: stěny + otvory + nody
        this.openingLayer = this.wallLayer;                          // alias
        this.nodeLayer = this.wallLayer;                             // alias
        // Listening true, aby vybavení (nábytek) přijímal click/drag events.
        // Ostatní shapes (kóty, ID popisky, highlights, temp) mají individuálně
        // listening: false — viz renderKoty, renderIds.
        this.overlayLayer = new Konva.Layer({ listening: true });    // 5: kóty + popisky + zvýrazňovač + temp + nábytek
        this.labelLayer = this.overlayLayer;                         // alias
        this.highlightLayer = this.overlayLayer;                     // alias
        this.tempLayer = this.overlayLayer;                          // alias
        this.selectionLayer = new Konva.Layer();                     // 6: výběr / madla

        this.stage.add(this.gridLayer);
        this.stage.add(this.katastrLayer);
        this.stage.add(this.mistnostiLayer);
        this.stage.add(this.wallLayer);
        this.stage.add(this.overlayLayer);
        this.stage.add(this.selectionLayer);

        // Zobrazení
        this.showKoty = options.showKoty ?? true;
        this.showPopisky = options.showPopisky ?? true;
        this.showNodes = options.showNodes ?? true;
        this.showGrid = options.showGrid ?? true;
        this.showIds = options.showIds ?? false;
        this.showMistnosti = options.showMistnosti ?? true;
        this.showVybaveni = options.showVybaveni ?? true;

        // Výběr
        this.selectedWalls = new Set();
        this.selectedNodes = new Set();
        this.selectedOpenings = new Set();
        this.selectedVybaveni = new Set();
        this.selectedProstory = new Set();

        // Konva objekty mapy (id → Konva shape)
        this._wallShapes = new Map();
        this._nodeShapes = new Map();
        this._openingShapes = new Map();
        this._labelShapes = new Map();
    }

    // ═══════════════════════════════════════════════════════
    // RENDER VŠE
    // ═══════════════════════════════════════════════════════
    render() {
        // Vždy vyčistit shapes místností — i když je checkbox vypnutý
        // (aby po toggle showMistnosti=false zmizely polygony, hranice, labely).
        for (const s of (this._mistnostiShapes || [])) s.destroy();
        this._mistnostiShapes = [];
        if (this.showMistnosti) this.renderMistnosti();
        else if (this.mistnostiLayer) this.mistnostiLayer.batchDraw();
        this.renderWalls();
        this.renderNodes();
        this.renderOpenings();
        // Vybavení (nábytek) — vždy vyčistit, vykreslit dle showVybaveni
        for (const s of (this._vybaveniShapes || [])) s.destroy();
        this._vybaveniShapes = [];
        if (this.showVybaveni) this.renderVybaveni();
        if (this.showKoty) this.renderKoty();
        if (this.showIds) this.renderIds();
        if (typeof this.afterRender === 'function') this.afterRender();
    }

    /**
     * Nábytek (kuchyně, koupelna, spotřebiče…). Používá pudorys-icons.js
     * createFurnitureShape (vrací Konva.Group). Engine drží polygon v metrech.
     */
    renderVybaveni() {
        if (!window.PudorysIcons || typeof window.PudorysIcons.createFurnitureShape !== 'function') return;
        const seznam = Array.isArray(this.engine.vybaveni) ? this.engine.vybaveni : [];
        const scale = this.stage ? this.stage.scaleX() || 1 : 1;
        for (const v of seznam) {
            if (!v.polygon || v.polygon.length < 3) continue;
            try {
                const shape = window.PudorysIcons.createFurnitureShape(v, this.PX_PER_M);
                // Listening = true, aby šlo nábytek kliknout / přetahovat. Hit rectangle
                // uvnitř shape (z pudorys-icons) je téměř průhledný a chytá events.
                shape.listening(true);
                shape.setAttr('_vybaveniId', v.id);
                this.overlayLayer.add(shape);
                this._vybaveniShapes.push(shape);

                // POZN: výběr nábytku už označuje rotation handle z renderRotateHandle
                // (modrý čárkovaný OBB rámeček + madlo nad ním). Zde proto NEkreslíme
                // další outline, dříve to vedlo ke dvěma překrývajícím se rámečkům
                // (z nichž jeden u rotovaných objektů zůstával axis-aligned).
            } catch (e) {
                console.warn('[renderVybaveni] selhalo pro', v.id, v.typ, e);
            }
        }
        this.overlayLayer.batchDraw();
    }

    renderMistnosti() {
        // Vyčistit staré shapes místností
        for (const s of (this._mistnostiShapes || [])) s.destroy();
        this._mistnostiShapes = [];
        const prostory = Array.isArray(this.engine.prostory) ? this.engine.prostory : [];
        if (prostory.length === 0) return;
        const scale = this.stage ? this.stage.scaleX() : 1;
        const roomLabelCz = (window.PudorysIcons && window.PudorysIcons.roomLabelCz)
            || function (p) { return (p.nazev || p.typ || '—'); };
        // Je polygon edge (A, B) překrytý reálnou stěnou? Test: najít zeď,
        // jejíž osa je rovnoběžná s edge, obě vertices jsou blízko osy
        // (do tloušťky + tolerance) a leží v rozsahu zdi [t=0..1].
        const edgeCoveredByWall = (A, B) => {
            const edx = B.x - A.x, edy = B.y - A.y;
            const eL = Math.hypot(edx, edy);
            if (eL < 1) return false;
            const eUx = edx / eL, eUy = edy / eL;
            for (const w of this.engine.walls.values()) {
                const nA = this.engine.nodes.get(w.nodeA);
                const nB = this.engine.nodes.get(w.nodeB);
                if (!nA || !nB) continue;
                const wdx = nB.x - nA.x, wdy = nB.y - nA.y;
                const wL = Math.hypot(wdx, wdy);
                if (wL < 1) continue;
                const wUx = wdx / wL, wUy = wdy / wL;
                // Rovnoběžnost (širší tolerance — 10° odchylky povolena)
                const cosAng = Math.abs(eUx * wUx + eUy * wUy);
                if (cosAng < 0.985) continue;
                // Perp vzdálenost A i B od wall axis. Tolerance = half_thk + 4 px
                // aby pokryla i mírné odchylky polygon vrcholů od ideální pozice.
                const tol = (w.tloustka * this.PX_PER_M) / 2 + 4;
                const perpA = Math.abs((A.x - nA.x) * (-wdy) + (A.y - nA.y) * wdx) / wL;
                const perpB = Math.abs((B.x - nA.x) * (-wdy) + (B.y - nA.y) * wdx) / wL;
                if (perpA > tol || perpB > tol) continue;
                // Along projection t musí být v [0..1] rozsahu pro OBĚ
                const tA = ((A.x - nA.x) * wdx + (A.y - nA.y) * wdy) / (wL * wL);
                const tB = ((B.x - nA.x) * wdx + (B.y - nA.y) * wdy) / (wL * wL);
                if (Math.max(tA, tB) < -0.02 || Math.min(tA, tB) > 1.02) continue;
                return true;
            }
            return false;
        };
        // Eviduj již vykreslené hranice — sdílené mezi místnostmi se kreslí jen 1×.
        // Kandidáty na hranice collecтujeme všechny, pak v druhém kroku zmergujeme
        // blízké rovnoběžné (aby dvě sousedící místnosti s mírně odlišnými polygon
        // vrcholy nekreslily dvě téměř totožné čárkované linky).
        const boundaryCandidates = []; // [{A, B}]
        const addBoundary = (A, B) => {
            // Duplicitní paralelní? Merge.
            for (const c of boundaryCandidates) {
                const dAB = Math.hypot(c.A.x - A.x, c.A.y - A.y);
                const dBA = Math.hypot(c.B.x - B.x, c.B.y - B.y);
                const dAB2 = Math.hypot(c.A.x - B.x, c.A.y - B.y);
                const dBA2 = Math.hypot(c.B.x - A.x, c.B.y - A.y);
                if ((dAB < 6 && dBA < 6) || (dAB2 < 6 && dBA2 < 6)) return; // duplicit
            }
            boundaryCandidates.push({ A, B });
        };
        for (const p of prostory) {
            // Polygon z aktuálních pozic vertices (refNodeId → node pos, jinak x,y)
            const vertsPx = (p.vertices || []).map(v => this.engine.getProstorVertexPx(v)).filter(Boolean);
            if (vertsPx.length < 3) continue;
            const flat = [];
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const pt of vertsPx) {
                flat.push(pt.x, pt.y);
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            }
            const w = maxX - minX, h = maxY - minY;
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
            // Podkladový polygon (subtle tint pro visibility)
            const fill = new Konva.Line({
                points: flat, closed: true,
                fill: p.venkovni ? '#fef3c7' : '#eff6ff',
                opacity: 0.35,
                stroke: null, strokeWidth: 0,
                listening: false,
            });
            this.mistnostiLayer.add(fill);
            this._mistnostiShapes.push(fill);
            // Interactive shape (hover highlight + click target)
            const isSel = this.selectedProstory.has(p.id);
            const hit = new Konva.Line({
                points: flat, closed: true,
                fill: '#3b82f6', opacity: isSel ? 0.22 : 0.001,
                stroke: null, strokeWidth: 0,
                listening: true,
            });
            hit.setAttr('_prostorId', p.id);
            hit.on('mouseenter', () => {
                if (!this.selectedProstory.has(p.id)) hit.opacity(0.18);
                this.mistnostiLayer.batchDraw();
                this.stage.container().style.cursor = 'pointer';
            });
            hit.on('mouseleave', () => {
                if (!this.selectedProstory.has(p.id)) hit.opacity(0.001);
                this.mistnostiLayer.batchDraw();
                this.stage.container().style.cursor = 'default';
            });
            this.mistnostiLayer.add(hit);
            this._mistnostiShapes.push(hit);
            // Outline pro vybranou místnost — modrý čárkovaný okraj polygonu.
            if (isSel) {
                const outline = new Konva.Line({
                    points: flat, closed: true,
                    fill: null, stroke: '#3b82f6',
                    strokeWidth: 2 / scale,
                    dash: [8 / scale, 5 / scale],
                    listening: false,
                });
                this.mistnostiLayer.add(outline);
                this._mistnostiShapes.push(outline);
            }
            // Label: název + m² (přepočteno z aktuálního polygonu)
            const label = roomLabelCz(p);
            const plochaM2 = this.engine.getProstorPlocha(p);
            const plocha = plochaM2 ? plochaM2.toFixed(1) + ' m²' : '';
            const text = label + (plocha ? '\n' + plocha : '');
            const area = w * h;
            const fontSize = Math.max(9, Math.min(16, Math.sqrt(area) / 12));
            const t = new Konva.Text({
                x: minX, y: cy - fontSize, width: w,
                text, fontSize,
                fontFamily: 'sans-serif',
                fill: p.venkovni ? '#92400e' : '#374151',
                align: 'center', listening: false,
            });
            this.mistnostiLayer.add(t);
            this._mistnostiShapes.push(t);
            // Collect hranice místnosti — čárkované linie tam, kde edge
            // NEOKOPÍROVÁVÁ reálnou stěnu. Zeď sama o sobě je hranicí.
            for (let i = 0; i < p.vertices.length; i++) {
                const vA = p.vertices[i];
                const vB = p.vertices[(i + 1) % p.vertices.length];
                const pA = this.engine.getProstorVertexPx(vA);
                const pB = this.engine.getProstorVertexPx(vB);
                if (!pA || !pB) continue;
                if (edgeCoveredByWall(pA, pB)) continue;
                addBoundary(pA, pB);
            }
        }
        // Vykreslit sloučené hranice (open-plan, virtuální)
        const boundaryNodes = new Set();  // pro body (stringy "x,y")
        for (const c of boundaryCandidates) {
            const ln = new Konva.Line({
                points: [c.A.x, c.A.y, c.B.x, c.B.y],
                stroke: '#9ca3af',
                strokeWidth: 1,
                dash: [6 / scale, 4 / scale],
                listening: false,
            });
            this.mistnostiLayer.add(ln);
            this._mistnostiShapes.push(ln);
            const keyA = Math.round(c.A.x / 3) * 3 + ',' + Math.round(c.A.y / 3) * 3;
            const keyB = Math.round(c.B.x / 3) * 3 + ',' + Math.round(c.B.y / 3) * 3;
            if (!boundaryNodes.has(keyA)) {
                boundaryNodes.add(keyA);
                const dot = new Konva.Circle({
                    x: c.A.x, y: c.A.y, radius: 3,
                    fill: '#9ca3af', stroke: '#6b7280', strokeWidth: 1,
                    listening: false,
                });
                this.mistnostiLayer.add(dot);
                this._mistnostiShapes.push(dot);
            }
            if (!boundaryNodes.has(keyB)) {
                boundaryNodes.add(keyB);
                const dot = new Konva.Circle({
                    x: c.B.x, y: c.B.y, radius: 3,
                    fill: '#9ca3af', stroke: '#6b7280', strokeWidth: 1,
                    listening: false,
                });
                this.mistnostiLayer.add(dot);
                this._mistnostiShapes.push(dot);
            }
        }
        this.mistnostiLayer.batchDraw();
    }

    renderIds() {
        // Vyčistit staré ID texty (kumulovaly se po každém re-render — drag objektu, atd.)
        const toDel = [];
        for (const [key, shape] of this._labelShapes) {
            if (key.startsWith('id_')) {
                shape.destroy();
                toDel.push(key);
            }
        }
        toDel.forEach(k => this._labelShapes.delete(k));
        const scale = this.stage ? this.stage.scaleX() : 1;
        // Wall IDs
        for (const wall of this.engine.walls.values()) {
            const nA = this.engine.nodes.get(wall.nodeA);
            const nB = this.engine.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            const cx = (nA.x + nB.x) / 2;
            const cy = (nA.y + nB.y) / 2;
            const dx = nB.x - nA.x, dy = nB.y - nA.y;
            const len = Math.hypot(dx, dy);
            if (len < 1) continue;
            const tl = wall.tloustka * this.PX_PER_M;
            // Offset NA OPAČNOU stranu než kóta (směr -nx, -ny)
            const nx = -dy / len, ny = dx / len;
            const offset = tl / 2 + 10 / scale;
            const text = new Konva.Text({
                x: cx - nx * offset,
                y: cy - ny * offset,
                text: wall.id,
                fontSize: 10 / scale,
                fill: '#9333ea',
                fontStyle: 'bold',
                listening: false,
            });
            text.offsetX(text.width() / 2);
            text.offsetY(text.height() / 2);
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angle > 90 || angle < -90) angle += 180;
            text.rotation(angle);
            this.labelLayer.add(text);
            this._labelShapes.set('id_' + wall.id, text);
        }
        // Opening IDs
        for (const opening of this.engine.openings.values()) {
            const wall = this.engine.walls.get(opening.wallId);
            if (!wall) continue;
            const nA = this.engine.nodes.get(wall.nodeA);
            const nB = this.engine.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            const dx = nB.x - nA.x, dy = nB.y - nA.y;
            const len = Math.hypot(dx, dy);
            if (len < 1) continue;
            const dirX = dx / len, dirY = dy / len;
            const pozPx = opening.pozice * this.PX_PER_M + (opening.sirka * this.PX_PER_M) / 2;
            const ox = nA.x + dirX * pozPx;
            const oy = nA.y + dirY * pozPx;
            const text = new Konva.Text({
                x: ox,
                y: oy,
                text: opening.id,
                fontSize: 9 / scale,
                fill: '#ea580c',
                fontStyle: 'bold',
                listening: false,
            });
            text.offsetX(text.width() / 2);
            text.offsetY(text.height() / 2);
            this.labelLayer.add(text);
            this._labelShapes.set('id_' + opening.id, text);
        }
        this.labelLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // STĚNY
    // ═══════════════════════════════════════════════════════
    renderWalls() {
        // Smazat staré
        for (const shape of this._wallShapes.values()) shape.destroy();
        this._wallShapes.clear();

        const scale = this.stage ? this.stage.scaleX() : 1;
        for (const wall of this.engine.walls.values()) {
            const selected = this.selectedWalls.has(wall.id);
            const polygon = this.engine.getWallPolygon(wall.id);
            if (polygon.length < 3) continue;

            const points = [];
            polygon.forEach(p => { points.push(p.x, p.y); });

            const typDef = (typeof TYPY_STEN !== 'undefined' && TYPY_STEN[wall.typ]) || {};
            const fillColor = typDef.barva2d || '#4b5563';
            const strokeColor = typDef.barva2dStroke || '#1f2937';

            const shape = new Konva.Line({
                points: points,
                closed: true,
                fill: selected ? '#374151' : fillColor,
                stroke: selected ? '#3b82f6' : strokeColor,
                strokeWidth: selected ? 3 : 1,
                hitStrokeWidth: 20,
            });

            shape.setAttr('_wallId', wall.id);
            this.wallLayer.add(shape);
            this._wallShapes.set(wall.id, shape);
        }
        this.wallLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // NODY (spojovací body)
    // ═══════════════════════════════════════════════════════
    renderNodes() {
        for (const shape of this._nodeShapes.values()) shape.destroy();
        this._nodeShapes.clear();

        if (!this.showNodes) return;

        // Nový režim editoru: barvy podle typu napojení (L/T/X/frozen).
        // Aktivuje se pomocí this.nodeColorByJunctionType = true (option).
        const useJunctionColors = this.nodeColorByJunctionType === true;

        for (const node of this.engine.nodes.values()) {
            const selected = this.selectedNodes.has(node.id);
            let fill, stroke, radius;

            const wallsAtNode = this.engine.getNodeWalls(node.id);

            if (useJunctionColors) {
                const type = this.engine.getNodeJunctionType(node.id);
                if (selected) {
                    fill = '#f97316';     // oranžová = aktivní
                    stroke = '#c2410c';
                    radius = 7;
                } else if (type === 'frozen') {
                    fill = '#9ca3af';     // šedá = frozen
                    stroke = '#6b7280';
                    radius = 5;
                } else {
                    fill = '#3b82f6';     // modrá = vše ostatní
                    stroke = '#1d4ed8';
                    radius = 5;
                }
                node._junctionType = type; // pro tooltip / další UI
            } else {
                // Původní barvy (zachovat pro produkční koncept-k)
                const hasMultipleWalls = wallsAtNode.length >= 2;
                fill = selected ? '#3b82f6' : (hasMultipleWalls ? '#f97316' : '#9ca3af');
                stroke = selected ? '#1d4ed8' : '#6b7280';
                radius = selected ? 6 : (hasMultipleWalls ? 5 : 4);
            }

            const circle = new Konva.Circle({
                x: node.x, y: node.y,
                radius, fill, stroke,
                strokeWidth: 1,
                hitStrokeWidth: 15,
            });

            circle.setAttr('_nodeId', node.id);
            this.nodeLayer.add(circle);
            this._nodeShapes.set(node.id, circle);
        }
        this.nodeLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // OTVORY
    // ═══════════════════════════════════════════════════════
    renderOpenings() {
        for (const shape of this._openingShapes.values()) shape.destroy();
        this._openingShapes.clear();
        // Vyčistit všechny dveřní detaily (oblouky, křídla, posuvné čáry) — name="_doorDetail_*"
        this.overlayLayer.find(n => typeof n.name === 'function' && String(n.name()).startsWith('_doorDetail_'))
            .forEach(n => n.destroy());

        for (const opening of this.engine.openings.values()) {
            const wall = this.engine.walls.get(opening.wallId);
            if (!wall) continue;

            const nA = this.engine.nodes.get(wall.nodeA);
            const nB = this.engine.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;

            const dx = nB.x - nA.x;
            const dy = nB.y - nA.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) continue;

            const dirX = dx / len;
            const dirY = dy / len;
            const tl = wall.tloustka * this.PX_PER_M;
            const pozPx = opening.pozice * this.PX_PER_M;
            const sirPx = opening.sirka * this.PX_PER_M;
            const uhel = Math.atan2(dy, dx) * (180 / Math.PI);

            const ox = nA.x + dirX * pozPx;
            const oy = nA.y + dirY * pozPx;

            const selected = this.selectedOpenings.has(opening.id);
            const otvorDef = (typeof TYPY_OTVORU !== 'undefined' && TYPY_OTVORU[opening.typ]) || {};
            const barva = otvorDef.barva2d || '#c2410c';

            const rect = new Konva.Rect({
                x: ox,
                y: oy,
                width: sirPx,
                height: tl + 4,
                fill: selected ? '#fef3c7' : '#ffffff',
                stroke: selected ? '#3b82f6' : barva,
                strokeWidth: selected ? 2.5 : 1.5,
                rotation: uhel,
                offsetY: (tl + 4) / 2,
                hitStrokeWidth: 15,
            });

            rect.setAttr('_openingId', opening.id);
            this.openingLayer.add(rect);
            this._openingShapes.set(opening.id, rect);

            // Dveřní oblouk / posuvné / lítačky — vykreslit na overlayLayer
            this._drawOpeningDetail(opening, { nA, dirX, dirY, pozPx, sirPx, tl, barva });
        }
        this.openingLayer.batchDraw();
        this.overlayLayer.batchDraw();
    }

    /** Kreslí detail otvoru: dveřní křídlo + oblouk / posuvné / lítačky. */
    _drawOpeningDetail(opening, ctx) {
        // Vyčistit předchozí shapes tohoto otvoru
        this.overlayLayer.find('._doorDetail_' + opening.id).forEach(n => n.destroy());
        const typ = opening.typ;
        // Pouze typy s dveřmi mají otvírací směr
        const hasDoor = (typ === 'dvere' || typ === 'francouzske_okno' || typ === 'garazova_vrata');
        if (!hasDoor) return;
        const smer = opening.smer || 'pravy';
        if (smer === 'otvor') return; // bez křídla = nic nekreslit

        const { nA, dirX, dirY, pozPx, sirPx, barva } = ctx;
        const nx = -dirY, ny = dirX; // normála zdi

        if (smer === 'posuvne') {
            const wall = this.engine.walls.get(opening.wallId);
            const tlPx = wall ? wall.tloustka * this.PX_PER_M : 10;
            // Posuvné dveře — křídlo jako obdélník přes otvor + pouzdro (chráněná oblast)
            // vedle otvoru, kam se křídlo zasouvá. Strana zasunutí: strana='in' = směr nodeA,
            // strana='out' = směr nodeB.
            const strana = opening.strana || 'in';
            const slideToNodeA = (strana === 'in');
            // Křídlo (thin rectangle přes otvor)
            const wingThk = Math.min(3, tlPx * 0.3);
            const wingStartT = pozPx;
            const wingEndT = pozPx + sirPx;
            const wingPts = [
                nA.x + dirX * wingStartT - nx * wingThk / 2, nA.y + dirY * wingStartT - ny * wingThk / 2,
                nA.x + dirX * wingEndT - nx * wingThk / 2, nA.y + dirY * wingEndT - ny * wingThk / 2,
                nA.x + dirX * wingEndT + nx * wingThk / 2, nA.y + dirY * wingEndT + ny * wingThk / 2,
                nA.x + dirX * wingStartT + nx * wingThk / 2, nA.y + dirY * wingStartT + ny * wingThk / 2,
            ];
            this.overlayLayer.add(new Konva.Line({
                points: wingPts, closed: true,
                fill: barva, opacity: 0.35,
                stroke: barva, strokeWidth: 1,
                name: '_doorDetail_' + opening.id,
            }));
            // Pouzdro — čárkovaný obdélník vedle otvoru, délka = sirPx, výška = wall thickness
            const pouzdroStart = slideToNodeA ? (pozPx - sirPx) : (pozPx + sirPx);
            const pouzdroEnd = slideToNodeA ? pozPx : (pozPx + 2 * sirPx);
            const halfTl = tlPx / 2;
            const pts = [
                nA.x + dirX * pouzdroStart - nx * halfTl, nA.y + dirY * pouzdroStart - ny * halfTl,
                nA.x + dirX * pouzdroEnd - nx * halfTl, nA.y + dirY * pouzdroEnd - ny * halfTl,
                nA.x + dirX * pouzdroEnd + nx * halfTl, nA.y + dirY * pouzdroEnd + ny * halfTl,
                nA.x + dirX * pouzdroStart + nx * halfTl, nA.y + dirY * pouzdroStart + ny * halfTl,
            ];
            this.overlayLayer.add(new Konva.Line({
                points: pts, closed: true,
                stroke: barva, strokeWidth: 1,
                dash: [5, 3],
                opacity: 0.7,
                name: '_doorDetail_' + opening.id,
            }));
            // Šipka směru zasunutí (malá, uprostřed pouzdra)
            const arrowMidT = (pouzdroStart + pouzdroEnd) / 2;
            const arrowMidX = nA.x + dirX * arrowMidT;
            const arrowMidY = nA.y + dirY * arrowMidT;
            const arrowLen = Math.min(sirPx * 0.3, 20);
            const arrowDirSign = slideToNodeA ? -1 : 1;
            this.overlayLayer.add(new Konva.Arrow({
                points: [
                    arrowMidX - dirX * arrowLen / 2 * arrowDirSign,
                    arrowMidY - dirY * arrowLen / 2 * arrowDirSign,
                    arrowMidX + dirX * arrowLen / 2 * arrowDirSign,
                    arrowMidY + dirY * arrowLen / 2 * arrowDirSign,
                ],
                stroke: barva, strokeWidth: 1.5,
                fill: barva,
                pointerLength: 5, pointerWidth: 5,
                opacity: 0.8,
                name: '_doorDetail_' + opening.id,
            }));
            return;
        }

        // levy / pravy / litaci — kresba 1/4 kruhu + linie křídla
        const strana = opening.strana || 'in';
        const sideSign = strana === 'in' ? 1 : -1;

        const drawLeaf = (hingeT, closedSign, sideSignLocal, wingLen, dashed) => {
            const hingeX = nA.x + dirX * hingeT;
            const hingeY = nA.y + dirY * hingeT;
            const closedDX = dirX * closedSign, closedDY = dirY * closedSign;
            const openDX = nx * sideSignLocal, openDY = ny * sideSignLocal;
            const a0 = Math.atan2(closedDY, closedDX);
            const a1 = Math.atan2(openDY, openDX);
            let delta = a1 - a0;
            while (delta > Math.PI) delta -= 2 * Math.PI;
            while (delta < -Math.PI) delta += 2 * Math.PI;
            const counterclockwise = delta < 0;
            this.overlayLayer.add(new Konva.Shape({
                sceneFunc: function (c, s) {
                    c.beginPath();
                    c.arc(hingeX, hingeY, wingLen, a0, a1, counterclockwise);
                    c.strokeShape(s);
                },
                stroke: barva,
                strokeWidth: dashed ? 1 : 1.2,
                dash: dashed ? [3, 2] : null,
                name: '_doorDetail_' + opening.id,
            }));
            this.overlayLayer.add(new Konva.Line({
                points: [hingeX, hingeY, hingeX + openDX * wingLen, hingeY + openDY * wingLen],
                stroke: barva,
                strokeWidth: dashed ? 1 : 1.5,
                dash: dashed ? [3, 2] : null,
                name: '_doorDetail_' + opening.id,
            }));
        };

        if (smer === 'levy' || smer === 'pravy') {
            const isLeft = smer === 'levy';
            const hingeT = isLeft ? pozPx : (pozPx + sirPx);
            const closedSign = isLeft ? 1 : -1;
            drawLeaf(hingeT, closedSign, sideSign, sirPx, false);
        }
    }

    // ═══════════════════════════════════════════════════════
    // KÓTY (rozměry stěn)
    // ═══════════════════════════════════════════════════════
    renderKoty() {
        for (const shape of this._labelShapes.values()) shape.destroy();
        this._labelShapes.clear();

        if (!this.showKoty) { this.labelLayer.batchDraw(); return; }

        const scale = this.stage.scaleX();

        for (const wall of this.engine.walls.values()) {
            const nA = this.engine.nodes.get(wall.nodeA);
            const nB = this.engine.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;

            const delka = this.engine.getWallLength(wall.id);
            if (delka < 0.2) continue;

            const cx = (nA.x + nB.x) / 2;
            const cy = (nA.y + nB.y) / 2;
            const tl = wall.tloustka * this.PX_PER_M;

            // Posunout kótu nad stěnu
            const dx = nB.x - nA.x;
            const dy = nB.y - nA.y;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len;
            const ny = dx / len;
            const offset = tl / 2 + 10 / scale; // 10px od kraje stěny (screen space)

            const text = new Konva.Text({
                x: cx + nx * offset,
                y: cy + ny * offset,
                text: delka.toFixed(2) + 'm',
                fontSize: 11 / scale,
                fill: '#6b7280',
                align: 'center',
                offsetX: 0,
                offsetY: 0,
                listening: false,
            });

            // Vycentrovat
            text.offsetX(text.width() / 2);
            text.offsetY(text.height() / 2);

            // Rotovat aby sledoval stěnu
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angle > 90 || angle < -90) angle += 180;
            text.rotation(angle);

            this.labelLayer.add(text);
            this._labelShapes.set('kota_' + wall.id, text);
        }
        this.labelLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // MŘÍŽKA
    // ═══════════════════════════════════════════════════════
    highlightWall(wallId) {
        for (const [id, shape] of this._wallShapes) {
            const wall = this.engine.walls.get(id);
            const typDef = (typeof TYPY_STEN !== 'undefined' && wall && TYPY_STEN[wall.typ]) || {};
            const defaultFill = typDef.barva2d || '#4b5563';
            const defaultStroke = typDef.barva2dStroke || '#1f2937';
            const selected = this.selectedWalls.has(id);
            const hovered = id === wallId;
            shape.fill(selected ? '#374151' : (hovered ? '#2563eb' : defaultFill));
            shape.stroke(selected ? '#3b82f6' : (hovered ? '#1d4ed8' : defaultStroke));
            shape.opacity(hovered ? 0.8 : 1);
        }
        this.wallLayer.batchDraw();
    }

    resizeVysky() {
        if (!this._vyskyShapes || this._vyskyShapes.length === 0) return;
        const scale = this.stage.scaleX();
        const r = 3 / scale;
        this._vyskyShapes.forEach(c => c.radius(r));
        this.katastrLayer.batchDraw();
    }

    renderGrid() {
        this.gridLayer.destroyChildren();
        if (this.showGrid === false) { this.gridLayer.batchDraw(); return; }
        const w = this.stage.width();
        const h = this.stage.height();
        const scale = this.stage.scaleX();
        const rot = this.stage.rotation() * Math.PI / 180;
        const pos = this.stage.position();

        // Viewport corners v world space (zohledňuje rotaci + offset)
        const ox = this.stage.offsetX();
        const oy = this.stage.offsetY();
        const cosR = Math.cos(-rot), sinR = Math.sin(-rot);
        const corners = [
            { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }
        ].map(c => {
            const dx = (c.x - pos.x) / scale;
            const dy = (c.y - pos.y) / scale;
            return {
                x: dx * cosR - dy * sinR + ox,
                y: dx * sinR + dy * cosR + oy,
            };
        });
        const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
        // Větší margin pro pokrytí rotovaného viewport
        const diag = Math.hypot(w, h) / scale;
        const margin = diag * 0.3;
        const startX = Math.min(...xs) - margin;
        const endX = Math.max(...xs) + margin;
        const startY = Math.min(...ys) - margin;
        const endY = Math.max(...ys) + margin;

        // Multi-level adaptive grid
        // Úrovně: 100m, 10m, 1m, 10cm — zobrazují se podle zoomu
        const pxM = this.PX_PER_M;
        const levels = [
            { step: pxM * 100, color: '#c4c9d1', width: 0.8, minScale: 0.05 },  // 100m — skrýt při extrémním oddálení
            { step: pxM * 10,  color: '#b8bdc5', width: 0.8, minScale: 0.12 },  // 10m
            { step: pxM * 1,   color: '#c4c9d1', width: 0.5, minScale: 0.3 },   // 1m
            { step: pxM * 0.1, color: '#d1d5db', width: 0.3, minScale: 1.5 },   // 10cm
        ];

        const rangeX = endX - startX, rangeY = endY - startY;

        let anyDrawn = false;
        for (const lvl of levels) {
            if (scale < lvl.minScale) continue;
            // Přeskočit level pokud by generoval víc než 600 čar (X+Y dohromady)
            const countX = rangeX / lvl.step;
            const countY = rangeY / lvl.step;
            if (countX + countY > 600) continue;
            anyDrawn = true;

            const minX = Math.floor(startX / lvl.step) * lvl.step;
            const minY = Math.floor(startY / lvl.step) * lvl.step;

            for (let x = minX; x <= endX; x += lvl.step) {
                this.gridLayer.add(new Konva.Line({
                    points: [x, startY, x, endY],
                    stroke: lvl.color,
                    strokeWidth: lvl.width / scale,
                }));
            }
            for (let y = minY; y <= endY; y += lvl.step) {
                this.gridLayer.add(new Konva.Line({
                    points: [startX, y, endX, y],
                    stroke: lvl.color,
                    strokeWidth: lvl.width / scale,
                }));
            }
        }

        // Fallback — pokud žádný level neprošel, vykresli nejhrubší
        if (!anyDrawn) {
            const fb = levels[0]; // 100m
            const minX = Math.floor(startX / fb.step) * fb.step;
            const minY = Math.floor(startY / fb.step) * fb.step;
            for (let x = minX; x <= endX; x += fb.step) {
                this.gridLayer.add(new Konva.Line({ points: [x, startY, x, endY], stroke: fb.color, strokeWidth: fb.width / scale }));
            }
            for (let y = minY; y <= endY; y += fb.step) {
                this.gridLayer.add(new Konva.Line({ points: [startX, y, endX, y], stroke: fb.color, strokeWidth: fb.width / scale }));
            }
        }

        // Osy
        this.gridLayer.add(new Konva.Line({ points: [0, startY, 0, endY], stroke: '#94a3b8', strokeWidth: 1 / scale }));
        this.gridLayer.add(new Konva.Line({ points: [startX, 0, endX, 0], stroke: '#94a3b8', strokeWidth: 1 / scale }));

        this.gridLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // SELECTION
    // ═══════════════════════════════════════════════════════
    setSelection(wallIds = [], nodeIds = [], openingIds = [], vybaveniIds = [], prostoryIds = []) {
        this.selectedWalls = new Set(wallIds);
        this.selectedNodes = new Set(nodeIds);
        this.selectedOpenings = new Set(openingIds);
        this.selectedVybaveni = new Set(vybaveniIds);
        this.selectedProstory = new Set(prostoryIds);
        this.render();
    }

    clearSelection() {
        this.selectedWalls.clear();
        this.selectedNodes.clear();
        this.selectedOpenings.clear();
        this.selectedVybaveni.clear();
        this.selectedProstory.clear();
        this.render();
    }

    toggleVybaveniSelection(id) {
        if (this.selectedVybaveni.has(id)) {
            this.selectedVybaveni.delete(id);
        } else {
            this.selectedVybaveni.add(id);
        }
        this.render();
    }

    toggleProstorSelection(id) {
        if (this.selectedProstory.has(id)) {
            this.selectedProstory.delete(id);
        } else {
            this.selectedProstory.add(id);
        }
        this.render();
    }

    toggleWallSelection(wallId) {
        if (this.selectedWalls.has(wallId)) {
            this.selectedWalls.delete(wallId);
        } else {
            this.selectedWalls.add(wallId);
        }
        this.render();
    }

    toggleOpeningSelection(openingId) {
        if (this.selectedOpenings.has(openingId)) {
            this.selectedOpenings.delete(openingId);
        } else {
            this.selectedOpenings.add(openingId);
        }
        this.render();
    }

    selectAll() {
        for (const wall of this.engine.walls.values()) {
            this.selectedWalls.add(wall.id);
        }
        for (const opening of this.engine.openings.values()) {
            this.selectedOpenings.add(opening.id);
        }
        for (const v of (this.engine.vybaveni || [])) {
            this.selectedVybaveni.add(v.id);
        }
        for (const p of (this.engine.prostory || [])) {
            this.selectedProstory.add(p.id);
        }
        this.render();
    }

    // ═══════════════════════════════════════════════════════
    // TEMP (preview při kreslení)
    // ═══════════════════════════════════════════════════════
    drawTempWall(x1, y1, x2, y2, tloustka = 0.3) {
        this.overlayLayer.find('.temp').forEach(n => n.destroy());

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;

        const tl = tloustka * this.PX_PER_M;
        const half = tl / 2;
        const nx = -dy / len;
        const ny = dx / len;

        const points = [
            x1 + nx * half, y1 + ny * half,
            x2 + nx * half, y2 + ny * half,
            x2 - nx * half, y2 - ny * half,
            x1 - nx * half, y1 - ny * half,
        ];

        this.overlayLayer.add(new Konva.Line({
            points: points,
            closed: true,
            fill: 'rgba(75, 85, 99, 0.4)',
            stroke: '#6b7280',
            strokeWidth: 1,
            dash: [4, 4],
            name: 'temp',
        }));

        this.overlayLayer.batchDraw();
    }

    clearTemp() {
        this.overlayLayer.find('.temp').forEach(n => n.destroy());
        this.overlayLayer.batchDraw();
    }

    clearMapTiles() {
        if (this.mapLayer) {
            this.mapLayer.destroyChildren();
            this.mapLayer.batchDraw();
        }
    }

    // Rubber-band selection rect
    drawSelectionRect(x, y, w, h) {
        this.selectionLayer.find('.rubberband').forEach(n => n.destroy());
        if (Math.abs(w) > 2 || Math.abs(h) > 2) {
            this.selectionLayer.add(new Konva.Rect({
                x: w < 0 ? x + w : x,
                y: h < 0 ? y + h : y,
                width: Math.abs(w),
                height: Math.abs(h),
                stroke: '#3b82f6',
                strokeWidth: 1 / this.stage.scaleX(),
                fill: 'rgba(59, 130, 246, 0.08)',
                name: 'rubberband',
            }));
        }
        this.selectionLayer.batchDraw();
    }

    clearSelectionRect() {
        this.selectionLayer.find('.rubberband').forEach(n => n.destroy());
        this.selectionLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // HIT TEST
    // ═══════════════════════════════════════════════════════
    /** Z Konva eventu zjistí co bylo kliknuto */
    hitTest(konvaTarget) {
        if (konvaTarget?.getAttr?.('_rotateHandle')) {
            return { type: 'rotate' };
        }

        const wallId = konvaTarget?.getAttr?.('_wallId');
        if (wallId) return { type: 'wall', id: wallId };

        const nodeId = konvaTarget?.getAttr?.('_nodeId');
        if (nodeId) return { type: 'node', id: nodeId };

        const openingId = konvaTarget?.getAttr?.('_openingId');
        if (openingId) return { type: 'opening', id: openingId };

        // _vybaveniId je nastavené na Konva.Group v renderVybaveni; klik
        // dopadne na vnitřní hit Rect, jehož parent je tato group.
        let cursor = konvaTarget;
        for (let i = 0; i < 4 && cursor; i++) {
            const vid = cursor?.getAttr?.('_vybaveniId');
            if (vid) return { type: 'vybaveni', id: vid };
            cursor = cursor.getParent ? cursor.getParent() : null;
        }

        const prostorId = konvaTarget?.getAttr?.('_prostorId');
        if (prostorId) return { type: 'prostor', id: prostorId };

        return { type: 'empty' };
    }

    // ═══════════════════════════════════════════════════════
    // ROTATE HANDLE — rámeček + madlo naproti předku (nejdelší stěně)
    // bbox = OBB { cx, cy, halfW, halfH, angle, handleLocalV }
    // ═══════════════════════════════════════════════════════
    renderRotateHandle(bbox, blockReason = null) {
        this.selectionLayer.find('.rotateHandle').forEach(n => n.destroy());
        if (!bbox) { this.selectionLayer.batchDraw(); return; }

        const scale = this.stage.scaleX() || 1;
        const pad = 12 / scale;
        const handleDist = 28 / scale;
        const r = 10 / scale;

        const halfW = bbox.halfW + pad;
        const halfH = bbox.halfH + pad;
        // Madlo na straně naproti předku (znaménko = směr od středu ven)
        const sign = bbox.handleLocalV >= 0 ? 1 : -1;
        const handleV = sign * (halfH + handleDist);
        const edgeV = sign * halfH;

        const blocked = !!blockReason;
        const color = blocked ? '#9ca3af' : '#3b82f6';

        // Group rotovaná do orientace předku — OBB je v lokálním frame axis-aligned.
        const group = new Konva.Group({
            x: bbox.cx,
            y: bbox.cy,
            rotation: bbox.angle * 180 / Math.PI,
            name: 'rotateHandle',
        });

        // Rámeček OBB (čárkovaný)
        group.add(new Konva.Rect({
            x: -halfW, y: -halfH,
            width: 2 * halfW, height: 2 * halfH,
            stroke: color,
            strokeWidth: 1 / scale,
            dash: [6 / scale, 4 / scale],
            listening: false,
        }));

        // Spojovací čára k madlu
        group.add(new Konva.Line({
            points: [0, edgeV, 0, handleV - sign * r],
            stroke: color,
            strokeWidth: 1 / scale,
            listening: false,
        }));

        // Kruhové madlo
        const handle = new Konva.Circle({
            x: 0, y: handleV,
            radius: r,
            fill: blocked ? '#e5e7eb' : '#dbeafe',
            stroke: color,
            strokeWidth: 1.5 / scale,
            _rotateHandle: true,
        });
        group.add(handle);

        // Ikona ↻ (kompenzujeme rotaci group → šipka zůstává svislá,
        // align/verticalAlign + offset na střed = přesné centrování v kruhu)
        const ts = 2 * r;
        group.add(new Konva.Text({
            x: 0, y: handleV,
            text: '↻',
            fontSize: 14 / scale,
            fontStyle: 'bold',
            fill: color,
            width: ts, height: ts,
            align: 'center',
            verticalAlign: 'middle',
            offsetX: ts / 2,
            offsetY: ts / 2,
            rotation: -bbox.angle * 180 / Math.PI,
            listening: false,
        }));

        this.selectionLayer.add(group);
        this.selectionLayer.batchDraw();
    }

    // ═══════════════════════════════════════════════════════
    // KATASTR RENDERING
    // ═══════════════════════════════════════════════════════
    renderKatastr(parcely, showParcely, showStavby, showSousedy, zvyraznenyIndex, okolni, kompasUhel, vyskovyProfil) {
        // Smazat jen katastr objekty, NE map tiles
        this.katastrLayer.find('Line').forEach(l => l.destroy());
        this.katastrLayer.find('Text').forEach(t => t.destroy());
        this.katastrLayer.find('Circle').forEach(c => c.destroy());
        if (!parcely || parcely.length === 0) {
            this._fixedWgsCenter = null;
            this.katastrLayer.batchDraw();
            return;
        }

        // WGS84 centroid — zakotvit po první parcele (nepřepočítávat!)
        if (!this._fixedWgsCenter) {
            this._fixedWgsCenter = this._wgs84Center(parcely);
        }
        const wgsCenter = this._fixedWgsCenter;

        // Parcely — preferovat WGS84 (sjednoceno s mapou)
        if (showParcely) {
            parcely.forEach((p, i) => {
                const poly = p.polygon_wgs84 || p.polygon_sjtsk;
                if (!poly || poly.length < 3) return;

                const pts = p.polygon_wgs84
                    ? this._wgs84NaCanvas(poly, wgsCenter)
                    : this._sjtskNaCanvas(poly, this._katastrCentroid(parcely));
                if (pts.length < 3) return;

                const flatPts = [];
                pts.forEach(pt => { flatPts.push(pt.x, pt.y); });

                const highlighted = i === zvyraznenyIndex;
                this.katastrLayer.add(new Konva.Line({
                    points: flatPts,
                    closed: true,
                    fill: highlighted ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.08)',
                    stroke: highlighted ? '#FF6600' : '#FFD700',
                    strokeWidth: highlighted ? 6 : 4,
                }));
            });
        }

        // Stavby — WGS84
        if (showStavby) {
            parcely.forEach(p => {
                (p.stavby || []).forEach(s => {
                    if (!s.polygon_wgs84 || s.polygon_wgs84.length < 3) return;
                    const pts = this._wgs84NaCanvas(s.polygon_wgs84, wgsCenter);
                    if (pts.length < 3) return;

                    const flatPts = [];
                    pts.forEach(pt => { flatPts.push(pt.x, pt.y); });

                    this.katastrLayer.add(new Konva.Line({
                        points: flatPts,
                        closed: true,
                        fill: 'rgba(158, 158, 158, 0.3)',
                        stroke: '#9E9E9E',
                        strokeWidth: 1,
                        dash: [4, 2],
                    }));
                });
            });
        }

        // Sousední parcely — WGS84
        if (showSousedy && okolni && okolni.length > 0) {
            okolni.forEach(op => {
                const poly = op.polygon_wgs84 || op.polygon_sjtsk;
                if (!poly || poly.length < 3) return;

                const pts = op.polygon_wgs84
                    ? this._wgs84NaCanvas(poly, wgsCenter)
                    : this._sjtskNaCanvas(poly, this._katastrCentroid(parcely));
                if (pts.length < 3) return;

                const flatPts = [];
                pts.forEach(pt => { flatPts.push(pt.x, pt.y); });

                this.katastrLayer.add(new Konva.Line({
                    points: flatPts,
                    closed: true,
                    fill: 'rgba(200, 200, 200, 0.08)',
                    stroke: 'rgba(140, 140, 140, 0.7)',
                    strokeWidth: 2,
                    dash: [8, 4],
                }));

                // Label — přesná logika z původního konceptu (chains, ray-casting)
                if (op.label) {
                    const lpos = this._vypoctiLabelPozici(pts, parcely, wgsCenter);
                    this.katastrLayer.add(new Konva.Text({
                        x: lpos.x, y: lpos.y,
                        text: op.label,
                        fontSize: 22,
                        fontStyle: 'bold',
                        fill: 'rgba(60, 60, 60, 0.85)',
                        rotation: -(kompasUhel || 0),
                        offsetX: op.label.length * 5,
                        offsetY: 11,
                    }));
                }
            });
        }

        // Výškové body — barevné tečky (body jsou ve WGS84 [lat, lon, z])
        if (vyskovyProfil && vyskovyProfil.body && vyskovyProfil.body.length > 0 && this._fixedWgsCenter) {
            const vMin = vyskovyProfil.vyska_min;
            const vMax = vyskovyProfil.vyska_max;
            const vRange = vMax - vMin || 1;
            const scale = this.stage.scaleX();
            const vizRadius = 3 / scale; // vizuální radius
            const hitRadius = 6 / scale; // hit area 2× větší

            const wgsPts = vyskovyProfil.body.map(b => [b[0], b[1]]);
            const canvasPts = this._wgs84NaCanvas(wgsPts, this._fixedWgsCenter);

            // Uložit reference pro dynamický resize při zoomu
            this._vyskyShapes = [];

            canvasPts.forEach((pt, i) => {
                const z = vyskovyProfil.body[i][2];
                const rozdilM = Math.max(0, z - vMin).toFixed(2);
                const t = (z - vMin) / vRange;
                const r = Math.round(255 * t);
                const g = Math.round(255 * (1 - t));

                const circle = new Konva.Circle({
                    x: pt.x, y: pt.y,
                    radius: vizRadius,
                    fill: `rgb(${r},${g},60)`,
                    opacity: 0.7,
                    _vyskaZ: z,
                    _rozdilM: rozdilM,
                    hitFunc: function(context) {
                        // Hit area 2× větší než vizuální radius
                        context.beginPath();
                        context.arc(0, 0, this.radius() * 2, 0, Math.PI * 2, true);
                        context.closePath();
                        context.fillStrokeShape(this);
                    },
                });

                // Tooltip přes globální kk-tooltip
                circle.on('mouseenter', () => {
                    const tip = document.getElementById('kk-tooltip');
                    if (!tip) return;
                    tip.textContent = '+' + rozdilM + ' m (' + z.toFixed(1) + ' m n.m.)';
                    tip.classList.add('visible');
                    // Pozice tipu — nad kurzorem
                    const stage = this.stage;
                    const pos = stage.getPointerPosition();
                    if (pos) {
                        const container = stage.container().getBoundingClientRect();
                        let left = container.left + pos.x - tip.offsetWidth / 2;
                        let top = container.top + pos.y - tip.offsetHeight - 10;
                        if (left < 4) left = 4;
                        if (left + tip.offsetWidth > window.innerWidth - 4) left = window.innerWidth - tip.offsetWidth - 4;
                        if (top < 4) top = container.top + pos.y + 15;
                        tip.style.left = left + 'px';
                        tip.style.top = top + 'px';
                    }
                });
                circle.on('mouseleave', () => {
                    const tip = document.getElementById('kk-tooltip');
                    if (tip) tip.classList.remove('visible');
                });

                this.katastrLayer.add(circle);
                this._vyskyShapes.push(circle);
            });
        }

        this.katastrLayer.batchDraw();
    }

    _katastrCentroid(parcely) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        parcely.forEach(p => {
            (p.polygon_sjtsk || []).forEach(([x, y]) => {
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            });
        });
        return [(minX + maxX) / 2, (minY + maxY) / 2];
    }

    _sjtskNaCanvas(polygonSjtsk, centroid) {
        // S-JTSK: X roste na jih, Y roste na západ (obojí záporné hodnoty)
        // Canvas: X vpravo (= -deltaY), Y dolů (= deltaX)
        // S-JTSK je v metrech → násobíme PX_PER_M pro canvas pixely
        return (polygonSjtsk || []).map(([x, y]) => ({
            x: -(y - centroid[1]) * this.PX_PER_M,
            y: (x - centroid[0]) * this.PX_PER_M,
        }));
    }

    _wgs84Center(parcely) {
        let sumLat = 0, sumLon = 0, count = 0;
        parcely.forEach(p => {
            if (p.centroid_wgs84) {
                sumLat += p.centroid_wgs84.lat;
                sumLon += p.centroid_wgs84.lon;
                count++;
            }
        });
        return count > 0 ? { lat: sumLat / count, lon: sumLon / count } : { lat: 49.8, lon: 15.5 };
    }

    _wgs84NaCanvas(polygonWgs84, center) {
        const cosLat = Math.cos(center.lat * Math.PI / 180);
        return (polygonWgs84 || []).map(([lat, lon]) => ({
            x: (lon - center.lon) * 111320 * cosLat * this.PX_PER_M,
            y: -(lat - center.lat) * 111320 * this.PX_PER_M,
        }));
    }

    // Vzdálenost bodu od úsečky
    _vzdBodHrana(px, py, ax, ay, bx, by) {
        const abx = bx - ax, aby = by - ay, apx = px - ax, apy = py - ay;
        const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby || 1)));
        return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
    }

    // Výpočet pozice labelu sousední parcely (přeneseno z původního konceptu)
    _vypoctiLabelPozici(pts, parcely, wgsCenter) {
        const centroidX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const centroidY = pts.reduce((s, p) => s + p.y, 0) / pts.length;

        // Vlastní hrany
        const vlastniPolygony = parcely.map(p => p.polygon_wgs84 ? this._wgs84NaCanvas(p.polygon_wgs84, wgsCenter) : []);
        const vlastniHrany = [];
        vlastniPolygony.forEach(vp => {
            for (let i = 0; i < vp.length; i++) {
                vlastniHrany.push({ a: vp[i], b: vp[(i + 1) % vp.length] });
            }
        });
        const vAllPts = vlastniHrany.flatMap(h => [h.a, h.b]);
        const vlastniCx = vAllPts.length > 0 ? vAllPts.reduce((s, p) => s + p.x, 0) / vAllPts.length : 0;
        const vlastniCy = vAllPts.length > 0 ? vAllPts.reduce((s, p) => s + p.y, 0) / vAllPts.length : 0;

        // Ray-casting: bod v polygonu
        const _bodVPoly = (px, py, polygon) => {
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[j].x, yj = polygon[j].y;
                if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
            }
            return inside;
        };

        // Obklopená parcela → label na centroid
        const jeObklopena = vlastniPolygony.some(vp => vp.length >= 3 && _bodVPoly(centroidX, centroidY, vp));
        if (jeObklopena) return { x: centroidX, y: centroidY };

        // Kontaktní hrany (chains)
        const blizko = 50;
        const hranyKontakt = [];
        for (let i = 0; i < pts.length; i++) {
            const pa = pts[i], pb = pts[(i + 1) % pts.length];
            let jeKontakt = false;
            for (const vh of vlastniHrany) {
                if (this._vzdBodHrana(pa.x, pa.y, vh.a.x, vh.a.y, vh.b.x, vh.b.y) < blizko &&
                    this._vzdBodHrana(pb.x, pb.y, vh.a.x, vh.a.y, vh.b.x, vh.b.y) < blizko) {
                    jeKontakt = true; break;
                }
            }
            hranyKontakt.push(jeKontakt);
        }

        // Seskupit do řetězců
        const chains = [];
        let aktChain = null;
        for (let i = 0; i < pts.length; i++) {
            if (hranyKontakt[i]) {
                if (!aktChain) aktChain = [];
                if (aktChain.length === 0) aktChain.push(pts[i]);
                aktChain.push(pts[(i + 1) % pts.length]);
            } else {
                if (aktChain) { chains.push(aktChain); aktChain = null; }
            }
        }
        if (aktChain) chains.push(aktChain);

        // Nejdelší řetězec
        let kontaktniBody = [];
        let bestLen = 0;
        for (const ch of chains) {
            let len = 0;
            for (let i = 0; i < ch.length - 1; i++) len += Math.hypot(ch[i + 1].x - ch[i].x, ch[i + 1].y - ch[i].y);
            if (len > bestLen) { bestLen = len; kontaktniBody = ch; }
        }

        // Fallback: jednotlivé body
        if (kontaktniBody.length < 2) {
            kontaktniBody = [];
            for (let i = 0; i < pts.length; i++) {
                for (const vh of vlastniHrany) {
                    if (this._vzdBodHrana(pts[i].x, pts[i].y, vh.a.x, vh.a.y, vh.b.x, vh.b.y) < blizko) {
                        kontaktniBody.push(pts[i]); break;
                    }
                }
            }
        }

        // Střed kontaktní linie + kolmice
        let mx, my, n1x = 0, n1y = 0;
        if (kontaktniBody.length >= 2) {
            const segD = [];
            let celkem = 0;
            for (let i = 0; i < kontaktniBody.length - 1; i++) {
                segD.push(Math.hypot(kontaktniBody[i + 1].x - kontaktniBody[i].x, kontaktniBody[i + 1].y - kontaktniBody[i].y));
                celkem += segD[i];
            }
            let zbyva = celkem / 2;
            mx = kontaktniBody[0].x; my = kontaktniBody[0].y;
            let tx = 1, ty = 0;
            for (let i = 0; i < segD.length; i++) {
                if (zbyva <= segD[i]) {
                    const t = zbyva / (segD[i] || 1);
                    mx = kontaktniBody[i].x + (kontaktniBody[i + 1].x - kontaktniBody[i].x) * t;
                    my = kontaktniBody[i].y + (kontaktniBody[i + 1].y - kontaktniBody[i].y) * t;
                    tx = kontaktniBody[i + 1].x - kontaktniBody[i].x;
                    ty = kontaktniBody[i + 1].y - kontaktniBody[i].y;
                    break;
                }
                zbyva -= segD[i];
            }
            n1x = -ty; n1y = tx;
        } else if (kontaktniBody.length === 1) {
            mx = kontaktniBody[0].x; my = kontaktniBody[0].y;
            const idx = pts.findIndex(p => Math.hypot(p.x - mx, p.y - my) < 2);
            if (idx >= 0) {
                const prev = pts[(idx - 1 + pts.length) % pts.length];
                const next = pts[(idx + 1) % pts.length];
                const d1x = prev.x - mx, d1y = prev.y - my;
                const d2x = next.x - mx, d2y = next.y - my;
                const l1 = Math.hypot(d1x, d1y) || 1, l2 = Math.hypot(d2x, d2y) || 1;
                n1x = d1x / l1 + d2x / l2; n1y = d1y / l1 + d2y / l2;
            } else {
                n1x = centroidX - mx; n1y = centroidY - my;
            }
        } else {
            mx = centroidX; my = centroidY;
            n1x = centroidX - vlastniCx; n1y = centroidY - vlastniCy;
        }

        // Normalizace
        const nlen = Math.hypot(n1x, n1y) || 1;
        n1x /= nlen; n1y /= nlen;

        // Ray-casting: vybrat stranu ven
        const testDist = 10;
        const posA = { x: mx + n1x * testDist, y: my + n1y * testDist };
        const posB = { x: mx - n1x * testDist, y: my - n1y * testDist };
        const aVlastni = vlastniPolygony.some(vp => vp.length >= 3 && _bodVPoly(posA.x, posA.y, vp));
        const bVlastni = vlastniPolygony.some(vp => vp.length >= 3 && _bodVPoly(posB.x, posB.y, vp));
        let nx, ny;
        if (aVlastni && !bVlastni) { nx = -n1x; ny = -n1y; }
        else if (!aVlastni && bVlastni) { nx = n1x; ny = n1y; }
        else { const dl = Math.hypot(centroidX - mx, centroidY - my) || 1; nx = (centroidX - mx) / dl; ny = (centroidY - my) / dl; }

        return { x: mx + nx * 80, y: my + ny * 80 };
    }

    // Map tiles
    loadMapTiles(parcely, typ, apiKey) {
        this.clearMapTiles();
        if (!parcely || parcely.length === 0 || !apiKey) return;

        const typeMap = { zakladni: 'basic', ortofoto: 'aerial', turisticka: 'outdoor' };
        const mapType = typeMap[typ] || 'basic';
        const center = this._fixedWgsCenter || this._wgs84Center(parcely);
        const cosLat = Math.cos(center.lat * Math.PI / 180);
        const tileZoom = 19;
        const mPerTilePx = 156543.03 * cosLat / Math.pow(2, tileZoom);
        const tileSizeM = 256 * mPerTilePx;
        const tileSizeCanvasPx = tileSizeM * this.PX_PER_M;

        // Bbox
        const allWgs = parcely.flatMap(p => p.polygon_wgs84 || []);
        const lats = allWgs.map(c => c[0]);
        const lons = allWgs.map(c => c[1]);
        const marginDeg = 100 / 111320;
        const minLat = Math.min(...lats) - marginDeg;
        const maxLat = Math.max(...lats) + marginDeg;
        const minLon = Math.min(...lons) - marginDeg;
        const maxLon = Math.max(...lons) + marginDeg;

        const lon2tile = (lon) => Math.floor((lon + 180) / 360 * Math.pow(2, tileZoom));
        const lat2tile = (lat) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, tileZoom));

        const txMin = lon2tile(minLon);
        const txMax = lon2tile(maxLon);
        const tyMin = lat2tile(maxLat);
        const tyMax = lat2tile(minLat);

        for (let tx = txMin; tx <= txMax; tx++) {
            for (let ty = tyMin; ty <= tyMax; ty++) {
                const tileLon = (tx / Math.pow(2, tileZoom)) * 360 - 180;
                const tileLatRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * ty / Math.pow(2, tileZoom))));
                const tileLat = tileLatRad * 180 / Math.PI;

                const pxLeft = (tileLon - center.lon) * 111320 * cosLat * this.PX_PER_M;
                const pxTop = -(tileLat - center.lat) * 111320 * this.PX_PER_M;

                const url = `https://api.mapy.cz/v1/maptiles/${mapType}/256/${tileZoom}/${tx}/${ty}?apikey=${apiKey}`;

                Konva.Image.fromURL(url, (img) => {
                    img.setAttrs({
                        x: pxLeft,
                        y: pxTop,
                        width: tileSizeCanvasPx,
                        height: tileSizeCanvasPx,
                        opacity: 0.7,
                        listening: false,
                    });
                    img.setAttr('_mapTile', true);
                    this.katastrLayer.add(img);
                    img.moveToBottom();
                    this.katastrLayer.batchDraw();
                });
            }
        }
    }

    clearMapTiles() {
        this.katastrLayer.find('Image').forEach(img => {
            if (img.getAttr('_mapTile')) img.destroy();
        });
        this.katastrLayer.batchDraw();
    }
}

if (typeof window !== 'undefined') {
    window.KonvaRenderer = KonvaRenderer;
}
