# TupTuDu.com — Pravidla pro Claude Code

## Jazyk
- Commit messages, komentáře v kódu a komunikace: **česky**
- Ceny a náklady uvádět v **CZK**

## Workflow — obecný vývoj
- Před úpravou kódu vždy přečíst aktuální stav souboru
- Preferovat úpravu existujících souborů před vytvářením nových
- Push jen funkční kód — otestovat lokálně před push
- **Netvrdím "hotovo"** dokud neukážu výsledek testu / dry-runu

## Workflow — ověřování změn
- Po každé změně ověřit 3 vrstvy: (1) backend výstup, (2) JS zpracování, (3) vizuální výsledek
- **Nikdy neopravovat symptom** — nejdřív zmapovat celý datový tok
- **Max 2 debug cykly** — pokud po 2 opravách problém trvá, přehodnotit přístup od základu

## Hlášení chyb z frontendu — POVINNÉ u každého `catch`

**V `catch` bloku nikdy nenechávat holý `alert()` ani prázdné `.catch(() => {})`.** Helpery jsou v `resources/views/partials/error-tracker.blade.php` (includuje ho každý layout):

```js
// ŠPATNĚ — uživatel chybu vidí (nebo ani to ne), my se o ní NIKDY nedozvíme
catch (e) { alert('Uložení selhalo: ' + e.message); }

// SPRÁVNĚ — hláška uživateli + zápis do /masterteam/bugy (stack + kontext)
catch (e) { chybaUzivateli(e, 'Uložení nastavení', { firmaIco }); }

// SPRÁVNĚ — stránka má vlastní hlášku (status text, notifikace) → jen tichý zápis
.catch(err => { showStatus('Chyba připojení'); window.zalogujChybu?.(err, 'Doklady: smazání', { dokladId }); });
```

- **Proč:** `window.onerror` zachytí jen NEODCHYCENÉ chyby. Cokoli v `try/catch` je pro hlásič neviditelné — a přitom jsou to ty nejbolestivější případy (nepovedený upload, neuložená práce). Uživatelé chyby nehlásí, radši mlčky odejdou; co nezachytíme automaticky, to nevíme.
- **Typicky „JSON chyby":** `r.json()` nad HTML odpovědí (500, 413, přesměrování na login) spadne do `catch` jako `Unexpected token '<'` — bez zápisu by zmizela beze stopy.
- **Platí i pro `fetch`**, kde se chyba řeší přes `if (!r.ok)` nebo `d.ok === false` a jde o neočekávané selhání (ne běžnou validační hlášku).
- **Do 3. parametru předat kontext k ladění** — ID záznamu, parametry akce, rozepsaná data formuláře. Citlivé klíče (heslo, token, PIN…) filtruje helper sám, velikost je omezená na 2000 znaků. Hesla do kontextu raději vůbec nedávat.
- **Při psaní nového frontend kódu tyhle body doplňovat rovnou**, bez vyzvání uživatele.
- Server se hlásí sám: neošetřené výjimky (`bootstrap/app.php`), každé `Log::error`/`critical` (`ZrcadliLogDoBugu`), výpadky AI (`Bug::nahlasVypadekAi` v `ClaudeApi`/`RagEmbedding`), hromadné 419, 404 (`seo_404`), pomalé GET stránky nad 3 s (`MeriPomaleRequesty`, jen mimo lokál; typ `pomaly_request` v menu není) a HTML odpověď bez layoutu (`KontrolaHtmlLayoutu`). Endpoint, který záměrně vrací HTML fragment, pošle hlavičku `X-Layout-Partial: 1`.
- **Selhání ve vlastním `catch` na serveru hlásit přes `Log::error(...)`** — zrcadlí se do bugů. `Log::warning` a nižší zůstávají jen v laravel.log.
- **E-mail o nových závažných bugech** (úroveň `error`): `bugy:notifikace` přes `/cron/bugy/{CRON_TOKEN}` — souhrnně, max 1 za 10 min, denní strop `BUGY_NOTIFIKACE_MAX_DEN`, adresa `BUGY_NOTIFIKACE_EMAIL`. Opakování aktivního bugu mail neposílá.
- Podrobnosti (co se zachytává, šum, příkazy, odchylky od Kalkulia, stav nasazení): `modules/bugy.md`.

## Překlady — zákaznická část (web, app)
- Texty, které uvidí zákazník, **nikdy natvrdo česky** — Blade `__('skupina.klic')`, JS `preloz('skupina.klic')`. Nový text rovnou do `lang/cs` i `lang/en`, pak `php artisan preklady:kontrola`.
- Národní služby (katastr, výškový profil, mapový podklad) jen přes profil země: `@funkce('katastr')`, middleware `funkce:katastr`, `Lokalizace::maFunkci()`.
- Masterteam je jen česky, nepřekládá se. Podrobnosti: `modules/lokalizace.md`.

## Brand
- Veškerý UI stav projektu se ukládá konzistentně — promyslet stav i invalidaci PŘEDEM
- Brand barvy NIKDY nehard-codovat hex — vždy CSS proměnné (`var(--c-primary)` atd.)

## Správa kontextu
- Na začátku práce na modulu přečíst příslušnou dokumentaci, pokud existuje
- Na konci sezení nebo na výzvu **"aktualizuj kontext"**: aktualizovat příslušný modul
- Pokud chybí kontext: říct to a požádat o příslušný soubor — nikdy nedomýšlet

---

**Tento soubor je zatím minimální** — další detaily (tech stack, deploy, moduly, hosting)
si doplním postupně podle potřeby.
