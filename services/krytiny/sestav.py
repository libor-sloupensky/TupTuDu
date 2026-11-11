"""
Výroba textur střešních krytin (modules/dum.md, část Krytiny).

Zdroje jsou Poly Haven a ambientCG, oba CC0. Stažené mapy 1K se ukládají do services/krytiny/zdroje/
(mimo git), hotové textury do public/textury/krytiny/<id>/ a seznam vzhledů do vzhledy.json, který
šablony vkládají do stránky jako window.KRYTINY_VZHLEDY.

Pro každý vzhled vznikne:
  barva.webp    barva povrchu (sRGB); u přebarvitelných (plech, asfaltový pás) jen jas kolem 0,92
  normala.webp  normálová mapa v konvenci OpenGL (zelená nahoru = k hřebeni)
  arm.webp      R = zastínění spár, G = drsnost, B = 0 (kovovost řeší materiál)
  nahled.webp   vzorek 96 px se stínováním z normál, pro volbu v panelu

Spuštění: python services/krytiny/sestav.py [--znovu]
"""
import io, json, os, sys, urllib.request, zipfile
from PIL import Image, ImageFilter

KOREN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ZDROJE = os.path.join(KOREN, 'services', 'krytiny', 'zdroje')
VYSTUP = os.path.join(KOREN, 'public', 'textury', 'krytiny')
UA = {'User-Agent': 'tuptudu-textury/1.0'}
VELIKOST = 1024

# typ = id z TYPY_KRYTIN v dum.js. metru = kolik metrů pokryje jedna dlaždice textury (u Poly Haven
# z rozměrů zdroje, u ambientCG odpočítané z počtu tašek). Nahoře v obrázku je hřeben.
# prebarvit = barvu určuje uživatel, textura nese jen jas (plech a asfaltový pás se prodávají v libovolném odstínu).
# zakladni = čistý vzhled bez zvětrání: barva bez přesné shody (starší projekty, změna typu) se hledá jen mezi nimi.
VZHLEDY = [
    # Pálená taška
    {'id': 'taska-cervena', 'typ': 'taska', 'zdroj': 'acg', 'orig': 'RoofingTiles012A', 'metru': 4.0, 'zakladni': True},
    {'id': 'taska-zvetrala', 'typ': 'taska', 'zdroj': 'acg', 'orig': 'RoofingTiles012B', 'metru': 4.0},
    {'id': 'taska-lisejnik', 'typ': 'taska', 'zdroj': 'acg', 'orig': 'RoofingTiles011C', 'metru': 3.0},
    {'id': 'taska-oranzova', 'typ': 'taska', 'zdroj': 'acg', 'orig': 'RoofingTiles014A', 'metru': 3.4},
    {'id': 'taska-hneda-stara', 'typ': 'taska', 'zdroj': 'ph', 'orig': 'roof_09', 'metru': 4.0},
    {'id': 'taska-cerna', 'typ': 'taska', 'zdroj': 'acg', 'orig': 'RoofingTiles013A', 'metru': 3.5, 'zakladni': True},
    {'id': 'taska-cerna-lisejnik', 'typ': 'taska', 'zdroj': 'acg', 'orig': 'RoofingTiles013C', 'metru': 3.5},
    # Betonová taška
    {'id': 'betonova-cihlova', 'typ': 'betonova', 'zdroj': 'acg', 'orig': 'RoofingTiles006', 'metru': 2.5, 'zakladni': True},
    {'id': 'betonova-hneda-mech', 'typ': 'betonova', 'zdroj': 'acg', 'orig': 'RoofingTiles007', 'metru': 2.5},
    {'id': 'betonova-tmava-mech', 'typ': 'betonova', 'zdroj': 'acg', 'orig': 'RoofingTiles008', 'metru': 2.5},
    {'id': 'betonova-cerna', 'typ': 'betonova', 'zdroj': 'acg', 'orig': 'RoofingTiles009', 'metru': 2.5, 'zakladni': True},
    {'id': 'betonova-seda', 'typ': 'betonova', 'zdroj': 'acg', 'orig': 'RoofingTiles010', 'metru': 2.5, 'zakladni': True},
    # Bobrovka
    {'id': 'bobrovka-cervena', 'typ': 'bobrovka', 'zdroj': 'ph', 'orig': 'clay_roof_tiles_03', 'metru': 2.6, 'zakladni': True},
    {'id': 'bobrovka-hneda-stara', 'typ': 'bobrovka', 'zdroj': 'ph', 'orig': 'roof_tiles_14', 'metru': 1.5},
    {'id': 'bobrovka-seda', 'typ': 'bobrovka', 'zdroj': 'acg', 'orig': 'RoofingTiles002', 'metru': 2.0, 'zakladni': True},
    # Šindel
    {'id': 'sindel-sedy', 'typ': 'sindel', 'zdroj': 'ph', 'orig': 'grey_roof_01', 'metru': 8.0, 'zakladni': True},
    {'id': 'sindel-tmavy-mech', 'typ': 'sindel', 'zdroj': 'ph', 'orig': 'grey_roof_tiles', 'metru': 3.0},
    # Břidlice
    {'id': 'bridlice-obdelnik', 'typ': 'bridlice', 'zdroj': 'acg', 'orig': 'RoofingTiles003', 'metru': 2.2, 'zakladni': True},
    {'id': 'bridlice-supina', 'typ': 'bridlice', 'zdroj': 'acg', 'orig': 'RoofingTiles004', 'metru': 2.0},
    {'id': 'bridlice-stara', 'typ': 'bridlice', 'zdroj': 'ph', 'orig': 'roof_slates_02', 'metru': 3.0},
    {'id': 'bridlice-svetla', 'typ': 'bridlice', 'zdroj': 'ph', 'orig': 'grey_roof_tiles_02', 'metru': 1.5, 'zakladni': True},
    # Plech a plochá střecha: barvu volí uživatel
    {'id': 'falc', 'typ': 'falc', 'zdroj': 'gen', 'orig': 'falc', 'metru': 1.2, 'prebarvit': True},
    {'id': 'trapez', 'typ': 'trapez', 'zdroj': 'ph', 'orig': 'box_profile_metal_sheet', 'metru': 2.0, 'prebarvit': True},
    {'id': 'vlnity', 'typ': 'vlnity', 'zdroj': 'ph', 'orig': 'corrugated_iron', 'metru': 1.12, 'prebarvit': True},
    {'id': 'asfaltovy-pas', 'typ': 'plocha', 'zdroj': 'ph', 'orig': 'bitumen', 'metru': 10.0, 'prebarvit': True},
]

