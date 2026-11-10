# Modul: Statistiky (Masterteam ▸ Přehled)

## Co modul dělá
Úvodní stránka Masterteamu (`/masterteam`, v menu Přehled, zobrazí se po přihlášení): návštěvy webu,
registrace s počtem platících, výkon ve vyhledávání Google a indexace stránek. Jeden přepínač období
(7, 30, 90 dní, rok, vše) řídí všechny grafy. Adresa `/masterteam/statistiky` přesměruje na Přehled.
Jen pro master tým, česky, nepřekládá se.

## Stav (10. 11. 2026, lokálně, nenasazeno)
- **Návštěvy webu** z GA4 (Data API): návštěvníci, návštěvy, zobrazené stránky po dnech, podíl
  návštěvníků, kteří se registrovali.
- **Registrace a platící** z vlastní databáze: registrace za den, 7denní a 30denní klouzavý průměr,
  počet platících ke konci dne, tržby za období bez DPH podle měny.
- **Vyhledávání Google** ze Search Console: zobrazení, kliknutí, průměrná pozice.
- **Indexace**: kolik adres ze sitemapy má Google v indexu, denní historie ve vlastní tabulce
  (první kontrola 10. 11. 2026 lokálně: 48 z 51), výpis stránek mimo index se stavem podle Googlu.
- Klíč servisního účtu je v GitHub Secret `GOOGLE_SA_JSON` (uložen 10. 11. 2026) a v `deploy.yml`.
  Po nasazení: migrace proběhne sama, cron začne plnit indexaci do hodiny.

## Soubory
| Co | Kde |
|---|---|
| Stránka a data grafů | `app/Http/Controllers/Masterteam/StatistikyController.php` |
| Pohled, Chart.js, Alpine `prehled()` | `resources/views/masterteam/statistiky.blade.php` |
| Čtení z GA4 a Search Console | `app/Services/Google/GoogleApi.php` |
| Denní kontrola indexace | `app/Console/Commands/IndexaceKontrola.php` (`indexace:kontrola`), `App\Support\PlanovaneUlohy` |
| Tabulky `indexace_url`, `indexace_denne` | `database/migrations/2026_11_10_000001_create_indexace_tables.php` |
| Routy `masterteam.dashboard`, `masterteam.statistiky.{registrace,navstevy,vyhledavani}` | `routes/web.php` |
| Nastavení | `config/services.php` → `google_api` |

## Přístup ke Googlu
- Servisní účet z `modules/marketing.md` (GA4 Editor, Search Console plný přístup). Stránka jen čte.
- Klíč: produkce `GOOGLE_SA_JSON` = base64 souboru JSON (GitHub Secret → `deploy.yml`), lokálně
  `GOOGLE_SA_SOUBOR` = cesta k souboru v `.env`. Bez klíče stránka ukáže jen registrace.
  Výměna klíče: `base64 -w0 soubor.json | gh secret set GOOGLE_SA_JSON` a nasadit.
- Bez knihoven Googlu: token přes podepsané JWT, v cache 50 minut.
- Odpovědi se drží v cache (návštěvy 30 minut, vyhledávání hodinu). Selhání = `Log::error`
  (zrcadlí se do bugů) a hláška u grafu, ostatní grafy běží dál.
- Čísla služeb (GA4 `561796471`, Search Console `sc-domain:tuptudu.com`) jsou v configu, nejsou tajná.

## Pravidla výpočtu
- Master tým se nepočítá nikde (interní účty, tarif bez placení).
- **Platící v minulosti** se počítají ze začátku a konce předplatného (`subscriptions.created_at`
  až `ends_at`), historii stavů nedržíme. Krátké výpadky (nezaplacené obnovení, pozastavení) se
  zpětně neprojeví.
- **Tržby** = transakce `completed` a `paid` podle `billed_at`, `total − tax`, částky z Paddlu jsou
  v haléřích a centech. Poplatky Paddlu ani vrácené platby odečtené nejsou. Měny se nesčítají.
- Klouzavé průměry mají předstih 29 dní, aby měl plné okno i první den grafu.
- **Vše**: registrace od první registrace, data z Googlu od `google_api.mereno_od` (1. 11. 2026,
  nasazení GA4 a povolení vyhledávačům). Osy grafů se tedy v tomto období mohou lišit.
- GA4 měří jen se souhlasem v cookie liště, návštěvnost je podhodnocená. Podíl registrací se proto
  neukáže, když je registrací víc než změřených návštěvníků.
- Search Console dopočítává poslední dva až tři dny; dny po posledním známém jsou v grafu prázdné.
- Barvy grafů se čtou z CSS proměnných značky, žádný hex.

## Indexace
- Search Console nemá v API historii počtu zaindexovaných stránek, proto `indexace:kontrola`:
  stáhne produkční sitemapu, nové adresy založí, zmizelé smaže, a přes URL Inspection zjistí stav.
  Zaindexováno = verdikt `PASS`.
- Jeden dotaz trvá kolem 7 s, proto souběžně po 25. Cron běží každou hodinu, adresa se kontroluje
  nejvýš jednou za 20 hodin, jeden běh má strop 35 s (cron je webový požadavek) a zbytek dobere
  další běh. Limit Googlu: 2 000 dotazů denně, 600 za minutu.
- `php artisan indexace:kontrola --vse` zkontroluje všechno hned (51 adres za 25 s).
- Denní součet se počítá jen z adres, které už Google aspoň jednou posoudil.

## Možná rozšíření (nezadáno)
- Platící v penězích: měsíční opakovaný příjem jako další čára.
- Zdroje návštěv (vyhledávání, přímo, odkazy) a nejčtenější stránky z GA4.
- Hledané výrazy a stránky ze Search Console.
