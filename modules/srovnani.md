# Srovnání s konkurencí — profily nástrojů, „X vs TupTuDu“ a průvodce výběrem

## Stav (na webu od 12. 11. 2026 v noci)
Libor 12. 11. 2026: připravit a rovnou zveřejnit, advokáta vynechat, němčinu zatím ne (tvrdá praxe výzev).
- **137 stránek** v 7 jazycích (cs, sk, pl, en, fr, es, it): v každém jazyce přehled `/{jazyk}/{segment}`, profil
  `/{jazyk}/{segment}/{adresa}` a `/{jazyk}/{segment}/{adresa}-vs-tuptudu`. Segmenty a zveřejněné jazyky
  v `config/srovnani.php`. Seznam adres vypíše `php storage/app/konkurence/srovnani/vsechny-adresy.php`.
- **Nástroje:** SketchUp, Planner 5D, Sweet Home 3D, Homestyler, Floorplanner, HomeByMe, RoomSketcher, magicplan,
  Cedreo ve všech 7 jazycích; Dům jedním tahem a Pozemkov jen česky (české služby). Výběr podle hledanosti; malé
  nástroje (Live Home 3D, Ashampoo, Homeplot, Rayon, Maket, AIkatastr, Plan7Architekt) stránky nemají.
- **Němčina připravená:** texty `lang/de/srovnani.php` i poznámky jsou přeložené, zapne se přidáním `de`
  do `config('srovnani.jazyky')`.
- Masterteam: náhled u každé aplikace („profil“, „vs TupTuDu“) ukazuje i hodnoty bez dokladu (orámované).
- Průvodce výběrem je odložený.

### Jak vznikla data (12. 11. 2026)
1. Ověřovací agenti prošli u 11 nástrojů všech 52 sledovaných parametrů jen na stránkách výrobce
   (`storage/app/konkurence/srovnani/ZADANI-overeni.md` → `overeno-<klic>.json`). Co nešlo doložit, je „?“ a na web nejde.
2. Nezávislá kontrola veřejných textů (hodnotící slova, firma místo produktu, interní žargon), 52 oprav.
3. Snímky všech zdrojů (224 adres) do soukromého S3 `tuptudu-katalog-dukazy`: `node services/konkurence/dukazy.cjs
   snimej adresy.json dukazy.json` (JPEG celé stránky + HTML, denní manifest s SHA-256). Nápovědy RoomSketcheru
   a HomeByMe mají ochranu proti robotům; neobcházíme ji, zdroje se nahradily stránkami na hlavních webech,
   zbylé hodnoty bez snímku se nezobrazí.
4. Překlady poznámek a textů do 7 jazyků (`ZADANI-preklad.md`, `poznamky-<jazyk>.json`) a nezávislá kontrola.
5. Import `storage/app/konkurence/reserse-2026-11-12/sestav_import.py` (+ `srovnani_import.py`) a přenos na produkci.
   Stránka vznikne jen u nástroje s aspoň 20 doloženými hodnotami.
- TupTuDu: hodnoty ze stavu na webu (`overeno-tuptudu.json`), doklad = commit (`tuptudu:<hash>`).
- „Nemá“ = výrobce funkci ve svém popisu, ceníku a nápovědě neuvádí nebo výslovně píše, že ji nemá (metodika na stránce).

## Cíl a zásady (Libor 12. 11. 2026)
- **Přitáhnout velkou základnu lidí**, kteří hledají nástroj na návrh domu, a nabídnout jim **objektivní srovnání**,
  ať si vyberou sami. Část přijde k nám, část ne, a to je v pořádku.
- **Netvrdíme, že jsme nejlepší.** Ukazujeme, kde je lepší kdo. Nejlepšími se chceme stát postupně: co mají ostatní
  a my ne, je zároveň náš seznam práce (viz Jak se stát nejlepšími).
- **Neslibujeme, co nemáme.** U TupTuDu jen to, co je nasazené na webu. Plánované funkce jsou „nemá“, bez „připravujeme“
  (mění rozhodnutí z 3. 11., kdy „ne, připravujeme“ ještě šlo).
- **Zákon a poctivost jdou stejným směrem** (viz Právní rámec). Objektivní srovnání je zároveň nejlepší SEO: stránka,
  které čtenář věří, ho udrží a vrací se na ni.

