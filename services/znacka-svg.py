"""Vygeneruje vektor značky TupTuDu: písmena Rubik ExtraBold převedená na křivky (HarfBuzz = kerning),
štítek „Tu" se střechou a terénem podle rozhodnutí z 1. 11. 2026. Výstup: SVG tmavé/světlé/jednobarevné + ikona.
Geometrie je stejná jako v artefaktu „Značka TupTuDu, odstupy štítku" (varianta Volný + Skica, vlna výš).
"""
import os
import sys

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

S = os.path.dirname(os.path.abspath(__file__))
VAR = os.path.join(S, 'fonty', 'Rubik-var.ttf')
STATIC = os.path.join(S, 'fonty', 'Rubik-800.ttf')
VYSTUP = sys.argv[1] if len(sys.argv) > 1 else os.path.join(S, 'brand')
os.makedirs(VYSTUP, exist_ok=True)

# --- rozhodnutá geometrie (v em) ---
UP, EAVE, DOWN, SIDE, GAP, R = 0.36, 0.08, 0.22, 0.18, 0.06, 0.10
DROPL, STEP, WX, WW, RISE, LEAD = 0.03, 0.07, 0.48, 0.18, 0.20, 0.005
LETTER_SPACING = -0.01

BARVY = {
    'tmave': {'g': '#a9b4c6', 'o': '#ff8a2b', 'ink': '#141a24'},   # na tmavém pozadí (výchozí)
    'svetle': {'g': '#52607a', 'o': '#ee6f12', 'ink': '#ffffff'},  # na světlém pozadí
    'mono-tmave': {'g': '#ffffff', 'o': '#ffffff', 'ink': '#141a24'},  # jednobarevná bílá (tisk, razítko)
    'mono-svetle': {'g': '#1b2330', 'o': '#1b2330', 'ink': '#ffffff'},
}

# 1) statická instance Rubik 800
if not os.path.exists(STATIC):
    vf = TTFont(VAR)
    instancer.instantiateVariableFont(vf, {'wght': 800}, inplace=True)
    vf.save(STATIC)
font = TTFont(STATIC)
UPM = font['head'].unitsPerEm
CAP = font['OS/2'].sCapHeight
glyph_set = font.getGlyphSet()
glyph_order = font.getGlyphOrder()

blob = hb.Blob.from_file_path(STATIC)
face = hb.Face(blob)
hbfont = hb.Font(face)
hbfont.scale = (UPM, UPM)


def tvaruj(text):
    """Vrátí [(glyph_name, x, advance)] a celkovou šířku, s kerningem a letter-spacingem."""
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {'kern': True, 'liga': True})
    x = 0
    out = []
    ls = LETTER_SPACING * UPM
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        out.append((glyph_order[info.codepoint], x + pos.x_offset, pos.x_advance))
        x += pos.x_advance + ls
    return out, x - ls  # poslední mezera se nepřičítá


def cesta(glyfy, dx):
    """SVG path pro seznam glyfů posunutých o dx (y převráceno: SVG roste dolů)."""
    pen = SVGPathPen(glyph_set)
    for name, x, _ in glyfy:
        tp = TransformPen(pen, (1, 0, 0, -1, dx + x, 0))
        glyph_set[name].draw(tp)
    return pen.getCommands()


em = UPM
tup, w_tup = tvaruj('Tup')
tu, w_tu = tvaruj('Tu')
du, w_du = tvaruj('Du')

# rozvržení: Tup | gap | [side Tu side] | gap | Du   (vše na společném účaří y = 0)
x_tup = 0
x_box0 = w_tup + GAP * em              # levý okraj štítku (vč. vnitřního odstupu)
x_tu = x_box0 + SIDE * em
x_box1 = x_tu + w_tu + SIDE * em
x_du = x_box1 + GAP * em
w_total = x_du + w_du

# štítek — stejná konstrukce jako draw() v artefaktu (souřadnice SVG, účaří 0, nahoru záporně)
r = R * em
x0, x1 = x_box0, x_box1
w = x1 - x0
xl, xr, xm = x0 + r, x1 - r, (x0 + x1) / 2
capTop = -CAP
yEave, yPeak = capTop - EAVE * em, capTop - UP * em
yB = DOWN * em - r
yR = yB - RISE * em
yL2 = yB + DROPL * em
yTop = yL2 - STEP * em
ww = w * WW
xs = x0 + w * (WX + WW / 2)
xe = x0 + w * (WX - WW / 2)
ld = LEAD * em


def f(v):
    return f'{v:.1f}'


stitek = (
    f'M{f(xl)} {f(yEave + r)} L{f(xm)} {f(yPeak + r)} L{f(xr)} {f(yEave + r)} V{f(yR)}'
    f' C{f(xr - (xr - xs) * 0.35)} {f(yR + (yTop - yR) * 0.35)},{f(xs + (xr - xs) * 0.12)} {f(yTop)},{f(xs)} {f(yTop)}'
    f' C{f(xs - ww * 0.5)} {f(yTop)},{f(xe + ww * 0.5)} {f(yL2)},{f(xe)} {f(yL2)}'
    f' L{f(xl)} {f(yL2 - ld)} Z'
)

# ohraničení: nahoře špička střechy (minus stroke), dole spodek štítku nebo dotah písmen
descender = -font['hhea'].descent  # kladné číslo
top = yPeak            # špička střechy po započtení stroke (yPeak + r - r)
bottom = max(yL2 + r, descender)
okraj = 0.08 * em


def svg(barvy, jen_stitek=False):
    g, o, ink = barvy['g'], barvy['o'], barvy['ink']
    if jen_stitek:
        vx, vy, vw, vh = x0 - okraj, top - okraj, w + 2 * okraj, (yL2 + r) - top + 2 * okraj
        # ikona: čtvercový viewBox kolem štítku
        side = max(vw, vh)
        vx -= (side - vw) / 2
        vy -= (side - vh) / 2
        vw = vh = side
    else:
        vx, vy, vw, vh = -okraj, top - okraj, w_total + 2 * okraj, bottom - top + 2 * okraj
    casti = []
    if not jen_stitek:
        casti.append(f'<path fill="{g}" d="{cesta(tup, x_tup)}"/>')
        casti.append(f'<path fill="{g}" d="{cesta(du, x_du)}"/>')
    casti.append(f'<path fill="{o}" stroke="{o}" stroke-width="{f(2 * r)}" stroke-linejoin="round" d="{stitek}"/>')
    casti.append(f'<path fill="{ink}" d="{cesta(tu, x_tu)}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(vx)} {f(vy)} {f(vw)} {f(vh)}" role="img" aria-label="TupTuDu">\n'
            + '\n'.join(casti) + '\n</svg>\n')


for nazev, barvy in BARVY.items():
    with open(os.path.join(VYSTUP, f'znacka-{nazev}.svg'), 'w', encoding='utf-8') as fh:
        fh.write(svg(barvy))
for nazev in ('tmave', 'svetle'):
    with open(os.path.join(VYSTUP, f'ikona-{nazev}.svg'), 'w', encoding='utf-8') as fh:
        fh.write(svg(BARVY[nazev], jen_stitek=True))

print(f'UPM {UPM}, cap {CAP}, šířka značky {w_total:.0f} jednotek, poměr {w_total / (bottom - top):.3f}:1')
print('zapsáno do', VYSTUP, ':', sorted(os.listdir(VYSTUP)))
