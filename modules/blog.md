# Články pro vyhledávače (Pain Point SEO)

Stav k 5. 11. 2026: **Libor plán schválil a na vzorovém článku upravil pravidla, viz níže. Základ je v commitu e6da276, úpravy
podle nových pravidel jsou lokálně. Oba napsané články mají `stav: koncept`, nic není nasazené.** Analýza se zdroji: https://claude.ai/artifact/6Ygtwz1KndoYiuTqpjx6FY
(soukromá stránka „SEO články TupTuDu“, z jiného sezení aktualizovat publikováním s `url`).

## Strategie

Pain Point SEO: téma podle problému stavebníka, který editor umí vyřešit, ne podle největšího objemu hledání. Editor je
v textu jako řešení. Každý článek má něco, co AI souhrn nenahradí: kalkulačku, naše čísla nebo 3D ukázku. Odpověď má
záviset na domě a pozemku čtenáře. Trh je malý, hodnotí se založené projekty se stěnami, ne návštěvy.

## Pořadí článků

| # | Článek | Adresa | Stav | Před napsáním |
|---|---|---|---|---|
| 1 | Kolik zeminy zbude po výkopu základů | `/cs/clanky/kolik-zeminy-z-vykopu` | koncept, čeká na přečtení | hotovo: kalkulačka, schéma, snímek. Navazují: koeficient nakypření (napsaný), základy na svahu, skrývka ornice, nezámrzná hloubka, pracovní prostor výkopu, kam se zeminou |
| 2 | Dům na vlastním pozemku dřív, než zaplatíš projekt | `/cs/clanky/dum-na-pozemku` | nenapsáno | říct hned, že nejde o fotorealistický obrázek |
| 3 | Výpočet schodiště s nákresem | `/cs/clanky/vypocet-schodiste` | nenapsáno | kalkulačka s nákresem, ověřit ČSN 73 4130 |
| 4 | Základy na svahu | `/cs/clanky/zaklady-na-svahu` | nenapsáno | editor od 5. 11. 2026 základ prodlouží až k domu, čísla brát z něj. Snímek domu na svahu už je (`zaklad-svah`) |
| 5 | Jak daleko od hranice pozemku smí stát dům | `/cs/clanky/odstup-od-hranice-pozemku` | nenapsáno | § 11 ověřen na zakonyprolidi.cz, zjistit, jak je to v Praze |
| 6 | Jak nakreslit půdorys domu online | `/cs/clanky/jak-nakreslit-pudorys` | nenapsáno | ověřit, kolik úprav spotřebuje jednoduchý dům |

Druhá vlna podle dat z první: pasy nebo deska, podkroví, typy střech na jednom domě, převýšení a sklon pozemku, barva
fasády na domě, který ještě nestojí, z kubíků na tuny.

Čeká na podmínku: výkres základů (základy ve 2D), plocha střechy (řádek v panelu), zastavěná a užitná plocha, kam se
zeminou (umístění na pozemek), přehled programů (srovnávací reklama, `modules/srovnani.md`), rozcestník „Než půjdete za
projektantem“ (až bude aspoň šest článků).

Nedělat: výkopové práce s názvem města, cena a svépomocná stavba základové desky, článek o převodu z PDF do 3D (nikdo to
tak nehledá, patří na stránku funkce), kuchyně a koupelny, samotná kalkulačka sklonu střechy, katastr a ochranná pásma.

## Jak přidat článek

Soubor `resources/clanky/{jazyk}/{adresa}.md`, název souboru je adresa. Do sitemapy, přehledu i hlavního menu se dostane sám.

```
---
titulek: …
popis: … (do 160 znaků, popis pro výsledky hledání)
perex: … (rychlá odpověď hned nahoře)
publikovano: 2026-11-20
overeno: 2026-11-20
revize: 2026-11-20       ← datum odborné revize, bez něj nejde zveřejnit
autor: Libor z TupTuDu
stav: koncept            ← jen lokálně; na produkci je vidět až `zverejneno` a datum publikovano ≤ dnes
obrazek: /img/clanky/…   ← náhled při sdílení, JPEG nebo PNG
souvisejici: adresa, adresa
- Název zdroje | https://…   ← jen pro nás a revizi, na stránce se neukáže
---
```

