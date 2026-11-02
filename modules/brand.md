# Brand TupTuDu — grafický manuál (stav k 1. 11. 2026)

Rozhodnuto s Liborem po kolech výběru (artefakty v Claude, odkazy v paměti). Kalkulio je jen volná
inspirace: tam je Nunito a kulaté tvary, TupTuDu jde vědomě k hranatějším tvarům se zaoblenými rohy.
Brand barvy a písma **nikdy natvrdo v CSS** — jen přes proměnné (`var(--c-primary)` apod., viz CLAUDE.md).

## Písmo (rozhodnuto 1. 11. 2026)
- **Technické: Rubik** — značka, nadpisy, čísla a kóty, tlačítka, záložky, štítky, popisky ve výkresu.
  Obdélníkové tvary se zakulacenými rohy, přesně podle zadání „technické, ale přátelské".
- **Textové: IBM Plex Sans** — odstavce článků, popisy, vysvětlivky, delší texty v aplikaci.
- Obě zdarma (SIL OFL), plná latinka rozšířená (čeština, polština, němčina, francouzština…).
- **Hostovat u nás** (`public/fonts/`), ne přes fonts.googleapis (GDPR, IP návštěvníka). Zatím nenasazeno.
- Čísla v tabulkách vždy `font-variant-numeric: tabular-nums`.

## Barvy — paleta „Noc" (rozhodnuto 1. 11. 2026)
Tmavý režim je **výchozí**, světlý na přepínač. Kreslicí plocha editoru je v obou režimech **bílá** (papír výkresu).

| role | tmavý (výchozí) | světlý |
|---|---|---|
| pozadí | `#141a24` | `#f3f5f9` |
| panel | `#1c2432` | `#ffffff` |
| text | `#e6ebf2` | `#1b2330` |
| tlumený text | `#8f9bb0` | `#5f6b80` |
| linky | `#2b374a` | `#d6dde8` |
| linky výraznější | `#44536b` | `#a4afc0` |
| **oranžová (akcent)** | `#ff8a2b` | `#ee6f12` |
| text na oranžové | `#1a1a1a` | `#ffffff` |
| šedá značky | `#a9b4c6` | `#52607a` |
| podklad štítků (chip) | `#3c2a1a` | `#fdeee0` |
| odkaz | `#5ec8d8` (tyrkys) | `#0f8da0` |
| ok / varování / chyba | `#2f9e5f` / `#e9b949` / `#e04e4e` | stejné |

Jemné doladění při nasazení do CSS proměnných je možné (kontrast, hover stavy), tóny zůstávají.

## Značka (rozhodnuto 1. 11. 2026)
Slovní značka **Tup·Tu·Du** v Rubik ExtraBold (800), letter-spacing −0,01 em. „Tup" a „Du" šedá značky,
„Tu" tmavý text v **oranžovém štítku**, který nese myšlenku produktu: **střecha** (dům) a **terén ve svahu**.

- „Tu" je **stejné písmo, velikost a účaří** jako okolní písmena — jsou to tři kusy jednoho slova.
- Štítek se kreslí kolem písmen, odstupy „Volný" (v em písma): střecha 0,36 nad verzálkami (okap 0,08),
  spodek 0,22 pod účařím, vnitřní odstup písmen 0,18, mezera k sousedům 0,06, zaoblení rohů 0,10.
- Spodní hrana „Skica, vlna výš" (podle Liborovy skici): vlevo nízko (o 0,03 níž), uprostřed vlna jako
  zaoblený schod nahoru (výška 0,07, střed na 48 % šířky, šířka 18 %), odtud doprava výrazný sklon
  končící 0,02 em pod účařím „u". Dojem domu ve svahu. Žádný symbol vedle slova.
- Ikona = samotný štítek s „Tu" (favicon, apple-touch, manifest).

**Soubory** (`public/brand/`, generuje `py services/znacka-svg.py [cílová složka]`, písmena převedená na
křivky přes HarfBuzz + fontTools, takže SVG nepotřebuje font):
- `znacka-tmave.svg` (na tmavé pozadí, výchozí), `znacka-svetle.svg`, `znacka-mono-tmave.svg` (bílá
  jednobarevná), `znacka-mono-svetle.svg` (tmavá jednobarevná), `znacka-*-1200.png` (průhledné).
