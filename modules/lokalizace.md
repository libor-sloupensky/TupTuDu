# Modul: Lokalizace (jazyk a země)

## Co modul dělá
Zákaznická část (web `tuptudu.com`, aplikace `app.tuptudu.com`) umí víc jazyků
a podle země uživatele zapíná národní služby (katastr…). **Jazyk a země jsou
oddělené**: Kazach může mít ruštinu a Kazachstán, Švýcar němčinu a Švýcarsko.

Masterteam je interní a **vždy česky** — nepřekládá se.

## Aktuální stav
- **Na webu od 5. 11. 2026:** všech osm jazyků včetně editoru, jazyk v adrese, přesměrování podle země, hreflang a sitemapa.
- **Vlastní kontrola 9. 11. 2026:** každý jazyk prošel nezávislý agent proti cs a en, opraveno sk 3, pl 11, de 17, fr 24, es 10, it 10 míst (termíny základů a podlaží, rod, typografie, množné číslo autorů v pl). Nejistoty, které zůstaly, jsou drobné a vkusové. Test editoru ve všech jazycích prošel.
- Aktivní jazyky: **cs** (zdrojový), **en** (výchozí i záložní — chybějící text se ukáže anglicky), **sk, pl, de, fr, es, it** (od 4. 11. 2026, přeložil Claude, rodilí mluvčí to zatím nekontrolovali).
- **Oslovení:** tykání všude kromě právních dokumentů (du, tu, ty, tú). Mimo češtinu se tarify jmenují Home a Pro.
- Pořadí napojení národních služeb (potvrdil Libor 4. 11. 2026): vlna 1 sk, pl, vlna 2 de s Rakouskem, fr, vlna 3 es, it. Rozbor po zemích: https://claude.ai/artifact/NCyfAVyDQ1R9aUTMoMKaGo, část Jazyky a země.
- Přeložené: titulka webu, přihlášení, registrace, hesla, ověření e-mailu, e-maily,
  účet, úvodní obrazovka, hlavička aplikace, právní stránky (celé dokumenty cs/en).
- SEO články: každý vychází ve všech jazycích jako verze pro zemi, propojené klíčem `klic:` a hreflang (od 9. 11. 2026, modules/blog.md, Jazyky a země).
- Pozemek a výšky fungují v CZ, SK, PL, FR, ES, IT, DE a AT přes výběr na mapě (od 12. 11. 2026, část Pozemky v Evropě). Hledání podle čísla parcely a ČGS jen v ČR.
- **Editor je přeložený** (5. 11. 2026): texty ve skupinách `ed_sablona`, `ed_ui`, `ed_dum`, `ed_kresba`, `ed_ral`, `ed_nastroje`, `ed_katalog`, načítají se jen na stránce editoru. Názvy kusů katalogu přes `ed_katalog` podle českého názvu, nový kus bez překladu zůstane česky. Skrytý AI panel přeložený není, je určený ke smazání. Data z ČÚZK a ČGS a popisy kroků historie zůstávají v jazyce, v němž vznikly. Katastr hlídá i server (`funkce:katastr`).
- Test: `node services/import-test/test-jazyky-editor-ui.cjs` projde editor ve všech jazycích.

## Kde co je
| Co | Soubor |
|----|--------|
| Nastavení (jazyky, země a jejich služby, národní domény) | `config/lokalizace.php` |
| Stav requestu (jazyk, země, `maFunkci()`) | `app/Support/Lokalizace.php` |
| Určení jazyka a země | `app/Http/Middleware/NastavLokalizaci.php` (web skupina) |
| Ochrana routy podle země | `app/Http/Middleware/VyzadujFunkci.php` (alias `funkce:`) |
| Texty PHP/Blade | `lang/{jazyk}/*.php` |
| Texty JS + `preloz()` | `lang/{jazyk}/js.php`, `resources/views/partials/lokalizace-js.blade.php` |
| Přepínač jazyka | `resources/views/partials/prepinac-jazyka.blade.php`, routa `/jazyk/{kod}` |
| Kontrola úplnosti | `php artisan preklady:kontrola` |
| Sloupce uživatele | `uzivatele.jazyk`, `uzivatele.zeme` (NULL = neurčeno) |

## Jak se určí
- **Jazyk** (pravidlo od Libora):
  1. jazyk v adrese webu (`tuptudu.com/de/pricing`), zároveň se uloží do session,
  2. zvolený — účet, jinak přepínač (session),
  3. jazyk země příchodu — národní doména, jinak poloha podle IP (`jazyk_zeme` v configu; jen aktivní jazyky),
  4. `en`.
  Jazyk prohlížeče se nepoužívá. Země může mít seznam jazyků (`'SK' => ['sk', 'cs']`
  — Slovák dostane češtinu, dokud nebude slovenština).
