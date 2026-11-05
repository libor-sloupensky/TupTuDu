# Články pro vyhledávače (Pain Point SEO)

Stav k 5. 11. 2026: **Libor plán schválil. Příprava webu a článek 1 jsou commitnuté na větvi `koncept-v3`, nenasazené.
Článek 1 má `stav: koncept` a čeká, až ho Libor přečte.** Analýza se zdroji: https://claude.ai/artifact/6Ygtwz1KndoYiuTqpjx6FY
(soukromá stránka „SEO články TupTuDu“, z jiného sezení aktualizovat publikováním s `url`).

## Strategie

Pain Point SEO: téma podle problému stavebníka, který editor umí vyřešit, ne podle největšího objemu hledání. Editor je
v textu jako řešení. Každý článek má něco, co AI souhrn nenahradí: kalkulačku, naše čísla nebo 3D ukázku. Odpověď má
záviset na domě a pozemku čtenáře. Trh je malý, hodnotí se založené projekty se stěnami, ne návštěvy.

## Pořadí článků

| # | Článek | Adresa | Stav | Před napsáním |
|---|---|---|---|---|
| 1 | Kolik zeminy zbude po výkopu základů | `/cs/clanky/kolik-zeminy-z-vykopu` | koncept, čeká na přečtení | hotovo: kalkulačka, schéma, snímek |
| 2 | Dům na vlastním pozemku dřív, než zaplatíš projekt | `/cs/clanky/dum-na-pozemku` | nenapsáno | říct hned, že nejde o fotorealistický obrázek |
| 3 | Výpočet schodiště s nákresem | `/cs/clanky/vypocet-schodiste` | nenapsáno | kalkulačka s nákresem, ověřit ČSN 73 4130 |
| 4 | Dům ve svahu: co udělá 30 centimetrů | `/cs/clanky/dum-ve-svahu` | nenapsáno | musí zaznít § 18 vyhlášky 146/2024 |
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
autor: tým TupTuDu
stav: koncept            ← jen lokálně; na produkci je vidět až `zverejneno` a datum publikovano ≤ dnes
obrazek: /img/clanky/…   ← náhled při sdílení, JPEG nebo PNG
- Název zdroje | https://…
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

**Kalkulačka nesmí načítat nic z `js/koncept-v3`** (rozhodnutí z 3. 11. 2026, `modules/sdileni.md`). Má vlastní přesný vzorec
pro obdélník na rovině, test ho porovnává s `Zemina.spocitej` v 102 kombinacích. Změna výpočtu v editoru test shodí.
Editor má jeden drobný artefakt: u sklepu může řada buněk mřížky ležet přesně na líci a započítat se ven z domu.

## Před nasazením

1. Práce je commitnutá, stačí push. Cizí řádek `tarify.funkce_export` ve `vitrina/cenik.blade.php` do commitu nepatří a zůstal v pracovní kopii.
2. Posunout „Účinné od“ v zásadách soukromí (cs i en): přibyl řádek o článku jako zdroji registrace.
3. Sloupec `zdroj_registrace` založí migrace při nasazení.
4. Po nasazení ověřit produkci: `curl -H "CF-IPCountry: US" https://www.tuptudu.com/cs` musí být česky, koncept článku 404.
5. Až Libor článek schválí: `stav: zverejneno`, `publikovano` a `overeno` na den vydání, přepočítat příklady, nasadit.
6. V Search Console „Požádat o indexování“ pro `/cs`, znovu odeslat sitemapu, přidat web do Seznam Webmaster. **Až po nasazení,
   dnes by Google znovu načetl starou verzi.**

## Měření

Pět kroků: článek v indexu, zobrazení, klik na výzvu, registrace z článku, založený projekt se stěnami. Rozhoduje poslední.

- GA4 (jen se souhlasem): události `clanek_vyzva`, `clanek_poslat_odkaz`, `kalkulacka_pouzita`.
- Registrace: `SELECT zdroj_registrace, COUNT(*) FROM uzivatele WHERE zdroj_registrace IS NOT NULL GROUP BY zdroj_registrace`.
- Přehled v Masterteamu zatím není.

