"""
Diagnostický skript — analyzuje strukturu stažených SVG.
Vypíše, co v samplech reálně je: viewBox, seznam id/class, počty elementů.
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from lxml import etree

SAMPLES_DIR = Path(__file__).parent / "samples"
NS = {"svg": "http://www.w3.org/2000/svg"}


def analyze(svg_path: Path) -> dict:
    tree = etree.parse(str(svg_path))
    root = tree.getroot()

    result = {
        "file": svg_path.parent.name,
        "size_bytes": svg_path.stat().st_size,
        "viewbox": root.get("viewBox"),
        "width": root.get("width"),
        "height": root.get("height"),
    }

    # Počty podle id a class
    ids = Counter()
    classes = Counter()
    for el in root.iter():
        _id = el.get("id")
        _cls = el.get("class")
        if _id:
            ids[_id] += 1
        if _cls:
            # Rozdělit na prefix (první slovo)
            first = _cls.split()[0] if _cls.strip() else ""
            classes[first] += 1

    result["top_ids"] = ids.most_common(10)
    result["top_classes"] = classes.most_common(15)

    # Konkrétní počty architektonických prvků
    def count_by_id(val: str) -> int:
        return sum(1 for _ in root.iter() if _.get("id") == val)

    def count_by_class_prefix(prefix: str) -> int:
        n = 0
        for el in root.iter():
            c = el.get("class") or ""
            if c.split() and c.split()[0] == prefix:
                n += 1
        return n

    result["walls"] = count_by_id("Wall")
    result["doors"] = count_by_id("Door")
    result["windows"] = count_by_id("Window")
    result["spaces"] = count_by_class_prefix("Space")
    result["furniture"] = count_by_class_prefix("FixedFurniture")
    result["boundary"] = count_by_class_prefix("BoundaryPolygon")

    # Pro první stěnu podívat se na obsah
    for el in root.iter():
        if el.get("id") == "Wall":
            polygons = el.findall(".//{http://www.w3.org/2000/svg}polygon")
            if polygons:
                pts = polygons[0].get("points", "")
                result["wall_example_points"] = pts[:200]
            break

    # Typy Space (kuchyň, ložnice...)
    space_types = Counter()
    for el in root.iter():
        c = el.get("class") or ""
        parts = c.split()
        if len(parts) >= 2 and parts[0] == "Space":
            space_types[parts[1]] += 1
    result["space_types"] = space_types.most_common()

    return result


def main() -> int:
    svgs = sorted(SAMPLES_DIR.glob("*/model.svg"))
    if not svgs:
        print("Žádné SVG v samples/. Spusť nejdřív fetch_samples.py.")
        return 1

    print(f"Analyzuji {len(svgs)} SVG souborů:\n")
    for svg in svgs:
        r = analyze(svg)
        print(f"=== {r['file']} ({r['size_bytes']} B) ===")
        print(f"  viewBox: {r['viewbox']}")
        print(f"  size:    {r['width']} x {r['height']}")
        print(f"  walls={r['walls']}, doors={r['doors']}, windows={r['windows']}, "
              f"spaces={r['spaces']}, furniture={r['furniture']}, boundary={r['boundary']}")
        if r.get("wall_example_points"):
            print(f"  wall_pts: {r['wall_example_points']}")
        print(f"  space_types: {dict(r['space_types'])}")
        print()

    # Agregát přes všechny
    print("=== AGREGÁT ===")
    total_walls = sum(r.get("walls", 0) for r in [analyze(s) for s in svgs])
    print(f"Stěn celkem v 10 vzorcích: {total_walls}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
