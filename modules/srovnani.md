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

## Pravidla vzhledu a textů (ladění na Planner 5D česky, Libor 13. 11. 2026)
Ladí se nejdřív Planner 5D v češtině, pak se pravidla promítnou do ostatních nástrojů a nakonec do překladů.
1. **Otázka = odpověď ano / částečně / ne** (např. „Verze zdarma“), ne „má / nemá“. „Má“ zůstává u vlastností.
2. **Verze zdarma v jednom bloku:** odpověď a pod ní, co omezuje (`j_limity_zdarma`). Poznámka u `h_zdarma` se pak
   nezobrazuje, aby se to neopakovalo.
3. **Odrážky:** ceník a omezení verze zdarma po řádcích. V datech `text_cs` (a překladech `t`) řádek „- …“ = odrážka,
   řádek bez pomlčky = drobná poznámka pod odrážkami (měna, DPH, kurz). Šablona `srovnani/_text.blade.php`.
   Ceník: jedna odrážka na tarif („Premium: 19,99 $ měsíčně (asi 440 Kč) nebo …“).
4. **Nadpis bloku je větší než obsah** (`.sr-karta-nadpis` 17 px tučně, obsah 15 px).
5. **Jazyk s kódem:** „V tvém jazyce (čeština, cs)“, v seznamu jazyků „němčina (de)“.
6. **TupTuDu je i v přehledu**, první, se štítkem „náš nástroj“, odkaz na titulku.
Stav 13. 11. 2026: šablony platí pro všechny nástroje a jazyky; texty v odrážkách zatím jen Planner 5D a TupTuDu česky.

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
4. **Němčina** až po úkolech níže: `de` do `config('srovnani.jazyky')`, důvody v části „Posouzení“ a „Doplnění“ (13. 11. 2026).

### Úkoly ze 13. 11. 2026: upravit a stránky skutečně přegenerovat (Libor schválil do plánu)
Vyplývají z posouzení němčiny (část Doplnění). Dělá je samostatné sezení. **Nestačí změnit texty, všechny
stránky ve všech jazycích se musí znovu vygenerovat a přenést na produkci.** Hotovo je až po kontrole
živého webu (bod E).

**A. „ne“ a „nenalezeno“ (všechny jazyky)**
1. Přetřídit všech 91 hodnot „ne“ u konkurentů (`overeno-*.json` a produkční `konkurence_hodnoty`):
   - **„ne“ zůstane** jen tam, kde zápor plyne ze zdroje: výslovná věta, uzavřený výčet (jazyky, platformy,
     obsah tarifu) nebo výrobcem popsaný jiný postup. Poznámka tu oporu ukáže.
   - **Ostatní hodnoty „ne“ a dnešní „?“ (nezjištěno) budou „nenalezeno“.** Jsou to hodnoty odvozené z mlčení
     („neuvádí“, „neobsahuje“, „v přehledu není“).
2. Každé zbylé „ne“ ověří druhý, nezávislý agent nad snímkem zdroje. Co nepotvrdí, bude „nenalezeno“.
3. Kód: nový stav hodnoty (nebo sloučení s „?“), šablona `resources/views/srovnani/_hodnota.blade.php`,
   náhled v Masterteamu. V „X vs TupTuDu“ se „nenalezeno“ počítá jako nezjištěné, tedy ani plus, ani mínus.
4. Texty ve všech 8 jazycích (`lang/*/srovnani.php`): popisek (cs „nenalezeno“, de „keine Angabe gefunden“,
   en „not found“), bublina a legenda podle znění v Doplnění B, úprava `metodika_1` („ne“ jen se zdrojem,
   „nenalezeno“ = nenašli jsme zmínku). Pak `php artisan preklady:kontrola`.
5. Budoucí měření: rozlišení „ne“ / „nenalezeno“ doplnit do `ZADANI-overeni.md`, do importu
   (`sestav_import.py`, `srovnani_import.py`) a do měsíčního postupu v `modules/konkurence.md`.
   Jinak se to při příštím měření vrátí.
6. Totéž pravidlo zvážit u hodnot TupTuDu. U nich ale víme jistě, takže „ne“ zůstane.

**B. Němčina jen jako profily**
1. Samostatný seznam jazyků, ve kterých se zveřejňuje „X vs TupTuDu“ (např. `config('srovnani.jazyky_vs')`).
   V němčině se stránka vs nezaregistruje (routes) a nebude v sitemapě ani v hreflang.
