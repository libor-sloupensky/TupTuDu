# Dům přes podlaží (Koncept V3)

Editor pracuje s celým domem: podlaží, schodiště, výškové plochy a střecha. Rozhodnuto s Liborem 1.–2. 11. 2026.

## Datový model

`engine.dum` se ukládá v `data.dum` a nese ho `toJSON` / `fromJSON`, takže Zpět, historie i ukládání fungují přes celý dům bez další práce.

```
dum = {
  aktivni: 'P1',
  podlazi: [{ id, nazev, typ: bezne|sklep|podkrovi, vyska, strop, vlastniNazev, data }],  // zdola nahoru
  schodiste: [{ id, odPodlazi, doPodlazi, plocha?, tvar: prime|L|U, x, y, uhel, sirka, strana, vyskaRucne? }],
  sloupy: [{ id: C1…, podlazi, x, y, sirka, tvar: ctverec|kruh, uhel, barva?, strecha?: false }],
  plochy: [{ id, podlazi, mistnost, typ: zvysena|snizena|bez_podlahy, dh, body: obrys místnosti z rastru, prenos, vypnuto }],
  strecha: { typ, sklon, presah, presahStit, vyskaOkapu, krytina, otocHreben, hrany: { klíč: { typ, sklon } } } | null
}
```

- **Aktivní podlaží je v enginu** (`nodes`, `walls`…) a v JSONu na nejvyšší úrovni, jeho `data` je `null`. Ostatní podlaží leží v `dum.podlazi[].data`. Staré čtecí cesty (`data.steny`) tak fungují dál.
- **`podlazi[].data` se nikdy nemění na místě.** Úprava znamená nový objekt. Snímky Zpět na ně proto jen odkazují a změnu poznají podle identity (obrázek spodního podlaží, 3D, dočasné enginy).
- **Starý projekt bez `dum`** se při načtení stane domem s jedním podlažím 1.NP. Migrace není potřeba.
- **`fromJSON(data, { zachovatDum: true })`** mění jen kresbu aktivního podlaží. Používá ho import výkresu a přepnutí podlaží.
- **Kóta** = dopočet z konstrukčních výšek od 1.NP, které má kótu `posunVysky` (výchozí 0). Změna kóty kteréhokoli podlaží posune celý dům, podlaží tak nejde nasunout ani odtrhnout (Libor 3. 11. 2026). Starší `kotaRucne` se při načtení zahodí. Světlá výška = `vyska − strop`, výchozí 3,05 − 0,25 = 2,80 m.
- **Výška stěny** (`engine.vyskaSteny`): vlastní `wall.vyska`, jinak typ (zídka, plot), jinak světlá výška podlaží.

## Soubory

| Soubor | Co v něm je |
|---|---|
| `public/js/koncept-v3/stavebni-engine.js` | model domu, přepínání, kóty, kopie stěn, transformace domu, magnet spodního podlaží |
| `public/js/koncept-v3/dum.js` | mixin editoru: přepínač, podepření, podklad po podlažích, schody, plochy, střecha, 2D a 3D domu |
| `public/js/koncept-v3/strecha.js` | čistá geometrie střechy, bez kresby; test `services/import-test/test-strecha.cjs` |
| `public/js/koncept-v3/mistnosti.js` | rastr místností, výřezy a plocha pod limitem výšky |
| `public/js/koncept-v3/koty-vyberu.js` | kóty u vybrané stěny a otvoru |
| `public/js/koncept-v3/koty-retezce.js` | kótovací řetězce kolem domu a rozměry místností; test `test-zobrazeni-objektu-ui` |
| `services/import-test/test-dum-ui.cjs` | test celého domu v prohlížeči (57 kontrol); `test-barvy-domu-ui`, `test-koty-vyberu-ui` a `test-magnet-patro-ui` a `test-schody-ui` pro barvy, kóty, magnet a schody; `test-dum-import-ui.cjs` ověřuje import skutečného výkresu na patro |

## Pravidla

- **Podlaží nejde posunout samostatně.** Hýbe se jen celý dům (výběr všech stěn aktivního podlaží, tažení nebo otočení), zvlášť jen podklad daného podlaží.
- **Staticky zajištěno (Libor 9. 11. 2026):** nejsme statický garant, překlad ani průvlak se nenavrhuje. Editor jen upozorní
  a uživatel smí upozornění u vybrané stěny označit jako vyřešené (tlačítko „Staticky zajištěno" v panelu stěny, i u
  chybějícího základu). Stěna si uloží podpis nepodepřených úseků (`zajisteno`, konce v metrech po 10 cm, `podepreniPodlazi`).
  Šrafa a počet u podlaží zmizí (`nepodeprenePodlazi`), panel ukáže „Staticky zajištěno" s tlačítkem Zrušit. Když se úsek
  změní (posun stěny, jiná podpora dole, jiný základ), podpis nesedí a upozornění se vrátí samo. Jeden krok Zpět.
