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
  strecha: { typ, sklon, presah, presahStit, vyskaOkapu, krytina, otocHreben, hrany: { klíč: { typ, sklon } } } | null,
  nizsiStrechy: { 'P1|W5:-1': { typ?, sklon?, presah?, presahStit?, vyskaOkapu?, krytina?, barva?, otocHreben?, hrany? } }  // jen ruční úpravy
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
| `public/js/krytiny-3d.js` | vzhledy a materiály střešních krytin, společné s prohlížečem sdílení; test `test-strecha-3d-ui` |
| `public/js/povrchy-3d.js` | omítka fasády a nejnižší pohled kamery, společné s prohlížečem sdílení; test `test-fasada-3d-ui` |
| `public/js/prochazka-3d.js` | procházka okem panáčka, společná s prohlížečem sdílení; mixin editoru `koncept-v3/prochazka.js`, test `test-prochazka-ui` |
| `services/krytiny/sestav.py` | výroba textur krytin do `public/textury/krytiny/`, viz Krytiny a tloušťka ve 3D |
| `public/js/koncept-v3/mistnosti.js` | rastr místností, výřezy a plocha pod limitem výšky |
| `public/js/koncept-v3/koty-vyberu.js` | kóty u vybrané stěny a otvoru |
| `public/js/koncept-v3/koty-retezce.js` | kótovací řetězce kolem domu a rozměry místností; test `test-zobrazeni-objektu-ui` |
| `services/import-test/test-dum-ui.cjs` | test celého domu v prohlížeči (57 kontrol); `test-nizsi-strecha-ui` pro nižší střechy; `test-barvy-domu-ui`, `test-koty-vyberu-ui` a `test-magnet-patro-ui` a `test-schody-ui` pro barvy, kóty, magnet a schody; `test-dum-import-ui.cjs` ověřuje import skutečného výkresu na patro |

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

Stěny horního podlaží nikdy neprojdou střechou. Stěny na obrysu dosáhnou až pod ni, takže pod vyšším okapem nezůstane mezera. Plochá střecha leží na stropu.

**Strop pod šikmou střechou** (Libor 12. 11. 2026: místnost má mít strop, zespodu nemá být vidět krov): výchozí u nejvyššího podlaží, které není podkroví. Rovná deska ve světlé výšce, nejvýš v okapu (vzorový dům má okap 2,6 m pod světlou výškou 2,8 m, výš by deska u zdí trčela do střechy), tloušťka jako strop podlaží. S okapem pod 2,2 m (`STROP_POD_STRECHOU_MIN`) jde o podkrovní prostor a strop se nedělá. Obrys o 2 cm dovnitř: boky zůstanou ve zdech dotažených pod střechu a v líci se neperou s fasádou. Volba **Strop** v panelu střechy (jen hlavní šikmá, ne nad podkrovím) ho vypne pro otevřený krov, ukládá se jen `strecha.strop = false`. `userData.stropPod` jako ostatní stropy, skrývá se se střechou. Test `test-prochazka-ui` (část 5c).

Typ krytiny (`strecha.krytina`) platí pro celek, barva je zvlášť (`strecha.barva`, na hraně vlastní). Starší hodnoty jako `antracit` se čtou jako barva. Vzhled ve 3D viz další část.

### Nižší střechy (Libor 12. 11. 2026)

Patrový dům s přízemní garáží, krytým vstupem nebo jinou částí mimo obrys patra. Hlavní střecha zůstává nad horním podlažím, nad každou částí podlaží, nad kterou už patro není, přidá editor sám nižší střechu (jen když hlavní střecha existuje, smazání hlavní smaže i nižší). Starší projekty se nepřevádějí: v `dum.nizsiStrechy` jsou jen ruční úpravy, výchozí nižší střecha se dopočítá.

