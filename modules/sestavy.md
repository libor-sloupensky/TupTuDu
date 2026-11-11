# Nábytková sestava – kuchyňská linka a vestavěná skříň

Hotovo lokálně 11. 11. 2026 (fe28def, překlady abebc70), na web zatím nenasazené. Plán a Liborova rozhodnutí jsou
v `modules/katalog.md`, oddíl Plán 2. Libor: „udělej to celé a pak to odladíme“.

## Rozhodnuto (Libor 11. 11. 2026)
- Název **Nábytková sestava**, druhy Kuchyňská linka a Vestavěná skříň.
- Podvolba nástroje **Nábytek a vybavení** (křesílko), žádné nové tlačítko v liště. Nahoře v panelu přepínač
  Nábytek | Nábytková sestava, volba se pamatuje (`localStorage kv3_katalog_rezim`).
- Vlastní objekt místo skříněk v katalogu, staví se z parametrů (jako schodiště).
- První vlna rovná linka a tvar L. Pro všechny tarify. **Kusovník ani cena ne** (národně neudržitelné).
- Horní skříňky mají stejné dělení jako spodní pod nimi. Nová linka se sama vybaví, uživatel si ji přeskupí.
- Označení podle angličtiny: **K1** kuchyň (Kitchen), **B1** vestavěná skříň (Built-in). W mají stěny, M nábytek.

## Záznam
`engine.dum.sestavy` (Zpět, historie, uložení a sdílení ho nesou samy):

```
{ id: 'K1' | 'B1', podlazi, druh: 'kuchyn' | 'skrin',
  body: [[x, y], …]      // lomená čára po líci stěny, m, y nahoru; rovná 2 body, L 3 body
  strana: 1,             // skříňky vpravo od směru čáry: čára vede zleva doprava, jak se na ni díváš z místnosti
  // kuchyň
  vysky: { deska, sokl, horni, mezera, keStropu }, hloubky: { spodni, horni },
  ramena: [{ sloupce: [{ sirka, skladba, spodni, horni, vysoka?, volne?, upraveno? }] }],
  rohy: [{ spodni: 'L' | 'slepy', horni: 'skrinka' | 'police' | 'nic' }],
  povrchy: { cela, celaHorni?, korpus, deska: { dekor, barva, lesk? }, sokl, uchytky: { typ, barva }, zastena?, drez, spotrebice },
  // skříň
  hloubka, vyska (null = ke stropu), dvere: 'posuvne' | 'otocne' | 'zadne', pocet (null = podle šířky), ram, zrcadla: [odstín | null po dveřích],
  povrchy: { dvere, korpus, uchytky } }
```

Co jde spočítat, se neukládá a počítá `rozvrh(s, ctx)` při každém vykreslení: okna a dveře ve stěně za sestavou
(`_otvoryURamene`), světlá výška podlaží (ke stropu), lišty, rohy, varování. `ctx` dává `_sestavaKontext`.

## Kuchyň
- **Sloupce:** skladba `spodni` (jen spodní), `spodni_horni`, `vysoka` (lednice, trouba, potraviny), `volne`
  (volně stojící lednice, americká, nebo mezera; nad ní volitelně horní skříňka), `lista` (krycí lišta pod 15 cm).
- **Dorovnání** (`dorovnejRameno`): sloupce vyplní přesně délku ramene. Ručně zadaná šířka (`upraveno`) zůstává,
  přizpůsobí se poslední neupravený (při tahu za začátek první). Zbytek pod 15 cm je lišta, větší nová skříňka.
- **Rohy (L):** roh zabere od líce stěny 90 cm (rohová skříňka s lomenými dvířky), slepý roh hloubka + 5 cm lišta.
  Horní roh má stejnou délku, ať se dělení nahoře a dole kryje. Deska jde rohem průběžně.
- **Automatické vybavení** (`vybavKuchyn`): sloty po 60 cm; lednice na kraji dál od okna (od 2,4 m); dřez pod
  oknem, jinak o skříňku od lednice; varná deska s troubou a vestavnou digestoří aspoň ob skříňku od dřezu, ne vedle
  lednice a raději ne na kraji; myčka vedle dřezu z druhé strany než deska; vedle desky šuplíky. „Vybavit znovu“.
- **Okno:** horní skříňka pod oknem se vynechá sama (volba „Horní skříňka i před oknem“).
- **Varování** (panel, oranžový obrys v nákresu i v půdorysu, ne v exportu): parapet níž než deska, vysoká
  skříň nebo horní skříňka před oknem, sestava přede dveřmi, myčka pod 45 cm, lednice pod 55 cm, varná deska bez
  30 cm desky po stranách, dřez hned vedle desky, chybí digestoř, sestava neleží u stěny (tlačítko Přitáhnout).
- **Výšky:** deska 90, sokl 10, horní 72 cm a 55 cm nad deskou, hloubky 60 a 35 cm. Vysoké končí v horní hraně
  horních. „Až ke stropu“ protáhne horní i vysoké ke stropu podlaží.