## Rozhodnutí Libora
**3. 11. 2026:** rozvržení kombinací SR2 (průvodce po oblastech) a SR3 (podle potřeby čtenáře), ukázka
https://claude.ai/artifact/6B5mSmoi57wqkCJQbKwFKy, zdroj v `services/srovnani-ukazka/`. Ceny nahoru nad tabulku.
SEO je důležité: na jednoho konkurenta víc stránek s odlišným záměrem hledání, ne stejný obsah v různé délce.

**12. 11. 2026:**
1. **Profil pro každého sledovaného konkurenta** se sledovanými vlastnostmi, odkazuje na srovnání s TupTuDu.
2. **„X vs TupTuDu“** s plusy a mínusy každého.
3. **Průvodce výběrem (ODLOŽENO):** čtenář vyplní své priority a dostane nástroje, které jim odpovídají. Až po 1 a 2.
4. „Sledovat“ v analýze = smí do těchto stránek. „Tiše“ nikdy.

## Druhy stránek
| Stránka | Pro koho (záměr hledání) | Obsah | Právně |
|---|---|---|---|
| **Profil X** „X: funkce, ceny a jazyky“ | „x recenze“, „x cena“, „x zdarma“, „x česky“ | co X je a pro koho, ceny a limity verze zdarma, jazyky, tabulka sledovaných vlastností X a u každé „kolik z N srovnávaných nástrojů to má“; odkaz na srovnání s TupTuDu a na podobné nástroje | nejtenčí led: bez verdiktu a hodnotících slov, jen fakta se zdrojem a datem; srovnání s trhem drží stránku v režimu věcného srovnání; slovo „recenze“ v titulku ne (slibuje nezávislost) |
| **X vs TupTuDu** | hlavně čtenář z profilu, „x alternativa“, „x vs“ | ceny nahoře, „Co chceš udělat?“ (verdikt z dat), v čem je lepší X / v čem TupTuDu (stejně velké sloupce), co umí oba, všechny vlastnosti vedle sebe, metodika | srovnávací reklama § 2980 OZ, viz Právní rámec |
| **Alternativy k X** (později) | „x alternativa“ | výběr podobných nástrojů z dat, včetně nás | stejná pravidla jako srovnání |
| **Průvodce výběrem** (odloženo) | „program na návrh domu“, „jaký program na půdorys“ | dotazník priorit → nástroje, které jim odpovídají, s odkazy na profily | pořadí jen podle shody s tím, co čtenář zadal; TupTuDu bez zvýhodnění; žádný „vítěz“ |

## Jak se stránky tvoří (hotový náhled)
- **Vše z dat analýzy**, nic se nepíše ručně ke konkrétnímu konkurentovi: `App\Support\KonkurenceSrovnani`, šablony
  `resources/views/srovnani/profil.blade.php` a `vs.blade.php`. Bere jen aplikace a parametry v režimu Sledovat,
  skupinu Vývoj nikdy.
- **Plusy a mínusy jsou souměrné:** má 2, částečně 1, nemá 0; vyšší číslo je plus toho nástroje, rovnost nad nulou
  „umí oba“, nezjištěné se nepočítá a stránka řekne kolik jich je.
- **„Co chceš udělat?“:** šest situací (pozemek, celý dům, interiér, podklad pro projektanta, tablet, čeština),
  každá má pevný seznam rozhodujících parametrů (`KonkurenceSrovnani::SITUACE`) a verdikt „víc toho má X / TupTuDu /
  oba podobně“ se sečte z dat. Situace platí pro všechny konkurenty stejně, aby nešlo vybírat ty, kde vycházíme lépe.
- **Řádek autorství nahoře** (výrobce jednoho ze srovnávaných nástrojů, stav k datu, odkaz na opravu) a **metodika
  dole** (stejná pravidla pro všechny, zdroje, známková poznámka, výzva pro zástupce konkurenta).
- Popis, kdy je vlastnost „má“, „částečně“ a „nemá“, je u parametru (`kriteria`) a na stránce v bublině názvu.

