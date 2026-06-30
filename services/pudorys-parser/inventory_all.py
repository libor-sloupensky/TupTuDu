"""
Kompletní inventura — všechny ID a class napříč 50 vzorky.
Odhalí, jaké typy objektů v SVG vzorcích existují a které zatím ignorujeme.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path
from lxml import etree


def main():
    samples = sorted(Path('samples').glob('*/model.svg'))

    ids = Counter()
    class_prefixes = Counter()  # první slovo class
    class_full = Counter()       # celá class (např. "Space Outdoor Terrace")
    ff_full = Counter()          # všechna FixedFurniture class kombinace

    for svg in samples:
        tree = etree.parse(str(svg))
        for el in tree.getroot().iter():
            _id = el.get('id')
            _class = el.get('class')
            if _id:
                ids[_id] += 1
            if _class:
                parts = _class.split()
                class_prefixes[parts[0]] += 1
                class_full[_class] += 1
                if parts[0] == 'FixedFurniture':
                    ff_full[_class] += 1

    print("=" * 70)
    print(f"IDs (top 20 — architektonické prvky)")
    print("=" * 70)
    for k, n in ids.most_common(20):
        print(f"  {n:6d} × id={k}")

    print()
    print("=" * 70)
    print(f"Class PREFIXES (prvni slovo — celkem {len(class_prefixes)} kategorií)")
    print("=" * 70)
    for k, n in class_prefixes.most_common():
        print(f"  {n:6d} × {k}")

    print()
    print("=" * 70)
    print(f"Celkem {len(class_full)} různých class kombinací")
    print(f"Top 40 nejčastějších:")
    print("=" * 70)
    for k, n in class_full.most_common(40):
        print(f"  {n:6d} × {k}")

    print()
    print("=" * 70)
    print("FixedFurniture — plná class (podtypy)")
    print("=" * 70)
    for k, n in ff_full.most_common():
        print(f"  {n:5d} × {k}")


if __name__ == "__main__":
    main()
