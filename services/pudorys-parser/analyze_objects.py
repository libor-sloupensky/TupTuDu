"""
Analýza objektů v SVG vzorcích:
- Dveře: jaký mají atribut pro směr otvírání?
- FixedFurniture: jaké kategorie a jak často se vyskytují?
- Space: všechny typy místností (prostorů)
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from lxml import etree

NS = '{http://www.w3.org/2000/svg}'


def analyze_door_swing(door_el):
    """Zjistit, jestli dveře mají info o směru otvírání."""
    # Prozkoumat class, id, transformy, podskupiny
    info = {}
    info['class'] = door_el.get('class') or ''
    info['id'] = door_el.get('id') or ''
    info['transform'] = door_el.get('transform') or ''

    # Child elementy — dveře mívají další informace ve <g> skupinách
    children = []
    for child in door_el:
        tag = child.tag.split('}')[-1]
        c = {'tag': tag, 'class': child.get('class') or '', 'id': child.get('id') or ''}
        children.append(c)
    info['children_classes'] = [c['class'] for c in children if c['class']]

    # Path element pro oblouk dveřního křídla (door swing arc)?
    paths = door_el.findall('.//' + NS + 'path')
    info['paths'] = len(paths)

    # Line elementy
    lines = door_el.findall('.//' + NS + 'line')
    info['lines'] = len(lines)

    # Svg circle/arc/ellipse pro křídlo?
    ellipses = door_el.findall('.//' + NS + 'ellipse')
    info['ellipses'] = len(ellipses)

    return info


def main():
    samples_dir = Path('samples')
    svgs = sorted(samples_dir.glob('*/model.svg'))
    print(f"Analyzuji {len(svgs)} vzorků\n")

    # ─── 1) Kategorie Space ────────────────────────────────
    space_types = Counter()
    for svg in svgs:
        tree = etree.parse(str(svg))
        root = tree.getroot()
        for el in root.iter():
            cls = (el.get('class') or '').split()
            if len(cls) >= 2 and cls[0] == 'Space':
                space_types[cls[1]] += 1

    print("=" * 70)
    print("SPACE (místnosti a prostory)")
    print("=" * 70)
    for typ, cnt in space_types.most_common():
        print(f"  {cnt:5d} × {typ}")
    print(f"  → celkem {len(space_types)} různých typů\n")

    # ─── 2) Kategorie FixedFurniture ───────────────────────
    ff_types = Counter()
    for svg in svgs:
        tree = etree.parse(str(svg))
        root = tree.getroot()
        for el in root.iter():
            cls = (el.get('class') or '').split()
            if cls and cls[0] == 'FixedFurniture':
                # Druhé slovo = specifický typ
                if len(cls) >= 2:
                    ff_types[cls[1]] += 1

    print("=" * 70)
    print("FixedFurniture (nábytek)")
    print("=" * 70)
    for typ, cnt in ff_types.most_common():
        print(f"  {cnt:5d} × {typ}")
    print(f"  → celkem {len(ff_types)} různých typů\n")

    # ─── 3) Door — struktura (hledání směru otvírání) ────────
    print("=" * 70)
    print("Door — struktura (hledání směru otvírání)")
    print("=" * 70)

    # Vzít 5 vzorků, u každého první 3 Door a prozkoumat
    for svg in svgs[:5]:
        tree = etree.parse(str(svg))
        root = tree.getroot()
        doors = [el for el in root.iter() if el.get('id') == 'Door']
        if not doors:
            continue
        print(f"\n  ── {svg.parent.name} ({len(doors)} dveří) ──")
        for i, d in enumerate(doors[:2]):
            info = analyze_door_swing(d)
            print(f"    Door #{i+1}:")
            print(f"      transform: {info['transform'][:60]}")
            print(f"      children classes: {info['children_classes'][:6]}")
            print(f"      paths={info['paths']}, lines={info['lines']}, ellipses={info['ellipses']}")

    # ─── 4) Sledované child classes v Door ──────────────────
    print("\n  == všechny class uvnitř Door (napříč 50 vzorky) ==")
    door_child_classes = Counter()
    for svg in svgs:
        tree = etree.parse(str(svg))
        for el in tree.getroot().iter():
            if el.get('id') == 'Door':
                for descendant in el.iter():
                    c = descendant.get('class')
                    if c:
                        door_child_classes[c] += 1
    for cls, n in door_child_classes.most_common(15):
        print(f"    {n:5d} × {cls}")

    # ─── 5) Transform matice u Door — analyzovat orientaci ──
    # Dveře otvírání lze odvodit z transform matice (rotation, mirror)
    print("\n  == unikátní transform matrices (prvních 20) ==")
    door_transforms = Counter()
    for svg in svgs[:10]:  # jen 10 vzorků pro ilustraci
        tree = etree.parse(str(svg))
        for el in tree.getroot().iter():
            if el.get('id') == 'Door':
                t = el.get('transform', '').strip()
                # Zjednodušit: jen prefix
                if t.startswith('matrix('):
                    # Extract pouze první 2 hodnoty (a, b) — určují rotaci/mirror
                    vals = t[7:].rstrip(')').replace(',', ' ').split()
                    if len(vals) >= 4:
                        a, b, c, d = vals[:4]
                        sig = f"a={a[:5]} b={b[:5]} c={c[:5]} d={d[:5]}"
                        door_transforms[sig] += 1
    for sig, n in door_transforms.most_common(20):
        print(f"    {n:3d} × {sig}")


if __name__ == "__main__":
    main()
