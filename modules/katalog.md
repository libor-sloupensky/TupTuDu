# Katalog nábytku a vybavení (Koncept V3)

Kusy z volně licencovaných zdrojů, které si uživatel vloží do půdorysu a vidí ve 3D. Rozhodnuto s Liborem 4. 11. 2026 po analýze zdrojů: https://claude.ai/artifact/GvRQ3DRpdaxuxwBmMGnbsQ

## Vrstvy podle druhu objektu

| Vrstva | Zdroj | Stav |
|---|---|---|
| Volný nábytek a dekorace | Amazon Berkeley Objects (ABO), Poly Haven | první balík hotový |
| Podlahy, dlažba, obklady, látky | ambientCG, Poly Haven (CC0) | další krok |
| Umyvadlo, WC, vana, pračka, radiátor | Sweet Home 3D (sady Blend Swap CC0 a CC BY, Scopia CC BY) s naší keramikou a chromem | 22 kusů lokálně 11. 11. 2026, viz Koupelna ze Sweet Home 3D |
| Sprchový kout, kuchyňská linka, vestavěné skříně | vlastní generátor (konfigurátor) | v plánu, viz Plán 2 |
| Zahrada, obrazy z muzeí | EZ-Tree, Poly Haven, Met | později |
| Co jinde není, „nafoť svůj gauč" | AI generátor, test až nad hotovým základem | později |

**Vyřazeno (Libor 4. 11. 2026):** zakázky od grafiků (cenově neodpovídá našemu systému), podklady od výrobců (zatím ne, složité).
**Obchody s modely licenčně nejdou:** TurboSquid zakazuje zpřístupnění koncovým uživatelům. Fab v čl. 6.iii EULA zakazuje modelovací nástroje s exportem děl. CGTrader dovoluje knihovnu v nástroji jen bez možnosti model vytáhnout, prohlížeč ho přitom dostane.
**Americký styl ABO (nápad Libora):** časem řešit oblíbenými kusy podle regionu, nejpoužívanější se budou nabízet přednostně. Zatím se nedělá.

## Soubory

| Soubor | Co v něm je |
|---|---|
| `public/js/koncept-v3/katalog.js` | panel, vložení, přichycení ke zdi, panel kusu, modely podlaží do 3D |
| `public/js/katalog-3d.js` | načtení modelu a vložení kopie do scény, společné s prohlížečem sdílení |
| `public/js/svetlo-3d.js` | světlo, odrazy, stíny, převod barev (`modules/dum.md`, část Světlo) |
| `public/katalog/katalog.json` | hotový katalog: kategorie, zdroje s licencí, kusy s rozměry |
| `public/katalog/modely/`, `nahledy/`, `pudorys/` | model pro web, náhled do panelu, značka do půdorysu: lokální výroba mimo git, web bere kopie z S3 |
| `config/katalog.php` | adresa úložiště souborů |
| `services/katalog/polozky.json` | zadání: co v katalogu je, český název, kategorie, výška nad podlahou |
| `services/katalog/sestav.cjs` | výroba, viz níž |
| `services/katalog/s3.cjs` | založení a ověření bucketu, nahrání souborů do S3 (`nahraj --jen=^sh3d-` jen vybrané kusy) |
| `services/katalog/prevod.html`, `services/katalog/three/` | převod OBJ + MTL ze Sweet Home 3D na GLB (three.js r128: OBJLoader, MTLLoader, GLTFExporter), jen pro výrobu |
| `resources/views/pravni/autori-modelu.blade.php` | stránka `/model-credits` s autory a licencemi |
| `services/import-test/test-katalog-ui.cjs` | test celé cesty v prohlížeči |

## Přidání kusu

Hromadně: `node services/katalog/rozsir.cjs` doplní kusy z ABO podle pravidel (české názvy z typu, barvy a materiálu, cílové počty `CILE`), ručně vybrané zůstanou první. Nové kusy mají `auto: true` a další běh je celé přepíše.

Postup hromadné dávky:
1. `rozsir.cjs`, potom `sestav.cjs`. Stránka náhledů se po 20 kusech obnoví (`Katalog3d` si modely drží) a `katalog.json` se zapisuje průběžně, po pádu stačí spustit znovu.
2. `node services/katalog/kontrola.cjs --archy --barvy`: měření, nálezy a archy náhledů. Barvu z dat ověří proti obrázku. Co obrázek nepodpoří, zmizí, nová barva se doplní jen při jasné převaze. Pod světlem hněď, šeď a béžovou spolehlivě odhadnout nejde, proto je chybné slovo horší než žádné.
3. Archy prohlédnout očima. Typ výrobku v datech ABO často nesedí. Opravit `nazev` a `kategorie` v `polozky.json`, špatné kusy přidat do `VYRAZENE` v `rozsir.cjs` a smazat ze zadání.
4. U prohlédnutých smazat `auto`, tím jsou pro další běh `rozsir.cjs` chráněné. Znovu `sestav.cjs`, který přepíše `katalog.json`.

Jednotlivě:

1. Doplnit řádek do `services/katalog/polozky.json`: `id` (`abo-…`, `ph-…`), `zdroj`, `orig` (ID ve zdroji), `nazev`, `kategorie`, případně `uroven` (výška nad podlahou v metrech, u obrazů a stolních lamp).
2. `node services/katalog/sestav.cjs` stáhne jen chybějící, zmenší na textury 512 px a WebP, geometrii nezjednodušuje a komprimuje meshoptem, změří, udělá náhled a značku. `--jen=regex` omezí výběr, `--znovu` udělá znovu.
3. Názvy značek do katalogu nepsat (Rivet, Stone & Beam…), jen obecný popis. Licence ABO kryje model, ne ochranné známky.

Nový zdroj vyžaduje doplnit `ZDROJE` v `sestav.cjs` včetně autora a licence. Stránka autorů se z toho sestaví sama. Licence **CC BY** dovoluje splnit uvedení autora odkazem na stránku s údaji (čl. 3(a)(2)), proto stačí odkaz v panelu katalogu a na sdílené stránce, na každém kusu být nemusí.

