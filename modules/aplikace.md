# Modul: Zákaznická aplikace (app.tuptudu.com)

## Co modul dělá
Část pro zákazníky: registrace, přihlášení, projekty (editor V3), účet.
Masterteam (`masterteam.tuptudu.com`) a veřejný web (`tuptudu.com`) jsou oddělené
subdomény s vlastní session — viz `config/domeny.php`.

## Aktuální stav (2026-10-29, lokálně, necommitováno)
- Registrace e-mailem i přes Google, ověření e-mailu, zapomenuté heslo.
- Projekty: editor V3 pod `/projects/{kod}`, úvodní obrazovka pro první projekt.
- Účet: jméno, e-mail (změna = nové ověření), jazyk, země, heslo.
- Právní stránky `/terms`, `/privacy` na webu — **schválené Liborem 2026-10-29**, účinné od 29. 10. 2026.
  Texty jsou psané pro všechny trhy (žádné „ČÚZK/katastr" jako obecný pojem; české
  zákony vždy s označením „český"). V textech žádné poznámky typu „[doplnit]" — co se
  doplní později, je v seznamu „Až budou placené tarify / další země" níž.
- E-mail `info@tuptudu.com` (schránka založena) je jen v identifikaci provozovatele v podmínkách
  (čl. 1) — vyžaduje ho směrnice o e-commerce. Vypisuje ho `partials/email-chraneny`: v HTML není
  vcelku, skládá ho JS, bez JS „info (zavináč) tuptudu.com". Jinde se odkazuje na kontaktní formulář.
  Antispam schránky na hostingu zapnutý (2026-10-29).
- Kontaktní formulář `tuptudu.com/contact` (2026-10-29) a patička s odkazy.
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
| `/billing` (+ `/billing/*`) | předplatné: tarif, využití, platba přes Paddle, změna, zrušení, karta, doklady | `Aplikace\PredplatneController`, viz `modules/platby.md` |
| `/register`, `/login`, `/forgot-password`, `/reset-password/*`, `/email/verify*` | Fortify | `FortifyServiceProvider`, `app/Actions/Fortify` |
| `tuptudu.com/terms`, `/privacy`, `/refunds` | právní stránky (web), `/refunds` = vrácení peněz (Paddle) | `PravniController` |
| `tuptudu.com/pricing` | ceník (web) | `CenikController` |
| `tuptudu.com/contact` | kontaktní formulář (web), `?tema=zruseni_uctu` předvybere téma | `KontaktController` |

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

## Vzorový projekt (Libor 11. 11. 2026)

Hotový dům na hraní pro každého uživatele a zdroj obrázků do článků. `App\Support\VzorovyProjekt`, sloupce `koncepty_v3.vzor`
(`sablona` nebo `kopie`) a `vzor_obnoveno_v`.
- **Šablona** je jeden projekt master týmu „Vzorový projekt“: 1.NP rodinného domu (z Klemova, bez sklepa, podkroví a schodů),
  nábytek, střecha, základy, parcela a terén. Podklad je výkres bez pravého sloupce (legenda, poznámky, razítko s osobními
  údaji), obsah PDF je opravdu odstraněný, ne zakrytý. Šablonu jde upravovat v Masterteamu, nad plátnem to připomíná hláška.
  Na produkci ji při prvním nasazení založí `VzorovyProjektSeeder` z `database/vzor` (jen když žádná není).
- **Pracovní verze a výchozí verze (Libor 11. 11. 2026).** Libor upravuje jen „Vzorový projekt – pracovní“ (`vzor = pracovni`), v Masterteamu je to jediný vzorový projekt v seznamu. Šablona („Vzorový projekt – výchozí“) a jeho kopie na hraní v seznamu Masterteamu nejsou, šablona jde otevřít přes `?id` a hláška říká, ať se needituje. Pracovní verze se nepočítá do aplikace (`ProjektyController::mojeProjekty`), tam má master jen svou kopii jako zákazník.
  Když Libor řekne „použij vzorový projekt jako výchozí“: `php artisan vzor:prevzit` (bez parametru vezme pracovní verzi, `--dry-run` jen řekne, jestli se něco změní). Zapíše data a metadata (i výškový profil `metadata.katastr.profil`) do šablony a do `database/vzor/vzorovy-projekt.json`, commit. Nový podklad (jiný otisk PDF) projde jen s `--podklad`, jde do veřejného repozitáře, proto nejdřív ověřit, že na výkresu nejsou osobní údaje. Na produkci se výchozí verze projeví po nasazení: `VzorovyProjektSeeder` šablonu založí, nebo přepíše, když se `database/vzor` liší (`VzorovyProjekt::zapisSablonu`). Kopie si ji vezmou podle `upraveno` šablony (nepoužité při otevření, používané v noci).
  **Podklad na produkci jen jako obrázek (12. 11. 2026, bug #22).** Hosting má `shell_exec` vypnutou a poppler tam není, PDF tedy nevykreslí ani nepřipraví k importu (`PdfPodkladService::dostupny()` vrací false, nahrání i výběr PDF k importu skončí hláškou `chybi_poppler`). Proto `vzor:prevzit` s podkladem vykreslí jeho stranu do `database/vzor/vzorovy-projekt-s{strana}-{dpi}.png` (DPI podkladu, 150) a seeder ji při každém nasazení vloží do cache podkladů pod otiskem PDF (`VzorovyProjekt::ulozVykresleneStrany`). Při změně podkladu commitovat i ten obrázek.
- **Kopie** vznikne uživateli při první návštěvě `/projects` (`zajistiKopii`). Úpravy v ní se nepočítají do denního limitu
  (`KonceptV3Controller::ulozit`, editor dostane `zbyva: null`), kopie se nepočítá do limitu projektů (`Tarif::pocetProjektu`),
  nejde smazat ani přejmenovat. Nad plátnem je výrazná hláška (`ed_sablona.vzor`, upozornění U1 z manuálu), křížkem se skryje do dalšího dne (localStorage `tt_vzor_hlaska_kopie` = dnešní datum, jen ten prohlížeč). Uživatel bez vlastního projektu má na
  úvodní obrazovce odkaz na ni, vlastní projekt má při otevření `/projects` přednost. Při otevření se ukáže celý dům.
- **Noční obnova, šetrně k serveru** (Libor 11. 11. 2026: většina kopií se nikdy nepoužije). `vzor:obnovit` (plánovač,
  každých 15 minut) načte jen kopie, které uživatel od poslední obnovy změnil (`upraveno > vzor_obnoveno_v`), a z nich ty, kde
  místně minula 3:00. Nepoužitá kopie se v noci nečte ani nepřepisuje, novou podobu šablony dostane až při otevření
  (`obnovPriOtevreni`, jen když od 3:00 minula a šablona je novější). Obnova vrátí data a metadata šablony, prázdnou historii
  a vyšší verzi (otevřený editor zastaví dialog konfliktu) a nastaví `upraveno` na čas obnovy, ať kopie nevypadá jako
  upravená. Pásmo podle země uživatele, u zemí s více pásmy evropské (`casovaZona`), bez země pásmo aplikace.
- **Podklad šablony** leží u jejího autora, kopie ostatních ho čtou přes `VzorovyProjekt::cestaPodkladu` v `najdiOriginal`.
- Kopie nevolá událost `projekt_zalozen` (GA4), vzniká bez událostí modelu.
- Test: `node services/import-test/test-vzorovy-projekt-ui.cjs`.

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
- `components/layouts/web` — veřejný web (vitrína, právní stránky, kontakt); vlastní styly do slotu `hlava`.
- Právní stránky: `pravni/stranka` + `pravni/{podminky,soukromi}-{jazyk}` (chybí-li jazyk → en).
- Patička `partials/paticka` (podmínky, soukromí, kontakt, nastavení cookies, © a povinný odkaz DB-IP) — na webu,
  přihlašovacích stránkách a v aplikaci. Editor (`fullWidth`) má jen odkaz DB-IP (`partials/poloha-zdroj`).
- Cookie lišta + GA4 `partials/cookies-lista` — na konci `<body>` všech tří zákaznických layoutů
  (web, přihlášení, zakaznik), masterteam ne. Zobrazí se jen s `GA4_MEASUREMENT_ID` (viz `modules/marketing.md`).

## Kontaktní formulář
- Veřejně neuvádíme e-mail — dotazy, zrušení účtu i žádosti GDPR jdou přes `/contact`.
- Zpráva se uloží do `kontaktni_zpravy` a odejde mailem na `config('app.interni_email')`
  (`INTERNI_EMAIL`, výchozí `libor@tuptudu.cz`) s Reply-To na odesílatele. Selhání mailu →
  `Log::error` (bug), zpráva zůstává v DB s `odeslano_v = null`.
- Proti spamu bez captchy: skryté pole `web`, šifrovaný čas zobrazení (odeslání do 3 s = robot,
  dostane falešné „odesláno"), `throttle:5,10`.
- U všech témat se formulář ptá, zda je účet na stejném e-mailu (výchozí zaškrtnuto); když ne,
  nabídne pole `email_uctu`. Povinné je jen u témat k účtu (`KontaktniZprava::TEMATA_UCTU`:
  zrušení účtu, osobní údaje). V DB: zaškrtnuto → `email_uctu` = `email`, nevyplněno → NULL.
  Mail ukáže e-mail účtu a zda takový účet existuje. Žádost k účtu se ověřuje zprávou
  na e-mail účtu (tak to slibují podmínky čl. 3 a zásady čl. 7).
- Přehled zpráv v Masterteamu zatím není — jsou v mailu a v DB.

## Uchovávání údajů (automaticky)
- Lhůty v `config/uchovavani.php`; zásady ochrany údajů (čl. 6) je čtou přímo z configu,
  takže text a skutečnost se nerozejdou.
- `php artisan uchovavani:promazat` (denně z `PlanovaneUlohy`, `--dry-run` = jen výpis): kontaktní
  zprávy po 24 měsících, `bugy` a `seo_404` 12 měsíců od posledního výskytu, staré řádky
  `laravel.log` po 12 měsících, prošlé tokeny `reset_hesel`.
- Účty a projekty se nemažou — žijí, dokud účet existuje. Zrušení účtu je zatím ruční.

## Před spuštěním pro veřejnost
1. ~~Odstranit `noindex` z `components/layouts/web`~~ — hotovo 1. 11. 2026: tuptudu.com se indexuje
   (kanonická adresa na www, `robots.txt` + `sitemap.xml` ze `SeoController`), app a masterteam zůstávají
   `noindex` + `Disallow: /`. Podrobnosti `modules/marketing.md`.
2. Přeložit editor V3 a skrýt katastrální panel mimo země s katastrem.
3. Zrušení účtu jako funkce (teď ručně přes kontaktní formulář) — smazat účet, projekty i podklady.

## Až budou placené tarify / další země — doplnit do právních textů
Při každé změně textu posunout datum „Účinné od" a podstatnou změnu oznámit uživatelům
e-mailem 14 dní předem (slib v podmínkách čl. 9).
- **Paddle — hotovo 2026-10-29 (lokálně, čeká na Liborovo přečtení):** podmínky čl. 4 (Paddle jako
  Merchant of Record, ceny s DPH, automatická obnova, zrušení ke konci období, změna tarifu, změna ceny
  30 dní předem), čl. 7 (odstoupení a vrácení vyřizuje Paddle); zásady čl. 2, 4, 5, 6 (údaje o předplatném,
  počty úprav, Paddle jako samostatný správce, UK s rozhodnutím o odpovídající ochraně); nová stránka
  `/refunds` odkazuje na pravidla vrácení Paddlu. Datum „Účinné od" posunout při nasazení.
- **Odstoupení od smlouvy** (podmínky čl. 7, § 1837 českého OZ) — u nákupu ho vyřizuje Paddle podle
  svých pravidel; případně ještě nechat přečíst právníkem.
- **Telefon provozovatele** — u placených spotřebitelských smluv ho vyžadují předsmluvní informace
  (směrnice 2011/83/EU po novele Omnibus); doplnit do podmínek čl. 1.
- **Cookies:** lišta se souhlasem + Google Analytics 4 hotovo 2026-11-01 (`partials/cookies-lista`,
  zásady čl. 2–5 upraveny, účinné od 1. 11. 2026; podrobně `modules/marketing.md`). Až přibude měření
  reklamy (Google Ads), zapojit uloženou marketingovou volbu a upravit čl. 3.
- **Další země:** zásady čl. 4 — poskytovatelé mapových, katastrálních a výškových dat dané země.
- AI v zákaznické části (teď vypnutá) → doplnit Anthropic jako příjemce do zásad čl. 4 a 5.