2. Na profilu bez stránky vs nahradit odkaz „Srovnání X s TupTuDu →“ **jednotnou větou o TupTuDu**
   ve vizuálně odděleném bloku („Od autorů této stránky“). Věta je pro všechny profily stejná, popisuje jen
   TupTuDu a nesmí jmenovat, co profilovanému nástroji chybí. Řádek autorství zůstane nahoře.
3. Ceny v němčině jen z posledního měsíčního měření, jinak místo ceny odkaz na ceník výrobce.
4. Nezávislá kontrola německých textů a poznámek (`poznamky-de.json`) na hodnoticí slova
   („nur“, „leider“, „sogar“, „veraltet“, „das beste“).
5. Teprve potom přidat `de` do `config('srovnani.jazyky')`.
6. **Otázka na Libora:** platí „srovnání s TupTuDu prozatím vynechat“ (13. 11.) jen pro němčinu, nebo se mají
   stránky vs vypnout i v dnešních 7 jazycích? Do odpovědi zůstávají tam, kde jsou.

**C. Stránka Provozovatel / Impressum (celý web, ne jen srovnání)**
Jedna stránka ve všech jazycích (cs „Provozovatel“, de „Impressum“, en „Legal notice“) se stejnými údaji jako
v podmínkách: firma, sídlo, IČO, zápis v rejstříku, chráněný e‑mail (`partials.email-chraneny`) a telefon.
Odkaz v patičce na každé stránce. Žádný nový veřejný e‑mail.

**D. Přegenerovat a přenést**
Po A–C znovu sestavit import (`sestav_import.py`) a přenést na produkci. Vymazat cache
`srovnani-jazyky-prehledu`. Seznam adres (`php storage/app/konkurence/srovnani/vsechny-adresy.php`) porovnat
s očekávaným počtem: v de jen přehled a profily.

**E. Kontrola na živém webu (podmínka „hotovo“)**
Na náhodných profilech a stránkách vs ve všech jazycích ověřit:
- „ne“ se zobrazuje jen u hodnot s oporou ve zdroji a bublina „nenalezeno“ má správný text;
- v de neexistuje žádná adresa `…-vs-tuptudu`, odkaz na ni ani hreflang a patička vede na Impressum;
- sitemap odpovídá seznamu adres.
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

### Posouzení (Claude 13. 11. 2026, rozbor práva, ne rada advokáta)

**Ve zkratce**
- **Rozhodné právo určuje trh, na který stránka působí.** Jazyk ani sídlo nás nebo konkurenta to přímo neurčují
  (Řím II čl. 6 odst. 1). Německá stránka TupTuDu působí na německý trh, protože Němce už obsluhujeme (německý web,
  aplikace, ceník v eurech, země DE → `de` v `config/lokalizace.php`). Pro dopad v Německu platí německé UWG
  a pro Rakousko rakouské, každé pro svůj trh.
- **Pravidla se tím skoro nemění.** Srovnávací reklama je v EU plně harmonizovaná (směrnice 2006/114/ES čl. 4,
  SDEU Pippig C‑44/01). Podmínky § 6 UWG, § 2a rakouského UWG a § 2980 OZ jsou stejné, takže co je dovolené
  česky, je dovolené i německy. **Liší se vymáhání:** v Německu je výzva (Abmahnung) levná a rychlá a náklady platí
  ten, kdo porušil pravidla. Rakušané žalují rovnou a chtějí, aby se rozsudek zveřejnil.
- **Neutrální profil bez srovnání s TupTuDu je nejbezpečnější cesta** (upřesněno níže v části Doplnění).
  Bezpečný je ale jen tehdy, když jsou údaje doložitelné a věta o TupTuDu je pro všechny profily stejná.
- **Doporučení:** němčinu zapnout pro všechny německy mluvící země, bez cílení „jen Rakousko“ a bez vylučování
  Německa. V němčině jen profily, „X vs TupTuDu“ ne. Napřed provést úpravy obsahu (níže). Zbývající riziko je malé a dá se odhadnout: jedna oprávněná výzva stojí řádově 50–100 tis. Kč
  (náklady obou advokátů), pokud vadnou stránku hned opravíme.