## Záznam kusu

Kus je obyčejný `engine.vybaveni` s polem `katalog` (ID), `nazev` a `uroven` (výška nad podlahou). Uložení, Zpět, výběr, otáčení a mazání tak jdou stejnou cestou jako u vybavení z importu.

- `stred` a `polygon` v metrech, y nahoru. `uhel` ve stupních v půdorysu, kde y míří dolů.
- Při `uhel = 0` míří předek dolů v půdorysu a k +z ve 3D, záda jsou nahoře. Takhle jsou orientované modely ABO i značka.
- Ve 3D je rotace `-uhel` a z je `-stred[1]`.

## Pravidla

- **Zarážka o zdi (Libor 4. 11. 2026):** nábytek se ke zdi nepřichytává a sám neotáčí, jen nesmí do zdi zasahovat žádnou částí. Počítá se srážka celého obdélníku se všemi zdmi (SAT, nejkratší vytlačení), kus tak po zdi klouže. Když střed přejde přes osu zdi, přeskočí do vedlejší místnosti, jinak by nešel přesunout. Platí i po otočení a změně rozměru. Alt zarážku vypne.
- **Natočení podle zdi (Libor 11. 11. 2026):** nový kus se vloží rovnoběžně s nejbližší zdí (`_katalogUhelZdi`, z poloh po 90° ta nejbližší nule), v natočeném domě tak nestojí nakřivo. Tlačítko „otočit o 90°“ kus otočí a srovná se zdí. Dřív se vkládalo s úhlem 0 a ve vzorovém domě (natočeném o 28°) to vypadalo, že magnet nefunguje.
- **Magnet otáčení (Libor 4. 11. 2026, sjednocený 11. 11. 2026):** při otáčení za madlo kus zaskočí, když je do 5° rovnoběžný nebo kolmý k některé zdi podlaží (`katalogMagnetRotace` přes společný `_magnetOtoceni` v `dum.js`, stejný jako sloup a schody). Ze stěn, které sedí stejně, vyhraje nejbližší ke kusu, čára proto v pravoúhlém domě při otáčení nepřeskakuje mezi vodorovnou a svislou, čára skrz střed ukáže podél které. Sílu bere z nastavení magnetu, Alt ho vypne.
- **Obrazy a zrcadla** patří na zeď, jen ty se do 35 cm přichytí a otočí zády k ní (`NA_ZED`), Libor potvrdil.
- **Tažení** drží volný střed zvlášť od zastaveného, jinak by se kus o zeď zasekl.
- **Vložení dvěma způsoby:** přetažením karty do půdorysu i klikem a klepnutím. Prstem je svislý pohyb posouvání seznamu, tažení začne vodorovným pohybem.
- **Rozměry:** v cm i v % původní velikosti (`zaklad`), druhá hodnota se dopočítá. Spojený řetízek mění šířku, hloubku i výšku ve stejném poměru, rozpojený jen zadaný rozměr. Model se roztáhne (`Katalog3d.vloz`), značka také.
- **Klik** má přesný tvar kusu, ne obdélník kolem něj. Menší kusy jsou navrchu, stůl jde chytit i na koberci.
- **Značka v půdorysu** je pohled shora v barvě objektu s tmavou čárou na hranách, ve WebP.
- **Nábytek podle skupiny místností (Libor 11. 11. 2026):** před kategoriemi je volba skupiny místností, výchozí „Všechny místnosti“. Oba výběry jsou v jednom řádku se šipkou mezi nimi, ať je vidět, že skupina zužuje kategorie (Libor 11. 11. 2026, „a“ mezi nimi mátlo), hledání je pod nimi. Skupina zúží kategorie na ty, které do ní patří, v pořadí od nejtypičtější (`KATEGORIE_PODLE_SKUPINY` v `katalog.js`), a když zvolená kategorie do skupiny nepatří, přepne na první. Vybraná místnost s druhem na plánu nabídku přepne na svou skupinu sama (`_katalogSkupinaZVyberu`, hlídá `_selectionTick`), místnost bez druhu ani zrušený výběr volbu nemění. Hledání jde přes všechny kategorie zvolené skupiny (bez skupiny přes celý katalog), výběry při něm zůstávají zapnuté a změna kategorie hledání vymaže (Libor 11. 11. 2026, vypnuté výběry mátly). Novou kategorii doplnit do `KATEGORIE_PODLE_SKUPINY`, test v `test-katalog-ui.cjs`, část 1. Skupiny viz `modules/dum.md`, Druh místnosti.
- **Katalog je sekce v pravém panelu**, ne plovoucí okno (zakrývalo půdorys, klik pod ním nedopadl). Vlastnosti vybraného kusu jsou ve společném panelu vlastností (`inspector.kind === 'katalog'`).
- **Po vložení** se kus vybere a nástroj skončí, sekce zůstane otevřená pro další. Esc zruší vybraný kus.
- **Výška ve 3D** počítá se zvýšenou nebo sníženou podlahou místnosti pod kusem (`_nulaBodu`).
- **Kopie modelu sdílejí geometrii a materiály**, `_zrus3d` je proto přeskakuje (`userData.katalog`).
- **Barvy glTF jsou lineární**, `Katalog3d.nacti` je převede na hodnoty ze vzorku, které čeká shader v `svetlo-3d.js`.
- **Sdílený odkaz** dostane kusy jako seznam `objekty` (ID, poloha, rozměry), ne jako trojúhelníky. Prohlížeč si model stáhne z `/katalog/modely/`. Dřívější cesta přes `_zapecModel` by textury modelů ztratila, čte jen textury kreslené na plátno.
- **Názvy kusů** se překládají přes `lang/*/ed_katalog.php` podle českého názvu (`modules/lokalizace.md`). Nové názvy doplnit před nasazením.

## Přebarvování potahu (varianta 1 od 9. 11. 2026)

Libor 9. 11. 2026 zadal variantu 1: paleta u vloženého kusu. Hotové je to u pohovek, křesel a židlí, 289 kusů s maskou.