- **Adresy webu:** každá stránka má adresu s jazykem kvůli vyhledávačům (hreflang v hlavě i v sitemapě). Adresa bez jazyka (`/`, `/pricing`) jen přesměruje podle volby a polohy. `Domeny::url('web', '/pricing')` jazyk doplní sám, `route()` taky (`URL::defaults`). Bez jazyka zůstávají technické adresy a sdílený odkaz (`Domeny::WEB_BEZ_JAZYKA`). Nová stránka patří do skupiny `{jazyk}` v `routes/web.php` a do `SeoController::STRANKY_WEBU`. Aplikace `app.tuptudu.com` jazyk v adrese nemá a neindexuje se.
- **Země u jazyka v adrese:** `zeme_jazyka` (`cs` → `CZ`), takže `/cs` ukáže i z ciziny katastr a Kč, jinak by je Google z USA neviděl. Návštěvník ze země s tím jazykem (Slovák na `/cs`) si svou zemi nechá.
- **Chybějící text** se doplní z angličtiny (`APP_FALLBACK_LOCALE=en`), ne z jazyka země.
- **Země:** nastavení uživatele → národní doména → poloha podle IP → `CZ` (dokud jsou zákazníci jen z ČR).
- **Masterteam:** `masterteam_jazyk` = `cs` → jazyk napevno, poloha podle IP se nezjišťuje.
  Až se bude překládat: nastavit `null` (a do layoutu masterteamu přidat odkaz na DB-IP).

## Poloha podle IP (DB-IP Lite)
- Lokální databáze `storage/app/poloha/dbip-country-lite.mmdb` (~8 MB, není v gitu),
  čte `App\Support\PolohaIp`. Nikam se nic neposílá. Přednost má hlavička `CF-IPCountry` (Cloudflare).
- Aktualizace: `php artisan poloha:aktualizovat`, týdně ze společného cronu (`App\Support\PlanovaneUlohy`,
  hosting volá `/cron/bugy/{token}` à 15 min — nic dalšího se nenastavuje). Bez databáze je země příchodu neznámá → jazyk `en`, země `CZ`.
- **Licence CC BY 4.0:** každá stránka, která výsledek používá, musí mít odkaz
  „IP Geolocation by DB-IP" → je v patičce `partials/paticka`, v editoru samostatně `partials/poloha-zdroj`.
- Lokálně má 127.0.0.1 zemi neznámou → `en`.
- Přepínač ukládá volbu do session a přihlášenému i do účtu.

## Jak psát nový kód
```blade
{{ __('aplikace.vitejte') }}                 {{-- text --}}
@funkce('katastr') … @endfunkce              {{-- jen v zemích s katastrem --}}
<html lang="{{ app()->getLocale() }}">
@include('partials.lokalizace-js')           {{-- na stránce, kde JS potřebuje texty --}}
```
```js
preloz('obecne.chyba_spojeni');
preloz('koncepty.smazat', { nazev: 'Můj dům' });     // :nazev v textu
window.TT_LOKALIZACE.funkce.includes('katastr');
```
```php
Route::post(...)->middleware('funkce:katastr');      // jinde 404
Lokalizace::maFunkci('katastr');
```
- Klíče česky, seskupené podle oblasti (`prihlaseni.*`, `aplikace.*`, `web.*`, `obecne.*`).
- Nový text vždy rovnou do `lang/cs` **i** `lang/en`, pak `php artisan preklady:kontrola`. Ostatní jazyky hromadně před každým nasazením, do té doby v nich platí angličtina a kontrola je hlásí.
- Do `js.php` jen to, co JS opravdu potřebuje — posílá se celé na každou stránku.
- Chybějící JS klíč se tiše zapíše do bugů (`zalogujChybu`) a zobrazí se klíč.