**1. Podle čeho se určuje rozhodné právo**
- Řím II čl. 6 odst. 1: použije se právo státu, kde jsou nebo pravděpodobně budou dotčeny soutěžní vztahy
  nebo kolektivní zájmy spotřebitelů (princip trhu, *Marktortprinzip*). Vybrat si právo nejde ani smlouvou,
  ani podmínkami (čl. 6 odst. 4). Když stránka působí na víc trhů, platí pro každý trh jeho vlastní právo.
- **Jazyk** není samostatné kritérium, ale je nejsilnějším vodítkem, na koho stránka míří. SDEU to tak bere
  u zaměření činnosti (Pammer a Hotel Alpenhof, C‑585/08 a C‑144/09: jiný jazyk a měna než v zemi podnikatele,
  mezinárodní klientela). Německé soudy chtějí znatelný dopad na domácí trh a stránku, která je pro Němce
  zjevně určená (BGH I ZR 24/03 *Arzneimittelwerbung im Internet*, 2006). Podle BGH (I ZR 131/12
  *Englischsprachige Pressemitteilung*, 2013) se k německému trhu může vztahovat i anglická zpráva, má-li web
  také německou verzi. To rozhodnutí se týkalo příslušnosti soudu, ale kritérium je stejné.
- **Pro nás:** stránka psaná německy stačí, aby platilo německé právo, i když na Německo výslovně necílí.
  Tak by to bylo u každé firmy, která Němce opravdu obsluhuje. Rakousko a Švýcarsko se k Německu přidávají,
  nenahrazují ho. Naopak anglická srovnání německé právo nespouštějí, dokud na ně německý web neodkazuje.
  Patička dnes odkazuje na srovnání jen v zapnutých jazycích, tak to má zůstat.
- **Princip země původu** (směrnice 2000/31/ES čl. 3, v Německu § 3 DDG, SDEU eDate C‑509/09 a C‑161/10):
  Německo nesmí po poskytovateli online služby usazeném v jiném státě EU chtít víc, než chce jeho domácí
  právo. Pro nás je to argument navíc („splňujeme § 2980 OZ, víc chtít nemůžete“). U harmonizované
  srovnávací reklamy to ale vyjde nastejno. Německé řízení ani výzvu to nevylučuje a v soutěžních sporech
  není jeho dosah v Německu jistý, proto ho brát jako obranu, ne jako jistotu.

**2. Konkurent odjinud (např. z Polska), oblíbený v Německu**
- Na tom nic nezávisí. Čl. 6 odst. 1 se neptá, kde sídlí konkurent ani my, ale kde se soutěží o zákazníka.
  O německé uživatele soutěžíme s polskou firmou v Německu, a proto rozhoduje německé právo.
- Výjimka čl. 6 odst. 2 (jednání, které postihuje *jen* konkrétního soutěžitele, odkáže na obecný čl. 4) míří
  na „dvoustranné“ činy, např. vyzvědačství nebo přetahování zaměstnanců. Veřejná stránka pro zákazníky mezi ně
  nepatří. I podle čl. 4 by ale škoda, tedy ztracení zákazníci, vznikla v Německu, a společné bydliště česká
  a polská firma nemají. Ani tudy se k českému právu nedostaneme.
- **Kdo může v Německu žalovat:** soutěžitel, který tam služby nabízí ve větším rozsahu a soustavně
  (§ 8 odst. 3 č. 1 UWG). To splní každý velký nástroj z našeho seznamu. Dále zapsané hospodářské svazy
  (§ 8 odst. 3 č. 2, § 8b, např. Wettbewerbszentrale), ale jen když mají členy na stejném trhu.
- **Co pomáhá:** mezi nástroji se stránkou není žádný německý výrobce. Ashampoo a Plan7Architekt stránku nemají,
  tak to v němčině nechat. Zahraniční výrobci výzvy v Německu posílají mnohem méně než tamní firmy a tamní
  specializované kanceláře.

**3. Kdy platí český zákon a kdy cizí**
- **Hmotné právo:** český OZ (§ 2976 a násl.) se použije na dopad na český trh. Polské, francouzské, španělské,
  italské a slovenské stránky už dnes podléhají právu svých zemí, zatím bez potíží. Němčina se od nich věcně
  neliší, jen vymáháním.