- **Výroba:** `node services/katalog/masky.cjs` (výchozí kategorie pohovky, kresla, zidle) spočítá v `nahled.html` masku potahu v UV (`public/katalog/masky/`) a stejnou masku pohledem shora pro značku (`masky-pudorys/`). Do `katalog.json` zapíše `maska: [L, a, b]`, medián barvy potahu. Kus, kde maska kryje méně než 30 % povrchu, barvy nedostane. Potom `s3.cjs nahraj`. Masky jsou mimo git, v S3 mají 1,8 MB. `sestav.cjs` masku u kusu při nové výrobě zachová.
- **Postele ne:** největší plochou jsou lůžkoviny, přebarvila by se matrace místo čalounění. Potřebovaly by masku jiným postupem.
- **Přebarvení:** `Katalog3d.prebarvi(id, barva)` a `prebarviZnacku` v prohlížeči, asi 100 ms na kus, výsledek v mezipaměti podle kusu a barvy. Přebarví se první materiál s texturou, k němu patří maska. Dvanáct barev v `BARVY` (Lab), názvy v `ed_sablona.katalog.barvy`. Tmavý potah (L pod 35) světlé barvy nenabízí.
- **Uložení:** `barva` u kusu ve vybavení (engine ji ukládá a načítá), jeden krok Zpět, kopie ji přebírá, jde do `objekty` sdíleného odkazu i do 3D v odkazu. Značka v půdorysu se přebarví taky.
- **Panel:** tlačítko Barva vedle Otočit a Kopie rozbalí paletu přes plochu. Řádek palety přímo v panelu ho zvětšil, plocha se posunula a kus pod myší utekl (test tažení), proto rozbalovací. Nahoře tlačítko Původní barva, pod paletou Vlastní: stávající nástroj na barvu (`vyberBarvy`, RAL, odstín, barvy z jiných kusů). Vlastní barva se ukládá jako `#rrggbb` místo klíče palety, `Katalog3d` ji bere stejně (`cilBarvy`).
- **Označení kusu:** na plánu a v Objektech M + číslo z id (`vb9` → M9), `StavebniEngine.oznaceniKusu`. Ve všech jazycích stejné jako W, D a O, aby si lidé v různých jazycích mohli na objekt odkázat (Libor 9. 11. 2026, překládat ne). Ukazuje se se značkami. V Objektech jde kus vybrat, přejmenovat (`nazevZdroj` se zruší) a smazat, najetí myší ho na plánu jemně zvýrazní (`highlightVybaveni`).
- **Paleta** se otevírá vpravo vedle panelu kusu (když se nevejde, vlevo), výškou omezená oknem (`katalogPaletaPoloha`). Nástroj na barvu má pole s kódem `#rrggbb`: jde zkopírovat a vložit u jiného kusu nebo jiné části domu, pole RAL vložený kód vezme taky. Řetízek rozměrů se nebarví, stav ukazuje jen přeškrtnutí.
- **Ve 3D:** klik bez tažení vybere kus (`_kus3dKlik`), ukáže se panel kusu se vším včetně barvy. Obrys vybraného kusu Libor 9. 11. 2026 nechtěl, stačí panel. Zásah se hledá kvádrem z rozměrů, ne v modelu: zhuštěné souřadnice (meshopt) dávají v r128 zásahy jinde. Stěna nebo strop před kusem má přednost.
- **Lišta:** s otevřeným katalogem svítí Katalog místo Výběru, vždy jen jedna ikona. Výběr katalog zavře, Katalog při jiném nástroji přepne zpět na výběr a panel nechá.
- **Karta katalogu:** kus s maskou má vpravo dole čtyři barevné tečky (`Katalog3d.ukazka`), popisek Jde přebarvit.
- **Známé:** u některých židlí se přebarví i nožičky stejného odstínu jako potah. Stoly a skříně (dekor dřeva) zatím ne, viz zkouška níž.

**Zkouška ze 4. 11. 2026 a původní nápad** (dál platí pro stoly, skříně a variantu 2):

Nápad Libora: měnit barvu kusu z katalogu, u stolů a skříní i dekor. Licence jsou ve stránce autorů doplněné (`autori_upravy`).
**Licence to dovolují.** CC BY 4.0 u ABO výslovně dovoluje upravovat a upravené šířit, i komerčně (čl. 2(a)(1)), CC0 u Poly Haven je bez podmínek. Při zavedení doplnit změnu barvy do výčtu úprav `autori_upravy` v `lang/*/pravni.php`. Přebarvený kus nevydávat za skutečný výrobek, taková varianta nemusí existovat. To by vadilo, až kdyby se kusy nabízely jako zboží nebo s odkazem do obchodu.

**Proč maska.** 926 z 930 modelů má jeden materiál a jednu texturu na celý kus, potah i nožičky jsou na jednom obrázku. Násobení barvou (`material.color`) umí jen ztmavit, z hnědé bílou neudělá. Každý kus proto potřebuje masku, co se přebarví, a nahrazení barvy se zachováním jasu.

**Zkouška 4. 11. 2026, mimo projekt, nic z ní není v kódu.** Vzorek byl 8 pohovek a 8 stolů rovnoměrně z pořadí v katalogu, textury 1024 px, Chrome bez grafické karty.

| Co | Výsledek |
|---|---|
| Pohovky, nalezení potahu | 8 z 8, nožičky zůstaly původní |
| Látka na bílou, antracit, zelenou | přirozené, záhyby i struktura zůstaly |
| Tmavá kůže na bílou | flekaté jako mramor, doladit nebo nenabízet |
| Stoly, nalezení plochy | 7 z 8, u kulatého stolu s pestrou paprskovitou deskou vyhrála černá podnož |
| Stoly na černou | dobré |
| Tmavé dřevo na bílou | spíš oprýskaný nátěr než čistá bílá |
| Dekor dřeva | použitelný, zkoušeno jen s generovanou kresbou. Přes UV modelu kresba většinou sedí, ale bez masky přebarví i kovovou podnož. Promítnutý shora a z boku drží masku, prosvítá stará kresba |