- **Část** (`_castiNizsich`): obrys podlaží (se sloupy v rohu výklenku) bez obrysu podlaží hned nad ním, v rastru po 2,5 cm. Otevření rastru vyhodí proužky užší než 50 cm (širší zeď dole než nahoře není garáž) a části pod 0,8 m². Obrys se dorovná na přímky (`Strecha.dorovnejObrys`): líce podlaží s klíčem stěny jako u hlavní střechy a obrys patra, hrana na něm je `zed`. Zakulacené rohy z otevření zmizí, roh je průsečík sousedů. Prázdné patro (bez obrysu) nic nezakrývá ani nevytvoří. Část kolem patra ze všech stran (prstenec) má patro jako díru: střecha se spočítá nad celým obrysem a ořízne jím (`orizniMimo`, `useckyMimo`).
- **Id části** = podlaží | klíč nejdelší hrany se stěnou (`P1|W5:-1`), nastavení tak drží i po úpravě kresby. Název v panelu podle místnosti v části („1.NP – Garáž“), jinak „1.NP – nižší část“.
- **Výchozí:** pultová od zdi patra 10°, přesah okapu 30 cm, štítu 10 cm, okap ve výšce stropu toho podlaží (konstrukční výška nad jeho podlahou). Typy hran (`Strecha.typyHranNizsi`): hrana u zdi patra je vždy štít bez přesahu, který se nekreslí. Pultová má okap tam, odkud paprsek dovnitř části narazí na zeď patra (garáž: hrana naproti zdi; část do L kolem rohu: obě vnější strany s nárožím; prstenec: všechny), ostatní hrany jsou štíty. Sedlová má hřeben kolmo ke zdi patra (⟳ souběžně), valbová okap všude kromě zdi. Část bez zdi patra bere běžné předvolby.
- **Volby typu** jen u nižší: Terasa (plochá pochozí z patra: dlažba 60 × 60 cm ve výšce podlahy patra, zábradlí 1 m na vnějších hranách v barvě oken zvenku, v procházce se po ní chodí) a Bez střechy (zůstane strop podlaží). Zábradlí a dlažba terasy zůstávají zatím takhle, později je mají převzít samostatné nástroje (zábradlí, povrch podlahy), ne střecha (Libor 12. 11. 2026). Nic dalšího k nim do střechy nepřidávat.
- **Krytina podle sklonu:** barva hlavní střechy; pod bezpečným sklonem krytiny hlavní střechy plech (falc) v její zobrazené barvě, nad ním stejná krytina a vzhled jako hlavní. Bezpečné sklony podle země v `SKLON_MIN_KRYTINY` (dum.js, zatím jen Česko podle výrobců: tašky 22°, bobrovka 30°, šindel 15°, břidlice 25°, falc 7°, trapéz 8°, vlnitý 10°; ostatní země stejně, patří do národní specifikace). Ručně zvolená krytina platí, „podle sklonu“ ji vrátí. Krytina pod svým bezpečným sklonem dostane v panelu varování, i u hlavní střechy.
- **Ovládání:** v panelu Střecha nahoře výběr „Hlavní / 1.NP – …“ (jen když nižší střechy jsou). V režimu střechy jsou v půdorysu všechny střechy, klepnutí na plochu vybere střechu, na hranu i hranu. Nižší střecha nemá tlačítko smazat, typ Bez střechy to nahrazuje. Úpravy jdou do `dum.nizsiStrechy[id]`, hrany stejně jako u hlavní.
- **3D** (`_strecha3d` společná s hlavní, `_terasa3d`): u zdi patra se nekreslí štít ani čelo (`_okrajStrechy` s `vynechat`), štíty nad stěnami podlaží ano, protože jeho stěny pod nižší střechu nesahají. Plochá nižší má atiku jen na vnějších hranách (`_pasyNizsi`). Sloup pod nižší střechou sahá pod ni. Meshe mají `strecha`, `strechaId` a `nizsi` (podlaží): skryjí se se střechou i se svým podlažím, ve sdíleném odkazu jdou do skupiny střechy.
- **Okno patra pod nižší střechou** střecha zakryje (stoupá po zdi patra, u garáže 4 m asi o 1 m nad podlahu patra), editor zatím neupozorňuje.
- Testy: `test-strecha.cjs` (geometrie), `test-nizsi-strecha-ui.cjs` (dům s garáží, panel, klepnutí, terasa, 3D, Zpět, uložení, prstenec).

### Krytiny a tloušťka ve 3D (Libor 11. 11. 2026)

Cíl je 3D blíž fotografii. **Střecha je deska:** rovina výpočtu je spodní líc krokví, krytina leží o `TLOUSTKA_STRECHY` (28 cm kolmo u základního sklonu) výš, svisle o `_tloustkaStrechy()`. Vrch je kopie roviny posunutá nahoru, hřebeny a nároží proto sedí samy a 2D, výpočty podkroví ani stěny pod střechou se nemění. Údaj „hřeben“ v panelu je vrch krytiny, tedy včetně tloušťky.

- **Okraj** (`_okrajStrechy`): hrana trojúhelníku, kterou nesdílí jiný a za kterou není střecha, dostane svislý pás čela nebo závětrného prkna. Vodorovná hrana ve spodní výšce plochy (okap) dostane i půlkulatý žlab. Hřebenáče (`_hrebenaceStrechy`) jsou na úsečkách kostry, od kterých plochy klesají na obě strany, tedy hřeben a nároží, ne úžlabí.
- **Barvy okraje nepřidávají čtvrtou barvu domu** (fasáda, střecha, okna; články o barvě fasády): čelo, závětrné prkno a žlaby jsou v barvě krytiny o `ODSTIN_PLECHU` tmavší, hřebenáče v barvě krytiny, podbití v barvě fasády a mění se s ní. Svody zatím nejsou.
- **Plochá střecha:** deska v barvě fasády, po obvodu atika 25 × 40 cm s oplechováním, uvnitř asfaltový pás ve zvolené barvě.