ZNOVU = '--znovu' in sys.argv


def stahni(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180).read()


def zdroj(v):
    """Složka se surovými mapami color/normal/rough/ao.jpg, stáhne chybějící."""
    d = os.path.join(ZDROJE, v['zdroj'] + '_' + v['orig'])
    if os.path.exists(os.path.join(d, 'color.jpg')):
        return d
    os.makedirs(d, exist_ok=True)
    if v['zdroj'] == 'ph':
        j = json.loads(stahni('https://api.polyhaven.com/files/' + v['orig']))
        for mapa, jmeno in [('Diffuse', 'color'), ('nor_gl', 'normal'), ('Rough', 'rough'), ('AO', 'ao')]:
            if mapa in j and '1k' in j[mapa]:
                open(os.path.join(d, jmeno + '.jpg'), 'wb').write(stahni(j[mapa]['1k']['jpg']['url']))
    else:
        z = zipfile.ZipFile(io.BytesIO(stahni('https://ambientcg.com/get?file=' + v['orig'] + '_1K-JPG.zip')))
        for n in z.namelist():
            for klic, jmeno in [('_Color', 'color'), ('_NormalGL', 'normal'), ('_Roughness', 'rough'), ('_AmbientOcclusion', 'ao')]:
                if klic in n and n.endswith('.jpg'):
                    open(os.path.join(d, jmeno + '.jpg'), 'wb').write(z.read(n))
    return d