Text je Markdown (tabulky, zarovnání `---:` pro čísla). Bloky mají vlastní řádek, šablony v `resources/views/clanky/bloky`:

| Blok | Zápis |
|---|---|
| kalkulačka zeminy | `::kalkulacka-zeminy` |
| schéma výkopu | `::rez-vykopu` |
| obrázek | `::obrazek cesta \| popis pro nevidomé \| popisek \| šířka \| výška` |
| výzva | `::vyzva Titulek \| Text` (na dotyku místo registrace nabídne poslat si odkaz) |
| upozornění | `:::pozor Titulek` … `:::` (druhy pozor, chyba, hotovo, jiný = oranžová) |
| odkaz na článek | `[text](clanek:adresa)`, dokud cíl není vidět, zůstane jen text. Věta proto musí dávat smysl i bez odkazu |
| odkaz do aplikace | `[text](aplikace:)`, na dotyku místo registrace nabídne poslat si článek |
| související články | v hlavičce `souvisejici: adresa, adresa`, ukážou se jen ty, které jsou vidět |

Česká typografie (nezlomitelné mezery) se doplňuje sama, `Clanky::vlna`. Texty kolem článku jsou v `lang/*/clanky.php`.

## Kde co je

| Co | Soubor |
|---|---|
| Načtení článků a bloky | `app/Support/Clanky.php`, `ClankyController`, `resources/views/clanky` |
| Jazyk daný adresou | `NastavLokalizaci`, routy v `routes/web.php`, `Lokalizace::adresaWebu` a `verzeStranky` (modules/lokalizace.md) |
| Kanonická adresa, jazykové verze, popis, náhled při sdílení | `components/layouts/web` (props `popis`, `verze`, `kanonicka`, `prepinac`, `obrazek`, `ogTyp`) |
| Sitemapa | `SeoController` |
| Kalkulačka zeminy | `public/js/kalkulacka-zemina.js`, test `services/import-test/test-kalkulacka-zeminy.cjs` |
| Výzva a události | `public/js/clanky.js` |
| Článek jako zdroj registrace | `FortifyServiceProvider`, `uzivatele.zdroj_registrace` |
| Obrázek výkopu z editoru | `node services/clanky/snimky-zemina.cjs` |
| Test v prohlížeči | `node services/import-test/test-clanky-ui.cjs`, snímky ve `vystup/clanky` |
| Kontrola pravidel | `php artisan clanky:kontrola` (`KontrolaClanku`) |

**Kalkulačka nesmí načítat nic z `js/koncept-v3`** (rozhodnutí z 3. 11. 2026, `modules/sdileni.md`). Má vlastní přesný vzorec
pro obdélník na rovině, test ho porovnává s `Zemina.spocitej` v 102 kombinacích. Změna výpočtu v editoru test shodí.
Editor má jeden drobný artefakt: u sklepu může řada buněk mřížky ležet přesně na líci a započítat se ven z domu.

## Před nasazením

1. Práce je commitnutá, stačí push. Cizí řádek `tarify.funkce_export` ve `vitrina/cenik.blade.php` do commitu nepatří a zůstal v pracovní kopii.
2. Posunout „Účinné od“ v zásadách soukromí (cs i en): přibyl řádek o článku jako zdroji registrace.
3. Sloupec `zdroj_registrace` založí migrace při nasazení.
4. Po nasazení ověřit produkci: `curl -H "CF-IPCountry: US" https://www.tuptudu.com/cs` musí být česky, koncept článku 404.
5. Článek 1 popisuje základ prodloužený k zemi, editor proto musí na web nejpozději s ním. Článek o koeficientu nakypření zveřejnit zároveň, článek 1 na něj odkazuje.
6. Až Libor článek schválí: `stav: zverejneno`, `publikovano`, `overeno` a `revize`, přepočítat příklady, `php artisan clanky:kontrola`, nasadit.
6. V Search Console „Požádat o indexování“ pro `/cs`, znovu odeslat sitemapu, přidat web do Seznam Webmaster. **Až po nasazení,
   dnes by Google znovu načetl starou verzi.**