- **Soud:** žalovat nás lze vždy v Česku (Brusel Ia čl. 4) a také v zemi, kde škoda nastala (čl. 7 odst. 2).
  U reklamy na internetu tak i v Německu, s pravomocí jen pro německý trh (eDate, Pinckney C‑170/12,
  Hejduk C‑441/13). U žaloby na smazání nebo opravu obsahu SDEU připouští jen soud s plnou pravomocí
  (Bolagsupplysningen C‑194/16, Gtflix C‑251/20). Jak to platí pro soutěžní zákaz (*Unterlassung*), není
  vyjasněné, proto na to nespoléhat.
- **Vymahatelnost:** německý rozsudek i předběžné opatření se v Česku vykonají bez dalšího řízení
  (Brusel Ia čl. 36 a 39). Že jsme česká firma, nás před německým řízením nechrání. Kdyby spor o německý
  trh řešil český soud, použije také německé právo, protože Řím II platí i u nás.

**4. Profil vs. „X vs TupTuDu“: je neutrální profil nenapadnutelný?**
*Rozbor platí pro dnešní profil, který odkazuje na srovnání s TupTuDu. Profil bez tohoto odkazu, jak ho Libor
navrhuje pro němčinu, rozebírá část Doplnění níže, a vychází líp.* Dnešní profil napadnutelný je, riziko má
ale nižší. Důvody:
- **I profil je srovnávací reklama.** Stačí, že reklama konkurenta *přímo nebo nepřímo označuje* (§ 2980 odst. 1
  OZ, § 6 odst. 1 UWG, čl. 2 písm. c) směrnice; SDEU Toshiba C‑112/99, De Landtsheer C‑381/05). Profil zveřejňuje
  výrobce konkurenčního nástroje, odkazuje na „Srovnání X s TupTuDu →“ a ukazuje sloupec „má z 11 nástrojů“.
  Je to obchodní sdělení na podporu TupTuDu, a musí proto splnit všech šest podmínek § 2980 odst. 2.
- **Mimo srovnávací reklamu by na tom byl hůř.** § 2984 odst. 2 OZ považuje za zlehčování i pravdivý údaj
  o konkurentovi, který mu může uškodit (např. „čeština: ne“, „verze zdarma bez exportu“). V Německu
  § 4 č. 1 UWG (snižování) a § 4 č. 2 (tvrzení, jejichž pravdivost nejde doložit; dokazuje ten, kdo je
  uvedl). Přípustná srovnávací reklama má přednost, protože co splní čl. 4 směrnice, nesmí národní pravidla
  zakázat (Pippig). **Sloupec „má z N nástrojů“ proto drží profil v bezpečném režimu věcného srovnání,
  nerušit ho.**
- **Propagaci nesmí zakrývat zdání nezávislosti.** Reklama vydávaná za nezávislý popis by byla skrytou
  reklamou (§ 5a odst. 4 UWG, směrnice 2005/29/ES čl. 7 odst. 2, u nás klamavé opomenutí podle zákona
  o ochraně spotřebitele). Řádek autorství nahoře to řeší a v němčině musí zůstat nahoře.
- **V čem je rozdíl:** profil nemá verdikt a mluví o konkurentovi jen vedle tržního průměru. „X vs TupTuDu“
  vybírá situace a sčítá, „v čem je lepší kdo“. Tím se otevírá otázka objektivity a reprezentativnosti výběru
  (Lidl v. Vierzon C‑159/09) a k tomu přibývají naše vlastní tvrzení o TupTuDu (§ 5 UWG). Odhad: profil nízké
  riziko, „X vs TupTuDu“ nízké až střední.
- **Hlavní věcné riziko obou stránek je „nemá“.** Podle metodiky znamená „výrobce to neuvádí“, ale „nein“
  čte Němec jako tvrzení, že funkce chybí. Když ji nástroj má a jen ji nepopisuje, je údaj nepravdivý
  (§ 5 i § 4 č. 2 UWG). Druhým nejčastějším spouštěčem je zastaralá cena.

**5. Jak reálná je výzva (Abmahnung) a co by stála**
- **Pravděpodobnost:** nízká, pokud platí pravidla z plánu. Je devět zahraničních výrobců, žádný německý,
  žádná hodnoticí slova, každý údaj má zdroj a datum a stránka nabízí opravu. Spouštěčem bývá konkrétní chyba
  (cena, „nein“ u funkce, kterou nástroj má, hodnocení vnesené překladem), ne srovnání jako takové.
