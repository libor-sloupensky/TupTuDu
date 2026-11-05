# Základy a zemina (Koncept V3)

Kolik zeminy po stavbě zůstane na pozemku navíc. Rozhodnuto s Liborem 4. 11. 2026. Cíl končí u uvedení přebytku a později u jeho umístění na pozemku. Cena odvozu, rozpočet, zákony a povolení cílem nejsou.

## Kdy se to ukáže

Řádek Základy (s blokem Materiály v rozbaleném panelu, aby byl výsledek hned vidět při změně hodnot) je jen s parcelou a uzavřeným obrysem 1.NP (`maZaklady` v `dum.js`, jediné místo podmínky). Byt bez parcely ho nevidí. Do budoucna bude práce s terénem i bez katastru (některé země) z roviny: stačí rozšířit tuhle podmínku, výpočet rovinu umí.

## Výška domu

- **Výška nad terénem = kóta 1.NP** (`dum.posunVysky`), jedno číslo. První parcela nastaví výchozích 30 cm, pokud je kóta 0 (`_zalozZaklady`, neukládá se sama). 1.NP tak ukazuje +0,30.
- **±0 terénu** = 70. percentil výšek pod uzly 1.NP (`_terenDomu`). Dřív se počítal z aktivního podlaží a dům ve 3D se mohl hnout po přepnutí. Neukládá se: po posunu domu se má přepočítat. V m n.m. existuje jen s výškovými daty, jinak je terén rovina na ±0.
- **Jediný terén:** výpočet i 3D berou stejnou mřížku po 2 m a stejné trojúhelníky (`Zemina.mrizkaTerenu`). Dřív měl výpočet vlastní terén po půlmetrových kostkách a na svahu se hrany výkopu trhaly.

## Výpočet (`public/js/koncept-v3/zemina.js`)

Čistý modul bez kresby, test `services/import-test/test-zemina.cjs`, v editoru `test-zeminy-ui.cjs`.

- **Části domu** (`_castiZakladu`): sklepy a 1.NP, zdola nahoru. V každém místě platí nejnižší podlaží, které tam stojí. Podlaží nad 1.NP se nepočítají, přesah patra se nepodkopává.
- **Mřížka po 10 cm:** hloubka buňky = největší hloubka, kterou si vyžádá některá část. Jáma sklepu proto zasahuje i pod sousední nepodsklepenou část a pak se zasype.
- **Do 0,8 m svisle, hlouběji svah.** Svah začíná za pracovním prostorem a mezi 0,8 a 1,2 m hloubky se rozbíhá plynule, aby se na svažitém terénu hrana nelámala.
- **Rýhy pasů** pod obvodovými a nosnými stěnami části, jen kde výkop na spáru nedosáhne. Beton je vyplní celé, zemina z nich jde do přebytku. Nosná stěna nad stěnou sklepu proto pas nemá. Pas pod sklepem je zjednodušeně 50 cm pod dnem.
- **Zpět:** kolem domu všechno (ornice navrch), pod domem se dosype po spodek konstrukce. Ornice se pod dům nevrací, její přebytek je jen to, co bylo pod domem. Záporný přebytek = zemina chybí.
- **Rostlý a nakypřený objem:** rostlý pro bilanci a zásyp, nakypřený pro hromadu a odvoz. Největší hromada počítá všechno vykopané, i to, co se později vrátí; bude potřeba pro umístění na pozemek.
- **Výsledek je odhad**, panel píše „cca". Odstupňování pasů u sklepu se nepočítá.

## Výchozí hodnoty a podklady

| Hodnota | Výchozí | Podklad |
|---|---|---|
| Nad terénem | 30 cm | článek cituje vyhlášku min. 0,15 m nad upraveným terénem; v praxi běžně 30 cm |
| Odkop kolem domu | 80 cm | ASB: min. 0,8 m, izolace za horka 1,2 m; Atelier DEK: 0,6 m pro drenáž |
| Šířka pasu | 50 cm | běžně 30–50 cm, výjimečně 60 cm (Estav, České stavby) |
| Spára pod terénem | 100 cm | min. 0,8 m, soudržné zeminy od 1,0 m, vysoká voda od 1,2 m (Stawebnice) |
| Tloušťka základu | 45 cm | skladba od podlahy po spodek: podlaha, izolace, hydroizolace, podkladní deska, podsyp; 350–500 mm (Mobetony a další); deska používá totéž, není ověřeno zvlášť |
| Ornice | 25 cm | běžně 15–30 cm (dodavatelé), úřad v Hrotovicích nařídil 20 cm |
| Svah | 1 : 0,5 | hlína a jíl 1 : 0,25–0,5, písčité až 1 : 1 (Stawebnice); určuje zhotovitel |
| Nakypření | 1,25 | písek 1,10, hlinitý písek 1,25, hlína a jíl 1,35 (Stawebnice) |
| Svislý výkop do | 0,8 m | NV 591/2006 Sb., příloha 3: strojní výkop, kam vstupují osoby |