## Měření

Pět kroků: článek v indexu, zobrazení, klik na výzvu, registrace z článku, založený projekt se stěnami. Rozhoduje poslední.

- GA4 (jen se souhlasem): události `clanek_vyzva`, `clanek_poslat_odkaz`, `kalkulacka_pouzita`.
- Registrace: `SELECT zdroj_registrace, COUNT(*) FROM uzivatele WHERE zdroj_registrace IS NOT NULL GROUP BY zdroj_registrace`.
- Přehled v Masterteamu zatím není.

## Pravidla článků (Libor 5. 11. 2026, platí pro všechny)

1. **Krátce a k jednomu tématu.** Do 500 slov textu bez tabulek a bloků, nejvýš 650. Související téma je samostatný článek
   s vlastním názvem podle toho, co lidé hledají, a oba se propojí odkazem. Název musí fungovat pro hledání: ne „Rostlý
   a nakypřený objem“, ale „Koeficient nakypření zeminy“.
2. **Čtenář zůstává na webu.** Žádné vnější odkazy v textu a žádný seznam zdrojů na stránce. Výjimka jen tam, kde to
   vyžaduje zákon (srovnávací stránky, `modules/srovnani.md`). Zdroje jsou v hlavičce souboru, jen pro nás a pro revizi.
   Předpis se smí jmenovat slovy, když to čtenář opravdu potřebuje, ale bez odkazu.
3. **Přirozeně do aplikace, vždy s výzvou k akci (Libor 9. 11. 2026).** Každý článek má aspoň jednu výzvu (blok
   `::vyzva`) a celkem 2 až 3 místa, kde aplikace řeší přesně to, o čem je řeč: u kalkulačky (co spočítá přesněji),
   věta v textu, výzva. Výzva navazuje na to, co čtenář právě zjistil, a nabízí další krok („Zkus si to na svém domě“),
   ne obecné „Zaregistruj se“. Popisná věta, ne reklama. Slíbit jen to, co editor umí právě v daném případě: svah,
   jiná země, telefon, limit zdarma. Musí to působit přirozeně a neotravně.
4. **Čísla podle země.** Fyzika a postup platí všude, hodnota z předpisu nebo praxe platí v jedné zemi. Hodnotu závislou na
   zemi vždy označit („v Česku“). Srovnání a návrh řešení: `modules/stavebni-parametry.md`.
5. **Čtenáři tykáme**, i v titulcích a popisech (CLAUDE.md, část Překlady).
6. Odpověď hned nahoře. V každém článku něco, co AI souhrn nenahradí: kalkulačka, naše čísla, 3D ukázka nebo odkaz na ně.
7. Slibujeme jen to, co je na produkci. Žádné „připravujeme“. Neslibovat panel souladu. Konkurenci nejmenovat, slovo
   „jediný“ nepoužívat. Na konci upozornění z titulky (šablona ho přidá sama).
8. Žádná hromadná výroba. Před předáním Liborovi: `php artisan clanky:kontrola`, odborná revize a vyřešení nálezů.
   Po revizi se do hlavičky zapíše `revize: datum`, bez něj kontrola zveřejněný článek odmítne.
9. **Tón (Libor 9. 11. 2026): přátelský, ale profesionální.** Jako zkušený stavař, který radí známému: věcně, s čísly,
   bez žoviálnosti. Krátké odstavce (2 až 4 věty), krátké věty, odborný pojem vysvětlit při prvním použití. Bez emoji,
   vykřičníků, superlativů a frází typu „v dnešní době“ nebo „není nic jednoduššího“. Text nesmí znít jako reklama ani
   jako stroj.
