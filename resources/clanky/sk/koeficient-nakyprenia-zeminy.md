---
titulek: Koeficient nakyprenia zeminy: koľko skončí na korbe
klicove_slovo: koeficient nakyprenia zeminy
popis: Zisti, o koľko viac miesta zaberie zemina po vykopaní. Koeficienty pre bežné zeminy, prepočet na kubíky na odvoz aj na tony s príkladom.
perex: Koeficient nakyprenia zeminy hovorí, o koľko viac miesta zaberie zemina po vykopaní. Pri bežnej hline je asi 1,25, teda zhruba o štvrtinu viac, pri rozpojenej skale skoro o polovicu. Z 10 m³ výkopu v hline je tak na korbe asi 12,5 m³.
publikovano: 2026-11-11
overeno: 2026-11-11
autor: Libor z TupTuDu
revize: 2026-11-12
stav: zverejneno
klic: koeficient-nakypreni-zeminy
zeme: SK
souvisejici: vykop-zakladov, kreslenie-podorysu-domu
- Technický dozor Brno: Zemina z výkopu (koeficienty nakyprenia; fyzikálna vlastnosť zeminy, platí rovnako na Slovensku) | https://dozor-brno.cz/poradna-vykopova-zemina.html
- RTS, HSV 800-1: Zemné práce (nakyprenie a objemová hmotnosť podľa tried, výkop sa účtuje v m³ rastlej zeminy) | https://www.cenovasoustava.cz/files/HSV_800-1.pdf
- FAST VUT: Zemné práce (nakyprenie, ornica 20 %) | https://www.fce.vutbr.cz/tst/x_txt_predmet_bw51_1_zemni-prace.pdf
- Kolik materiálu: Kalkulačka výkopu (nakyprenie 1,25) | https://kolikmaterialu.cz/vykop/
- Vodárne, cenník Výkony dopravy platný od 1. 8. 2025 (sklápacie automobily účtované za km a za hodinu) | https://www.vodarne.eu/upload/docs/cenniky/vykony-dopravy/vykony-dopravy.pdf
- Nariadenie vlády 330/2018 Z. z. (sadzby poplatkov za uloženie odpadov na skládku v eurách za tonu) | https://www.zakonypreludi.sk/zz/2018-330
- TupTuDu, editor: objem výkopu a nakyprenie len s parcelou (maZaklady v public/js/koncept-v3/dum.js), parcela z katastra a výšky DMR 5.0 1 m aj na Slovensku (config/pozemky.php, modules/lokalizace.md, stav 12. 11. 2026) | interní
---
::nakypreni

## Koeficient nakyprenia pre bežné zeminy

| Druh zeminy | Koeficient nakyprenia |
|:---|---:|
| Štrkopiesok | 1,15 |
| Ornica | 1,20 |
| Bežná hlina | 1,25 |
| Íl | 1,30 |
| Rozpojená skala | 1,45 |

Objem v zemi vynásob koeficientom a máš objem na kope alebo na korbe. Hodnoty sú orientačné a platia hneď po vykopaní. Skutočné nakyprenie závisí hlavne od druhu zeminy a od toho, ako bola uľahnutá.

## Prečo sa uvádzajú dve čísla

**Rastlý objem** je to, čo bolo v zemi. Podľa neho sa počíta, koľko sa vykope a koľko sa vráti do zásypu, ktorý sa hutní po vrstvách.

**Nakyprený objem** je to, čo leží na kope a na korbe. Podľa neho plánuješ miesto na pozemku aj [odvoz zeminy](clanek:vykop-zakladov). Na Slovensku má stavebná firma výkop v rozpočte obvykle v m³ rastlej zeminy. Dopravca účtuje kubíky na korbe, jazdy alebo kilometre a hodiny, skládka tony. Pýtaj sa preto, o ktoré kubíky ide.

## Koľko váži kubík zeminy

Objemová hmotnosť zeminy je orientačne 1,5 až 1,9 t na m³ rastlej zeminy, bežná hlina okolo 1,8 t, mokrá aj viac. Nakyprením sa mení objem, hmotnosť zostáva rovnaká. Z 10 m³ výkopu v hline je tak 12,5 m³ na korbe a asi 18 t. Pri objednávke auta preto záleží na tom, čo sa naplní skôr: objem korby, alebo nosnosť.

## Koľko zeminy budeš odvážať ty

Koľko sa pri tvojom dome vykope a koľko z toho zostane, vypočíta [kalkulačka zeminy](clanek:vykop-zakladov). Rozmery, ktoré do nej zadáš, ti dá [pôdorys nakreslený v TupTuDu](aplikace:) v skutočných rozmeroch. Keď k domu vyberieš na mape parcelu z katastra, editor spočíta výkop podľa terénu sám a v paneli Základy ukáže rastlý aj nakyprený objem.

::vyzva Zisti rozmery svojho domu | Nakresli pôdorys v skutočných rozmeroch a kóty ti ukážu rozmery domu aj dĺžky stien, ktoré zadáš do kalkulačky zeminy. Verzia Zadarmo má 30 úprav denne a jeden projekt.
