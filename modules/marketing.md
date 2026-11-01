# Marketing a analytika — GA4, Search Console, Google Ads přes MCP

## Co modul dělá
Claude Code ve VS Code má přes MCP servery přímý přístup k datům z Google Analytics 4,
Search Console a Google Ads. Pokyn „analyzuj web" = stáhnout data, navrhnout změny, rovnou je
udělat v kódu a pushnout. Placené nástroje (Screaming Frog, Ahrefs/Semrush, hostované MCP)
zatím nerozhodnuto — třešinky na dortu, až web poběží veřejně.

## Stav (2026-11-01)
- **PC:** pipx 1.18.10 a uv 0.13.6 nainstalovány uživatelsky (`C:\Users\HP\.local\bin`, je v uživatelské PATH).
  MCP servery jsou **trvale nainstalované** (`pipx install analytics-mcp`,
  `pipx install git+https://github.com/googleads/google-ads-mcp.git`, `uv tool install mcp-search-console`),
  `.mcp.json` volá přímo `analytics-mcp`, `google-ads-mcp`, `mcp-search-console`. Původní `pipx run --spec git+…`
  stavěl google-ads-mcp při každém startu znovu (minuty) → VS Code hlásil CONNECT_TIMEOUT po 30 s.
  Start teď: analytics ~7 s, google-ads ~10 s, search-console ~3 s. Aktualizace: `pipx upgrade-all`, `uv tool upgrade --all`.
- **Ověřeno 2026-11-01 přes MCP (stdio test):** analytics `run_report` (CZK, Europe/Prague, zatím 0 řádků),
  `list_google_ads_links` → propojení s účtem 1346460395 existuje; search-console `list_properties` → `sc-domain:tuptudu.com`;
  google-ads `customers_list_accessible_customers` → `1346460395`, `search_search` vrací název/měnu/pásmo.
  Názvy nástrojů Ads serveru: `customers_list_accessible_customers`, `search_search` (argumenty `customer_id`,
  `fields`, `resource`, ne `query`), `metadata_get_resource_metadata`.
- **GA4 property založena** (krok 2), Measurement ID `G-RZ5R886K95`. GA4 + cookie lišta **nasazeny
  na produkci 2026-11-01** (commity ce9dd7b, ff1e7ca; ověřeno: web a app lištu mají, masterteam ne).
  Stále `noindex`.
- **Google Cloud projekt:** v účtu jsou DVA projekty se jménem „TupTuDu". Ten pravý je
  **Project ID `woven-nimbus-474913-i4`** (číslo 190679332975) — má Google Ads API
  **schválené na Explorer 2026-11-01** (2 880 operací/den) a nejspíš i OAuth klienta pro
  přihlášení přes Google (GOOGLE_CLIENT_ID) → **nikdy nemazat**. Druhý projekt `tuptudu`
  (číslo 59788977139) vznikl omylem 2026-11-01 a byl vypnut.
- **Hotovo 2026-11-01:** tři API zapnutá, servisní účet `tuptudu-mcp@woven-nimbus-474913-i4.iam.gserviceaccount.com`,
  klíč v `C:\Users\HP\.tuptudu-google\service-account.json`, uživatelské proměnné `TUPTUDU_GOOGLE_SA`
  a `TUPTUDU_GCP_PROJECT` nastavené, `.mcp.json` v projektu vytvořen (servery se načtou po restartu VS Code).
- **Kontrolní skript** `py services/google-kontrola.py` (jen čte). Stav k 2026-11-01 večer:
  token OK; **GA4 OK** (servisní účet má Viewer, property `properties/561796471`, účet „TupTuDu.com");
  v IAM projektu má servisní účet roli **Service Usage Consumer** (Ads API bez ní vrací 403 na
  hlavičku `x-goog-user-project`; MCP server posílá projekt z `GOOGLE_PROJECT_ID`). V IAM je i
  Libor jako Owner (Legacy) — **nemazat**, je to jeho vlastnictví projektu.
  **Vše OK k 2026-11-01 večer:** GA4 Editor (Libor dal rovnou Editor místo Viewer), uchovávání
  14 měsíců; Search Console doménová služba `sc-domain:tuptudu.com` s plným oprávněním (předponová
  služba odebrána); Google Ads **ID zákazníka 134-646-0395** („TupTuDu.com", CZK, Europe/Prague,
  starší účet původně pro WormUP, 0 kampaní) se servisním účtem jako Standardní. Skript rovnou
  vypisuje i měnu, pásmo a kampaně (GAQL přes `googleAds:search`, hlavička `login-customer-id`).
  GA4↔Ads propojeno (googleAdsLinks/16247982656). **Nastavení uzavřeno 2026-11-01:** po restartu
  VS Code se všechny tři servery připojují a vracejí data přímo z Claude Code.
- Google účty má Libor v **češtině** — návody psát s českými názvy položek.

## Co dál (až bude čas, rozhodnuto 2026-11-01 odložit)
- Analýzu zatím nepouštět — web je na `noindex`, data v GA4 se sbírají od 1. 11. 2026, kampaně žádné.
  Priorita je dodělat produkt a získat návštěvníky.
- První „analyzuj web" až po: sitemap.xml + robots.txt, zrušení `noindex`, odeslání sitemapy do
  Search Console (`submit_sitemap`). Pak pravidla pro „analyzuj web" do CLAUDE.md (co stáhnout,
  co smí Claude měnit sám, rozpočty v Ads jen s potvrzením).
