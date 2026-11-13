# Modul: Platby a tarify (Paddle)

## Co modul dělá
Tarify zákaznické aplikace (Zdarma, Stavebník, Profi), jejich limity v editoru a placení
předplatného přes **Paddle** — ten je prodejcem (Merchant of Record): fakturuje zákazníkům,
odvádí DPH ve všech zemích, vyřizuje vrácení peněz a dotazy k platbám. WormUP s.r.o. dostává
1× měsíčně výplatu se samofakturou. Poplatek 5 % + 0,50 $ za platbu, bez paušálu.

## Schváleno 2026-11-09 večer
- Paddle schválil `app.tuptudu.com` (mail „Your domain is approved", Checkout i Apple Pay). API `checkout-domains`: `tuptudu.com` i `app.tuptudu.com` = `approved`.
- **Výchozí odkaz pokladny nastaven** (`paddle:katalog --odkaz=https://app.tuptudu.com/billing`, ověřeno `GET settings/checkout-url`).
- **Zbývá:** ostrý test za 0 Kč — slevový kód 100 % (jednorázový, `recurring: false`, `usage_limit: 1`, jen cena Stavebník měsíčně, krátká platnost) založí Libor v dashboardu **Catalog → Discounts** (Claude zápis do ostrého účtu blokuje pojistka); test skutečnou kartou: platba, zprávy z Paddlu, změna tarifu, zrušení; pak předplatné zrušit, kód vypnout, smazat účet „Paddle Review".

## Kontrola 2026-11-10 (jen čtení, bez platby)
- Libor ostrý test za 0 Kč odložil („budeme doufat, že funguje").
- Paddle: ostrý účet, obě domény `approved`, výchozí odkaz pokladny nastaven, client-side token `active` a shodný s `.env`, cíl zpráv aktivní (7 událostí), 4 aktivní ceny = ID v `.env`, bez zkušební doby, náhled CZ 249 Kč.
- Web: app.tuptudu.com 200, `/billing` → login, ceník a právní stránky 200, `cdn.paddle.com` dostupné, webhook bez podpisu 403, žádná CSP hlavička, nenasazené commity 0.
- Produkce má ostrý API klíč: zákazník `ctm_01m706qt…` (účet „Paddle Review", 9. 11. 14:07) existuje v ostrém účtu. Předplatné ani transakce zatím žádné, bugy kolem plateb jen staré opravené z 30. 10.
- Účet „Paddle Review" (`uzivatele.id=3`, Libor Test Sloupenský) Libor 10. 11. rozhodl **nechat** (pro případné dotazy Paddlu). Aplikace mazání účtu nemá.
- **Neověřené:** podpis zpráv z Paddlu na produkci (`PADDLE_WEBHOOK_SECRET` v GitHub secrets) — ukáže až první platba nebo simulace v Events → Simulations. Selhání by se zapsalo do bugů (403 + bug z `PaddleJenSPodpisem`).

## Kontrola 2026-11-09
- Get started v dashboardu: ověření firmy (02 Verify) **hotové**; 01 a 03 „In progress".
- `app.tuptudu.com` pořád `action_required` beze změny od 30. 10. 21:02 → Paddle čeká na nás, samo se to nepohne. Libor má v Checkout → Website approval zjistit důvod, případně napsat podpoře.
- Host na app.tuptudu.com dostane titulní stránku (200), `/pricing`, `/terms`, `/refunds`, `/privacy` přesměrují na www.tuptudu.com.
- Mail Paddlu z 30. 10. 22:02 (na libor@wormup.com): web „offline, bez HTTPS, nebo za login wall / geo-blokací / ochranou proti robotům". Oprava f425c8b je z 21:28 téhož dne, Paddle ji ale znovu nezkontroloval (Resubmit neproběhl). Odpovídá se na jejich mail, podpora jinak `sellers@paddle.com` z adresy účtu. **9. 11. Libor odpověď s testovacím účtem odeslal** (účet „Paddle Review" si založil sám přes /register, Claude zápis do ostré DB blokuje pojistka) a dal Resubmit. Paddle slibuje kontrolu do 1 pracovního dne.
- **9. 11. 14:46 znovu zamítnuto** (stejný šablonový mail, 30 min po Resubmitu → nejspíš automatická kontrola, ne člověk z ticketu). Z ČR web jede (HTTPS 200, certifikát platný). Rozdíl proti schválené tuptudu.com: robots.txt na app zakazoval všem robotům `/` → commit 3e208e9 pouští roboty na titulku (`Allow: /$`), `noindex` v hlavičce stránky zůstává. Nasazeno 9. 11. (0d710ab), ověřeno na produkci; Libor dá Resubmit. Ticket z 14:16 (odpověď s testovacím účtem) čeká na člověka 1–2 prac. dny, další ticket nezakládat.
- **Další krok:** ověřit stav `checkout-domains` (`approved`?) → `paddle:katalog --odkaz=https://app.tuptudu.com/billing` → ostrý test za 0 Kč → smazat účet „Paddle Review".

## Kontrola 2026-11-05
- `app.tuptudu.com` je v Paddlu dál `action_required` (poslední změna 30. 10. 21:02), `tuptudu.com` schválená. Výchozí odkaz pokladny prázdný, nastavit ho jde až po schválení domény.
- V pořádku: ostrý účet, čtyři aktivní ceny, cíl zpráv aktivní, nepodepsaná zpráva na webhook dostane 403, `/billing` bez přihlášení vede na login. Náhled ceny (`transactions/preview`, nic nezakládá): CZ 249 a 990 Kč, DE 9,90 a 39,90 €, PL 43,48 a 175,23 zł.
- V produkční DB jsou `customers`, `transactions` a `subscriptions` prázdné, po sandboxu nic nezůstalo.

## Aktuální stav (2026-11-01)
- Libor prošel celý tok na produkci s testovacím účtem — funguje.
- **Produkce běží na OSTRÉM účtu** (GitHub secrets i lokální `.env`). V ostrém účtu založené
  produkty, ceny, client-side token a cíl zpráv (app.tuptudu.com/paddle/webhook); měna výplat EUR.
- **Domény:** `tuptudu.com` schválená. `app.tuptudu.com` opakovaně `action_required` — Paddle tam
  viděl jen ceník s tlačítky na login („login wall"). Commit f425c8b: nepřihlášený na app.tuptudu.com
  dostane celou titulní stránku (`vitrina.index`). Nasazeno; Libor dal Resubmit. Subdoménu NEMAZAT —
  každá doména s pokladnou se schvaluje zvlášť. SSL je v pořádku (ověřeno). Stav domén z tinkeru:
  `Laravel\Paddle\Cashier::api('GET','checkout-domains')`.
- **Ověření firmy:** po první kontrole (automated_review prošel) Paddle chce ověření přes Sumsub
  (vlastnická struktura, jednatelé) — Libor vyplnil 31. 10., čeká se na Paddle. Odpovědi na jejich
  maily jdou na no-reply; podpora jen přes formulář v dashboardu.
- **Chybí (až po schválení):** výchozí odkaz pokladny (`paddle:katalog
  --odkaz=https://app.tuptudu.com/billing`), ostrý test za 0 Kč (100% sleva, skutečná karta,
  ověřit webhooky, změnu a zrušení tarifu, pak uklidit), ověřit, že v produkční DB nezůstaly
  testovací záznamy Cashieru ze sandboxu.

## Tarify (rozhodl Libor 2026-10-29)
| | Zdarma | Stavebník (en Home) | Profi (en Pro) |
|---|---|---|---|
| Úpravy kresby | 30 denně | neomezeně | neomezeně |
| Projekty | 1 | 5 | neomezeně |
| Cena měsíčně | 0 | 249 Kč / 9,90 € | 990 Kč / 39,90 € |
| Cena ročně | 0 | 1 490 Kč / 59 € (−50 %) | 8 290 Kč / 329 € (−30 %) |

- Ceny včetně DPH (Paddle `tax_mode: internal`); firmy s DIČ z EU platí bez DPH.
  Měna podle země: CZ → Kč (pevná cena pro Česko), ostatní → eura.
- Úprava = krok historie editoru (nová stěna, posun stěny/otvoru, smazání…). Prohlížení,
  Zpět/Vpřed a výchozí krok „Začátek" se nepočítají. Den podle časové zóny aplikace.
- Budoucí funkce jen v placených tarifech, kromě obrázků PNG a sdílení odkazem, ty jsou i ve verzi zdarma (Libor 4. 11. 2026). PDF, DWG/DXF a 3D model zatím nejsou; rozhodnutí ze 4. 11., že je nedáváme, Libor 13. 11. 2026 odvolal (todo „Kde zaostáváme za konkurencí“). Rozdělení podle tarifu je v Nápadech na později (Exporty podle tarifu): zdarma obrázky a ploché PDF, zdrojová data jen placené. Master tým má vždy Profi.
- Typický stavebník aplikaci používá 3–12 měsíců → roční předplatné se vyplatí od 6 měsíců.
- Limity a ceny jen v `config/tarify.php` (ceník i `paddle:katalog` z nich berou).

## Kde co je
| Co | Soubor |
|---|---|
| Limity, ceny, ID z Paddlu | `config/tarify.php`, `.env` (`PADDLE_*`) |
| Tarif uživatele, limity, počítadlo, formát částek | `app/Support/Tarif.php` |
| Počítadlo úprav za den | tabulka `denni_upravy` (maže `uchovavani:promazat` po 3 měsících) |
| Limit úprav a projektů na serveru (402) | `Masterteam\KonceptV3Controller` (`ulozit`, `vytvorit`, `aiVytvor`), `Aplikace\ProjektyController@novy` |
| Limit v editoru (vrácení úpravy, nabídka, štítek) | `public/js/koncept-v3/limit-tarifu.js` (mixin), napojení v `koncept-k-ui.js` (`_zapisKrok`, `ulozit`, `_zalozKoncept`, `novyProjekt`) |
| Stránka předplatného `/billing` | `Aplikace\PredplatneController`, `resources/views/aplikace/predplatne.blade.php` |
| Platební okno Paddle | `resources/views/partials/paddle-js.blade.php` |
| Ceník `tuptudu.com/pricing` | `CenikController`, `resources/views/vitrina/cenik.blade.php` |
| Vrácení peněz `tuptudu.com/refunds` | `PravniController@vraceni`, `pravni/vraceni-{cs,en}` |
| Texty | `lang/{cs,en}/tarify.php`, pro JS `lang/{cs,en}/js.php` → `tarify.*` |
| Zkušební verze Stavebníku | `uzivatele.zkouska_od/do`, `Tarif::zacniZkousku`, `POST /billing/trial` (viz část Zkušební verze) |
| Zakládání produktů a cen v Paddlu | `php artisan paddle:katalog` (`app/Console/Commands/PaddleKatalog.php`) |
| Zprávy z Paddlu | `POST /paddle/webhook` (Laravel Cashier), pojistka `App\Http\Middleware\PaddleJenSPodpisem` |
| Tabulky Cashieru | `customers`, `subscriptions`, `subscription_items`, `transactions` |

## Jak to funguje
- **Laravel Cashier Paddle** (`laravel/cashier-paddle` ^2.8): `Uzivatel` má trait `Billable`
  (`paddleName()` = jméno a příjmení). Předplatné typu `default`.
- **Bez platného předplatného** je tarif `zkouska`, dokud běží zkušební verze (`uzivatele.zkouska_do` v budoucnu), jinak Zdarma.
- **Tarif** = produkt v platném předplatném (`Tarif::uzivatele`): Stavebník a Profi mají každý
  svůj produkt (`PADDLE_PRODUKT_*`) se dvěma cenami (`PADDLE_CENA_*_MESIC/ROK`). Po zdražení
  (nová cena téhož produktu) se tarif pozná dál. Neznámý produkt → Stavebník + `Log::error`.
- **Nezaplacené obnovení** (`past_due`) = tarif Zdarma až do zaplacení (Cashier výchozí);
  stránka ukáže výzvu ke změně karty a nenabídne druhé předplatné.
- **Platba:** `/billing` připraví přes Cashier (`subscribe($cena, 'default')`) volby platebního
  okna, tlačítko ho otevře jako overlay. Předplatné založí až zpráva `subscription.created`
  z Paddlu; stránka se vrátí s `?zaplaceno=1` a čeká (`/billing/status`, max 60 s).
- **Změna tarifu** přes náhled `/billing/change` (částky z Paddlu, `subscriptions/{id}/preview`), `swap()` až po potvrzení.
  Dražší tarif a změna období = rozdíl hned (`prorated_immediately`, Paddle při změně období nic jiného nedovolí);
  levnější ve stejném období = `prorated_next_billing_period` (okamžitý dobropis drobných částek Paddle odmítá).
  Pozor: výchozí režim Cashieru je `prorated_next_billing_period` — vždy nastavit `setProrationBehavior()`.
  **Zrušení** `cancel()` ke konci období, **pokračování** `stopCancelation()`.
  **Karta** = stránka Paddlu (`management_urls.update_payment_method`). **Doklady** = PDF od Paddlu.
- **Limit úprav:** server přijme dávku kroků, dokud dnes něco zbývá (limit přeteče nanejvýš
  o jednu dávku autosave — žádná práce se neztratí), pak vrací 402. Editor zná zbytek dopředu:
  úprava nad limit se hned vrátí a ukáže se nabídka předplatného. Masterteam limit nedostává.
- **Zprávy z Paddlu bez `PADDLE_WEBHOOK_SECRET`** Cashier neověřuje → mimo lokál je
  `PaddleJenSPodpisem` odmítne (403 + bug). Na produkci secret musí být.
- Jazyk platebního okna bere Paddle z prohlížeče (češtinu v seznamu jazyků zatím nemá).

## Požadavky Paddlu (ověřeno 2026-10-29)
- Web **veřejně na HTTPS** s popisem produktu, funkcemi a **ceníkem** (ceny = ceny v Paddlu);
  podmínky, zásady a **vrácení peněz** dostupné z navigace bez přihlášení (patička) + kontakt.
- V podmínkách přesný název firmy a věta „Our order process is conducted by our online
  reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders." (en čl. 4; cs překlad).
- Vrácení peněz: Paddle dovoluje odkázat na **svá pravidla** (paddle.com/legal/refund-policy) —
  o vrácení rozhoduje Paddle případ od případu, žádost do 14 dnů od platby na paddle.net,
  při zneužití odmítne; zákonné odstoupení se netýká dalších plateb předplatného. Tak to má
  `/refunds` (Libor nechtěl slibovat „14 dní bez udání důvodu").
- Zásady ochrany údajů: Paddle jako příjemce (samostatný správce).
- Schválení domén: každá doména/subdoména s pokladnou zvlášť → `tuptudu.com` i `app.tuptudu.com`.
  Většinou automaticky, ručně 5–7 pracovních dní. Ověření totožnosti (Sumsub) obvykle hned, ručně 1–3 dny.
- Výplaty: USD, EUR, GBP, AUD, CAD (CZK ne) → eurový účet firmy.

## Nastavení v dashboardu Paddle (nová navigace 2026)
- Klíče: **My account → Settings → Authentication** — testovací
  `https://sandbox-vendors.paddle.com/settings/authentication`, ostrý `https://vendors.paddle.com/settings/authentication`.
  API key (`pdl_sdbx_apikey_…` / `pdl_live_apikey_…`) se ukáže jen jednou. Client-side token
  (`test_…` / `live_…`) založí `paddle:katalog --token`.
- Výchozí odkaz pokladny: **Checkout → Checkout configuration** (bez něj se okno neotevře;
  stránka na naší doméně, ne localhost) → `https://app.tuptudu.com/billing`.
- Zprávy (webhooky): **Events → Notifications**, simulace **Events → Simulations** — cíl založí
  `paddle:katalog --webhook=…`. Testovací karta `4242 4242 4242 4242`, platnost budoucí, CVC libovolné.
- Výplaty: **Business account → Payouts**. Ověření firmy: **Get started**.
- Testovací (sandbox) a ostrý účet nesdílí nic — klíče, produkty, ceny, zákazníky.

## Postup zprovoznění (Libor 2026-10-30: testuje se rovnou na produkci)
- Testovací/ostrý účet se pozná z klíče (`pdl_sdbx_…` = testovací, `AppServiceProvider`) — `PADDLE_SANDBOX`
  se nenastavuje. GitHub secret `PADDLE_API_KEY` teď drží testovací klíč, na ostrý se jen přepíše.
1. Testovací klíč jednou do lokálního `.env` (GitHub secrets nejdou přečíst).
2. `php artisan paddle:katalog --zapsat --token --github --odkaz=https://app.tuptudu.com/billing --webhook=https://app.tuptudu.com/paddle/webhook`
   → produkty, ceny, token, výchozí odkaz pokladny, cíl zpráv; vše do `.env` i do GitHub secrets.
3. Nasazení (push na main, jen se souhlasem Libora) → test na app.tuptudu.com testovací kartou
   (platba, změna tarifu, zrušení, pokračování, doklad, nezaplacení přes simulaci). Tunel netřeba.
4. Ostrý účet: ostrý klíč do `.env` → znovu krok 2 (přepíše secrets) → schválení domén → nasazení.
   Při nasazení posunout „Účinné od" v právních textech a oznámit změnu podmínek.

## Průzkum konkurence (oficiální ceníky, 2026-10-29)
- Laické plánovače: měsíčně ≈ 100–600 Kč, ročně ≈ 550–3 150 Kč; roční sleva 50–75 %.
  Planner 5D $19,99/měs | $59,99/rok, RoomSketcher $24 | $144, Floorplanner €4–24,
  Live Home 3D $6,99 | $24,99, Home Design 3D v CZ App Store 349 Kč | 1 190 Kč.
- Profi nástroje: ročně ≈ 770–1 200 Kč/měs, měsíčně ≈ 1 900–2 200 Kč; roční sleva 30–50 %.
  Cedreo Pro €79 | €588/rok, SketchUp Pro €89,99 | €378,96, Home Designer $79 | $495.
- Freemium je standard (omezení projekty, exportem, vodoznakem), časový trial je vzácný.
- ČR: placený konkurent se stejným záběrem není; zdarma Homeplot.ai, „Online osazení"
  (Dům jedním tahem). AIkatastr.cz 99 Kč/report, Pro 990 Kč/měs.

## Logo firmy v tarifu Profi (11. 11. 2026, lokálně, nenasazeno)
- **Kde:** Účet → sekce Logo firmy (`aplikace/ucet`, `Aplikace\LogoFirmyController`, adresy `/account/logo` GET, POST, DELETE).
  Nahrávat smí jen Profi (master tým ho má vždy), ostatní vidí odkaz na tarify. Uložené logo jde vidět a odstranit i bez tarifu.
- **Komu logo patří:** firmě, ne uživateli. Firma = řádek v `subjekty` (sloupec `logo`), uživatel je k ní připojený přes
  `uzivatel_subjekt`. `Uzivatel::firma()` vrátí jeho subjekt, `zalozFirmu()` ho při prvním nahrání založí (bez IČO, pojmenovaný
  po uživateli, `je_vlastnik`). **Až půjde firmu sdílet** (Libor 11. 11. 2026: jeden profil pro víc uživatelů, kteří ji smějí
  upravovat), stačí k subjektu připojit další uživatele; logo ani jeho adresy se nemění. Chybí jen správa členů a údaje firmy.
  Master tým už teď sdílí jeden subjekt, logo má tedy společné.
- **Zpracování:** `App\Services\LogoUploader` (převzatý z Kalkulia): JPG, PNG nebo WebP do 5 MB, překreslení přes GD
  (zahodí EXIF, SVG neprojde), zmenšení do 800 × 600 se zachováním poměru stran a průhlednosti, výstup vždy WebP.
  Soubor `storage/app/loga/{id firmy}.webp` (mimo nasazování), nové logo staré přepíše.
- **Kde se ukáže:** v zápatí exportu půdorysu a 3D místo značky a popisu služby, vedle zůstává šedě `www.tuptudu.com`
  (`_kresliZnacku`, `nactiLogoFirmy` v `export-sdileni.js`; čte se při každém exportu a jen když `limit.tarif` je `profi`).
  Na stránce sdíleného odkazu vpravo od názvu na bílé destičce (`/share/{token}/logo`, `Uzivatel::logoFirmy()` hlídá tarif autora).
  Plány v odkazu jsou obrázky z editoru, logo v nich je takové, jaké bylo při posledním uložení odkazu.
- **Po skončení tarifu** logo zůstane uložené, jen se nepoužívá. Při smazání účtu soubor zatím zůstává (firma může mít časem další členy).
- Ověření: nahrání 2400 × 900 → WebP 800 × 300 (7 kB), SVG odmítnuto, zápatí exportu, odkaz, odstranění.

## Zkušební verze Stavebníku (13. 11. 2026, lokálně, nenasazeno)
- **Rozhodl Libor 13. 11. 2026:** jen tarif **Stavebník**, **14 dní**, **bez karty**, jednou na účet. Běží jen v aplikaci,
  Paddle o ní neví (žádná zkušební doba u cen, nic se nestrhne). Cíl: zdarma si uživatel může hrát a ladit skoro bez
  omezení, ale bez placené verze návrh ze systému nevyjme, kromě obrázků a plochého PDF.
- **Co ve zkoušce platí:** tarif `zkouska` v `config/tarify.php` — úpravy bez omezení, ale **1 projekt** (kopie vzorového
  se nepočítá) a **bez zdrojových dat** (`zdrojova_data` false). Obrázky PNG a sdílení odkazem jako Zdarma.
  Po 14 dnech `Tarif::uzivatele` sám vrátí **Zdarma** (30 úprav denně), nic se nemaže, žádná úloha cronu není potřeba.
- **Kdo ji dostane:** `Tarif::muzeZacitZkousku` — ne master tým, ne kdo ji už měl (`uzivatele.zkouska_od`), ne kdo už
  měl předplatné (i zrušené). Opakované zkoušky přes nové účty se neřeší: nedají víc projektů ani zdrojová data.
- **Zapnutí** jen kliknutím, ne samo při registraci (14 dní by propadlo lidem, kteří se jen podívali):
  `POST /billing/trial` (`PredplatneController::zkouska`, `Tarif::zacniZkousku`, podmínka přímo v UPDATE proti
  dvojkliku). Nabízí se na třech místech, nejviditelněji přímo v editoru:
  - **Předplatné** `/billing` — tlačítko „Vyzkoušet 14 dní zdarma“ v kartě Stavebník (`#zkouska`), nákup je pak vedlejší tlačítko.
    Během zkoušky „Stavebník – zkouška zdarma“ a do kdy platí, po konci „Zkouška zdarma skončila …“.
  - **Ceník** `tuptudu.com/pricing` — stejné tlačítko u Stavebníku vede na `/billing?tarif=stavebnik#zkouska`
    (nepřihlášeného přes přihlášení/registraci), plus řádek v poznámkách. Podmínky čl. 4 mají bod o zkoušce (8 jazyků).
  - **Editor** (Libor 13. 11. 2026: laik ji nemá dohledávat v nastavení) — **štítek nad plátnem** „Vyzkoušej 14 dní
    bez omezení zdarma“ u každého, komu jde zkouška zapnout; klik otevře krátkou nabídku s tlačítkem. Když zbývá ≤ 10 úprav,
    štítek ukáže i počet („Dnes zbývá 5 z 30 úprav · Vyzkoušej…“). Okno „Dnešní limit úprav je vyčerpaný“ nabídne totéž.
    Zapne se přes JSON bez opuštění editoru, limit úprav hned zmizí a štítek pak ukazuje „Zkouška zdarma: zbývá N dní“
    (`limit-tarifu.js`: `_limitOdznak`, `limitDialog('zkouska')`, `_limitZacniZkousku`). `initialData.limit` má
    `zkouska_mozna`, `zkouska_dni`, `zkouska_delka`, `zkouska_url`.
- **E-mail 2 dny před koncem** (`App\Notifications\ZkouskaKonci`, příkaz `zkouska:upozorneni`, plánovač každou hodinu):
  kdy zkouška končí, že se pak nic neplatí a projekty zůstanou (jen zase 30 úprav denně), cena Stavebníku v měně země
  a tlačítko „Pokračovat se Stavebníkem“ (`/billing?tarif=stavebnik`), na konci „pokud nechceš, nemusíš nic dělat“.
  Jednou na uživatele (`uzivatele.zkouska_mail_v`), jen ověřeným adresám a jen komu zkouška pořád běží (kdo mezitím
  zaplatil, mail nedostane). Jazyk podle účtu, texty `lang/*/emaily.php` (`zkouska_konci_*`). `--dry-run` vypíše adresáty.
- **Masterteam ▸ Přehled:** v dlaždici Platících teď řádek „ve zkoušce zdarma N (celkem M)“.
- **Test:** `node services/import-test/test-zkouska-ui.cjs` (předplatné, ceník, štítek a okno v editoru, druhé zapnutí 409,
  konec zkoušky). Testovací uživatel má smyšleného zákazníka Cashieru, aby stránka předplatného nezakládala zákazníka
  v ostrém Paddlu.
- Účinnost podmínek („Účinné od“) se kvůli zkoušce neměnila.

## Nápady na později
- **Exporty podle tarifu** (Libor 13. 11. 2026, zatím žádný z nových exportů není hotový):
  - **Zdarma i zkouška:** obrázky (PNG) a **PDF jen ploché, bez vrstev** (stránka jako obrázek, žádné vektory ani vrstvy,
    aby se z PDF nedaly vyčíst údaje).
  - **Jen placené tarify:** zdrojová data ve formátech, které jde nahrát do jiných programů (DWG/DXF, 3D model,
    PDF s vrstvami a podobné). Příznak je připravený: `zdrojova_data` v `config/tarify.php`, `Tarif::maZdrojovaData()`;
    nový export ho musí hlídat i na serveru.
- Masterteam: přehled předplatitelů a využití (počty úprav jsou v `denni_upravy`).
- Interní e-mail o novém předplatném (událost Cashieru `SubscriptionCreated`).
- Změna e-mailu v účtu se do Paddlu nepropisuje (zákazník tam má původní e-mail na doklady).
- Při zrušení účtu smazat i záznamy Cashieru (nemají cizí klíč, `billable_type/id`).
- Zákaznický portál Paddle (`POST /customers/{id}/portal-sessions`) místo vlastních odkazů.