- **Náklady (orientačně, kurz 25 Kč/€):**
  - *Oprávněná výzva:* hradíme advokáta druhé strany (§ 13 odst. 3 UWG), 1,3 poplatku podle RVG z hodnoty
    sporu. Ta bývá u soutěžitelů 10–50 tis. €, takže vychází zhruba 0,9–2 tis. € (25–50 tis. Kč). K tomu
    vlastní německý advokát za podobnou částku.
  - *Smluvní pokuta v závazku zdržet se (Unterlassungserklärung):* u firmy pod 100 zaměstnanců a jen
    nepodstatného porušení nejvýš 1 000 € (§ 13a odst. 3 UWG), jinak bývá 3–6 tis. € za každé porušení.
  - *Odmítneme a dojde na předběžné opatření:* soud a dva advokáti zhruba 5–10 tis. € (125–250 tis. Kč),
    řízení ve dvou stupních 15–30 tis. €.
  - *Neoprávněná výzva:* naopak máme nárok na náhradu svých nákladů (§ 13 odst. 5 UWG).
- **Největší past je podepsat předložený závazek.** Ten platí natrvalo, ale stránky se generují samy a každý
  měsíc mění, takže by se mohl porušit znovu a pokaždé s pokutou. Postup při výzvě: stránku daného nástroje
  v němčině do 24 hodin vypnout nebo opravit, závazek nepodepisovat bez německého advokáta (UWG)
  a odpovědět ve lhůtě, která bývá 7–10 dní.
- **Cílit jen na Rakousko (de-AT) nepomůže.** hreflang je jen nápověda pro Google, právně nic nemění.
  Rakousko navíc není mírnější: výzva tam není nutná, žaluje se rovnou s návrhem na zveřejnění rozsudku
  v novinách (§ 25 rak. UWG). Při okamžitém uznání to stojí 3–5 tis. € a se zveřejněním 40–50 tis. €
  (it-recht-kanzlei.de, 23. 7. 2026, u spotřebitelských svazů). Nový § 7a rakouského UWG
  (od 27. 9. 2026) míří jen na hromadné zneužívající výzvy, na skutečného konkurenta nedopadá.
- **Vyloučit Německo věrohodně nejde.** Prohlášení „nicht für Deutschland“ platí, jen když se myslí vážně
  a dodržuje (BGH *Arzneimittelwerbung im Internet*). TupTuDu ale Němcům prodává. Blokovat stránky pro
  německé adresy by znamenalo přijít o většinu německy mluvícího trhu, kvůli kterému němčinu děláme.
  Skutečnou pákou je obsah.

**Návrh, jak němčinu zapnout**
1. `de` do `config('srovnani.jazyky')` pro všechny německy mluvící země, bez de-AT a bez vylučování Německa.
2. **Před zapnutím:**
   - a) **„nemá“ rozdělit na „ne“ a „nenalezeno“**, viz Doplnění níže (nahrazuje původní návrh
     „laut Hersteller nicht angegeben“).
   - b) **Ceny v němčině jen čerstvé**, ověřené v posledním měsíčním měření. Jinak cenu nezobrazit, jen odkaz
     na ceník výrobce.
   - c) **Nezávislá kontrola německého textu** na hodnoticí slova, která mohou vzniknout překladem
     („nur“, „leider“, „sogar“, „veraltet“, „das beste“). Zkontrolovat i „Co chceš udělat?“ a „v čem je lepší“.
   - d) Řádek autorství a odkaz na opravu nechat nahoře. V metodice uvést kontakt pro výrobce s lhůtou opravy
     („innerhalb weniger Tage“).
3. **V němčině jen profily** (Libor 13. 11.): bez stránek „X vs TupTuDu“ a bez odkazu „Srovnání X s TupTuDu →“.
   To vyžaduje drobnou úpravu kódu: samostatný seznam jazyků, ve kterých se srovnání s TupTuDu zveřejňuje.
4. **Mimo srovnání, ale související: stránka Provozovatel / Impressum**, viz Doplnění níže.
5. Volitelně jednorázová konzultace německého advokáta (*Fachanwalt für gewerblichen Rechtsschutz*)
   nad jednou profilovou a jednou srovnávací stránkou, odhad 1–2 tis. € (25–50 tis. Kč). Stojí méně než jedno
   předběžné opatření. Libor advokáta 12. 11. vynechal, proto jen jako možnost.

### Doplnění po Liborových dotazech (13. 11. 2026)

