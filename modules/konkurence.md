# Modul: Konkurence (Masterteam ▸ Konkurence)

## Co modul dělá
Analýza konkurence uložená v DB místo jednorázové stránky. Postupně ji zpřesňujeme a zhruba jednou
za měsíc měříme znovu, abychom viděli, kdo se vyvíjí, jak intenzivně a kdo stagnuje.
Stránka `/masterteam/konkurence`, jen pro master tým, česky, nepřekládá se.

Původní analýza (25 aplikací × 42 funkcí, konkurenti 1. 11., TupTuDu 4. 11. 2026) zůstává jako archiv na
soukromé stránce https://claude.ai/artifact/NCyfAVyDQ1R9aUTMoMKaGo. Jsou tam i texty, které do DB nešly:
nejpalčivější požadavky, plán funkcí, nápady, rozbor jazyků a zemí a podrobný ceník.

## Stav (12. 11. 2026, lokálně, nenasazeno)
- Tabulky, import, stránka se čtyřmi záložkami, přepínače režimu u parametrů i aplikací.
- V DB je měření „Listopad 2026“: původní analýza, TupTuDu aktualizované 12. 11. podle dokumentace modulů,
  nové weby z todo, jazyky a signály vývoje z rešerše 12. 11. 2026, nejlevnější tarify v Kč z ceníku 29. 10. 2026.
  28 aplikací + TupTuDu, 103 parametrů, 1 536 hodnot, 93 událostí.
- Nové parametry jsou zatím vyplněné jen tam, kde to šlo z dřívějších dat a rešerše (jazyky, vývoj, ceny, TupTuDu).
  Zbytek doplní první úplné měření.
- Na produkci zatím nic. Při nasazení se data musí přenést zvlášť (viz Import), migrace vytvoří jen prázdné tabulky.
- Automatické měsíční měření zatím neexistuje, viz Měsíční měření.

## Režim sledování (parametry i aplikace)
| Režim | Význam |
|---|---|
| **Sledovat** | Měří se podrobně, je v matici a smí do veřejného srovnání na webu (`modules/srovnani.md`). |
| **Tiše** | Měří se pro jistotu a jen interně. Na web nikdy. Obvykle méně podrobně nebo jen strojově. |
| **Nesledovat** | Neměří se. Parametr nebo aplikace zůstává v katalogu, aby šly kdykoli zapnout. |

Přepínač ukládá hned (PATCH `konkurence/parametr/{id}/rezim`, `konkurence/konkurent/{id}/rezim`).
**Signály vývoje (skupina k) jsou vždy jen Tiše:** „stagnace“ je hodnotící soud o konkurentovi a ve srovnávací
reklamě je zakázaný (§ 2980 OZ, viz `modules/srovnani.md`). Stejně tak regulace (`f_regulace`, téma je odložené
a neslibujeme ho) a AI dispozice (`h_ai_dispozice`, rozhodnuto bez AI).

## Záložky
- **Přehled:** aplikace seřazené podle režimu a bodů. Body = má 1, částečně ½ ze sledovaných parametrů typu
  má/nemá. Dál stav vývoje, poslední vydání, události po měsících za 12 měsíců (oranžová síla = počet),
  jazyky nástroje (plně) a webu (obrysem) pro cílové jazyky `cs sk pl de fr es it en`, nejlevnější tarif v Kč.
  Od druhého měření sloupec Změny = počet hodnot, které se proti minulému měření liší.
- **Parametry:** katalog po skupinách s přepínačem, štítkem „nový“ (přidán po začátku měření), typem hodnoty,
  štítkem „strojově“ a počtem aplikací, u kterých je hodnota zjištěná. Filtr Vše / režimy / Nové návrhy.
- **Matice:** poslední měření, parametry a aplikace v režimu Sledovat, přepínačem i Tiše. Najetí na buňku
  ukáže poznámku, zdroj a datum ověření. U seznamu je v buňce počet.
- **Události:** vydání, nové funkce, změny cen a obsahu po měsících.

