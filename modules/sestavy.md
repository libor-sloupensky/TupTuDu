# Nábytková sestava – kuchyňská linka a vestavěná skříň

Hotovo 11. 11. 2026 (fe28def, překlady abebc70, tvar U a pevné šířky 7def2bf, potvrzení mazání dcde860), na webu
od nočního nasazení 11.–12. 11. 2026. Plán a Liborova rozhodnutí jsou
v `modules/katalog.md`, oddíl Plán 2. Libor: „udělej to celé a pak to odladíme“.

## Rozhodnuto (Libor 11. 11. 2026)
- Název **Nábytková sestava**, druhy Kuchyňská linka a Vestavěná skříň.
- Podvolba nástroje **Nábytek a vybavení** (křesílko), žádné nové tlačítko v liště. Nahoře v panelu přepínač
  Nábytek | Nábytková sestava, volba se pamatuje (`localStorage kv3_katalog_rezim`).
- Vlastní objekt místo skříněk v katalogu, staví se z parametrů (jako schodiště).
- Rovná linka, tvar L a tvar U (U doplněno týž den, Libor: „mám kuchyň do U“). Pro všechny tarify. **Kusovník ani cena
  ne** (národně neudržitelné).
- **Šířka každého dílu platí přesně** (Libor 11. 11. 2026: „člověk se musí přizpůsobit tomu, co je v nabídce“). Návrh
  na začátku vyplní stěnu, ale změna šířky skříňky nebo dveří skříně ostatní díly nemění: sestava se zkrátí nebo
  prodlouží po volné stěně. Panel a nákres ukazují volné místo u konců.
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
- **Pevné šířky** (`_sestavaZmenaSirky`, `_sestavaZmenDelkuRamene`): změna šířky, odebrání i přidání skříňky posune
  volný konec ramene (`volnyKonecRamene`: u rovné konec, u L a U krajní konce). Prodloužit jde jen po volném úseku;
  co se nevejde, dostane nejvíc, kolik zbývá, a hláška řekne kolik. Přidaná skříňka má 60 cm, nebo co zbývá.
- **Dorovnání** (`dorovnejRameno`) zůstává tam, kde délku určují stěny: tah za konec, změna hloubky nebo rohu, nové
  rameno a prostřední rameno U mezi dvěma rohy. Ručně zadaná šířka (`upraveno`) zůstává, přizpůsobí se poslední
  neupravený (při tahu za začátek první). Zbytek pod 15 cm je lišta, větší nová skříňka.
- **Rohy (L, U):** roh zabere od líce stěny 90 cm (rohová skříňka s lomenými dvířky), slepý roh hloubka + 5 cm lišta.
  Horní roh má stejnou délku, ať se dělení nahoře a dole kryje. Deska jde rohem průběžně. Každý roh má vlastní volbu
  (`rohy[i]`, v panelu Roh 1 a Roh 2).
- **Tvar při kreslení** (`sestavaTvar`, panel nástroje Rovná | Do L | Do U, pamatuje se): klik na úsek líce pokračuje
  v rohu blíž kurzoru (L), nebo v obou rozích (U), boční ramena do první překážky, nejvýš 2,4 m. Kde roh chybí,
  vznikne menší tvar. Tlačítka v Rozměrech přidají rameno k rovné i k L (linku zkrácenou skříňkami nejdřív dotáhnou
  do rohu) a odeberou krajní rameno.
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
Šířka vybraných dveří (`s.dily`, `dilySkrine`, `setDilSkrine`) platí přesně a skříň se o rozdíl zkrátí nebo prodlouží;
posuvné díly se v nákresu i ve 3D překrývají o 3 cm, rozměr platí bez překrytí. Druh dveří nebo počet dílů rozdělí
skříň znovu rovným dílem. Tah za konec mění krajní díl, mimo 20–150 cm se skříň rozdělí znovu.

## Ovládání
- **Kreslení** (`nastroj = 'sestava'`): náhled pod kurzorem ukáže celý volný úsek líce. Volný úsek končí u jiné
  stěny, u dveří ve stěně (+5 cm na zárubeň), před dveřmi v sousední stěně (místo na průchod v šířce dveří) a u jiné
  sestavy v celé hloubce (`_sestavaVolnyUsek`, kraj se dohledá půlením).
  Klik = celý úsek podle zvoleného tvaru, tah = od bodu k bodu, tah za roh dál od stěny než hloubka = tvar L.
- **Výběr:** klik na sestavu v půdorysu vybere ji i skříňku, tahem skříňky se přesune v řadě (`_sestavaCilSloupce`).
  Úchyty na koncích mění délku po volném úseku (magnet na konec úseku). Ve 3D klik vybere sestavu i skříňku
  (`userData.sloupce` po trojúhelnících, `_sestava3dZasah` v `_kus3dKlik`). Delete smaže skříňku, nebo sestavu.
- **Mazání vždy po potvrzení** „Opravdu smazat?“ s názvem (K1 Kuchyňská linka, K1 · Skříňka 3, K1 · Levé rameno
  se skříňkami): Delete, Smazat v panelu, odebrání skříňky a ramene, křížek v Objektech (Libor 11. 11. 2026,
  linka předtím zmizela na jedno klepnutí). Společné okno `potvrditSmazani` v `koncept-k-ui.js`.
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
`node services/import-test/test-sestava-ui.cjs` (kreslení, vybavení, nákres, pevná šířka, volné místo a posun
skříňky, tah myší, délka a Zpět, L a U tlačítkem, rameno před dveřmi, skříň se zrcadlem a šířkou dveří, 3D,
sdílený odkaz, uložení, potvrzení mazání skříně, skříňky a ramene, kreslení do L a do U). Panely v
`test-formulare-ui.cjs`.

## Zatím ne / další kroky
**Příště (Libor 11. 11. 2026):** automatické vybavení linky nefunguje dobře a roh nezná využití rohové skříňky
(otočné poličky, rohová dvířka). Nejdřív projít s Liborem, co od vybavení čeká.

Ostrůvek a barový pult; skříň do L a zkosení v podkroví; dělené dveře skříně; nezávislé dělení horních skříněk;
povrch po jednotlivých skříňkách; fotografické textury dřeva a kamene (postup jako krytiny); osvětlení pod
skříňkami; volně stojící sporák, pračka a vinotéka.
