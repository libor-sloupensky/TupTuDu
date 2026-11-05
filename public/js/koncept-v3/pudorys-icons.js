/**
 * Ikony pro Půdorys vybavení a názvy místností podle jazyka.
 * Používá se v /masterteam/vyvoj/pudorys a /vyvoj/koncept detail view.
 *
 * Každá ikona = Konva.Shape se sceneFunc, který kreslí canonical tvar
 * do bbox objektu (scaled podle reálné velikosti v metrech).
 */
(function () {
    'use strict';

    // Texty jsou v lang/*/ed_kresba.php. V Node slovník není a tx vrací klíč.
    const tx = (k, p) => (typeof preloz === 'function' ? preloz(k, p) : k);

    // ─── Názvy typů místností podle jazyka ──────────────────
    var ROOM_CZ = {
        // Hlavní typy
        Bedroom: tx('ed_kresba.prostor_loznice'),
        LivingRoom: tx('ed_kresba.prostor_obyvak'),
        Kitchen: tx('ed_kresba.prostor_kuchyne'),
        Bath: tx('ed_kresba.prostor_koupelna'),
        Dining: tx('ed_kresba.prostor_jidelna'),
        Entry: tx('ed_kresba.prostor_vstup'),
        Hall: tx('ed_kresba.prostor_hala'),
        Storage: tx('ed_kresba.prostor_sklad'),
        Closet: tx('ed_kresba.prostor_satna'),
        Utility: tx('ed_kresba.prostor_technicka'),
        Sauna: tx('ed_kresba.prostor_sauna'),
        Den: tx('ed_kresba.prostor_pracovna'),
        DressingRoom: tx('ed_kresba.prostor_satna'),
        TechnicalRoom: tx('ed_kresba.prostor_technicka_mistnost'),
        Room: tx('ed_kresba.prostor_pokoj'),
        Basement: tx('ed_kresba.prostor_suteren'),
        Library: tx('ed_kresba.prostor_knihovna'),
        Alcove: tx('ed_kresba.prostor_vyklenek'),
        DraughtLobby: tx('ed_kresba.prostor_zadveri'),
        // Venkovní
        Outdoor: tx('ed_kresba.prostor_venkovni'),
        CarPort: tx('ed_kresba.prostor_pristresek'),
        Garage: tx('ed_kresba.prostor_garaz'),
        // Ostatní
        Undefined: '—',
        UserDefined: '—',
    };

    // Podtypy — upřesnění názvu
    var SUBTYPE_CZ = {
        Terrace: tx('ed_kresba.typ_plocha_terasa'),
        Balcony: tx('ed_kresba.prostor_balkon'),
        Porch: tx('ed_kresba.prostor_veranda'),
        Garden: tx('ed_kresba.prostor_zahrada'),
        CoveredArea: tx('ed_kresba.prostor_kryta_plocha'),
        Patio: tx('ed_kresba.prostor_patio'),
        Glazed: tx('ed_kresba.podtyp_zasklene'),
        Shower: tx('ed_kresba.prostor_sprcha'),
        WalkIn: tx('ed_kresba.prostor_satna'),
        Lobby: tx('ed_kresba.prostor_vestibul'),
        Corridor: tx('ed_kresba.prostor_chodba'),
        Laundry: tx('ed_kresba.prostor_pradelna'),
        Kitchenette: tx('ed_kresba.prostor_kuchynsky_kout'),
        Scullery: tx('ed_kresba.prostor_spiz'),
        Open: tx('ed_kresba.podtyp_otevrena'),
        Fireplace: tx('ed_kresba.podtyp_s_krbem'),
        Boiler: tx('ed_kresba.prostor_kotelna'),
        Oil: tx('ed_kresba.podtyp_olej'),
    };

    function roomLabelCz(prostor) {
        var p = prostor.podtyp;
        var t = prostor.typ;
        // Speciální kombinace
        if (p === 'Terrace') return SUBTYPE_CZ.Terrace;
        if (p === 'Balcony') return SUBTYPE_CZ.Balcony;
        if (p === 'Porch') return SUBTYPE_CZ.Porch;
        if (p === 'Garden') return SUBTYPE_CZ.Garden;
        if (p === 'Patio') return SUBTYPE_CZ.Patio;
        if (p === 'Shower') return SUBTYPE_CZ.Shower;
        if (p === 'WalkIn') return SUBTYPE_CZ.WalkIn;
        if (p === 'Lobby') return SUBTYPE_CZ.Lobby;
        if (p === 'Corridor') return SUBTYPE_CZ.Corridor;
        if (p === 'Laundry') return SUBTYPE_CZ.Laundry;
        if (p === 'Kitchenette') return SUBTYPE_CZ.Kitchenette;
        // Fallback — primární typ + případný podtyp v závorkách
        var base = ROOM_CZ[t] || t || '—';
        if (p && SUBTYPE_CZ[p]) return base + ' ' + SUBTYPE_CZ[p];
        return base;
    }

    // ─── BBOX z polygonu ────────────────────────────────────
    function bboxFromPolygon(poly, PX_PER_M) {
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        poly.forEach(function (p) {
            var x = p[0] * PX_PER_M, y = -p[1] * PX_PER_M;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
        });
        return { minX: minX, minY: minY, maxX: maxX, maxY: maxY,
                 w: maxX - minX, h: maxY - minY,
                 cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
    }

    // ─── Icon drawers ────────────────────────────────────────
    // Každá funkce dostane (ctx, bb) a kreslí ikonu v bboxu.
    // Konvence: ctx.beginPath() / ctx.moveTo / atd. — pak ctx.stroke() nebo fill()
    // Stroke/fill řeší sceneFunc výše — my jen kreslíme cesty.

    // WC — nádrž patří ke zdi. Parser garantuje, že zadniStrana je na jedné
    // ze dvou KRATŠÍCH stran bboxu (té nejbližší ke stěně).
    function drawToilet(ctx, bb, zadniStrana) {
        var isPortrait = bb.h >= bb.w;
        var side = zadniStrana;
        // Ochrana pokud parser zadniStranu nedodal
        if (isPortrait && side !== 'north' && side !== 'south') side = 'north';
        if (!isPortrait && side !== 'west' && side !== 'east') side = 'west';
        var tankRatio = 0.30;
        if (side === 'north') {
            var tankH = bb.h * tankRatio;
            ctx.beginPath();
            ctx.rect(bb.minX + bb.w * 0.15, bb.minY, bb.w * 0.70, tankH);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(bb.cx, bb.minY + tankH + (bb.h - tankH) / 2,
                        bb.w * 0.48, (bb.h - tankH) * 0.48, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (side === 'south') {
            var tankH2 = bb.h * tankRatio;
            ctx.beginPath();
            ctx.rect(bb.minX + bb.w * 0.15, bb.maxY - tankH2, bb.w * 0.70, tankH2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(bb.cx, bb.minY + (bb.h - tankH2) / 2,
                        bb.w * 0.48, (bb.h - tankH2) * 0.48, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (side === 'west') {
            var tankW = bb.w * tankRatio;
            ctx.beginPath();
            ctx.rect(bb.minX, bb.minY + bb.h * 0.15, tankW, bb.h * 0.70);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(bb.minX + tankW + (bb.w - tankW) / 2, bb.cy,
                        (bb.w - tankW) * 0.48, bb.h * 0.48, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {  // east
            var tankW2 = bb.w * tankRatio;
            ctx.beginPath();
            ctx.rect(bb.maxX - tankW2, bb.minY + bb.h * 0.15, tankW2, bb.h * 0.70);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(bb.minX + (bb.w - tankW2) / 2, bb.cy,
                        (bb.w - tankW2) * 0.48, bb.h * 0.48, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function drawSink(ctx, bb) {
        // Obdélníkový dřez s vnitřní prohloubeninou + malý kroužek (odtok)
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        // Vnitřek — mírně menší
        ctx.beginPath();
        var pad = Math.min(bb.w, bb.h) * 0.12;
        ctx.rect(bb.minX + pad, bb.minY + pad, bb.w - 2 * pad, bb.h - 2 * pad);
        ctx.stroke();
        // Odtok
        ctx.beginPath();
        ctx.arc(bb.cx, bb.cy, Math.min(bb.w, bb.h) * 0.08, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawRoundSink(ctx, bb) {
        // Kulaté umyvadlo
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(bb.cx, bb.cy, bb.w * 0.40, bb.h * 0.40, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bb.cx, bb.cy, Math.min(bb.w, bb.h) * 0.08, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawDoubleSink(ctx, bb) {
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        var portrait = bb.h > bb.w;
        var pad = Math.min(bb.w, bb.h) * 0.10;
        if (portrait) {
            // dvě vaničky nad sebou
            var halfH = (bb.h - 3 * pad) / 2;
            ctx.beginPath();
            ctx.rect(bb.minX + pad, bb.minY + pad, bb.w - 2 * pad, halfH);
            ctx.stroke();
            ctx.beginPath();
            ctx.rect(bb.minX + pad, bb.minY + 2 * pad + halfH, bb.w - 2 * pad, halfH);
            ctx.stroke();
        } else {
            var halfW = (bb.w - 3 * pad) / 2;
            ctx.beginPath();
            ctx.rect(bb.minX + pad, bb.minY + pad, halfW, bb.h - 2 * pad);
            ctx.stroke();
            ctx.beginPath();
            ctx.rect(bb.minX + 2 * pad + halfW, bb.minY + pad, halfW, bb.h - 2 * pad);
            ctx.stroke();
        }
    }

    function drawBathtub(ctx, bb) {
        // Zaoblený obdélník — vnější tvar + menší vnitřní
        var r = Math.min(bb.w, bb.h) * 0.15;
        drawRoundedRect(ctx, bb.minX, bb.minY, bb.w, bb.h, r);
        var pad = Math.min(bb.w, bb.h) * 0.15;
        drawRoundedRect(ctx, bb.minX + pad, bb.minY + pad,
                        bb.w - 2 * pad, bb.h - 2 * pad, r * 0.7);
    }

    function drawShower(ctx, bb) {
        // Čtverec s diagonálami (X) — symbol sprchy
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bb.minX, bb.minY);
        ctx.lineTo(bb.maxX, bb.maxY);
        ctx.moveTo(bb.maxX, bb.minY);
        ctx.lineTo(bb.minX, bb.maxY);
        ctx.stroke();
        // Malý kruh uprostřed (sítko)
        ctx.beginPath();
        ctx.arc(bb.cx, bb.cy, Math.min(bb.w, bb.h) * 0.10, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawShowerScreen(ctx, bb) {
        // Jen obdélník s tlustou čárou (skleněná zástěna)
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
    }

    function drawRefrigerator(ctx, bb) {
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        // Vodorovná čára (lednice + mrazák)
        ctx.beginPath();
        ctx.moveTo(bb.minX, bb.minY + bb.h * 0.32);
        ctx.lineTo(bb.maxX, bb.minY + bb.h * 0.32);
        ctx.stroke();
        // Sněhová vločka uprostřed dolní (lednicové) části
        var size = Math.min(bb.w, bb.h) * 0.18;
        var flakeX = bb.cx;
        var flakeY = bb.minY + bb.h * 0.62;
        drawSnowflake(ctx, flakeX, flakeY, size);
    }

    // Sněhová vločka — 6 paprsků, každý s malými bočními vidličkami
    function drawSnowflake(ctx, cx, cy, r) {
        ctx.save();
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
            var angle = (Math.PI / 3) * i;
            var endX = cx + Math.cos(angle) * r;
            var endY = cy + Math.sin(angle) * r;
            ctx.moveTo(cx, cy);
            ctx.lineTo(endX, endY);
            // Dvě malé vidličky v 60% délky paprsku
            var forkX = cx + Math.cos(angle) * r * 0.6;
            var forkY = cy + Math.sin(angle) * r * 0.6;
            var forkLen = r * 0.25;
            for (var s = -1; s <= 1; s += 2) {
                var fa = angle + s * Math.PI / 4;
                ctx.moveTo(forkX, forkY);
                ctx.lineTo(forkX + Math.cos(fa) * forkLen,
                           forkY + Math.sin(fa) * forkLen);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    // Obecný spotřebič — čtverec + symbol blesku
    function drawGenericAppliance(ctx, bb) {
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        // Blesk (lightning bolt)
        var cx = bb.cx, cy = bb.cy;
        var hh = Math.min(bb.w, bb.h) * 0.22;
        var hw = hh * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx - hw * 0.3, cy - hh);
        ctx.lineTo(cx - hw, cy + hh * 0.1);
        ctx.lineTo(cx - hw * 0.1, cy + hh * 0.1);
        ctx.lineTo(cx + hw * 0.3, cy + hh);
        ctx.lineTo(cx + hw, cy - hh * 0.1);
        ctx.lineTo(cx + hw * 0.1, cy - hh * 0.1);
        ctx.closePath();
        ctx.stroke();
    }

    function drawStove(ctx, bb) {
        // Čtverec + 4 plotýnky (kruhy)
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        var r = Math.min(bb.w, bb.h) * 0.18;
        var ox = bb.w * 0.25, oy = bb.h * 0.25;
        [[bb.cx - ox, bb.cy - oy], [bb.cx + ox, bb.cy - oy],
         [bb.cx - ox, bb.cy + oy], [bb.cx + ox, bb.cy + oy]].forEach(function (p) {
            ctx.beginPath();
            ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
            ctx.stroke();
        });
    }

    function drawWashingMachine(ctx, bb) {
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        // Velký kruh — buben
        ctx.beginPath();
        ctx.arc(bb.cx, bb.cy + bb.h * 0.08, Math.min(bb.w, bb.h) * 0.32, 0, Math.PI * 2);
        ctx.stroke();
        // Menší kruh uvnitř
        ctx.beginPath();
        ctx.arc(bb.cx, bb.cy + bb.h * 0.08, Math.min(bb.w, bb.h) * 0.18, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawDishwasher(ctx, bb) {
        // Obdélník + vodorovné čárky (lamely)
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        for (var i = 1; i < 4; i++) {
            var y = bb.minY + (bb.h / 4) * i;
            ctx.beginPath();
            ctx.moveTo(bb.minX + bb.w * 0.15, y);
            ctx.lineTo(bb.maxX - bb.w * 0.15, y);
            ctx.stroke();
        }
    }

    function drawCabinet(ctx, bb) {
        // Obdélník (dolní skříňka)
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
    }

    function drawWallCabinet(ctx, bb) {
        // Čárkovaný obdélník (horní skříňka — nad podlahou)
        ctx.save();
        if (ctx.setLineDash) ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        if (ctx.setLineDash) ctx.setLineDash([]);
        ctx.restore();
    }

    function drawCloset(ctx, bb) {
        // Obdélník + diagonála (univerzální symbol skříně)
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bb.minX, bb.minY);
        ctx.lineTo(bb.maxX, bb.maxY);
        ctx.stroke();
    }

    // Symbol plamene — drop-like tvar s zakřivenými stranami
    function drawFlame(ctx, cx, cy, size) {
        // Stylizovaný plamen (Material-design style) — špička nahoře,
        // hlavní masa vpravo dole, charakteristický "háček" vlevo dole,
        // kde se plamen jakoby zavíjí dovnitř.
        ctx.beginPath();
        // Horní špička
        ctx.moveTo(cx + size * 0.05, cy - size);
        // Pravá strana — plynule ven a dolů (hlavní bok plamene)
        ctx.bezierCurveTo(
            cx + size * 0.55, cy - size * 0.35,
            cx + size * 0.75, cy + size * 0.15,
            cx + size * 0.55, cy + size * 0.60
        );
        // Spodní oblouk — zaoblené dno, plynule k levému háčku
        ctx.bezierCurveTo(
            cx + size * 0.30, cy + size * 0.95,
            cx - size * 0.45, cy + size * 0.95,
            cx - size * 0.65, cy + size * 0.45
        );
        // Levá strana — výrazný háček dovnitř (zatočení plamene)
        ctx.bezierCurveTo(
            cx - size * 0.80, cy + size * 0.05,
            cx - size * 0.20, cy - size * 0.10,
            cx - size * 0.10, cy - size * 0.45
        );
        // Návrat ke špičce
        ctx.bezierCurveTo(
            cx - size * 0.05, cy - size * 0.70,
            cx - size * 0.05, cy - size * 0.90,
            cx + size * 0.05, cy - size
        );
        ctx.closePath();
        ctx.stroke();
    }

    function drawFireplace(ctx, bb) {
        // Obdélník (obrys krbu) + plamen uprostřed
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        var size = Math.min(bb.w, bb.h) * 0.30;
        drawFlame(ctx, bb.cx, bb.cy, size);
    }

    function drawSaunaBench(ctx, bb) {
        // Obdélník + příčné čárky (dřevěné lamely)
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        var portrait = bb.h > bb.w;
        var n = 5;
        for (var i = 1; i < n; i++) {
            ctx.beginPath();
            if (portrait) {
                var y = bb.minY + (bb.h / n) * i;
                ctx.moveTo(bb.minX, y);
                ctx.lineTo(bb.maxX, y);
            } else {
                var x = bb.minX + (bb.w / n) * i;
                ctx.moveTo(x, bb.minY);
                ctx.lineTo(x, bb.maxY);
            }
            ctx.stroke();
        }
    }

    function drawSaunaStove(ctx, bb) {
        // Malý obdélník + vlnovka (horké kameny)
        ctx.beginPath();
        ctx.rect(bb.minX, bb.minY, bb.w, bb.h);
        ctx.stroke();
        // Vlnky
        ctx.beginPath();
        var wx = bb.w / 4;
        var wy = bb.h * 0.5;
        ctx.moveTo(bb.minX + wx * 0.5, bb.cy);
        ctx.quadraticCurveTo(bb.minX + wx, bb.cy - bb.h * 0.15, bb.minX + wx * 1.5, bb.cy);
        ctx.quadraticCurveTo(bb.minX + wx * 2, bb.cy + bb.h * 0.15, bb.minX + wx * 2.5, bb.cy);
        ctx.quadraticCurveTo(bb.minX + wx * 3, bb.cy - bb.h * 0.15, bb.minX + wx * 3.5, bb.cy);
        ctx.stroke();
    }

    // Pomocná: zaoblený obdélník
    function drawRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.stroke();
    }

    // ─── Dispatcher: pro daný typ/podtyp zvol funkci ikon ─────
    function pickDrawer(vyb) {
        var t = vyb.typ;
        var sub = vyb.podtyp;
        if (t === 'Toilet') return drawToilet;
        if (t === 'Sink') return drawSink;
        if (t === 'RoundSink') return drawRoundSink;
        if (t === 'DoubleSink' || t === 'DoubleSinkRight') return drawDoubleSink;
        if (t === 'Bathtub') return drawBathtub;
        if (t === 'Shower' || t === 'ShowerCab') return drawShower;
        if (t === 'ShowerScreen') return drawShowerScreen;
        if (t === 'BaseCabinet' || t === 'BaseCabinetTriangle') return drawCabinet;
        if (t === 'WallCabinet') return drawWallCabinet;
        if (t === 'Closet' || t === 'CoatCloset' || t === 'CoatRack') return drawCloset;
        if (t === 'Fireplace' || t === 'FireplaceCorner' || t === 'FireplaceRound'
            || t === 'WoodStove' || t === 'Chimney' || t === 'PlaceForFireplace') return drawFireplace;
        if (t === 'SaunaBench' || t === 'SaunaBenchMid' || t === 'SaunaBenchHigh'
            || t === 'SaunaBenchLow') return drawSaunaBench;
        if (t === 'ElectricalAppliance') {
            if (sub === 'Refrigerator') return drawRefrigerator;
            if (sub === 'IntegratedStove') return drawStove;
            if (sub === 'SaunaStove') return drawSaunaStove;
            if (sub === 'WashingMachine') return drawWashingMachine;
            if (sub === 'Dishwasher' || sub === 'TumbleDryer') return drawDishwasher;
            // Generic nebo neznámý podtyp (SpaceForAppliance, GEARound, Heater)
            return drawGenericAppliance;
        }
        return drawCabinet;
    }

    // ─── Symbol-only drawer (bez vnějšího obdélníku) ─────────
    // Pro non-rect polygony (pentagony rohových krbů atd.): vnější tvar
    // už kreslíme z polygonu, jen potřebujeme ikonu uvnitř.
    function drawInnerSymbol(ctx, bb, v) {
        var t = v.typ;
        var sub = v.podtyp;
        var minDim = Math.min(bb.w, bb.h);
        var s = minDim * 0.30;

        // Krby / topeniště — plamen
        if (t === 'Fireplace' || t === 'FireplaceCorner' || t === 'FireplaceRound'
            || t === 'WoodStove' || t === 'PlaceForFireplace') {
            drawFlame(ctx, bb.cx, bb.cy, s);
            return;
        }
        // WC
        if (t === 'Toilet') {
            drawToilet(ctx, bb, v.zadni_strana);
            return;
        }
        // Lednice
        if (t === 'ElectricalAppliance' && sub === 'Refrigerator') {
            // Jen vločka, bez dveřních čar
            drawSnowflake(ctx, bb.cx, bb.cy, s * 0.7);
            return;
        }
        // Sporák
        if (t === 'ElectricalAppliance' && sub === 'IntegratedStove') {
            var r = minDim * 0.15;
            var ox = bb.w * 0.20, oy = bb.h * 0.20;
            [[bb.cx - ox, bb.cy - oy], [bb.cx + ox, bb.cy - oy],
             [bb.cx - ox, bb.cy + oy], [bb.cx + ox, bb.cy + oy]].forEach(function (p) {
                ctx.beginPath();
                ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
                ctx.stroke();
            });
            return;
        }
        // Pračka / myčka — kruh
        if (t === 'ElectricalAppliance' && (sub === 'WashingMachine' || sub === 'Dishwasher')) {
            ctx.beginPath();
            ctx.arc(bb.cx, bb.cy, minDim * 0.25, 0, Math.PI * 2);
            ctx.stroke();
            return;
        }
        // Sauna stove — vlnovky
        if (t === 'ElectricalAppliance' && sub === 'SaunaStove') {
            ctx.beginPath();
            var wx = bb.w / 4;
            ctx.moveTo(bb.minX + wx * 0.5, bb.cy);
            ctx.quadraticCurveTo(bb.minX + wx, bb.cy - bb.h * 0.15, bb.minX + wx * 1.5, bb.cy);
            ctx.quadraticCurveTo(bb.minX + wx * 2, bb.cy + bb.h * 0.15, bb.minX + wx * 2.5, bb.cy);
            ctx.quadraticCurveTo(bb.minX + wx * 3, bb.cy - bb.h * 0.15, bb.minX + wx * 3.5, bb.cy);
            ctx.stroke();
            return;
        }
        // Obecný spotřebič — blesk
        if (t === 'ElectricalAppliance') {
            var hh = minDim * 0.22;
            var hw = hh * 0.4;
            ctx.beginPath();
            ctx.moveTo(bb.cx - hw * 0.3, bb.cy - hh);
            ctx.lineTo(bb.cx - hw, bb.cy + hh * 0.1);
            ctx.lineTo(bb.cx - hw * 0.1, bb.cy + hh * 0.1);
            ctx.lineTo(bb.cx + hw * 0.3, bb.cy + hh);
            ctx.lineTo(bb.cx + hw, bb.cy - hh * 0.1);
            ctx.lineTo(bb.cx + hw * 0.1, bb.cy - hh * 0.1);
            ctx.closePath();
            ctx.stroke();
            return;
        }
        // Umyvadlo — kruh odtoku
        if (t === 'Sink' || t === 'RoundSink') {
            ctx.beginPath();
            ctx.arc(bb.cx, bb.cy, minDim * 0.10, 0, Math.PI * 2);
            ctx.stroke();
            return;
        }
        // Closet / skříň — diagonála
        if (t === 'Closet' || t === 'CoatCloset') {
            ctx.beginPath();
            ctx.moveTo(bb.minX + bb.w * 0.1, bb.minY + bb.h * 0.1);
            ctx.lineTo(bb.maxX - bb.w * 0.1, bb.maxY - bb.h * 0.1);
            ctx.stroke();
            return;
        }
        // Ostatní: bez symbolu (jen polygon obrys je už nakreslen)
    }

    // ─── Barvy pozadí dle kategorie ──────────────────────────
    var KAT_BG = {
        kuchyn: '#fef3c7', koupelna: '#dbeafe',
        uloziste: '#fef9c3', topeni: '#fecaca',
        sauna: '#fed7aa', ostatni: '#f3f4f6',
    };

    // ─── Popis typu vybavení podle jazyka (pro tooltip) ──────
    var FURNITURE_CZ = {
        Toilet: tx('ed_kresba.vybaveni_wc'), Sink: tx('ed_kresba.vybaveni_umyvadlo'), RoundSink: tx('ed_kresba.vybaveni_kulate_umyvadlo'),
        DoubleSink: tx('ed_kresba.vybaveni_dvojity_drez'), DoubleSinkRight: tx('ed_kresba.vybaveni_dvojity_drez_p'),
        Bathtub: tx('ed_kresba.vybaveni_vana'), Shower: tx('ed_kresba.prostor_sprcha'), ShowerCab: tx('ed_kresba.vybaveni_sprchovy_kout'),
        ShowerScreen: tx('ed_kresba.vybaveni_sprchova_zastena'), WaterTap: tx('ed_kresba.vybaveni_kohout'),
        BaseCabinet: tx('ed_kresba.vybaveni_spodni_skrinka'), WallCabinet: tx('ed_kresba.vybaveni_horni_skrinka'),
        BaseCabinetTriangle: tx('ed_kresba.vybaveni_rohova_skrinka'),
        Closet: tx('ed_kresba.vybaveni_skrin'), CoatCloset: tx('ed_kresba.vybaveni_satni_skrin'), CoatRack: tx('ed_kresba.vybaveni_vesak'),
        Fireplace: tx('ed_kresba.vybaveni_krb'), FireplaceCorner: tx('ed_kresba.vybaveni_rohovy_krb'),
        FireplaceRound: tx('ed_kresba.vybaveni_kulaty_krb'), WoodStove: tx('ed_kresba.vybaveni_krbova_kamna'),
        Chimney: tx('ed_kresba.typ_prisl_komin'), PlaceForFireplace: tx('ed_kresba.vybaveni_misto_pro_krb'),
        SaunaBench: tx('ed_kresba.vybaveni_saunova_lavice'), SaunaBenchMid: tx('ed_kresba.vybaveni_lavice_stred'),
        SaunaBenchHigh: tx('ed_kresba.vybaveni_lavice_horni'), SaunaBenchLow: tx('ed_kresba.vybaveni_lavice_dolni'),
        Housing: tx('ed_kresba.vybaveni_skrin_zabudovana'), Misc: tx('ed_kresba.vybaveni_ostatni'),
        ElectricalAppliance: tx('ed_kresba.vybaveni_spotrebic'),
    };
    var ELAPPLIANCE_CZ = {
        Refrigerator: tx('ed_kresba.vybaveni_lednice'), IntegratedStove: tx('ed_kresba.vybaveni_sporak'),
        SaunaStove: tx('ed_kresba.vybaveni_kamna_do_sauny'), WashingMachine: tx('ed_kresba.vybaveni_pracka'),
        Dishwasher: tx('ed_kresba.vybaveni_mycka'), TumbleDryer: tx('ed_kresba.vybaveni_susicka'), Heater: tx('ed_kresba.vybaveni_topeni'),
        SpaceForAppliance: tx('ed_kresba.vybaveni_misto_na_spotrebic'), SpaceForAppliance2: tx('ed_kresba.vybaveni_misto_na_spotrebic'),
        GEARound: tx('ed_kresba.vybaveni_kulaty_spotrebic'),
    };

    // Půdorysné značky kusů z katalogu: obrázek shora, načte se jednou, po načtení se plátno překreslí
    var znacky = {};
    function znackaKatalogu(id) {
        if (!znacky[id]) {
            var img = new Image();
            img.onload = function () { Konva.stages.forEach(function (s) { s.batchDraw(); }); };
            img.src = '/katalog/pudorys/' + id + '.webp';
            znacky[id] = img;
        }
        return znacky[id];
    }

    function furnitureLabelCz(v) {
        if (v.nazev) return v.nazev;
        if (v.typ === 'ElectricalAppliance' && v.podtyp && ELAPPLIANCE_CZ[v.podtyp]) {
            return ELAPPLIANCE_CZ[v.podtyp];
        }
        return FURNITURE_CZ[v.typ] || v.typ;
    }

    // ─── Point-in-polygon test (pro hit detection bez Konva) ─────
    function pointInPolygon(x, y, polygon) {
        // Ray casting algorithm
        var inside = false;
        for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            var xi = polygon[i][0], yi = polygon[i][1];
            var xj = polygon[j][0], yj = polygon[j][1];
            var intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // ─── Veřejné API ─────────────────────────────────────────
    window.PudorysIcons = {
        pointInPolygon: pointInPolygon,
        ROOM_CZ: ROOM_CZ,
        SUBTYPE_CZ: SUBTYPE_CZ,
        FURNITURE_CZ: FURNITURE_CZ,
        ELAPPLIANCE_CZ: ELAPPLIANCE_CZ,
        roomLabelCz: roomLabelCz,
        furnitureLabelCz: furnitureLabelCz,
        bboxFromPolygon: bboxFromPolygon,
        KAT_BG: KAT_BG,
        pickDrawer: pickDrawer,

        /**
         * Vytvořit Konva.Shape pro vybavení s ikonou. Dvojité výstup:
         * - sceneFunc kreslí ikonu + podklad
         * - hitFunc zajišťuje hover pro tooltip
         */
        createFurnitureShape: function (v, PX_PER_M) {
            var bb = bboxFromPolygon(v.polygon, PX_PER_M);
            var drawer = pickDrawer(v);
            // Tvar objektu: 'rect' (default), 'circle', 'polygon'.
            // Fallback pro staré JSONy bez tvar: podle počtu bodů polygonu.
            var tvar = v.tvar || (v.polygon.length !== 4 ? 'polygon' : 'rect');
            var group = new Konva.Group({ listening: true });
            // Plocha pro klik a hover (téměř průhledná) má přesný tvar objektu. Obdélník kolem by byl
            // u otočeného kusu větší než kus a chytal by klik i za jeho hranou.
            var hitBody = [];
            v.polygon.forEach(function (pt) { hitBody.push(pt[0] * PX_PER_M, -pt[1] * PX_PER_M); });
            var hit = new Konva.Line({
                points: hitBody, closed: true,
                fill: '#ffffff', opacity: 0.01,
                listening: true,
            });
            hit.setAttr('_cc_label', furnitureLabelCz(v));
            hit.setAttr('_cc_meta',
                (v.sirka.toFixed(2) + '×' + v.hloubka.toFixed(2) + ' m') +
                (v.vyska ? ', v ' + v.vyska.toFixed(2) + ' m' : ''));
            group.add(hit);

            // Ikona (NE listening, aby nebránila hit rect).
            // Všechny tři větve (rect / circle / polygon) kreslí vnitřní symbol
            // v lokálním rotovaném frame, aby se ikona točila s objektem stejně —
            // bez tohoto sjednocení rotoval například jen rect (hvězdička na lednici),
            // ale plamen v kruhovém krbu zůstával axis-aligned.
            var iconShape = new Konva.Shape({
                sceneFunc: function (ctx, shape) {
                    ctx.strokeStyle = '#374151';
                    ctx.lineWidth = 1;

                    // Centroid objektu = průměr všech bodů polygonu (lépe sleduje
                    // skutečný střed při rotaci než AABB center).
                    var ccx = 0, ccy = 0;
                    for (var i = 0; i < v.polygon.length; i++) {
                        ccx += v.polygon[i][0] * PX_PER_M;
                        ccy += -v.polygon[i][1] * PX_PER_M;
                    }
                    ccx /= v.polygon.length;
                    ccy /= v.polygon.length;

                    // Úhel: primárně z v.uhel (engine ho udržuje při rotaci),
                    // fallback z prvních dvou bodů polygonu (legacy starý nábytek bez uhel).
                    var angRad;
                    if (typeof v.uhel === 'number' && Math.abs(v.uhel) > 1e-6) {
                        angRad = v.uhel * Math.PI / 180;
                    } else if (v.polygon.length >= 2) {
                        var p0 = { x: v.polygon[0][0] * PX_PER_M, y: -v.polygon[0][1] * PX_PER_M };
                        var p1 = { x: v.polygon[1][0] * PX_PER_M, y: -v.polygon[1][1] * PX_PER_M };
                        angRad = Math.atan2(p1.y - p0.y, p1.x - p0.x);
                    } else {
                        angRad = 0;
                    }

                    if (tvar === 'circle') {
                        // Kruhový objekt — obrys je rotačně symetrický, kreslí se v canvas frame.
                        var rx = bb.w / 2, ry = bb.h / 2;
                        ctx.beginPath();
                        ctx.ellipse(ccx, ccy, rx, ry, 0, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.fillStyle = '#ffffff';
                        ctx.fill();
                        ctx.stroke();
                        // Inner symbol v rotovaném lokálním frame.
                        var localBbCircle = { minX: -rx, maxX: rx, minY: -ry, maxY: ry, w: 2 * rx, h: 2 * ry, cx: 0, cy: 0 };
                        ctx.save();
                        ctx.translate(ccx, ccy);
                        ctx.rotate(angRad);
                        drawInnerSymbol(ctx, localBbCircle, v);
                        ctx.restore();
                    } else if (tvar === 'polygon') {
                        // Polygon obrys — body jsou už pootočené, kreslíme přímo.
                        ctx.beginPath();
                        v.polygon.forEach(function (pt, i) {
                            var x = pt[0] * PX_PER_M, y = -pt[1] * PX_PER_M;
                            if (i === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        });
                        ctx.closePath();
                        ctx.fillStyle = '#ffffff';
                        ctx.fill();
                        ctx.stroke();
                        if (v.polygon.length <= 7) {
                            // Inner symbol v rotovaném frame, dimenze z bbox AABB.
                            var halfWP = bb.w / 2, halfHP = bb.h / 2;
                            var localBbPoly = { minX: -halfWP, maxX: halfWP, minY: -halfHP, maxY: halfHP, w: bb.w, h: bb.h, cx: 0, cy: 0 };
                            ctx.save();
                            ctx.translate(ccx, ccy);
                            ctx.rotate(angRad);
                            drawInnerSymbol(ctx, localBbPoly, v);
                            ctx.restore();
                        }
                    } else {
                        // 4-bodový rect — fill + drawer v lokálním rotovaném frame.
                        // Lokální rozměry odvodíme z délek prvních dvou stran polygonu.
                        var pp0 = { x: v.polygon[0][0] * PX_PER_M, y: -v.polygon[0][1] * PX_PER_M };
                        var pp1 = { x: v.polygon[1][0] * PX_PER_M, y: -v.polygon[1][1] * PX_PER_M };
                        var pp3 = { x: v.polygon[3][0] * PX_PER_M, y: -v.polygon[3][1] * PX_PER_M };
                        var localW = Math.hypot(pp1.x - pp0.x, pp1.y - pp0.y);
                        var localH = Math.hypot(pp3.x - pp0.x, pp3.y - pp0.y);
                        var localBb = {
                            minX: -localW / 2, maxX: localW / 2,
                            minY: -localH / 2, maxY: localH / 2,
                            w: localW, h: localH, cx: 0, cy: 0,
                        };
                        ctx.save();
                        ctx.translate(ccx, ccy);
                        ctx.rotate(angRad);
                        if (v.katalog) {
                            var znacka = znackaKatalogu(v.katalog);
                            if (znacka.complete && znacka.naturalWidth) ctx.drawImage(znacka, localBb.minX, localBb.minY, localBb.w, localBb.h);
                            else { ctx.beginPath(); ctx.rect(localBb.minX, localBb.minY, localBb.w, localBb.h); ctx.stroke(); }
                            ctx.restore();
                            return;
                        }
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(localBb.minX, localBb.minY, localBb.w, localBb.h);
                        if (v.typ === 'Toilet') drawer(ctx, localBb, v.zadni_strana);
                        else drawer(ctx, localBb);
                        ctx.restore();
                    }
                },
                listening: false,
            });
            group.add(iconShape);
            return group;
        },

        /**
         * Vytvořit Konva.Text s názvem místnosti.
         */
        createRoomLabel: function (p, PX_PER_M) {
            var bb = bboxFromPolygon(p.polygon, PX_PER_M);
            var label = roomLabelCz(p);
            var plocha = p.plocha_m2 ? p.plocha_m2.toFixed(1) + ' m²' : '';
            var text = label + (plocha ? '\n' + plocha : '');
            var area = bb.w * bb.h;
            var fontSize = Math.max(9, Math.min(16, Math.sqrt(area) / 12));
            return new Konva.Text({
                x: bb.minX, y: bb.cy - fontSize, width: bb.w,
                text: text, fontSize: fontSize,
                fontFamily: 'sans-serif',
                fill: p.venkovni ? '#92400e' : '#374151',
                align: 'center', listening: false,
            });
        },

        /**
         * Interaktivní prostor — neutrální podklad (průhledný), hover zvýrazní.
         * Tooltip se NEzobrazuje (jen highlight).
         */
        createRoomInteractive: function (p, PX_PER_M) {
            var flat = [];
            p.polygon.forEach(function (pt) {
                flat.push(pt[0] * PX_PER_M, -pt[1] * PX_PER_M);
            });
            var shape = new Konva.Line({
                points: flat, closed: true,
                fill: '#ffffff', opacity: 0.01,  // nearly invisible, but hittable
                stroke: null, strokeWidth: 0,
                listening: true,
            });
            shape.setAttr('_cc_room', true);  // flag pro event handler
            return shape;
        },

        /**
         * Vykreslit okno v půdoryse podle 2D konvence:
         * - tloušťka stěny vyjádřená 2 paralelními čarami
         * - středová linka reprezentující sklo
         */
        drawWindowOverlay: function (overlayLayer, o, wall, PX_PER_M) {
            var odX = wall.od[0] * PX_PER_M, odY = -wall.od[1] * PX_PER_M;
            var doX = wall.do[0] * PX_PER_M, doY = -wall.do[1] * PX_PER_M;
            var dx = doX - odX, dy = doY - odY;
            var wlen = Math.hypot(dx, dy);
            if (wlen === 0) return;
            var ux = dx / wlen, uy = dy / wlen;
            var nx = -uy, ny = ux;  // normála
            var tl = (wall.tloustka || 0.15) * PX_PER_M;
            var posPx = o.pozice * PX_PER_M;
            var sirPx = o.sirka * PX_PER_M;

            var aX = odX + ux * posPx;
            var aY = odY + uy * posPx;
            var bX = odX + ux * (posPx + sirPx);
            var bY = odY + uy * (posPx + sirPx);

            // Bílý podklad (zakryje stěnu v otvoru)
            overlayLayer.add(new Konva.Shape({
                sceneFunc: function (ctx, shape) {
                    ctx.beginPath();
                    ctx.moveTo(aX + nx * tl / 2, aY + ny * tl / 2);
                    ctx.lineTo(bX + nx * tl / 2, bY + ny * tl / 2);
                    ctx.lineTo(bX - nx * tl / 2, bY - ny * tl / 2);
                    ctx.lineTo(aX - nx * tl / 2, aY - ny * tl / 2);
                    ctx.closePath();
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                },
                listening: false,
            }));
            // 2 paralelní čáry (okraje otvoru v zdi) + středová (sklo)
            overlayLayer.add(new Konva.Line({
                points: [aX + nx * tl / 2, aY + ny * tl / 2,
                         bX + nx * tl / 2, bY + ny * tl / 2],
                stroke: '#1f2937', strokeWidth: 1,
            }));
            overlayLayer.add(new Konva.Line({
                points: [aX - nx * tl / 2, aY - ny * tl / 2,
                         bX - nx * tl / 2, bY - ny * tl / 2],
                stroke: '#1f2937', strokeWidth: 1,
            }));
            overlayLayer.add(new Konva.Line({
                points: [aX, aY, bX, bY],
                stroke: '#1f2937', strokeWidth: 1.2,
            }));
        },
    };
})();
