# Modul: Statistiky (Masterteam)

## Co modul dělá
Stránka `/masterteam/statistiky`: návštěvy webu a graf registrací s počtem platících.
Jen pro master tým, česky, nepřekládá se.

## Stav (10. 11. 2026, lokálně)
- **Registrace a platící** hotové: sloupce = registrace za den, čáry = 7denní a 30denní klouzavý
  průměr, schodová čára na pravé ose = počet platících ke konci dne. Dlaždice: registrace za období,
  uživatelů celkem, platících teď (a podíl), tržby za období bez DPH podle měny. Rozsah 7 / 30 / 90 / 365 dní
  a celé období.
- **Návštěvy** připravené jako vložený přehled z Looker Studia. Čeká na adresu přehledu
  (`LOOKER_NAVSTEVY_URL`), do té doby stránka ukazuje upozornění.
- **Indexace** zatím není, čeká na rozhodnutí o variantě (níže).

## Soubory
| Co | Kde |
|---|---|
| Stránka a data grafu | `app/Http/Controllers/Masterteam/StatistikyController.php` |
| Pohled, Chart.js | `resources/views/masterteam/statistiky.blade.php` |
| Routy `masterteam.statistiky`, `masterteam.statistiky.registrace` | `routes/web.php` |
| Adresa přehledu návštěv | `config/services.php` → `looker.navstevy_url`, `.env` `LOOKER_NAVSTEVY_URL` |

## Pravidla výpočtu
- Master tým se nepočítá nikde (interní účty, tarif bez placení).
- **Platící v minulosti** se počítají ze začátku a konce předplatného (`subscriptions.created_at`
  až `ends_at`), historii stavů nedržíme. Krátké výpadky (nezaplacené obnovení, pozastavení) se
  zpětně neprojeví.
- **Tržby** = transakce `completed` a `paid` podle `billed_at`, `total − tax`, částky z Paddlu jsou
  v haléřích a centech. Poplatky Paddlu ani vrácené platby odečtené nejsou. Měny se nesčítají.
- Klouzavé průměry mají předstih 29 dní, aby měl plné okno i první den grafu. U celého období
  předstih není (před první registrací nic není).
- Barvy grafu se čtou z CSS proměnných značky, žádný hex.

## Návštěvy přes Looker Studio
1. Přehled vznikne z hotové šablony jedním odkazem (zdroj dat GA4, účet 414230716, služba 561796471):
   `https://lookerstudio.google.com/reporting/create?c.reportId=1316e27b-0774-4ac2-8972-30fedabfec00&r.reportName=TupTuDu%20n%C3%A1v%C5%A1t%C4%9Bvy&ds.*.connector=googleAnalytics&ds.*.accountId=414230716&ds.*.propertyId=561796471`
   Odkaz zatím nikdo neotevřel, takže není ověřený.
2. V přehledu uložit, pak Soubor → Vložit přehled → povolit vkládání a zkopírovat adresu
   `https://lookerstudio.google.com/embed/reporting/…`.
3. Adresu dát do `.env` (`LOOKER_NAVSTEVY_URL`) a do `deploy.yml` vedle `GA4_MEASUREMENT_ID` (není tajná).
- GA4 měří od 1. 11. 2026 a jen se souhlasem v cookie liště, čísla jsou tedy nižší než skutečnost.
- Přehled se zobrazí jen tomu, kdo je v prohlížeči přihlášený do Google účtu s přístupem k přehledu.

## Otevřené varianty (rozhodne Libor)
- **Návštěvy vlastním grafem** místo vloženého přehledu: server se ptá GA4 Data API servisním účtem
  (`modules/marketing.md`). Jde pak spojit návštěvy, registrace a platící do jednoho grafu a spočítat
  konverzi. Vyžaduje klíč servisního účtu na produkci (GitHub Secret).
- **Indexace**: Search Console nemá v API historii počtu zaindexovaných stránek. Možnosti:
  (a) graf zobrazení a kliknutí z vyhledávání (API, historie 16 měsíců),
  (b) denní kontrola adres ze sitemapy přes URL Inspection a ukládání počtu do vlastní tabulky,
  graf se plní ode dne zapnutí (limit 2 000 dotazů denně).
  Obojí potřebuje stejný klíč na produkci jako vlastní graf návštěv.
- **Platící v penězích**: měsíční opakovaný příjem (součet běžících předplatných přepočtený na měsíc),
  případně sloupce tržeb po týdnech. Teď je v grafu počet platících a tržby jsou v dlaždici.