- `ikona-tmave.svg`, `ikona-svetle.svg`, `ikona-32.png`, `ikona-180.png`, `ikona-512.png`.
- Poměr stran značky ≈ 3,83 : 1. Minimální výška na webu 24 px (v liště), v tisku 8 mm.
- Zákaz: nepřebarvovat, nenatahovat, nedávat jiný text do štítku, nepřidávat stín.

Skript potřebuje `fonty/Rubik-var.ttf` (Google Fonts, repozitář google/fonts, `ofl/rubik/Rubik[wght].ttf`)
vedle sebe — stahuje se ručně, v repozitáři není. Pythonové balíčky: `fonttools`, `uharfbuzz`, `resvg-py`.

## Prvky článků a stránek (rozhodnuto 2. 11. 2026)
Vybráno z artefaktu „Prvky TupTuDu" (https://claude.ai/artifact/1AtftjowBP9U96o8Tezxx8, kódy variant tam
zůstávají i s nevybranými). Společný motiv: **oranžový zaoblený čtverec ze štítku značky** (odrážka,
číslo kroku) a **svislý oranžový pruh vlevo** (mezititulek, upozornění, perex) — vždy 3 px, zaoblené konce.

| prvek | volba | provedení |
|---|---|---|
| zaoblení rohů | **R7** | `--r: 7px` pro tlačítka, pole, panely, upozornění; malé prvky (číslo ve štítku) `calc(var(--r) * .6)` |
| odrážky | **O2** | 1. úroveň plný oranžový čtvereček 9 px, rádius 2,5 px; 2. úroveň obrys šedé značky 8 px; odsazení 22 px |
| číslování | **C2** | číslo v oranžovém štítku 24 × 24 px, Rubik 700 13 px, text na oranžové `--on-accent` |
| mezititulky | **N4** | H2 Rubik 700 24 px, H3 Rubik 600 18 px; H2 má vlevo pruh 3 px (odsazení textu 14 px) |
| upozornění | **U1** | podklad `--bg` na panelu, pruh vlevo v barvě druhu (tip oranžová, pozor žlutá, chyba červená, hotovo zelená), titulek Rubik 600 14 px s ikonou 16 px, text Plex 15 px |
| postup | **P1** | svislá linka 2 px `--line`, kroky s číslem ve štítku 26 px (jako C2), název Rubik 600 16 px, věta tlumeně |
| perex a citace | **Q1** | perex Plex 18,5 px s pruhem vlevo; citace na podkladu `--bg`, kurzíva, oranžová uvozovka, autor Rubik 500 13 px tlumeně |
| tabulka | **T1** | jen vodorovné linky (hlavička 2 px `--line-strong`, řádky 1 px `--line`), hlavička Rubik 600 12,5 px verzálky tlumeně, čísla vpravo v Rubiku s `tabular-nums` |
| výzva | **V1** | panel `--bg` s okrajem, titulek Rubik 700 20 px, hlavní tlačítko oranžové + vedlejší obrysové |
| tlačítka | — | Rubik 600 15 px, 10 × 18 px; hlavní oranžové s `--on-accent`, vedlejší obrys `--line-strong` (hover oranžový), tiché jen text v barvě odkazu |
| pole formuláře | **I1** | tmavší než panel: tmavý režim výplň `#0f141c`, okraj `#5a6a85`; světlý režim bílá, okraj `#8f9bb0`; fokus oranžový obrys 2 px; popisek Rubik 500 13 px tlumeně |

Odkazy v textu tyrkysové (`--link`), podtržení 1 px s odsazením 3 px, hover oranžová.

## Co ještě není rozhodnuto
1. **Velikostní řada písma a odstupy** (type scale, rozestupy sekcí), tloušťky čar ve výkresu.
2. **Další prvky aplikace:** záložky, přepínače, nabídky, lišta nástrojů, sada ikon (návrh: Lucide, tah 1,75 px).
3. **Obrazový styl:** screenshoty vs. kresby půdorysů vs. fotky v článcích a na titulce.
4. **Nasazení:** CSS proměnné pro obě palety, self-hosting písem, značka do layoutů (web, app,
   masterteam), favicon a manifest, přepínač režimu (uložit do účtu i cookie pro nepřihlášené).

## Články (návrh, neschváleno výslovně)
Tiptap editor z Kalkulia nepřebírat. Články jako Markdown v repozitáři (hlavička: titulek, perex, datum,
jazyk, štítky), pevná sada bloků jako Blade komponenty (perex, H2, obrázek s popiskem, upozornění, postup,
srovnávací tabulka, otázky a odpovědi, výzva k vyzkoušení), redakční pravidla v `modules/blog.md`.