- Později: klíčové události v GA4 (registrace, založení projektu) → import do Ads jako konverze;
  Sklik, PageSpeed; placené nástroje (Screaming Frog, Ahrefs/Semrush) jen pokud se ukáže potřeba.
- Údržba: `pipx upgrade-all`, `uv tool upgrade --all`; kontrola přístupů `py services/google-kontrola.py`.

## GA4 na webu (hotovo 2026-11-01)
- **ID** z `.env` `GA4_MEASUREMENT_ID` (`config('services.ga4.measurement_id')`); produkce ho má
  natvrdo v `deploy.yml` (není tajné). Lokálně prázdné = nic se neměří a lišta se nezobrazí.
  Masterteam GA nemá (interní).
- **`partials/cookies-lista`** (konec `<body>` v layoutech web, prihlaseni, zakaznik, až za
  `error-tracker`): cookie lišta + consent mode v2 v „základní" variantě — `gtag.js` se načte
  až po souhlasu s analytikou, bez souhlasu k Googlu neodejde nic. Tlačítka Přijmout vše /
  Jen nezbytné / Nastavit (zaškrtávátka analytika + marketing). Marketingová volba se zatím
  jen ukládá — uplatní se, až přibude měření Google Ads (pak i upravit zásady čl. 3).
- **Cookie `tt_cookies`** = `{"v":1,"a":0|1,"m":0|1}`, 12 měsíců, na produkci `Domain=.tuptudu.com`
  (jedna volba pro web, app i přihlášení); na 127.0.0.1 bez domény. Odvolání analytiky smaže
  `_ga` a `_ga_*`. Změna volby: tlačítko „Nastavení cookies" v patičce → `window.ttCookiesOtevrit()`.
- GA4 cookie `_ga` je na `tuptudu.com` (gtag `cookie_domain: auto`), takže přechod web → app je
  jedna relace. V GA4 ještě nastavit: Data retention 14 měsíců (krok 2.4); po zrušení `noindex`
  zkontrolovat, že se nehlásí vlastní subdomény jako referral.
- **Zásady soukromí** (cs i en): nový řádek v tabulce čl. 2, čl. 3 cookies (nezbytné / analytické /
  marketingové, odvolání, právní základ vč. § 89 odst. 3 ZEK), čl. 4 Google, čl. 5 USA; účinné od 1. 11. 2026.
- **Test:** skript přes CDP (viz `services/import-test/prohlizec.cjs`) ověřil 2026-11-01: lišta při první
  návštěvě, bez souhlasu žádný gtag, „Jen nezbytné" → cookie a=0, souhlas → gtag + consent update,
  volba platí i na /login, odvolání maže `_ga*`, „Přijmout vše" → a=1,m=1. Testovat s falešným ID
  (`GA4_MEASUREMENT_ID=G-TEST0000` v prostředí serveru), aby lokální hity nešly do ostré property.

## Architektura (rozhodnuto 2026-10-30)
- **Jeden Google Cloud projekt** (zdarma, bez fakturace) a v něm **jeden servisní účet**.
  Jeho e-mail se přidá jako uživatel do GA4 (Čtenář), Search Console (Úplný přístup)
  a Google Ads (Standardní). Google Ads od 2026 servisní účty přímo podporuje — stačí přidat
  e-mail mezi uživatele účtu, Workspace není potřeba.
- **Proč servisní účet a ne OAuth:** žádná obrazovka souhlasu, žádné 7denní vypršení tokenů
  u aplikace v režimu „Testing", žádné gcloud CLI na PC. Jeden klíč pro všechny tři služby.
- **Klíč JSON** leží mimo repozitář: `C:\Users\HP\.tuptudu-google\service-account.json`.
  Do `.mcp.json` jdou jen názvy proměnných prostředí (`${TUPTUDU_GOOGLE_SA}`, `${TUPTUDU_GCP_PROJECT}`).
- **Google Ads API** se od 9. 9. 2026 neřídí developer tokenem, ale úrovní přístupu Cloud projektu:
  Test (jen testovací účty) → Explorer (produkce, 2 880 operací/den, schvaluje se automaticky)
  → Basic (15 000/den, vyžaduje ověření značky; nutné pro Plánovač klíčových slov) → Standard.
  Pro jeden účet stačí Explorer. Manager účet (MCC) není potřeba.