## Editor
- Blade `{{ __('ed_sablona.klic') }}`, JS a Alpine `preloz('ed_dum.klic', { nazev })`.
- Počty: `prelozPocet('ed_dum.sten', n)`, text `one=:pocet stěna|few=:pocet stěny|other=:pocet stěn`, kategorie podle jazyka. Čísla ve větách `prelozCislo(x, 2)`.
- Moduly běžící i v Node testech (`stavebni-engine.js` a další) volají `tx()`, který bez slovníku vrátí klíč.
- Do bugů (`zalogujChybu`, `chybaUzivateli` jako akce) a do konzole se píše česky.
- **Názvy v datech projektu:** uživatelský text se nikdy nepřekládá. Výchozí názvy se generují ze slovníku při načtení projektu: podlaží podle typu a pořadí (`vlastniNazev` = ruční), místnosti z `auto` (`{ k: 'mistnost_n', n: 3 }` nebo `{ k: 'prostor_obyvak' }`, přejmenováním zmizí), kusy katalogu podle českého `nazevZdroj` přes `ed_katalog`. Místnosti ze starších projektů `auto` nemají a zůstávají, jak jsou.
- **Vzorový koncept pro obrázky do článků:** u každé místnosti vybrat druh (ruční název shodný s druhem se tím stane výchozím, `modules/dum.md`), u podlaží s ručním názvem název smazat, pak se přepíná celý. Popisy kroků historie a data z katastru zůstávají.
- Nesouvislé věty neskládat, jeden text s parametry. Názvy podlaží generuje `autoNazevPodlazi`, ruční `vlastniNazev` se nemění.

## Jak přidat jazyk
1. Zkopírovat `lang/en/` do `lang/{kod}/` a přeložit. Překlad od Clauda je finální, rodilí mluvčí ho nekontrolují (Libor 9. 11. 2026). Po každém překladu proto následuje vlastní kontrola nezávislým agentem: věcná shoda s cs/en, odborné stavařské termíny, oslovení, zástupné symboly a tvary množného čísla.
2. Přidat řádek do `jazyky` v `config/lokalizace.php`.
3. `php artisan preklady:kontrola` musí hlásit „Překlady jsou úplné".

## Pozemky v Evropě (od 12. 11. 2026, Libor: „jednotně pro všechny regiony přes mapové podklady“)
**Výběr pozemku na mapě** je jeden postup pro všechny země: panel Parcela → „Vybrat pozemek na mapě“ → hledání místa
(Mapy.com), vrstva hranic parcel podle země, klik na parcelu, nebo obkreslení pozemku tam, kde katastr chybí.
**Zemi určuje poloha pozemku, ne země uživatele** (Čech, který staví na Slovensku, dostane slovenský katastr).
Hledání podle katastrálního území a čísla zůstává jen pro ČR (`@funkce('katastr')`, routa `land/parcel`).

| Co | Soubor |
|----|--------|
| Zdroje dat po zemích, vrstvy parcel, atribuce, rozlišení výšek | `config/pozemky.php` |
| Vstup pro editor (parcela v bodě, okolí, stavby, výškový profil, co je v místě) | `app/Services/Pozemky/Pozemky.php` |
| Napojení zemí | `app/Services/Pozemky/Zdroje/*` |
| Hranice států a německých spolkových zemí (Natural Earth 1:10m, zjednodušené) | `resources/data/hranice-*.json`, `Hranice.php` |
| Geoid EGM2008 pro Evropu (výšky nad elipsoidem → nadmořské) | `resources/data/geoid-egm2008-evropa.bin`, `Geoid.php` |
| Čtečky rastrů bez GDAL: GeoTIFF/BigTIFF (Deflate, LZW, prediktory), ASCII Grid, COG po částech | `GeoTiff.php`, `AsciiGrid.php`, `Cog.php` |
| Mapa výběru (Leaflet 1.9.4 v `public/js/leaflet`) | `public/js/koncept-v3/mapa-pozemku.js`, `partials/mapa-pozemku.blade.php` |
| Přidání parcely do projektu (číslo i mapa, sousednost ve WGS84) | `_katastrPridejParcelu` v `koncept-k-ui.js` |
| Ověření skutečnými dotazy na náhodná místa | `php artisan pozemky:over [--zeme=PL,FR] [--mist=3] [--seed=7]` |
| UI test (8 míst v 6 zemích, přidání, sousednost, obkreslení v Rakousku) | `node services/import-test/test-mapa-pozemku-ui.cjs` |

Stav ověřený 12. 11. 2026 (`pozemky:over` 3 místa na zemi: 148 kontrol v pořádku, jediná „chyba“ bod na nábřeží
v Annecy, které francouzský katastr jako parcelu nevede; UI test celý v pořádku):

