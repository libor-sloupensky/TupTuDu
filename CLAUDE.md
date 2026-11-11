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

## Commity a nasazení — souběžná sezení
Vyvíjí se lokálně v jedné složce na větvi `koncept-v3`, souběžně v několika sezeních a bez vlastních větví. Na produkci se dává jen na povel.
- **Commit je rutina. Uživatele se na něj neptat a nepsat mu o něm.** Každé sezení commituje samo po každém dokončeném a otestovaném kroku. Souhlas dává tento odstavec, další není potřeba.
- **Nejdřív commit, potom shrnutí.** Závěrečnou zprávu uživateli psát až po commitu, aby popisovala commitnutý stav.
- **Jen své změny:** `git add <soubory>`, pak hned `git commit -m "…" -- <soubory>`. Nikdy `git add -A` ani `git commit -a`. Je-li v souboru i cizí rozdělaná změna, commitnout jen své řádky (`git apply --cached`).
- **Sezení se domlouvají mezi sebou.** Když jedno potřebuje commit od jiného, napíše mu a to commitne svou hotovou práci rovnou. Uživatel čísla sezení nevidí a nic si mezi nimi nepřeposílá, proto mu o nich nepsat. Když je zmínka nutná, popsat sezení tématem.
- **Push jen na přímý pokyn uživatele v daném sezení:** „dej to na web“ = commitnout své a `git push origin koncept-v3:main`. Odejde všechno commitnuté, rozdělaná práce zůstane lokálně.
- Větev `jazyky` je poslední výjimka. Další vlastní větve jen na výslovnou žádost.

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
- **E-mail o nových závažných bugech** (úroveň `error`): `bugy:notifikace` přes `/cron/bugy/{CRON_TOKEN}` — souhrnně, max 1 za 10 min, denní strop `BUGY_NOTIFIKACE_MAX_DEN`, adresa `INTERNI_EMAIL` (společná pro všechny interní zprávy vč. kontaktního formuláře; přebije ji `BUGY_NOTIFIKACE_EMAIL`). Opakování aktivního bugu mail neposílá.
- Podrobnosti (co se zachytává, šum, příkazy, odchylky od Kalkulia, stav nasazení): `modules/bugy.md`.