- Oficiální MCP Googlu jsou **jen pro čtení**. Zápisy do Ads (kampaně, rozpočty) bude dělat
  vlastní skript nad Google Ads API, vždy jen po výslovném potvrzení.

## Návod krok za krokem (Libor, prohlížeč)

### 1. Google Cloud projekt a servisní účet (~10 min)
1. Založit projekt: https://console.cloud.google.com/projectcreate — název `TupTuDu marketing`,
   organizace „No organization". **Zapsat Project ID** (např. `tuptudu-marketing-123456`).
   Fakturaci nezakládat a hlavně **nespouštět Free Trial** — Google u projektů na Free Trial
   nebo s pozastavenou fakturací zamítá žádosti o Explorer/Basic přístup k Ads API
   (https://developers.google.com/google-ads/api/docs/api-policy/developer-token).
2. Zapnout čtyři API (na každém odkazu vybrat projekt a kliknout **Enable / Povolit**):
   - Google Analytics Admin API: https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com
   - Google Analytics Data API: https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com
   - Google Search Console API: https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
   - Google Ads API: https://console.cloud.google.com/apis/library/googleads.googleapis.com
3. Servisní účet: https://console.cloud.google.com/iam-admin/serviceaccounts → **Create service account**
   → název `tuptudu-mcp` → Create and continue → role v projektu **žádnou** (práva se dávají
   až v GA4/GSC/Ads) → Done. **Zapsat e-mail účtu** (`tuptudu-mcp@<project-id>.iam.gserviceaccount.com`).
4. Klíč: kliknout na účet → záložka **Keys** → Add key → Create new key → **JSON** → stáhne se soubor.
   Uložit jako `C:\Users\HP\.tuptudu-google\service-account.json` (složku vytvořit).
   Nikdy do repozitáře, nikdy do chatu. Při úniku klíč na stejné záložce smazat a vytvořit nový.
   Návod Googlu: https://developers.google.com/workspace/guides/create-credentials#service-account

### 2. Google Analytics 4 (~15 min)
1. https://analytics.google.com → vlevo dole **Admin** (ozubené kolo) → **Create → Account**:
   název `TupTuDu` → Next → **Property** `tuptudu.com`, časové pásmo Praha, měna **CZK** → Next
   → Business details libovolně → Create → platforma **Web**, URL `https://www.tuptudu.com`,
   název streamu `Web` → Create stream. **Zapsat Measurement ID** (`G-XXXXXXXXXX`).
   Návod Googlu: https://support.google.com/analytics/answer/9304153
2. Kód na web **teď nevkládat** — nasadím ho já spolu s cookie lištou (consent mode v2) a ID
   půjde z `.env` (`GA4_MEASUREMENT_ID`). Bez souhlasné lišty by GA4 v ČR/EU běžet nemělo.
3. Přístup pro servisní účet: Admin → Property → **Property access management** → „+" →
   **Add users** → e-mail servisního účtu, role **Viewer (Čtenář)**, bez notifikace → Add.
   (Pro zápis poznámek do grafu by stačil Editor; zatím není třeba.)
4. Admin → Data collection and modification → **Data retention** → 14 months.
5. Propojení s Google Ads až po kroku 4: Admin → Product links → **Google Ads links**.

### 3. Search Console (~10 min + čekání na DNS)
1. https://search.google.com/search-console → **Add property** → typ **Domain** → `tuptudu.com`
   → Continue. Zobrazí se TXT záznam `google-site-verification=…` — zkopírovat.
2. Přidat TXT záznam do DNS domény tuptudu.com (u správce DNS — tam, kde je doména vedena,
   pravděpodobně cesky-hosting.cz). Název/host `@` (nebo prázdný), typ TXT, hodnota ze SC.
   Po uložení v SC kliknout **Verify**; propagace trvá minuty až hodiny, lze zkoušet opakovaně.
   Návod Googlu: https://support.google.com/webmasters/answer/9008080
3. Přístup pro servisní účet: vlevo dole **Settings** → **Users and permissions** → Add user →
   e-mail servisního účtu → oprávnění **Full** (server `mcp-search-console` ho vyžaduje).
4. Sitemapu zatím neposílat — web je na `noindex`. Až půjde ven: vytvořím `sitemap.xml`
   v Laravelu a pošle se přes Sitemaps → `https://www.tuptudu.com/sitemap.xml`.

### 4. Google Ads (~20 min)
1. https://ads.google.com → **Start now** → přihlásit stejným Google účtem. Průvodce nutí
   do první kampaně — dole je odkaz **„Create an account without a campaign"** (někdy pod
   „Are you a professional marketer? Switch to expert mode"). Země **Czechia**, pásmo Praha,
   měna **CZK** (měnu a pásmo později nelze změnit). Platební údaje nevyplňovat, dokud nebude
   první kampaň. **Zapsat Customer ID** (10 číslic vpravo nahoře, `123-456-7890`).
   Návod Googlu: https://support.google.com/google-ads/answer/6366720
2. Přístup pro servisní účet: vlevo **Admin** → **Access and security** → Users → „+" →
   e-mail servisního účtu → úroveň **Standard** → Send invitation (servisní účet nic
   nepotvrzuje, přístup je hned). Standard = čtení i úpravy kampaní, ne správa uživatelů
   a fakturace; MCP server stejně jen čte, úpravy jen přes potvrzený skript.
3. Úroveň API přístupu: https://console.cloud.google.com/google/ads-apis/overview → vybrat
   projekt `TupTuDu marketing` → ukáže **Test** → rozbalit **Upgrade access level** → požádat
   o **Explorer**. Do formuláře: interní nástroj pro analýzu vlastního účtu, bez externích
   uživatelů. Kontrola je automatická, obvykle do pár minut až hodin.
   Popis úrovní: https://developers.google.com/google-ads/api/docs/api-policy/access-levels
4. Propojit s GA4 (až bude): v GA4 Admin → Google Ads links → Link → vybrat účet.
   Konverze (registrace) se pak importují do Ads z GA4 událostí.

### 5. Ověření na PC (Claude)
Po krocích 1–4 poslat: Project ID, e-mail servisního účtu, Measurement ID, Customer ID
(nic z toho není tajné; tajný je jen JSON klíč, ten zůstává v souboru).
1. Proměnné prostředí uživatele (jednorázově, PowerShell):
   ```powershell
   [Environment]::SetEnvironmentVariable('TUPTUDU_GOOGLE_SA', 'C:\Users\HP\.tuptudu-google\service-account.json', 'User')
   [Environment]::SetEnvironmentVariable('TUPTUDU_GCP_PROJECT', '<project-id>', 'User')
   ```
   Pak restart VS Code (aby viděl nové proměnné i `C:\Users\HP\.local\bin` v PATH).
2. `.mcp.json` v kořeni projektu (bez tajemství, může do gitu):
   ```json
   {
     "mcpServers": {
       "analytics": {
         "command": "pipx",
         "args": ["run", "analytics-mcp"],
         "env": {
           "GOOGLE_APPLICATION_CREDENTIALS": "${TUPTUDU_GOOGLE_SA}",
           "GOOGLE_CLOUD_PROJECT": "${TUPTUDU_GCP_PROJECT}"
         }
       },
       "google-ads": {
         "command": "pipx",
         "args": ["run", "--spec", "git+https://github.com/googleads/google-ads-mcp.git", "google-ads-mcp"],
         "env": {
           "GOOGLE_APPLICATION_CREDENTIALS": "${TUPTUDU_GOOGLE_SA}",
           "GOOGLE_PROJECT_ID": "${TUPTUDU_GCP_PROJECT}"
         }
       },
       "search-console": {
         "command": "uvx",
         "args": ["mcp-search-console"],
         "env": {
           "GSC_CREDENTIALS_PATH": "${TUPTUDU_GOOGLE_SA}",
           "GSC_SKIP_OAUTH": "true"
         }
       }
     }
   }
   ```
3. Kouřový test: GA4 `get_account_summaries` (musí vidět property), Search Console výpis
   properties (musí vidět `sc-domain:tuptudu.com`), Ads `list_accessible_customers`
   (musí vrátit Customer ID). Zapsat výsledek sem do stavu.

### 6. Co pak udělám v kódu
- Cookie lišta se souhlasem + Google consent mode v2 + GA4 tag z `GA4_MEASUREMENT_ID`
  (cs/en překlady), úprava zásad soukromí čl. 3 (cs i en, posunout „Účinné od").
- `sitemap.xml` a `robots.txt` připravené na zrušení `noindex`.
- Do `CLAUDE.md` pravidla pro „analyzuj web" (jaká data, jaké období, co smím měnit sám,
  co jen s potvrzením — rozpočty a nabídky v Ads nikdy bez potvrzení).
- Později: vlastní zápis do Ads (Python `google-ads` knihovna nebo REST), Sklik API,
  PageSpeed Insights.

## Odkazy
- GA4 MCP (oficiální): https://github.com/googleanalytics/google-analytics-mcp
- Google Ads MCP (oficiální): https://github.com/googleads/google-ads-mcp
- Search Console MCP (komunitní, uvx `mcp-search-console`): https://github.com/AminForou/mcp-gsc
- Google Ads API — konec developer tokenů: https://developers.google.com/google-ads/api/docs/api-policy/developer-token
- Google Ads API — první volání (servisní účet): https://developers.google.com/google-ads/api/docs/get-started/make-first-call