Všechny hodnoty jdou upravit: čtyři pole hned, čtyři pod „Podrobnosti". Ukládají se do `dum.zaklady`, co chybí, bere se z `Zemina.VYCHOZI`. Typ základů má každá část zvlášť v `dum.zaklady.casti[id]`, výchozí všude `pasy`:

- **Pasy s podkladní deskou** (`pasy`): nejčastější řešení, pasy a tenká podkladní deska nad nimi patří k sobě (Estav, České stavby). Počítají se rýhy.
- **Nosná deska bez pasů** (`deska`): železobetonová deska, méně časté, slabší podloží nebo spodní voda. Rýhy nejsou.
- **Stávající, bez výkopu** (`stavajici`): nic se nekope.

## Dům bez kontaktu se zemí

Část domu, jejíž spodek (`kóta − tloušťka základu`) je v daném místě nad terénem, na zem nedosáhne: základ tu chybí. Žádná další rezerva není, dům výš přes větší tloušťku základu. Rozhodnuto s Liborem 4. 11. 2026, do budoucna kvůli balkonům a jiným prvkům bez základů.

- Nekope se tu ani kolem: žádná ornice, rýha ani bilance. Na svahu se to posuzuje bod po bodu, sklep vedle se kope dál.
- Panel Základů píše „Chybí základ", plocha je v `bezZakladu` u části i celku. Stěny jsou šrafované jako nepodepřené, panel stěny píše „Chybí základ pod …" a nenabízí podpěru dolů (`_dosahNaZem`, `podepreniPodlazi`).
- Stávající stavba základ má. Bez parcely terén neznáme, platí, že stěna na zemi stojí.

## Jáma ve 3D

Výkop v barvě zeminy se ukáže pod skrytými podlažími, která jsou v terénu, tedy sklepy a 1.NP (`_jama3d` v `dum.js`). Pod viditelnými leží terén až na domě. Vyšší patra ani střecha na to nemají vliv. Skrytá jen část počítá vlastní výkop, ne celý dům.

- **Stejná čísla jako bilance:** `Zemina.jama` sdílí s `spocitej` přípravu i hloubku a přidává rýhy pasů, test hlídá shodu objemu.
- **Mřížka 10 cm natočená podle převažujícího směru stěn** (`_uhelSten`), jinak by hrany natočeného domu byly zubaté. Šikmé stěny mimo hlavní směr a oblé rohy svahů zůstávají mírně zubaté.
- **Díra v terénu** je maska buněk v shaderu (`_materialSJamou`): terén ani jeho mřížka se nad výkopem nekreslí. Terén se nepřestavuje, jen se zapne maska.
- **Okraj sedí na zobrazený terén**, protože výpočet i 3D mají stejnou mřížku. Dno je `kóta − tloušťka základu`, rýhy pasů jsou o kus níž. Síť se přestaví jen po změně výpočtu, výběru podlaží nebo terénu.
- Síť je ve scéně, ne ve skupině domu. Do odkazu jde zvlášť (`_jamyProOdkaz`, modules/sdileni.md), obrázek dá 3D PNG se skrytým domem.
- **Uvnitř domu zemina není:** v obrysu viditelných sklepů a 1.NP se terén nekreslí nad podlahou (`Teren3d.nastavVnitrek`, maska nese i úroveň). Níž ho kryje podlaha a pod stěnou na nižší straně svahu nesvítí díra. Vně zdí zůstává. Jáma nad podlahu viditelného podlaží nezasahuje.

## Zatím neřešeno

- Základy ve 2D, vlastní šířka jednotlivých pasů.
- Umístění zeminy na pozemek (podle nakypřeného objemu).
- Snížená podlaha místnosti (`dum.plochy`) výkop neprohlubuje.
- Nabídka „Stávající", když dům překryje stavbu z katastru.
- Texty panelu jsou česky natvrdo jako zbytek pravého panelu editoru.