## SEO
- **Samostatná sekce, ne blog.** Pravidla článků (do 500 slov, žádné zdroje a vnější odkazy) jdou proti zákonné
  povinnosti uvádět zdroje a data. Srovnání proto dostane vlastní adresy, např. `/cs/srovnani/planner-5d` a
  `/cs/srovnani/planner-5d-vs-tuptudu` (en `compare`, pl `porownanie` …), vlastní přehled a sitemapu.
- **Návštěvnost přinese profil, ne „X vs TupTuDu“.** Na „X vs TupTuDu“ nikdo nehledá, dokud nás nezná. Lidé hledají
  název nástroje s „cena“, „zdarma“, „česky“, „recenze“, „alternativa“. Profil chytá tyhle dotazy a vede na srovnání.
  Pořadí konkurentů a jazyků podle skutečné hledanosti (viz Hledanost níže).
- **Čerstvost:** datum stavu v titulku a v textu („stav 11/2026“), měsíční měření stránky samo aktualizuje.
- **Jedna stránka na záměr**, žádné kopie v různé délce. Kanonická adresa, hreflang jen tam, kde jazyková verze
  opravdu existuje. Strukturovaná data jen Article a BreadcrumbList, **žádné Review ani hvězdičky**.
- Proklik: profil ↔ srovnání ↔ podobné nástroje; z článků jen tam, kde to čtenáři pomůže.
- Později „X vs Y“ mezi dvěma konkurenty (lidé to hledají), se stejnými pravidly a TupTuDu jako třetím sloupcem.

### Hledanost (Plánovač klíčových slov Google Ads, 12. 11. 2026)
Průměr hledání názvu za měsíc (11/2025–10/2026). Data v `storage/app/konkurence/reserse-2026-11-12/navstevnost.json`,
v analýze jako tiché parametry `k_hledani_*` a sloupec Zájem v přehledu.

| Nástroj | CZ | SK | PL | DE |
|---|---|---|---|---|
| SketchUp | 8 100 | 4 400 | 33 100 | 33 100 |
| Planner 5D | 2 400 | 1 300 | 12 100 | 14 800 |
| Sweet Home 3D | 2 900 | 880 | 8 100 | 14 800 |
| Homestyler | 1 600 | 720 | 18 100 | 4 400 |
| Floorplanner | 1 900 | 880 | 3 600 | 6 600 |
| HomeByMe | 1 300 | 720 | 4 400 | 4 400 |
| Dům jedním tahem | 1 200 | 20 | 20 | 10 |
| Pozemkov | 970 | 40 | 20 | 20 |
| RoomSketcher, magicplan, Cedreo | 210–320 | do 140 | do 590 | 1 600–5 400 |
| ostatní | do 340 všude, Plan7Architekt v DE 2 020 |

**Co z toho plyne pro SEO:**
1. **V Česku a na Slovensku stojí za profil jen šest velkých značek** (SketchUp, Sweet Home 3D, Planner 5D, Floorplanner,
   Homestyler, HomeByMe) a z českých Dům jedním tahem. Dotazy typu „X alternativa“, „X recenze“, „X cena“, „X česky“
   mají v CZ a SK skoro nulu, stránky „Alternativy k X“ by tam návštěvy nepřinesly.
2. **Jediný záměr se skutečným objemem je „zdarma“ a „v mém jazyce“:** DE „sweet home 3d kostenlos“ 1 000,
   „sketchup kostenlos“ 590, „planner 5d kostenlos“ 480; PL „planner 5d po polsku“ 210, „homestyler za darmo“ 170.
   V CZ hledají „sketchupfree“ 3 600 a „sketchup online“ 1 900. Profil proto musí hned nahoře odpovědět, **jestli je
   nástroj zdarma, co verze zdarma omezuje a v jakých je jazycích**. To jsou zároveň naše silné stránky
   (trvalá verze zdarma, 8 jazyků), takže poctivá odpověď nám sama pomáhá.
3. **Největší objem je v Polsku a Německu**, i u obecných dotazů: PL „projektowanie domu“ 27 100 a „program do
   projektowania domu“ 720, DE „grundriss zeichnen“ 4 400 a „grundriss erstellen kostenlos“ 2 900; CZ „půdorys domu“
   1 000, „návrh domu“ 320, SK „pôdorys domu“ 590. Obecné dotazy jsou spíš pro články a budoucího průvodce výběrem.