**A. Profil bez srovnání s TupTuDu, jen s větou o TupTuDu: je bezpečnější?**
**Ano, s podmínkami.** Původní rozbor bod 4 jsem bral příliš přísně podle široké evropské definice
srovnávací reklamy. Německý BGH k ní navíc vyžaduje, aby reklama *stavěla vedle sebe* zaměnitelné produkty
(BGH I ZR 147/09 *Coaching‑Newsletter*, 2011; I ZR 200/17, 2019). Profil s výpisem vlastností jednoho nástroje
a obecnou větou o TupTuDu takovou konfrontací není. Posuzuje se jen podle obecných pravidel: snižování
(§ 4 č. 1 UWG), nedoložená tvrzení o konkurentovi (§ 4 č. 2), klamání (§ 5) a skrytá reklama (§ 5a odst. 4).
Věcné a pravdivé informace o produktu, na kterých má čtenář zájem, snižováním nejsou. V Česku teoreticky zbývá
§ 2984 odst. 2 OZ (zlehčování i pravdou), každá forma nekalé soutěže ale musí splnit i obecnou podmínku
rozporu s dobrými mravy (§ 2976 odst. 1). Neutrální údaje o produktu se zdrojem a datem tu podmínku těžko
naplní. Riziko je proto výrazně nižší než u „X vs TupTuDu“ a v praxi závisí skoro jen na správnosti údajů.

Aby to platilo:
- **Věta o TupTuDu je stejná na všech profilech** a popisuje TupTuDu samo o sobě („Navrhuješ dům? TupTuDu:
  půdorys, patra, střecha a 3D, v základu zdarma“). Nesmí jmenovat právě to, co profilovanému nástroji
  chybí, například „TupTuDu umí češtinu“ u nástroje bez češtiny. Taková věta by z profilu udělala skryté
  srovnání, a to navíc jednostranné, protože by vybírala jen naše plusy (Lidl v. Vierzon).
- **Věta je vizuálně oddělená** jako sdělení autora („Od autorů této stránky“) a řádek autorství nahoře zůstává.
  Jinak hrozí skrytá reklama.
- **Sloupec „má z N nástrojů“** může zůstat. Srovnává s anonymním trhem, ne s konkrétním konkurentem,
  a ukazuje, že chybějící vlastnost je běžná, takže konkurenta spíš chrání. Pokud je TupTuDu mezi
  těmi N nástroji, nevadí to.
- Na profilu v němčině není odkaz na „X vs TupTuDu“ a ta stránka v němčině neexistuje.

**B. Jak psát „nemá“, aby chyba (i chyba AI) neznamenala nepravdivé tvrzení**
Data (12. 11. 2026, `overeno-*.json`, bez TupTuDu): 239 má, 83 částečně, 91 nemá, 106 nezjištěno. Hrubé
roztřídění poznámek u 91× „nemá“:
- **asi 50 je odvozených z mlčení**: „výrobce neuvádí“, „postup … neobsahuje“, „v přehledu nástrojů není“;
- **asi 40 má pozitivní oporu ve zdroji**: uzavřený výčet (seznam jazyků nebo platforem), výrobce popisuje
  jiný postup („typový dům se vkládá hotový, půdorys se nekreslí“, „hranice pozemku se kreslí ručně“), nebo
  výslovné vyjádření („uvádí, že rozpoznávání obrazu nepoužívá“).

Návrh: **dvě záporné hodnoty místo jedné**, aby se do „nenalezeno“ nedostalo to, co víme jistě:
- **„ne“** (de „nein“) jen tam, kde zdroj zápor *sám říká*: výslovná věta, uzavřený výčet nebo popsaný jiný
  postup. Poznámka u hodnoty tu oporu ukáže („Jazyky podle výrobce: …“). Tvrzení se pak dá doložit
  snímkem.
- **„nenalezeno“** (de „keine Angabe gefunden“, en „not found“) pro vše odvozené z mlčení a zároveň pro dnešní
  „nezjištěno“. Pro čtenáře znamenají obojí totéž: nevíme. Legenda a bublina: *„V popisu, ceníku ani nápovědě
  výrobce jsme k datu ověření zmínku nenašli. Neznamená to, že ji nástroj nemá. Víš, že ji má? Napiš nám
  a do pár dnů to opravíme.“* Takové tvrzení je vždy pravdivé (je o našem hledání, ne o produktu) a doložitelné
  snímky. Napadnout se dá jen tehdy, kdyby celkový dojem stránky klamal, a tomu legenda brání.