Maska 512 px ve WebP měla 1–14 KB, průměr 2,6 KB, na 930 kusů asi 2,4 MB. Přebarvení na procesoru trvalo většinou kolem 300 ms (143–813 ms), ostrá verze ve shaderu by měla být rychlejší, neměřeno. Křesla, židle, postele a skříně nezkoušeno. U koberců, obrazů a rostlin to nedává smysl.

**Postup ze zkoušky:**
- **Maska:** 20 000 vzorků po povrchu úměrně skutečné ploše, k-means se 4 shluky v Lab (váha jasu 0,35). Patří do ní největší shluk a shluky s rozdílem barvy pod 9 a jasu pod 28. Každý texel jde k nejbližšímu shluku, nakonec rozmazání 1 px.
- **Přebarvení:** cílový jas × (jas / medián masky)^0,8, zbytková barva s váhou 0,4.

**Dvě podoby výběru (Libor):**
1. **Přebarvení po vložení:** paleta u kusu při výběru a v panelu vloženého kusu.
2. **Barva předem:** volitelně se nejdřív určí barva a katalog ukáže kusy v ní, původní i přebarvené.

Nejsou to alternativy, podoba 2 stojí na podobě 1, potřebuje stejné masky a navíc přebarvené náhledy. Rozhodnutí až při zavedení, doporučení je začít podobou 1. Levnější půlka podoby 2 je filtr podle původní barvy, medián masky ji určí u každého kusu a nic se přitom nepřebarvuje.

**Až na to dojde:**
- **Pořadí:** automatické kusy jsou od 4. 11. 2026 vyčištěné, masky se dají vyrábět. Začít čalouněnými kusy (pohovky, křesla, židle, postele), potom stoly a skříně se skutečnými CC0 texturami.
- **Výroba:** masky v `sestav.cjs` a automatická kontrola masky. Kus, který neprojde, nabídku barev nedostane. Kontrola zatím není navržená.
- **Materiály:** kopie modelu je dnes sdílejí, každá barva potřebuje vlastní materiál s mezipamětí podle kusu a barvy.
- **Uložení:** `barva` u kusu, v Zpět a v seznamu `objekty` sdíleného odkazu.
- **Půdorys:** značka je hotový obrázek v původní barvě a musí se přebarvit taky, jinak bude kus v půdorysu hnědý a ve 3D bílý.

## Hosting

Modely, náhledy a značky jsou v bucketu `tuptudu-katalog` v S3 ve Frankfurtu (5. 11. 2026). Web bere adresu z `config('katalog.zaklad')`, `KATALOG_ZAKLAD=/katalog` v `.env` přepne na lokální soubory. V repozitáři je jen `katalog.json`, ostatní je lokálně mimo git a vyrábí to `sestav.cjs`. Po výrobě `node services/katalog/s3.cjs nahraj`, pošle jen změny. Celý katalog má asi 340 MB, do repozitáře a přes FTP deploy se to nehodí. Značky do půdorysu se načítají s `crossOrigin`, jinak by obrázek z cizí adresy zablokoval export půdorysu do PNG. V GitHub Secrets jsou `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` a `AWS_BUCKET` z 14. 8. 2026, deploy je nikam nepředává a katalog je nepotřebuje.

**Nastavení bucketu:** Soubory smí číst každý, seznam souborů veřejný není, CORS pouští jen naše adresy, národní domény se doplní do `ADRESY` v `services/katalog/s3.cjs`. Klíč v `.env` (`KATALOG_AWS_KEY`, `KATALOG_AWS_SECRET`) smí jen do bucketů `tuptudu-katalog*`. Účet je společný s jiným projektem, plný přístup k němu záměrně nemáme. Založení a nastavení: `node services/katalog/s3.cjs zaloz`, ověření: `node services/katalog/s3.cjs over`. AWS CLI tu není, skript je bez knihoven.

## Stav a známá omezení (4. 11. 2026)

Na webu od commitu f7e4697 (4. 11. 2026): 120 ručně vybraných kusů ve 14 kategoriích. Další nasazení přinese všech 927 prohlédnutých kusů z úložiště. Ověřuje `test-katalog-ui`, panel kusu je v `test-formulare-ui`, výrobu `kontrola.cjs`.

**Prohlídka 930 kusů (4. 11. 2026):** vyřazené 3 (`VYRAZENE` v `rozsir.cjs`), 50 kusů dostalo správný typ nebo kategorii, barvu v názvu upravila kontrola u 250 kusů. Výsledek: pohovky 79, křesla 110, židle 101, jídelní stoly 35, stolky 108, postele 53, skříně 98, police 44, psací stoly 41, svítidla 70, koberce 69, obrazy 49, zrcadla 30, rostliny 40.

Viděno při prohlídce, zatím neřešeno:
- **Rostliny:** skutečné rostliny jsou jen 3 z 40, zbytek jsou vázy a květináče. ABO rostliny skoro nemá, patří to do vrstvy zahrada.
- **Lesklé kusy (rozdělané, viz Rozdělaná práce):** kovový přechod na bílých skříních a stínidlech nezpůsobuje lesk, ale naše někdejší `--simplify` ve výrobě. Bral modelům zkosené hrany a stínování se rozlévalo přes plochu, zdrojové modely ABO to nemají. Značka je už matná (`nahled.html`) a `katalog-3d.js` omezuje kov a lesk u ABO kromě tenkých kusů.
- **Baked přechod:** část textur má přechod přímo v obrázku (např. skříň `abo-` č. 534 na archu), tu výroba neopraví. Po dokončení nové výroby posoudit, případně vyřadit.
- **Výplety:** značka sedáku z výpletu je tmavá, hustý vzor se celý vyhodnotí jako hrana (4 židle a lavice).
- **Barvy v názvech** nejsou dokonalé, např. béžovošedé křeslo jako šedé. Hlavní vodítko je náhled.

