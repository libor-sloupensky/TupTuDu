# Srovnání s konkurencí — stránky „X vs TupTuDu"

Stav k 3. 11. 2026: **odloženo do šuplíku, návrat cca 10. 11. 2026.** Nic není naprogramováno; existuje právní rozbor,
ukázka tří rozvržení a Liborova rozhodnutí níže. Libor teď vylepšuje funkce TupTuDu (střecha, podlaží, export…),
takže srovnání by rychle zastaralo. Při návratu nejdřív přečíst tento soubor a ukázku.

## Cíl

Informovat lidi, kteří hledají recenzi nebo alternativu konkurenčního nástroje, dovést je k objektivnímu srovnání
s TupTuDu a část z nich získat, pokud sami usoudí, že se jim TupTuDu hodí víc. **Žádné přibarvování.** Objektivita je
zároveň zákonná podmínka (viz právní rámec), takže zadání a zákon jdou stejným směrem.

## Rozhodnutí Libora (3. 11. 2026)

- Rozvržení: **kombinace SR2 (průvodce) a SR3 (podle potřeby)** z ukázky https://claude.ai/artifact/6B5mSmoi57wqkCJQbKwFKy.
  Zdroj ukázky je v `services/srovnani-ukazka/` (šablona, data z analýzy, sestavovací skript `node services/srovnani-ukazka/sestav-srovnani.cjs`).
- **Ceny dát nahoru**, nad tabulku vlastností (ne až za ni).
- **SEO je důležité.** Na jednoho konkurenta víc stránek s odlišným záměrem hledání, ne stejný obsah v různé délce
  (Google to hodnotí jako vstupní stránky a penalizuje).