- Proti chybě AI navíc: každé „ne“ před zveřejněním v novém jazyce ověří druhý, nezávislý agent nad
  snímkem. Hodnot je málo (asi 40), takže je to levné. Čtenář vidí „nenalezeno“ častěji, stránka je tím ale
  poctivější. Do počtu „má z N“ se nic nepočítá jinak.
- Zavést to **ve všech jazycích**, ne jen v němčině. Riziko je stejné všude, Německo ho jen vymáhá snadněji.
  Práce: přetřídit 91 hodnot (agent + kontrola), nový stav v `konkurence_hodnoty`, texty legendy
  v `lang/*/srovnani.php`, u „X vs TupTuDu“ počítat „nenalezeno“ jako nezjištěné.

**C. Stránka Provozovatel / Impressum**
Impressum je v Německu povinná stránka s údaji o provozovateli webu: firma, adresa sídla, IČO a zápis
v rejstříku, e‑mail a další rychlý kontakt. Musí na ni vést odkaz z každé stránky, obvykle v patičce, nazvaný
„Impressum“ nebo „Kontakt“ (BGH I ZR 228/03 *Anbieterkennzeichnung im Internet*, 2006). Stejnou povinnost má
každý web v EU podle směrnice 2000/31/ES čl. 5, v Česku § 5 zák. 480/2004 Sb. Všechny údaje už máme
v obchodních podmínkách (`resources/views/pravni/podminky-*.blade.php`, včetně chráněného e‑mailu a telefonu).
Chybí jen samostatná stránka, na kterou vede odkaz z patičky. Údaje schované v článku podmínek německé
soudy obvykle neberou jako „snadno dosažitelné“, a chybějící Impressum je v Německu nejčastějším důvodem
výzvy vůbec. Návrh: jedna malá stránka pro všechny jazyky (cs „Provozovatel“, de „Impressum“, en „Legal
notice“) se stejnými údaji jako v podmínkách a odkaz v patičce. Nový veřejný e‑mail to nevyžaduje, stačí
chráněný e‑mail z podmínek (`partials.email-chraneny`). Netýká se jen srovnání, německý web běží
od 5. 11. 2026.

**Zdroje:** nařízení Řím II (ES) 864/2007 čl. 4 a 6; směrnice 2006/114/ES čl. 2 a 4; směrnice 2000/31/ES čl. 3;
nařízení Brusel Ia (EU) 1215/2012 čl. 4, 7 odst. 2, 36, 39; OZ § 2976, 2980, 2984 (zakonyprolidi.cz, znění
od 1. 1. 2026); UWG (DE) § 4, 5, 5a, 6, 8, 8b, 13, 13a (gesetze-im-internet.de); § 3 DDG; UWG (AT) § 2a, 7a
(RIS, BGBl. I Nr. 58/2026), § 25; SDEU C‑44/01 Pippig, C‑112/99 Toshiba, C‑381/05 De Landtsheer,
C‑159/09 Lidl v. Vierzon, C‑509/09 a C‑161/10 eDate, C‑585/08 a C‑144/09 Pammer/Alpenhof, C‑170/12 Pinckney,
C‑441/13 Hejduk, C‑194/16 Bolagsupplysningen, C‑251/20 Gtflix; BGH I ZR 24/03, I ZR 131/12, I ZR 147/09,
I ZR 200/17, I ZR 228/03; zák. 480/2004 Sb. § 5;
it-recht-kanzlei.de „Teure Klagen aus Österreich“ (23. 7. 2026). Částky za výzvy a řízení jsou odhad podle tabulky
RVG a běžné praxe, ne citace.

## Otevřené body
- Bucket `tuptudu-katalog-dukazy`: klíč projektu nesmí zapnout verzování ani zámek objektů. Neměnnost zatím
  drží manifest s otisky SHA-256. Zapnout verzování v konzoli AWS (S3 → bucket → Properties → Bucket Versioning).
- Advokát vynechán (Libor 12. 11. 2026). Při první výzvě od výrobce opravit do pár dnů a uvést datum opravy.
- Nejisté hodnoty ponechané ve prospěch konkurence: Sweet Home 3D kóty a terén (pluginy), HomeByMe export CAD
  (přes DraftSight), Planner 5D náklady (odhad přes AI).