def falc():
    """Falcovaný plech: hladké pásy 0,6 m se stojatou drážkou, textura 1,2 m = dva pásy."""
    import math
    N = VELIKOST
    barva = Image.new('L', (N, N), 236)
    norm = Image.new('RGB', (N, N))
    px = norm.load()
    radek = []
    for x in range(N):
        f = (x % (N // 2)) / (N // 2)          # poloha v pásu 0..1, drážka kolem 0
        d = min(f, 1 - f) * 0.6                # vzdálenost od drážky v metrech
        sklon = 0.0
        if d < 0.012:                          # drážka 25 mm: strmé boky
            sklon = (1 if f < 0.5 else -1) * -2.5
        elif d < 0.03:                         # náběh plechu k drážce
            sklon = (1 if f < 0.5 else -1) * -0.35 * (1 - (d - 0.012) / 0.018)
        else:                                  # mírné vlnění plochy pásu
            sklon = 0.03 * math.sin(f * math.pi * 6)
        nx, nz = -sklon, 1.0
        L = math.hypot(nx, nz)
        radek.append((int((nx / L * 0.5 + 0.5) * 255), 128, int((nz / L * 0.5 + 0.5) * 255)))
    for y in range(N):
        for x in range(N):
            px[x, y] = radek[x]
    ao = Image.new('L', (N, N), 255)
    aop = ao.load()
    for x in range(N):
        f = (x % (N // 2)) / (N // 2)
        d = min(f, 1 - f) * 0.6
        hodnota = 255 if d > 0.03 else int(200 + 55 * d / 0.03)
        for y in range(N):
            aop[x, y] = hodnota
    rough = Image.new('L', (N, N), 90)
    return barva.convert('RGB'), norm, rough, ao


def nahled(barva, norm, ao):
    """Vzorek s nasvícením z normál, ať je reliéf vidět i u map s plochou barvou."""
    S = 96
    b = barva.resize((S * 2, S * 2), Image.LANCZOS).crop((0, 0, S, S))
    n = norm.resize((S * 2, S * 2), Image.LANCZOS).crop((0, 0, S, S))
    a = ao.resize((S * 2, S * 2), Image.LANCZOS).crop((0, 0, S, S))
    bp, np_, ap = b.load(), n.load(), a.load()
    out = Image.new('RGB', (S, S))
    op = out.load()
    sv = (-0.45, 0.55, 0.70)                   # světlo zleva shora
    for y in range(S):
        for x in range(S):
            r, g, bb = np_[x, y]
            nx, ny, nz = r / 127.5 - 1, g / 127.5 - 1, bb / 127.5 - 1
            k = max(0.0, nx * sv[0] + ny * sv[1] + nz * sv[2])
            s = (0.35 + 0.8 * k) * (0.55 + 0.45 * ap[x, y] / 255)
            c = bp[x, y]
            op[x, y] = tuple(min(255, int(ch * s)) for ch in c)
    return out


def prumer(obr):
    m = obr.resize((1, 1), Image.BOX).getpixel((0, 0))
    return '#%02x%02x%02x' % m[:3]


def zpracuj(v):
    cil = os.path.join(VYSTUP, v['id'])
    if v['zdroj'] == 'gen':
        barva, norm, rough, ao = falc()
    else:
        d = zdroj(v)
        nacti = lambda j, rezim: Image.open(os.path.join(d, j + '.jpg')).convert(rezim).resize((VELIKOST, VELIKOST), Image.LANCZOS) if os.path.exists(os.path.join(d, j + '.jpg')) else None
        barva, norm = nacti('color', 'RGB'), nacti('normal', 'RGB')
        rough = nacti('rough', 'L') or Image.new('L', (VELIKOST, VELIKOST), 200)
        ao = nacti('ao', 'L') or Image.new('L', (VELIKOST, VELIKOST), 255)
    hex_ = prumer(barva)
    if v.get('prebarvit'):
        # Jen jas: průměr 0,92, ať zvolená barva vyjde skoro přesně (stejně jako dřív reliéf krytiny)
        sed = barva.convert('L')
        m = sed.resize((1, 1), Image.BOX).getpixel((0, 0)) or 1
        sed = sed.point(lambda p: max(0, min(255, int(p * 235 / m))))
        barva = Image.merge('RGB', (sed, sed, sed))
    os.makedirs(cil, exist_ok=True)
    barva.save(os.path.join(cil, 'barva.webp'), quality=82, method=6)
    norm.save(os.path.join(cil, 'normala.webp'), quality=88, method=6)
    Image.merge('RGB', (ao, rough, Image.new('L', ao.size, 0))).save(os.path.join(cil, 'arm.webp'), quality=85, method=6)
    nahled(barva if not v.get('prebarvit') else Image.new('RGB', barva.size, (150, 152, 155)), norm, ao).save(os.path.join(cil, 'nahled.webp'), quality=85)
    zaznam = {'id': v['id'], 'typ': v['typ'], 'metru': v['metru'], 'hex': hex_, 'zdroj': v['zdroj'], 'orig': v['orig']}
    if v.get('prebarvit'):
        zaznam['prebarvit'] = True
    if v.get('zakladni'):
        zaznam['zakladni'] = True
    return zaznam


def main():
    os.makedirs(VYSTUP, exist_ok=True)
    vysledek = []
    for v in VZHLEDY:
        vysledek.append(zpracuj(v))
        velikost = sum(os.path.getsize(os.path.join(VYSTUP, v['id'], f)) for f in os.listdir(os.path.join(VYSTUP, v['id'])))
        print('%-24s %s  %4d kB' % (v['id'], vysledek[-1]['hex'], velikost // 1024), flush=True)
    # Průměrné barvy musí být různé, podle nich se vzhled hledá (dum.js, vzhledKrytiny)
    hexy = [z['hex'] for z in vysledek if not z.get('prebarvit')]
    assert len(hexy) == len(set(hexy)), 'dva vzhledy mají stejnou průměrnou barvu'
    with open(os.path.join(VYSTUP, 'vzhledy.json'), 'w', encoding='utf-8') as f:
        json.dump(vysledek, f, ensure_ascii=False, indent=1)
    print('celkem %d kB' % (sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(VYSTUP) for f in fs) // 1024))


if __name__ == '__main__':
    main()
