"""
Detekce obvodu budovy — union polygonů všech vnitřních Space.
Stěny ležící na obvodu = "obvodova", ostatní podle tloušťky.
"""

from __future__ import annotations

import sys
from pathlib import Path

from lxml import etree
from shapely.geometry import Polygon
from shapely.ops import unary_union

NS = '{http://www.w3.org/2000/svg}'

# Venkovní prostory NEzahrnujeme do obvodu budovy
VENKOVNI_SPACE = {'Outdoor', 'Terrace', 'Balcony', 'CarPort', 'Garage', 'Garden', 'Yard'}


def parse_polygon_points(points_str):
    tokens = points_str.replace(',', ' ').split()
    try:
        pts = [(float(tokens[i]), float(tokens[i + 1])) for i in range(0, len(tokens) - 1, 2)]
    except (ValueError, IndexError):
        return []
    return pts


def apply_transform(pts, transform_str):
    """Aplikuje SVG transform matrix(a,b,c,d,e,f) na body."""
    if not transform_str or 'matrix' not in transform_str:
        return pts
    # matrix(a,b,c,d,e,f)
    import re
    m = re.match(r'matrix\(([^)]+)\)', transform_str)
    if not m:
        return pts
    vals = [float(x) for x in m.group(1).replace(',', ' ').split()]
    if len(vals) != 6:
        return pts
    a, b, c, d, e, f = vals
    return [(a * x + c * y + e, b * x + d * y + f) for x, y in pts]


def get_space_polygon_world(space):
    """Vrátí polygon Space v globálních souřadnicích (po aplikaci všech transformů nahoru)."""
    poly_el = space.find(NS + 'polygon')
    if poly_el is None:
        return None
    pts = parse_polygon_points(poly_el.get('points', ''))
    if len(pts) < 3:
        return None

    # Aplikovat transformy od polygonu směrem nahoru
    el = poly_el
    while el is not None:
        t = el.get('transform')
        if t:
            pts = apply_transform(pts, t)
        el = el.getparent()
    return pts


def analyze(svg_path):
    tree = etree.parse(str(svg_path))
    root = tree.getroot()

    # Sebrat polygony vnitřních Space
    spaces = [el for el in root.iter() if (el.get('class') or '').startswith('Space ')]

    inside_polys = []
    all_polys = []
    for sp in spaces:
        cls_parts = (sp.get('class') or '').split()
        typ = cls_parts[1] if len(cls_parts) > 1 else ''
        pts = get_space_polygon_world(sp)
        if not pts or len(pts) < 3:
            continue
        try:
            poly = Polygon(pts)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty:
                continue
        except Exception:
            continue

        all_polys.append((typ, poly))
        if typ not in VENKOVNI_SPACE:
            inside_polys.append(poly)

    if not inside_polys:
        return None

    # Union
    try:
        building = unary_union(inside_polys)
    except Exception as e:
        return None

    # Exterior boundary
    if building.geom_type == 'Polygon':
        exterior = list(building.exterior.coords)
        area = building.area
    elif building.geom_type == 'MultiPolygon':
        biggest = max(building.geoms, key=lambda g: g.area)
        exterior = list(biggest.exterior.coords)
        area = sum(g.area for g in building.geoms)
    else:
        return None

    return {
        'file': svg_path.parent.name,
        'spaces_total': len(all_polys),
        'spaces_inside': len(inside_polys),
        'building_area_m2': round(area * 0.0001, 1),  # px² → m² (1 px = 1 cm)
        'exterior_points': len(exterior),
        'space_types': sorted(set(typ for typ, _ in all_polys)),
    }


def main():
    for svg in sorted(Path('samples').glob('*/model.svg'))[:15]:
        r = analyze(svg)
        if r:
            types_str = ', '.join(r['space_types'][:10])
            print(f"{r['file']:<8} {r['spaces_inside']:2d}/{r['spaces_total']:2d} Space  "
                  f"obvod {r['exterior_points']:2d} bodů  plocha {r['building_area_m2']:5.1f} m²  "
                  f"[{types_str}]")


if __name__ == "__main__":
    main()
