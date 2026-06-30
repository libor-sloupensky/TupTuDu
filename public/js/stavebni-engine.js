/**
 * StavebníEngine — datový model pro 2D CAD editor
 *
 * Čistá logika bez UI/renderingu.
 * Node = sdílený bod, Wall = stěna mezi dvěma body, Opening = otvor ve stěně.
 * Rohy řešeny mitre join (úhel řezu = polovina úhlu mezi stěnami).
 */
// ═══════════════════════════════════════════════════════
// TYPOVÉ DEFINICE OBJEKTŮ
// ═══════════════════════════════════════════════════════
const TYPY_STEN = {
    obvodova: {
        nazev: 'Obvodová stěna',
        kategorie: 'konstrukcni',
        tloušťka: { min: 0.20, max: 0.60, default: 0.30 },
        barva2d: '#4b5563',
        barva2dStroke: '#1f2937',
        barva3d: 0x6b6b6b,
        standardTloustky: [0.20, 0.25, 0.30, 0.36, 0.40, 0.44, 0.50, 0.60],
    },
    nosna: {
        nazev: 'Nosná stěna',
        kategorie: 'konstrukcni',
        tloušťka: { min: 0.20, max: 0.45, default: 0.25 },
        barva2d: '#374151',
        barva2dStroke: '#111827',
        barva3d: 0x5a5a5a,
        standardTloustky: [0.20, 0.25, 0.30, 0.365, 0.40, 0.45],
    },
    pricka: {
        nazev: 'Příčka',
        kategorie: 'konstrukcni',
        tloušťka: { min: 0.05, max: 0.19, default: 0.10 },
        barva2d: '#9ca3af',
        barva2dStroke: '#6b7280',
        barva3d: 0xa0a0a0,
        standardTloustky: [0.05, 0.08, 0.10, 0.115, 0.14, 0.175, 0.19],
    },
    plot: {
        nazev: 'Plot',
        kategorie: 'exterior',
        tloušťka: { min: 0.05, max: 0.40, default: 0.15 },
        vyska: { min: 0.5, max: 2.5, default: 1.8 },
        barva2d: '#92400e',
        barva2dStroke: '#78350f',
        barva3d: 0x8b6914,
        standardTloustky: [0.05, 0.10, 0.15, 0.20, 0.30, 0.40],
    },
    zidka: {
        nazev: 'Zídka',
        kategorie: 'exterior',
        tloušťka: { min: 0.15, max: 0.50, default: 0.25 },
        vyska: { min: 0.3, max: 1.5, default: 0.8 },
        barva2d: '#78716c',
        barva2dStroke: '#57534e',
        barva3d: 0x8a8278,
        standardTloustky: [0.15, 0.20, 0.25, 0.30, 0.40, 0.50],
    },
};

const TYPY_OTVORU = {
    dvere: {
        nazev: 'Dveře',
        sirka: { min: 0.6, max: 2.4, default: 0.9 },
        vyska: { min: 1.8, max: 2.4, default: 2.1 },
        parapet: 0,
        barva2d: '#c2410c',
        barva3d: 0x6b4226,
        // ČSN 74 6401 — standardní stavební otvory (jedno- a dvoukřídlé)
        standardSirky: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.6, 1.8],
    },
    okno: {
        nazev: 'Okno',
        sirka: { min: 0.4, max: 3.0, default: 1.2 },
        vyska: { min: 0.4, max: 2.0, default: 1.2 },
        parapet: 0.9,
        barva2d: '#2563eb',
        barva3d: 0xa3d5f7,
        standardSirky: [0.4, 0.6, 0.8, 0.9, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0],
    },
    garazova_vrata: {
        nazev: 'Garážová vrata',
        sirka: { min: 2.0, max: 6.0, default: 2.7 },
        vyska: { min: 2.0, max: 3.0, default: 2.2 },
        parapet: 0,
        barva2d: '#71717a',
        barva3d: 0x808080,
        standardSirky: [2.0, 2.25, 2.5, 2.7, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0],
    },
    francouzske_okno: {
        nazev: 'Francouzské okno',
        sirka: { min: 0.6, max: 3.0, default: 1.5 },
        vyska: { min: 2.0, max: 2.8, default: 2.2 },
        parapet: 0,
        barva2d: '#0891b2',
        barva3d: 0x7cc8e0,
        standardSirky: [0.6, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0],
    },
    pruchod: {
        nazev: 'Průchod',
        sirka: { min: 0.6, max: 4.0, default: 1.2 },
        vyska: { min: 1.8, max: 3.0, default: 2.1 },
        parapet: 0,
        barva2d: '#d97706',
        barva3d: 0xf5f5f5,
        standardSirky: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0],
    },
};

/**
 * Snap šířky otvoru na nejbližší standardní rozměr (ČSN 74 6401).
 * fineSnap=true → snap na 5 cm (pro atypické), jinak na seznam standardů typu.
 */
function snapOpeningSirka(sirka, typ, fineSnap = false) {
    if (fineSnap) return Math.round(sirka * 20) / 20; // 5 cm
    const cfg = TYPY_OTVORU[typ];
    if (!cfg || !cfg.standardSirky) return Math.round(sirka * 10) / 10; // fallback 10 cm
    let best = cfg.standardSirky[0], bestDiff = Math.abs(sirka - best);
    for (const s of cfg.standardSirky) {
        const d = Math.abs(sirka - s);
        if (d < bestDiff) { best = s; bestDiff = d; }
    }
    return best;
}

/**
 * Efektivní footprint otvoru podél stěny — leftExt + rightExt od pozice.
 * Pouzdro posuvných dveří zabírá stejnou délku jako křídlo na dané straně.
 *   - leftExt: kolik otvor zabírá VLEVO od pozice (směrem k nodeA)
 *   - rightExt: kolik otvor zabírá VPRAVO od pozice (směrem k nodeB)
 * Standardně rightExt=sirka, leftExt=0. Posuvné se zasunou doleva (strana=in) nebo doprava (strana=out),
 * takže na jedné straně musí být volný prostor = sirka navíc.
 */
function getOpeningExtent(opening) {
    if (opening.smer === 'posuvne') {
        const slideToA = (opening.strana || 'in') === 'in';
        if (slideToA) return { leftExt: opening.sirka, rightExt: opening.sirka };
        return { leftExt: 0, rightExt: 2 * opening.sirka };
    }
    return { leftExt: 0, rightExt: opening.sirka };
}

/** Výchozí směr otvírání pro typ otvoru. */
function defaultOpeningSmer(typ) {
    if (typ === 'okno') return null; // okna nemají křídlo
    if (typ === 'pruchod') return 'otvor';
    if (typ === 'garazova_vrata') return 'posuvne';
    return 'pravy'; // dveře, francouzské okno: default pravy hinge
}

/** Migrace starého formátu smer_otvirani "left_in" → { smer, strana }. */
function migrateOpeningSmer(raw) {
    if (!raw) return null;
    if (typeof raw !== 'string') return null;
    if (raw.indexOf('_') < 0) return { smer: raw, strana: 'in' };
    const parts = raw.split('_');
    const smer = parts[0] === 'left' ? 'levy' : (parts[0] === 'right' ? 'pravy' : parts[0]);
    const strana = parts[1] === 'out' ? 'out' : 'in';
    return { smer, strana };
}

/** Snap tloušťky stěny na nejbližší standardní rozměr podle typu. */
function snapWallTloustka(tloustka, typ) {
    const cfg = TYPY_STEN[typ];
    if (!cfg || !cfg.standardTloustky) return Math.round(tloustka * 100) / 100;
    let best = cfg.standardTloustky[0], bestDiff = Math.abs(tloustka - best);
    for (const t of cfg.standardTloustky) {
        const d = Math.abs(tloustka - t);
        if (d < bestDiff) { best = t; bestDiff = d; }
    }
    return best;
}

const TYPY_PLOCH = {
    terasa: {
        nazev: 'Terasa',
        kategorie: 'exterior',
        vyska: 0.15, // výška nad terénem
        barva2d: '#d4a574',
        barva2dStroke: '#b8956a',
        barva3d: 0xc4956a,
        pattern: 'dlazba',
    },
    chodnik: {
        nazev: 'Chodník',
        kategorie: 'exterior',
        vyska: 0.05,
        barva2d: '#d1d5db',
        barva2dStroke: '#9ca3af',
        barva3d: 0xc0c0c0,
        pattern: 'dlazba',
    },
    cesta: {
        nazev: 'Příjezdová cesta',
        kategorie: 'exterior',
        vyska: 0.05,
        barva2d: '#a8a29e',
        barva2dStroke: '#78716c',
        barva3d: 0x909090,
        pattern: 'asfalt',
    },
    travnik: {
        nazev: 'Trávník',
        kategorie: 'exterior',
        vyska: 0,
        barva2d: '#86efac',
        barva2dStroke: '#4ade80',
        barva3d: 0x5cb85c,
        pattern: 'trava',
    },
    zahon: {
        nazev: 'Záhon',
        kategorie: 'exterior',
        vyska: 0.1,
        barva2d: '#a3734c',
        barva2dStroke: '#8b6340',
        barva3d: 0x8b6340,
        pattern: 'zemina',
    },
    parkoviste: {
        nazev: 'Parkoviště',
        kategorie: 'exterior',
        vyska: 0.05,
        barva2d: '#94a3b8',
        barva2dStroke: '#64748b',
        barva3d: 0x808898,
        pattern: 'asfalt',
    },
    bazén: {
        nazev: 'Bazén',
        kategorie: 'exterior',
        vyska: -1.5, // zapuštěný
        barva2d: '#38bdf8',
        barva2dStroke: '#0ea5e9',
        barva3d: 0x4db8e8,
        pattern: null,
    },
    piskoviste: {
        nazev: 'Pískoviště',
        kategorie: 'exterior',
        vyska: 0,
        barva2d: '#fde68a',
        barva2dStroke: '#fbbf24',
        barva3d: 0xe8d080,
        pattern: null,
    },
};

const TYPY_STRECHY = {
    sedlova: {
        nazev: 'Sedlová střecha',
        sklon: { min: 15, max: 55, default: 35 },
        presah: { min: 0.2, max: 1.5, default: 0.5 },
        barva3d: 0xb84c2c,
    },
    pultova: {
        nazev: 'Pultová střecha',
        sklon: { min: 5, max: 25, default: 10 },
        presah: { min: 0.2, max: 1.0, default: 0.4 },
        barva3d: 0xa04828,
    },
    plocha: {
        nazev: 'Plochá střecha',
        sklon: { min: 1, max: 5, default: 2 },
        presah: { min: 0, max: 0.5, default: 0.1 },
        barva3d: 0x808080,
    },
    valbova: {
        nazev: 'Valbová střecha',
        sklon: { min: 20, max: 45, default: 30 },
        presah: { min: 0.3, max: 1.5, default: 0.5 },
        barva3d: 0xc05030,
    },
    mansardova: {
        nazev: 'Mansardová střecha',
        sklon: { min: 30, max: 70, default: 55 },
        presah: { min: 0.3, max: 1.0, default: 0.5 },
        barva3d: 0x985030,
    },
};

const TYPY_PRISLUSENSTVI = {
    pergola: {
        nazev: 'Pergola',
        kategorie: 'exterior',
        vyska: { min: 2.2, max: 3.5, default: 2.5 },
        barva2d: '#a16207',
        barva2dStroke: '#854d0e',
        barva3d: 0x8b6914,
    },
    pristresek: {
        nazev: 'Přístřešek',
        kategorie: 'exterior',
        vyska: { min: 2.2, max: 4.0, default: 2.5 },
        barva2d: '#737373',
        barva2dStroke: '#525252',
        barva3d: 0x707070,
    },
    komin: {
        nazev: 'Komín',
        kategorie: 'konstrukcni',
        rozmer: { min: 0.3, max: 0.6, default: 0.4 },
        barva2d: '#dc2626',
        barva2dStroke: '#b91c1c',
        barva3d: 0xc03030,
    },
    sloup: {
        nazev: 'Sloup',
        kategorie: 'konstrukcni',
        rozmer: { min: 0.2, max: 0.5, default: 0.3 },
        barva2d: '#374151',
        barva2dStroke: '#1f2937',
        barva3d: 0x606060,
    },
    schody: {
        nazev: 'Schody',
        kategorie: 'konstrukcni',
        sirka: { min: 0.8, max: 2.0, default: 1.0 },
        barva2d: '#6b7280',
        barva2dStroke: '#4b5563',
        barva3d: 0x909090,
    },
    branka: {
        nazev: 'Branka',
        kategorie: 'exterior',
        sirka: { min: 0.8, max: 1.5, default: 1.0 },
        vyska: { min: 1.0, max: 2.2, default: 1.5 },
        barva2d: '#b45309',
        barva2dStroke: '#92400e',
        barva3d: 0xa06020,
    },
    brana: {
        nazev: 'Brána',
        kategorie: 'exterior',
        sirka: { min: 2.5, max: 6.0, default: 3.5 },
        vyska: { min: 1.5, max: 2.5, default: 1.8 },
        barva2d: '#78350f',
        barva2dStroke: '#451a03',
        barva3d: 0x704020,
    },
};