**Krytiny z fotografických textur** (Poly Haven a ambientCG, obojí CC0, bez povinnosti uvádět autora): barva, normálová mapa, drsnost a zastínění spár, 1024 px ve WebP, asi 0,4 MB na vzhled. Načítá se jen vzhled, který střecha má. Seznam `vzhledy.json` vkládá šablona editoru i sdílení do stránky (`window.KRYTINY_VZHLEDY`), verze v adrese textur je čas souboru.

- **Tašky, bobrovka, šindel a břidlice se nepřebarvují** (Libor: nabídka barev je ve skutečnosti omezená, vycházet z příkladů). Panel místo nástroje na barvu ukáže vzorky vzhledů včetně zvětralých a s mechem. Vzhled se ukládá jako jeho průměrná barva do `strecha.barva` (u hrany do `hrany[klíč].barva`), takže historie, 2D, sdílení i starší projekty fungují beze změny.
- **Bez přesné shody** (starší projekt, změna typu z plechu) se hledá nejbližší vzhled v Lab, jen mezi základními (`zakladni`, bez zvětrání). Změna typu krytiny barvu rovnou srovná na nalezený vzhled.
- **Plech** (falcovaný, trapézový, vlnitý) a asfaltový pás se prodávají v libovolném odstínu: textura nese jen jas a barvu volí uživatel nástrojem na barvu. Falc nemá zdroj, jeho reliéf kreslí `sestav.py`.
- **Textura:** souřadnice v metrech dělených `metru` vzhledu (velikost dlaždice, u Poly Haven z rozměrů zdroje, u ambientCG odpočítaná z tašek), u podél okapu, v po spádnici, nahoře hřeben. Materiál krytiny má bílou barvu, barvu dává textura (`Krytiny3d.material`). Stíny se přepočítají, až textury dorazí.
- **Nový vzhled:** řádek do `VZHLEDY` v `services/krytiny/sestav.py`, `python services/krytiny/sestav.py` (surové mapy stáhne do `services/krytiny/zdroje/`, mimo git), název do `lang/*/ed_dum.php`, skupina `vzhled_krytiny`. Zdrojová textura musí jít plynule navázat (roof_slates_03 má nahoře hřebenovou řadu a dělala švy). Průměrné barvy musí být různé, skript to hlídá.
- **Sdílený odkaz** dostane u materiálu krytiny jen `krytina` (id vzhledu), prohlížeč si materiál postaví přes `Krytiny3d` stejně jako editor.

### Fasáda a pohled ve 3D (Libor 11. 11. 2026)

Další krok k 3D blíž fotografii (`public/js/povrchy-3d.js`, editor i sdílený odkaz).

- **Omítka:** všechno v barvě fasády (stěny, štíty, boky desek, sloupy, podbití, atika) dostane jemnou zrnitou omítku jako dnešní rodinný dům (Poly Haven white_stucco, CC0). Stěny nemají souřadnice textury, kresba se promítá podle polohy ve světě, u svislé plochy podél ní, proto sedí i v natočeném domě. Zrno má skutečnou velikost (dlaždice 2 m): zblízka je vidět, zdálky splyne. K tomu nenápadné skvrny tónu přes několik metrů (2 %). Průměr kresby je 1, barva ze vzorku platí dál. Textura `public/textury/omitka/` z `services/krytiny/sestav.py --jen-omitka`. Dokud nedorazí, síla omítky je 0 (nenačtená textura by stěnu zčernala).
- **Sklo zůstává světle modré poloprůhledné** (barva typu otvoru, `koncept-k-ui.js`). Odlesk okolí ve skle (tmavé dvojsklo s odrazem terénu a oblohy zachycených z domu podle úhlu pohledu) byl hotový v ff2bfde, Libor ho 11. 11. 2026 zamítl („nelíbí se mi, nech to jak bylo“). Bez výslovné výzvy nevracet.
- **Nejnižší pohled:** ortografická kamera nemá polohu oka, každý pohled zespodu jde pod terén. Mez je proto skoro vodorovně, jen tak vysoko, aby šikmý pohled dopadl na terén dřív než na základy a sklep: `atan(hloubka pod podlahou 1.NP / vzdálenost k okraji terénu)`, nikdy výš než dřívějších 85,7°. Bez sklepu typicky 89,5°, se sklepem 88°. Sdílený odkaz má stejnou mez (dřív žádnou). Skutečný pohled zespodu (podbití, okna proti obloze) by potřeboval perspektivní kameru.
- **Testy:** omítka mění rozptyl jasu stěny, měření šikmého vzoru stínu v `test-svetlo-3d-ui` ji vypíná (`Povrchy3d.silaOmitky(0)`).

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
- **Nábytek podle skupiny** nabízí katalog (`modules/katalog.md`, Pravidla). Plochy, upozornění a barvu podle druhu Libor 12. 11. 2026 zamítl jako nadbytečné.
- Test: `node services/import-test/test-druh-mistnosti.cjs`.