- **Nosné stěny se nevynucují.** Nepodepřený úsek nosné nebo obvodové stěny je červeně vyšrafovaný, panel nabídne změnu na příčku nebo podpěru dolů. Nic se samo nepřesouvá. Nové podlaží vznikne jako kopie obvodových a nosných stěn.
- **Patro může přesahovat přes podlaží pod ním** (krytý vstup, garáž). Podlaha patra má jeho celý obrys, přesah zůstává nepodepřený a značený.
- **Stěna vedle sklepu leží na zemině.** Úsek nad podlažím typu sklep je podepřený jen stěnou pod ním, úsek mimo obrys sklepu stojí na vlastních základech a neznačí se. Neuzavřený sklep obrys nemá, platí pak obyčejné pravidlo. Přesahu vyššího patra se to netýká. S parcelou musí stěna na zem i dosáhnout, jinak jí chybí základ (modules/zemina.md).
- **Úroveň podlahy je vlastnost místnosti** (Libor 3. 11. 2026): v panelu místnosti volba „V úrovni podlaží / Zvýšená / Snížená / Bez podlahy", podrobnosti (cm, Schody, přenos výš) až po přepnutí z výchozí. Samostatný kreslicí nástroj zrušen (kolidoval s výběrem místnosti). Záznam v `dum.plochy` nese `mistnost` a jeho `body` je obrys místnosti z rastru (`MistnostiRastr.obrysMistnosti`), který po každém přepočtu rastru udržuje `_sladPlochyMistnosti` (aktivní podlaží z rendereru přes `poRastru`, ostatní v `prehledPloch`). Místnost bez uzavřené plochy má `body = []` a plocha spí. Vlastní plocha na plátně není klikací, klik patří místnosti; popisek místnosti ukáže „+0,30 m" nebo „bez podlahy". „Prostup" byl totéž co bez podlahy (otvor ve stropu pod místností: galerie, schodiště, šachta), sjednoceno; starší záznamy se převedou při načtení, volné plochy bez místnosti se nenačtou.
- **Nula otvoru je podlaha místnosti** (Libor 4. 11. 2026): parapet a výška okna i dveří se měří od ní, uložené hodnoty se nemění (`_nulaOtvoru`). Mezi dvěma místnostmi platí vyšší podlaha, exteriér se nepočítá, přenesené zvýšení z podlaží níž platí taky. Horní hrana se ořízne stěnou.
- **Zvýšená plocha se přenáší nahoru** (zvedá se i strop), na každém vyšším podlaží jde vypnout. Na vyšším podlaží je přenesená plocha čárkovaná se štítkem „+30 cm z 1.NP" a **klik přes ni patří místnosti** (hit test v rendereru), jinak by horní místnost nešlo vybrat a přejmenovat. Panel místnosti vypíše zvýšení, která do ní zasahují (aspoň desetina plochy leží v místnosti), se Schody (vzniknou na tomto podlaží, `vyskaRucne` = dh) a „Nepřenášet sem". Kde pod plochou uzavřená místnost není, vybere se plocha sama a má vlastní malý panel. Krátké schody (`schodkyNaPlochu`) se staví na hraně, za kterou je jiná místnost (oddělovač, průchod), ne stěna.
- **Schodiště je jeden objekt přes dvě podlaží.** Dole stupně a šipka, nahoře prostup. Stupně se počítají z výšky mezi podlažími (asi 175 mm, 2h + b = 630 mm). Krátké schody k výškové ploše mají `plocha` (výšku berou z ní, `vyskaRucne` je záloha) a nic neprorážejí.
- **Schody k výškové ploše leží přes její hranici** (Libor 3. 11. 2026): aspoň jeden bod schodů musí být vně místnosti a jeden uvnitř, jinak to nejsou schody k té místnosti. Dotyk hranice stačí jen v přirozené poloze: ke zvýšené podlaze smí stát celé venku s výstupem na hraně (ne celé uvnitř), ze snížené celé uvnitř (ne celé venku). Platí za tahu, při otáčení i po změně stěn, tvaru a výšky: `_mezSchodu` vrátí nejmenší posun k hranici (`DumGeo.hraniceSchodu`), schody po ní kloužou a nezaseknou se. Zapuštěné celé dovnitř se vrací po své ose, dokud nástup nepřejde přes hranici, takže prostor před nimi zůstane otevřený a schody nepřeskočí k jiné hraně. Proužky desky užší než 3 cm se při výřezu zahazují. Alt pravidlo nevypíná, není to magnet. Zvýšená deska má pod schody díru (`_dilyDesky`), podlaha jimi neprotéká. Změna výšky drží horní konec na místě, přepnutí zvýšená/snížená schody otočí kolem něj. Návrat podlahy do úrovně podlaží nebo vypnutí přenosu schody smaže. Schody smí být i obráceně (stoupají od místnosti ven), pravidlo hlídá jen polohu vůči hranici.
- **Podklad patří podlaží:** první podlaží v `metadata.podklad`, ostatní v `metadata.podklady[id]`. Po převzetí stěn z výkresu se plánek srovná automaticky (hlasování o posunu přes rohy, natočení po 90°), jinak se usadí dvěma body.

## Střecha

Každá hrana obrysu horního podlaží je **okap** (rovina stoupá) nebo **štít** (svislá stěna). Typ střechy v nabídce je jen předvolba. Výpočet je vážená střešní kostra: obrys se po výškových vrstvách stahuje dovnitř rychlostí `1/tg(sklon)`, štít rychlostí 0. Výstupem jsou rovnou trojúhelníky.