4. **Pořadí:** čeština pro důvěru a první zkušenost, polština jako první cizí jazyk podle objemu. Němčina má největší
   objem, ale nejtvrdší praxi výzev (Abmahnung), proto až s nejlépe doloženými daty a po advokátovi.

**Ukazatele návštěvnosti** (jen interně): Tranco (pořadí webu, např. SketchUp 4 116., Planner 5D 27 123.),
instalace z Google Play (Planner 5D 50M+, Homestyler a magicplan 10M+), odhad Similarweb (třetina návštěv
za 3 měsíce, jejich API je placené). Hledání názvu po zemích je z nich nejpoužitelnější, protože říká, kolik zájmu
je v zemích, kam míříme.

## Právní rámec (rozbor 3. 11. 2026, není právní rada)

Stránky jsou **srovnávací reklama** (§ 2980 OZ, směrnice 2006/114/ES, plně harmonizovaná v EU), i když vypadají
jako článek. Přípustné jen při splnění všech podmínek současně.

**Smíme:** jmenovat konkurenta a produkt v titulku, textu i URL (referenční užití známky, § 10 odst. 1 písm. c)
zák. 441/2003 Sb.; SDEU O2 v. Hutchison 3G C‑533/06); srovnávat ověřitelná fakta (funkce, limity, cena, platformy,
jazyky, formáty, místo uložení dat podle jejich zásad) s datem a zdrojem; uvést, kde je konkurent lepší (celkový dojem
nesmí klamat — Lidl v. Vierzon C‑159/09); doporučit podle účelu; odkazovat na web konkurenta.

**Nesmíme:** hodnotící přívlastky o konkurentovi („zastaralý“, „nepřehledný“); zlehčovat ani pravdou mimo věcné
srovnání (§ 2984 odst. 2 OZ); mluvit o firmě místo o produktu (vlastník, země, finance, incidenty); použít logo,
barvy nebo styl konkurenta; zveřejnit snímky cizího rozhraní (autorské dílo, § 31 AZ citace je sporná, ToS některých
aplikací zakazují zveřejňovat testy) — popisovat slovy, ukazovat jen vlastní UI; superlativy bez důkazu pro celý trh
(„jediný s kubaturami“ → „ze srovnávaných 25 aplikací kubatury nepočítá žádná“); hvězdičky, body, vítěz; zastaralé
údaje; ceny bez podmínek.

**Důkazní břemeno:** při žalobě spotřebitele prokazujeme my (§ 2989 odst. 2 OZ); u konkurenta soud může žádat
důkazy. **Zahraničí:** stejná směrnice, právo trhu, na který stránka míří (Řím II); Německo (§ 6 UWG) má tvrdou
praxi placených výzev (Abmahnung) — do cizích jazyků pouštět jen stránky s nejlépe doloženými daty.
**Doporučení:** nechat šablonu a pravidla jednorázově posoudit advokátem na nekalou soutěž (odhad 5–12 tis. Kč),
ne každou stránku. Podrobný rozbor je v chatu z 3. 11. 2026 a v paměti Claude (`tuptudu-srovnani-pravo`).

**Doplněno 12. 11. 2026:**
- Signály vývoje konkurenta („stagnuje“) a hledanost jsou hodnocení a interní údaje, na web nikdy (proto skupina Vývoj
  a parametry návštěvnosti jen v režimu Tiše).
- Země sídla a provozovatel na stránku nepatří (o firmě ne, jen o produktu).
- Na webu jen hodnota s dokladem a ověřením do 6 měsíců. Starší údaj se nezobrazí, místo něj „nezjištěno“.

## Data a důkazy
- Zdroj pravdy je produkční DB analýzy (`konkurence_hodnoty`). U hodnoty `doklad` (klíč snímku v archivu) a
  `doklad_v`; `KonkurenceHodnota::lzeZverejnit()` = doklad + ověřeno v posledních 6 měsících. Náhled hodnoty bez
  dokladu orámuje a pruh nahoře řekne, kolik jich je (12. 11. 2026 u Homestyleru vs TupTuDu 92, doklad zatím nemá nic).
- Dosavadní data vznikla z dokumentace výrobců a rešerší, ne z vlastního zkoušení. **Před zveřejněním každý řádek
  ověřit a pořídit snímek.**