- **Dotyk zatím nevyzkoušený.** Klepnutí má jít cestou kliku, na tabletu to nikdo nezkoušel.
- **Kusy jdou vkládat a posouvat jen v půdorysu**, ve 3D se jen zobrazí a nejdou tam vybrat.
- **Kusy se navzájem nesrážejí**, židle jde zasunout pod stůl. Hromadné tažení více kusů zarážku nemá.
- **Vybavení z importu výkresu** zůstává jen 2D ikona, do 3D nejde.
- **Stolní lampa a obraz** mají výchozí výšku nad podlahou, na stůl se ale nepřichytí, výška se nastavuje v panelu kusu.

## Rozdělaná práce (k 5. 11. 2026)

1. **Lehčí modely (5. 11. 2026).** Porovnání 40 kusů s vyhlazováním hran a bez něj shodilo Liborovi notebook. Měl volné jen asi 3 GB paměti a rozdíl ve vzhledu neviděl. Proto je vyhlazování hran v editoru i ve sdíleném odkazu vypnuté a textury mají 512 px místo 1024 px.
   Měření v Chrome na Radeon 7520U, okno 1500 × 950, poměr 1, bez vyhlazování, 40 kusů, 629 tis. trojúhelníků (`prohlizec.cjs` s `gpu: true`):
   - textury 1024 px: 37 fps, soukromá paměť 2 111 MB,
   - textury 512 px: 44 fps, 1 248 MB,
   - textury 256 px: 57 fps, 1 050 MB, zblízka už rozmazané,
   - samotný editor s jedním kusem má 833 MB.
   S vyhlazováním a 1024 px to bylo 3 až 28 fps. Zjednodušení `--simplify-error 0.001` ubere 6× trojúhelníků, ale vrací kovový přechod na bílých skříních, proto jen u kusů, které jsou i po mírném zjednodušení nad 60 000. Přepracováno a nahráno do S3 5. 11. 2026: 926 kusů, modely 141 MB, medián 13 744 trojúhelníků, nad 60 000 zůstaly 2 kusy. Hotový katalog se 40 kusy: 1 276 MB, 33 fps. Zdroje v `%TEMP%` jsou smazané, další výroba je stáhne znovu (asi 12 GB).
2. **Přesun do S3 je hotový** (5. 11. 2026), viz Hosting. Soubory z prvního balíku z gitu zmizely, hosting je smaže při nasazení.
3. **Další vrstvy v pořadí:** povrchy (ambientCG, Poly Haven), koupelna (Sweet Home 3D + vlastní materiály, kout), generátor linky.
4. **Dotyk na tabletu** nikdo nezkoušel.
5. **Stránka analýzy** v nákladech ještě uvádí Cloudflare R2, Libor navrhl AWS.

## Koupelna ze Sweet Home 3D (11. 11. 2026)

Kategorie `koupelna` (Koupelna a WC), 22 kusů: WC, bidet, pisoár, umyvadla, vany, sprchový kout se sedátkem, pračky, sušička, koupelnové radiátory. Ve skupině místností `hygiena` je první.

- **Licence:** jen knihovny Blend Swap CC0, Blend Swap CC BY a Scopia (CC BY 3.0). Contributions, LucaPresidente a další sady jsou pod Free Art License (copyleft), z nich nic. Blend Swap má u každého kusu jiného autora: `autor`, `dilo` a `odkaz` jsou u kusu v `polozky.json` (z `BLENDSWAP_LICENSE.txt`, u HTML licence autor z `creator` v katalogu knihovny) a stránka autorů je vypíše po zdrojích. Kus bez licenčního souboru se nebere (modernToilet).
- **Stažení:** kus po kusu z `sweethome3d.com/…/assets/models/<orig>.zip`, `orig` je cesta v knihovně (`blendswap-cc-0/toiletsUnit`, `scopia/islandBath`). Zip rozbalí systémový `tar` (na Windows bsdtar ze System32).
- **Převod (`pripravSh3d` v `sestav.cjs`, stránka `prevod.html`):** OBJ je v centimetrech s y nahoru a předkem k +z, převede se na metry a zapeče. Materiály podle názvu: zrcadlo, sklo, bílý plech na lak, kov na chrom, keramika (`PRAVIDLA`), ostatní zůstanou z MTL. Kus může v zadání přepsat materiály (`materialy: { nazev: 'sklo' }`) a natočení (`otoc` ve stupních). Převedený GLB je v cache `tuptudu-katalog/sh3d`, dál jde stejnou cestou (zmenšení, náhled, značka).
- **Závěsné kusy** mají `uroven` (výšku spodku nad podlahou): umyvadla 0,26 až 0,58 m, pisoár 0,3 m, radiátory 0,15 m.
- **Vyřazené po prohlídce archu:** červená miska, nástěnný blok umyvadla se zrcadlem (bathroom1), druhý pisoár, kamenné umyvadlo na desku (bez desky visí), sprchový kout s obkladem (98 tisíc plošek). Pračka Scopia má na předním panelu pruhy přímo v geometrii, místo ní je jako pračka použitý model sušičky (`sh3d-pracka`, stejný `orig`).
- **Postup:** `node services/katalog/sestav.cjs --jen=^sh3d-`, arch `node services/katalog/kontrola.cjs --archy --kat=koupelna`, potom `node services/katalog/s3.cjs nahraj --jen=^sh3d-`.
- **Stav 11. 11. 2026:** 22 kusů je v S3 (Libor nahrání potvrdil), `katalog.json` commitnutý, na web ještě nenasazené.
- **Zbývá z Plánu 1:** zrcadlová skříňka, samostatná koupelnová skříňka a sprchová vanička nejsou v žádné vyhovující sadě. Sprchové kouty a závěsné WC už dělá generátor (2. etapa, A1 a A3), skříňky a vanička čekají v bodech A2 a A4.

## Plán: koupelna, 2. etapa (11. 11. 2026, čeká na Liborovo rozhodnutí)

Libor: kritický nedostatek vybavení koupelny, jen jeden sprchový kout. Co v CC0 a CC BY knihovnách není, navrhneme sami.

