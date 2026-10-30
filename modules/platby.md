# Modul: Platby a tarify (Paddle)

## Co modul dělá
Tarify zákaznické aplikace (Zdarma, Stavebník, Profi), jejich limity v editoru a placení
předplatného přes **Paddle** — ten je prodejcem (Merchant of Record): fakturuje zákazníkům,
odvádí DPH ve všech zemích, vyřizuje vrácení peněz a dotazy k platbám. WormUP s.r.o. dostává
1× měsíčně výplatu se samofakturou. Poplatek 5 % + 0,50 $ za platbu, bez paušálu.

## Aktuální stav (2026-10-29, lokálně, necommitováno)
- Hotové a otestované bez Paddlu: limity tarifů (server + editor), stránka předplatného,
  ceník na webu, vrácení peněz, právní texty, pojistka zpráv z Paddlu, příkaz `paddle:katalog`.
- **Čeká na Libora:** testovací (sandbox) účet → klíč `PADDLE_API_KEY` do lokálního `.env`.
  Pak jeden příkaz `paddle:katalog` (viz Postup) a test rovnou na produkci — tunel netřeba.
- Ostrý provoz: ostrý účet Paddle (ověření firmy a totožnosti), eurový účet na výplaty,
  web na produkci a schválení domén `tuptudu.com` + `app.tuptudu.com`, GitHub secrets.

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
- Budoucí funkce (exporty atd.) jen v placených tarifech. Master tým má vždy Profi.
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
| Zakládání produktů a cen v Paddlu | `php artisan paddle:katalog` (`app/Console/Commands/PaddleKatalog.php`) |
| Zprávy z Paddlu | `POST /paddle/webhook` (Laravel Cashier), pojistka `App\Http\Middleware\PaddleJenSPodpisem` |
| Tabulky Cashieru | `customers`, `subscriptions`, `subscription_items`, `transactions` |

## Jak to funguje
- **Laravel Cashier Paddle** (`laravel/cashier-paddle` ^2.8): `Uzivatel` má trait `Billable`
  (`paddleName()` = jméno a příjmení). Předplatné typu `default`.
- **Tarif** = produkt v platném předplatném (`Tarif::uzivatele`): Stavebník a Profi mají každý
  svůj produkt (`PADDLE_PRODUKT_*`) se dvěma cenami (`PADDLE_CENA_*_MESIC/ROK`). Po zdražení
  (nová cena téhož produktu) se tarif pozná dál. Neznámý produkt → Stavebník + `Log::error`.
- **Nezaplacené obnovení** (`past_due`) = tarif Zdarma až do zaplacení (Cashier výchozí);
  stránka ukáže výzvu ke změně karty a nenabídne druhé předplatné.
- **Platba:** `/billing` připraví přes Cashier (`subscribe($cena, 'default')`) volby platebního
  okna, tlačítko ho otevře jako overlay. Předplatné založí až zpráva `subscription.created`
  z Paddlu; stránka se vrátí s `?zaplaceno=1` a čeká (`/billing/status`, max 60 s).
- **Změna tarifu** `swap()` — rozdíl Paddle dopočítá poměrně (`prorated_immediately`).
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

## Nápady na později
- Masterteam: přehled předplatitelů a využití (počty úprav jsou v `denni_upravy`).
- Interní e-mail o novém předplatném (událost Cashieru `SubscriptionCreated`).
- Změna e-mailu v účtu se do Paddlu nepropisuje (zákazník tam má původní e-mail na doklady).
- Při zrušení účtu smazat i záznamy Cashieru (nemají cizí klíč, `billable_type/id`).
- Zákaznický portál Paddle (`POST /customers/{id}/portal-sessions`) místo vlastních odkazů.
