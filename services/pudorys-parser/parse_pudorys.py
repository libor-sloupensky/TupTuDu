"""
Půdorys SVG parser → JSON formát kompatibilní s Koncept (steny/otvory).

Výstupní formát (PŘESNĚ jak to očekává StavebniEngine.fromJSON v public/js/stavebni-engine.js):
{
  "steny":  [{ "id", "od": [x, y], "do": [x, y], "tloustka", "typ" }],
  "otvory": [{ "id", "stena": "W1", "pozice", "sirka", "typ" }],
  "metadata": { "source", "original_id", "mistnosti": [...], ... }
}

Kde:
- Souřadnice v METRECH
- y osa INVERTOVANÁ (SVG: y pointing down; Koncept: y pointing up)
- typ stěny: "obvodova" (>0.19m), "nosna" (0.20-0.45m), "pricka" (<0.19m)
- typ otvoru: "dvere", "okno"

Usage:
    python parse_pudorys.py samples/14033/model.svg
    python parse_pudorys.py samples/14033/model.svg --out out.json --pretty
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Iterable

from lxml import etree
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union

SVG_NS = "http://www.w3.org/2000/svg"
MAGNET_PX = 5.0  # tolerance pro slučování uzlů (v pixelech SVG)
PX_TO_M = 0.01   # 1 px = 1 cm (validováno na 50 vzorcích, odchylka < 0.4 %)
PERIMETER_TOL_PX = 10.0  # jak blízko obvodu musí osa stěny být, aby byla "obvodova"

# Venkovní Space typy — ty NEzahrnujeme do obvodu budovy
VENKOVNI_SPACE = {'Outdoor', 'Terrace', 'Balcony', 'CarPort', 'Garage', 'Garden', 'Yard'}


def urc_typ_steny(tloustka_m: float, je_obvodova: bool = False) -> str:
    """
    Odvozeno z public/js/stavebni-engine.js — TYPY_STEN a urcTypSteny().

    Obvodová stěna: 0.20-0.60m  (leží na obvodu budovy)
    Nosná stěna:    0.20-0.45m  (vnitřní, ale tlustá)
    Příčka:         0.05-0.19m  (vnitřní, tenká)
    """
    if tloustka_m < 0.19:
        return "pricka"
    if je_obvodova:
        return "obvodova"
    return "nosna"


def apply_transform(pts, transform_str):
    """Aplikuje SVG transform matrix(a,b,c,d,e,f) na body."""
    if not transform_str or 'matrix' not in transform_str:
        return pts
    import re as _re
    m = _re.match(r'matrix\(([^)]+)\)', transform_str)
    if not m:
        return pts
    vals = [float(x) for x in m.group(1).replace(',', ' ').split()]
    if len(vals) != 6:
        return pts
    a, b, c, d, e, f = vals
    return [(a * x + c * y + e, b * x + d * y + f) for x, y in pts]


def space_polygon_world(space_el):
    """Získat polygon Space v globálních souřadnicích (aplikovat všechny transformy nahoru)."""
    poly_el = space_el.find(f'{{{SVG_NS}}}polygon')
    if poly_el is None:
        return None
    pts_raw = poly_el.get('points', '').replace(',', ' ').split()
    try:
        pts = [(float(pts_raw[i]), float(pts_raw[i + 1])) for i in range(0, len(pts_raw) - 1, 2)]
    except (ValueError, IndexError):
        return None
    if len(pts) < 3:
        return None

    el = poly_el
    while el is not None:
        t = el.get('transform')
        if t:
            pts = apply_transform(pts, t)
        el = el.getparent()
    return pts


def parse_path_bbox_points(d: str) -> list[tuple[float, float]]:
    """
    Velmi jednoduchý parser SVG path 'd' atributu — vrátí všechny číselné
    páry jako body (ignoruje příkazy M/L/C/Q/atd.). Pro křivky to znamená
    i kontrolní body, takže bbox může být mírně přehnaný, ale pro použití
    jako bbox vybavení to stačí.

    Regex akceptuje SVG kompaktní zápis — čísla mohou začínat tečkou
    (.523, -.5) nebo obsahovat exponent (1e-3). Bez toho parser minul
    čísla jako ".523" v path d a místo toho načetl "523" — 1000× větší
    hodnotu → rozbitý bbox (např. WC roztažené přes celý plán).
    """
    if not d:
        return []
    import re as _re
    nums = _re.findall(r'-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?', d)
    try:
        coords = [float(n) for n in nums]
    except ValueError:
        return []
    pts = []
    for i in range(0, len(coords) - 1, 2):
        pts.append((coords[i], coords[i + 1]))
    return pts


def extract_shape_bbox_points(group_el):
    """
    Najít všechny primitiva (polygon, rect, path, ellipse, circle) uvnitř
    skupiny a vrátit union jejich tvarů jako polygon (v lokálních
    souřadnicích skupiny, PŘED aplikací transformů).

    Používá se pro FixedFurniture. Pro jednoduché objekty (1 polygon/rect)
    vrátí přímo jeho body. Pro rohové (L-shape) kuchyně vrátí union
    několika polygonů jako jeden složený polygon (nikoli bbox, který by
    překrýval roh i prázdné místo mezi rameny).
    """
    polys = []
    all_pts_fallback = []  # pro ellipse/circle bbox fallback

    for shape in group_el.iter():
        tag = shape.tag.split('}')[-1] if '}' in shape.tag else shape.tag
        if tag == 'polygon':
            pts_raw = shape.get('points', '').replace(',', ' ').split()
            try:
                pts = [(float(pts_raw[i]), float(pts_raw[i + 1]))
                       for i in range(0, len(pts_raw) - 1, 2)]
                if len(pts) >= 3:
                    try:
                        p = Polygon(pts)
                        if not p.is_valid:
                            p = p.buffer(0)
                        if not p.is_empty:
                            polys.append(p)
                    except Exception:
                        pass
                all_pts_fallback.extend(pts)
            except (ValueError, IndexError):
                pass
        elif tag == 'rect':
            try:
                x = float(shape.get('x', 0))
                y = float(shape.get('y', 0))
                w = float(shape.get('width', 0))
                h = float(shape.get('height', 0))
                if w > 0 and h > 0:
                    corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
                    polys.append(Polygon(corners))
                    all_pts_fallback.extend(corners)
            except (ValueError, TypeError):
                pass
        elif tag == 'path':
            pts = parse_path_bbox_points(shape.get('d', ''))
            if len(pts) >= 3:
                try:
                    p = Polygon(pts)
                    if not p.is_valid:
                        p = p.buffer(0)
                    if not p.is_empty:
                        polys.append(p)
                except Exception:
                    pass
            all_pts_fallback.extend(pts)
        elif tag in ('ellipse', 'circle'):
            try:
                cx = float(shape.get('cx', 0))
                cy = float(shape.get('cy', 0))
                if tag == 'circle':
                    r = float(shape.get('r', 0))
                    rx = ry = r
                else:
                    rx = float(shape.get('rx', 0))
                    ry = float(shape.get('ry', 0))
                corners = [(cx - rx, cy - ry), (cx + rx, cy - ry),
                           (cx + rx, cy + ry), (cx - rx, cy + ry)]
                polys.append(Polygon(corners))
                all_pts_fallback.extend(corners)
            except (ValueError, TypeError):
                pass

    # Preference: union polygonů → skutečný tvar (L-shape, T-shape...)
    if polys:
        try:
            union = unary_union(polys)
            if union.geom_type == 'Polygon':
                candidate = union
            elif union.geom_type == 'MultiPolygon':
                # Nesouvislé komponenty → vzít největší (hlavní objekt)
                candidate = max(union.geoms, key=lambda g: g.area)
            else:
                candidate = None

            if candidate is not None and not candidate.is_empty:
                minx, miny, maxx, maxy = candidate.bounds
                bbox_area = (maxx - minx) * (maxy - miny)
                coords = list(candidate.exterior.coords)
                # Vrátit 4-bodový bbox jen pokud je polygon skutečně obdélníkový:
                # plocha ≥ 95 % bboxu A má ≤ 5 vrcholů (vč. closing).
                # Jinak (L/T, skosené rohy, pentagony) zachovat skutečný tvar.
                ratio = candidate.area / bbox_area if bbox_area > 0 else 0
                if ratio >= 0.95 and len(coords) <= 5:
                    return [(minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy)]
                return coords
        except Exception:
            pass

    # Fallback: bbox ze všech bodů (pro ellipse/circle nebo degenerované polygony)
    if not all_pts_fallback:
        return None
    xs = [p[0] for p in all_pts_fallback]
    ys = [p[1] for p in all_pts_fallback]
    minx, miny, maxx, maxy = min(xs), min(ys), max(xs), max(ys)
    return [(minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy)]


def building_perimeter(root):
    """
    Union polygonů všech vnitřních Space → obvod budovy.
    Vrátí shapely LineString (exterior boundary) nebo None.
    """
    inside_polys = []
    for sp in root.iter():
        cls_parts = (sp.get('class') or '').split()
        if not cls_parts or cls_parts[0] != 'Space':
            continue
        typ = cls_parts[1] if len(cls_parts) > 1 else ''
        if typ in VENKOVNI_SPACE:
            continue
        pts = space_polygon_world(sp)
        if not pts or len(pts) < 3:
            continue
        try:
            poly = Polygon(pts)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty:
                continue
            inside_polys.append(poly)
        except Exception:
            continue

    if not inside_polys:
        return None

    try:
        union = unary_union(inside_polys)
    except Exception:
        return None

    if union.geom_type == 'Polygon':
        return LineString(list(union.exterior.coords))
    if union.geom_type == 'MultiPolygon':
        biggest = max(union.geoms, key=lambda g: g.area)
        return LineString(list(biggest.exterior.coords))
    return None


# =============================================================================
# Datové struktury
# =============================================================================

@dataclass
class Stena:
    """Formát pro Koncept: od/do jako 2D vektory v metrech, y invertovaná.

    Constraint metadata pro editor (T-junction):
      od_constraint = { 'host': wall_id, 't': param_along_host_axis_0_to_1 }
    Endpoint je "očko" na hostiteli — klouže po jeho ose.
    Pokud není constraint, endpoint je volný / sdílený s jiným nodem.
    """
    id: str
    od: list[float]  # [x_m, y_m_inverted]
    do: list[float]
    tloustka: float  # metry
    typ: str  # "nosna" | "pricka" | "obvodova"
    od_constraint: dict | None = None  # { 'host': 'W3', 't': 0.42 }
    do_constraint: dict | None = None


@dataclass
class Otvor:
    id: str
    stena: str        # wall id (klíč "stena" ne "wallId")
    pozice: float     # metry od začátku stěny (levý okraj)
    sirka: float
    typ: str          # "dvere" | "okno"
    smer_otvirani: str | None = None  # "left_in", "left_out", "right_in", "right_out" — jen dveře
    pocet_kridel: int = 1             # 1 = jednokřídlé, 2 = dvoukřídlé — jen dveře
    typ_dveri: str | None = None      # "jednostranne" | "obouchodne" | "dvoukridle" — jen dveře


@dataclass
class Prostor:
    """Místnost / prostor — first-class objekt (nejen v metadata)."""
    id: str
    typ: str                    # první slovo class: Bedroom, Kitchen, Outdoor, ...
    podtyp: str | None          # Terrace, Balcony, Porch, Garden, Shower, WalkIn, ...
    polygon: list[list[float]]  # [[x_m, y_m], ...] (y invertovaná)
    plocha_m2: float
    nazev: str | None = None    # text z SpaceDimensionsLabel (fin/cz)
    venkovni: bool = False


# Mapování FixedFurniture → kalkulační kategorie
FURNITURE_KATEGORIE = {
    # Kuchyně
    'BaseCabinet': 'kuchyn', 'WallCabinet': 'kuchyn', 'BaseCabinetTriangle': 'kuchyn',
    'ElectricalAppliance': 'kuchyn',  # pračka/myčka/lednice — mohou být i v koupelně/prádelně
    'DoubleSink': 'kuchyn', 'DoubleSinkRight': 'kuchyn',
    # Koupelna / WC
    'Toilet': 'koupelna', 'Sink': 'koupelna', 'RoundSink': 'koupelna',
    'Shower': 'koupelna', 'ShowerScreen': 'koupelna', 'ShowerCab': 'koupelna',
    'Bathtub': 'koupelna', 'WaterTap': 'koupelna',
    # Šatny a skříně
    'Closet': 'uloziste', 'CoatCloset': 'uloziste', 'CoatRack': 'uloziste',
    # Krby a topení
    'Fireplace': 'topeni', 'FireplaceCorner': 'topeni', 'FireplaceRound': 'topeni',
    'WoodStove': 'topeni', 'Chimney': 'topeni', 'PlaceForFireplace': 'topeni',
    # Sauna
    'SaunaBench': 'sauna', 'SaunaBenchMid': 'sauna',
    'SaunaBenchHigh': 'sauna', 'SaunaBenchLow': 'sauna',
    # Ostatní
    'Housing': 'ostatni', 'Misc': 'ostatni',
}


@dataclass
class Vybaveni:
    """FixedFurniture (kuchyňská linka, WC, sprcha, skříň, spotřebič)."""
    id: str
    typ: str                    # SVG class — druhé slovo (BaseCabinet, Toilet, ElectricalAppliance, ...)
    podtyp: str | None          # třetí slovo, pokud existuje: Refrigerator/IntegratedStove/WashingMachine/...
    kategorie: str              # kuchyn, koupelna, uloziste, topeni, sauna, ostatni
    stred: list[float]          # [x_m, y_m]
    polygon: list[list[float]]  # obrys (metry, y invertovaná)
    sirka: float                # hlavní rozměr v metrech
    hloubka: float              # druhý rozměr v metrech
    tvar: str = 'rect'          # 'rect' | 'circle' | 'polygon' — pro renderování
    uhel: float = 0.0           # rotace ve stupních (0 = axis-aligned, z transform matice)
    zadni_strana: str | None = None  # "north"/"east"/"south"/"west" — strana, kterou objekt
                                      # přiléhá ke zdi (pro WC = kam míří nádrž). None = volně stojící.
    vyska: float | None = None  # z <desc>Width:... Height:...</desc> (cm → m), pokud je
    elevation: float | None = None  # výška umístění nad podlahou (m)


@dataclass
class Sloup:
    """Column — nosný sloup (betonový/ocelový)."""
    id: str
    stred: list[float]
    polygon: list[list[float]]
    sirka: float
    hloubka: float


@dataclass
class Zabradli:
    """Railing — zábradlí (schody, terasy, balkony)."""
    id: str
    polygon: list[list[float]]
    delka: float  # přibližná délka v metrech


@dataclass
class Schodiste:
    """Stairs — schodiště (celý blok). Může obsahovat Flight, Steps, Landing, Winding."""
    id: str
    polygon: list[list[float]]
    stred: list[float]
    pocet_stupnu: int                          # počet stupňů (= počet <line> v Steps)
    plocha_m2: float
    stupne: list[list[list[float]]]            # linky jednotlivých stupňů [[[x1,y1],[x2,y2]], ...] (metry, y invert)


@dataclass
class Konvertovany:
    steny: list[Stena] = field(default_factory=list)
    otvory: list[Otvor] = field(default_factory=list)
    prostory: list[Prostor] = field(default_factory=list)
    vybaveni: list[Vybaveni] = field(default_factory=list)
    sloupy: list[Sloup] = field(default_factory=list)
    zabradli: list[Zabradli] = field(default_factory=list)
    schodiste: list[Schodiste] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


# =============================================================================
# Pomocné funkce
# =============================================================================

def parse_points(s: str) -> list[tuple[float, float]]:
    """SVG polygon points 'x1,y1 x2,y2 ...' → list tuplů."""
    pts = []
    if not s:
        return pts
    # SVG používá "x,y x,y" s mezerou mezi páry, ale občas i špatné zakončení
    tokens = s.replace(",", " ").split()
    it = iter(tokens)
    for x in it:
        try:
            y = next(it)
            pts.append((float(x), float(y)))
        except (StopIteration, ValueError):
            break
    return pts


def dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def perpendicular_distance_point_to_line(
    pt: tuple[float, float],
    line_a: tuple[float, float],
    line_b: tuple[float, float],
) -> float:
    """Kolmá vzdálenost bodu pt od přímky určené dvěma body."""
    ax, ay = line_a
    bx, by = line_b
    px, py = pt
    # Vektor směru přímky
    dx, dy = bx - ax, by - ay
    length = math.hypot(dx, dy)
    if length == 0:
        return math.hypot(px - ax, py - ay)
    # Kolmá vzdálenost = |(pt - line_a) × normalized_direction|
    return abs((px - ax) * dy - (py - ay) * dx) / length


def find_long_edges(polygon_pts: list[tuple[float, float]]) -> tuple[
    tuple[tuple[float, float], tuple[float, float]],
    tuple[tuple[float, float], tuple[float, float]],
    float,
]:
    """
    Pro 4-bodový polygon stěny (obdélník s případnými mitre rohy) najde dvě
    DLOUHÉ hrany (podélné) a vrátí je + **skutečnou** tloušťku.

    Tloušťka = KOLMÁ vzdálenost mezi dvěma dlouhými hranami (ne délka krátkých hran,
    které jsou často šikmé mitre ořezy v rozích → přestřelené tloušťky o 20-40 %).
    """
    n = len(polygon_pts)
    edges = [(polygon_pts[i], polygon_pts[(i + 1) % n]) for i in range(n)]
    edges_sorted = sorted(edges, key=lambda e: dist(*e), reverse=True)
    long_a, long_b = edges_sorted[0], edges_sorted[1]

    # Skutečná tloušťka = průměrná kolmá vzdálenost endpointů long_a od přímky long_b
    d1 = perpendicular_distance_point_to_line(long_a[0], long_b[0], long_b[1])
    d2 = perpendicular_distance_point_to_line(long_a[1], long_b[0], long_b[1])
    thickness = (d1 + d2) / 2.0

    return long_a, long_b, thickness


def centerline_from_long_edges(
    edge_a: tuple[tuple[float, float], tuple[float, float]],
    edge_b: tuple[tuple[float, float], tuple[float, float]],
) -> tuple[tuple[float, float], tuple[float, float]]:
    """
    Vrátí 2 body osy stěny — průměr koncových bodů dvou dlouhých hran.
    Musíme správně spárovat endpointy — vzít ty, co jsou blíž u sebe.
    """
    a1, a2 = edge_a
    b1, b2 = edge_b

    # Párování: a1↔b1, a2↔b2  vs  a1↔b2, a2↔b1 — vybrat lepší
    cost1 = dist(a1, b1) + dist(a2, b2)
    cost2 = dist(a1, b2) + dist(a2, b1)

    if cost1 <= cost2:
        pair1, pair2 = (a1, b1), (a2, b2)
    else:
        pair1, pair2 = (a1, b2), (a2, b1)

    mid1 = ((pair1[0][0] + pair1[1][0]) / 2, (pair1[0][1] + pair1[1][1]) / 2)
    mid2 = ((pair2[0][0] + pair2[1][0]) / 2, (pair2[0][1] + pair2[1][1]) / 2)
    return mid1, mid2


# =============================================================================
# Sdílené uzly (magnet)
# =============================================================================

class NodeRegistry:
    """Postupně akumuluje uzly, slučuje blízké (tolerance MAGNET_PX v px).
    Pozice nodu = centroid všech merge-nutých endpointů, ne first-seen.
    Důvod: po ortho pass mají endpointy drobné rozdíly, centroid je správnější
    než arbitrary first-seen, zachová průměrnou pozici (typicky ortho outcome)."""

    def __init__(self, magnet_px: float = MAGNET_PX):
        self.magnet_px = magnet_px
        self.nodes_px: list[tuple[float, float]] = []  # centroid positions
        self.node_ids: list[str] = []
        self._samples: list[list[tuple[float, float]]] = []

    def get_or_create(self, x: float, y: float) -> str:
        for i, (nx, ny) in enumerate(self.nodes_px):
            if math.hypot(nx - x, ny - y) <= self.magnet_px:
                self._samples[i].append((x, y))
                # Recompute centroid
                samples = self._samples[i]
                cx = sum(p[0] for p in samples) / len(samples)
                cy = sum(p[1] for p in samples) / len(samples)
                self.nodes_px[i] = (cx, cy)
                return self.node_ids[i]
        new_id = f"n{len(self.nodes_px) + 1}"
        self.nodes_px.append((x, y))
        self.node_ids.append(new_id)
        self._samples.append([(x, y)])
        return new_id


# =============================================================================
# Hlavní parser
# =============================================================================

def parse_svg(svg_path: Path, original_id: str | None = None) -> Konvertovany:
    tree = etree.parse(str(svg_path))
    root = tree.getroot()

    viewbox = root.get("viewBox")
    width_attr = root.get("width")
    height_attr = root.get("height")

    konv = Konvertovany()
    konv.metadata = {
        "source": "pudorys",
        "original_id": original_id or svg_path.parent.name,
        "viewbox": viewbox,
        "width": float(width_attr) if width_attr else None,
        "height": float(height_attr) if height_attr else None,
        "scale_px_to_m": PX_TO_M,
    }

    # Detekce obvodu budovy pro rozlišení obvodova / nosna stěn
    perimeter_line = building_perimeter(root)

    # Sesbírat geometrie stěn — pro otvory držíme: kanonickou osu (stejnou
    # souřadnici jako od/do v JSON) + originální polygon (pro contain test).
    wall_geoms_px: list[tuple[str, tuple[float, float], tuple[float, float], float, list]] = []
    # (wall_id, canon_a_px, canon_b_px, thickness_px, original_polygon)

    # Nejprve sesbírat RAW centerlines (bez magnetu, bez T-snap)
    raw_walls = []  # [(wall_id, center_a, center_b, thickness_px, polygon_pts), ...]

    wall_counter = 0
    for el in root.iter():
        if el.get("id") != "Wall":
            continue
        polys = el.findall(f".//{{{SVG_NS}}}polygon")
        if not polys:
            continue
        pts = parse_points(polys[0].get("points", ""))
        if len(pts) < 3:
            continue

        wall_counter += 1
        wall_id = f"W{wall_counter}"

        try:
            use_bbox = True
            if len(pts) == 4:
                edge_a, edge_b, thickness_px_candidate = find_long_edges(pts)
                # Ověřit, že 2 nejdelší hrany jsou rovnoběžné — jinak to není
                # opravdový wall obdélník (typicky chamfer trojúhelník) a fit
                # by dal diagonální osu. V tom případě fallback na bbox.
                da = (edge_a[1][0] - edge_a[0][0], edge_a[1][1] - edge_a[0][1])
                db = (edge_b[1][0] - edge_b[0][0], edge_b[1][1] - edge_b[0][1])
                la = math.hypot(*da)
                lb = math.hypot(*db)
                if la > 0 and lb > 0:
                    cos_ang = abs(da[0] * db[0] + da[1] * db[1]) / (la * lb)
                    # cos_ang ≥ 0.95 → úhel ≤ ~18° → považujeme za rovnoběžné
                    if cos_ang >= 0.95:
                        center_a, center_b = centerline_from_long_edges(edge_a, edge_b)
                        thickness_px = thickness_px_candidate
                        use_bbox = False
            if use_bbox:
                poly_sh = Polygon(pts)
                minx, miny, maxx, maxy = poly_sh.bounds
                if (maxx - minx) > (maxy - miny):
                    center_a = (minx, (miny + maxy) / 2)
                    center_b = (maxx, (miny + maxy) / 2)
                    thickness_px = maxy - miny
                else:
                    center_a = ((minx + maxx) / 2, miny)
                    center_b = ((minx + maxx) / 2, maxy)
                    thickness_px = maxx - minx
        except Exception as e:
            print(f"WARN: stěna #{wall_counter} přeskočena: {e}", file=sys.stderr)
            continue

        # Filter degenerací — stěny délky 0 nebo téměř 0 (< 1 px)
        wlen = math.hypot(center_b[0] - center_a[0], center_b[1] - center_a[1])
        if wlen < 1.0:
            continue
        raw_walls.append((wall_id, center_a, center_b, thickness_px, pts))

    # --- ORTHOGONALIZE: stěny v rozsahu ±3° od pravoúhlé snapnout přesně ---
    # Drobné nepřesnosti v původním SVG propagují do skewing artifaktů.
    # Pokud je úhel téměř 0/90°, srovnat na osu. Provedeme PŘED magnetem,
    # aby sdílené endpointy cluster-merged se všemi na stejné pozici.
    ORTHO_TOL_DEG = 3.0
    new_raw_ortho = []
    for wid, ca, cb, thk, pts in raw_walls:
        wdx = cb[0] - ca[0]
        wdy = cb[1] - ca[1]
        wlen = math.hypot(wdx, wdy)
        if wlen == 0:
            new_raw_ortho.append((wid, ca, cb, thk, pts))
            continue
        ang = math.degrees(math.atan2(wdy, wdx)) % 180
        # Vzdálenost od horizontály (0 nebo 180)
        d_horiz = min(abs(ang), abs(ang - 180))
        d_vert = abs(ang - 90)
        if d_horiz < ORTHO_TOL_DEG:
            # Snap na horizontální — průměr y endpointů
            avg_y = (ca[1] + cb[1]) / 2
            new_raw_ortho.append((wid, (ca[0], avg_y), (cb[0], avg_y), thk, pts))
        elif d_vert < ORTHO_TOL_DEG:
            avg_x = (ca[0] + cb[0]) / 2
            new_raw_ortho.append((wid, (avg_x, ca[1]), (avg_x, cb[1]), thk, pts))
        else:
            new_raw_ortho.append((wid, ca, cb, thk, pts))
    raw_walls = new_raw_ortho

    # --- MERGE: dvě paralelní blízké stěny → jedna širší ---
    # V SVG se někdy uvedou dvě tenké stěny vedle sebe místo jedné silnější
    # (cavity wall, imprecision). V praxi je to vždy jedna širší stěna.
    # Pravidla:
    #   - obě stěny cos(úhel) > 0.98 (paralelní, tolerance ~11°)
    #   - vzdálenost mezi osami < thk1+thk2 (= stěny se skoro dotýkají/překrývají)
    #   - axiální překryv > 50 % kratší stěny (aby to bylo 'stejné rozhraní')
    # Merge: nová osa = centroid, nová tloušťka = dist_between_far_edges.
    MERGE_PARALLEL_MAX_GAP_PX = 20.0  # max mezera mezi osami
    MERGE_PARALLEL_COS = 0.98
    # Stěny s výrazně odlišnou tloušťkou NEslučovat — zachová rozlišení
    # příčka (≤19 cm) vs zeď (nosná/obvodová). Tolerance 30% rozdílu.
    MERGE_THICKNESS_RATIO = 1.3  # max thk1/thk2 pro merge
    merge_groups = []  # list of set(wall_idx)
    wall_to_group = {}
    for i, (wid1, ca1, cb1, thk1, _) in enumerate(raw_walls):
        dx1 = cb1[0] - ca1[0]; dy1 = cb1[1] - ca1[1]
        L1 = math.hypot(dx1, dy1)
        if L1 == 0:
            continue
        for j in range(i + 1, len(raw_walls)):
            wid2, ca2, cb2, thk2, _ = raw_walls[j]
            dx2 = cb2[0] - ca2[0]; dy2 = cb2[1] - ca2[1]
            L2 = math.hypot(dx2, dy2)
            if L2 == 0:
                continue
            cos_ang = abs(dx1 * dx2 + dy1 * dy2) / (L1 * L2)
            if cos_ang < MERGE_PARALLEL_COS:
                continue
            # Rozdíl tlouštěk — neslučovat příčku s nosnou stěnou
            thk_max = max(thk1, thk2)
            thk_min = min(thk1, thk2)
            if thk_min > 0 and thk_max / thk_min > MERGE_THICKNESS_RATIO:
                continue
            # Kolmá vzdálenost mezi osami (use line-point distance)
            # Průměrná vzdálenost středů projektovaná perpendikulárně
            nx1 = -dy1 / L1; ny1 = dx1 / L1
            mid2_x = (ca2[0] + cb2[0]) / 2
            mid2_y = (ca2[1] + cb2[1]) / 2
            # Perpendikulární vzdálenost midpoint(wall2) od osy wall1
            d_perp = abs((mid2_x - ca1[0]) * nx1 + (mid2_y - ca1[1]) * ny1)
            # Součet polovin tlouštěk + malá rezerva
            max_perp = (thk1 + thk2) / 2.0 + MERGE_PARALLEL_MAX_GAP_PX
            if d_perp > max_perp:
                continue
            # Overlap v osovém směru (projekce wall2 endpointů na wall1 osu)
            tx = dx1 / L1; ty = dy1 / L1
            t_a = (ca2[0] - ca1[0]) * tx + (ca2[1] - ca1[1]) * ty
            t_b = (cb2[0] - ca1[0]) * tx + (cb2[1] - ca1[1]) * ty
            tmin, tmax = min(t_a, t_b), max(t_a, t_b)
            overlap = min(tmax, L1) - max(tmin, 0)
            shorter_L = min(L1, L2)
            if overlap < 0.5 * shorter_L:
                continue
            # Merge — spojit do skupiny
            gi = wall_to_group.get(i)
            gj = wall_to_group.get(j)
            if gi is None and gj is None:
                merge_groups.append({i, j})
                wall_to_group[i] = wall_to_group[j] = len(merge_groups) - 1
            elif gi is not None and gj is None:
                merge_groups[gi].add(j)
                wall_to_group[j] = gi
            elif gj is not None and gi is None:
                merge_groups[gj].add(i)
                wall_to_group[i] = gj
            elif gi != gj:
                merge_groups[gi] |= merge_groups[gj]
                for k in merge_groups[gj]: wall_to_group[k] = gi
                merge_groups[gj] = set()

    if merge_groups:
        merged_walls = []
        consumed = set()
        for group in merge_groups:
            if not group: continue
            # Sloučit všechny stěny v skupině
            group_walls = [raw_walls[i] for i in group]
            # Společná osa = průměr endpointů projektovaný
            # Najít nejdelší pro reference direction
            longest = max(group_walls, key=lambda w: math.hypot(w[2][0]-w[1][0], w[2][1]-w[1][1]))
            ref_wid, ref_ca, ref_cb, _, ref_pts = longest
            ref_dx = ref_cb[0] - ref_ca[0]
            ref_dy = ref_cb[1] - ref_ca[1]
            ref_L = math.hypot(ref_dx, ref_dy)
            ref_tx = ref_dx / ref_L; ref_ty = ref_dy / ref_L
            ref_nx = -ref_ty; ref_ny = ref_tx
            # Collect all endpoints projected to ref axis (tangent + normal offsets)
            all_endpoints = []
            for _, wca, wcb, wthk, _ in group_walls:
                for ep in (wca, wcb):
                    t = (ep[0] - ref_ca[0]) * ref_tx + (ep[1] - ref_ca[1]) * ref_ty
                    n = (ep[0] - ref_ca[0]) * ref_nx + (ep[1] - ref_ca[1]) * ref_ny
                    all_endpoints.append((t, n, wthk))
            # New thickness = full span in normal direction (max far edge - min far edge)
            nmin = min(p[1] - p[2]/2 for p in all_endpoints)
            nmax = max(p[1] + p[2]/2 for p in all_endpoints)
            new_thk = nmax - nmin
            new_n = (nmin + nmax) / 2  # axis offset
            # Length = min/max projection
            tmin = min(p[0] for p in all_endpoints)
            tmax = max(p[0] for p in all_endpoints)
            new_a = (ref_ca[0] + ref_tx * tmin + ref_nx * new_n,
                     ref_ca[1] + ref_ty * tmin + ref_ny * new_n)
            new_b = (ref_ca[0] + ref_tx * tmax + ref_nx * new_n,
                     ref_ca[1] + ref_ty * tmax + ref_ny * new_n)
            merged_walls.append((ref_wid, new_a, new_b, new_thk, ref_pts))
            consumed.update(group)
        # Přidat ostatní stěny
        for i, w in enumerate(raw_walls):
            if i not in consumed:
                merged_walls.append(w)
        raw_walls = merged_walls

    # --- L-SNAP: nezavřené rohy → snap obou endpointů na průsečík os ---
    # Když se 2 stěny skoro setkávají (5-20 cm od sebe), nejsou rovnoběžné
    # a průsečík jejich os je poblíž, posuneme oba endpointy na ten průsečík.
    # Tím vznikne sdílený node a corner se uzavře na úrovni parseru.
    # Cílené řešení — netýká se T-junctions ani záměrných mezer.
    L_SNAP_PX = 20.0       # max vzdálenost endpointů pro L-snap
    L_SNAP_COS = 0.7       # |cos úhlu| > 0.7 (úhel < 45°) → považujeme za "rovnoběžné"

    def line_intersection(p1, p2, p3, p4):
        d1x, d1y = p2[0] - p1[0], p2[1] - p1[1]
        d2x, d2y = p4[0] - p3[0], p4[1] - p3[1]
        det = d1x * d2y - d1y * d2x
        if abs(det) < 1e-9:
            return None
        t = ((p3[0] - p1[0]) * d2y - (p3[1] - p1[1]) * d2x) / det
        return (p1[0] + t * d1x, p1[1] + t * d1y)

    # Pre-check: které endpointy už sdílí magnet s jiným endpointem?
    # Ty NEsnapujeme — jsou už součástí jiného spoje.
    all_endpoints = []
    for i, (_, ca, cb, _, _) in enumerate(raw_walls):
        all_endpoints.append((i, 'a', ca))
        all_endpoints.append((i, 'b', cb))
    locked = set()  # (wall_idx, 'a'|'b') které mají magnet partnera
    for k1 in range(len(all_endpoints)):
        i1, e1, p1 = all_endpoints[k1]
        for k2 in range(k1 + 1, len(all_endpoints)):
            i2, e2, p2 = all_endpoints[k2]
            if i1 == i2:
                continue
            if math.hypot(p1[0] - p2[0], p1[1] - p2[1]) <= MAGNET_PX:
                locked.add((i1, e1))
                locked.add((i2, e2))

    endpoint_adj = {}  # (wall_idx, 'a'|'b') → (new_pos, dist_to_inter)
    for i in range(len(raw_walls)):
        _, ca_i, cb_i, _, _ = raw_walls[i]
        d1 = (cb_i[0] - ca_i[0], cb_i[1] - ca_i[1])
        l1 = math.hypot(*d1)
        if l1 == 0:
            continue
        for j in range(i + 1, len(raw_walls)):
            _, ca_j, cb_j, _, _ = raw_walls[j]
            d2 = (cb_j[0] - ca_j[0], cb_j[1] - ca_j[1])
            l2 = math.hypot(*d2)
            if l2 == 0:
                continue
            cos_ang = abs(d1[0] * d2[0] + d1[1] * d2[1]) / (l1 * l2)
            if cos_ang > L_SNAP_COS:
                continue  # rovnoběžné — ne L
            inter = line_intersection(ca_i, cb_i, ca_j, cb_j)
            if inter is None:
                continue
            for end_i, ep_i in [('a', ca_i), ('b', cb_i)]:
                if (i, end_i) in locked:
                    continue  # už sdílí node, nehýbat
                d_i = math.hypot(inter[0] - ep_i[0], inter[1] - ep_i[1])
                if d_i > L_SNAP_PX or d_i <= MAGNET_PX:
                    continue
                for end_j, ep_j in [('a', ca_j), ('b', cb_j)]:
                    if (j, end_j) in locked:
                        continue
                    d_j = math.hypot(inter[0] - ep_j[0], inter[1] - ep_j[1])
                    if d_j > L_SNAP_PX or d_j <= MAGNET_PX:
                        continue
                    # Endpointy musí být blízko sebe (potvrzení, že je to L)
                    d_ij = math.hypot(ep_i[0] - ep_j[0], ep_i[1] - ep_j[1])
                    if d_ij > L_SNAP_PX:
                        continue
                    key_i = (i, end_i)
                    key_j = (j, end_j)
                    if key_i not in endpoint_adj or d_i < endpoint_adj[key_i][1]:
                        endpoint_adj[key_i] = (inter, d_i)
                    if key_j not in endpoint_adj or d_j < endpoint_adj[key_j][1]:
                        endpoint_adj[key_j] = (inter, d_j)

    if endpoint_adj:
        new_raw = []
        for i, (wid, ca, cb, thk, pts) in enumerate(raw_walls):
            adj_a = endpoint_adj.get((i, 'a'))
            adj_b = endpoint_adj.get((i, 'b'))
            new_ca = adj_a[0] if adj_a else ca
            new_cb = adj_b[0] if adj_b else cb
            new_raw.append((wid, new_ca, new_cb, thk, pts))
        raw_walls = new_raw

    # Pre-pass: identifikuj shared endpointy (v rámci MAGNET_PX od jiného endpointu)
    # Tyto se stanou sdílenými uzly přes NodeRegistry — T-constraint nevytváříme.
    ep_list = []  # (wall_idx, 'a'|'b', x, y)
    for idx, (_, ca, cb, _, _) in enumerate(raw_walls):
        ep_list.append((idx, 'a', ca[0], ca[1]))
        ep_list.append((idx, 'b', cb[0], cb[1]))
    shared_endpoints = set()  # {(wall_idx, 'a'|'b')}
    for k1 in range(len(ep_list)):
        i1, e1, x1, y1 = ep_list[k1]
        for k2 in range(k1 + 1, len(ep_list)):
            i2, e2, x2, y2 = ep_list[k2]
            if i1 == i2:
                continue
            if math.hypot(x1 - x2, y1 - y2) <= MAGNET_PX:
                shared_endpoints.add((i1, e1))
                shared_endpoints.add((i2, e2))

    # --- T-SNAP: endpoint na bližší STRANU hostitele (perpendikulárně k jeho ose) ---
    # Tato verze fungovala dřív — tenká stěna končí na povrchu tlusté.
    # Pre-orthogonalizace zajistí, že hostitelské stěny jsou pravoúhlé,
    # takže perpendicular shift nezpůsobí skewing snapnuté stěny.
    # Bez splitu hostitele.
    # Vrátí (snap_pt, host_idx, t_param_along_host_axis) — host_idx None pokud
    # nesnapováno. t je parametr 0-1 pozice na hostiteli (pro constraint metadata).
    def tsnap_endpoint(ep, my_idx, end_key):
        my_a = raw_walls[my_idx][1]
        my_b = raw_walls[my_idx][2]
        my_thk = raw_walls[my_idx][3]
        other_ep = my_b if (ep[0] == my_a[0] and ep[1] == my_a[1]) else my_a
        my_dx = other_ep[0] - ep[0]
        my_dy = other_ep[1] - ep[1]
        my_len = math.hypot(my_dx, my_dy)
        if my_len == 0:
            return ep, None, None
        # Pokud je endpoint už sdílený (bude merged přes NodeRegistry), přeskočit
        if (my_idx, end_key) in shared_endpoints:
            return ep, None, None
        best_snap = None
        best_host = None
        best_t = None
        best_dist = float("inf")
        for j, (_, oa, ob, othk, _) in enumerate(raw_walls):
            if j == my_idx:
                continue
            dx, dy = ob[0] - oa[0], ob[1] - oa[1]
            L2 = dx * dx + dy * dy
            if L2 == 0:
                continue
            host_len = math.sqrt(L2)
            cos_ang = abs(my_dx * dx + my_dy * dy) / (my_len * host_len)
            if cos_ang > 0.7:
                continue
            line = LineString([oa, ob])
            d = line.distance(Point(ep))
            # Tolerance: (host_thk + my_thk) / 2 + 3 px — pokrývá i případy,
            # kdy osa naší stěny končí posunutá o vlastní half-thickness od
            # osy hostitele (W7 obvodová končí 6 px od W4 příčky).
            if d > (othk + my_thk) / 2.0 + 3.0:
                continue
            t_raw = ((ep[0] - oa[0]) * dx + (ep[1] - oa[1]) * dy) / L2
            # Mimo host → přeskočit. V rámci hostitele zachovat skutečné
            # t (žádný clamp na 0.98) — endpoint tím přesně sedne na
            # fyzickou pozici dotyku (jinak by vznikla 6 px mezera mezi
            # rohem hostitele a endpointem).
            if t_raw < 0.0 or t_raw > 1.0:
                continue
            t = t_raw
            axis_proj = (oa[0] + t * dx, oa[1] + t * dy)
            t_o = ((other_ep[0] - oa[0]) * dx + (other_ep[1] - oa[1]) * dy) / L2
            proj_o = (oa[0] + t_o * dx, oa[1] + t_o * dy)
            perp_x = other_ep[0] - proj_o[0]
            perp_y = other_ep[1] - proj_o[1]
            perp_len = math.hypot(perp_x, perp_y)
            if perp_len < 1e-6:
                snap = axis_proj
            else:
                ux = perp_x / perp_len
                uy = perp_y / perp_len
                snap = (axis_proj[0] + ux * (othk / 2.0),
                        axis_proj[1] + uy * (othk / 2.0))
            d_proj = math.hypot(ep[0] - snap[0], ep[1] - snap[1])
            if d_proj < best_dist:
                best_dist = d_proj
                best_snap = snap
                best_host = j
                best_t = t
        if best_snap is None:
            return ep, None, None
        return best_snap, best_host, best_t

    snapped_walls = []
    # Constraint metadata keyed by wall_id: { wall_id → { 'a': {...}, 'b': {...} } }
    constraints_by_wid = {}
    for i, (wid, ca, cb, thk, pts) in enumerate(raw_walls):
        ca2, host_a, t_a = tsnap_endpoint(ca, i, 'a')
        cb2, host_b, t_b = tsnap_endpoint(cb, i, 'b')
        snapped_walls.append((wid, ca2, cb2, thk, pts))
        if host_a is not None:
            constraints_by_wid.setdefault(wid, {})['a'] = {
                'host': raw_walls[host_a][0], 't': round(t_a, 4)
            }
        if host_b is not None:
            constraints_by_wid.setdefault(wid, {})['b'] = {
                'host': raw_walls[host_b][0], 't': round(t_b, 4)
            }

    # Post-snap ORTHOGONALIZE — T-snap mohl mírně zkosit stěny (perpendikulární
    # posun na hostiteli posune endpoint ne přesně ve směru wall). Pokud je
    # výsledek do ±2° od pravoúhlé, vrátíme přesnou ortogonálnost.
    POST_SNAP_TOL_DEG = 2.0
    final_walls = []
    for wid, ca, cb, thk, pts in snapped_walls:
        wdx = cb[0] - ca[0]
        wdy = cb[1] - ca[1]
        wlen = math.hypot(wdx, wdy)
        if wlen == 0:
            continue
        ang = math.degrees(math.atan2(wdy, wdx)) % 180
        d_horiz = min(abs(ang), abs(ang - 180))
        d_vert = abs(ang - 90)
        if d_horiz < POST_SNAP_TOL_DEG:
            avg_y = (ca[1] + cb[1]) / 2
            final_walls.append((wid, (ca[0], avg_y), (cb[0], avg_y), thk, pts))
        elif d_vert < POST_SNAP_TOL_DEG:
            avg_x = (ca[0] + cb[0]) / 2
            final_walls.append((wid, (avg_x, ca[1]), (avg_x, cb[1]), thk, pts))
        else:
            final_walls.append((wid, ca, cb, thk, pts))
    snapped_walls = final_walls

    # Magnet — slučíme endpointy blízké v rámci MAGNET_PX.
    # FÁZE 1: všechny endpointy přidáme do registry (centroid se průběžně počítá)
    registry = NodeRegistry()
    wall_reg_ids = []  # pro každou stěnu (reg_a_id, reg_b_id)
    for wid, center_a, center_b, thickness_px, pts in snapped_walls:
        reg_a_id = registry.get_or_create(*center_a)
        reg_b_id = registry.get_or_create(*center_b)
        wall_reg_ids.append((reg_a_id, reg_b_id))

    # FÁZE 2: Node-level ortho. Pokud stěna je téměř horizontální, vyrovnat
    # y obou jejích nodů na průměr — modifikace nodu propaguje do všech stěn
    # sdílejících ten node (=konzistentní orthogonalization v celé síti).
    # Provedeme 2 iterace pro stabilizaci.
    FINAL_ORTHO_TOL_DEG = 3.0
    for _iter in range(2):
        for idx_wall, (wid, center_a, center_b, thickness_px, pts) in enumerate(snapped_walls):
            reg_a_id, reg_b_id = wall_reg_ids[idx_wall]
            idx_a = registry.node_ids.index(reg_a_id)
            idx_b = registry.node_ids.index(reg_b_id)
            na = registry.nodes_px[idx_a]
            nb = registry.nodes_px[idx_b]
            wdx = nb[0] - na[0]
            wdy = nb[1] - na[1]
            wL = math.hypot(wdx, wdy)
            if wL < 1.0:
                continue
            ang = math.degrees(math.atan2(wdy, wdx)) % 180
            d_h = min(abs(ang), abs(ang - 180))
            d_v = abs(ang - 90)
            if d_h < FINAL_ORTHO_TOL_DEG:
                avg_y = (na[1] + nb[1]) / 2
                registry.nodes_px[idx_a] = (na[0], avg_y)
                registry.nodes_px[idx_b] = (nb[0], avg_y)
            elif d_v < FINAL_ORTHO_TOL_DEG:
                avg_x = (na[0] + nb[0]) / 2
                registry.nodes_px[idx_a] = (avg_x, na[1])
                registry.nodes_px[idx_b] = (avg_x, nb[1])

    # --- Stěny (nyní s FINAL centroid pozicemi po magnetu) ---
    for idx_wall, (wid, center_a, center_b, thickness_px, pts) in enumerate(snapped_walls):
        wall_id = wid
        reg_a_id, reg_b_id = wall_reg_ids[idx_wall]
        idx_a = registry.node_ids.index(reg_a_id)
        idx_b = registry.node_ids.index(reg_b_id)
        canon_a = registry.nodes_px[idx_a]
        canon_b = registry.nodes_px[idx_b]

        thickness_m = thickness_px * PX_TO_M

        # Detekce "obvodova" — polygon stěny se dotýká obvodu budovy.
        # Centroid polygonu stěny leží uvnitř stěny (uprostřed mezi 2 dlouhými
        # hranami). Pokud je blízko perimetru (v rámci poloviny tloušťky + rezerva),
        # znamená to, že alespoň jedna strana stěny je NA obvodu budovy.
        je_obvodova = False
        if perimeter_line is not None and thickness_m >= 0.19:
            try:
                cx = sum(x for x, _ in pts) / len(pts)
                cy = sum(y for _, y in pts) / len(pts)
                tol = (thickness_px / 2.0) + 2.0  # polovina tloušťky + 2 px rezerva
                d = perimeter_line.distance(Point(cx, cy))
                if d <= tol:
                    je_obvodova = True
            except Exception:
                pass

        # Převod px → metry + inverze y (Koncept má y pointing up)
        od = [canon_a[0] * PX_TO_M, -canon_a[1] * PX_TO_M]
        do = [canon_b[0] * PX_TO_M, -canon_b[1] * PX_TO_M]

        # Constraint metadata pro endpoint na hostiteli (T-junction).
        # Hodí se pro editor (klouzání po hostiteli).
        wall_constraints = constraints_by_wid.get(wall_id, {})
        konv.steny.append(Stena(
            id=wall_id,
            od=od,
            do=do,
            tloustka=thickness_m,
            typ=urc_typ_steny(thickness_m, je_obvodova),
            od_constraint=wall_constraints.get('a'),
            do_constraint=wall_constraints.get('b'),
        ))
        # POZOR: ukládáme canon_a/canon_b (= magnet-merged, stejná souřadnice
        # jako od/do v JSON). Původně jsme ukládali center_a/center_b, což
        # způsobovalo posun otvorů až 5 px = 5 cm kvůli magnet mergei.
        wall_geoms_px.append((wall_id, canon_a, canon_b, thickness_px, pts))

    # --- Otvory (dveře, okna) ---
    # Pro každou stěnu uložíme její polygon jako shapely.Polygon (pro contain test)
    wall_data = []
    for wid, ca, cb, thickness_px, wall_polygon_pts in wall_geoms_px:
        try:
            wall_poly = Polygon(wall_polygon_pts)
            if not wall_poly.is_valid:
                wall_poly = wall_poly.buffer(0)
        except Exception:
            wall_poly = None
        # Bufferovaný polygon pro tolerantní contain test (otvor mírně přesahující)
        if wall_poly is not None and not wall_poly.is_empty:
            wall_poly_buffered = wall_poly.buffer(2.0)
        else:
            wall_poly_buffered = None
        wall_data.append({
            'id': wid,
            'ca': ca, 'cb': cb,
            'thickness_px': thickness_px,
            'line': LineString([ca, cb]),
            'polygon': wall_poly,
            'polygon_buffered': wall_poly_buffered,
        })

    # Samostatné čítače pro dveře (D) a okna (O) — user chce odlišit ID prefix.
    door_counter = 0
    window_counter = 0
    for el in root.iter():
        el_id = el.get("id")
        if el_id not in ("Door", "Window"):
            continue
        polys = el.findall(f".//{{{SVG_NS}}}polygon")
        if not polys:
            continue
        pts = parse_points(polys[0].get("points", ""))
        if len(pts) < 3:
            continue

        poly = Polygon(pts)
        centroid_pt = Point(poly.centroid.x, poly.centroid.y)

        # Přiřazení otvoru ke stěně — dvoufázové:
        # 1) Najít stěny, jejichž polygon obsahuje centroid otvoru (bezpečný match)
        # 2) Pokud žádná neobsahuje, vzít nejbližší podle osy (fallback)
        candidates = []
        for w in wall_data:
            if w['polygon_buffered'] is not None and w['polygon_buffered'].contains(centroid_pt):
                # Otvor leží uvnitř polygonu stěny — ideální match.
                d = w['line'].distance(centroid_pt)
                candidates.append((d, w))
        if not candidates:
            # Fallback — nejbližší podle osy
            for w in wall_data:
                d = w['line'].distance(centroid_pt)
                candidates.append((d, w))

        candidates.sort(key=lambda x: x[0])
        best = candidates[0][1]

        wid, line, ca, cb = best['id'], best['line'], best['ca'], best['cb']
        # Přesná pozice + šířka z projekce VŠECH bodů polygonu otvoru na osu stěny.
        # (Předchozí diagonální heuristika `hypot(bbox) * 0.7` byla 15-30 % mimo
        # u rotovaných otvorů; projekce dává přesný geometrický výsledek.)
        wall_dx = cb[0] - ca[0]
        wall_dy = cb[1] - ca[1]
        wall_len = math.hypot(wall_dx, wall_dy)
        if wall_len == 0:
            continue
        wall_dir = (wall_dx / wall_len, wall_dy / wall_len)

        projections = []
        for p in pts:
            rel_x = p[0] - ca[0]
            rel_y = p[1] - ca[1]
            proj = rel_x * wall_dir[0] + rel_y * wall_dir[1]
            projections.append(proj)

        min_proj = min(projections)
        max_proj = max(projections)
        width_px = max_proj - min_proj

        # DŮLEŽITÉ: Koncept renderer interpretuje opening.pozice jako LEVÝ OKRAJ
        # otvoru (konec blíž k od/nodeA), NE střed. Viz konva-renderer.js:
        #   ox = nA.x + dirX * pozPx;  width = sirPx;
        # → otvor jde od ox do ox + sirPx.
        pozice_px = min_proj

        # Sanity — otvor by měl ležet v rozsahu stěny
        if width_px < 1 or pozice_px < -width_px or pozice_px > wall_len:
            continue

        # Detekce směru otvírání + počet křídel — z geometrie <path>.
        # SVG má v Door <g class="Panel X Y"><path d="M hx,hy q ... endx,endy l ..."/>
        # M = pant (hinge), q endpoint = otevřená pozice křídla.
        # Toto je spolehlivější než interpretovat class atributy (konvence Left/Right
        # vs Positive/Negative se občas pletou).
        smer_otvirani = None
        pocet_kridel = 1
        typ_dveri = None
        if el_id == "Door":
            # Detekce typu z class atributu: "Door Swing Opposite" = oboustranné,
            # "Door Swing Beside" = standardní jednostranné.
            door_class = el.get('class') or ''
            if 'Opposite' in door_class:
                typ_dveri = 'obouchodne'
            elif 'Beside' in door_class:
                typ_dveri = 'jednostranne'

            panel_variants = []  # [(hinge_xy, open_xy, class_tuple), ...]
            for child in el.iter():
                c = (child.get("class") or "").split()
                # Jen "Panel" (ne "PanelArea")
                if not c or c[0] != "Panel":
                    continue
                # Najít <path d="..."> uvnitř Panel (ne uvnitř PanelArea)
                paths = []
                for desc in child.iter():
                    tag = desc.tag.split('}')[-1] if '}' in desc.tag else desc.tag
                    if tag == 'path':
                        paths.append(desc)
                if not paths:
                    continue
                d = paths[0].get('d', '')
                import re as _re
                # Path má tvar: M x,y q cx,cy ex,ey l lx,ly Z
                # - M = bod dveří v ZAVŘENÉ pozici (na stěně)
                # - q endpoint = bod v OTEVŘENÉ pozici (kolmo od stěny)
                # - hinge (pant) = roh pie slice = pozice PO L příkazu
                m = _re.match(
                    r'M\s*(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)\s*'
                    r'q\s*(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)\s+'
                    r'(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)\s*'
                    r'l\s*(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)',
                    d
                )
                if not m:
                    continue
                mx, my, _qcx, _qcy, qex, qey, lx, ly = map(float, m.groups())
                # closed_pt = M
                # open_pt = po quadratic Bezier (relativně k M)
                # hinge = po line (relativně ke konci Q)
                open_pt = (mx + qex, my + qey)
                hinge = (open_pt[0] + lx, open_pt[1] + ly)
                panel_variants.append((hinge, open_pt, tuple(c[1:3] if len(c) >= 3 else [])))

            if panel_variants:
                # Dvoukřídlé: 2 varianty se STEJNÝM positive/negative směrem
                # ale rozdílným Left/Right (pant na opačných stranách).
                if len(panel_variants) >= 2:
                    classes = set(v[2] for v in panel_variants)
                    pn_set = set(c[1] for c in classes if len(c) >= 2)
                    if len(pn_set) == 1 and len(set(c[0] for c in classes if c)) >= 2:
                        pocet_kridel = 2

                # V souřadnicích osy stěny (ca, cb):
                dxW = cb[0] - ca[0]
                dyW = cb[1] - ca[1]
                wLen = math.hypot(dxW, dyW)
                if wLen > 0:
                    uxW = dxW / wLen
                    uyW = dyW / wLen
                    nxW = -uyW
                    nyW = uxW

                    # Výběr variantiy — pokud jsou 2 (Negative + Positive),
                    # preferujeme tu, která se otvírá DO INTERIÉRU budovy.
                    # Použijeme perimeter_line: interiér je uvnitř polygonu.
                    best_variant = panel_variants[0]
                    if len(panel_variants) >= 2 and pocet_kridel == 1 and perimeter_line is not None:
                        try:
                            perim_poly = Polygon(list(perimeter_line.coords))
                            if perim_poly.is_valid:
                                best_score = -float('inf')
                                for pv in panel_variants:
                                    ph, po, _ = pv
                                    # Bod 5 px podél vektoru otevírání (od hinge k open_pt)
                                    ovx = po[0] - ph[0]
                                    ovy = po[1] - ph[1]
                                    ov_len = math.hypot(ovx, ovy)
                                    if ov_len == 0:
                                        continue
                                    test_x = ph[0] + (ovx / ov_len) * 5.0
                                    test_y = ph[1] + (ovy / ov_len) * 5.0
                                    score = 1 if perim_poly.contains(Point(test_x, test_y)) else 0
                                    if score > best_score:
                                        best_score = score
                                        best_variant = pv
                        except Exception:
                            pass

                    hinge, open_pt, _ = best_variant

                    # Projekce pantu na osu stěny (od ca)
                    hinge_proj = (hinge[0] - ca[0]) * uxW + (hinge[1] - ca[1]) * uyW
                    mid_opening = pozice_px + width_px / 2
                    is_left = hinge_proj < mid_opening

                    # Otevřená pozice vůči ose stěny (v SVG y-down)
                    open_proj_perp = (open_pt[0] - hinge[0]) * nxW + (open_pt[1] - hinge[1]) * nyW

                    # Empiricky ověřeno uživatelem: pro vizuální shodu s originálem SVG
                    # originálem je "in" = strana, na kterou ukazuje SVG normála
                    # (nx=-uy, ny=ux) v SVG y-down světě. Tedy proj > 0.
                    is_in = open_proj_perp > 0

                    lr = 'left' if is_left else 'right'
                    io = 'in' if is_in else 'out'
                    smer_otvirani = f"{lr}_{io}"

        is_door = el_id == "Door"
        if is_door:
            door_counter += 1
            op_id = f"D{door_counter}"
        else:
            window_counter += 1
            op_id = f"O{window_counter}"
        konv.otvory.append(Otvor(
            id=op_id,
            stena=wid,
            pozice=pozice_px * PX_TO_M,
            sirka=width_px * PX_TO_M,
            typ="dvere" if is_door else "okno",
            smer_otvirani=smer_otvirani,
            pocet_kridel=pocet_kridel,
            typ_dveri=typ_dveri,
        ))

    # --- Prostory (místnosti + venkovní) — first-class objekty ---
    prostor_counter = 0
    for el in root.iter():
        cls = el.get("class") or ""
        parts = cls.split()
        if len(parts) < 2 or parts[0] != "Space":
            continue

        typ = parts[1]
        podtyp = parts[2] if len(parts) >= 3 else None
        venkovni = typ in VENKOVNI_SPACE

        # Polygon prostoru v globálních souřadnicích
        pts_world = space_polygon_world(el)
        if not pts_world or len(pts_world) < 3:
            continue

        # Název (label text, bez čísel)
        nazev = None
        for lab in el.iter():
            if (lab.get("class") or "") == "SpaceDimensionsLabel":
                for t in lab.findall(f".//{{{SVG_NS}}}text"):
                    txt = ''.join(t.itertext()).strip()
                    if txt and not txt[0].isdigit() and "'" not in txt:
                        nazev = txt
                        break
                if nazev:
                    break

        try:
            poly = Polygon(pts_world)
            if not poly.is_valid:
                poly = poly.buffer(0)
            plocha_m2 = poly.area * (PX_TO_M ** 2)
        except Exception:
            continue

        # Polygon v metrech s invertovanou y (jako u stěn)
        polygon_m = [[p[0] * PX_TO_M, -p[1] * PX_TO_M] for p in pts_world]

        prostor_counter += 1
        konv.prostory.append(Prostor(
            id=f"P{prostor_counter}",
            typ=typ,
            podtyp=podtyp,
            polygon=polygon_m,
            plocha_m2=round(plocha_m2, 2),
            nazev=nazev,
            venkovni=venkovni,
        ))

    # --- Vybavení (FixedFurniture) — kuchyňské linky, WC, sprchy, skříně ---
    vybaveni_counter = 0
    seen_ff_centers = set()  # deduplikace — SVG zdroj občas duplikuje objekty
    for el in root.iter():
        cls = el.get("class") or ""
        parts = cls.split()
        if not parts or parts[0] != "FixedFurniture":
            continue
        if len(parts) < 2:
            continue

        typ = parts[1]
        podtyp = parts[2] if len(parts) >= 3 else None
        kategorie = FURNITURE_KATEGORIE.get(typ, 'ostatni')

        # Preference scope pro extrakci tvaru:
        # 1. OverlayPolygon — skutečný vnější tvar (např. rohový krb = pětiúhelník)
        # 2. BoundaryPolygon — vnější bbox (fallback, často čtverec)
        # 3. celý element — fallback (pro objekty bez výše uvedených)
        # Některé objekty (Toilet, Sink) nemají <polygon> ale <rect>/<path>.
        scope = None
        for preferred in ('OverlayPolygon', 'BoundaryPolygon'):
            for child in el.iter():
                if (child.get("class") or "") == preferred:
                    scope = child
                    break
            if scope is not None:
                break
        if scope is None:
            scope = el

        pts_local = extract_shape_bbox_points(scope)
        if pts_local is None or len(pts_local) < 3:
            continue

        # Detekce tvaru — obecné pravidlo pro všechny objekty:
        # - circle: pokud scope obsahuje <circle>/<ellipse> bez komplikovaných polygonů
        # - polygon: pokud pts_local má > 5 bodů (nepravidelný tvar, ne prostý bbox)
        # - rect (default): obdélníkový tvar, renderuje se jako bbox
        tvar = 'rect'
        circles = [c for c in scope.iter()
                   if (c.tag.split('}')[-1] if '}' in c.tag else c.tag) in ('circle', 'ellipse')]
        polygons_in_scope = [p for p in scope.iter()
                             if (p.tag.split('}')[-1] if '}' in p.tag else p.tag) == 'polygon']
        rects_in_scope = [r for r in scope.iter()
                          if (r.tag.split('}')[-1] if '}' in r.tag else r.tag) == 'rect']
        if circles and len(polygons_in_scope) <= 1 and len(rects_in_scope) == 0:
            tvar = 'circle'
        elif len(pts_local) > 5:
            tvar = 'polygon'

        # Aplikovat transformy nahoru (počínaje parent scope elementu)
        pts_world = pts_local
        current = scope
        while current is not None:
            t = current.get('transform')
            if t:
                pts_world = apply_transform(pts_world, t)
            current = current.getparent()

        try:
            poly_world = Polygon(pts_world)
            if not poly_world.is_valid:
                poly_world = poly_world.buffer(0)
            if poly_world.is_empty:
                continue
            centroid = poly_world.centroid
            minx, miny, maxx, maxy = poly_world.bounds
            sirka_px = maxx - minx
            hloubka_px = maxy - miny
        except Exception:
            continue

        # Deduplikace podle středu (tolerance 2 px)
        key = (round(centroid.x / 2) * 2, round(centroid.y / 2) * 2, typ)
        if key in seen_ff_centers:
            continue
        seen_ff_centers.add(key)

        # 3D rozměry z <desc>Width:X Height:Y Depth:Z Elevation:E</desc> (cm)
        vyska_m = None
        elevation_m = None
        for d in el.findall('.//' + f"{{{SVG_NS}}}" + 'desc'):
            text = (d.text or '')
            # Format: "Width:60 Height:90 Depth:60 Elevation:0"
            import re as _re
            h_match = _re.search(r'Height:(\d+(?:\.\d+)?)', text)
            e_match = _re.search(r'Elevation:(\d+(?:\.\d+)?)', text)
            if h_match:
                vyska_m = float(h_match.group(1)) / 100.0
            if e_match:
                elevation_m = float(e_match.group(1)) / 100.0
            break

        # Rotace z transform matice — součet rotací nadřazených elementů.
        # Pro zjednodušení bereme rotaci z NEJVNITŘNĚJŠÍHO transformu (scope),
        # což u FixedFurniture je typicky ta rozhodující.
        import math as _math
        uhel_rad = 0.0
        current = scope
        while current is not None:
            t = current.get('transform') or ''
            if 'matrix' in t:
                import re as _re
                m = _re.match(r'matrix\(([^)]+)\)', t)
                if m:
                    vals = [float(x) for x in m.group(1).replace(',', ' ').split()]
                    if len(vals) >= 4:
                        a, b = vals[0], vals[1]
                        uhel_rad += _math.atan2(b, a)
            current = current.getparent()
        uhel_deg = _math.degrees(uhel_rad)
        # Normalizace y-invertovaného světa — změna znaménka rotace
        uhel_out = (-uhel_deg) % 360

        # Detekce "zadní strany" — strana objektu přiléhající ke stěně.
        # Pro Toilet a podobné objekty: zadní strana je na KRATŠÍ straně
        # bboxu (reálně: WC je vždy hlubší než širší, tank je na zadní kratší
        # straně). Vybereme z 2 krátkých stran bboxu tu, která je blíž stěně.
        zadni_strana = None
        if typ in ('Toilet', 'Sink', 'RoundSink', 'Bathtub', 'Shower', 'Fireplace',
                   'FireplaceCorner', 'BaseCabinet', 'WallCabinet'):
            minx, miny, maxx, maxy = poly_world.bounds
            bbox_w = maxx - minx
            bbox_h = maxy - miny
            # Krátké strany bboxu:
            # - Pokud portrait (h > w): krátké = horní a spodní (N, S)
            # - Pokud landscape (w >= h): krátké = levá a pravá (W, E)
            if bbox_h > bbox_w:
                short_sides = [
                    ((minx + maxx) / 2, miny, 'north'),  # SVG y-down: top = miny
                    ((minx + maxx) / 2, maxy, 'south'),
                ]
            else:
                short_sides = [
                    (minx, (miny + maxy) / 2, 'west'),
                    (maxx, (miny + maxy) / 2, 'east'),
                ]

            # Pro každou krátkou stranu najít nejbližší stěnu, vzít tu kratší
            best_side = None
            best_dist = float('inf')
            for sx, sy, side_name in short_sides:
                spt = Point(sx, sy)
                for _, ca, cb, _thk, _wpts in wall_geoms_px:
                    line = LineString([ca, cb])
                    d = line.distance(spt)
                    if d < best_dist:
                        best_dist = d
                        best_side = side_name

            # Sanity check — pokud je žádná stěna blíž než dvojnásobek bbox
            # diagonály, objekt je zřejmě volně stojící; zadni_strana = None
            max_acceptable = 2 * max(bbox_w, bbox_h)
            if best_dist < max_acceptable:
                zadni_strana = best_side

        vybaveni_counter += 1
        polygon_m = [[p[0] * PX_TO_M, -p[1] * PX_TO_M] for p in pts_world]
        konv.vybaveni.append(Vybaveni(
            id=f"V{vybaveni_counter}",
            typ=typ,
            podtyp=podtyp,
            kategorie=kategorie,
            stred=[centroid.x * PX_TO_M, -centroid.y * PX_TO_M],
            polygon=polygon_m,
            sirka=round(sirka_px * PX_TO_M, 3),
            hloubka=round(hloubka_px * PX_TO_M, 3),
            tvar=tvar,
            uhel=round(uhel_out, 1),
            zadni_strana=zadni_strana,
            vyska=vyska_m,
            elevation=elevation_m,
        ))

    # --- Sloupy (Column) ---
    sloup_counter = 0
    for el in root.iter():
        if el.get('id') != 'Column':
            continue
        polys = el.findall(f".//{{{SVG_NS}}}polygon")
        if not polys:
            continue
        pts_local = parse_points(polys[0].get('points', ''))
        if len(pts_local) < 3:
            continue
        # Aplikovat transformy
        current = polys[0]
        pts_world = pts_local
        while current is not None:
            t = current.get('transform')
            if t:
                pts_world = apply_transform(pts_world, t)
            current = current.getparent()
        try:
            poly_w = Polygon(pts_world)
            if not poly_w.is_valid:
                poly_w = poly_w.buffer(0)
            if poly_w.is_empty:
                continue
            minx, miny, maxx, maxy = poly_w.bounds
            centroid = poly_w.centroid
        except Exception:
            continue

        sloup_counter += 1
        konv.sloupy.append(Sloup(
            id=f"C{sloup_counter}",
            stred=[centroid.x * PX_TO_M, -centroid.y * PX_TO_M],
            polygon=[[p[0] * PX_TO_M, -p[1] * PX_TO_M] for p in pts_world],
            sirka=round((maxx - minx) * PX_TO_M, 3),
            hloubka=round((maxy - miny) * PX_TO_M, 3),
        ))

    # --- Zábradlí (Railing) ---
    railing_counter = 0
    for el in root.iter():
        if el.get('id') != 'Railing':
            continue
        polys = el.findall(f".//{{{SVG_NS}}}polygon")
        pts_world = None
        if polys:
            pts_local = parse_points(polys[0].get('points', ''))
            if len(pts_local) >= 2:
                current = polys[0]
                pts_world = pts_local
                while current is not None:
                    t = current.get('transform')
                    if t:
                        pts_world = apply_transform(pts_world, t)
                    current = current.getparent()
        if not pts_world or len(pts_world) < 2:
            continue
        try:
            poly_w = Polygon(pts_world) if len(pts_world) >= 3 else None
            if poly_w is not None:
                minx, miny, maxx, maxy = poly_w.bounds
                delka_px = max(maxx - minx, maxy - miny)
            else:
                delka_px = math.hypot(pts_world[-1][0] - pts_world[0][0],
                                       pts_world[-1][1] - pts_world[0][1])
        except Exception:
            continue

        railing_counter += 1
        konv.zabradli.append(Zabradli(
            id=f"R{railing_counter}",
            polygon=[[p[0] * PX_TO_M, -p[1] * PX_TO_M] for p in pts_world],
            delka=round(delka_px * PX_TO_M, 3),
        ))

    # --- Schodiště (Stairs) ---
    # Stairs obsahuje podstrukturu: Flight (rameno), Winding (zatočení),
    # Landing (mezipodesta), Steps (jednotlivé stupně — dekorativní indikátor).
    # Celkový polygon schodiště = UNION polygonů všech Flight/Winding/Landing.
    SCHODISTE_CASTI = {'Flight', 'Winding', 'Landing'}
    schodiste_counter = 0
    for el in root.iter():
        if el.get('id') != 'Stairs':
            continue

        # Sebrat všechny polygony Flight/Winding/Landing uvnitř (v lokál. souř.
        # transformované do světových přes jejich transform chain)
        component_polys = []
        for child in el.iter():
            # Buď id nebo class je v SCHODISTE_CASTI
            _id = child.get('id') or ''
            _cls = (child.get('class') or '').split()
            if _id in SCHODISTE_CASTI or (_cls and _cls[0] in SCHODISTE_CASTI):
                poly_el = child.find(f"{{{SVG_NS}}}polygon")
                if poly_el is None:
                    continue
                pts_local = parse_points(poly_el.get('points', ''))
                if len(pts_local) < 3:
                    continue
                # Aplikovat transformy nahoru (včetně Stairs a jeho předků)
                pts_world = pts_local
                current = poly_el
                while current is not None:
                    t = current.get('transform')
                    if t:
                        pts_world = apply_transform(pts_world, t)
                    current = current.getparent()
                try:
                    poly_w = Polygon(pts_world)
                    if not poly_w.is_valid:
                        poly_w = poly_w.buffer(0)
                    if not poly_w.is_empty:
                        component_polys.append(poly_w)
                except Exception:
                    continue

        # Fallback — pokud žádné Flight/Winding/Landing nejsou, vzít všechny polygony
        # (bez prázdných class které typicky reprezentují šipky indikátoru směru)
        if not component_polys:
            for poly_el in el.findall(f".//{{{SVG_NS}}}polygon"):
                parent = poly_el.getparent()
                parent_cls = (parent.get('class') or '') if parent is not None else ''
                if not parent_cls:
                    continue  # přeskakujeme dekorativní šipky bez class
                pts_local = parse_points(poly_el.get('points', ''))
                if len(pts_local) < 3:
                    continue
                pts_world = pts_local
                current = poly_el
                while current is not None:
                    t = current.get('transform')
                    if t:
                        pts_world = apply_transform(pts_world, t)
                    current = current.getparent()
                try:
                    poly_w = Polygon(pts_world)
                    if not poly_w.is_valid:
                        poly_w = poly_w.buffer(0)
                    if not poly_w.is_empty:
                        component_polys.append(poly_w)
                except Exception:
                    continue

        if not component_polys:
            continue

        # Union všech komponent → celý bbox schodiště
        try:
            union_poly = unary_union(component_polys)
            if union_poly.geom_type == 'Polygon':
                exterior = list(union_poly.exterior.coords)
                total_area = union_poly.area
            elif union_poly.geom_type == 'MultiPolygon':
                # vzít konvex hull (pokud komponenty jsou nesouvislé)
                hull = union_poly.convex_hull
                exterior = list(hull.exterior.coords)
                total_area = union_poly.area  # reálná plocha (bez hull)
            else:
                continue
            plocha_m2 = total_area * (PX_TO_M ** 2)
            centroid = union_poly.centroid
        except Exception:
            continue

        # Jednotlivé stupně = <line> elementy uvnitř <g id="Steps" / class="Steps">
        # Každá line = jeden stupeň (riser). Aplikovat transformy nahoru.
        stupne = []
        for step_group in el.iter():
            is_steps = (step_group.get('id') == 'Steps'
                        or (step_group.get('class') or '').startswith('Steps'))
            if not is_steps:
                continue
            for line_el in step_group.findall(f".//{{{SVG_NS}}}line"):
                try:
                    x1 = float(line_el.get('x1', 0))
                    y1 = float(line_el.get('y1', 0))
                    x2 = float(line_el.get('x2', 0))
                    y2 = float(line_el.get('y2', 0))
                except (ValueError, TypeError):
                    continue
                # Aplikovat transformy nahoru
                pts = [(x1, y1), (x2, y2)]
                current = line_el
                while current is not None:
                    t = current.get('transform')
                    if t:
                        pts = apply_transform(pts, t)
                    current = current.getparent()
                # Do metrů s invertovanou y
                stupne.append([
                    [pts[0][0] * PX_TO_M, -pts[0][1] * PX_TO_M],
                    [pts[1][0] * PX_TO_M, -pts[1][1] * PX_TO_M],
                ])

        schodiste_counter += 1
        konv.schodiste.append(Schodiste(
            id=f"S{schodiste_counter}",
            polygon=[[p[0] * PX_TO_M, -p[1] * PX_TO_M] for p in exterior],
            stred=[centroid.x * PX_TO_M, -centroid.y * PX_TO_M],
            pocet_stupnu=len(stupne),
            plocha_m2=round(plocha_m2, 2),
            stupne=stupne,
        ))

    # Spočítat plochu budovy (union vnitřních Space)
    plocha_budovy = 0.0
    if perimeter_line is not None:
        try:
            coords = list(perimeter_line.coords)
            building_poly = Polygon(coords)
            if building_poly.is_valid:
                plocha_budovy = building_poly.area * (PX_TO_M ** 2)
        except Exception:
            pass

    # Spočítat unikátní uzly (po magnet slučování) pro statistiku
    unique_nodes = set()
    for s in konv.steny:
        unique_nodes.add(tuple(s.od))
        unique_nodes.add(tuple(s.do))

    # Statistiky
    typ_steny_pocty = {"obvodova": 0, "nosna": 0, "pricka": 0}
    for s in konv.steny:
        typ_steny_pocty[s.typ] = typ_steny_pocty.get(s.typ, 0) + 1

    typy_prostoru = {}
    for p in konv.prostory:
        key = f"{p.typ}/{p.podtyp}" if p.podtyp else p.typ
        typy_prostoru[key] = typy_prostoru.get(key, 0) + 1

    kategorie_vybaveni = {}
    for v in konv.vybaveni:
        kategorie_vybaveni[v.kategorie] = kategorie_vybaveni.get(v.kategorie, 0) + 1

    # --- Wall outline: union polygonů všech stěn pro čistý render ---
    # Každá stěna jako shapely Polygon (orientovaný obdélník), pak unary_union.
    # Výsledek: souvislý obrys budovy bez vnitřních spár u T/L/X napojení.
    # Per-wall identita zůstává v konv.steny pro hover/hit-test.
    wall_rects_px = []
    for wid, ca, cb, thk_px, _ in wall_geoms_px:
        dxw = cb[0] - ca[0]
        dyw = cb[1] - ca[1]
        L_w = math.hypot(dxw, dyw)
        if L_w == 0 or thk_px <= 0:
            continue
        nxw = -dyw / L_w
        nyw = dxw / L_w
        half_w = thk_px / 2.0
        try:
            rect = Polygon([
                (ca[0] + nxw * half_w, ca[1] + nyw * half_w),
                (ca[0] - nxw * half_w, ca[1] - nyw * half_w),
                (cb[0] - nxw * half_w, cb[1] - nyw * half_w),
                (cb[0] + nxw * half_w, cb[1] + nyw * half_w),
            ])
            if rect.is_valid and not rect.is_empty:
                wall_rects_px.append(rect)
        except Exception:
            pass

    wall_outline = []
    if wall_rects_px:
        try:
            # Mikro-buffer 1.5 px (jen FP safety) — zacelí sub-pixelové mezery
            # z floating-point nepřesností. Skutečné mezery v rozích řeší
            # L-SNAP v parseru (cílené, podmíněné typem napojení).
            union = unary_union(wall_rects_px)
            closed = union.buffer(1.5, join_style=2).buffer(-1.5, join_style=2)
            geoms = []
            if closed.geom_type == 'Polygon':
                geoms = [closed]
            elif closed.geom_type == 'MultiPolygon':
                geoms = list(closed.geoms)
            for g in geoms:
                if g.is_empty:
                    continue
                exterior = [[p[0] * PX_TO_M, -p[1] * PX_TO_M]
                            for p in list(g.exterior.coords)[:-1]]
                holes = []
                for ring in g.interiors:
                    holes.append([[p[0] * PX_TO_M, -p[1] * PX_TO_M]
                                  for p in list(ring.coords)[:-1]])
                wall_outline.append({"exterior": exterior, "holes": holes})
        except Exception as e:
            print(f"WARN: wall_outline union selhal: {e}", file=sys.stderr)

    konv.metadata["wall_outline"] = wall_outline
    konv.metadata["plocha_budovy_m2"] = round(plocha_budovy, 1)
    konv.metadata["ma_obvod"] = perimeter_line is not None
    konv.metadata["stats"] = {
        "pocet_sten": len(konv.steny),
        "pocet_uzlu": len(unique_nodes),
        "pocet_otvoru": len(konv.otvory),
        "pocet_prostoru": len(konv.prostory),
        "pocet_vybaveni": len(konv.vybaveni),
        "pocet_sloupu": len(konv.sloupy),
        "pocet_zabradli": len(konv.zabradli),
        "pocet_schodist": len(konv.schodiste),
        "typy_sten": typ_steny_pocty,
        "typy_prostoru": typy_prostoru,
        "kategorie_vybaveni": kategorie_vybaveni,
    }

    return konv


# =============================================================================
# CLI
# =============================================================================

def to_dict(konv: Konvertovany) -> dict:
    """
    Výstup kompatibilní s StavebniEngine.fromJSON v Koncept.
    Navíc obsahuje prostory[], vybaveni[], sloupy[], zabradli[], schodiste[]
    — ty engine zatím ignoruje, ale ukládají se pro budoucí editor a RAG.
    """
    return {
        "steny": [asdict(s) for s in konv.steny],
        "otvory": [asdict(o) for o in konv.otvory],
        "prostory": [asdict(p) for p in konv.prostory],
        "vybaveni": [asdict(v) for v in konv.vybaveni],
        "sloupy": [asdict(s) for s in konv.sloupy],
        "zabradli": [asdict(z) for z in konv.zabradli],
        "schodiste": [asdict(s) for s in konv.schodiste],
        "metadata": konv.metadata,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("svg", type=Path, help="Cesta k model.svg")
    parser.add_argument("--out", type=Path, help="Cesta k výstupnímu JSON (default: stdout)")
    parser.add_argument("--pretty", action="store_true", help="Indent 2 mezery")
    args = parser.parse_args()

    if not args.svg.exists():
        print(f"ERROR: {args.svg} neexistuje", file=sys.stderr)
        return 1

    konv = parse_svg(args.svg)
    out_dict = to_dict(konv)

    indent = 2 if args.pretty else None
    json_str = json.dumps(out_dict, indent=indent, ensure_ascii=False)

    if args.out:
        args.out.write_text(json_str, encoding="utf-8")
        print(f"Zapsáno: {args.out}", file=sys.stderr)
    else:
        sys.stdout.write(json_str)
        sys.stdout.write("\n")

    # Stats na stderr
    stats = konv.metadata["stats"]
    print(
        f"\n[{konv.metadata['original_id']}] "
        f"{stats['pocet_uzlu']} uzlů, "
        f"{stats['pocet_sten']} stěn, "
        f"{stats['pocet_otvoru']} otvorů, "
        f"{stats['pocet_mistnosti']} místností",
        file=sys.stderr,
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())