/**
 * Určí typ stěny podle tloušťky (explicitní typ má přednost).
 * Bez informace o poloze na obvodu defaultujeme na 'nosna' (vnitřní nosnou),
 * ne 'obvodova' — obvodová = poloha + funkce (na obvodu) a vyžaduje geometrickou
 * detekci, kterou zvládne jen parser půdorysu. AI/ruční kresba typ upraví ručně.
 */
function urcTypSteny(tloustka, explicitTyp = null) {
    if (explicitTyp && TYPY_STEN[explicitTyp]) return explicitTyp;
    return tloustka >= 0.20 ? 'nosna' : 'pricka';
}

class StavebniEngine {
    constructor(options = {}) {
        this.nodes = new Map();   // id → {id, x, y}
        this.walls = new Map();   // id → {id, nodeA, nodeB, tloustka, typ}
        this.openings = new Map(); // id → {id, wallId, pozice, sirka, typ, nazev}
        this.prostory = [];        // [{id, typ, podtyp, polygon:[[x,y]..m], plocha_m2, nazev, venkovni}]
        this.vybaveni = [];        // [{id, typ, podtyp, kategorie, polygon, stred:[x,y px], sirka, hloubka, uhel, vyska}] — souřadnice v canvas px
        this.nextId = 1;
        this.MAGNET_DIST = options.magnetDist || 16;
        this.PX_PER_M = options.pxPerM || 80;
        this.SNAP_STEP = options.snapStep || 8;
        this.undoStack = [];
        this.maxUndo = 50;
    }

    // ─── ID generátor ──────────────────────────────────
    _id(prefix = 'N') {
        return prefix + (this.nextId++);
    }

    // ─── UNDO ──────────────────────────────────────────
    pushUndo() {
        this.undoStack.push(this.toJSON());
        if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        const state = this.undoStack.pop();
        this.fromJSON(state);
        return true;
    }

    // ─── SNAP ──────────────────────────────────────────
    snapToGrid(val) {
        return Math.round(val / this.SNAP_STEP) * this.SNAP_STEP;
    }

    snapPoint(x, y) {
        let sx = this.snapToGrid(x);
        let sy = this.snapToGrid(y);

        // Magnet k existujícím nodům
        let minDist = this.MAGNET_DIST;
        let magnetNode = null;

        for (const node of this.nodes.values()) {
            const dist = Math.hypot(sx - node.x, sy - node.y);
            if (dist < minDist) {
                minDist = dist;
                magnetNode = node;
            }
        }

        if (magnetNode) {
            return { x: magnetNode.x, y: magnetNode.y, magnetNodeId: magnetNode.id };
        }
        return { x: sx, y: sy, magnetNodeId: null };
    }

    // ─── NODES ─────────────────────────────────────────
    addNode(x, y) {
        // Pokud existuje blízký node, vrať ho
        for (const node of this.nodes.values()) {
            if (Math.hypot(x - node.x, y - node.y) < this.MAGNET_DIST) {
                return node;
            }
        }
        const id = this._id('N');
        const node = { id, x, y };
        this.nodes.set(id, node);
        return node;
    }