**A. Generátor vlastních kusů** (nový zdroj `tuptudu`, bez autorů): `services/katalog/generuj.html` sestaví kus v three.js z parametrů a uloží GLB do cache, dál jde stejnou cestou jako ostatní (zmenšení, náhled, značka). Materiály stejné jako u převodu (keramika, chrom, sklo, lak, dekor dřeva).
**Hotovo 11. 11. 2026 (A1, A3):** generátor běží (`pripravVlastni` v `sestav.cjs`, kus v zadání má `zdroj: tuptudu`, `orig` = klíč kusu v `KUSY` a `parametry`, cache podle id). Sedm kusů: sprchový kout čtvercový 90, obdélníkový 120 × 90 s posuvnými dveřmi, čtvrtkruhový 90 (R 550), dveře do niky 100, walk-in 120 × 90 se žlábkem, závěsné WC a závěsný bidet s předstěnou 60 × 20 cm. Kouty stojí stěnami vzadu a vlevo, sklo je vpředu a vpravo, otočením po 90° jdou do každého rohu. Do S3 nahrané. Po změně generátoru `sestav.cjs --jen=^tt- --znovu` a `s3.cjs nahraj --jen=^tt-`.
1. Sprchové kouty: čtvercový 90, obdélníkový 120 × 90, čtvrtkruhový 90, walk-in zástěna 120 (bez vaničky, se žlábkem), dveře do niky 100. Každý s vaničkou, profily a sklem. Další rozměry dá změna rozměru v cm, krabicové tvary se roztáhnou bez deformace.
2. Sprchová vanička samostatně 90 × 90 a 120 × 80, zástěna na vanu.
3. Závěsné WC s instalační předstěnou (v ČR v novostavbách nejčastější), závěsný bidet.
4. Skříňka pod umyvadlo s umyvadlem 60 a 80 (bílá, dub), samostatná skříňka pod umyvadlo, vysoká koupelnová skříň, zrcadlo s osvětlením, zrcadlová skříňka.

**B. Z knihoven, hned** (Blend Swap CC0): držák toaletního papíru, WC štětka, věšák a držák ručníků, sprchová hlavice s baterií. Sušička na pračku jako druhá položka s `uroven` 0,85 m (sloupec pračka + sušička).

**C. Technická místnost a prádelna** (generátor, jednoduché tvary): ohřívač vody (bojler), závěsný plynový kotel, vnitřní jednotka tepelného čerpadla, rozdělovač podlahového topení, výlevka, koš na prádlo, sušák. Patří do skupiny `technicke` a `hygiena`, nová kategorie `technika`.

**D. Kuchyň (Plán 2):** v Blend Swap CC0 je celá sada kuchyňských skříněk (spodní, horní, rohové, dřezová, vysoká, digestoř, lednice, trouba, varná deska). Nábytková sestava se staví z parametrů, sada poslouží jen jako vzor proporcí.

Pořadí podle návrhu: A1 a A3 (sprchy, závěsné WC), B, A4, C, A2.

## Plán: koupelna, WC, kuchyňská linka a vestavěné skříně (Libor 11. 11. 2026)

V katalogu chybí vybavení koupelny a WC, kuchyňská linka a vestavěné skříně. Libor: „dvě sousta, zatím do plánů, ať na ně nezapomeneme.“ Nedělat bez výzvy.

**Plán 1: koupelna a WC.** Rozjeté 11. 11. 2026, stav v oddílu Koupelna ze Sweet Home 3D. Původní zadání: umyvadlo, WC (i závěsné), vana, bidet, pisoár, pračka a sušička jako obyčejné kusy katalogu. Tvary ze Sweet Home 3D, jen sady s licencí CC BY (autor do `ZDROJE` v `sestav.cjs`), keramika a chrom naše. Nové kategorie, např. `sanita`, a jejich doplnění do `KATEGORIE_PODLE_SKUPINY` (skupina `hygiena`). Sprchový kout patří do Plánu 2, potřebuje volné rozměry a zástěnu.

**Plán 2: Nábytková sestava** (kuchyňská linka a vestavěná skříň), samostatný oddíl níž.

## Plán 2: Nábytková sestava – kuchyňská linka a vestavěná skříň (Libor 11. 11. 2026)

Stav: **hotovo lokálně 11. 11. 2026** (fe28def), popis v `modules/sestavy.md`. Libor schválil body (a) až (d) a řekl „udělej to celé a pak to odladíme“; všechny etapy jsou v jednom, povrchy zatím kreslené na plátně (fotky dřeva a kamene jsou další krok).

**Rozhodnuto (Libor 11. 11. 2026):**
- Název **Nábytková sestava**, druhy Kuchyňská linka a Vestavěná skříň.
- **Podvolba nástroje Nábytek a vybavení** (křesílko v liště), žádné nové tlačítko: po kliknutí se nabídne Nábytek, nebo Nábytková sestava. „Na první pohled minimalistické a uživatel najde, co hledá.“
- Vlastní objekt sestava místo skříněk v katalogu. Linka i skříň se měří podle místnosti, pevné skříňky by uživatel skládal po jedné a dorovnával ručně. Sestava se jako schodiště staví ve 3D přímo v editoru z parametrů, ne jako hotový GLB.
- První vlna: rovná linka a tvar L. Tvar U, ostrůvek a barový pult později.
- Pro všechny tarify, úpravy se počítají do denního limitu jako ostatní.
- **Kusovník ani cena ne:** složité a národně neudržitelné.
- Libor doplnil: volba povrchů, výšky, počet šuplíků a dvířek, rohové skříňky. Skříňka bývá jen spodní, spodní a horní (každá s jinou hloubkou), nebo po celé výšce (lednice). Spotřebiče musí být vidět. Šatní skříň je jednodušší: dveře posuvné nebo otočné, materiály a zrcadla.