10. **Vlastní zkušenost.** Kde to jde, naše čísla, příklad spočítaný v editoru nebo zkušenost z vlastní stavby. Podpis
   „Libor z TupTuDu“, datum ověření `overeno`. Odborný obsah bez autora a bez dat Google hodnotí hůř.
11. **Grafický styl jen z hotových prvků.** Článek používá jen Markdown a bloky z tabulky výše, takže vzhled dodá šablona
   podle `modules/brand.md`, část Prvky článků (perex Q1, mezititulky N4, odrážky O2, upozornění U1, tabulka T1, výzva V1,
   odkazy L1). Žádné vlastní HTML, styly ani barvy. Nový druh prvku napřed navrhnout Liborovi a doplnit do šablony.
   Obrázky jen skriptem, v jednotném stylu (snímek z editoru nebo schéma), nikdy fotky z cizích webů.

## SEO pravidla (Libor 9. 11. 2026)

- **Téma z plánu klíčových slov.** Plán je tabulka Pořadí článků výše a stránka se zdroji (odkaz nahoře). Každý článek
  má jedno hlavní klíčové slovo a 2 až 4 vedlejší (varianty, otázky). Před psaním se podívat, jestli na stejné slovo
  necílí jiný článek. Lepší je nová fráze. Když se překrývají, nový článek může starší i pozvednout: oba se navzájem
  odkážou a každý odpoví na jinou otázku. Nesmí to být dva skoro stejné texty.
- **Volba hlavního slova podle analýzy, ne podle pocitu.** Vždy z dat: objem a konkurence z Plánovače (`py services/klicova-slova.py`),
  dotazy ze Search Console a našeptávač Seznamu. Ověřit záměr hledání: kdo je dnes ve výsledcích. Když tam jsou
  firmy a ceníky („odvoz zeminy cena“), chce hledající nakoupit, ne se poučit, a článek tam neuspěje. Pak je slovo
  jen vedlejší. Malý objem u slova, které přesně odpovídá problému, nevadí (Pain Point SEO). Volbu hlavního
  a vedlejších slov i s čísly a důvodem copywriter vždy uvede v hlášení.
- **Kde je hlavní slovo:** v titulku (nejlépe na začátku), v perexu, v adrese a aspoň v jednom mezititulku. Psát
  přirozeně, slovo nikdy nehromadit. Odpovídat na to, co hledající opravdu chce (spočítat, porovnat, rozhodnout).
- **Titulek do 60 znaků** (kontrola upozorní nad 65), **popis 120 až 160 znaků**: přínos pro čtenáře, tykání, bez
  opakování titulku.
- **Adresa** krátká, z hlavního slova, bez diakritiky, v jazyce článku. Po zveřejnění se nemění.
- **Stavba:** jeden H1 (titulek dává šablona), mezititulky H2 a H3 podle otázek čtenáře. Odpověď hned v perexu, aby
  šla převzít do výňatku ve výsledcích hledání.
- **Provázání článků (Libor 9. 11. 2026), oběma směry.** Nový článek odkazuje na další články tam, kde čtenáři
  opravdu pomohou, odkazem ve větě (`[text](clanek:adresa)`) a v `souvisejici`. Zároveň projít starší články a do
  vhodných míst doplnit odkaz na nový článek, i do jejich `souvisejici`. Odkaz musí být ve větě, která dává smysl i bez
  něj, s popisným textem, nikdy „zde“ nebo „klikni“. Raději méně a přesně: 2 až 4 odkazy na články v textu, žádné
  hromady odkazů. Stejně přirozeně a neotravně jako výzva do aplikace.
