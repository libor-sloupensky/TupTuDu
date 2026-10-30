# Modul: Lokalizace (jazyk a země)

## Co modul dělá
Zákaznická část (web `tuptudu.com`, aplikace `app.tuptudu.com`) umí víc jazyků
a podle země uživatele zapíná národní služby (katastr…). **Jazyk a země jsou
oddělené**: Kazach může mít ruštinu a Kazachstán, Švýcar němčinu a Švýcarsko.

Masterteam je interní a **vždy česky** — nepřekládá se.

## Aktuální stav
- Aktivní jazyky: **cs** (zdrojový), **en** (výchozí i záložní — chybějící text se ukáže anglicky).
- Plán první vlny: de, fr, pl, it, es, sk (zatím neaktivní).
- Přeložené: titulka webu, přihlášení, registrace, hesla, ověření e-mailu, e-maily,
  účet, úvodní obrazovka, hlavička aplikace, právní stránky (celé dokumenty cs/en).
- Editor V3 zatím **není** přeložený (texty natvrdo česky); katastr v aplikaci hlídá
  server (`funkce:katastr`), panel v editoru se zatím neskrývá. Viz `modules/aplikace.md`.

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
  1. zvolený — účet, jinak přepínač (session),
  2. jazyk země příchodu — národní doména, jinak poloha podle IP (`jazyk_zeme` v configu; jen aktivní jazyky),
  3. `en`.
  Jazyk prohlížeče se nepoužívá. Země může mít seznam jazyků (`'SK' => ['sk', 'cs']`
  — Slovák dostane češtinu, dokud nebude slovenština).
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
- Nový text vždy rovnou do `lang/cs` **i** `lang/en`, pak `php artisan preklady:kontrola`.
- Do `js.php` jen to, co JS opravdu potřebuje — posílá se celé na každou stránku.
- Chybějící JS klíč se tiše zapíše do bugů (`zalogujChybu`) a zobrazí se klíč.

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
