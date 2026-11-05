# Modul: Lokalizace (jazyk a země)

## Co modul dělá
Zákaznická část (web `tuptudu.com`, aplikace `app.tuptudu.com`) umí víc jazyků
a podle země uživatele zapíná národní služby (katastr…). **Jazyk a země jsou
oddělené**: Kazach může mít ruštinu a Kazachstán, Švýcar němčinu a Švýcarsko.

Masterteam je interní a **vždy česky** — nepřekládá se.

## Aktuální stav
- Aktivní jazyky: **cs** (zdrojový), **en** (výchozí i záložní — chybějící text se ukáže anglicky), **sk, pl, de, fr, es, it** (od 4. 11. 2026, přeložil Claude, rodilí mluvčí to zatím nekontrolovali).
- **Oslovení:** tykání všude kromě právních dokumentů (du, tu, ty, tú). Mimo češtinu se tarify jmenují Home a Pro.
- Pořadí napojení národních služeb (potvrdil Libor 4. 11. 2026): vlna 1 sk, pl, vlna 2 de s Rakouskem, fr, vlna 3 es, it. Rozbor po zemích: https://claude.ai/artifact/NCyfAVyDQ1R9aUTMoMKaGo, část Jazyky a země.
- Přeložené: titulka webu, přihlášení, registrace, hesla, ověření e-mailu, e-maily,
  účet, úvodní obrazovka, hlavička aplikace, právní stránky (celé dokumenty cs/en).
- SEO články se zatím nepřekládají (Libor 4. 11. 2026).
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
- Nesouvislé věty neskládat, jeden text s parametry. Názvy podlaží generuje `autoNazevPodlazi`, ruční `vlastniNazev` se nemění.

## Jak přidat jazyk
1. Zkopírovat `lang/en/` do `lang/{kod}/` a přeložit (odborné stavařské termíny nechat zkontrolovat rodilým mluvčím).
2. Přidat řádek do `jazyky` v `config/lokalizace.php`.
3. `php artisan preklady:kontrola` musí hlásit „Překlady jsou úplné".

## Jak přidat zemi / národní službu
- Služba v zemi: doplnit kód služby do `zeme.{KÓD}` v `config/lokalizace.php`.
- Katastrální parcely jdou přes INSPIRE (celoevropský standard) — v jiných zemích EU
  by stačilo napojit jejich službu; výškový profil a mapový podklad se řeší zvlášť.

## Národní domény (až podle zájmu)
Jedna aplikace pro všechny domény: host do `config/domeny.php` (`web`) a do
`lokalizace.domeny` s výchozím jazykem a zemí. Aplikace zůstává na `app.tuptudu.com`.