**Ovládání**
- Panel Nábytek a vybavení má nahoře přepínač **Nábytek | Sestava**, pamatuje si poslední volbu. V Sestavě jsou dvě dlaždice (Kuchyňská linka, Vestavěná skříň) a nápověda ke kreslení.
- Katalog ve skupině Kuchyně ukáže jako první dlaždici Kuchyňskou linku, v noční zóně a ve vstupu Vestavěnou skříň. Je to odkaz do Sestavy, ať ji najde i ten, kdo hledá v nábytku.
- **Kreslení:** klik na líc stěny vyplní celý volný úsek mezi rohy a dveřmi. Tah od bodu k bodu udělá sestavu jen v délce tahu. Klik do rohu pokračuje po sousední stěně (L). Magnet na líc, do rohu a k hraně dveří a okna, Alt vypíná. Konce jdou posunout úchyty.
- Nová sestava je vybraná a panel ukáže její nastavení. Výběr klikem ve 2D i 3D a v Objektech, oko skryje, Delete smaže.
- **Nákres zepředu v panelu:** rozvinutý pohled na celou sestavu (SVG) se sloupci, dvířky, šuplíky, spotřebiči, okny ve stěně za ní a zlomem rohu u L. Klik na sloupec ho vybere a pod nákresem jsou jeho volby, tažením se sloupec přesune. U skříně klik na dveře přepne dekor a zrcadlo. Nákres je hlavní místo úprav, výběr sloupce kliknutím ve 3D přijde později.

**Kuchyňská linka**
- *Sloupce:* linka se dělí na sloupce, každý má šířku a skladbu:
  - jen spodní skříňka (třeba pod oknem),
  - spodní a horní skříňka,
  - vysoká skříň (lednice, trouba, potraviny),
  - volně stojící spotřebič nebo volné místo, nad nimi může být horní skříňka.
  Horní skříňka má šířku sloupce, dělení nahoře a dole se kryje (zjednodušení, viz K rozhodnutí).
- *Šířky:* nabídka 30, 40, 45, 50, 60, 80, 90 a 100 cm a vlastní (15 až 120). Nová linka se dělí po 60 cm. Zbytek do 15 cm vyplní krycí lišta, od 15 do 45 cm úzká skříňka, větší běžná. Upravený sloupec zůstává, při změně délky se přepočítají jen neupravené sloupce a dorovnání.
- *Výšky a hloubky* platí pro celou sestavu, u horní a vysoké skříňky jde výška změnit zvlášť (třeba nižší nad lednicí). Pracovní deska 90 cm (85 až 100), sokl 10 cm. Spodní a vysoké skříňky hloubka 60 cm, deska 62 cm s přesahem. Horní skříňky hloubka 35 cm, výška 72 cm (36 až 96), 55 cm nad deskou. Vysoké skříně končí v horní hraně horních. Volba **Ke stropu** protáhne horní a vysoké skříně ke stropu podle výšky podlaží a přepočítá se sama.
- *Čela:*
  - spodní: dvířka (1 nebo 2), šuplíky (2, 3, 4), šuplík a dvířka, otevřená police;
  - horní: dvířka (1 nebo 2), výklopná (1 nebo 2 nad sebou), prosklená, otevřená police;
  - vysoká: dvířka 2 nebo 3 nad sebou, vedle sebe jedna nebo dvoje.
  Dvoje dvířka vedle sebe se nabídnou sama od šířky 70 cm.
- *Rohy (tvar L), spodní a horní zvlášť:* rohová skříňka L (dole 90 × 90, nahoře 60 × 60, lomená dvířka), nebo slepý roh (skříňka zajede za roh). U slepého rohu je krycí lišta 5 cm, aby šla otevřít dvířka a šuplíky. Nahoře navíc otevřená rohová police nebo nic. Deska a sokl jdou rohem průběžně.
- *Spotřebiče* jsou vlastní jednoduché tvary, ne modely. V půdorysu mají značku bez písmen, ta platí ve všech jazycích.
  - v desce: dřez (jednodřez, s odkapem, dvojdřez; nerez, granit černý, šedý, bílý; baterie), varná deska indukční (černé sklo se zónami) nebo plynová (hořáky s mřížkou), 60, 80 a 90 cm;
  - ve spodní skříňce: trouba (pod varnou deskou nebo samostatně), myčka 45 a 60 cm (plně vestavná s čelem jako dvířka, nebo s viditelným panelem);
  - ve vysoké skříni: vestavná lednice (jedno čelo, nebo lednice a mraznička), trouba s mikrovlnkou ve výšce očí, samotná trouba;
  - nad deskou: digestoř komínová (místo horní skříňky, komín ke stropu), vestavná (výsuvný panel ve spodku horní skříňky), nebo žádná;
  - volně stojící: lednice 60 cm a americká 90 cm. Sporák, pračka a vinotéka později.
- *Automatické vybavení:* nová linka se sama vybaví podle zvyklostí. Dřez je pod oknem (jinak blízko středu), vedle něj myčka. Varná deska s troubou a digestoří je aspoň o skříňku dál od dřezu. Lednice stojí na kraji dál od varné desky (u linky nad 2,4 m). Ostatní skříňky mají šuplíky a dvířka. Všechno jde změnit, „Vybavit znovu“ vrátí výchozí rozvržení.
- *Kontroly (varování, ne zákaz):*
  - varná deska má aspoň 30 cm desky od vysoké skříně a od dřezu;
  - digestoř je nad varnou deskou (65 cm nad indukcí, 75 cm nad plynem);
  - parapet okna je níž než deska;
  - sloupec stojí přes dveře nebo okno do podlahy;
  - sestava odstoupí od stěny nebo do ní zajede.

**Vestavěná skříň**
- Kreslí se stejně jako linka. Ve výklenku převezme jeho šířku i hloubku (do 70 cm). Rovná, v L později.
- Výška ke stropu (s horní krycí lištou), nebo vlastní. Hloubka 62 cm u posuvných dveří, 58 cm u otočných.
- Dveře:
  - **posuvné**: 2 až 4 díly podle šířky, ve 3D se překrývají ve dvou kolejnicích, rám stříbrný, černý, bílý nebo zlatý;
  - **otočné**: po 40 až 60 cm, s úchytkami;
  - volitelně bez dveří: otevřená, s policemi a tyčí.