## Vestavěná skříň
Hloubka 62 cm, ve výklenku (klik na úsek s kratšími bočními stěnami do 80 cm) převezme jeho hloubku. Výška ke stropu,
nebo vlastní. Dveře posuvné (2–6 dílů, ve dvou kolejnicích, rám), otočné (po zhruba 50 cm, úchytky), bez dveří
(police a tyč). Každé dveře mohou být zrcadlo (stříbrné, bronzové, grafitové): klik na dveře v nákresu.

## Ovládání
- **Kreslení** (`nastroj = 'sestava'`): náhled pod kurzorem ukáže celý volný úsek líce. Volný úsek končí u jiné
  stěny, u dveří (+5 cm na zárubeň) a u jiné sestavy v celé hloubce (`_sestavaVolnyUsek`, kraj se dohledá půlením).
  Klik = celý úsek, tah = od bodu k bodu, tah za roh dál od stěny než hloubka = tvar L.
- **Výběr:** klik na sestavu v půdorysu vybere ji i skříňku, tahem skříňky se přesune v řadě (`_sestavaCilSloupce`).
  Úchyty na koncích mění délku po volném úseku (magnet na konec úseku). Ve 3D klik vybere sestavu i skříňku
  (`userData.sloupce` po trojúhelnících, `_sestava3dZasah` v `_kus3dKlik`). Delete smaže skříňku, nebo sestavu.
- **Panel** (`partials/panel-sestavy.blade.php`): záložky Skříňky/Dveře, Rozměry, Povrchy. Nákres zepředu (SVG z
  `nakres`) je hlavní místo úprav: klik vybere skříňku, tah ji přesune, okna ve stěně jsou modře, strop čárkovaně.
- **Katalog:** ve skupině Kuchyně a v noční zóně a vstupu je první dlaždice odkaz do sestavy.

## Povrchy
Dekory: jednobarevný, dřevo, mramor, kámen, beton, terrazzo, nerez, sklo, obklad, zrcadlo. Textury jsou zatím
kreslené na plátně (`kresliPovrch`, odstíny šedi, barvu dává materiál) jako dekory podlah, ne fotky. Klíč materiálu
`sestava:<id>:<povrch>` umí náhled barvy za tahu posuvníkem a „Jinde použité“ (`_barvySestav`).

## 2D a 3D
- **Půdorys** (`_kresliSestavu2d` v `schodyLayer`): spodní skříňky v barvě čel, deska obrysem, horní čárkovaně,
  vysoké s úhlopříčkou, roh, značky bez písmen: dřez s miskou, varná deska kruhy (plyn s křížem), myčka kapka,
  lednice vločka, trouba obdélník, digestoř ventilátor čárkovaně. Skříň s úhlopříčkou, posuvné dveře dvojitou
  čarou, otočné oblouky. Skrytí okem jako schody (`dum:K1`), vypínač Vybavení sestavu skryje.
- **3D** (`_sestavy3d`): skupina `_3d.sestavySkupina` ve `wallGroup`, každá sestava vlastní skupina s otiskem
  (sestava + kontext), přestaví se jen změněná. Kvádry po materiálech (`stavitel`), deska přes `_deska3d` s výřezy
  pro dřez, textura po délce ramene. Viditelnost podle podlaží (`_sestavyViditelnost3d`).
- **Sdílený odkaz:** `_zapecModel` bere i `sestavySkupina` (skupina podlaží). Textury z plátna jdou jako data.

## Soubory
`public/js/koncept-v3/sestavy.js` (vše kromě háčků), `resources/views/masterteam/partials/panel-sestavy.blade.php`,
háčky v `dum.js` (stisk, pohyb, puštění, klik, Esc, Delete, inspektor, `_renderDum`, barvy, viditelnost),
`koncept-k-ui.js` (`_build3d`, výběr a skrytí v Objektech), `stavebni-engine.js` (záznam, posun domu, mazání podlaží,
`getObjectList`), `konva-renderer.js` (`selectedSestavy`, hitTest), `katalog.js` (3D klik, křesílko),
`export-sdileni.js`, `import-pudorysu.js` (mixin), slovníky `ed_sablona.sestava.*` a `ed_dum.sestava|krok|barvy`.

## Testy
`node services/import-test/test-sestava-ui.cjs` (kreslení, vybavení, nákres, šířka a posun skříňky, tah myší,
délka a Zpět, L, skříň se zrcadlem, 3D, sdílený odkaz, uložení). Panely v `test-formulare-ui.cjs`.

## Zatím ne / další kroky
Tvar U, ostrůvek a barový pult; skříň do L a zkosení v podkroví; dělené dveře skříně; nezávislé dělení horních
skříněk; povrch po jednotlivých skříňkách; fotografické textury dřeva a kamene (postup jako krytiny); osvětlení pod
skříňkami; volně stojící sporák, pračka a vinotéka.
