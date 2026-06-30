"""
Stáhne náhodné SVG z CubiCasa5K, filtruje při downloadu a uloží jen ty co projdou
kritéria. Současně spustí parser a vytvoří output.json.

Filtry (scénář B):
  - má kuchyň + LivingRoom + ≥1 ložnici (= rezidenční bydlení)
  - bez sauny
  - vnitřní plocha 60-300 m²

Usage:
    python fetch_filtered.py --target 70 --max-download 1000

Algoritmus:
  1. Připoj central directory archivu Zenodo
  2. Náhodně vyber N ID (mimo již-stažené)
  3. Pro každé: stáhni SVG → quick parse → check filtry
  4. Pokud prošlo: ulož SVG na disk + spusť parse_pudorys → output.json
  5. Pokud neprošlo: zahoď
  6. Stop když dosáhneš target nebo vyčerpáš max_download
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import time
from pathlib import Path

from lxml import etree
from remotezip import RemoteZip

from parse_pudorys import parse_svg as full_parse, to_dict

ZENODO_URL = "https://zenodo.org/records/2613548/files/cubicasa5k.zip?download=1"
SAMPLES_DIR = Path(__file__).parent / "samples"
SVG_NS = "http://www.w3.org/2000/svg"
VENKOVNI = {'Outdoor', 'Terrace', 'Balcony', 'CarPort', 'Garage', 'Yard', 'Garden'}


def quick_parse(svg_bytes):
    """Rychlý parsing — extrahuje jen co potřebujeme pro filtraci."""
    try:
        root = etree.fromstring(svg_bytes)
    except etree.XMLSyntaxError:
        return None

    plocha_vnitrni = 0.0
    pocet_loznic = 0
    pocet_obyvacich = 0
    ma_kuchyn = False
    ma_saunu = False

    for g in root.findall(f'.//{{{SVG_NS}}}g[@class]'):
        cls = g.get('class', '')
        if not cls.startswith('Space '):
            continue
        parts = cls.split()
        if len(parts) < 2:
            continue
        typ = parts[1]

        # Plocha (shoelace)
        poly = g.find(f'{{{SVG_NS}}}polygon')
        if poly is None:
            continue
        pts_raw = (poly.get('points') or '').replace(',', ' ').split()
        try:
            pts = [(float(pts_raw[i]), float(pts_raw[i + 1])) for i in range(0, len(pts_raw) - 1, 2)]
        except (ValueError, IndexError):
            continue
        if len(pts) < 3:
            continue
        a = 0.0
        for i in range(len(pts)):
            j = (i + 1) % len(pts)
            a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
        # 1 px = 1 cm → m² = abs(a) / 2 / 10000
        m2 = abs(a) / 2.0 / 10000.0

        if typ not in VENKOVNI:
            plocha_vnitrni += m2

        if 'Sauna' in typ:
            ma_saunu = True
        if typ in ('Bedroom', 'MasterBedroom'):
            pocet_loznic += 1
        if typ in ('LivingRoom', 'Den', 'Den/Fireplace'):
            pocet_obyvacich += 1
        if typ in ('Kitchen', 'Dining/Kitchen'):
            ma_kuchyn = True

    # Sauna i podle text matchu (fallback)
    if not ma_saunu:
        text = svg_bytes.decode('utf-8', errors='ignore')
        if 'Sauna' in text:
            ma_saunu = True

    # Kuchyň podle furniture (fallback)
    if not ma_kuchyn:
        text = svg_bytes.decode('utf-8', errors='ignore')
        if any(k in text for k in ('BaseCabinet', 'Refrigerator', 'Stove')):
            ma_kuchyn = True

    return {
        'plocha_vnitrni': round(plocha_vnitrni, 1),
        'pocet_loznic': pocet_loznic,
        'pocet_obyvacich': pocet_obyvacich,
        'ma_kuchyn': ma_kuchyn,
        'ma_saunu': ma_saunu,
    }


def projde_filtr_B(md, plocha_min=60, plocha_max=300):
    """Scénář B: bydlení + bez sauny + 60-300 m²."""
    if not md:
        return False
    if md['ma_saunu']:
        return False
    if not md['ma_kuchyn']:
        return False
    if md['pocet_obyvacich'] == 0:
        return False
    if md['pocet_loznic'] == 0:
        return False
    if md['plocha_vnitrni'] < plocha_min or md['plocha_vnitrni'] > plocha_max:
        return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', type=int, default=70, help='Cílový počet vyhovujících samplů')
    parser.add_argument('--max-download', type=int, default=1000, help='Max počet stažení (cap)')
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--plocha-min', type=float, default=60)
    parser.add_argument('--plocha-max', type=float, default=300)
    args = parser.parse_args()

    SAMPLES_DIR.mkdir(exist_ok=True)
    existing_ids = {d.name for d in SAMPLES_DIR.iterdir() if d.is_dir()}
    print(f'>>> Lokálně už máme {len(existing_ids)} samplů — vyloučím je z náhodného výběru.')
    print(f'>>> Cíl: {args.target} vyhovujících (max {args.max_download} stažení)')
    print(f'>>> Filtr B: bydlení + bez sauny + {args.plocha_min}-{args.plocha_max} m² vnitřní plochy')
    print()

    pocet_prijatych = 0
    pocet_stazenych = 0
    pocet_zamitnutych_sauna = 0
    pocet_zamitnutych_velikost = 0
    pocet_zamitnutych_neni_bydleni = 0
    pocet_chyb = 0

    start = time.time()
    with RemoteZip(ZENODO_URL) as z:
        all_names = [n for n in z.namelist() if n.endswith('/model.svg')]
        # Filtrovat ty co už máme
        kandidati = []
        for n in all_names:
            sample_id = n.rsplit('/model.svg', 1)[0].replace('\\', '/').split('/')[-1]
            if sample_id in existing_ids:
                continue
            kandidati.append((sample_id, n))

        print(f'>>> Archiv: {len(all_names)} celkem, {len(kandidati)} po vyloučení duplikátů.')

        random.seed(args.seed)
        random.shuffle(kandidati)

        for sample_id, name in kandidati:
            if pocet_prijatych >= args.target:
                print(f'\n>>> Cíl dosažen ({args.target} vyhovujících) — končím.')
                break
            if pocet_stazenych >= args.max_download:
                print(f'\n>>> Cap dosažen ({args.max_download} stažení) — končím.')
                break

            pocet_stazenych += 1
            try:
                with z.open(name) as f:
                    svg_bytes = f.read()
            except Exception as e:
                pocet_chyb += 1
                if pocet_stazenych % 25 == 0:
                    print(f'  [{pocet_stazenych:>4}] chyba download #{sample_id}: {e}')
                continue

            md = quick_parse(svg_bytes)
            if not md:
                pocet_chyb += 1
                continue

            # Důvod zamítnutí (pro statistiku)
            if not projde_filtr_B(md, args.plocha_min, args.plocha_max):
                if md['ma_saunu']:
                    pocet_zamitnutych_sauna += 1
                elif md['plocha_vnitrni'] < args.plocha_min or md['plocha_vnitrni'] > args.plocha_max:
                    pocet_zamitnutych_velikost += 1
                else:
                    pocet_zamitnutych_neni_bydleni += 1

                # Status update každých 25 stažených
                if pocet_stazenych % 25 == 0:
                    rate = pocet_prijatych / pocet_stazenych * 100
                    print(f'  [{pocet_stazenych:>4}] přijato: {pocet_prijatych} ({rate:.1f}%) | '
                          f'zamítnuto sauna={pocet_zamitnutych_sauna} velikost={pocet_zamitnutych_velikost} '
                          f'ne-bydleni={pocet_zamitnutych_neni_bydleni} chyb={pocet_chyb}')
                    sys.stdout.flush()
                continue

            # PROŠEL — uložit SVG + spustit parser
            target_dir = SAMPLES_DIR / sample_id
            target_dir.mkdir(parents=True, exist_ok=True)
            (target_dir / 'model.svg').write_bytes(svg_bytes)

            try:
                full = full_parse(target_dir / 'model.svg')
                with (target_dir / 'output.json').open('w', encoding='utf-8') as f:
                    json.dump(to_dict(full), f, ensure_ascii=False, indent=2)
            except Exception as e:
                # Parser selhal — smaž SVG, nepočítej do prijatých
                (target_dir / 'model.svg').unlink(missing_ok=True)
                target_dir.rmdir()
                pocet_chyb += 1
                print(f'  [{pocet_stazenych:>4}] PARSER selhal #{sample_id}: {e}')
                continue

            pocet_prijatych += 1
            print(f'  [{pocet_stazenych:>4}] ✓ #{sample_id}  '
                  f'plocha={md["plocha_vnitrni"]} m² O={md["pocet_obyvacich"]} L={md["pocet_loznic"]}  '
                  f'(přijato {pocet_prijatych}/{args.target})')
            sys.stdout.flush()

    elapsed = time.time() - start
    print()
    print(f'====== HOTOVO ({elapsed:.0f}s) ======')
    print(f'Stáhnuto:           {pocet_stazenych}')
    print(f'Přijato (uloženo):  {pocet_prijatych}')
    print(f'Zamítnuto sauna:    {pocet_zamitnutych_sauna}')
    print(f'Zamítnuto velikost: {pocet_zamitnutych_velikost}')
    print(f'Zamítnuto ne-RD:    {pocet_zamitnutych_neni_bydleni}')
    print(f'Chyb:               {pocet_chyb}')
    print(f'Yield:              {100*pocet_prijatych/max(pocet_stazenych,1):.1f}%')

    return 0


if __name__ == '__main__':
    sys.exit(main())