- **Obrázky:** popis pro nevidomé (kontrola ho hlídá) a popisný název souboru.
- **Strukturovaná data** (Article, drobečková navigace) a kanonickou adresu dává šablona `clanky/detail` sama, ručně nic.
- **Aktuálnost:** hodnoty z předpisů znovu ověřit nejpozději po roce a posunout `overeno`.

## Data z Googlu a Seznamu (nástroje MCP)

Copywriter s daty pracuje sám, Liborovi předává závěr, ne čísla k vyhodnocení. Nastavení je v `modules/marketing.md`.

| Kdy | Nástroj | Co zjistit |
|---|---|---|
| výběr tématu | Search Console (`get_search_analytics`, `get_search_by_page_query`) | na jaké dotazy se už zobrazujeme, které stránky soupeří o stejné slovo |
| výběr tématu | Plánovač klíčových slov přes API: `py services/klicova-slova.py` (objemy pro `services/clanky/klicova-slova.txt`), `--napady "slovo"` (další dotazy) | průměrný měsíční počet hledání v Česku a průběh po měsících, CSV v `storage/app/klicova-slova/` |
| výběr tématu | našeptávač Seznamu | jak lidé dotaz skutečně píšou, srovnání variant |
| po zveřejnění | Search Console (`inspect_url_enhanced`, sitemapa) | je článek v indexu, jinak požádat o indexování |
| 2 až 4 týdny po zveřejnění | Search Console | zobrazení, proklik, pozice. Při nízkém prokliku upravit titulek a popis |
| průběžně | GA4 (`run_report`, události `clanek_vyzva`, `clanek_poslat_odkaz`, `kalkulacka_pouzita`) a DB (`zdroj_registrace`) | vede článek k registraci a k projektu se stěnami (část Měření) |

Data z GA4 jsou jen od návštěvníků se souhlasem s cookies, proto rozhodují registrace z DB.

## Jazyky a země u článků (Libor 9. 11. 2026)

Každý článek po schválení české verze vyjde ve všech jazycích webu (cs, en, sk, pl, de, fr, es, it). Nejde o doslovný
překlad, ale o verzi pro zemi:
- **Klíčová slova znovu pro každý jazyk.** Titulek, adresa a mezititulky podle toho, jak to lidé v dané zemi hledají,
  ne převodem z češtiny.
- **Hodnoty podle země.** Fyzika a postup se přeloží, číslo z předpisu nebo praxe se vezme pro zemi jazyka
  (`modules/stavebni-parametry.md`, tři stavy: ověřeno, závisí na regionu, neověřeno). Česká hodnota nikdy jako náhrada.
- **Možnosti aplikace v zemi.** Co aplikace v zemi neumí, článek neslibuje: katastr a hledání parcely jsou jen v Česku
  (parcely přes INSPIRE jsou v plánu, `modules/lokalizace.md`), ruční pozemek zatím není, jednotky jen metrické. Výzvu
  do aplikace upravit na to, co tam funguje, nebo omezení jednou větou přiznat.
- **Téma čistě národní** (odstup od hranice, katastr) se pro jinou zemi píše znovu podle jejích pravidel, nebo tam nevyjde.
- Obrázky s textem vygenerovat pro každý jazyk (část Obrázky a překlad). Odborná revize zvlášť pro každou zemi.

**Jazyk ve více zemích (DE a AT, FR a BE a CH, IT a CH), schválil Libor 9. 11. 2026:** jeden článek na jazyk s jednou adresou, psaný pro
hlavní zemi jazyka. Kde se hodnota v druhé zemi liší, uvede se v textu obojí („v Německu …, v Rakousku …“) nebo malou
tabulkou. Samostatná verze pro zemi (vlastní adresa, `hreflang="de-AT"`) jen u článku, jehož jádro je národní předpis,
a jen když je v té zemi dost hledání. Angličtina je bez cílové země: princip a postup, čísla jen jako příklad
s uvedením země.