## Barvy domu a podlahy místností

`dum.barvy` = `fasada`, `oknoVen/oknoDovnitr`, `dvereVen/dvereDovnitr`, `dvereVnitrni`, `vrataVen/vrataDovnitr`. Platí pro celý dům, nastavují se u kteréhokoli podlaží (tužka, „Barva domu") a u kteréhokoli otvoru. Francouzské okno patří k oknům, průchod barvu nemá. Jen otvor v obvodové stěně má dvě barvy, vnitřní dveře mají jednu vlastní (`barvaVnitrniho`), vnitřní okno a vrata sdílejí stranu „uvnitř".

Ve 3D nese materiál klíč v `userData.barva` a barvu dosadí `_nastavBarvy3d` (na konci `_build3d`, s přepisem i za tahu). Rám a plná výplň otvoru jsou dvě půlky tloušťky; stranu ven určí `_stranaVen` z rastru.

**Klika** (Libor 12. 11. 2026, zatím stříbrná bez volby): plné dveře (`dvere`) s panty mají na obou stranách křídla štítek, krček a páku (`_klika3d`, `userData.klika`), 6,5 cm od volné hrany ve výšce 1,05 m, páka míří k pantům (`kridloPanty`: `levy` = panty na začátku křídla od uzlu A). Posuvné dveře, vrata a průchod kliku nemají.

Stěny (`_hranolStrany`, `_hranolPodStrechou`): co hledí do exteriéru, je fasáda, všechno ostatní bílé, i vnitřní líc obvodové stěny (Libor 3. 11. 2026, volba vnitřní barvy může přibýt). Rozhoduje rastr pro každých 25 cm boku, takže stěna může být fasádou jen po části délky. Díl stěny se krájí po půlkách tloušťky: půlka u exteriéru má v barvě fasády i ostění, parapet a korunu. Plot a zídka mají barvu svého typu.

**Napojení a ostění** (Libor 12. 11. 2026, Klemov kopie ze severu: bílý pruh u přístavku a bílé ostění okna): úsek boku se posuzuje na krajích i uprostřed, a když se neshodnou, po 2 cm (`_useckyStrany`), jinak bod uprostřed padl do navazující zdi a celý úsek dostal její barvu. Kde je za plochou zeď (ostění, čelo, napojení), rozhodne nejbližší okolí podél plochy do 10 cm a pak líc půlky v tom místě, ne střed celého dílu: díl za oknem sahal až k místnosti přístavku a ostění vyšlo bílé. Test `test-lice-3d-ui.cjs`.

**Lem desky** (`_lemDesky`, téhož dne): líce zdí sousedních podlaží se v datech liší o milimetry (Klemov: podkroví 2–7 mm uvnitř přízemí) a vršek desky vykukoval jako tenká tmavá čára, stíněný jako vodorovná plocha. Každá deska z `pridejDesku` má po obvodu 3 cm pás přímo na vrchu i spodku s vodorovnou normálou ven a materiálem fasády (posun hloubky mu dá přednost před deskou). Taková římsa se pak svítí jako zeď nad ní; kde lem leží pod zdí nebo v desce, není vidět. Deska s výřezem pro okno pod úrovní lem nemá. Sdílený odkaz normály nepřenáší, lem do něj proto nejde (`_zapecModel`) a odkaz zůstává jako dřív.

**Směr vzoru podlahy (Libor 11. 11. 2026):** dekor vede souběžně se stěnami kolem místnosti (`_smerDekoru`, nejdelší směr stěn po 90°, bez stěn osa domu), prkna po delší straně místnosti. Tlačítko „↻ 90°“ vedle dekoru v panelu místnosti otočí vzor napříč (`podlaha.otoceni = 90`, nula se neukládá). Dřív šly souřadnice textury podle os plátna: v natočeném domě šikmo a prkna často napříč. Test `test-barvy-domu-ui.cjs`, část 5.

Podlahu kreslí jen `_podlahyMistnosti` (všechny místnosti, bez vlastního dekoru společná hladká). **Pod dveřmi, průchody a okny až k podlaze** (otvory s předponou D a otvory s nejnižším parapetem do 2 cm, ve vzorovém domě O46–O48) jde podlaha přes celou tloušťku zdi: buňky v obdélníku otvoru dorůstají ze sousedních místností, dokud se nepotkají, u vchodu jde podlaha místnosti až k vnějšímu líci. Dřív jen dva pásy buněk od líců a v otvoru zuby (Libor 12. 11. 2026, test `test-prochazka-ui` část 5c). Desky mají boky i vrch ve fasádě, spodek je strop v barvě vnitřních stěn (`BARVA_STROPU`, bílá jako `matVnitrni`; dřív šedobéžová, Libor 12. 11. 2026: strop má opisovat barvu zdí, až půjdou stěny místnosti barvit, převezme jejich barvu). **Proč:** obrys desky se počítá z rastru a může o milimetry přesáhnout líc zdi; bílý vrch desky pak dělal bílý lem všude, kde se patro nekrylo přesně se zdí pod ním. Nad terasou je proto zatím fasáda, barva terasy není řešená.

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

**Zabíhající a točité schody** (Libor 11. 11. 2026, nejdřív v kalkulačce, týž den přeneseno do editoru): tvary `Lz`, `Uz` (`zatacka` osa = stupně se sbíhají do osy zatáčky, výchozí; rozlozene = zúžení rozložené do ramen) a `tocite` (`prumer`, výchozí 2 m, sloupek 12 cm). Geometrii počítá společný kód s veřejnou kalkulačkou `KalkulackaSchodiste.proEditor` (`public/js/kalkulacka-schodiste.js`, editor ho načítá před dum.js), `schodyGeo` ho jen natočí a zrcadlí stranou. Zatáčka, která se do tolika stupňů nevejde, se postaví jako L nebo U s odpočívadlem a panel upozorní (`nelze`). Točité schody mají ve 3D sloupek, z půdorysu spodního podlaží jsou stupně nad první otáčkou čárkovaně a panel místo otvoru hlídá podchodnou výšku pod otáčkou. Otvor ve stropu u zabíhajících jde zkrátit jen o kolmé stupně na začátku (`otvorMax`). Panel schodiště (Libor 11. 11. 2026: „děsně nahečmané“): označení S1, tvar seznamem, nápisy ve sloupci, pole jen pro zvolený tvar, souhrn a upozornění pod nimi. Kalkulačka vede výstupní čáru 0,4 m od vnějšího okraje (do šířky 1,2 m; širší třetina šířky), kde vyhláška měří nášlap ramene do 1,1 m. U širších hlídá 180 mm 0,3 m od vnitřního okraje. Zúžení na vnitřní hraně rozloží rovnoměrně na tolik stupňů kolem zatáčky, aby vyšlo aspoň 150 mm.

**Nášlap podle vyhlášky** (Libor 11. 11. 2026): vyhláška 146/2024 Sb., příloha 4 bod 2 žádá nášlap hlavního schodiště aspoň 300 mm, v rodinném domě 275 mm. `schodyGeo` bez ruční výšky stupně a nášlapu přidá výšku, když by nášlap vyšel užší (3,05 m: 18 × 169 mm místo 17 × 179 mm s nášlapem 271 mm). Pravidlo podle země projektu (`NASLAP_MIN_ZEME`, zatím jen CZ, `TT_LOKALIZACE.zeme`). Ruční výška stupně nebo nášlap ho smí porušit, panel pak varuje (`naslapOk`). Kalkulačka v článku počítá stejně. Existující projekty se 3,05 m mají po změně o stupeň víc.

**Otvor ve stropu nad schody** se v horním podlaží vyřízne sám (`_maskyPodlazi` → deska i rastr místností). Volba „Otvor ve stropu od stupně“ (`s.otvorOd` = počet prvních stupňů prvního ramene pod stropem, 0 = celé schody) ho zkrátí, `schodyGeo` vrací `otvor`. Panel ukazuje podchodnou výšku u okraje otvoru (výška mezi podlažími − strop spodního podlaží − výška hrany prvního stupně pod okrajem) a pod 2,1 m varuje. V půdorysu patra jsou stupně pod stropem čárkovaně a okraj zkráceného otvoru plnou čarou. U točitých hlídá podchodnou výšku pod otáčkou (sloupek 120 mm, stupeň 50 mm). Tvar U se dvěma odpočívadly v kalkulačce odpovídá editorovému U s prostřední částí větší než 0.

Půdorys: ze spodního podlaží stupně, šipka a „↑ počet × výška/nášlap"; z horního přerušovaný obrys otvoru, stupně tmavší s hloubkou a „↓ dolů". Šrafování zmizelo, Libor ho měl za matoucí; bílá výplň obrysu také (3. 11. 2026), výplň místnosti pod schody zůstává vidět, podklad štítku je jen při pohledu shora na tmavé stupně. 3D: nášlap plná barva, podstupnice a boky 0,7× téže barvy.

Magnet: při založení (`_magnetSmeru`) i otáčení (kolečko ↻ u vybraných schodů, společný `_magnetOtoceni` s čárou podél nejbližší stěny) na směry stěn aktivního a spodního podlaží, i vzdálených, na osy domu a na vodorovnou a svislou obrazovky (`_magnetSmeru`). Při tažení hrana schodů na rovnoběžný líc stěny (`_magnetSchodu`). Alt vypíná.

## Sloup (Libor 11. 11. 2026)

Nástroj Sloup (klávesa 9) postaví sloup 20 × 20 cm na aktivní podlaží. Označení **C1, C2…** podle anglického Column: označení objektů se bere přednostně z angličtiny (Libor 11. 11. 2026, schody S = Stairs). Panel: hranatý nebo kulatý, strana nebo průměr 10–100 cm, barva (bez vlastní barvy fasáda), Střecha přes sloup, smazat. V seznamu objektů jako schody: šedé označení, oko, nepřejmenovává se. Klíč skrytí `dum:C1`.
- **Roh výklenku** (`_rohyVyklenku`): průsečík přímek dvou hran obrysu, mezi kterými obrys uhýbá dovnitř (1–2 hrany mezi nimi, zhruba kolmé). Při zakládání i tažení se sloup do rohu přichytí a lícuje s oběma hranami (dosah 0,4 m + polovina sloupu, podle síly magnetu, Alt vypíná). Změna rozměru v rohu drží lícování. Mimo roh si sloup při tahu drží své natočení.
- **Otáčení:** vybraný hranatý sloup má kolečko ↻ za rohem, tahem se otáčí kolem středu. Magnet je společný s nábytkem a schody (`_magnetOtoceni`, 5°, Libor 11. 11. 2026): přednost má nejbližší stěna a čára magnetu vede podél ní, osy domu a obrazovky platí, jen když žádná stěna nesedí. Nový sloup se natočí podle nejbližší stěny jako kus nábytku (`_uhelNejblizsiZdi`), Alt vypíná.
- **Střecha přes sloup:** sloup v rohu výklenku na horním podlaží vyplní výklenek v obrysu střechy (`_obrysSeSloupy`), okap jde rovně až přes sloup. Vynechané hrany přestanou být hranami střechy, krajní se prodlouží a nesou své nastavení dál. Sloup jinde střechu nemění, panel to řekne. Jde vypnout (`strecha: false`).
- **Podhled nad výklenkem:** ve 3D má výklenek pod střechou přes sloup podhled ve výšce okapu, tedy tam, kde se zbytek střechy potká se zdí. Nad otevřenými stranami výklenku (od rohu domu ke sloupu) vede svislý pás od podhledu až pod střechu, jinak by pod střechou zela mezera (Libor 11. 11. 2026). Data `vyklenky` z `_strechaVypocet`, ověřuje `test-sloup-ui.cjs`.
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

## Procházka (Libor 12. 11. 2026)

Pohled okem panáčka, oddělený od 3D, aby se nemíchal s ortografickým pohledem svázaným s 2D. Třetí díl přepínače v liště
(2D | 3D | ikona panáčka, název Procházka, v ostatních jazycích Walk, Rundgang, Prechádzka, Spacer, Visite, Recorrido,
Passeggiata). Ve všech tarifech. Měří se jako funkce `prochazka` (`App\Support\Mereni`).

- **Soubory:** `public/js/prochazka-3d.js` je společný s odkazem (ovládání, gravitace, mapka, obloha, kroužek cíle, tlačítka na
  dotyk, postava pro 3D), `public/js/koncept-v3/prochazka.js` je mixin editoru (panáček ve 2D a 3D, zapnutí, výchozí místo,
  uložení). Háčky jinde: smyčka a velikost 3D a konec `_build3d` (`koncept-k-ui.js`), řádek podlaží jako výtah a skrytí terénu
  (`dum.js`), kamera pro výběr kusu (`katalog.js`), snímek a model odkazu (`export-sdileni.js`). Test `test-prochazka-ui.cjs`.
- **Kamera:** perspektivní (60° svisle) ve stejné scéně jako 3D, OrbitControls jsou mezitím vypnuté. Kompas, přiblížení ani
  pohled 3D se nemění; Esc vrátí tam, odkud procházka začala, tlačítka 2D a 3D ji ukončí taky. Kompas se v procházce skryje,
  orientaci dává mapka.
- **Ovládání:** W A S D a šipky nahoru a dolů chůze, šipky vlevo a vpravo otočení na místě (A a D úkrok), Q a E nebo Page Down
  a Page Up výška oka, Shift rychleji, tah myší rozhlížení (svět jde za kurzorem jako ve Street View a ve 3D), kolečko krok,
  dvojklik dojde na místo. Kroužek pod myší ukazuje kam: malý, vidět i přes zeď, paprsek projde zdmi, nábytkem i střechou
  na první podlahu nebo terén pod okem (strop nad okem přeskočí); v cíli panáček stojí ve výšce kroužku, třeba na zemi pod
  oknem patra (Libor 12. 11. 2026). Klávesy podle polohy (`e.code`), na francouzské
  AZERTY jsou to Z Q S D a A, popisky má francouzský slovník. Na dotyk: tah rozhlížení, ťuknutí dojde, dva prsty krok,
  tlačítka vlevo dole (jen při `pointer: coarse`).
- **Chůze:** panáček stojí na nejvyšší vodorovné ploše pod `nohy + KROK` (0,5 m): podlaha, schod, terén. Výš nevyjde, níž spadne.
  Paprsek dolů jde jen na viditelné meshe domu bez nábytku z katalogu, sestav a střechy; terén se bere z výšek
  (`_terrainHeightAt`, bez výšek rovina 0), proto se na skrytém terénu stát dá. Zdi i nábytek jsou průchozí (Libor).
  Na jiné podlaží: po schodech, klikem na řádek podlaží v panelu (výtah na stejné místo, mimo obrys doprostřed podlaží,
  skryté se ukáže) nebo šipkami v záhlaví mapky.
- **Nezahrabe se** (`kamStoupne`, Libor 12. 11. 2026 ve vzorovém domě skončil 3,35 m pod podlahou a 2,2 m pod terénem): kdo
  nestojí na ploše domu, pod terénem vystoupí na terén, a je-li nad ním do `VSTUP` (2,2 m) podlaha domu (vchod z nižšího
  terénu na svahu), stoupne si na ni. Výš ne, ať pod přesahem patra (krytý vstup) nevyskočí nahoru. Když se dům ve scéně
  posune svisle (dotažené výšky terénu po startu procházky, posun výšky), panáček jde s ním (`_prochazkaY0`, `posunVysku`).
- **Oko:** výchozí 1,6 m nad tím, na čem panáček stojí, rozsah −30 až 60 m (pole Oko v panelu platí ihned, tlačítko vedle
  vrátí výchozí výšku a jinak je zašedlé). Při klesání se oko
  zastaví 10 cm nad zemí, pod zem až dalším stiskem. **Pod terénem** (oko pod nulou a pod terénem v tom místě) se terén,
  mřížka a výkop po dobu procházky skryjí a nad zemí se vrátí (Libor 12. 11. 2026); přepínač Terén se nemění
  (`prochazkaPodZemi` v `_jama3d`). Ve sklepě oko nad podlahou terén neskrývá.
- **Mapka** v panelu vpravo nahoře: stěny, otvory a schody podlaží, na kterém panáček stojí (podle výšky podlahy), natočené
  jako půdorys podle kompasu, tečka s výsečí pohledu. Klik do mapky panáčka přenese na stejné podlaží.
- **Lampa** (Libor 12. 11. 2026: v koupelně nešlo poznat roh, všechny stěny stejné): uvnitř domu stěny osvětluje jen rozptýlené
  světlo okolí, které je pro všechny svislé plochy stejné. Pod stropem nebo střechou (paprsek z oka nahoru) proto svítí slabé
  světlo od oka přes pravé rameno (`LAMPA_SILA` 0,3, bez stínu), venku plynule zhasne. Stěny dostanou jas podle natočení:
  roh při pohledu do něj 210 proti 232 z 255. Zůstává ve scéně s nulovou silou, ať se materiály nepřekládají. Ve 3D ne,
  tam stěny odliší slunce se stíny a kalibrovaný vzhled zvenku zůstává.
- **Obloha:** koule kolem oka, nahoře modrá, pod obzorem barva země (pod zemí neutrální). Jen v procházce, do modelu odkazu
  nejde.
- **Panáček** (`panacek` = `{x, z, podlazi, dy, smer, sklon, oko}`, metry scény, `dy` = nohy nad podlahou podlaží) se ukládá do
  metadat katastru vedle kompasu, ne do kresby: není to úprava, nečerpá limit ani nedělá krok Zpět. Ukládá se po zastavení
  (1,5 s) a při konci. **Napoprvé** stojí 8 m před vchodem a dívá se na něj: dveře, pak průchod, pak francouzské okno
  v obvodové stěně 1.NP (`_stranaVen`); bez nich před domem dole na obrazovce, čelem k domu.
- **Ve 2D** (vrstva `panacekLayer`, stálá velikost přes `afterZoom`): tělo shora s výsečí, tah ho přesune na aktivní podlaží,
  kroužek na konci výseče ho otočí, dvojklik spustí procházku; jen s nástrojem Výběr, na jiném podlaží zesvětlený. Na výkres
  nejde (export ho skryje s pomocnými vrstvami). Panáčka jde i přetáhnout z tlačítka do půdorysu (jako ve Street View), po
  puštění procházka začne tam. **Ve 3D** stojí postava 1,75 m v barvě značky (měřítko), v procházce a v exportu ne. Přepínač
  Panáček je v panelu Objekty (`kv3_prochazka` v localStorage), v sekci Export chybí.
- **Export obrázku** v procházce bere pohled oka, bez kroužku a postavy.

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

- Sloup pod přesahem patra (na nižším podlaží) průvlak nedostane (staticky zajištěno), „Přidat podpěru dolů" zkopíruje stěnu. Sloup v rohu výklenku části bez patra rozšíří nižší střechu (viz Nižší střechy).
- Nižší střecha: podlaží, které přesahuje přes nižší střechu jiného podlaží (tři a více podlaží se střídavými přesahy), se neřeší, počítá se jen s podlažím hned nad. Samostatná budova na podlaží (druhá komponenta rastru) střechu nemá, stejně jako u hlavní.
- Stíny ve 3D (Libor 2. 11. 2026: nebyly správně, udělat později pořádně).
- Plochá střecha bez přesahu. Vikýře, střešní okna a polovalba jako předvolba (polovalba jde nastavit po hranách jen částečně).
- Ve 3D jsou zvýšené plochy jako deska na podlaze, strop se nad nimi nezvedá.
- Běžné schody do patra se začátkem ve snížené místnosti začínají ve 3D v úrovni podlaží.
- Obrys plochy z rastru nezná díry (sloup uvnitř místnosti) a hrany nejsou dorovnané na líce stěn (přesnost 2 cm rastru).
- Tečkovaná čára u T-napojení ve 3D (stejné plochy dvou stěn), patří ke kroku barev.
- Ovládání dotykem: panely ano, tažení na plátně je zatím jen myší jako celý editor.
- Limit podlaží v tarifu.
- ~~Pohled okem~~ hotový 12. 11. 2026 jako Procházka, viz výše. 3D zůstává ortografické.
- Procházka: zdi nezastaví (záměrně), po střeše se nechodí, zorný úhel je pevný.

## Světlo

Editor i sdílený odkaz používají `public/js/svetlo-3d.js` (Libor 4. 11. 2026 schválil pořádnou opravu místo levné, stíny tím skončily na seznamu odložených).

- **`material.color` zůstává hodnota ze vzorku**, tedy to, co si uživatel vybral. Na lineární barvu ji převádí až shader (úprava `ShaderLib` a `ShaderChunk`, funkce `tuVzorekNaLin`). Výběr barvy, sdílení ani testy o převodu nic nevědí. Totéž platí pro barvy vrcholů. Vlastní barvy v shaderu přes `tuVzorekNaLin`, viz terén.
- **Textura s barvou musí mít `encoding = sRGBEncoding`.** Reliéf a maska zůstávají lineární. glTF má barvy lineární, `Katalog3d.nacti` je převede.
- **Prostředí se nestahuje:** obloha, obzor a země jako `PMREMGenerator.fromScene`, plus slunce z jihozápadu. Výsledek na obrazovce proti vzorku: vodorovná plocha na slunci 1,02–1,12×, stěna na slunci 0,87–1,00×, odvrácená 0,73–0,76×. Hlídá `test-svetlo-3d-ui`. Změna konstant znamená znovu změřit.
- **Tónování je vlastní:** do 0,85 lineárně beze změny, výš měkce stlačuje, ať se bílá nepřepálí. ACES by byl hezčí, ale posouvá odstíny a barva by neseděla se vzorkem.
- **Matné nekovy skoro neodrážejí prostředí** (`tuOdraz`), jinak barva vybledne. Lesklé povrchy a kovy odráží plně, takže keramika a chrom fungují.
- **Vyhlazení hran** (Libor 12. 11. 2026, zuby na sprchovém koutu a dveřích): `Svetlo3d.kresli` vykreslí scénu do obrazu
  v paměti (kódování sRGB, r128 do něj tónuje i kóduje jako na obrazovku) a jedním průchodem FXAA na obrazovku. Málo
  kontrastní místa (textury) zůstanou beze změny. Vyhlazení přímo v grafice (`antialias`) zůstává vypnuté, dusilo slabou
  grafiku. Kreslí tak smyčka editoru, export obrázku i sdílený odkaz; testy, které čtou pixely po přímém `renderer.render`,
  jdou bez vyhlazení.
- **Stíny jen po změně:** `autoUpdate = false`, přepočet si vyžádá `Svetlo3d.prekresliStiny` po přestavbě, změně viditelnosti a dotažení modelu. Stín vrhá jen neprůhledný `MeshStandardMaterial` (`stinyObjektu`), mapa 4096, na dotykových zařízeních 2048.
- **Normály musí mířit ven i u oboustranných materiálů.** `DoubleSide` obrácenou normálu ve světle schová, stín se ale podle ní odsazuje: zajede do plochy a ta si stíní sama. Plocha na slunci pak zůstane skoro tak tmavá jako ve stínu a má šikmý vzor, proto boky desek svítily proti stěnám a na stinné straně rozdíl vidět nebyl (opraveno 4. 11. 2026: `_obrysVen` u stěn, `_troj3d` u střechy a štítů). Nová geometrie s oboustranným materiálem si tohle musí ohlídat, měření na skutečném domě je v `test-svetlo-3d-ui`, bod 6.
- **Stránka sdílení nesmí načítat nic z `/js/koncept-v3/`**, proto `svetlo-3d.js` a `katalog-3d.js` leží přímo v `public/js/`.
