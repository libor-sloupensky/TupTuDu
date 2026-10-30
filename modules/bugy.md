# Modul: Hlásič bugů (`/masterteam/bugy`)

## Co modul dělá
Automaticky zachytává chyby serveru i prohlížeče, deduplikuje je (stejná chyba
1000× = 1 řádek s počtem výskytů) a o nových závažných posílá souhrnný e-mail.
Uživatelé chyby nehlásí — co nezachytíme sami, to nevíme.

Převzato 1:1 z Kalkulia (2026-10-25). Záměrné odchylky jsou níže — při další
synchronizaci je nepřepsat.

## Aktuální stav
- **Nasazeno na produkci 2026-10-27** (commit `7998f06`), migrace proběhly. E-mail ověřen
  (přes WebSMTP, commit `baf6a05`), DB proxy nasazena (`c1dfd93`). Po úklidu 0 aktivních bugů.
- GitHub Secrets `CRON_TOKEN` a `MAIL_PASSWORD_WEBSMTP`, hostingový cron na
  `https://www.tuptudu.com/cron/bugy/{CRON_TOKEN}` (min. perioda hostingu 15 min).
- Pošta z webu jde přes **WebSMTP** hostingu (`websmtp.cesky-hosting.cz:25`, login = `tuptudu.com`).
  Přímé SMTP (`smtp.cesky-hosting.cz:465`) hosting z PHP blokuje — „No route to host" (ověřeno 2026-10-27).
- Ruční otevření cronu ukáže u přeskočené úlohy i `poslední výsledek:` — tam je vidět selhání mailu.
- Subdomény `app.` a `masterteam.` nastavila podpora cesky-hosting.cz jako alias
  hlavního webu (svépomocí to nejde: vlastní `open_basedir`, symlinky zakázané).
- Testování z Git Bash: diakritiku v JSON posílat přes `curl --data-binary @soubor`,
  jinak ji Windows pošle ve špatném kódování a Apache vrátí falešné 400.

## Co se zachytává
| Zdroj | Typ / úroveň | Kde |
|-------|--------------|-----|
| Neošetřená výjimka | `server` / error | `bootstrap/app.php` → `report()` (vč. vstupu requestu bez hesel) |
| `Log::error` / `critical` | `server` / error | `app/Listeners/ZrcadliLogDoBugu.php` |
| Výpadek AI (Anthropic, Voyage, nedostatek kreditu) | `ai` / error | `Bug::nahlasVypadekAi()` v `ClaudeApi`, `RagEmbedding` |
| JS chyba, nezachycený promise, `zalogujChybu` / `chybaUzivateli` | `client` / error | `resources/views/partials/error-tracker.blade.php` → `POST /api/bug` |
| Nenačtený vlastní skript/styl, chyba před startem hlásiče | `client` / error | `resources/views/partials/hlasic-chyb-inline.blade.php` (v `<head>`) |
| Fatální pád jen v laravel.log (paměť, disk, PHP Fatal) | `server` / error | `bugy:hlidac-logu` (denně z cronu) |
| Hromadné 419 (rozbitá session) | `server` / warning | `bootstrap/app.php` → render 419 |
| HTML odpověď bez layoutu | `server` / warning | `KontrolaHtmlLayoutu` (opt-out hlavičkou `X-Layout-Partial: 1`) |
| Pomalá GET stránka > 3 s (jen mimo lokál) | `pomaly_request` / warning | `MeriPomaleRequesty` |
| Pomalé DB dotazy (`mysql.slow_log`, na sdíleném hostingu bez práv tiše nic) | `pomaly_dotaz` / warning | `bugy:pomale-dotazy` |
| 404 — ztracené URL | tabulka `seo_404` | `bootstrap/app.php` → render 404, záložka „404 (ztracené)" |

**Zahazuje se jako šum:** roboti, prohlížeče starší než Chrome 107 / Firefox 104 /
Safari 16, rozšíření prohlížeče, krypto peněženky, `Script error.`, `ResizeObserver
loop`, síťové výpadky (`Failed to fetch`…), prázdné odmítnutí promise, výjimky
z `artisan tinker`, 404/419/422/401/403 v `report()`.

## E-mail
- `bugy:notifikace` — jen při **vzniku** bugu úrovně `error` (opakování aktivního
  nic neposílá; opravený, který se vrátí, znovu nejdřív po 24 h).
- Jeden souhrnný mail za běh, denní strop `BUGY_NOTIFIKACE_MAX_DEN` (12), adresa
  `INTERNI_EMAIL` (společná pro interní zprávy, `libor@tuptudu.cz`; přebije ji `BUGY_NOTIFIKACE_EMAIL`). Odkazy přes `Domeny::url('masterteam', …)`.
- Lokálně `MAIL_MAILER=log` → mail jen v `storage/logs/laravel.log`.

## Kde co je
| Co | Soubor |
|----|--------|
| Model + deduplikace, `zachyt()`, `nahlasVypadekAi()` | `app/Models/Bug.php` (tabulka `bugy`) |
| Příjem z prohlížeče (filtry šumu, rate limit) | `app/Http/Controllers/BugController.php`, bez CSRF |
| Přehled / detail (vč. kontextu) | `app/Http/Controllers/Masterteam/BugyController.php`, `resources/views/masterteam/bugy/` |
| 404 | `app/Models/Seo404.php`, `Masterteam/Seo404Controller.php`, `resources/views/masterteam/seo404/` |
| Cron (notifikace 10 min, hlídač logu denně, pomalé dotazy) | společný plánovač `App\Support\PlanovaneUlohy` ← `/cron/{token}` i `/cron/bugy/{token}` |
| Ladění produkce (poslední chyby se stack trace) | `/cron/chyby/{token}` → `chyby:posledni` |
| Přímý pohled do produkční DB (Claude, workflow „oprav bugy" v CLAUDE.md) | `public/db-proxy.php` 1:1 z Kalkulia, token `CRON_TOKEN` (lokálně `PROD_CRON_TOKEN` v `.env`) |
| Příkazy | `bugy:vypis`, `bug:detail --id=`, `bugy:vyresit-vse [--ids=]`, `bugy:notifikace [--dry-run]`, `seo404:vypis`, `seo-404:cleanup` |
| Odkaz v menu s počtem | `resources/views/partials/sidebar.blade.php` (cache `bugy-aktivni-pocet` 60 s) |

## Odchylky od Kalkulia (nepřepisovat)
- `ZrcadliLogDoBugu` se **neregistruje ručně** — Laravel ho najde sám (auto-discovery);
  ruční `Event::listen` ho zdvojí. Kontrola: `php artisan event:list`.
- `report()` přeskakuje výjimky z `artisan tinker`.
- Cron je routa (`/cron/bugy/{token}` = `/cron/{token}`), ne `public/cron.php`; úlohy a intervaly ve společném `App\Support\PlanovaneUlohy` (2026-10-27).
- `error-tracker.blade.php` místo bundlu `app.js`; helpery existují i bez CSRF meta.
- Detail bugu zobrazuje blok „Kontext".
- `CRON_TOKEN` bez výchozí hodnoty v kódu (repo je veřejné).

## Ověření po nasazení
1. `https://www.tuptudu.com/cron/bugy/{CRON_TOKEN}` vypíše `--- bugy:notifikace …` (404 = špatný token).
2. Testovací chyba → do 15 min přijde mail (ověří SMTP `info@tuptudu.com`).
3. Po vyřízení subdomén: `https://masterteam.tuptudu.com/masterteam/bugy` se načte,
   `/.env` na `app.` i `masterteam.` vrací 404.