**Technicky chybí:** články mají jen cs a en (`Clanky::SEGMENTY`, `skupiny_jazyku.clanky`), jazykové verze téhož
článku se zatím nepropojují (`:verze="[]"` v `clanky/detail`, potřeba společný klíč v hlavičce a hreflang) a hlavička
nemá `zeme`. Udělat před prvním překladem.

## Postup jednoho článku

1. Téma z plánu, data ze Search Console, Plánovače a našeptávače, hlavní a vedlejší klíčová slova, překryv se staršími články.
2. Ověřit v kódu a v `modules/`, co aplikace v daném případě umí. Spočítat příklad v editoru nebo kalkulačce.
3. Napsat podle pravidel výše, `stav: koncept`, s výzvou k akci a odkazy na související články. Do starších článků
   doplnit odkazy na nový. `php artisan clanky:kontrola` bez chyb.
4. Odborná revize nezávislým agentem a vyřešení nálezů, `revize: datum`.
5. Předat Liborovi. Po schválení `stav: zverejneno`, nasadit až na jeho pokyn.
6. Po nasazení indexace v Search Console, odkazy ze starších článků, za 2 až 4 týdny vyhodnotit.
7. Verze v dalších jazycích podle části Jazyky a země, každá s vlastní kontrolou a revizí.

## Odborná revize

Povinná po každém napsání nebo větší úpravě článku. Dělá ji nezávislý agent (`.claude/agents/revize-clanku.md`, jinak
`general-purpose` s odkazem na tuhle část), který dostane jen cesty k článkům, ne autorovy závěry.

**Role:** zkušený projektant a stavbyvedoucí rodinných domů v Česku, který článek čte poprvé a hledá, co je špatně.

1. **Odborná správnost.** Každé číslo a odborné tvrzení ověř aspoň ve dvou nezávislých zdrojích, předpisy v aktuálním znění.
   Hodnotu ověř na stránce, kterou otevřeš, výsledek vyhledávání nestačí. Zdroje z hlavičky jsou start, ne důkaz.
2. **Praxe.** Co by stavbyvedoucí namítl? Co článek zamlčuje tak, že to čtenáře svede? Zjednodušení je v pořádku, jen když
   je přiznané a výsledek není v praxi zavádějící. (Příklad z minula: článek nezmínil, že na svahu jsou základy na každé
   straně domu jinak vysoké.)
3. **Výpočty.** Přepočítej všechny příklady. Čísla musí sedět s `public/js/kalkulacka-zemina.js` a s výpočtem editoru
   (`public/js/koncept-v3/zemina.js`, `modules/zemina.md`).
4. **Tvrzení o aplikaci.** Cokoli, co článek slibuje o TupTuDu, ověř v kódu a v `modules/`. Platí to i v případě, o kterém je
   věta řeč (svah, jiná země, telefon, verze zdarma)? Text kolem článku je v `lang/cs/clanky.php` a `resources/views/clanky`.
5. **Země.** Označ každé tvrzení, které platí jen v některé zemi a není tak označené.
6. **Pravidla.** Projdi část Pravidla článků výše. `php artisan clanky:kontrola` musí být bez chyb.
7. **Čeština.** Gramatika, odborné názvosloví a srozumitelnost pro laika. Text má znít přirozeně, ne jako překlad nebo reklama.

**Výstup:** tabulka nálezů seřazená od nejhoršího: závažnost (chyba / zavádějící / drobnost), citace místa, proč je to
problém, návrh opravy, zdroj s adresou. Bez chvály a bez shrnutí toho, co je v pořádku. Co se nepodařilo ověřit, vypiš zvlášť.

Revize je pořád stroj: zachytí, co si odporuje se zdroji a kódem, ale nenahradí člověka z praxe. U témat s dopadem na
statiku a bezpečnost (základy, výkopy, opěrné zdi) je dobré jednou za čas nechat přečíst projektanta. Cena zatím nezjištěna.

## Obrázky a překlad

- **Schéma** je SVG přímo ve stránce: v obrázku jen čísla, popisy pod ním z `lang/*/clanky.php` (`clanky/bloky/rez-vykopu`).
  Přeloží se samo a v dalším jazyce se nekreslí znovu.
