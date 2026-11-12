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
- V zemích bez služby editor skrývá hledání parcely a volbu mapového podkladu (`@funkce`), mřížka v panelu zůstává. Ruční pozemek a napojení parcel na Slovensku a v Polsku jsou další kroky.
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

## Jak přidat zemi / národní službu
- Služba v zemi: doplnit kód služby do `zeme.{KÓD}` v `config/lokalizace.php`.
- Katastrální parcely jdou přes INSPIRE (celoevropský standard) — v jiných zemích EU
  by stačilo napojit jejich službu; výškový profil a mapový podklad se řeší zvlášť.

## Úkol v plánu: parcely v Evropě přes INSPIRE (zadal Libor 9. 11. 2026)
Hledání parcely a obrys pozemku dnes umí jen Česko (ČÚZK). INSPIRE je směrnice EU (2007/2/ES), podle níž
každý členský stát zveřejňuje mimo jiné katastrální parcely jako mapové služby (WMS, WFS) ve společném
datovém modelu. Jedno napojení na tento model by tak šlo použít ve více zemích.
- Cíl: v dalších zemích zapnout `katastr` (hledání parcely, obrys pozemku do editoru) přes jejich službu INSPIRE.
- Pořadí jako u jazyků: SK a PL, potom DE s Rakouskem, FR, ES a IT.
- Do té doby platí ruční pozemek (také v plánu).

### Rozbor 12. 11. 2026: parcely a výšky v Evropě
**Jedna celoevropská služba v kvalitě ČR neexistuje**, ani pro parcely, ani pro výšky.
- Výšky pro celou Evropu jsou jen hrubé: Copernicus GLO-30 (30 m, zdarma) je model povrchu včetně stromů
  a domů, chyba je v metrech. Na zeminu (mřížka 2 m) nepoužitelné. EEA-10 (10 m) je jen pro vybrané úřady.
  Celoevropský LiDAR model neexistuje, TU Delft má jen katalog (European Point Cloud Portal).
- Open Cadastral Map (EuroGeographics, OME2) je prototyp s odkazy na národní stahování, projekt skončil 2025.
- **Pomáhá nařízení EU 2023/138 (datové sady s vysokou hodnotou, HVD):** od června 2024 musí každý stát EU
  dát katastrální parcely, budovy i výškový model pod CC BY 4.0 (nebo volněji), přes API a ke stažení.
  Praxe zaostává (Bavorsko, Rakousko). Licence CC BY = uvést zdroj v editoru a v zásadách (čl. 4).
- ČÚZK parcely už bereme přes INSPIRE WFS (`CuzkWfsClient`), parser modelu INSPIRE CP jde použít i jinde.

Služby vyzkoušené 12. 11. 2026 (dotaz z lokálu, odpověď s daty):

| Země | Parcely | Výšky |
|---|---|---|
| PL | ULDK `uldk.gugik.gov.pl`: parcela v bodě (`GetParcelByXY`) i podle čísla TERYT, vrací WKT | `services.gugik.gov.pl/nmt`: `GetHByPointList` výšky seznamu bodů (EPSG:2180), model 1 m |
| FR | API Carto `apicarto.ign.fr/api/cadastre/parcelle?geom=` GeoJSON, i podle obce, sekce a čísla | `data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json`, RGE ALTI 1 m, více bodů naráz |
| SK | WFS `inspirews.skgeodesy.sk/geoserver/cp/ows`, CC BY 4.0 | WCS `inspirews.skgeodesy.sk/geoserver/el/ows`, DMR 5.0 1 m celé SK, EPSG:3046, výřez jako GeoTIFF |
| ES | Catastro jen přes `http://` (https vrací HTML): `Consulta_RCCOOR` bod → referencia, WFS `INSPIRE/wfsCP.aspx` bbox i referencia. Baskicko a Navarra mají vlastní katastr | WCS `servicios.idee.es/wcs-inspire/mdt`, nejjemněji 5 m (`Elevacion25830_5`), 2 m jen ke stažení |
| IT | WFS `wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php`, CC BY 4.0, EPSG:6706, jen číslo a obrys bez výměry | národně jen asi 10 m (TINITALY), 1 m LiDAR po regionech; neověřeno |
| DE | po spolkových zemích; podle bavorského sněmu všechny zdarma kromě Bavorska (tam vektor za poplatek). NRW ověřeno: `wfs.nrw.de/geobasis/wfs_nw_alkis_vereinfacht`, dl-de/zero | DGM1 1 m otevřený ve všech zemích (od 2024); BKG má celoněmecký DGM1 přes WCS, licence neověřena |
| AT | BEV katastr CC BY 4.0 ke stažení (stav k datu), INSPIRE WFS má v metadatech „fees, restricted“ | BEV ALS-DGM 1 m celé AT, CC BY 4.0, jen soubory COG (55 dlaždic, EPSG:3035) |

Technické poznámky:
- Hledání podle čísla parcely se v každé zemi skládá jinak (CZ KÚ + číslo, PL TERYT, FR obec + sekce + číslo,
  ES 14 znaků, IT obec + list + parcela, DE Gemarkung + Flur + Flurstück). Společná cesta pro všechny země je
  klik do mapy → parcela v bodě (umí všechny ověřené služby), číslo jako doplněk po zemích.
- Výšky: PL a FR vrací čísla pro seznam bodů (jako náš dotaz na DMR 5G). WCS (SK, ES, BKG) vrací rastr výřezu,
  potřeba čtečka GeoTIFF v PHP (nekomprimovaný float32 je jednoduchý). Soubory COG (AT, Copernicus) chtějí čtení
  po částech přes HTTP Range, pracnější.
- Radon a geologie (ČGS) a české druhy pozemků zůstávají jen pro ČR.

## Národní domény (až podle zájmu)
Jedna aplikace pro všechny domény: host do `config/domeny.php` (`web`) a do
`lokalizace.domeny` s výchozím jazykem a zemí. Aplikace zůstává na `app.tuptudu.com`.
