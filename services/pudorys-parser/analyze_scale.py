"""
Analýza reálného měřítka SVG z textových rozměrů v SpaceDimensionsLabel.

Každý SpaceDimensionsLabel má text jako "5'9\" x 12'6\"" (imperiální) nebo
"5.2 x 3.1 m" (metrický) — konkrétní rozměr místnosti. Spojením s BoundaryPolygon
lokální bbox v px získáme měřítko px → metry.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from statistics import median

from lxml import etree

NS = '{http://www.w3.org/2000/svg}'

# Imperiální: 5'9" x 12'6"
RE_IMPERIAL = re.compile(r'''(\d+)'(\d+)"\s*[xX×]\s*(\d+)'(\d+)"''')
# Metrický: 5.2 m x 3.1 m nebo 5.2 x 3.1
RE_METRIC = re.compile(r'(\d+[\.,]?\d*)\s*m?\s*[xX×]\s*(\d+[\.,]?\d*)\s*m?')


def parse_dim(text: str):
    """→ (m1, m2) v metrech nebo None."""
    text = text.strip()
    m = RE_IMPERIAL.search(text)
    if m:
        f1, i1, f2, i2 = map(int, m.groups())
        return (f1 * 0.3048 + i1 * 0.0254, f2 * 0.3048 + i2 * 0.0254)
    m = RE_METRIC.search(text.replace(',', '.'))
    if m:
        try:
            a, b = float(m.group(1)), float(m.group(2))
            # Sanity — realistický rozměr místnosti 0.5-30 m
            if 0.5 < a < 30 and 0.5 < b < 30:
                return (a, b)
        except ValueError:
            pass
    return None


def analyze_svg(svg_path: Path):
    tree = etree.parse(str(svg_path))
    root = tree.getroot()

    scales = []
    raw_samples = []

    for label in root.iter():
        cls = label.get('class') or ''
        if cls != 'SpaceDimensionsLabel':
            continue

        texts = [''.join(t.itertext()).strip() for t in label.findall('.//' + NS + 'text')]

        dim = None
        raw_text = None
        for t in texts:
            d = parse_dim(t)
            if d:
                dim = d
                raw_text = t
                break
        if not dim:
            continue

        # Nejbližší Space předek
        parent = label.getparent()
        space = None
        while parent is not None:
            if (parent.get('class') or '').startswith('Space '):
                space = parent
                break
            parent = parent.getparent()
        if space is None:
            continue

        # Polygon Space = první <polygon> dítě
        space_poly = space.find(NS + 'polygon')
        if space_poly is None:
            continue

        pts_raw = space_poly.get('points', '').replace(',', ' ').split()
        try:
            xs = [float(pts_raw[i]) for i in range(0, len(pts_raw) - 1, 2)]
            ys = [float(pts_raw[i]) for i in range(1, len(pts_raw), 2)]
        except (IndexError, ValueError):
            continue
        if len(xs) < 3 or len(ys) < 3:
            continue

        bbox_px = (max(xs) - min(xs), max(ys) - min(ys))
        if bbox_px[0] < 10 or bbox_px[1] < 10:
            continue

        d1, d2 = sorted(dim, reverse=True)
        p1, p2 = sorted(bbox_px, reverse=True)
        scale1 = d1 / p1
        scale2 = d2 / p2

        # Přijmeme jen pokud spárování dává smysl (poměry sedí v toleranci)
        ratio_m = d1 / d2 if d2 > 0 else 0
        ratio_p = p1 / p2 if p2 > 0 else 0
        if abs(ratio_m - ratio_p) / max(ratio_m, ratio_p) > 0.25:
            continue  # bbox polygon neodpovídá kótě (možná šikmá místnost)

        scales.append((scale1 + scale2) / 2)
        if len(raw_samples) < 3:
            raw_samples.append((raw_text, dim, bbox_px))

    return scales, raw_samples


def main():
    results = []
    for svg in sorted(Path('samples').glob('*/model.svg')):
        scales, samples = analyze_svg(svg)
        if scales:
            med = median(scales)
            results.append((svg.parent.name, len(scales), med, samples))

    print(f"{'ID':<8} {'N':>3} {'měřítko':>12} {'1 m ≈ px':>10}  ukázky")
    print("-" * 80)
    all_medians = []
    for id_, n, med, samples in results:
        px_per_m = 1 / med
        all_medians.append(med)
        samples_str = ', '.join(f"{t} → {p1:.0f}×{p2:.0f}px" for t, (d1, d2), (p1, p2) in samples[:2])
        print(f"{id_:<8} {n:>3} {med * 1000:>8.2f} mm/px {px_per_m:>10.2f}  {samples_str[:80]}")

    if all_medians:
        overall = median(all_medians)
        print("-" * 80)
        print(f"Medián přes {len(all_medians)} plánů: {overall * 1000:.2f} mm/px (1 m ≈ {1/overall:.2f} px)")
        print(f"Současný PX_TO_M v parseru: 10 mm/px (1 px = 1 cm)")
        print(f"Rozdíl od reality: {abs(overall * 1000 - 10) / 10 * 100:.1f} %")


if __name__ == "__main__":
    main()