- **Snímek bez textu** (3D pohled) je jeden pro všechny jazyky. Takový volit, kde to jde.
- **Snímek s textem** (panel editoru) se generuje skriptem pro každý jazyk zvlášť: `public/img/clanky/{adresa}/{jazyk}/soubor`.
  `::obrazek` si variantu v jazyce článku najde sám, jinak použije společný soubor. Vyžaduje přeložený editor.
- Popisek a popis pro nevidomé jsou v textu článku, překládají se s ním. Nově vytvořené snímky vždy skriptem, nikdy ručně.
- Jednotky jsou zatím jen metrické, řešení odloženo (Libor 5. 11. 2026).

## Příklad výpočtu pro články

Dům 12 × 10 m ze `Zemina.spocitej` při výchozím nastavení (pracovní prostor 0,8 m, ornice 25 cm, spára 1 m, nakypření
1,25, vnitřní nosná stěna 10 m), hodnoty v m³. Se skutečnou stavbou neporovnáno.

| Případ | Vykopáno | Ornice navíc | Výkopek navíc | Největší hromada |
|---|---:|---:|---:|---:|
| Rovina, pasy, pod dům výkopek | 60 | 30 | 8 | 74 |
| Rovina, pasy, pod dům štěrk (12 m³) | 60 | 30 | 20 | 74 |
| Rovina, nosná deska, skladba 70 cm | 63 | 30 | 18 | 79 |
| Rovina, celý sklep 3,05 m, pasy | 652 | 30 | 368 | 814 |

Editor a kalkulačka počítají stejně i se štěrkem a prodlouženým základem, hlídá to `test-kalkulacka-zeminy.cjs`. Čísla pro svah v článku
1 nejsou, patří do článku Základy na svahu. **Ornici a výkopek nesčítat, když výkopek chybí:** ornice se pod dům nevrací.

## Jak se data sbírala

- **Objemy z Googlu** jdou od 9. 11. 2026 přímo přes API (Cloud projekt má stupeň Basic): `services/klicova-slova.py`, Česko
  a čeština, Google je zaokrouhluje (10, 20 … 1 300) a slabé dotazy vrací bez dat (0). První měření 9. 11. 2026: nejvíc
  výpočet schodiště a pultová střecha (1 300), půdorys domu (1 000), typy střech (880), výška schodu (720), dům ve svahu (590).
  Dotazy kolem výpočtu zeminy mají 0 až 10, nejsilnější je odvoz zeminy (90) a jeho varianty s cenou (40 až 50).
- **Našeptávač Seznamu** vrací u dotazů pole `_count`. Období neuvádí, slouží jen ke srovnání dotazů mezi sebou. Seznam má
  v Česku 13 % hledání (Statcounter, říjen 2026).
- **Soupeři ve vyhledávání** nejsou aplikace z analýzy konkurence: kolikmaterialu.cz, dozor-brno.cz, AIkatastr,
  pozemkov.cz (výkopy a násypy v tarifu Pro za 590 Kč měsíčně).

## Otevřené body

- Libor: přečíst článek 1 a dodat přibližná čísla z vlastního výkopu. Články podepisuje „Libor z TupTuDu“ (Libor 9. 11. 2026).
- Hodnoty podle země: Libor souhlasí se směrem z `modules/stavebni-parametry.md`, ale chce důkladnější plán. Odloženo, teď se nedělá.
- 3D ukázka přes sdílený odkaz v článku: `X-Frame-Options: SAMEORIGIN` vložení na www dovolí, chce to demo projekt na produkci
  (ne Klemov) a vyzkoušet na telefonu. V článku 1 zatím jen obrázek.
- Ukázkový dům otevíraný z článku, přehled registrací v Masterteamu.
- Doplnit pozemkov.cz a weby s kalkulačkami do analýzy konkurence, zatím neudělané.