## Bugy v systému — „oprav bugy / oprav chyby" workflow
Když uživatel řekne **„oprav bugy"** (nebo „oprav chyby") bez podrobností, myslí **aktivní bugy na produkci** v [/masterteam/bugy](https://masterteam.tuptudu.com/masterteam/bugy) (tabulka `bugy`, model `App\Models\Bug`). Postup:
1. Obsah z produkce přes `public/db-proxy.php` (převzato z Kalkulia): POST JSON `{"sql": "SELECT …"}`, hlavička `X-DB-Token` = produkční `CRON_TOKEN`. Ten je **jen v lokálním `.env` jako `PROD_CRON_TOKEN`** — nikdy ho nevypisovat ani necommitovat:
   ```bash
   T=$(grep ^PROD_CRON_TOKEN= .env | cut -d= -f2-)
   curl -s -X POST https://www.tuptudu.com/db-proxy.php -H "X-DB-Token: $T" -H 'Content-Type: application/json' \
     --data-binary '{"sql":"SELECT id, typ, uroven, zprava, soubor, uri, pocet_vyskytu, naposledy_v FROM bugy WHERE opraveno=0"}'
   ```
   Stack trace a kontext: `SELECT stack_trace, kontext FROM bugy WHERE id=…`. Diakritiku v SQL posílat přes `--data-binary @soubor` (Git Bash jinak pošle špatné kódování → falešné 400).
2. Pro každý bug určit: **aktuální bug** vs. **šum / starý artefakt** (výpadky sítě, rozšíření prohlížeče, staré cache, testovací `ClaudeTest …`).
3. Aktuální bugy opravit v kódu; u šumu upravit hlásič, aby ho příště nezapisoval.
4. Vyřešené i artefaktové označit na produkci: `db-proxy.php?write=1` s `UPDATE bugy SET opraveno=1, opraveno_v=NOW() WHERE id IN (…)`. Opakovaný výskyt bug sám reaktivuje (dedup přes hash), předčasné označení neuškodí.
5. Po deployi ověřit stejným SELECTem, že se bug nevrací.
6. Uživateli vypsat, co v bugách bylo a co se s každým udělalo.

Proxy čte celou DB (i uživatele) — **jen SELECT** pro ladění; zápis (`?write=1`) jen na označení bugů nebo na výslovný pokyn. Žádné DROP/ALTER/TRUNCATE (proxy je stejně blokuje).

## Vzorový projekt — „použij vzorový projekt jako výchozí"
Libor upravuje „Vzorový projekt – pracovní" v Masterteamu. Na pokyn „použij ho jako výchozí" spustit `php artisan vzor:prevzit` (napřed `--dry-run`), commitnout `database/vzor`; na produkci se projeví po nasazení. Podrobnosti a podklad s osobními údaji: `modules/aplikace.md`, část Vzorový projekt.

## Překlady — zákaznická část (web, app)
- **Uživateli tykáme** všude, kde je to vhodné: web, aplikace, editor, e-maily i SEO články včetně titulků a popisů. V ostatních jazycích stejně (de du, sk a pl ty, es tú, it tu). **Výjimka: francouzsky vykáme (vous)**, tykání by tam působilo nezdvořile. Vykání nebo neosobní styl jen ve francouzštině a v právních dokumentech (podmínky, soukromí, vrácení peněz).
- Texty, které uvidí zákazník, **nikdy natvrdo česky** — Blade `__('skupina.klic')`, JS `preloz('skupina.klic')`. Nový text rovnou do `lang/cs` i `lang/en`, pak `php artisan preklady:kontrola`. Ostatní jazyky se doplňují hromadně **před každým nasazením**, do té doby v nich platí angličtina; `preklady:kontrola` nesmí před pushem nic hlásit.
- **Editor** má vlastní skupiny `ed_*` (`preloz('ed_dum.klic')`, počty `prelozPocet`, moduly s Node testy `tx`). Do bugů a konzole se dál píše česky. Podrobnosti v `modules/lokalizace.md`.
- Národní služby (katastr, výškový profil, mapový podklad) jen přes profil země: `@funkce('katastr')`, middleware `funkce:katastr`, `Lokalizace::maFunkci()`.
- Masterteam je jen česky, nepřekládá se. Podrobnosti: `modules/lokalizace.md`.

## Články na webu
- Před psaním nebo úpravou článku přečíst `modules/blog.md`. Platí pro všechny: do 500 slov a jedno téma, související témata jako samostatné propojené články, žádné vnější odkazy ani zdroje na stránce, 2 až 3 přirozené cesty do aplikace, hodnoty závislé na zemi vždy s označením země.
- **Po každém napsání nebo větší úpravě** spustit `php artisan clanky:kontrola` a **nezávislou odbornou revizi** (agent `revize-clanku`, postup v `modules/blog.md`). Liborovi se článek předává až s vyřešenými nálezy.
- Psaní článků a verzí pro další jazyky dělá agent `copywriter-clanku`. Pravidla tónu, SEO, grafiky, jazyků a zemí a práce s daty ze Search Console a GA4 jsou v `modules/blog.md`.

## Formuláře editoru
- Zarovnání polí a nápisů řeší jedno pravidlo `.kk-editor` v `koncept-v3.blade.php`, ne okraje u jednotlivých polí. Přidaný nebo změněný panel ověřit `node services/import-test/test-formulare-ui.cjs` a nový panel do toho testu doplnit.
- **Hodnota pole platí ihned, jednotně ve všech panelech.** Co se napíše, je v modelu bez potvrzování a klik jinam to neztratí. Řeší to jedno místo `_poleIhnedInit` v `koncept-k-ui.js` pro všechna textová a číselná pole v `.kk-editor`.
  - **Nové pole:** `:value` + `@change` + `@keydown.enter.prevent="$event.target.blur()"`. Žádné vlastní `@blur`, debounce ani tlačítko Uložit.
  - **Rozepsaná hodnota, která ještě neplatí**, se vyjádří přes `min`, `max` a `pattern`, odevzdá se až s odchodem z pole.
  - **Setter** musí hodnotu sám omezit a vyrovnat se s prázdným polem (`NaN`), volá se i s mezihodnotami při pomalém psaní.
  - **Výjimka** jsou jen pole s výslovným potvrzením a Esc (kóta, přejmenování).
  - Celá úprava pole je jeden krok Zpět a jedna úprava do limitu tarifu. Test prochází každé pole ve všech panelech.

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