- Povrch má každé dveře zvlášť: dekor, nebo zrcadlo (stříbrné, bronzové, grafitové). Korpus a boky mají vlastní povrch, viditelný bok na volném konci se doplní sám.
- Vnitřek zavřené skříně se nekreslí. Dělené dveře (příčky, dekor se zrcadlem) a zkosení v podkroví později.

**Povrchy**
- Kuchyň:
  - čela (horní můžou mít jiná než spodní, tedy dvoubarevná kuchyň);
  - korpus (vidět na hranách a v otevřených policích);
  - pracovní deska;
  - sokl (jako čela, jako korpus, nerez, nebo černý);
  - úchytky (madlo, knopka, úchytový profil, bez úchytek; nerez, černá, zlatá, bílá);
  - zástěna za linkou (nic, sklo v barvě, obklad, jako deska).
- Skříň: dveře, rám, korpus.
- Druhy:
  - jednobarevné (společný výběr barvy s RAL, matné i lesklé);
  - dřevodekory (dub, ořech, jasan…);
  - kámen a beton pro desku (mramor, šedý kámen, černý granit, beton, terrazzo);
  - nerez, černý kov, mosaz, sklo, zrcadlo.
- Dřevo a kámen jsou ze skutečných textur CC0 (Poly Haven, ambientCG), stejným postupem jako textury krytin (`services/krytiny/sestav.py`: barva, normála, drsnost, náhled). Jednobarevné jsou bez textury. „Jinde použité“ nabídne povrchy z ostatních sestav.

**Záznam:** `dum.sestavy` = [{ id, podlazi, druh: kuchyn | skrin, body (po líci stěny, rovná 2, L 3), strana, vysky, hloubky, povrchy, ramena: [{ sloupce: [{ sirka, skladba, spodni, horni, vysoka, upraveno }] }], rohy: [{ spodni, horni }] }].
- Skříň má místo ramen `dvere` (druh, počet, povrch každých dveří), `ram`, `vyska` (null = ke stropu) a `hloubku`.
- Co jde spočítat, se neukládá a počítá se při vykreslení: okna, výška stropu, viditelné boky, krycí lišty.

**Označení** podle angličtiny: **K1** kuchyňská linka (Kitchen), **B1** vestavěná skříň (Built-in). W mají stěny, M nábytek.

**Souvislosti (stav a invalidace)**
- Sestava stojí v souřadnicích jako nábytek a schody, posun stěny ji neposune. Když od stěny odstoupí nebo do ní zajede, panel varuje a nabídne Přitáhnout ke stěně.
- Okna se čtou při každém vykreslení. Horní skříňky pod oknem se vynechají samy, posun okna se projeví hned. Ručně přidaná horní skříňka pod oknem zůstane, s varováním.
- Výška ke stropu sleduje výšku podlaží. Smazání podlaží smaže i jeho sestavy.
- Každá úprava je jeden krok Zpět a jedna úprava do limitu tarifu. Pole platí ihned (`_poleIhnedInit`), nový panel patří do `test-formulare-ui.cjs`.
- 2D:
  - spodní skříňky plnou čarou s dělením sloupců;
  - horní skříňky čárkovaně (nad rovinou řezu);
  - vysoké s úhlopříčkou;
  - skříň s čarou dveří (posuvné dvojitě);
  - spotřebiče značkou;
  - výplň v barvě čel, barvy i pro tmavý režim.
  Export a sdílený odkaz kreslí sestavy stejně.
- 3D se staví živě z parametrů: kvádry, deska s výřezy pro dřez a varnou desku, válce.
  - Mezi čely jsou spáry 3 mm. Geometrie je sloučená podle materiálu kvůli výkonu notebooku.
  - Přestavuje se jen změněná sestava, ne celá scéna.
  - Funkce sdílí s generátorem koupelny (`generuj.html`: deska, kvádr, válec, madlo), materiály jsou stejné.
- Překlady ed_* ve všech osmi jazycích. Nový test `test-sestava-ui.cjs`: kreslení, dělení, dorovnání, okno, L, Zpět, uložení, 2D, 3D, sdílený odkaz.

**Etapy**
1. **Základ:** přepínač v panelu, kreslení rovné sestavy, sloupce po 60 cm s dorovnáním, spodní a horní skříňky. K tomu deska, sokl, dvířka, úchytky, výšky a hloubky a jednobarevné povrchy. Funguje 2D, 3D, Objekty, Zpět, uložení, sdílení a export. Jedno větší sezení.
2. **Nákres a sloupce:** nákres zepředu, výběr sloupce, šířka, skladba (spodní, spodní a horní, vysoká, volné místo), čela, přidání, smazání, přesun, dorovnání, okna a dveře. Jedno sezení.
3. **Vestavěná skříň:** posuvné a otočné dveře, zrcadla, rám, výška ke stropu, výklenek. Jedno sezení.
4. **Spotřebiče:** všechny výše, značky v půdorysu, automatické vybavení, kontroly. Jedno až dvě sezení.
5. **Tvar L a rohy:** kreslení přes roh, rohové skříňky dole i nahoře, deska a sokl dokola. Jedno sezení.
6. **Povrchy z textur:** dřevo, kámen, beton, lesk, dvoubarevná kuchyň, zástěna. Jedno sezení.

Později:
- tvar U, ostrůvek a barový pult;
- dělené dveře skříně, otevřená šatna, zkosení v podkroví;
- osvětlení pod skříňkami;
- výběr sloupce ve 3D.

Stejný nástroj se hodí i na koupelnový nábytek (koupelna A4) a obývací stěnu.

**K rozhodnutí s Liborem (11. 11. 2026):**
- (a) Horní skříňky se stejným dělením jako spodní. Doporučeno, ovládání je jednodušší. Nezávislé dělení až ve chvíli, kdy bude chybět.
- (b) Automatické vybavení nové linky. Doporučeno.
- (c) Pořadí etap: vestavěná skříň hned po nákresu (doporučeno, je rychlá), nebo až po kuchyni.
- (d) Označení K1 a B1.