    moveNode(nodeId, x, y) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        node.x = this.snapToGrid(x);
        node.y = this.snapToGrid(y);
    }

    getNodeWalls(nodeId) {
        const walls = [];
        for (const wall of this.walls.values()) {
            if (wall.nodeA === nodeId || wall.nodeB === nodeId) {
                walls.push(wall);
            }
        }
        return walls;
    }

    /**
     * Najít všechny stěny (T-children) co mají constraint na danou stěnu.
     * Používá se při pohybu hostitele — propaguje pohyb na děti.
     */
    getTChildren(hostWallId) {
        const children = [];
        for (const w of this.walls.values()) {
            if (w.odConstraint && w.odConstraint.host === hostWallId) {
                children.push({ wall: w, end: 'a', t: w.odConstraint.t });
            }
            if (w.doConstraint && w.doConstraint.host === hostWallId) {
                children.push({ wall: w, end: 'b', t: w.doConstraint.t });
            }
        }
        return children;
    }

    /**
     * Před pohybem hostitelské stěny synchronizuj t parametry T-children
     * tak, aby odpovídaly jejich SKUTEČNÉ pozici. Tím propagateTChildren
     * po pohybu hostitele jen přesune děti o stejnou translaci, ne na
     * stored (potenciálně zastaralé) t.
     */
    syncTChildrenT(hostWallId) {
        const host = this.walls.get(hostWallId);
        if (!host) return;
        const ha = this.nodes.get(host.nodeA);
        const hb = this.nodes.get(host.nodeB);
        if (!ha || !hb) return;
        const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
        const L2 = hdx * hdx + hdy * hdy;
        if (L2 === 0) return;
        for (const w of this.walls.values()) {
            if (w.odConstraint && w.odConstraint.host === hostWallId) {
                const node = this.nodes.get(w.nodeA);
                if (node) {
                    const t = ((node.x - ha.x) * hdx + (node.y - ha.y) * hdy) / L2;
                    w.odConstraint.t = Math.max(0.02, Math.min(0.98, t));
                }
            }
            if (w.doConstraint && w.doConstraint.host === hostWallId) {
                const node = this.nodes.get(w.nodeB);
                if (node) {
                    const t = ((node.x - ha.x) * hdx + (node.y - ha.y) * hdy) / L2;
                    w.doConstraint.t = Math.max(0.02, Math.min(0.98, t));
                }
            }
        }
    }

    /**
     * Po pohybu hostitelské stěny posuň T-children.
     * Pro KAŽDÉ dítě:
     *  - napojený endpoint → přepočítá se na nové pozici hostitele (t zachován)
     *  - druhý endpoint:
     *    - má constraint na JINÉHO hostitele → zůstane (ten hostitel se nehnul)
     *      → dítě se prodlouží/zkrátí
     *    - je volný → translatuje se o delta → dítě zachová tvar
     */
    propagateTChildren(hostWallId, dx, dy) {
        const host = this.walls.get(hostWallId);
        if (!host) return;
        const children = this.getTChildren(hostWallId);
        const moved = new Set();
        // Pokud známe delta pohybu hostitele, translatujeme T-children o stejnou
        // hodnotu (zachovává perpendikulární offset od osy hostitele).
        // Bez delty (legacy): node položíme na host.axis v t-pozici (ztratí perp offset).
        const haveDelta = (typeof dx === 'number' && typeof dy === 'number');
        const ha = this.nodes.get(host.nodeA);
        const hb = this.nodes.get(host.nodeB);
        if (!ha || !hb) return;
        const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
        for (const ch of children) {
            const attachedNodeId = ch.end === 'a' ? ch.wall.nodeA : ch.wall.nodeB;
            const attachedNode = this.nodes.get(attachedNodeId);
            if (!attachedNode) continue;
            let deltaX, deltaY;
            if (haveDelta) {
                deltaX = dx;
                deltaY = dy;
            } else {
                const newX = ha.x + ch.t * hdx;
                const newY = ha.y + ch.t * hdy;
                deltaX = newX - attachedNode.x;
                deltaY = newY - attachedNode.y;
            }
            if (!moved.has(attachedNodeId)) {
                attachedNode.x += deltaX;
                attachedNode.y += deltaY;
                moved.add(attachedNodeId);
            }
            // Druhý endpoint dítěte
            const otherNodeId = ch.end === 'a' ? ch.wall.nodeB : ch.wall.nodeA;
            const otherNode = this.nodes.get(otherNodeId);
            if (!otherNode || moved.has(otherNodeId)) continue;
            const otherConstraint = ch.end === 'a' ? ch.wall.doConstraint : ch.wall.odConstraint;
            if (otherConstraint && otherConstraint.host !== hostWallId) {
                // Jiný hostitel — zůstane (ten hostitel se nehnul) → dítě se prodlouží
                continue;
            }
            // Sdílený node s jinými stěnami (L-corner, X-junction) → zůstane,
            // jinak bychom táhli i další stěny. Dítě se prodlouží/rotuje.
            const otherWallsAtNode = this.getNodeWalls(otherNodeId);
            if (otherWallsAtNode.length > 1) {
                continue;
            }
            // Opravdu volný konec (jen jedna stěna) — translatovat o delta → rigidní
            otherNode.x += deltaX;
            otherNode.y += deltaY;
            moved.add(otherNodeId);
        }
    }

    /**
     * Najít blízkou stěnu pro snap kandidát.
     * Vrátí { wall, t, point } pro nejbližší T-junction kandidát v dosahu,
     * nebo null. Vyloučí stěny obsahující excludeNodeId.
     * Tolerance v px (typicky 20).
     */
    findSnapCandidate(x, y, tolerancePx, excludeNodeId = null) {
        let best = null;
        let bestDist = tolerancePx;
        for (const wall of this.walls.values()) {
            if (excludeNodeId && (wall.nodeA === excludeNodeId || wall.nodeB === excludeNodeId)) continue;
            const a = this.nodes.get(wall.nodeA);
            const b = this.nodes.get(wall.nodeB);
            if (!a || !b) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const L2 = dx * dx + dy * dy;
            if (L2 === 0) continue;
            const t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
            if (t < 0.02 || t > 0.98) continue;
            const px = a.x + t * dx, py = a.y + t * dy;
            const d = Math.hypot(x - px, y - py);
            if (d < bestDist) {
                bestDist = d;
                best = { wall, t, point: { x: px, y: py }, distance: d };
            }
        }
        return best;
    }

    /**
     * Detach: odpojí stěnu od nodu — pokud má constraint, smaže ho;
     * pokud je node sdílený s jinou stěnou, vytvoří nový node.
     * Po detachi aplikuje malý optický offset (10 cm) aby uživatel viděl, že se odpojilo:
     *  - bez T-children: translate celé stěny kolmo od host (bounce)
     *  - s T-children: jen detached endpoint se posune PO OSE směrem k druhému konci
     *    (zkrátit) — zachová vazby T-children na hostiteli s minimálním skokem.
     */
    detachWallFromNode(wallId, nodeId) {
        const wall = this.walls.get(wallId);
        if (!wall) return false;
        const node = this.nodes.get(nodeId);
        if (!node) return false;
        const isEndA = wall.nodeA === nodeId;
        if (!isEndA && wall.nodeB !== nodeId) return false;

        const constraint = isEndA ? wall.odConstraint : wall.doConstraint;
        const hasTChildren = this.getTChildren(wallId).length > 0;
        const OFFSET_PX = 0.10 * this.PX_PER_M; // 10 cm

        // Vypočítat směr offsetu PŘED aplikací detachu (potřebujeme původní host info)
        let perpX = 0, perpY = 0; // kolmo od host (pro bounce mimo host)
        if (constraint) {
            const host = this.walls.get(constraint.host);
            if (host) {
                const ha = this.nodes.get(host.nodeA);
                const hb = this.nodes.get(host.nodeB);
                if (ha && hb) {
                    const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
                    const hL = Math.hypot(hdx, hdy);
                    if (hL > 0) {
                        // Normal na host osu
                        const nx = -hdy / hL, ny = hdx / hL;
                        // Strana = kde leží druhý endpoint stěny
                        const otherId = isEndA ? wall.nodeB : wall.nodeA;
                        const other = this.nodes.get(otherId);
                        if (other) {
                            const side = (other.x - ha.x) * nx + (other.y - ha.y) * ny;
                            const sign = side >= 0 ? 1 : -1;
                            perpX = nx * sign * OFFSET_PX;
                            perpY = ny * sign * OFFSET_PX;
                        }
                    }
                }
            }
        }

        // Aplikovat detach
        if (isEndA && wall.odConstraint) {
            wall.odConstraint = null;
        } else if (!isEndA && wall.doConstraint) {
            wall.doConstraint = null;
        } else {
            // Sdílený corner node
            const wallsAtNode = this.getNodeWalls(nodeId);
            if (wallsAtNode.length <= 1) return false;
            const newNode = { id: this._id('N'), x: node.x, y: node.y };
            this.nodes.set(newNode.id, newNode);
            if (isEndA) wall.nodeA = newNode.id;
            else wall.nodeB = newNode.id;
        }

        // Aplikovat optický offset
        if (hasTChildren) {
            // Zkrácení — detached endpoint se posune PO OSE směrem k druhému konci
            const aNode = this.nodes.get(wall.nodeA);
            const bNode = this.nodes.get(wall.nodeB);
            if (aNode && bNode) {
                const wdx = bNode.x - aNode.x, wdy = bNode.y - aNode.y;
                const wL = Math.hypot(wdx, wdy);
                if (wL > OFFSET_PX + 10) { // stěna dost dlouhá
                    const ux = wdx / wL, uy = wdy / wL;
                    const detachedNode = isEndA ? aNode : bNode;
                    // Směr od detached k druhému konci
                    const sign = isEndA ? 1 : -1;
                    detachedNode.x += ux * sign * OFFSET_PX;
                    detachedNode.y += uy * sign * OFFSET_PX;
                }
            }
        } else if (perpX !== 0 || perpY !== 0) {
            // Bounce — translate celé stěny kolmo od host
            const aNode = this.nodes.get(wall.nodeA);
            const bNode = this.nodes.get(wall.nodeB);
            if (aNode) { aNode.x += perpX; aNode.y += perpY; }
            if (bNode) { bNode.x += perpX; bNode.y += perpY; }
        }

        return true;
    }

    /**
     * Vrátí omezení pohybu pro daný node (pro editor).
     * Returns:
     *   null                                        — volný 2D pohyb
     *   { type: 'frozen' }                          — nelze hýbat
     *   { type: 'slide', host, line: {a, b} }       — 1D klouzání po linii
     */
    getNodeMovementConstraint(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { type: 'frozen' };
        const walls = this.getNodeWalls(nodeId);
        if (walls.length === 0) return null;

        // Najít constraint(y) na tomto nodu
        const constraints = [];
        for (const w of walls) {
            const isEndA = w.nodeA === nodeId;
            const c = isEndA ? w.odConstraint : w.doConstraint;
            if (c) constraints.push({ wall: w, end: isEndA ? 'a' : 'b', constraint: c });
        }

        // S constraint(y) — sliding po hostiteli
        if (constraints.length > 0) {
            // Pokud víc constraints, zkusit jestli jsou kompatibilní (stejný host)
            const firstHost = constraints[0].constraint.host;
            const allSameHost = constraints.every(c => c.constraint.host === firstHost);
            if (!allSameHost) return { type: 'frozen' };
            const host = this.walls.get(firstHost);
            if (!host) return null;
            const ha = this.nodes.get(host.nodeA);
            const hb = this.nodes.get(host.nodeB);
            if (!ha || !hb) return null;
            return {
                type: 'slide',
                host: firstHost,
                line: { a: { x: ha.x, y: ha.y }, b: { x: hb.x, y: hb.y } },
            };
        }

        // Bez constraint: uzel sdílený 2+ stěnami (roh, T/X napojení) = FROZEN.
        // User rozhodl — rohy se nehýbou přímo za bod, hýbou se posunem stěny.
        if (walls.length >= 2) return { type: 'frozen' };
        // 1 stěna = volný konec → 2D pohyb
        return null;
    }

    /**
     * Klasifikuje typ napojení v nodu pro editor.
     * Vrátí: 'free' | 'L' | 'T' | 'X' | 'frozen'
     * - free: 1 stěna (volný konec)
     * - L: 2 stěny pod úhlem (mitered roh)
     * - T: 3 stěny kde 2 jsou collinear (split host + perpendicular)
     * - X: 4 stěny tvořící 2 collinear páry (cross)
     * - frozen: 3+ stěn co netvoří T ani X (anomálie, nelze hýbat)
     */
    getNodeJunctionType(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return 'free';
        const walls = this.getNodeWalls(nodeId);
        // Zkontrolovat zda má některá stěna constraint na tomto nodu
        // (T-junction v novém modelu = 1 stěna + constraint na hostiteli)
        const hasConstraint = walls.some(w => {
            const isEndA = w.nodeA === nodeId;
            return isEndA ? !!w.odConstraint : !!w.doConstraint;
        });
        if (walls.length <= 1) return hasConstraint ? 'T' : 'free';
        if (walls.length === 2) return hasConstraint ? 'T' : 'L';

        // Spočítat úhly stěn z nodu (směrem k druhému konci)
        const angles = walls.map(w => {
            const otherId = w.nodeA === nodeId ? w.nodeB : w.nodeA;
            const other = this.nodes.get(otherId);
            if (!other) return null;
            return Math.atan2(other.y - node.y, other.x - node.x);
        }).filter(a => a !== null);

        // Najít páry collinear stěn (úhel ≈ 180°, tolerance 5°)
        const COLLINEAR_TOL = 0.087;
        const isCollinearPair = (a, b) => {
            const diff = Math.abs(a - b);
            const norm = Math.min(diff, 2 * Math.PI - diff);
            return Math.abs(norm - Math.PI) < COLLINEAR_TOL;
        };

        let collinearPairs = 0;
        const used = new Set();
        for (let i = 0; i < angles.length; i++) {
            if (used.has(i)) continue;
            for (let j = i + 1; j < angles.length; j++) {
                if (used.has(j)) continue;
                if (isCollinearPair(angles[i], angles[j])) {
                    collinearPairs++;
                    used.add(i);
                    used.add(j);
                    break;
                }
            }
        }

        if (walls.length === 3 && collinearPairs === 1) return 'T';
        if (walls.length === 4 && collinearPairs === 2) return 'X';
        // 3+ stěn bez pěkné klasifikace — dovolit volný 2D pohyb (ne frozen).
        // Frozen používáme jen pro opravdu anomální případy (5+ stěn ap.).
        if (walls.length >= 3 && walls.length <= 4) return 'T';
        return 'frozen';
    }

    /** Sloučí dva nody — přepojí všechny stěny z nodeB na nodeA, smaže nodeB */
    mergeNodes(nodeAId, nodeBId) {
        if (nodeAId === nodeBId) return;
        for (const wall of this.walls.values()) {
            if (wall.nodeA === nodeBId) wall.nodeA = nodeAId;
            if (wall.nodeB === nodeBId) wall.nodeB = nodeAId;
        }
        // Smazat duplicitní stěny (nodeA === nodeB)
        for (const [id, wall] of this.walls.entries()) {
            if (wall.nodeA === wall.nodeB) this.walls.delete(id);
        }
        this.nodes.delete(nodeBId);
    }

    // ─── WALLS ─────────────────────────────────────────
    addWall(x1, y1, x2, y2, tloustka = 0.3) {
        const nodeA = this.addNode(x1, y1);
        const nodeB = this.addNode(x2, y2);
        if (nodeA.id === nodeB.id) return null; // nulová délka

        const delka = Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y);
        if (delka < this.SNAP_STEP) return null;

        const id = this._id('S');
        const typ = urcTypSteny(tloustka);
        const wall = { id, nodeA: nodeA.id, nodeB: nodeB.id, tloustka, typ };
        this.walls.set(id, wall);
        return wall;
    }

    /**
     * Rozdělí stěnu v bodě t na dvě. splitNodeId bude sdílený uzel mezi
     * oběma polovinami. T-children se rozdělí podle své t pozice a
     * přepočtou se na nové t v odpovídající polovině. Otvory se
     * ponechají v té polovině, kde jejich pozice stále fit.
     * Vrací id druhé poloviny (první polovina ponechána pod původním id).
     */
    splitWall(wallId, tSplit, splitNodeId) {
        const wall = this.walls.get(wallId);
        if (!wall) return null;
        const nodeA = this.nodes.get(wall.nodeA);
        const nodeB = this.nodes.get(wall.nodeB);
        const splitNode = this.nodes.get(splitNodeId);
        if (!nodeA || !nodeB || !splitNode) return null;
        if (tSplit <= 0.01 || tSplit >= 0.99) return null;

        const origNodeB = wall.nodeB;
        // Přenést constraints původní stěny na správné poloviny:
        // odConstraint (nodeA) zůstává na první polovině (wall zachovává nodeA)
        // doConstraint (původní nodeB) přejde na druhou polovinu (W16.nodeB = origNodeB)
        const origDoConstraint = wall.doConstraint;
        wall.doConstraint = null;  // první polovina má nový nodeB (splitNode), constraint neaplikuje
        // První polovina: zachovává wall.id, nodeA, ale nodeB se změní na splitNode
        wall.nodeB = splitNodeId;
        // Druhá polovina: nový wall s splitNode → původní nodeB
        const newId = this._id('W');
        const newWall = {
            id: newId,
            nodeA: splitNodeId,
            nodeB: origNodeB,
            tloustka: wall.tloustka,
            typ: wall.typ,
            odConstraint: null,  // nodeA je nový (splitNode)
            doConstraint: origDoConstraint,  // nodeB je původní → zachová původní constraint
        };
        this.walls.set(newId, newWall);

        // Přepočítat T-children constraints
        for (const w of this.walls.values()) {
            if (w.odConstraint && w.odConstraint.host === wallId) {
                const origT = w.odConstraint.t;
                if (origT < tSplit) {
                    w.odConstraint.t = origT / tSplit;
                } else {
                    w.odConstraint.host = newId;
                    w.odConstraint.t = (origT - tSplit) / (1 - tSplit);
                }
            }
            if (w.doConstraint && w.doConstraint.host === wallId) {
                const origT = w.doConstraint.t;
                if (origT < tSplit) {
                    w.doConstraint.t = origT / tSplit;
                } else {
                    w.doConstraint.host = newId;
                    w.doConstraint.t = (origT - tSplit) / (1 - tSplit);
                }
            }
        }

        // Přepočítat otvory podle pozice (pozice je v metrech od nodeA)
        const lenA = Math.hypot(nodeA.x - splitNode.x, nodeA.y - splitNode.y) / this.PX_PER_M;
        for (const op of this.openings.values()) {
            if (op.wallId !== wallId) continue;
            if (op.pozice + op.sirka <= lenA + 0.001) {
                // zůstává na první polovině
            } else if (op.pozice >= lenA - 0.001) {
                // celý se přesune na druhou polovinu
                op.wallId = newId;
                op.pozice = op.pozice - lenA;
            } else {
                // Otvor překlenuje split bod — ponechat na té polovině kde začíná
                op.wallId = newId;
                op.pozice = 0;
            }
        }

        return newId;
    }

    moveWall(wallId, dx, dy) {
        const wall = this.walls.get(wallId);
        if (!wall) return;

        const nodeA = this.nodes.get(wall.nodeA);
        const nodeB = this.nodes.get(wall.nodeB);
        if (!nodeA || !nodeB) return;

        // Snap pouze na nodeA; nodeB posunout o STEJNÝ delta jako nodeA.
        // Nezávislý snap obou uzlů by jinak stěnu mírně natáčel kvůli
        // rozdílným zaokrouhlovacím zbytkům — ztrácel by rigidní translaci.
        const newAx = this.snapToGrid(nodeA.x + dx);
        const newAy = this.snapToGrid(nodeA.y + dy);
        const realDx = newAx - nodeA.x;
        const realDy = newAy - nodeA.y;
        nodeA.x = newAx;
        nodeA.y = newAy;
        nodeB.x += realDx;
        nodeB.y += realDy;
    }

    removeWall(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return;

        // Smazat otvory na stěně
        for (const [id, opening] of this.openings.entries()) {
            if (opening.wallId === wallId) this.openings.delete(id);
        }

        this.walls.delete(wallId);

        // Smazat osiřelé nody (nepřipojené k žádné stěně)
        this._cleanOrphanNodes();
    }

    removeNode(nodeId) {
        // Smazat všechny stěny připojené k nodu
        const wallsToRemove = this.getNodeWalls(nodeId);
        wallsToRemove.forEach(w => this.removeWall(w.id));
        this.nodes.delete(nodeId);
    }

    removeVybaveni(id) {
        if (!Array.isArray(this.vybaveni)) return;
        this.vybaveni = this.vybaveni.filter(v => v.id !== id);
    }

    removeProstor(id) {
        if (!Array.isArray(this.prostory)) return;
        this.prostory = this.prostory.filter(p => p.id !== id);
    }

    /**
     * Smaže prostory, jejichž vrcholy ztratily reference (smazané stěny / uzly).
     * Pokud měl prostor původně reference (refNodeId nebo wallA+wallB) a všechny
     * platné už zmizely, smaž ho — bez stěn nemá smysl. Open-plan místnosti
     * (purely-fixed vrcholy) se neruší — ty existují legálně bez stěn.
     */
    cleanupOrphanProstory() {
        if (!Array.isArray(this.prostory)) return;
        this.prostory = this.prostory.filter(p => {
            const verts = p.vertices || [];
            const hadRefs = verts.some(v => v.refNodeId || (v.wallA && v.wallB));
            if (!hadRefs) return true; // čistě open-plan, ponech
            const validRefs = verts.filter(v =>
                (v.refNodeId && this.nodes.has(v.refNodeId)) ||
                (v.wallA && v.wallB && this.walls.has(v.wallA) && this.walls.has(v.wallB))
            ).length;
            return validRefs >= 3;
        });
    }

    _cleanOrphanNodes() {
        const usedNodes = new Set();
        for (const wall of this.walls.values()) {
            usedNodes.add(wall.nodeA);
            usedNodes.add(wall.nodeB);
        }
        for (const nodeId of this.nodes.keys()) {
            if (!usedNodes.has(nodeId)) {
                this.nodes.delete(nodeId);
            }
        }
    }

    /**
     * Automaticky rozdělí stěny kde se node jiné stěny dotýká hrany.
     * Řeší T-napojení příček na obvodové stěny.
     */
    _autoSplitWalls() {
        const TOLERANCE = 2; // px — tolerance pro "bod leží na hraně"
        let changed = true;
        let iterations = 0;

        while (changed && iterations < 10) {
            changed = false;
            iterations++;

            for (const node of this.nodes.values()) {
                for (const wall of [...this.walls.values()]) {
                    // Přeskočit stěny které tento node vlastní
                    if (wall.nodeA === node.id || wall.nodeB === node.id) continue;

                    const nA = this.nodes.get(wall.nodeA);
                    const nB = this.nodes.get(wall.nodeB);
                    if (!nA || !nB) continue;

                    // Vzdálenost bodu od úsečky stěny
                    const dx = nB.x - nA.x, dy = nB.y - nA.y;
                    const len2 = dx * dx + dy * dy;
                    if (len2 === 0) continue;

                    const t = ((node.x - nA.x) * dx + (node.y - nA.y) * dy) / len2;
                    if (t <= 0.01 || t >= 0.99) continue; // příliš blízko konců

                    const cx = nA.x + t * dx, cy = nA.y + t * dy;
                    const dist = Math.hypot(node.x - cx, node.y - cy);

                    if (dist > TOLERANCE) continue;

                    // Bod leží na hraně stěny → rozdělit stěnu
                    // Přesunout node přesně na hranu
                    node.x = Math.round(cx);
                    node.y = Math.round(cy);

                    // Vytvořit druhou polovinu stěny
                    const newId = this._id('S');
                    const newWall = {
                        id: newId,
                        nodeA: node.id,
                        nodeB: wall.nodeB,
                        tloustka: wall.tloustka,
                        typ: wall.typ,
                    };
                    this.walls.set(newId, newWall);

                    // Zkrátit původní stěnu
                    wall.nodeB = node.id;

                    // Přesunout otvory které jsou za split bodem na novou stěnu
                    for (const opening of this.openings.values()) {
                        if (opening.wallId === wall.id && opening.pozice > t * Math.sqrt(len2) / this.PX_PER_M) {
                            opening.wallId = newId;
                            opening.pozice -= t * Math.sqrt(len2) / this.PX_PER_M;
                        }
                    }

                    changed = true;
                    break; // restart inner loop
                }
                if (changed) break; // restart outer loop
            }
        }
    }

    // ─── WALL GEOMETRY (mitre join) ────────────────────
    /**
     * Vrátí polygon stěny jako pole bodů [{x,y}, ...] (uzavřený).
     * Na koncích kde se potkávají jiné stěny, ořízne úhel (mitre join).
     */
    getWallPolygon(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return [];

        const nA = this.nodes.get(wall.nodeA);
        const nB = this.nodes.get(wall.nodeB);
        if (!nA || !nB) return [];

        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return [];

        const tl = wall.tloustka * this.PX_PER_M;
        const half = tl / 2;

        // Směrový vektor stěny (A→B) a normála
        const dirX = dx / len, dirY = dy / len;
        const nrmX = -dirY, nrmY = dirX;  // normála (vlevo od směru A→B)

        // Základní 4 body (obdélník)
        let a1 = { x: nA.x + nrmX * half, y: nA.y + nrmY * half };
        let a2 = { x: nA.x - nrmX * half, y: nA.y - nrmY * half };
        let b1 = { x: nB.x + nrmX * half, y: nB.y + nrmY * half };
        let b2 = { x: nB.x - nrmX * half, y: nB.y - nrmY * half };

        // Mitre join — pro každý konec najdi průsečíky s sousedními stěnami
        // Funguje pro L-spoj (1 soused), T-spoj (2 sousedi) i křížový (3+ sousedi)
        const doMitre = (nodeId, isEndB) => {
            const neighbors = this.getNodeWalls(nodeId).filter(w => w.id !== wallId);
            if (neighbors.length === 0 || len <= tl) return;

            // Úhel aktuální stěny OD sdíleného bodu
            const node = this.nodes.get(nodeId);
            const otherNode = isEndB ? nA : nB; // druhý konec aktuální stěny
            const myAngle = Math.atan2(otherNode.y - node.y, otherNode.x - node.x);

            // Úhly sousedních stěn OD sdíleného bodu, seřazené
            const neighborAngles = neighbors.map(w => {
                const end = this.nodes.get(w.nodeA === nodeId ? w.nodeB : w.nodeA);
                if (!end) return null;
                return {
                    wall: w,
                    angle: Math.atan2(end.y - node.y, end.x - node.x),
                    edges: this._getOtherPolygonEdges(w, nodeId),
                };
            }).filter(n => n && n.edges);

            if (neighborAngles.length === 0) return;

            // Přidat aktuální stěnu do kruhu úhlů pro nalezení sousedů po stranách
            const allAngles = [...neighborAngles.map(n => n.angle), myAngle];

            // Normalizovat úhly a najít levého a pravého souseda aktuální stěny
            const normAngle = (a) => { let v = a; while (v < -Math.PI) v += 2 * Math.PI; while (v > Math.PI) v -= 2 * Math.PI; return v; };

            // Relativní úhly sousedů vůči aktuální stěně
            const withRelAngleAll = neighborAngles.map(n => ({
                ...n,
                relAngle: normAngle(n.angle - myAngle),
            }));

            // Filtrovat KOLINEÁRNÍ sousedy (relAngle blízko ±π = pokračování stěny).
            // Vznikají při splitu stěny v T-junction — sub-stěny jsou collinear
            // a "sousedi" v miteringu by produkovaly diagonální cap → tapering.
            // Treat collinear neighbor as continuation, ne jako junction soused.
            const COLLINEAR_TOL = 0.087; // ~5°
            const withRelAngle = withRelAngleAll.filter(n =>
                Math.abs(Math.abs(n.relAngle) - Math.PI) > COLLINEAR_TOL
            );

            // Levý soused = nejmenší kladný relativní úhel (po směru hodin)
            // Pravý soused = největší záporný relativní úhel (proti směru hodin)
            const leftNeighbors = withRelAngle.filter(n => n.relAngle > 0).sort((a, b) => a.relAngle - b.relAngle);
            const rightNeighbors = withRelAngle.filter(n => n.relAngle < 0).sort((a, b) => b.relAngle - a.relAngle);

            // Fallback: pokud všechny sousedi jsou na jedné straně
            const leftN = leftNeighbors[0] || rightNeighbors[rightNeighbors.length - 1];
            const rightN = rightNeighbors[0] || leftNeighbors[leftNeighbors.length - 1];

            if (!leftN || !rightN) return;

            // Průsečíky hran
            // a1-b1 = levá hrana stěny (strana +normála)
            // a2-b2 = pravá hrana stěny (strana -normála)
            let use1, use2;
            if (!isEndB) {
                // Konec A: levá hrana s pravou hranou levého souseda, pravá s levou pravého
                use1 = this._lineIntersect(a1, b1, leftN.edges.p3, leftN.edges.p4);
                use2 = this._lineIntersect(a2, b2, rightN.edges.p1, rightN.edges.p2);
            } else {
                // Konec B: levá s levou levého souseda, pravá s pravou pravého
                use1 = this._lineIntersect(a1, b1, leftN.edges.p1, leftN.edges.p2);
                use2 = this._lineIntersect(a2, b2, rightN.edges.p3, rightN.edges.p4);
            }

            if (isEndB) {
                if (use1) b1 = use1;
                if (use2) b2 = use2;
            } else {
                if (use1) a1 = use1;
                if (use2) a2 = use2;
            }
        };

        doMitre(wall.nodeA, false);
        doMitre(wall.nodeB, true);

        return [a1, b1, b2, a2];
    }

    /**
     * Vrátí 4 body (hrany) obdélníku sousední stěny BEZ mitre.
     * p1-p2 = "levá" hrana (strana +normála), p3-p4 = "pravá" hrana (-normála)
     * Hrany jsou orientovány OD sdíleného bodu ven.
     */
    _getOtherPolygonEdges(otherWall, sharedNodeId) {
        const nodeS = this.nodes.get(sharedNodeId);
        const nodeE = this.nodes.get(
            otherWall.nodeA === sharedNodeId ? otherWall.nodeB : otherWall.nodeA
        );
        if (!nodeS || !nodeE) return null;

        const dx = nodeE.x - nodeS.x;
        const dy = nodeE.y - nodeS.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return null;

        const tl = otherWall.tloustka * this.PX_PER_M;
        const half = tl / 2;
        const nx = -dy / len, ny = dx / len;

        // Levá hrana (+normála): od sdíleného bodu k druhému konci
        // Pravá hrana (-normála): od sdíleného bodu k druhému konci
        return {
            p1: { x: nodeS.x + nx * half, y: nodeS.y + ny * half },
            p2: { x: nodeE.x + nx * half, y: nodeE.y + ny * half },
            p3: { x: nodeS.x - nx * half, y: nodeS.y - ny * half },
            p4: { x: nodeE.x - nx * half, y: nodeE.y - ny * half },
        };
    }

    /**
     * Průsečík dvou přímek (definovaných body p1-p2 a p3-p4).
     * Vrátí bod průsečíku nebo null.
     */
    _lineIntersect(p1, p2, p3, p4) {
        const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
        const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
        const det = d1x * d2y - d1y * d2x;
        if (Math.abs(det) < 0.0001) return null;

        const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / det;
        return { x: p1.x + d1x * t, y: p1.y + d1y * t };
    }

    // ─── OPENINGS ──────────────────────────────────────
    addOpening(wallId, pozice, sirka, typ = 'dvere', extra = {}) {
        const wall = this.walls.get(wallId);
        if (!wall) return null;

        // Prefix podle typu: D pro dveře (všechny dveřní typy), O pro okna
        const prefix = (typ === 'dvere' || typ === 'francouzske_okno' || typ === 'pruchod' || typ === 'garazova_vrata') ? 'D' : 'O';
        const id = this._id(prefix);
        const snappedSirka = snapOpeningSirka(sirka, typ);
        const opening = {
            id, wallId, pozice, sirka: snappedSirka, typ,
            smer: extra.smer || defaultOpeningSmer(typ),
            strana: extra.strana || 'in',
        };
        this.openings.set(id, opening);
        return opening;
    }

    removeOpening(openingId) {
        this.openings.delete(openingId);
    }

    getWallOpenings(wallId) {
        return [...this.openings.values()].filter(o => o.wallId === wallId);
    }

    // ─── SERIALIZATION ─────────────────────────────────
    toJSON() {
        const steny = [];
        for (const wall of this.walls.values()) {
            const nA = this.nodes.get(wall.nodeA);
            const nB = this.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            const wallOut = {
                id: wall.id,
                od: [nA.x / this.PX_PER_M, -nA.y / this.PX_PER_M],
                do: [nB.x / this.PX_PER_M, -nB.y / this.PX_PER_M],
                tloustka: wall.tloustka,
                typ: wall.typ,
            };
            // Constraint metadata (T-junction) — zachovat při uložení
            if (wall.odConstraint) wallOut.od_constraint = wall.odConstraint;
            if (wall.doConstraint) wallOut.do_constraint = wall.doConstraint;
            steny.push(wallOut);
        }

        const otvory = [];
        for (const opening of this.openings.values()) {
            const out = {
                id: opening.id,
                stena: opening.wallId,
                pozice: opening.pozice,
                sirka: opening.sirka,
                typ: opening.typ,
            };
            if (opening.smer) out.smer = opening.smer;
            if (opening.strana) out.strana = opening.strana;
            otvory.push(out);
        }

        const prostory = [];
        for (const p of (this.prostory || [])) {
            prostory.push({
                id: p.id, nazev: p.nazev, typ: p.typ, podtyp: p.podtyp,
                venkovni: !!p.venkovni,
                vertices: (p.vertices || []).map(v => ({ ...v })),
                plocha_m2: this.getProstorPlocha(p),
            });
        }
        // Vybavení (nábytek) — engine si polygon drží v metrech (kompatibilita
        // s output.json formátem a pudorys-icons.createFurnitureShape).
        const vybaveni = (this.vybaveni || []).map(v => ({
            id: v.id,
            typ: v.typ,
            podtyp: v.podtyp ?? null,
            kategorie: v.kategorie ?? null,
            stred: v.stred ? [v.stred[0], v.stred[1]] : undefined,
            polygon: Array.isArray(v.polygon) ? v.polygon.map(p => [p[0], p[1]]) : undefined,
            sirka: v.sirka,
            hloubka: v.hloubka,
            uhel: v.uhel ?? 0,
            vyska: v.vyska ?? null,
            tvar: v.tvar ?? null,
            zadni_strana: v.zadni_strana ?? null,
        }));

        return { steny, otvory, prostory, vybaveni };
    }

    fromJSON(data) {
        this.nodes.clear();
        this.walls.clear();
        this.openings.clear();
        this.prostory = [];
        this.vybaveni = [];
        this.nextId = 1;

        if (!data || !data.steny) return;

        // Při importu: přesné pozice, merge jen identické body (ne magnet)
        const MERGE_THRESHOLD = 0.5; // px — jen opravdu stejné body
        const findOrCreateNode = (x, y) => {
            for (const node of this.nodes.values()) {
                if (Math.abs(node.x - x) < MERGE_THRESHOLD && Math.abs(node.y - y) < MERGE_THRESHOLD) {
                    return node;
                }
            }
            const id = this._id('N');
            const node = { id, x, y };
            this.nodes.set(id, node);
            return node;
        };

        data.steny.forEach(s => {
            const x1 = s.od[0] * this.PX_PER_M;
            const y1 = -s.od[1] * this.PX_PER_M;
            const x2 = s.do[0] * this.PX_PER_M;
            const y2 = -s.do[1] * this.PX_PER_M;

            const nodeA = findOrCreateNode(x1, y1);
            const nodeB = findOrCreateNode(x2, y2);
            if (nodeA.id === nodeB.id) return;

            const rawTl = s.tloustka || 0.3;
            let typ = s.typ || s.material; // fallback: AI někdy posílá 'material' místo 'typ'
            if (!typ || !TYPY_STEN[typ]) typ = urcTypSteny(rawTl);
            // Snap tloušťky na standardní rozměr podle typu
            const tl = snapWallTloustka(rawTl, typ);
            const wall = {
                id: s.id,
                nodeA: nodeA.id,
                nodeB: nodeB.id,
                tloustka: tl,
                typ,
                // Constraint metadata pro editor (T-junction):
                // { 'host': 'W3', 't': 0.42 } — endpoint je na ose hostitele
                odConstraint: s.od_constraint || null,
                doConstraint: s.do_constraint || null,
            };
            this.walls.set(wall.id, wall);

            // Aktualizovat nextId
            const num = parseInt(s.id.replace(/\D/g, ''));
            if (num >= this.nextId) this.nextId = num + 1;
        });

        (data.otvory || []).forEach(o => {
            // Migrace směru otvírání: původní "left_in" → { smer, strana } + lítačky
            let smer = o.smer || null;
            let strana = o.strana || 'in';
            if (!smer) {
                const migrated = migrateOpeningSmer(o.smer_otvirani);
                if (migrated) { smer = migrated.smer; strana = migrated.strana; }
                if (!smer) smer = defaultOpeningSmer(o.typ);
            }
            const opening = {
                id: o.id,
                wallId: o.stena,
                pozice: o.pozice,
                // Snap šířky na standardní rozměr (ČSN 74 6401) — řeší i import
                // s naměřenými zlomky (0.8825 → 0.9).
                sirka: snapOpeningSirka(o.sirka, o.typ),
                typ: o.typ,
                smer,
                strana,
            };
            this.openings.set(opening.id, opening);

            const num = parseInt(o.id.replace(/\D/g, ''));
            if (num >= this.nextId) this.nextId = num + 1;
        });

        // Automaticky rozdělit stěny kde se bod dotýká hrany (T-napojení)
        // POZN: pokud má některá stěna constraint metadata, jsme v novém
        // constraint-based modelu — T-junctions řídí metadata, ne topology.
        // Split by rozbil logickou stěnu na dvě (problém při undo/reload).
        const hasConstraints = Array.from(this.walls.values()).some(w => w.odConstraint || w.doConstraint);
        if (!hasConstraints) {
            this._autoSplitWalls();
        }

        // Import místností: polygon vertices mohou buď REFERENCOVAT existující
        // wall node (blízko endpointu stěny → polygon se automaticky aktualizuje
        // s pohybem uzlu) nebo mít vlastní nezávislé souřadnice (pro open-plan
        // boundary). Virtuální stěny se nevytváří v grafu — hranice jsou jen
        // vizuální reprezentace, nemodifikují wall graph.
        // REF_TOL_PX 12 px (≈24 cm) — větší tolerance než 3 px, protože parser
        // polygonu z metrů často zaokrouhluje a vrchol končí lehce vedle uzlu.
        // Bez toho se vrchol uložil jako fixní {x,y} a po pohybu stěny zůstal
        // viset na původním místě.
        const REF_TOL_PX = 12.0;
        const findRefNode = (x, y) => {
            let best = null, bestD = REF_TOL_PX;
            for (const n of this.nodes.values()) {
                const d = Math.hypot(n.x - x, n.y - y);
                if (d < bestD) { bestD = d; best = n; }
            }
            return best;
        };
        const rawProstory = Array.isArray(data && data.prostory) ? data.prostory : [];
        for (const rp of rawProstory) {
            // Reload z engine toJSON: přímo vertices s refNodeId / x, y.
            // Při reloadu zkusíme re-snap fixních vrcholů na blízký wall node —
            // retroaktivní oprava starých projektů uložených před zvětšením
            // import tolerance (kde vrcholy mírně mimo uzel zůstaly fixed).
            if (Array.isArray(rp.vertices) && rp.vertices.length >= 3) {
                this.prostory.push({
                    id: rp.id, nazev: rp.nazev, typ: rp.typ, podtyp: rp.podtyp,
                    venkovni: !!rp.venkovni,
                    vertices: rp.vertices.map(v => {
                        if (!v.refNodeId && !(v.wallA && v.wallB) && typeof v.x === 'number') {
                            const refNode = findRefNode(v.x, v.y);
                            if (refNode) return { refNodeId: refNode.id };
                        }
                        return { ...v };
                    }),
                });
                const pnum2 = parseInt(String(rp.id).replace(/\D/g, ''));
                if (pnum2 >= this.nextId) this.nextId = pnum2 + 1;
                continue;
            }
            // První import z parseru: polygon v metrech.
            // Pro každý vertex najdi 2 zdi, jejichž vnitřní povrch se protíná
            // u této pozice → uložíme "recept" (wallRefs). Pozice se pak při
            // renderu počítá jako průsečík povrchů, takže místnost reaguje
            // na pohyb zdí.
            if (!rp.polygon || rp.polygon.length < 3) continue;
            const vertices = [];
            // Přibližná "středová pozice" místnosti pro určení strany povrchu
            let centroidX = 0, centroidY = 0;
            for (const pt of rp.polygon) {
                centroidX += pt[0] * this.PX_PER_M;
                centroidY += -pt[1] * this.PX_PER_M;
            }
            centroidX /= rp.polygon.length;
            centroidY /= rp.polygon.length;
            for (const pt of rp.polygon) {
                const x = pt[0] * this.PX_PER_M;
                const y = -pt[1] * this.PX_PER_M;
                // PRIO 1: blízký wall node → refNodeId. Vrchol pak živě sleduje
                // pohyb uzlu (a tím i jakékoliv stěny napojené na uzel).
                // Nejvíc spolehlivé pro rohové vrcholy místnosti.
                const refNode = findRefNode(x, y);
                if (refNode) {
                    vertices.push({ refNodeId: refNode.id });
                    continue;
                }
                // PRIO 2: wallA+wallB (průsečík vnitřních povrchů dvou zdí)
                const candidates = [];
                for (const w of this.walls.values()) {
                    const na = this.nodes.get(w.nodeA);
                    const nb = this.nodes.get(w.nodeB);
                    if (!na || !nb) continue;
                    const wdx = nb.x - na.x, wdy = nb.y - na.y;
                    const wL = Math.hypot(wdx, wdy);
                    if (wL < 1) continue;
                    const halfThk = (w.tloustka * this.PX_PER_M) / 2;
                    // Signed perp distance from point to wall axis
                    const perpSigned = ((x - na.x) * (-wdy) + (y - na.y) * wdx) / wL;
                    const absPerpDelta = Math.abs(Math.abs(perpSigned) - halfThk);
                    if (absPerpDelta > 3.0) continue;
                    // Along t
                    const t = ((x - na.x) * wdx + (y - na.y) * wdy) / (wL * wL);
                    if (t < -0.05 || t > 1.05) continue;
                    candidates.push({
                        wallId: w.id,
                        side: perpSigned >= 0 ? 1 : -1,  // která strana axis (sign)
                        perpDelta: absPerpDelta,
                        dir: [wdx / wL, wdy / wL],
                    });
                }
                candidates.sort((a, b) => a.perpDelta - b.perpDelta);
                // Vyber 2 ne-rovnoběžné zdi
                let chosenA = null, chosenB = null;
                for (const c of candidates) {
                    if (!chosenA) { chosenA = c; continue; }
                    const cos = Math.abs(chosenA.dir[0] * c.dir[0] + chosenA.dir[1] * c.dir[1]);
                    if (cos < 0.95) { chosenB = c; break; }
                }
                if (chosenA && chosenB) {
                    vertices.push({
                        wallA: chosenA.wallId, sideA: chosenA.side,
                        wallB: chosenB.wallId, sideB: chosenB.side,
                        fallbackX: x, fallbackY: y,
                    });
                } else {
                    // Žádné zdi poblíž — virtuální vrchol (open-plan)
                    vertices.push({ x, y });
                }
            }
            this.prostory.push({
                id: rp.id,
                nazev: rp.nazev,
                typ: rp.typ,
                podtyp: rp.podtyp,
                venkovni: !!rp.venkovni,
                vertices,
            });
            const pnum = parseInt(String(rp.id).replace(/\D/g, ''));
            if (pnum >= this.nextId) this.nextId = pnum + 1;
        }

        // Vybavení (nábytek) — drží se v metrech (output.json formát).
        // pudorys-icons.createFurnitureShape si převede na canvas px sám (× PX_PER_M).
        const rawVybaveni = Array.isArray(data && data.vybaveni) ? data.vybaveni : [];
        for (const rv of rawVybaveni) {
            this.vybaveni.push({
                id: rv.id,
                typ: rv.typ,
                podtyp: rv.podtyp ?? null,
                kategorie: rv.kategorie ?? null,
                stred: rv.stred ? [rv.stred[0], rv.stred[1]] : null,
                polygon: Array.isArray(rv.polygon) ? rv.polygon.map(p => [p[0], p[1]]) : null,
                sirka: rv.sirka,
                hloubka: rv.hloubka,
                uhel: rv.uhel ?? 0,
                vyska: rv.vyska ?? null,
                tvar: rv.tvar ?? null,
                zadni_strana: rv.zadni_strana ?? null,
            });
            const vnum = parseInt(String(rv.id).replace(/\D/g, ''));
            if (vnum >= this.nextId) this.nextId = vnum + 1;
        }
    }

    /**
     * Vrátí aktuální polygon místnosti jako pole [x, y] v metrech.
     * Sjednocené s getProstorVertexPx — všechny tři typy vrcholů (refNodeId,
     * wallA+wallB, fixed {x,y}) se počítají z aktuálního stavu engine, takže
     * polygon se hýbe se zdmi.
     */
    getProstorPolygon(prostor) {
        const out = [];
        if (!prostor) return out;
        const verts = prostor.vertices || [];
        for (const v of verts) {
            const px = this.getProstorVertexPx(v);
            if (!px) continue;
            out.push([px.x / this.PX_PER_M, -px.y / this.PX_PER_M]);
        }
        return out;
    }

    /** Pozice vertexu v px. Počítáno podle typu vrcholu:
     *  - refNodeId: live pozice wall uzlu
     *  - wallA/wallB: průsečík vnitřních povrchů dvou zdí (sleduje jejich pohyb)
     *  - x,y: fixní souřadnice (virtuální vrchol)
     */
    getProstorVertexPx(v) {
        if (v.refNodeId) {
            const n = this.nodes.get(v.refNodeId);
            return n ? { x: n.x, y: n.y } : null;
        }
        if (v.wallA && v.wallB) {
            const wA = this.walls.get(v.wallA);
            const wB = this.walls.get(v.wallB);
            if (wA && wB) {
                const aA = this.nodes.get(wA.nodeA), bA = this.nodes.get(wA.nodeB);
                const aB = this.nodes.get(wB.nodeA), bB = this.nodes.get(wB.nodeB);
                if (aA && bA && aB && bB) {
                    const result = this._intersectWallSurfaces(aA, bA, wA.tloustka * this.PX_PER_M / 2, v.sideA, aB, bB, wB.tloustka * this.PX_PER_M / 2, v.sideB);
                    if (result) return result;
                }
            }
            // Fallback na uloženou pozici
            if (typeof v.fallbackX === 'number') return { x: v.fallbackX, y: v.fallbackY };
        }
        return { x: v.x, y: v.y };
    }

    /** Průsečík vnitřních povrchů dvou zdí. Každý povrch = osa posunutá
     *  o half_thk × side (perpendikulárně). Vrací null pro rovnoběžné.
     */
    _intersectWallSurfaces(a1, b1, h1, s1, a2, b2, h2, s2) {
        const d1x = b1.x - a1.x, d1y = b1.y - a1.y;
        const L1 = Math.hypot(d1x, d1y);
        if (L1 < 1) return null;
        const n1x = -d1y / L1 * s1, n1y = d1x / L1 * s1;
        const p1x = a1.x + n1x * h1, p1y = a1.y + n1y * h1;
        const d2x = b2.x - a2.x, d2y = b2.y - a2.y;
        const L2 = Math.hypot(d2x, d2y);
        if (L2 < 1) return null;
        const n2x = -d2y / L2 * s2, n2y = d2x / L2 * s2;
        const p2x = a2.x + n2x * h2, p2y = a2.y + n2y * h2;
        // Průsečík přímek P1 + t * D1 a P2 + u * D2
        const det = d1x * (-d2y) - d1y * (-d2x);
        if (Math.abs(det) < 1e-6) return null;
        const t = ((p2x - p1x) * (-d2y) - (p2y - p1y) * (-d2x)) / det;
        return { x: p1x + t * d1x, y: p1y + t * d1y };
    }

    /**
     * Plocha polygonu v m². Shoelace formula + korekce na tloušťku stěn:
     * pokud vertex edge spojuje dva wall-uzly patřící stejné reálné stěně,
     * odečteme pás (length × thk/2) — místnost se měří od povrchu zdi.
     */
    getProstorPlocha(prostor) {
        const poly = this.getProstorPolygon(prostor);
        if (poly.length < 3 || !prostor.vertices) return 0;
        let sum = 0;
        for (let i = 0; i < poly.length; i++) {
            const [x1, y1] = poly[i];
            const [x2, y2] = poly[(i + 1) % poly.length];
            sum += x1 * y2 - x2 * y1;
        }
        const rawArea = Math.abs(sum) / 2;
        let correction = 0;
        for (let i = 0; i < prostor.vertices.length; i++) {
            const vA = prostor.vertices[i];
            const vB = prostor.vertices[(i + 1) % prostor.vertices.length];
            if (!vA.refNodeId || !vB.refNodeId) continue;
            // Najít reálnou stěnu s těmito dvěma endpointy
            for (const w of this.walls.values()) {
                if ((w.nodeA === vA.refNodeId && w.nodeB === vB.refNodeId) ||
                    (w.nodeA === vB.refNodeId && w.nodeB === vA.refNodeId)) {
                    const [x1, y1] = poly[i];
                    const [x2, y2] = poly[(i + 1) % poly.length];
                    const len = Math.hypot(x2 - x1, y2 - y1);
                    correction += len * (w.tloustka / 2);
                    break;
                }
            }
        }
        return Math.max(0, rawArea - correction);
    }

    // ─── LAYOUT → GEOMETRIE ─────────────────────────────
    /**
     * Přeloží mřížku místností do stěn, otvorů a střechy.
     * Layout formát:
     * {
     *   sirka: 12, hloubka: 8,
     *   rady: [
     *     { hloubka: 4, bunky: [{nazev: "Obývák", sirka: 7}, {nazev: "Chodba", sirka: 5}] },
     *     { hloubka: 4, bunky: [{nazev: "Ložnice", sirka: 4}, {nazev: "Koupelna", sirka: 3}, {nazev: "Pokoj", sirka: 5}] }
     *   ],
     *   dvere: ["Chodba→Obývák", "Chodba→Koupelna"],
     *   okna: {"Obývák": "sever", "Ložnice": "východ"},
     *   strecha: {typ: "sedlova", sklon: 35}
     * }
     */
    fromLayout(layout) {
        this.nodes.clear();
        this.walls.clear();
        this.openings.clear();
        this.prostory = [];
        this.vybaveni = [];
        this.nextId = 1;

        const px = this.PX_PER_M;
        const tlObvodova = 0.3;
        const tlPricka = 0.1;

        // Mapování místností na pozice (pro dveře/okna)
        const mistnosti = new Map(); // nazev → {x, y, w, h}

        // 1) Obvodové stěny
        const W = layout.sirka;
        const H = layout.hloubka;
        this.addWall(0, 0, W * px, 0, tlObvodova);           // sever
        this.addWall(W * px, 0, W * px, H * px, tlObvodova);  // východ
        this.addWall(W * px, H * px, 0, H * px, tlObvodova);  // jih
        this.addWall(0, H * px, 0, 0, tlObvodova);            // západ

        // 2) Příčky z mřížky
        let y = 0;
        for (const rada of layout.rady || []) {
            const radaH = rada.hloubka;
            let x = 0;

            // Horizontální příčka (hranice řad) — kromě první a poslední
            if (y > 0) {
                this.addWall(0, y * px, W * px, y * px, tlPricka);
            }

            for (let i = 0; i < (rada.bunky || []).length; i++) {
                const bunka = rada.bunky[i];
                const bunkaW = bunka.sirka;

                // Uložit pozici místnosti
                mistnosti.set(bunka.nazev, {
                    x: x, y: y, w: bunkaW, h: radaH,
                    cx: (x + bunkaW / 2) * px,
                    cy: (y + radaH / 2) * px,
                    typ: bunka.typ || 'Undefined',
                    nazev: bunka.nazev,
                    vybaveni: Array.isArray(bunka.vybaveni) ? bunka.vybaveni : [],
                });

                // Vertikální příčka (hranice buněk) — kromě poslední v řadě
                if (i < rada.bunky.length - 1) {
                    const prX = (x + bunkaW) * px;
                    this.addWall(prX, y * px, prX, (y + radaH) * px, tlPricka);
                }

                x += bunkaW;
            }
            y += radaH;
        }

        // 3) AutoSplit pro T-napojení
        this._autoSplitWalls();

        // 4) Dveře — mezi sousedními místnostmi
        for (const dvere of layout.dvere || []) {
            const parts = dvere.split(/→|->/).map(s => s.trim());
            if (parts.length !== 2) continue;
            const m1 = mistnosti.get(parts[0]);
            const m2 = mistnosti.get(parts[1]);
            if (!m1 || !m2) continue;

            // Najít sdílenou hranu
            let dverePoz = null;
            const tolerance = 0.01 * px;

            // Horizontální sdílená hrana (m1 nad m2 nebo naopak)
            if (Math.abs((m1.y + m1.h) - m2.y) < 0.01 || Math.abs((m2.y + m2.h) - m1.y) < 0.01) {
                const hranice = Math.abs((m1.y + m1.h) - m2.y) < 0.01 ? (m1.y + m1.h) : (m2.y + m2.h);
                const overlapL = Math.max(m1.x, m2.x);
                const overlapR = Math.min(m1.x + m1.w, m2.x + m2.w);
                if (overlapR > overlapL) {
                    const stredX = ((overlapL + overlapR) / 2) * px;
                    dverePoz = { x: stredX, y: hranice * px, orient: 'h' };
                }
            }
            // Vertikální sdílená hrana (m1 vlevo od m2 nebo naopak)
            if (!dverePoz) {
                if (Math.abs((m1.x + m1.w) - m2.x) < 0.01 || Math.abs((m2.x + m2.w) - m1.x) < 0.01) {
                    const hranice = Math.abs((m1.x + m1.w) - m2.x) < 0.01 ? (m1.x + m1.w) : (m2.x + m2.w);
                    const overlapT = Math.max(m1.y, m2.y);
                    const overlapB = Math.min(m1.y + m1.h, m2.y + m2.h);
                    if (overlapB > overlapT) {
                        const stredY = ((overlapT + overlapB) / 2) * px;
                        dverePoz = { x: hranice * px, y: stredY, orient: 'v' };
                    }
                }
            }

            if (!dverePoz) continue;

            // Najít stěnu na této pozici
            for (const wall of this.walls.values()) {
                const nA = this.nodes.get(wall.nodeA);
                const nB = this.nodes.get(wall.nodeB);
                if (!nA || !nB) continue;

                const dx = nB.x - nA.x, dy = nB.y - nA.y;
                const len = Math.hypot(dx, dy);
                if (len < px * 0.5) continue;

                // Vzdálenost bodu od stěny
                const t = ((dverePoz.x - nA.x) * dx + (dverePoz.y - nA.y) * dy) / (len * len);
                if (t < 0.05 || t > 0.95) continue;
                const cx = nA.x + t * dx, cy = nA.y + t * dy;
                const dist = Math.hypot(dverePoz.x - cx, dverePoz.y - cy);
                if (dist > px * 0.5) continue;

                // Přidat dveře
                const poziceM = (t * len) / px - 0.45; // centrovat dveře
                const id = this._id('D');
                this.openings.set(id, {
                    id, wallId: wall.id,
                    pozice: Math.max(0.3, poziceM),
                    sirka: 0.9, typ: 'dvere', nazev: dvere,
                });
                break;
            }
        }

        // 5a) Vchod — vchodové dveře na obvodu domu.
        // Formát: layout.vchod = { strana: "S|J|V|Z", pozice_od: 1.5 (volitelné, default uprostřed) }
        if (layout.vchod && layout.vchod.strana) {
            const vch = layout.vchod;
            const strana = String(vch.strana).toUpperCase().charAt(0);
            let vchX, vchY;
            const W_m = layout.sirka, H_m = layout.hloubka;
            const pozice = vch.pozice_od ?? null;
            if (strana === 'S') { vchX = (pozice ?? W_m / 2) * px; vchY = 0; }
            else if (strana === 'J') { vchX = (pozice ?? W_m / 2) * px; vchY = H_m * px; }
            else if (strana === 'Z') { vchX = 0; vchY = (pozice ?? H_m / 2) * px; }
            else if (strana === 'V') { vchX = W_m * px; vchY = (pozice ?? H_m / 2) * px; }

            if (vchX !== undefined) {
                for (const wall of this.walls.values()) {
                    if (wall.tloustka < 0.2) continue;
                    const nA = this.nodes.get(wall.nodeA);
                    const nB = this.nodes.get(wall.nodeB);
                    if (!nA || !nB) continue;
                    const dx = nB.x - nA.x, dy = nB.y - nA.y;
                    const len = Math.hypot(dx, dy);
                    if (len < px) continue;
                    const t = ((vchX - nA.x) * dx + (vchY - nA.y) * dy) / (len * len);
                    if (t < 0.05 || t > 0.95) continue;
                    const cx = nA.x + t * dx, cy = nA.y + t * dy;
                    if (Math.hypot(vchX - cx, vchY - cy) > px * 0.5) continue;
                    const poziceM = (t * len) / px - 0.45;
                    const id = this._id('D');
                    this.openings.set(id, {
                        id, wallId: wall.id,
                        pozice: Math.max(0.3, poziceM),
                        sirka: 0.9, typ: 'dvere', nazev: 'Vchod',
                    });
                    break;
                }
            }
        }

        // 5b) Okna — na obvodových stěnách
        for (const [nazev, strana] of Object.entries(layout.okna || {})) {
            const m = mistnosti.get(nazev);
            if (!m) continue;

            const strany = strana.split(/[+,]/).map(s => s.trim().toLowerCase());
            for (const s of strany) {
                let oknoX, oknoY;
                if (s === 'sever' || s === 's') { oknoX = m.cx; oknoY = 0; }
                else if (s === 'jih' || s === 'j') { oknoX = m.cx; oknoY = H * px; }
                else if (s === 'západ' || s === 'z') { oknoX = 0; oknoY = m.cy; }
                else if (s === 'východ' || s === 'v') { oknoX = W * px; oknoY = m.cy; }
                else continue;

                // Najít obvodovou stěnu
                for (const wall of this.walls.values()) {
                    if (wall.tloustka < 0.2) continue; // jen obvodové
                    const nA = this.nodes.get(wall.nodeA);
                    const nB = this.nodes.get(wall.nodeB);
                    if (!nA || !nB) continue;

                    const dx = nB.x - nA.x, dy = nB.y - nA.y;
                    const len = Math.hypot(dx, dy);
                    if (len < px) continue;

                    const t = ((oknoX - nA.x) * dx + (oknoY - nA.y) * dy) / (len * len);
                    if (t < 0.05 || t > 0.95) continue;
                    const cx = nA.x + t * dx, cy = nA.y + t * dy;
                    const dist = Math.hypot(oknoX - cx, oknoY - cy);
                    if (dist > px * 0.5) continue;

                    const poziceM = (t * len) / px - 0.6;
                    const id = this._id('O');
                    this.openings.set(id, {
                        id, wallId: wall.id,
                        pozice: Math.max(0.3, poziceM),
                        sirka: 1.2, typ: 'okno', nazev: nazev,
                    });
                    break;
                }
            }
        }

        // 6) Prostory — 4 rohy buňky jako polygon (vertices). Engine si dopočítá plochu.
        let prostorIdx = 1;
        for (const m of mistnosti.values()) {
            const x1 = m.x * px, y1 = m.y * px;
            const x2 = (m.x + m.w) * px, y2 = (m.y + m.h) * px;
            this.prostory.push({
                id: 'P' + (prostorIdx++),
                nazev: m.nazev,
                typ: m.typ || 'Undefined',
                podtyp: null,
                venkovni: false,
                vertices: [
                    { x: x1, y: y1 },
                    { x: x2, y: y1 },
                    { x: x2, y: y2 },
                    { x: x1, y: y2 },
                ],
            });
        }

        // 7) Vybavení (nábytek) — z relativních pozic uvnitř místnosti.
        // u_steny: 'S'|'J'|'V'|'Z'|'C' (sever/jih/východ/západ/centrum)
        // od_kraje: vzdálenost od levého (S/J) nebo horního (V/Z) okraje místnosti v metrech
        // sirka, hloubka v metrech (sirka rovnoběžně se zdí, hloubka kolmo)
        // POSUN OD STĚNY — nábytek se posouvá dovnitř o tloušťku stěny / 2,
        // aby polygon nepřeléval přes vnitřek stěny. Použijeme konzervativní 0.15 m
        // (= polovina obvodové stěny 0.3m). U příček (0.1m) bude o trochu odsazeno.
        const ODSAZENI = 0.15;
        let vybIdx = 1;
        for (const m of mistnosti.values()) {
            for (const vbDef of m.vybaveni || []) {
                const sirka = vbDef.sirka || 0.6;
                const hloubka = vbDef.hloubka || 0.4;
                const odKraje = vbDef.od_kraje ?? 0;
                const strana = (vbDef.u_steny || 'S').toUpperCase().charAt(0);
                let cx, cy, uhel;

                if (strana === 'S') { // sever — horní stěna místnosti
                    cx = m.x + ODSAZENI + odKraje + sirka / 2;
                    cy = m.y + ODSAZENI + hloubka / 2;
                    uhel = 0;
                } else if (strana === 'J') { // jih
                    cx = m.x + ODSAZENI + odKraje + sirka / 2;
                    cy = m.y + m.h - ODSAZENI - hloubka / 2;
                    uhel = Math.PI;
                } else if (strana === 'V') { // východ
                    cx = m.x + m.w - ODSAZENI - hloubka / 2;
                    cy = m.y + ODSAZENI + odKraje + sirka / 2;
                    uhel = -Math.PI / 2;
                } else if (strana === 'Z') { // západ
                    cx = m.x + ODSAZENI + hloubka / 2;
                    cy = m.y + ODSAZENI + odKraje + sirka / 2;
                    uhel = Math.PI / 2;
                } else { // centrum (C)
                    cx = m.x + m.w / 2;
                    cy = m.y + m.h / 2;
                    uhel = 0;
                }

                // Polygon — pro S/J má sirka v X (rovnoběžně se zdí) a hloubku v Y;
                // pro V/Z je to obráceně (sirka v Y, hloubka v X). Centrum použije S/J orientaci.
                const horizontalniSirka = (strana === 'V' || strana === 'Z') ? hloubka : sirka;
                const vertikalniHloubka = (strana === 'V' || strana === 'Z') ? sirka : hloubka;
                const polygon = [
                    [cx - horizontalniSirka / 2, -(cy - vertikalniHloubka / 2)],
                    [cx + horizontalniSirka / 2, -(cy - vertikalniHloubka / 2)],
                    [cx + horizontalniSirka / 2, -(cy + vertikalniHloubka / 2)],
                    [cx - horizontalniSirka / 2, -(cy + vertikalniHloubka / 2)],
                ];
                this.vybaveni.push({
                    id: 'V' + (vybIdx++),
                    typ: vbDef.typ,
                    podtyp: vbDef.podtyp ?? null,
                    kategorie: vbDef.kategorie ?? null,
                    stred: [cx, -cy], // engine drží y_dolů, ale formát output.json má y_nahoru
                    polygon,
                    sirka, hloubka,
                    uhel,
                    vyska: vbDef.vyska ?? null,
                    tvar: vbDef.tvar || 'rect',
                    zadni_strana: vbDef.zadni_strana ?? null,
                });
            }
        }

        return {
            mistnosti: Object.fromEntries(mistnosti),
            strecha: layout.strecha || null,
        };
    }

    // ════════════════════════════════════════════════════════
    // fromAsciiPlus — reprezentace E (ASCII grid + cm legendy)
    // Vstup:
    //  paket = {
    //    granularita: 0.25,         // metry/znak
    //    grid: "AABB\nAACC\n....",
    //    mistnosti: [{id:'A', nazev, typ}, ...],   (volitelné — typ a popis)
    //    otvory: [{id:'d1', typ, sirka_cm, mezi:['A','B']|'obvod', strana?}, ...],
    //    vybaveni: [{id:'n1', typ, kategorie, sirka_cm, hloubka_cm, v_mistnosti, u_steny, od_kraje_cm}, ...]
    //  }
    // Výstup: vyplní engine.nodes/walls/openings/prostory/vybaveni
    // Algoritmus:
    //  1. Pro každý znak v gridu najdi obvodové hrany (mřížkové úsečky kde sousedí jiný znak)
    //  2. Z hran vyrob polygon prostoru (chain + simplify kolineárních)
    //  3. Pro každou unikátní hranu rozhodni: sdílená mezi 2 znaky = příčka, hrana s '.' = obvod
    //  4. Spoj kolineární hrany stejné kategorie do jedné stěny
    //  5. Otvory (později) — z legendy umístit do správné stěny
    //  6. Vybavení (později) — z legendy s relativní pozicí v místnosti
    // ════════════════════════════════════════════════════════
    fromAsciiPlus(paket) {
        this.nodes.clear();
        this.walls.clear();
        this.openings.clear();
        this.prostory = [];
        this.vybaveni = [];
        this.nextId = 1;

        const granularita = paket.granularita || 0.25;
        const krokPx = granularita * this.PX_PER_M;

        const gridLines = (paket.grid || '').split('\n').filter(l => l.length > 0);
        if (gridLines.length === 0) return { ok: false, chyba: 'Prázdný grid' };

        const gridChar = (col, row) => {
            if (row < 0 || row >= gridLines.length) return '.';
            if (col < 0 || col >= gridLines[row].length) return '.';
            return gridLines[row][col];
        };

        // 1. Pro každý znak (kromě '.', ' ', a otvor-id 'd1','o1' atd.) najít hrany
        const znakSet = new Set();
        for (const line of gridLines) {
            for (const c of line) {
                if (c !== '.' && c !== ' ') znakSet.add(c);
            }
        }

        const hranyZnaku = new Map();
        for (const z of znakSet) hranyZnaku.set(z, new Set());

        for (let r = 0; r < gridLines.length; r++) {
            for (let c = 0; c < gridLines[r].length; c++) {
                const z = gridLines[r][c];
                if (!hranyZnaku.has(z)) continue;
                const set = hranyZnaku.get(z);
                if (gridChar(c, r - 1) !== z) set.add(`${c},${r},${c + 1},${r}`);
                if (gridChar(c + 1, r) !== z) set.add(`${c + 1},${r},${c + 1},${r + 1}`);
                if (gridChar(c, r + 1) !== z) set.add(`${c},${r + 1},${c + 1},${r + 1}`);
                if (gridChar(c - 1, r) !== z) set.add(`${c},${r},${c},${r + 1}`);
            }
        }

        // 2. Pro každý znak vyrob polygon (chain + simplify)
        const polygony = new Map();
        for (const [znak, hrany] of hranyZnaku) {
            const poly = this._chainGridEdges(hrany);
            if (poly && poly.length >= 3) {
                polygony.set(znak, poly);
            }
        }

        // 3. Vyrob prostory
        const mistByZnak = new Map();
        for (const m of paket.mistnosti || []) mistByZnak.set(m.id, m);

        let prostorIdx = 1;
        for (const [znak, polygon] of polygony) {
            const def = mistByZnak.get(znak) || { nazev: znak, typ: 'Undefined' };
            this.prostory.push({
                id: 'P' + (prostorIdx++),
                nazev: def.nazev || znak,
                typ: def.typ || 'Undefined',
                podtyp: null,
                venkovni: !!def.venkovni,
                vertices: polygon.map(([gx, gy]) => ({
                    x: gx * krokPx,
                    y: gy * krokPx,
                })),
            });
        }

        // 4. Sjednocení všech hran napříč znaky → klasifikace (sdílená vs obvod)
        // Pro každou hranu zjistit pár znaků (= co je na obou stranách)
        const vsechnyHrany = new Set();
        for (const set of hranyZnaku.values()) {
            for (const h of set) vsechnyHrany.add(h);
        }

        const hranaParZnaku = (klic) => {
            const [x1, y1, x2, y2] = klic.split(',').map(Number);
            if (y1 === y2) {
                return [gridChar(x1, y1 - 1), gridChar(x1, y1)].sort().join(':');
            }
            return [gridChar(x1 - 1, y1), gridChar(x1, y1)].sort().join(':');
        };

        // Seskupit po párech + směru pro spojování kolineárních
        const skupiny = new Map();
        for (const klic of vsechnyHrany) {
            const [x1, y1, x2, y2] = klic.split(',').map(Number);
            const par = hranaParZnaku(klic);
            const [a, b] = par.split(':');
            if (a === b) continue; // hrana mezi stejnými znaky = ne hrana
            const smer = y1 === y2 ? 'h_y' + y1 : 'v_x' + x1;
            const k = par + '|' + smer;
            if (!skupiny.has(k)) skupiny.set(k, []);
            skupiny.get(k).push([x1, y1, x2, y2]);
        }

        // 5. Pro každou skupinu spojit kolineární do jedné stěny.
        // Pro otvory si pamatujeme par→[wall, smer] aby se daly otvory umístit.
        // segmentyPodleParu: par 'A:B' → [{wall, smer:'h'/'v', startGrid, endGrid}]
        const segmentyPodleParu = new Map();

        for (const [k, edges] of skupiny) {
            const [par] = k.split('|');
            const isObvod = par.includes('.'); // jeden ze sousedů je '.' = mimo dům
            const tloustka = isObvod ? 0.3 : 0.1;

            const isH = edges[0][1] === edges[0][3];
            edges.sort((a, b) => isH ? a[0] - b[0] : a[1] - b[1]);

            const spojene = [];
            let curr = edges[0].slice();
            for (let i = 1; i < edges.length; i++) {
                const next = edges[i];
                if ((isH && curr[2] === next[0] && curr[1] === next[1]) ||
                    (!isH && curr[3] === next[1] && curr[0] === next[0])) {
                    curr[2] = next[2];
                    curr[3] = next[3];
                } else {
                    spojene.push(curr);
                    curr = next.slice();
                }
            }
            spojene.push(curr);

            if (!segmentyPodleParu.has(par)) segmentyPodleParu.set(par, []);
            const seznam = segmentyPodleParu.get(par);

            for (const [x1, y1, x2, y2] of spojene) {
                const wall = this.addWall(x1 * krokPx, y1 * krokPx, x2 * krokPx, y2 * krokPx, tloustka);
                if (wall) {
                    seznam.push({
                        wallId: wall.id,
                        smer: isH ? 'h' : 'v',
                        gridStart: isH ? x1 : y1,
                        gridEnd: isH ? x2 : y2,
                        delkaCm: Math.abs((isH ? x2 - x1 : y2 - y1)) * granularita * 100,
                    });
                }
            }
        }

        // 6. Otvory — z legendy umístit do správné stěny mezi A↔B (nebo A↔.).
        // Algoritmus:
        //  a) najdi par 'A:B' (sortováno) ve segmentyPodleParu
        //  b) pokud není definován pozice_cm, umísti otvor doprostřed nejdelšího segmentu
        //  c) jinak: setříď segmenty podle gridStart, walk-through s akumulátorem délky,
        //     najdi segment kde se pozice_cm nachází, vypočti relative t na stěně
        for (const o of paket.otvory || []) {
            const sirka = (o.sirka_cm || 90) / 100;
            const typ = o.typ || (o.id && /^o/i.test(o.id) ? 'okno' : 'dvere');
            const mezi = Array.isArray(o.mezi) ? o.mezi : null;
            if (!mezi || mezi.length !== 2) continue;

            const par = [...mezi].sort().join(':');
            const segmenty = segmentyPodleParu.get(par);
            if (!segmenty || segmenty.length === 0) continue;

            // Setřídit kolineární kompozici (segmenty mohou být v různých řádcích/sloupcích)
            segmenty.sort((a, b) => a.gridStart - b.gridStart);

            // Engine očekává pozici v METRECH od nodeA (ne 0-1).
            // pozice_cm = vzdálenost od začátku celé sdílené hranice (across všech segmentů).
            const pozCm = o.pozice_cm != null ? o.pozice_cm : null;
            let target = null;
            let pozM = 0;

            if (pozCm == null) {
                target = segmenty.reduce((a, b) => a.delkaCm >= b.delkaCm ? a : b);
                pozM = (target.delkaCm / 100) / 2;
            } else {
                let akumulovano = 0;
                for (const s of segmenty) {
                    if (pozCm <= akumulovano + s.delkaCm) {
                        target = s;
                        const lokalniCm = pozCm - akumulovano;
                        pozM = Math.min(s.delkaCm / 100 - sirka / 2, Math.max(sirka / 2, lokalniCm / 100));
                        break;
                    }
                    akumulovano += s.delkaCm;
                }
                if (!target) {
                    target = segmenty[segmenty.length - 1];
                    pozM = (target.delkaCm / 100) / 2;
                }
            }

            // o.otevira_do = "A" znamená dveře se otevírají DO místnosti A.
            // Engine interně používá strana='in'/'out' relativně ke směru stěny (nodeA→nodeB).
            // Mapování: pokud otevira_do je lexikálně menší písmeno (A z A:B), strana='in'.
            const [parA] = par.split(':');
            const strana = o.otevira_do === parA ? 'in' : 'out';

            const smer = o.smer || (typ === 'okno' ? null : 'pravy');

            this.addOpening(target.wallId, pozM, sirka, typ, { smer, strana });
        }

        // 7. Vybavení — z legendy umístit do místnosti pomocí u_steny + od_kraje_cm.
        // Najdi prostor podle v_mistnosti, vezmi jeho bbox, umísti relativně.
        const prostorByZnak = new Map();
        let pIdx = 0;
        for (const znak of polygony.keys()) {
            prostorByZnak.set(znak, this.prostory[pIdx++]);
        }
        const ODSAZENI_M = 0.15;
        let vybIdx = 1;
        for (const v of paket.vybaveni || []) {
            const prostor = prostorByZnak.get(v.v_mistnosti);
            if (!prostor) continue;

            const xs = prostor.vertices.map(p => p.x);
            const ys = prostor.vertices.map(p => p.y);
            const minX = Math.min(...xs) / this.PX_PER_M;
            const maxX = Math.max(...xs) / this.PX_PER_M;
            const minY = Math.min(...ys) / this.PX_PER_M;
            const maxY = Math.max(...ys) / this.PX_PER_M;
            const W = maxX - minX;
            const H = maxY - minY;

            const sirka = (v.sirka_cm || 80) / 100;
            const hloubka = (v.hloubka_cm || 60) / 100;
            const odKraje = (v.od_kraje_cm || 0) / 100;
            const strana = (v.u_steny || 'S').toUpperCase();

            let cx, cy, uhel;
            if (strana === 'S') {
                cx = minX + ODSAZENI_M + odKraje + sirka / 2;
                cy = minY + ODSAZENI_M + hloubka / 2;
                uhel = 0;
            } else if (strana === 'J') {
                cx = minX + ODSAZENI_M + odKraje + sirka / 2;
                cy = maxY - ODSAZENI_M - hloubka / 2;
                uhel = Math.PI;
            } else if (strana === 'V') {
                cx = maxX - ODSAZENI_M - hloubka / 2;
                cy = minY + ODSAZENI_M + odKraje + sirka / 2;
                uhel = -Math.PI / 2;
            } else if (strana === 'Z') {
                cx = minX + ODSAZENI_M + hloubka / 2;
                cy = minY + ODSAZENI_M + odKraje + sirka / 2;
                uhel = Math.PI / 2;
            } else { // C = centrum
                cx = (minX + maxX) / 2;
                cy = (minY + maxY) / 2;
                uhel = 0;
            }

            const horizontalniSirka = (strana === 'V' || strana === 'Z') ? hloubka : sirka;
            const vertikalniHloubka = (strana === 'V' || strana === 'Z') ? sirka : hloubka;
            const polygon = [
                [cx - horizontalniSirka / 2, -(cy - vertikalniHloubka / 2)],
                [cx + horizontalniSirka / 2, -(cy - vertikalniHloubka / 2)],
                [cx + horizontalniSirka / 2, -(cy + vertikalniHloubka / 2)],
                [cx - horizontalniSirka / 2, -(cy + vertikalniHloubka / 2)],
            ];
            this.vybaveni.push({
                id: 'V' + (vybIdx++),
                typ: v.typ || 'Generic',
                podtyp: v.podtyp || null,
                kategorie: v.kategorie || null,
                stred: [cx, -cy],
                polygon,
                sirka,
                hloubka,
                uhel,
                vyska: v.vyska || null,
                tvar: v.tvar || 'rect',
            });
        }

        return {
            ok: true,
            stats: {
                prostory: this.prostory.length,
                walls: this.walls.size,
                openings: this.openings.size,
                vybaveni: this.vybaveni.length,
            },
        };
    }

    /**
     * Sleduje hrany v Setu klíčů "x1,y1,x2,y2" a sestaví uzavřený polygon.
     * Vrací pole [x, y] grid souřadnic vrcholů (po simplifikaci kolineárních).
     */
    _chainGridEdges(hranyKlice) {
        if (hranyKlice.size === 0) return null;

        const sousede = new Map();
        for (const klic of hranyKlice) {
            const [x1, y1, x2, y2] = klic.split(',').map(Number);
            const k1 = `${x1},${y1}`;
            const k2 = `${x2},${y2}`;
            if (!sousede.has(k1)) sousede.set(k1, []);
            if (!sousede.has(k2)) sousede.set(k2, []);
            sousede.get(k1).push(k2);
            sousede.get(k2).push(k1);
        }

        const start = Array.from(hranyKlice)[0].split(',').slice(0, 2).join(',');
        const polygon = [];
        let prev = null;
        let curr = start;
        const visited = new Set();

        let safety = 0;
        while (safety++ < hranyKlice.size + 10) {
            polygon.push(curr.split(',').map(Number));
            const candidates = (sousede.get(curr) || []).filter(n => {
                const ek = [curr, n].sort().join('|');
                return !visited.has(ek);
            });
            if (candidates.length === 0) break;
            const next = candidates.find(n => n !== prev) || candidates[0];
            visited.add([curr, next].sort().join('|'));
            prev = curr;
            curr = next;
            if (curr === start) break;
        }

        return this._simplifyGridPolygon(polygon);
    }

    _simplifyGridPolygon(poly) {
        if (poly.length < 3) return poly;
        const result = [];
        for (let i = 0; i < poly.length; i++) {
            const prev = poly[(i - 1 + poly.length) % poly.length];
            const curr = poly[i];
            const next = poly[(i + 1) % poly.length];
            const dx1 = curr[0] - prev[0], dy1 = curr[1] - prev[1];
            const dx2 = next[0] - curr[0], dy2 = next[1] - curr[1];
            const cross = dx1 * dy2 - dy1 * dx2;
            if (cross !== 0) result.push(curr);
        }
        return result.length >= 3 ? result : poly;
    }

    // ─── QUERIES ───────────────────────────────────────
    getWallLength(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return 0;
        const nA = this.nodes.get(wall.nodeA);
        const nB = this.nodes.get(wall.nodeB);
        if (!nA || !nB) return 0;
        return Math.hypot(nB.x - nA.x, nB.y - nA.y) / this.PX_PER_M;
    }

    getWallAngle(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return 0;
        const nA = this.nodes.get(wall.nodeA);
        const nB = this.nodes.get(wall.nodeB);
        if (!nA || !nB) return 0;
        return Math.atan2(nB.y - nA.y, nB.x - nA.x);
    }

    getWallCenter(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return { x: 0, y: 0 };
        const nA = this.nodes.get(wall.nodeA);
        const nB = this.nodes.get(wall.nodeB);
        if (!nA || !nB) return { x: 0, y: 0 };
        return { x: (nA.x + nB.x) / 2, y: (nA.y + nB.y) / 2 };
    }

    /** Najdi stěnu nejbližší bodu (pro kliknutí) */
    findWallAt(x, y, maxDist = 20) {
        let best = null;
        let bestDist = maxDist;

        for (const wall of this.walls.values()) {
            const nA = this.nodes.get(wall.nodeA);
            const nB = this.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;

            const dist = this._pointToSegmentDist(x, y, nA.x, nA.y, nB.x, nB.y);
            const tl = wall.tloustka * this.PX_PER_M / 2;

            if (dist < tl + 5 && dist < bestDist) {
                bestDist = dist;
                best = wall;
            }
        }
        return best;
    }

    /** Najdi node nejbližší bodu */
    findNodeAt(x, y, maxDist = 15) {
        let best = null;
        let bestDist = maxDist;

        for (const node of this.nodes.values()) {
            const dist = Math.hypot(x - node.x, y - node.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = node;
            }
        }
        return best;
    }

    _pointToSegmentDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);

        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.hypot(px - projX, py - projY);
    }

    /** Vrátí stěny jejichž OBA konce leží uvnitř obdélníku */
    findInRect(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);

        const walls = [];
        for (const wall of this.walls.values()) {
            const nA = this.nodes.get(wall.nodeA);
            const nB = this.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            if (nA.x >= minX && nA.x <= maxX && nA.y >= minY && nA.y <= maxY &&
                nB.x >= minX && nB.x <= maxX && nB.y >= minY && nB.y <= maxY) {
                walls.push(wall);
            }
        }
        return walls;
    }

    /** Vrátí stěny jejichž OBA konce leží uvnitř polygonu (4 rohy screen obdélníku v world space) */
    findInPolygon(corners) {
        const walls = [];
        for (const wall of this.walls.values()) {
            const nA = this.nodes.get(wall.nodeA);
            const nB = this.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            if (this._pointInPolygon(nA.x, nA.y, corners) && this._pointInPolygon(nB.x, nB.y, corners)) {
                walls.push(wall);
            }
        }
        return walls;
    }

    _pointInPolygon(px, py, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    /** Vrátí stats pro panel objektů */
    getObjectList() {
        const list = [];
        let wallNum = 1;
        for (const wall of this.walls.values()) {
            const delka = this.getWallLength(wall.id);
            const typDef = TYPY_STEN[wall.typ] || {};
            const typNazev = typDef.nazev || wall.typ;
            list.push({
                id: wall.id,
                type: 'wall',
                wallTyp: wall.typ,
                nazev: wall.nazev || (typNazev + ' ' + wallNum),
                info: delka.toFixed(1) + 'm · ' + (wall.tloustka * 100).toFixed(0) + 'cm',
            });
            wallNum++;
        }
        let openingNum = 1;
        for (const opening of this.openings.values()) {
            const otvorDef = TYPY_OTVORU[opening.typ] || {};
            const typNazev = otvorDef.nazev || opening.typ;
            list.push({
                id: opening.id,
                type: 'opening',
                nazev: opening.nazev || (typNazev + ' ' + openingNum),
                info: (Math.round((opening.sirka || 0) * 100) / 100) + ' m',
            });
            openingNum++;
        }
        return list;
    }
}

// Export pro použití v prohlížeči
if (typeof window !== 'undefined') {
    window.StavebniEngine = StavebniEngine;
    window.TYPY_STEN = TYPY_STEN;
    window.TYPY_OTVORU = TYPY_OTVORU;
    window.TYPY_PLOCH = TYPY_PLOCH;
    window.TYPY_STRECHY = TYPY_STRECHY;
    window.TYPY_PRISLUSENSTVI = TYPY_PRISLUSENSTVI;
}

// Export pro Node.js (testovací skripty)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StavebniEngine,
        TYPY_STEN,
        TYPY_OTVORU,
        TYPY_PLOCH,
        TYPY_STRECHY,
        TYPY_PRISLUSENSTVI,
    };
}
