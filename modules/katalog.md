# Katalog nábytku a vybavení (Koncept V3)

Kusy z volně licencovaných zdrojů, které si uživatel vloží do půdorysu a vidí ve 3D. Rozhodnuto s Liborem 4. 11. 2026 po analýze zdrojů: https://claude.ai/artifact/GvRQ3DRpdaxuxwBmMGnbsQ

## Vrstvy podle druhu objektu

| Vrstva | Zdroj | Stav |
|---|---|---|
| Volný nábytek a dekorace | Amazon Berkeley Objects (ABO), Poly Haven | první balík hotový |
| Podlahy, dlažba, obklady, látky | ambientCG, Poly Haven (CC0) | další krok |
| Umyvadlo, WC, vana | tvary ze Sweet Home 3D (jen sady CC BY) s naší keramikou a chromem | další krok |
| Sprchový kout, kuchyňská linka, vestavěné skříně | vlastní generátor | další krok |
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
| `services/katalog/s3.cjs` | založení a ověření bucketu, nahrání souborů do S3 |
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
- **Magnet otáčení (Libor 4. 11. 2026):** při otáčení za madlo kus zaskočí, když je do 4° rovnoběžný nebo kolmý k některé zdi podlaží (`katalogMagnetRotace`), čára skrz střed ukáže podél které. Sílu bere z nastavení magnetu, Alt ho vypne.
- **Obrazy a zrcadla** patří na zeď, jen ty se do 35 cm přichytí a otočí zády k ní (`NA_ZED`), Libor potvrdil.
- **Tažení** drží volný střed zvlášť od zastaveného, jinak by se kus o zeď zasekl.
- **Vložení dvěma způsoby:** přetažením karty do půdorysu i klikem a klepnutím. Prstem je svislý pohyb posouvání seznamu, tažení začne vodorovným pohybem.
- **Rozměry:** v cm i v % původní velikosti (`zaklad`), druhá hodnota se dopočítá. Spojený řetízek mění šířku, hloubku i výšku ve stejném poměru, rozpojený jen zadaný rozměr. Model se roztáhne (`Katalog3d.vloz`), značka také.
- **Klik** má přesný tvar kusu, ne obdélník kolem něj. Menší kusy jsou navrchu, stůl jde chytit i na koberci.
- **Značka v půdorysu** je pohled shora v barvě objektu s tmavou čárou na hranách, ve WebP.
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
- **Označení kusu:** na plánu a v Objektech jako písmeno + číslo z id (`vb9` → N9), písmeno je překlad `ed_ui.oznaceni_nabytku` (cs/sk N, en F, ostatní M). Ukazuje se se značkami (přepínač značek jako u W/D/O). V Objektech jde kus vybrat, přejmenovat (`nazevZdroj` se zruší) a smazat.
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