| Země | Parcely (v bodě / okolí / stavby) | Výšky | Zvláštnosti |
|---|---|---|---|
| CZ | ČÚZK WFS CPX / ano / ano | DMR 5G, výřez `exportImage` v S-JTSK, 1 m | dřív identify bod po bodu (4000 m² přes 40 s), teď ~1 s, hodnoty shodné na cm |
| SK | ÚGKK INSPIRE WFS (GeoJSON) / ano / ne | DMR 5.0 1 m, WCS EPSG:3046 | **výšky nad elipsoidem** (Kriváň 2537 m), odečítá se EGM2008 (→ 2494,3 m, úředně 2494,7). Vrstva parcel posílá `Cross-Origin-Resource-Policy: same-origin`, jde přes náš server s mezipamětí (`land/tile/SK`, `storage/app/dlazdice`) |
| PL | GUGiK ULDK / ne (neumí obálku) / ne | NMT `GetHByPointList`, EPSG:2180 v pořadí sever východ, 1 m | ULDK občas vrátí chybu místo výsledku, opakuje se |
| FR | API Carto (PCI Etalab) / ano / BD TOPO | RGE ALTI 1 m, **POST** se všemi body | souběžné GET služba omezuje (HTTP 429). Silnice a veřejná prostranství nejsou parcely |
| ES | Catastro INSPIRE WFS, jen `http://` / ano / ano | MDT05 5 m, **ASCII Grid** zarovnaný na mřížku 5 m | GeoTIFF dává jen celé metry. Katastr má ochranu proti robotům: plná hlavička prohlížeče a opakování. Baskicko a Navarra mají vlastní katastr (nenapojeno) |
| IT | Agenzia Entrate WFS / ano / ne | TINITALY 10 m (WCS, text) | služba odpovídá 8–32 s (WFS 1.1 vrací chybu), čekání 40 s. Výměru nedává, počítá se z obrysu. Trento a Bolzano mají vlastní katastr |
| DE | WFS 15 spolkových zemí (ALKIS vereinfacht, INSPIRE, Berlín a Brémy vlastní pole) / ano / ne | BY (body), NW, HE, BB, BE, MV (WCS), 1 m | **Bavorsko vektor zdarma nedává** (jen mapa bez čísel, pozemek se obkreslí). TH a MV jen v UTM, SN v ETRS89. Číslo parcely z Flurstückskennzeichen. Výšky BW jen celé metry, NI a RP jen soubory, ostatní nic → bez profilu |
| AT | katastr BEV přes WFS placený → obkreslení | BEV ALS-DGM 1 m, COG 50 × 50 km (EPSG:3035) po dlaždicích přes HTTP Range | vydání ve složce `20250915`, nové vychází v září |

- **Ověřovat vždy skutečným dotazem** (Libor: „při zavádění výšek v ČR jsme na nefunkční API přišli náhodou“). `pozemky:over` kontroluje: bod leží uvnitř obrysu, úřední výměra sedí s plochou obrysu (přehozené osy nebo špatná projekce dají jiné číslo), pokrytí mřížky výšek, různé hodnoty, srovnání s EU-DEM 25 m (OpenTopoData). Model terénu bývá v lese a zástavbě níž než EU-DEM, upozornění od −8 m je normální; kladný rozdíl přes 6 m je chyba (tak se našlo Slovensko).
- Nová země: zdroj do `Zdroje/`, řádek do `config/pozemky.php`, místa do `PozemkyOver::MISTA`, pak `pozemky:over --zeme=XX --mist=6`.
- Celoevropská data v kvalitě ČR nejsou: Copernicus 30 m měří povrch se stromy a domy, na zeminu nepoužitelný. Pomáhá nařízení EU 2023/138 (HVD): parcely, budovy i výškový model zdarma pod CC BY 4.0 přes API, praxe zaostává (Bavorsko, Rakousko). Zdroj dat ukazuje panel Parcela (`katastrAtribuce`), u CC BY povinné.
- **Ceník a vitrína webu** (`partials/tarif-funkce`, `@funkce('katastr' | 'mapovy_podklad' | 'vyskovy_profil')`) zatím nabízí katastr, mapu a výšky jen návštěvníkům z ČR. Rozšíření na další země čeká na Libora.
- **Zásady ochrany soukromí čl. 4** píšou, že katastrální a výšková data načítá náš server. Vrstvu hranic parcel na mapě výběru ale načítá prohlížeč přímo od úřadu země (kromě Slovenska), ten vidí IP adresu. Před nasazením rozhodnout: upravit text, nebo vést všechny vrstvy přes server.
- Radon a geologie (ČGS) a české druhy pozemků jsou jen v ČR.

## Národní domény (až podle zájmu)
Jedna aplikace pro všechny domény: host do `config/domeny.php` (`web`) a do
`lokalizace.domeny` s výchozím jazykem a zemí. Aplikace zůstává na `app.tuptudu.com`.