## Datový model
- `konkurence_parametry`: `klic` (a_steny…), `skupina` (a–k, `KonkurenceParametr::SKUPINY`), `typ`
  (stav | cislo | text | seznam | datum), `rezim`, `jak_merit`, `automaticky`, `pridano`.
- `konkurenti`: `klic` (řádek `tuptudu` jsme my), `segment` (`Konkurent::SEGMENTY`, nově `kalkulacka`), `rezim`,
  popis (`kvalita`, `navic`, `chybi`, `poznamka`).
- `konkurence_mereni`: jedno kolo (datum, název „Listopad 2026“).
- `konkurence_hodnoty`: hodnota parametru u aplikace v kole. Stav `ano | castecne | ne | ? | skryte` + `placene`,
  jinak `cislo`, `data` (seznam), `text`; `poznamka`, `zdroj` (URL, u TupTuDu cesta v kódu nebo modul), `overeno`.
  **Každé kolo je úplný snímek:** co se v kole znovu neověřilo, převezme se se starým `overeno`
  (`prevzit_z` v importu). Vývoj = rozdíl dvou snímků (`KonkurenceHodnota::otisk`).
- `konkurence_udalosti`: datum (u měsíční přesnosti 1. den měsíce), typ (vydani | funkce | cena | obsah | jine),
  popis, zdroj. Z nich se kreslí intenzita vývoje.

## Import a data mimo repozitář
**Repozitář je veřejný**, proto hodnoty a popisy konkurentů do něj nepatří (režim Tiše by ztratil smysl).
Import čte JSON z `storage/app/konkurence/` (git ho ignoruje):
```
php artisan konkurence:import                       # storage/app/konkurence/import.json
php artisan konkurence:import cesta.json --prepsat-rezim
```
Páruje se podle klíčů, jde pustit opakovaně. Režim u existujících řádků nepřepíše (nastavuje ho Libor),
jen s `--prepsat-rezim`. Tvar je popsaný v `App\Support\KonkurenceImport`. Výchozí import 12. 11. 2026 sestavil
skript z dat stránky analýzy, katalogu parametrů a rešerší. Rešerše (JSON se zdroji pro strojové měření),
katalog a skript leží v `storage/app/konkurence/reserse-2026-11-12/` (jen lokálně, mimo git).

Pozor: `services/srovnani-ukazka/konkurence-data.json` (stav 1. 11. 2026) je v repozitáři od 3. 11. 2026, tedy veřejně.

**Přenos na produkci (zatím nepostaveno):** při prvním nasazení chráněný endpoint pod `CRON_TOKEN`, který přijme
stejný JSON a zavolá `KonkurenceImport::importuj` (zápis přes `db-proxy` je jen pro bugy). Po nasazení je pravdou
produkční DB: režimy přepínat tam, lokálně jen zkoušet.

## Katalog parametrů (12. 11. 2026)
42 původních (a–h) + 61 nových, celkem 103: Sledovat 52, Tiše 41, Nesledovat 10 (doporučení, Libor přepíná).
- Nové skupiny: **i Jazyky a země** (sem přešly `h_cestina` a `h_jazyky`; seznamy jazyků nástroje a webu,
  pozemková data v dalších zemích, národní normy), **j Ceny a obchod** (ceník, nejlevnější tarif v Kč,
  limity zdarma, licence, kredity), **k Vývoj a aktivita** (stav vývoje, poslední vydání, vydání za 6 měsíců,
  veřejné novinky, hodnocení a jejich počet v App Store, články za 6 měsíců, změny titulní stránky).
- Nové parametry k palčivým bodům: kreslení dotykem, ukázkový dům a šablony, koupelna, výkres s kótami
  v měřítku, návody v nástroji, základy podle domu, rizika pozemku.
- Typ seznam (jazyky) se v přehledu ukazuje po cílových jazycích, takže je vidět, kdo nám konkuruje v polštině,
  němčině atd.