Roviny procházejí vnějším lícem stěny ve výšce okapu a spodní hrany okapů leží ve stejné výšce, takže přesah je u strmější plochy menší. **Vlastní přesah drží okap ve výšce ostatních** (Libor 5. 11. 2026): rovina se v líci posune o `(přesah − výchozí) · tg(sklon)`, nároží vychází z rohu půdorysu a v rohu nevznikne zub. Pole Výška okapu u hrany tu posunutou výšku ukazuje. Jiná spodní výška (a s ní zub v rohu, třeba záměrně nižší okap nad terasou) je jen u hrany s vlastní výškou okapu. Klíč hrany je `stena:strana`, u nedorovnané hrany `iN`. Zbytek rastru v rohu natočeného domu (tětiva bez stěny, celá na líci sousední stěny) se z obrysu vyhazuje, jinak by jako skoro rovnoběžná hrana s jiným přesahem roztáhla roh střechy daleko ven (`hranyObrysu`). Krátký schod mezi rovnoběžnými stěnami zůstává.

Hrana může mít vlastní typ, sklon, přesah, výšku okapu a barvu (`strecha.hrany[klíč]`), co nemá, bere z celku. Přímka hrany ve výpočtu je `n·p = c + w·(t − z)`, jde tedy o kostru s posunem startu. Roviny s různým spodkem začínají za svým okapem, proto se výsledek ořezává půdorysem střechy (rozklad na konvexní díly). Štítová stěna se počítá zvlášť, mezi nárožími domu, bez přesahů.

**Schod na dlouhé straně** (Libor 11. 11. 2026): v užší části se protilehlé okapy potkají dřív. Zmizí jen kratší z obou splývajících hran, delší pokračuje přes širší část a v místě překryvu vzniká hřeben. Dřív zmizely obě a ve střeše byla díra. Sedlová předvolba bere krátký schod (do 2,5 m, `SCHOD_MAX_M`) mezi okapy stejného směru jako okap, tedy malou valbičku. Ručně přepnutý štít na schodu jde přes celou nižší střechu a ve 3D se dokreslí i za koncem stěny pod ním (`_orezTroj`). Test `test-strecha.cjs`.

Stěny horního podlaží nikdy neprojdou střechou. Stěny na obrysu dosáhnou až pod ni, takže pod vyšším okapem nezůstane mezera. Pod šikmou střechou se strop nekreslí, jen plochá střecha na něm leží.

Typ krytiny (`strecha.krytina`) určuje reliéf ve 3D a platí pro celek, barva je zvlášť (`strecha.barva`). Starší hodnoty jako `antracit` se čtou jako barva. Reliéf se kreslí jako dlaždice 1,2 × 1,2 m a mapuje se v metrech po ploše.

Podkroví: šrafa pod 1,2 m, čáry 1,20 · 1,80 · 2,30 m, započitatelná plocha nad 1,2 m (česká vyhláška, `modules/stavebni-parametry.md`), stěny ve 3D končí pod střechou.

## Výběr barvy

Společný nástroj: `public/js/koncept-v3/vyber-barvy.js`, šablona `resources/views/partials/vyber-barvy.blade.php`, vzorník `public/js/koncept-v3/ral.js`. Zavřený je to symbol s barvou. Po otevření ukáže vzorek původní a nové barvy, tři posuvníky (odstín, sytost, jas), pole RAL s našeptávačem (ukazuje přesný nebo nejbližší odstín, jde zkopírovat) a **Jinde použité**. Tah posuvníkem volá jen náhled, krok historie vznikne po puštění. Do jiného místa se vloží přes `x-data="vyberBarvy({ hodnota, nastav, nahled, pouzite })"` a `@include`. Převod RAL do sRGB je orientační. Dřívější palety A, B a C jsou na stránce https://claude.ai/artifact/E3QnTkf2hayrhjc6yZ2FMn.

„Jinde použité" není historie: `barvyJinde(mimo)` projde dům a vrátí barvy, které na něm teď opravdu jsou, kromě právě upravovaného prvku. Slouží ke sjednocení. Fasáda a otvory se počítají, jen když na domě jsou.

## Druh místnosti (Libor 10. 11. 2026)

Místnost má vedle názvu volitelný druh (`m.druh`, seznam `DRUHY_MISTNOSTI` v `stavebni-engine.js`): obývák, ložnice, pokoj,
kuchyně, jídelna, koupelna, WC, chodba, zádveří, šatna, pracovna, technická, prádelna, spíž, sklad, sklep, garáž. Výchozí je „Jiná“
(bez druhu, jen vlastní název). Výběr je v panelu místnosti pod názvem, jeden krok Zpět (`setMistnostDruh`,
`engine.nastavDruhMistnosti`).
- **Název:** výchozí název (`auto`) se převezme z druhu s prvním volným číslem, „Obývák“, „Obývák 2“. Ručně napsaný název
  editor nepřepíše. „Jiná“ vrátí výchozí „Místnost n“. Názvy druhů jsou ve slovníku `ed_kresba.prostor_*` a přepínají se s jazykem.
- **Starší projekty a vzorový dům:** ručně napsaný název, který je stejný jako výchozí („Ložnice“ u ložnice, „Koupelna 2“,
  staré „Místnost 3“), se při výběru druhu stane výchozím a od té doby se překládá. Smazaný název vrátí výchozí podle druhu,
  napsaný výchozí název výchozím zůstane (`engine.prejmenujMistnost`). Vzorový dům pro všechny jazyky = u každé místnosti
  vybrat druh, u podlaží s ručním názvem název smazat.
