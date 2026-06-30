"""
Stáhne 10 náhodných `model.svg` z SVG archivu na Zenodo přes HTTP range
requesty (remotezip). Nestahuje celý 5.5 GB zip — jen centrální adresář zipu
a potom dané soubory.

Usage:
    python fetch_samples.py              # 10 random samples
    python fetch_samples.py --count 20   # víc

Výstup: samples/{id}/model.svg
"""

from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

from remotezip import RemoteZip

ZENODO_URL = "https://zenodo.org/records/2613548/files/cubicasa5k.zip?download=1"
SAMPLES_DIR = Path(__file__).parent / "samples"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=10, help="Počet samplů")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    SAMPLES_DIR.mkdir(exist_ok=True)

    print(f"Otevírám remote zip: {ZENODO_URL}")
    print("(to načte jen centrální adresář, ne celý archiv)")

    with RemoteZip(ZENODO_URL) as z:
        all_names = z.namelist()
        svg_names = [n for n in all_names if n.endswith("/model.svg")]
        print(f"Nalezeno {len(svg_names)} model.svg v archivu.")

        random.seed(args.seed)
        chosen = random.sample(svg_names, min(args.count, len(svg_names)))

        for i, name in enumerate(chosen, 1):
            plan_id = name.rsplit("/model.svg", 1)[0].replace("\\", "/").split("/")[-1]
            target_dir = SAMPLES_DIR / plan_id
            target_dir.mkdir(parents=True, exist_ok=True)
            target = target_dir / "model.svg"

            if target.exists():
                print(f"  [{i}/{len(chosen)}] {plan_id}: existuje, přeskakuji")
                continue

            print(f"  [{i}/{len(chosen)}] {plan_id}: stahuji...")
            with z.open(name) as src, target.open("wb") as dst:
                dst.write(src.read())

        print(f"\nHotovo. Samply v {SAMPLES_DIR.relative_to(Path.cwd())}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