## Nové weby z todo (rešerše 12. 11. 2026)
- **pozemkov.cz — Sledovat.** Daturing s.r.o., Olomouc. Prověření pozemku (katastr, územní plán, sítě, povodně,
  sesuvy, stíny a okolní budovy z DMR 5G a DMP), výkopy a násypy pro obkreslenou plochu srovnanou na jednu výšku
  s cenou v Kč, výslovně bez základů. Analýzy jen v Pro 590 Kč měsíčně, dům nenavrhuje, jen česky. Aktivní vývoj.
  Konkuruje nám v pozemku a zemině, ne v návrhu domu.
- **kolikmaterialu.cz — Tiše.** 87 kalkulaček materiálu, ceník řemesel, rozpočet stavby, zdarma bez registrace.
  Výkop z ručně zadaných rozměrů bez terénu. Konkuruje hlavně ve vyhledávání (výkop, zemina, základy).
- **dozor-brno.cz — Nesledovat.** Web technického dozoru, kalkulačka zeminy je součást článku.

## Vývoj a jazyky (rešerše 12. 11. 2026)
- **Aktivní vývoj (13):** Planner 5D, Homestyler, SketchUp, Live Home 3D, HomeByMe, RoomSketcher, Rayon, magicplan,
  Maket, VizTerra, Autodesk Forma, syte, pozemkov.cz. **Údržba:** Sweet Home 3D, Home Designer, iScape, kolikmaterialu.cz.
  **Stagnace:** Floorplanner (poslední vydání 18. 9. 2025), Plan7Architekt (18. 2. 2025), Ashampoo (17. 3. 2026),
  Realtime Landscaping (ale má roční cyklus, verze 2027 čekat v lednu až únoru). **Nejasné:** Homeplot, Cedreo,
  GARDENA, Archistar, DJT, AIkatastr (bez veřejných novinek).
- Novinky důležité pro nás: Homestyler 6.0 (4/2026) parametrické schody, střecha a vikýře, 7/2026 import půdorysu z PDF;
  RoomSketcher AI převod půdorysu (12/2025); Planner 5D AI agent (9/2026); SketchUp a Planner 5D napojení na Claude.
- **Jazyky:** česky má nástroj jen Sweet Home 3D, Homeplot a GARDENA, slovensky jen Ashampoo a GARDENA.
  Polsky a německy má nástroj většina velkých plánovačů. V češtině a slovenštině jsme tedy skoro sami,
  v Polsku a Německu narazíme na zavedené konkurenty v jejich jazyce.
- Počty vydání nejsou u všech stejně přesné (App Store ukazuje jen 25 posledních verzí, někde jen datum ze sitemapy).
  **Změny titulní stránky ve Wayback** jsou u dynamických webů (SketchUp 2133, Homestyler, Floorplanner) nesmyslně vysoké
  a o vývoji nic neříkají; parametr `k_web_zmeny` je spíš na Nesledovat.
- Zdroje pro strojové měření jsou u každé aplikace v rešerši: App Store lookup API a historie verzí, WP REST API
  (hlavička X-WP-Total), RSS changelogů (Floorplanner, magicplan na Canny, Structure Studios), Zendesk API nápovědy.

## Měsíční měření (návrh, nepostaveno)
1. **Strojová část** (cron na produkci přes `PlanovaneUlohy`, jednou měsíčně, zdarma): nové kolo jako kopie
   minulého, App Store lookup API (verze, datum, počet hodnocení, jazyky), RSS a sitemap.xml (počet článků),
   Wayback CDX (změny titulní stránky a ceníku), otisk stránky ceníku a novinek. Změněné stránky označí k ověření.
2. **Ověření funkcí** (sezení Claude kolem 1. dne v měsíci, bez nákladů na API): jen aplikace, kde strojová část
   našla změnu nebo nové záznamy v novinkách. Změny hodnot + události.
3. **Stav vývoje** z událostí: aktivní vývoj = nová funkce aspoň jednou za 2 měsíce, údržba = jen opravy,
   stagnace = nic podstatného přes 6 měsíců.

## Otevřené body
- Libor projde přepínače (parametry i aplikace) a potvrdí katalog.
- Postavit strojovou část měsíčního měření a přenos dat na produkci.
- Úpravy hodnot a přidání parametru zatím jen importem, v rozhraní ne.
