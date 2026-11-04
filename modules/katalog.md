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
| `public/katalog/modely/`, `nahledy/`, `pudorys/` | model pro web, náhled do panelu, značka do půdorysu |
| `services/katalog/polozky.json` | zadání: co v katalogu je, český název, kategorie, výška nad podlahou |
| `services/katalog/sestav.cjs` | výroba, viz níž |
| `resources/views/pravni/autori-modelu.blade.php` | stránka `/model-credits` s autory a licencemi |
| `services/import-test/test-katalog-ui.cjs` | test celé cesty v prohlížeči |

## Přidání kusu

Hromadně: `node services/katalog/rozsir.cjs` doplní kusy z ABO podle pravidel (české názvy z typu, barvy a materiálu, cílové počty `CILE`), ručně vybrané zůstanou první. Jednotlivě:

1. Doplnit řádek do `services/katalog/polozky.json`: `id` (`abo-…`, `ph-…`), `zdroj`, `orig` (ID ve zdroji), `nazev`, `kategorie`, případně `uroven` (výška nad podlahou v metrech, u obrazů a stolních lamp).
2. `node services/katalog/sestav.cjs` stáhne jen chybějící, zmenší na textury 1024 px a WebP, geometrii komprimuje meshoptem, změří, udělá náhled a značku. `--jen=regex` omezí výběr, `--znovu` udělá znovu.
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
- **Editor zatím není přeložený** (`modules/lokalizace.md`), názvy kusů jsou jen česky. Stránka autorů přeložená je.

## Hosting

Prvních 120 kusů je v `public/katalog` v repozitáři. Při 930 kusech to jsou stovky MB, do repozitáře a přes FTP deploy se to nehodí, před nasazením zbytku je potřeba úložiště. Libor 4. 11. 2026 navrhuje AWS, účet má. Plán: bucket S3 ve Frankfurtu s veřejným čtením jen pro katalog a CORS, nahrání přes `aws s3 sync`, adresa katalogu z `.env`. U značek do půdorysu je potřeba `crossOrigin`, jinak obrázek z cizí adresy zablokuje export půdorysu do PNG. Zatím nic z toho není zapojené, kód S3 nepoužívá a balík pro S3 tu není. V GitHub Secrets ale `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` a `AWS_BUCKET` jsou (od 14. 8. 2026), deploy je nikam nepředává. **Bucket nezakládat, dokud Libor neověří, že TupTuDu nemíchá data s jiným projektem** (viz paměť `tuptudu-zdroje-objektu`).

## Stav a známá omezení (4. 11. 2026)

Na webu od commitu f7e4697 (4. 11. 2026): 120 ručně vybraných kusů ve 14 kategoriích (24 MB). V `polozky.json` je 930 kusů, automaticky pojmenované mají `auto: true`, lokálně je z nich vyrobeno asi 909 modelů bez náhledů. Do gitu nejdou (`.gitignore`), první balík je přidaný přes `git add -f`. Ověřuje `test-katalog-ui`, panel kusu je v `test-formulare-ui`.

- **Dotyk zatím nevyzkoušený.** Klepnutí má jít cestou kliku, na tabletu to nikdo nezkoušel.
- **Kusy jdou vkládat a posouvat jen v půdorysu**, ve 3D se jen zobrazí a nejdou tam vybrat.
- **Kusy se navzájem nesrážejí**, židle jde zasunout pod stůl. Hromadné tažení více kusů zarážku nemá.
- **Vybavení z importu výkresu** zůstává jen 2D ikona, do 3D nejde.
- **Stolní lampa a obraz** mají výchozí výšku nad podlahou, na stůl se ale nepřichytí, výška se nastavuje v panelu kusu.

## Rozdělaná práce (k 4. 11. 2026)

1. **Výroba 930 kusů nedoběhla, zastavena na 909 modelech.** `services/katalog/polozky.json` už má 930 kusů, `katalog.json` se zapíše až na konci, do té doby editor ukazuje 120. Pozor: po doběhnutí bude `katalog.json` lokálně odkazovat na modely, které v gitu nejsou, před commitem musí být vyřešené úložiště. Dokončení: `node services/katalog/sestav.cjs --vlaken=5`, hotové modely přeskočí. Potom prohlédnout náhledy automaticky vybraných kusů (`auto: true`) a špatné vyřadit ze zadání.
2. **Před nasazením** vyřešit AWS: značky i modely z cizí adresy, `crossOrigin` kvůli exportu PNG.
3. **Další vrstvy v pořadí:** povrchy (ambientCG, Poly Haven), koupelna (Sweet Home 3D + vlastní materiály, kout), generátor linky.
4. **Dotyk na tabletu** nikdo nezkoušel.
5. **Stránka analýzy** v nákladech ještě uvádí Cloudflare R2, Libor navrhl AWS.