- **Import výkresu:** typ prostoru z rozpoznání (CubiCasa, `DRUH_Z_IMPORTU`) se převede na druh, název z výkresu zůstane.
- **Skupiny (Libor 11. 11. 2026):** `SKUPINY_MISTNOSTI` dělí druhy na denní zónu (obývák, jídelna, pracovna), noční zónu (ložnice, pokoj), kuchyni a spíž, koupelny a WC (i prádelna), vstup a chodby (zádveří, chodba, šatna) a technické a sklady (technická, sklad, sklep, garáž). Výběr druhu je po skupinách (`<optgroup>`, `skupinyDruhuVolby`), „Jiná“ zvlášť nahoře. Názvy `ed_kresba.skupina_*`.
- **Nábytek podle skupiny** nabízí katalog (`modules/katalog.md`, Pravidla). Plochy podle druhu (obytná a příslušenství), upozornění podle druhu a barva podle druhu jsou další krok.
- Test: `node services/import-test/test-druh-mistnosti.cjs`.

## Barvy domu a podlahy místností

`dum.barvy` = `fasada`, `oknoVen/oknoDovnitr`, `dvereVen/dvereDovnitr`, `dvereVnitrni`, `vrataVen/vrataDovnitr`. Platí pro celý dům, nastavují se u kteréhokoli podlaží (tužka, „Barva domu") a u kteréhokoli otvoru. Francouzské okno patří k oknům, průchod barvu nemá. Jen otvor v obvodové stěně má dvě barvy, vnitřní dveře mají jednu vlastní (`barvaVnitrniho`), vnitřní okno a vrata sdílejí stranu „uvnitř".

Ve 3D nese materiál klíč v `userData.barva` a barvu dosadí `_nastavBarvy3d` (na konci `_build3d`, s přepisem i za tahu). Rám a plná výplň otvoru jsou dvě půlky tloušťky; stranu ven určí `_stranaVen` z rastru.

Stěny (`_hranolStrany`, `_hranolPodStrechou`): co hledí do exteriéru, je fasáda, všechno ostatní bílé, i vnitřní líc obvodové stěny (Libor 3. 11. 2026, volba vnitřní barvy může přibýt). Rozhoduje rastr pro každých 25 cm boku, takže stěna může být fasádou jen po části délky. Díl stěny se krájí po půlkách tloušťky: půlka u exteriéru má v barvě fasády i ostění, parapet a korunu. Plot a zídka mají barvu svého typu.

**Směr vzoru podlahy (Libor 11. 11. 2026):** dekor vede souběžně se stěnami kolem místnosti (`_smerDekoru`, nejdelší směr stěn po 90°, bez stěn osa domu), prkna po delší straně místnosti. Tlačítko „↻ 90°“ vedle dekoru v panelu místnosti otočí vzor napříč (`podlaha.otoceni = 90`, nula se neukládá). Dřív šly souřadnice textury podle os plátna: v natočeném domě šikmo a prkna často napříč. Test `test-barvy-domu-ui.cjs`, část 5.

Podlahu kreslí jen `_podlahyMistnosti` (všechny místnosti, bez vlastního dekoru společná hladká). Desky mají boky i vrch ve fasádě, spodek je bílý strop. **Proč:** obrys desky se počítá z rastru a může o milimetry přesáhnout líc zdi; bílý vrch desky pak dělal bílý lem všude, kde se patro nekrylo přesně se zdí pod ním. Nad terasou je proto zatím fasáda, barva terasy není řešená.

`mistnost.podlaha = {dekor, barva?}` (bez `barva` platí výchozí barva dekoru, `DEKORY_PODLAH`). Záznam `mistnost.barva` zůstává jen pro půdorys. Obdélníky podlahy přesahují dvě buňky pod stěny a oddělovače, výřezy zůstanou prázdné. Na zvýšené podlaze se dekor kreslí ve výšce zvýšení, nad schody zůstává dole (Libor 4. 11. 2026). Přenesené zvýšení z podlaží níž se řídí jeho obrysem. Snížená místnost: díra v desce o 3 cm přes obrys (`_otvoryDesky`), podlaha a deska v úrovni snížení, stěny dotažené dolů (`_behySnizeni`, s výřezem pro otvory jdoucí pod podlaží), schody k ní začínají na její podlaze. Země a mřížka leží nad ní, proto je nad těmito místnostmi nevykreslí maska ve stencil bufferu (`_maskaZeme3d`), v prohlížeči odkazu má země díry (`diry` v modelu). Plocha místnosti se nemění. Běžné schody do patra se začátkem ve snížené místnosti pořád začínají v úrovni podlaží.

Světla scény jsou nastavená tak, aby vodorovná plocha vyšla zhruba 1,07× barva a stěny 0,77–0,92×, aby výsledek seděl se vzorkem. Slabší je tím stínování terénu.

**Líc mezi podlažími:** nově nakreslená stěna na ose nosné nebo obvodové stěny podlaží níž převezme její typ a tloušťku (`_prevezmiZeSpodku`, s hláškou; s Altem ne, příčka zůstává příčkou). Tenčí stěnu si uživatel nastaví potom, zpětně se nic nemění. Táhne-li ji pak celou, magnet ji přichytí i na líc stěny dole.

**Desky a díry ve 3D:** `_deska3d` srovná obrys proti směru hodinek, jinak ExtrudeGeometry nesrovná směr děr a jejich boky se nekreslí (deska pak u díry vypadala tenká jako podlaha). Bok díry je bílý jako vnitřní stěny, navazuje na něj zeď nad i pod deskou (nízká zídka místo zábradlí, Libor 4. 11. 2026). Horní deska sahá 2 cm nad kótu jako nejnižší, pod podlahu místností.

**Okno pod úrovní podlaží** (`_otvoryPodUrovni`, snížená místnost, nula otvoru pod nulou): desky ustoupí výřezem (`_deskaSVyrezy`, konvexní díly), stěna podlaží níž dostane výřez, je-li okno z patra. Okno pod terénem venku zakryje zem, světlík se záměrně nedělá: řeší se postavením zdi kolem okna (Libor 4. 11. 2026). Test `test-dira-okno-3d-ui`.

**Magnet stěny a oddělovače je jeden** (`_magnetKonce` v `koncept-k-ui.js`, Libor 4. 11. 2026): úhel přes `_magnetUhluZ` nad oporami (`_oporyUzlu`, `_oporyOddelovace`), pak vodítka, pak podlaží níž. Oddělovač má navíc jen své konce a líc stěny. Reference oddělovače je předchozí úsek řetězu, stěna pod počátkem a rastr domu. Nový magnet patří sem, ne do kreslení jednoho z nich.

**Magnet na podlaží níž:** konec stěny na rohy a osy (`magnetSpodku`), celá stěna při tažení na osu nebo líc rovnoběžné stěny (`magnetSteny`, dorovnání kolmo, pravidla posunu mají přednost). Platí pro všechny stěny kromě plotu a zídky, vlastní podlaží má přednost, Alt ho vypne.

## Schody

`schodyGeo` staví přímé schody, L a U. Volitelně `vyskaStupne`, `naslap` (bez nich z výšky mezi podlažími a 2h + b = 630 mm), `casti`, `barva`. Skutečná výška stupně se dorovná, aby stupně vyšly přesně na podlahu.

Části (`castiSchodu`): odpočívadlo i poslední krok na podlahu se počítají mezi stupně, proto L: 1. + 2. = n − 2, U: 1. + 2. + 3. = n − 3. Druhá část 0 je u L jen odpočívadlo, u U jedno široké odpočívadlo přes obě ramena (pak n − 2). Prostřední část U větší než 0 vytvoří mezeru mezi rameny.

**Zabíhající a točité schody jsou zatím jen ve veřejné kalkulačce** (`public/js/kalkulacka-schodiste.js`, článek Výpočet schodiště). Libor 11. 11. 2026: nejdřív je doladit v kalkulačce, potom přenést do editoru. Kalkulačka vede výstupní čáru 0,4 m od vnějšího okraje (do šířky 1,2 m; širší třetina šířky), kde vyhláška měří nášlap ramene do 1,1 m. U širších hlídá 180 mm 0,3 m od vnitřního okraje. Zúžení na vnitřní hraně rozloží rovnoměrně na tolik stupňů kolem zatáčky, aby vyšlo aspoň 150 mm.

**Nášlap podle vyhlášky — editor zatím nesplňuje:** vyhláška 146/2024 Sb., příloha 4 bod 2 žádá nášlap hlavního schodiště aspoň 300 mm, v rodinném domě 275 mm. Kalkulačka proto přidá výšku, když by nášlap vyšel užší (3,05 m: 18 × 169 mm místo 17 × 179 mm s nášlapem 271 mm). Editor bere `round(H / 0,175)` a výchozí podlaží má 3,05 m, takže staví 271 mm a `pohodlne` to nehlásí (revize článku 11. 11. 2026). Přenést pravidlo do `schodyGeo` jen se souhlasem Libora (změní počet stupňů v existujících projektech). U točitých hlídá podchodnou výšku pod otáčkou (sloupek 120 mm, stupeň 50 mm). Tvar U se dvěma odpočívadly v kalkulačce odpovídá editorovému U s prostřední částí větší než 0. Při přenosu do editoru převzít geometrii a test `test-kalkulacka-schodiste.cjs`.

Půdorys: ze spodního podlaží stupně, šipka a „↑ počet × výška/nášlap"; z horního přerušovaný obrys otvoru, stupně tmavší s hloubkou a „↓ dolů". Šrafování zmizelo, Libor ho měl za matoucí; bílá výplň obrysu také (3. 11. 2026), výplň místnosti pod schody zůstává vidět, podklad štítku je jen při pohledu shora na tmavé stupně. 3D: nášlap plná barva, podstupnice a boky 0,7× téže barvy.

Magnet: při založení (`_magnetSmeru`) i otáčení (kolečko ↻ u vybraných schodů, společný `_magnetOtoceni` s čárou podél nejbližší stěny) na směry stěn aktivního a spodního podlaží, i vzdálených, na osy domu a na vodorovnou a svislou obrazovky (`_magnetSmeru`). Při tažení hrana schodů na rovnoběžný líc stěny (`_magnetSchodu`). Alt vypíná.

## Sloup (Libor 11. 11. 2026)

Nástroj Sloup (klávesa 9) postaví sloup 20 × 20 cm na aktivní podlaží. Označení **C1, C2…** podle anglického Column: označení objektů se bere přednostně z angličtiny (Libor 11. 11. 2026, schody S = Stairs). Panel: hranatý nebo kulatý, strana nebo průměr 10–100 cm, barva (bez vlastní barvy fasáda), Střecha přes sloup, smazat. V seznamu objektů jako schody: šedé označení, oko, nepřejmenovává se. Klíč skrytí `dum:C1`.
- **Roh výklenku** (`_rohyVyklenku`): průsečík přímek dvou hran obrysu, mezi kterými obrys uhýbá dovnitř (1–2 hrany mezi nimi, zhruba kolmé). Při zakládání i tažení se sloup do rohu přichytí a lícuje s oběma hranami (dosah 0,4 m + polovina sloupu, podle síly magnetu, Alt vypíná). Změna rozměru v rohu drží lícování. Mimo roh si sloup při tahu drží své natočení.
- **Otáčení:** vybraný hranatý sloup má kolečko ↻ za rohem, tahem se otáčí kolem středu. Magnet je společný s nábytkem a schody (`_magnetOtoceni`, 5°, Libor 11. 11. 2026): přednost má nejbližší stěna a čára magnetu vede podél ní, osy domu a obrazovky platí, jen když žádná stěna nesedí. Nový sloup se natočí podle nejbližší stěny jako kus nábytku (`_uhelNejblizsiZdi`), Alt vypíná.
- **Střecha přes sloup:** sloup v rohu výklenku na horním podlaží vyplní výklenek v obrysu střechy (`_obrysSeSloupy`), okap jde rovně až přes sloup. Vynechané hrany přestanou být hranami střechy, krajní se prodlouží a nesou své nastavení dál. Sloup jinde střechu nemění, panel to řekne. Jde vypnout (`strecha: false`).
- **3D:** od podlahy pod strop, na horním podlaží pod nejnižší roh střechy. Na nejnižším podlaží stojí na terénu (dům bývá nad ním), stejně hluboko jako základ.
- **Podepření:** sloup dole nese jen to, co stojí přímo na něm. Stěna nad ním je dál nepodepřená mimo sloup (průvlak se označí jako staticky zajištěno).
- Vzorový dům má sloup C1 v rohu krytého vstupu u schodu W9/W11, střecha je proto obdélník přes vstup.
- Test `test-sloup-ui.cjs`, panel v `test-formulare-ui.cjs`.

## Ukládání ze dvou míst

Klient posílá `verze`, ze které vychází. Když je na serveru jiná, `ulozit` vrátí 409 a nic nezapíše (zámek řádku hlídá i souběh). Editor přestane ukládat a dialog nabídne načíst aktuální verzi, nebo ji přepsat tou svou (`_konfliktUlozeni`). Uložení běží jedno po druhém (`ulozit` a `_ulozitTed`), jinak by se editor předbíhal sám se sebou. Podklad čeká na běžící uložení kresby. Přejmenování a katastr se neporovnávají. Test `test-konflikt-ulozeni-ui.cjs`.

## Rotace domu

Při otáčení výběru se významný směr stěn (aspoň pětina jejich délky) přitáhne na vodorovnou a svislou obrazovky, ne kompasu (`_magnetRotace`, dosah 3°). Přichycení ukáže čára skrz střed. Alt vypíná.

## Kompas ve 2D i 3D (Libor 10. 11. 2026)

Jeden úhel `kompasUhel` pro obě zobrazení: dům je ve 3D natočený stejně jako půdorys, dolní strana půdorysu je u diváka.
- **Ve 3D** kompas mění jen směr pohledu: azimut OrbitControls = úhel kompasu (`_kompasDo3d`). Sklon pohledu (shora nebo šikmo)
  a vzdálenost zůstanou. Tah kompasem otáčí kamerou, dvojklik dá sever nahoru (`kompasReset`).
- **Otočení pohledu myší** natočí kompas (`_kompasZ3d`, jen při tahu uživatele mezi `start` a `end`, náhled pro odkaz ani export
  kompas nemění). Po puštění se uloží jako ve 2D.
- **Po návratu do 2D** se půdorys natočí podle změny ve 3D (`_kompasZmenenV3d`, skryté plátno 2D nemá ve 3D rozměr). Při vstupu
  do 3D se pohled natočí podle kompasu.

## Kóty u výběru

`public/js/koncept-v3/koty-vyberu.js`, vlastní vrstva `kotyVyberuLayer`, ve stavu tahu se nekreslí. Rastr bez oddělovačů (`bezOddelovacu`) se po změně kresby počítá až 120 ms po výběru, aby nezdržel stisk myši.

- **Stěna:** světlá vzdálenost k rovnoběžným stěnám (do 3°) téhož prostoru. Oddělovač prostor nedělí. Díly stěny v jedné přímce se slévají.
- **Otvor:** od ostění k první stěně podél líce, na každé straně stěny zvlášť; za lícem exteriéru se sleduje zdivo po vnější roh. Měří se po polygonech, ne po rastru. Stejná hodnota z obou stran se ukáže jednou.
- **Přepsání:** číslo nebo tužtička otevře pole v cm. Stěna jde přes `_krokTazeniSteny`, tedy stejná pravidla jako tažení myší, jen bez magnetu. Stěna s konci pevně ve střihu se proto nepohne ani takhle. Navíc nesmí přejet jinou rovnoběžnou stěnu před sebou. Otvor má stejné meze jako při tažení.

## Kóty v půdorysu

Přepínač Kóty v panelu Objekty, výchozí vypnutý (Libor 4. 11. 2026, uloženo jako `kotyVzdy`, staré `showKoty` se záměrně nečte). Cíl: kóty mají být, ale plán nesmí být přeplácaný, proto čísla leží mimo dům jako na stavebním výkresu. `public/js/koncept-v3/koty-retezce.js`, kreslí `renderKoty`, za tahu se řetězce nekreslí.

- **Osy** = převažující směr stěn, takže natočený dům má stejná čísla. Šikmé stěny řetězce nedělí, jen zvětšují celkový rozměr.
- **Řetězce v cm, celá čísla.** Z každé strany se bere stěna nejblíž pozorovateli. Řada otvorů a pilířů jen na fasádě s otvorem, řada úseků jen u zalomené fasády (odskok pod 5 cm a úsek pod 8 cm se nepočítá), celkový rozměr jednou na směr, na obrazovce nahoře a vlevo.
- **Písmo má stálou velikost na obrazovce** a co se nevejde, nekreslí se. Řada zmizí, když se do ní nevejde aspoň půlka čísel, celkový rozměr zůstává nejdéle.
- **Místnost:** řádek „šířka × výška m" v popisku, světlé rozměry paprsky od středu k nejbližší stěně nebo oddělovači. Jen když součin sedí na plochu (do 4 %, jinak by číslo u místnosti do L lhalo) a text se do místnosti vejde. Bez zapnutých Místností se nekreslí.
- **Délka stěny** bez ohledu na přepínač, ale jen u vybrané stěny a stěn vybraného bodu, za tahu i u navazujících, těm se délka mění. Dřív byla na každé stěně, to dělalo nepořádek.
- **Kóty u výběru** a pole pro přepsání zůstávají vždy, jsou nástrojem, ne popisem plánu.
- **Export a odkaz** se řídí přepínačem jako všechno ostatní (Libor 4. 11. 2026), viz `modules/sdileni.md`.

## Seznam objektů a skrytí okem (Libor 10. 11. 2026)

Seznam v panelu Objekty (`engine.getObjectList`): stěny, otvory, kusy nábytku a schodiště, která vedou z aktivního podlaží
nebo do něj (řádek „S1 Schodiště 1.NP → 2.NP“). Klik na řádek schody vybere, křížek je smaže, přejmenovat je nejde.
- **Oko u řádku** objekt skryje v půdorysu: nekreslí se (`renderer.jeSkryty`, u schodů `jeObjektSkryty` v `dum.js`), nejde
  trefit ani vybrat, takže jde pracovat pod ním (místnost pod schody). Skrytý vybraný objekt se odznačí. Řádek skrytého je
  přeškrtnutý, klik na něj objekt zase ukáže a vybere.
- **Jen pracovní pomůcka:** `skryteObjekty` se neukládá, platí do znovunačtení stránky. Klíč je podlaží a id (`P1:W3`),
  schody patří domu (`dum:S1`). Export a sdílený odkaz kreslí i skryté (`_kresbaProExport`), 3D se neskrývá.

## Přepínače zobrazení

`resources/views/masterteam/partials/prepinace-zobrazeni.blade.php`, jedno nastavení na dvou místech: panel Objekty a sekce Export. Stěny (i oddělovače, jejich body a kóty), Otvory, Kóty, Značky (W38, O41), Body, Místnosti, Vybavení; řádek se zalamuje. Stěny a Otvory nahradily společné „Objekty". Kóty, Značky a Body jsou výchozí vypnuté (`kotyVzdy`, `znackyVzdy`, `bodyVzdy`, staré uložené klíče se záměrně nečtou, jinak by změna u nikoho, kdo editor otevřel, neplatila). Klik na stěnu ukáže její konce a konce stěn napojených na ni, klik mimo je skryje. Mřížka, vrstvy parcely, Terén a Mřížka terénu mají vlastní `prepinace-parcely.blade.php`: panel Parcela a samostatný odstavec v sekci Export. Schované se nedá vybrat: přepínač výběr zruší, nástroj Stěna a Otvor si svou vrstvu sám zapne, stejně tak klik na objekt v seznamu.

Klik v seznamu objektů = klik na plánku v nástroji Výběr (`_vyberObjektKlikem`), včetně Ctrl/Shift, přepnutí z kreslení na výběr a nevybírání v režimu střechy a posunu podkladu.

## Výkon

- Konva, renderer a engine jsou **mimo reaktivitu Alpine** (`__v_skip`). Proxy zpomaloval kreslení zhruba osmkrát. Šablona se o změně dozví přes `_selectionTick`, který zvyšuje `afterRender`. Getter čtoucí engine musí tick přečíst.
- Ostatní podlaží nemají na plátně žádné tvary, jen jeden obrázek spodního podlaží. Ten leží nad výplní místností a pod stěnami.
- Zoom ani posun plátna nepočítají rastr. Kolečko se slučuje po snímcích, nejvýš po 40 ms. Rastr místností se počítá jen po změně otisku geometrie (`engine.geoPodpis`) a až po usazení stěny: za tahu (`renderer.jeTah`) zůstává výplň místností, jak byla.

## Ovládání

Vše k podlažím je v pravém panelu „Podlaží a plochy". Klik na řádek přepne, tužka rozbalí úpravy právě toho řádku bez přepnutí, „+ Přidat podlaží" jen nabídne volby a podlaží vznikne až klepnutím na konkrétní z nich. Ve 3D řádek podlaží nebo střechu ukáže či skryje: zvýrazněné je vidět, bez zvýraznění není vidět nic. Střecha má tužku jako podlaží: nastavení je přímo v seznamu a funguje i ve 3D. Klik na řádek ji ve 2D ukáže v půdorysu, ve 3D ukáže nebo skryje. Bez střechy klik nabídne její vytvoření, hrany se přepínají klikem v půdorysu.

Změna domu v režimu 3D přestaví scénu hned (`_obnov3dPozdeji` z `afterRender`). Přidání podkroví založí střechu, pokud chybí. Stíny ve 3D jsou zatím vypnuté.

## Zatím neřešeno

- Sloup pod přesahem patra (na nižším podlaží) nemá vlastní stříšku ani průvlak, rozšiřuje jen střechu horního podlaží. „Přidat podpěru dolů" zkopíruje stěnu.
- Stíny ve 3D (Libor 2. 11. 2026: nebyly správně, udělat později pořádně).
- Plochá střecha bez přesahu. Vikýře, střešní okna a polovalba jako předvolba (polovalba jde nastavit po hranách jen částečně).
- Ve 3D jsou zvýšené plochy jako deska na podlaze, strop se nad nimi nezvedá.
- Běžné schody do patra se začátkem ve snížené místnosti začínají ve 3D v úrovni podlaží.
- Obrys plochy z rastru nezná díry (sloup uvnitř místnosti) a hrany nejsou dorovnané na líce stěn (přesnost 2 cm rastru).
- Tečkovaná čára u T-napojení ve 3D (stejné plochy dvou stěn), patří ke kroku barev.
- Ovládání dotykem: panely ano, tažení na plátně je zatím jen myší jako celý editor.
- Limit podlaží v tarifu.

## Světlo

Editor i sdílený odkaz používají `public/js/svetlo-3d.js` (Libor 4. 11. 2026 schválil pořádnou opravu místo levné, stíny tím skončily na seznamu odložených).

- **`material.color` zůstává hodnota ze vzorku**, tedy to, co si uživatel vybral. Na lineární barvu ji převádí až shader (úprava `ShaderLib` a `ShaderChunk`, funkce `tuVzorekNaLin`). Výběr barvy, sdílení ani testy o převodu nic nevědí. Totéž platí pro barvy vrcholů. Vlastní barvy v shaderu přes `tuVzorekNaLin`, viz terén.
- **Textura s barvou musí mít `encoding = sRGBEncoding`.** Reliéf a maska zůstávají lineární. glTF má barvy lineární, `Katalog3d.nacti` je převede.
- **Prostředí se nestahuje:** obloha, obzor a země jako `PMREMGenerator.fromScene`, plus slunce z jihozápadu. Výsledek na obrazovce proti vzorku: vodorovná plocha na slunci 1,02–1,12×, stěna na slunci 0,87–1,00×, odvrácená 0,73–0,76×. Hlídá `test-svetlo-3d-ui`. Změna konstant znamená znovu změřit.
- **Tónování je vlastní:** do 0,85 lineárně beze změny, výš měkce stlačuje, ať se bílá nepřepálí. ACES by byl hezčí, ale posouvá odstíny a barva by neseděla se vzorkem.
- **Matné nekovy skoro neodrážejí prostředí** (`tuOdraz`), jinak barva vybledne. Lesklé povrchy a kovy odráží plně, takže keramika a chrom fungují.
- **Stíny jen po změně:** `autoUpdate = false`, přepočet si vyžádá `Svetlo3d.prekresliStiny` po přestavbě, změně viditelnosti a dotažení modelu. Stín vrhá jen neprůhledný `MeshStandardMaterial` (`stinyObjektu`), mapa 4096, na dotykových zařízeních 2048.
- **Normály musí mířit ven i u oboustranných materiálů.** `DoubleSide` obrácenou normálu ve světle schová, stín se ale podle ní odsazuje: zajede do plochy a ta si stíní sama. Plocha na slunci pak zůstane skoro tak tmavá jako ve stínu a má šikmý vzor, proto boky desek svítily proti stěnám a na stinné straně rozdíl vidět nebyl (opraveno 4. 11. 2026: `_obrysVen` u stěn, `_troj3d` u střechy a štítů). Nová geometrie s oboustranným materiálem si tohle musí ohlídat, měření na skutečném domě je v `test-svetlo-3d-ui`, bod 6.
- **Stránka sdílení nesmí načítat nic z `/js/koncept-v3/`**, proto `svetlo-3d.js` a `katalog-3d.js` leží přímo v `public/js/`.
