# Modul: Zákaznická aplikace (app.tuptudu.com)

## Co modul dělá
Část pro zákazníky: registrace, přihlášení, projekty (editor V3), účet.
Masterteam (`masterteam.tuptudu.com`) a veřejný web (`tuptudu.com`) jsou oddělené
subdomény s vlastní session — viz `config/domeny.php`.

## Aktuální stav (2026-10-27, lokálně, necommitováno)
- Registrace e-mailem i přes Google, ověření e-mailu, zapomenuté heslo.
- Projekty: editor V3 pod `/projects/{kod}`, úvodní obrazovka pro první projekt.
- Účet: jméno, e-mail (změna = nové ověření), jazyk, země, heslo.
- Právní stránky `/terms`, `/privacy` na webu — **NÁVRH textu, čeká na právníka**.
- **Neudělané:** texty editoru V3 jsou česky (překlad = samostatný krok); katastrální
  panel V3 se v zemích bez katastru ještě nezobrazuje skrytý — blokuje ho jen server (404);
  přehled projektů a tarify až později.

## Adresy (anglicky — vidí je zákazník)
| Adresa | Co | Kód |
|---|---|---|
| `/` | → `/projects` (nepřihlášený → `/login`) | `routes/web.php` |
| `/projects` | poslední projekt, bez projektů úvodní obrazovka; `?id=` → `/projects/{kod}` | `Aplikace\ProjektyController@index` |
| `/projects/{kod}` | editor V3 | `ProjektyController@editor` |
| `POST /projects` | založení prvního projektu | `ProjektyController@novy` |
| `/editor/*` | API editoru (ukládání, podklady, katastr) | `Masterteam\KonceptV3Controller`, `KonceptV3PodkladController` |
| `/account` | účet | `Aplikace\UcetController` |
| `/register`, `/login`, `/forgot-password`, `/reset-password/*`, `/email/verify*` | Fortify | `FortifyServiceProvider`, `app/Actions/Fortify` |

Všechny zákaznické routy: `subdomena:app`, `auth`, `verified`.

## Editor V3 ve dvou místech
- Jedna šablona `resources/views/masterteam/koncept-v3.blade.php`. Proměnné
  `$trasaV3` (předpona názvů rout) a `$layoutV3` (layout) — výchozí masterteam,
  aplikace předává `app.projekty` + `layouts.zakaznik`.
- API routy aplikace mají stejné přípony názvů jako masterteam
  (`app.projekty.ulozit` ↔ `masterteam.koncept-v3.ulozit`).
- JS editoru se neměnil: přepíná projekty přes `indexK + '?id=' + id`,
  aplikace to na serveru převede na `/projects/{kod}`. Interní API používá dál číselné id.
- `KonceptV3PodkladController::trasa()` skládá adresy obrázků podle předpony
  routy, přes kterou přišel request. Uložené adresy podkladu jsou proto vázané na
  subdoménu, kde vznikly (projekt z masterteamu otevřený v app podklad nenačte).

## Kód projektu
`koncepty_v3.kod` — 5 znaků z abecedy bez zaměnitelných znaků (`abcdefghjkmnpqrstuvwxyz23456789`,
~28 mil. kombinací), generuje `KonceptV3::novyKod()` při vytvoření. Když se po 10 pokusech
nedaří najít volný, prodlouží se (sloupec má 12 znaků).

## Registrace a účty
- `CreateNewUser`: jen na app (masterteam → přesměrování), povinný souhlas s podmínkami
  → `uzivatele.souhlas_podminky_v`; jazyk a země z aktuální návštěvy.
- Google (`GoogleController`): na app založí nový účet (souhlas textem u tlačítka,
  e-mail ověřený Googlem), na masterteamu jen existující účty.
- E-maily `App\Notifications\OvereniEmailu`, `ObnovaHesla` — texty `lang/*/emaily.php`,
  jazyk podle `Uzivatel::preferredLocale()`. Šablona Laravelu přeložená v `lang/cs.json`.
- Tokeny obnovy hesla: tabulka `reset_hesel`.
- Lokálně `MAIL_MAILER=log` → e-maily (i odkazy) jsou v `storage/logs/laravel.log`.

## Layouty
- `components/layouts/zakaznik` — hlavička (logo, jazyk, účet, Masterteam pro členy týmu, odhlásit), Tailwind + Alpine pro editor.
- `components/layouts/prihlaseni` — login, registrace, hesla, ověření.
- Právní stránky: `pravni/stranka` + `pravni/{podminky,soukromi}-{jazyk}` (chybí-li jazyk → en).

## Před spuštěním pro veřejnost
1. Právník zkontroluje `/terms` a `/privacy` (hranaté závorky = doplnit), pak odstranit pruh NÁVRH a `noindex`.
2. Doplnit název společnosti hostingu do zásad.
3. Přeložit editor V3 a skrýt katastrální panel mimo země s katastrem.