## Pravidla psaní

- Čtenáři tykáme, i v titulcích a popisech (CLAUDE.md, část Překlady). Vykání jen v právních dokumentech.
- Odpověď hned nahoře, pak postup a příklad.
- Slibujeme jen to, co je na produkci. Žádné „připravujeme“. Neslibovat panel souladu.
- Čísla a předpisy se zdrojem a datem ověření, revize po půl roce. Citát ověřit přímo na citované stránce.
- Konkurenci nejmenovat. Jakmile ji jmenujeme, platí `modules/srovnani.md`. Slovo „jediný“ nepoužívat.
- Na konci upozornění z titulky: koncept je orientační a nenahrazuje projektovou dokumentaci.
- Snímky dělá skript z editoru, aby šly přegenerovat. Klemov ani jiný skutečný projekt do nich nepatří.
- Články s českým právem se nepřekládají 1:1.
- Žádná hromadná výroba, každý článek před vydáním přečte Libor.

## Příklad výpočtu pro články

Dům 12 × 10 m ze `Zemina.spocitej` při výchozím nastavení (pracovní prostor 0,8 m, ornice 25 cm, spára 1 m, nakypření
1,25, vnitřní nosná stěna 10 m), hodnoty v m³. Se skutečnou stavbou neporovnáno.

| Případ | Vykopáno | Ornice navíc | Výkopek navíc | Největší hromada |
|---|---:|---:|---:|---:|
| Rovina, pasy s podkladní deskou | 60 | 30 | 8 | 74 |
| Rovina, nosná deska bez pasů | 39 | 30 | chybí 12 | 49 |
| Svah 10 %, kóta −0,75 m vůči horní straně | 117 | 30 | 54 | 147 |
| Svah 10 %, kóta −1,05 m | 170 | 31 | 94 | 212 |
| Rovina, celý sklep 3,05 m, pasy | 652 | 30 | 368 | 814 |

Kóta −0,75 m je nejvýš, kde dům na tomhle svahu všude dosáhne na zem (`kóta − 0,45 m`). **Ornici a výkopek nesčítat, když
výkopek chybí:** ornice se pod dům nevrací, editor je proto ukazuje zvlášť.

## Jak se data sbírala

- **Objemy z Googlu chybí.** `generateKeywordHistoricalMetrics` vrací 403 `DEVELOPER_TOKEN_NOT_APPROVED`: „not allowed for
  use with explorer access“. Pro API by byl potřeba stupeň Basic, ručně to jde v Plánovači v Google Ads. Seznam dotazů je na stránce s plánem.
- **Našeptávač Seznamu** vrací u dotazů pole `_count`. Období neuvádí, slouží jen ke srovnání dotazů mezi sebou. Seznam má
  v Česku 13 % hledání (Statcounter, říjen 2026).
- **Soupeři ve vyhledávání** nejsou aplikace z analýzy konkurence: kolikmaterialu.cz, dozor-brno.cz, AIkatastr,
  pozemkov.cz (výkopy a násypy v tarifu Pro za 590 Kč měsíčně).

## Otevřené body

- Libor: přečíst článek 1, dodat přibližná čísla z vlastního výkopu a říct, kdo články podepisuje. Zatím „tým TupTuDu“.
- Libor: export z Plánovače klíčových slov.
- Podkroví: editor počítá započitatelnou plochu od 1,3 m, vyhláška 146/2024 § 38 od 1,2 m. Vyhlášku jsem četl přes
  shrnující nástroj na zakonyprolidi.cz, 1,3 m podle ČSN 73 4301 jen z článků na webu. Ověřit a rozhodnout, co ukazovat.
- 3D ukázka přes sdílený odkaz v článku: `X-Frame-Options: SAMEORIGIN` vložení na www dovolí, chce to demo projekt na produkci
  (ne Klemov) a vyzkoušet na telefonu. V článku 1 zatím jen obrázek.
- Ukázkový dům otevíraný z článku, přehled registrací v Masterteamu.
- Doplnit pozemkov.cz a weby s kalkulačkami do analýzy konkurence, zatím neudělané.