- **Profilové stránky nástrojů** („X: funkce, ceny a limity") s odkazy na srovnávač — doplněno do plánu níže.
- Jedna stránka na každého konkurenta, např. „Ashampoo vs TupTuDu", „Homestyler vs TupTuDu".

## Navržená stavba srovnávací stránky (kombinace SR2 + SR3, k doladění při návratu)

1. Drobečky, H1 „X vs TupTuDu…", perex (Q1).
2. **Řádek autorství**: „Sestavil tým TupTuDu, výrobce jednoho ze srovnávaných nástrojů“, stav k datu, verze konkurenta,
   odkaz „Našli jste nepřesnost?“. Skrytá reklama je nekalá praktika — autor musí být jasný hned nahoře.
3. **Situace čtenáře** (SR3): 4–6 karet „Co chcete udělat?“ s verdiktem z faktů (Homestyler / TupTuDu / obě, každá jinak).
4. **Ceny** s tarify obou, podmínkami (období, DPH, měna, kurz ČNB s datem) — dle Libora nad tabulkou.
5. **Tabulka vlastností po oblastech s komentářem** (SR2): 8 skupin × celkem 41 vlastností, legenda
   ano / částečně / ne / neověřeno, u konkurenta **zdroj u každého řádku**, poznámka v zákaznickém jazyce.
   U TupTuDu plánované funkce jen jako „ne, připravujeme“ (nikdy jako ano).
6. „Co má jen X“ / „Co má jen TupTuDu“ a „Pro koho se co hodí“ (z faktů, ne hodnocení).
7. Výzva (V1): zkusit TupTuDu zdarma + poctivý odkaz na web konkurenta.
8. **Metodika**: odkud data, verze, co je neověřeno, stejná sada kritérií pro všechna srovnání; výzva k opravě
   („Zastupujete X? Napište nám, opravíme a uvedeme datum opravy“); známková poznámka
   („X je ochranná známka svého vlastníka, TupTuDu s ním není spojené“); poslední ověření + příští revize; seznam zdrojů.

## Sada stránek na jednoho konkurenta (SEO)

| Stránka | Záměr hledání | Právní režim |
|---|---|---|
| `X vs TupTuDu` | „x vs“, „x srovnání“ | srovnávací reklama § 2980 OZ — hlavní stránka, viz stavba výše |
| `Alternativy k X` | „x alternativa“ | přehled více nástrojů včetně nás; stejná pravidla jako srovnání |
| `X: funkce, ceny a limity` (profil) | „x recenze“, „x cena“ | **nejtenčí led**: mimo rámec srovnání ztrácí pravdivé, ale nepříjemné údaje ochranu § 2980 → jen neutrální popis bez verdiktu, jasně podepsaný TupTuDu (slovo „recenze“ v titulku ne — slibuje nezávislost), odkaz na srovnávač |

Každá stránka má vlastní obsah, interní prolinkování (profil → srovnání → alternativy), datum ověření, hreflang
podle jazyků webu. Žádná hodnocení hvězdičkami ani strukturovaná data typu Review (vlastní recenze konkurenta
Google stejně nezobrazuje a právně je to slabé místo).

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

## Datový tok a kontrola proti halucinacím (návrh)

1. **Data první:** na konkurenta jeden JSON — pro každou vlastnost hodnota (ano/částečně/ne/neověřeno), poznámka
   zákaznicky, zdroj URL, důkazní soubor, datum ověření, kdo ověřil, verze aplikace. Výchozí bod je matice z analýzy
   konkurence (`services/srovnani-ukazka/konkurence-data.json`, 25 nástrojů × 41 vlastností, 1. 11. 2026), která ale
   vznikla z dokumentace výrobců, ne z vlastního zkoušení → **před zveřejněním každý řádek ověřit se snímkem.**
2. **Texty jen z dat** (generované bloky + ručně psané komentáře, které smí odkazovat jen na existující záznamy).
3. **Skript porovná tvrzení v textu s daty** (funkce, čísla, ceny); při neshodě stránku nepustí.
4. **Druhá kontrola:** nezávislý agent dostane jen data a text, vypíše každou větu bez opory v datech.
5. **Liborovo čtení** před zveřejněním.
   Příklad, co kontrola chytí: analýza přepočítala USD jiným kurzem, než sama uvádí (6,8 USD = 143 Kč místo 149 Kč
   při kurzu 21,862) — v analýze zatím neopraveno.

**Důkazy (archiv mimo web):** bucket S3 s verzováním a zámkem objektů (Object Lock), ke každému ověření celý snímek
stránky, HTML, URL, datum, verze, kdo, postup; manifest se SHA‑256 otisky; pro jistotu času kvalifikované časové
razítko manifestu (PostSignum / I.CA, jednotky Kč za razítko); veřejné ceníky navíc do Wayback Machine. Samostatná
funkce v aplikaci není potřeba — bucket + artisan příkaz na pořízení a nahrání (napsat až při stavbě stránek).
`config/filesystems.php` disk `s3` existuje, balík `league/flysystem-aws-s3-v3` zatím ne.

**Revize:** datum ověření na každé stránce; čtvrtletně hlavní konkurenti, půlročně ostatní; oprava do pár dnů od podnětu.

## Pořadí a načasování

- Poctivý stav (1. 11. 2026) Homestyler vs TupTuDu: Homestyler napřed ve 24 z 41 řádků, TupTuDu v 5 (katastr, terén,
  mapa, okolní stavby, čeština), 11 shodně, 1 neověřeno. Našich 5 řádků je přesně to, co stavebník v ČR potřebuje →
  scénářová část (SR3) vychází pro nás nejlépe bez přibarvování.
- Stránky s velkými hráči (Homestyler, Planner 5D…) pustit až po střeše, podlažích a exportu. Dřív české nástroje
  (Homeplot.ai, Online osazení DJT, AIkatastr) a desktopové nástroje bez pozemku, kde je obrázek vyrovnanější.

## Otevřené body při návratu

- Doladit kombinaci SR2 + SR3 s cenami nahoře (nová ukázka, pak teprve Blade).
- Souhlas s bucketem S3 + manifestem pro důkazy; zda chceme časová razítka.
- Pořadí konkurentů; které stránky ze sady dělat první.
- DPH a fakturační období u cen konkurence (v ukázce štítek „k ověření“).
- Opravit USD přepočty v artefaktu analýzy konkurence.
- Jednorázová konzultace advokáta nad šablonou.
- Prvky brandu pro srovnání: ikony ano/částečně/ne/neověřeno a blok metodiky (zatím jen v ukázce, ne v `app.css`).
