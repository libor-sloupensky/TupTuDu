"""Spustí parse_pudorys na všech samples/*/model.svg a shrne výsledky."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from parse_pudorys import parse_svg, to_dict

SAMPLES_DIR = Path(__file__).parent / "samples"


def main() -> int:
    svgs = sorted(SAMPLES_DIR.glob("*/model.svg"))
    if not svgs:
        print("Žádné samply.")
        return 1

    print(f"{'ID':<10} {'uzly':>5} {'stěny':>6} {'otvory':>7} {'prost.':>7} {'vybav':>6} {'m² celkem':>10}")
    print("-" * 55)

    total_walls = 0
    total_nodes = 0
    total_openings = 0
    for svg in svgs:
        konv = parse_svg(svg)
        out_path = svg.parent / "output.json"
        out_path.write_text(
            json.dumps(to_dict(konv), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        stats = konv.metadata["stats"]
        total_plocha = sum(p.plocha_m2 for p in konv.prostory)

        print(
            f"{konv.metadata['original_id']:<10} "
            f"{stats['pocet_uzlu']:>5} "
            f"{stats['pocet_sten']:>6} "
            f"{stats['pocet_otvoru']:>7} "
            f"{stats.get('pocet_prostoru', 0):>7} "
            f"{stats.get('pocet_vybaveni', 0):>6} "
            f"{total_plocha:>9.1f}"
        )

        total_walls += stats["pocet_sten"]
        total_nodes += stats["pocet_uzlu"]
        total_openings += stats["pocet_otvoru"]

    print("-" * 55)
    print(f"{'Σ':<10} {total_nodes:>5} {total_walls:>6} {total_openings:>7}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