- **Poznámky jsou zatím interní** (zkratky, „dle webu“, odkazy na naše moduly). Na web potřebují zákaznickou podobu
  v jazyce stránky, proto u hodnoty přibude veřejná poznámka po jazycích (zatím není).
- **Archiv důkazů:** bucket S3 s verzováním a zámkem objektů (Object Lock), ke každému ověření celý snímek stránky,
  HTML, URL, datum a kdo ověřil; manifest s otisky SHA‑256; veřejné ceníky navíc do Wayback Machine. Pořízení snímku
  lokálním nástrojem (Chrome přes `services/import-test/prohlizec.cjs`), nahrání a zápis `doklad` importem.
  `league/flysystem-aws-s3-v3` zatím chybí. Kvalifikované časové razítko manifestu (jednotky Kč) je volitelné.
- **Texty jen z dat.** Ručně psaný úvod u konkurenta smí odkazovat jen na existující hodnoty. Před zveřejněním
  nezávislý agent porovná každou větu s daty a vypíše, co v nich nemá oporu.
- **Revize:** měsíční měření (`modules/konkurence.md`); oprava do pár dnů od podnětu, datum opravy na stránce.

## Postup
1. **Hotovo 12. 11. 2026:** plán, kritéria, ověření 11 nástrojů, archiv snímků, překlady, 137 stránek na webu.
2. **Měsíčně:** nové měření (`modules/konkurence.md`), u změněných hodnot nový snímek a překlad poznámky,
   import a přenos na produkci. Hodnota starší 6 měsíců z webu sama zmizí, proto to nesmí vypadnout.
3. **Search Console:** sledovat indexaci a dotazy na nové adresy (agent marketing-data).
4. **Němčina** až po usazení dat a prvních opravách: `de` do `config('srovnani.jazyky')`.
5. Další nástroje, když vzroste hledanost (Live Home 3D, Homeplot …); „Alternativy k X“ a „X vs Y“.
6. **Průvodce výběrem** (odloženo): dotazník z těch samých parametrů, filtr nástrojů, odkazy na profily.

## Jak se stát nejlepšími
Srovnání je zároveň mapa, co zlepšit. Každý měsíc z dat: kterou vlastnost má nejvíc sledovaných konkurentů a my ne,
a v kolika srovnáních „X vs TupTuDu“ je to plus konkurenta. To je podklad pro pořadí práce na editoru
(navazuje na nejpalčivější požadavky v analýze). Cílem je, aby se sloupec „v čem je lepší TupTuDu“ postupně
prodlužoval poctivě, ne úpravou pravidel.

## Otázka k posouzení: německá verze a rozhodné právo (Libor 13. 11. 2026)
Němčina je zatím vypnutá kvůli riziku placených výzev (Abmahnung) podle německého UWG. Libor to zpochybňuje
(není právník, chce samostatné posouzení v jiném sezení):
1. Němčina ≠ Německo. Německy se mluví i v Rakousku (a ve Švýcarsku), stránka nemusí cílit jen na Německo.
2. Hodnocení konkurence v němčině automaticky neznamená, že se spor řídí německým právem.
3. Když německy popisujeme konkurenta odjinud (např. z Polska), který je oblíbený v Německu, nemusí ho právo
   posuzovat jako německý subjekt.
4. Jsme česká firma, otázka je, jestli spor nespadá pod český zákon.
5. Rozdíl mezi **srovnáním nás s konkurencí** a **neutrálním popisem konkurence** s propagací TupTuDu uvnitř
   článku. Libor má za to, že druhá cesta napadnutelná není.
Výsledek posouzení zapsat sem a podle něj rozhodnout o `de` v `config('srovnani.jazyky')`.

## Otevřené body
- Bucket `tuptudu-katalog-dukazy`: klíč projektu nesmí zapnout verzování ani zámek objektů. Neměnnost zatím
  drží manifest s otisky SHA-256. Zapnout verzování v konzoli AWS (S3 → bucket → Properties → Bucket Versioning).
- Advokát vynechán (Libor 12. 11. 2026). Při první výzvě od výrobce opravit do pár dnů a uvést datum opravy.
- Nejisté hodnoty ponechané ve prospěch konkurence: Sweet Home 3D kóty a terén (pluginy), HomeByMe export CAD
  (přes DraftSight), Planner 5D náklady (odhad přes AI).
