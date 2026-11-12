---
titulek: Výkop základov: koľko zeminy zostane, kalkulačka
klicove_slovo: výkop základov
popis: Vypočítaj si, koľko zeminy z výkopu základov zostane a koľko áut ju odvezie. Kalkulačka zeminy zadarmo a príklady pre dom na pásoch aj s pivnicou.
perex: Koľko zeminy z výkopu základov zostane? Pri dome 12 × 10 m na rovine a na pásoch sa vykope asi 60 m³, zhruba 21 m³ sa vráti a skoro 40 m³ zostane, z toho 30 m³ ornice. Keď ornica zostane na záhrade, odvezú sa v ideálnom prípade asi 2 autá. S pivnicou zostane skoro 400 m³.
publikovano: 2026-11-11
overeno: 2026-11-11
autor: Libor z TupTuDu
revize: 2026-11-12
stav: zverejneno
klic: kolik-zeminy-z-vykopu
zeme: SK
obrazek: /img/clanky/kolik-zeminy-z-vykopu/vykop-svah.jpg
souvisejici: koeficient-nakyprenia-zeminy, kreslenie-podorysu-domu
- ASB: Plošné zakladanie v nezámrznej hĺbke (na Slovensku 800 až asi 1 600 mm, Žilina a Košice 800 až 900 mm, Poprad a Orava 1 100 až 1 200 mm, štrk a piesok 800 mm, hlina 1 000 mm, íly 1 200 až 1 500 mm, vysoko plastické do 1 600 mm, skala 500 mm; STN 73 1001:2010) | https://www.asb.sk/stavebnictvo/realizacia-stavieb/plosne-zakladanie-v-nezamrznej-hlbke-z-hladiska-stavebnej-tepelnej-techniky
- Zákon 220/2004 Z. z. o ochrane a využívaní poľnohospodárskej pôdy, § 2 písm. b (záhrady patria do poľnohospodárskej pôdy), § 12 ods. 2 písm. e (skrývka humusového horizontu pri trvalom odňatí a jej hospodárne využitie), § 17 (rozhodnutie o odňatí schvaľuje bilanciu skrývky; v zastavanom území obce do 1 000 m² rozhodnutie netreba, okresný úrad vydá stanovisko) | https://www.zakonypreludi.sk/zz/2004-220
- Vyhláška 508/2004 Z. z. (skládka skrývky humusového horizontu najviac 3 m, svahy 1 : 1,5 až 2) | https://www.zakonypreludi.sk/zz/2004-508
- Zákon 79/2015 Z. z. o odpadoch, § 1 ods. 2 písm. h (nekontaminovaná zemina použitá na výstavbu v prirodzenom stave na mieste, kde bola vykopaná, nie je odpad) | https://www.zakonypreludi.sk/zz/2015-79
- ČESKÉSTAVBY.cz: Bez kvalitných základov rodinný dom nepostavíme (ornica 25 až 30 cm, deponia, zásyp štrkom; prax rovnaká na Slovensku) | https://www.ceskestavby.cz/clanky/bez-kvalitnich-zakladu-rodinny-dum-nepostavime-28882.html
- ESTAV.cz: Základové pätky a pásy (medzi pásmi hutnená zemina, niekedy štrk) | https://www.estav.cz/cz/3225.zakladove-patky-a-pasy-jak-je-vybudovat-jak-jim-rozumet
- ESTAV.cz: Podkladová betónová doska a jej podsyp (výkopok do zásypu, íly a hliny F5 až F8 nie, štrk ako náhrada) | https://www.estav.cz/cz/8774.zaklady-pro-rodinny-dum-podkladni-betonova-deska-a-jeji-podsyp-3
- Kolik materiálu: Koľko stojí odvoz zeminy (Tatra odvezie asi 7 až 8 m³ nakyprenej zeminy) | https://kolikmaterialu.cz/kolik-stoji-odvoz-zeminy/
- ESTAV.cz: Ako si postaviť rodinný dom, zemné práce (pásy, ryhy po daždi skoro o polovicu širšie, ornica zostala, odvezených 9 áut) | https://www.estav.cz/cz/548.jak-si-postavit-rodinny-dum-zemni-prace
- FAST VUT: Zemné práce (ornicu skladovať najviac do 1,5 m, odporúča sa 1,2 m) | https://www.fce.vutbr.cz/tst/x_txt_predmet_bw51_1_zemni-prace.pdf
- TupTuDu, kalkulačka public/js/kalkulacka-zemina.js, výchozí hodnoty overené pre Slovensko 11. 11. 2026 (spára 100 cm, ornica 25 cm, pracovný priestor 80 cm), príklad prepočítaný: vykopané 59,6 m³, vráti sa 21,3 m³, zostane 38,3 m³, ornica 30,0, výkopok 8,3, ryhy 20,3, hromada 74,4; pivnica 651,6 / 30,0 / 367,5 / 814,5 | interní
- TupTuDu, editor: riadok Základy len s parcelou z katastra (maZaklady v public/js/koncept-v3/dum.js), katastrálne služby len pre Česko (config/lokalizace.php) | interní
---
::kalkulacka-zeminy spara=100 | ornice=25 | odkop=80

## Prečo pri výkope základov nestačí dĺžka × šírka × hĺbka

Tento vzorec povie, koľko zeminy vykopeš. Teba však zaujíma, koľko sa vráti a koľko musíš odviezť. Rozmery domu do kalkulačky zadáš z pôdorysu, postup nájdeš v článku o [kreslení pôdorysu domu](clanek:kreslenie-podorysu-domu).

## Koľko zeminy z výkopu zostane a odkiaľ sa berie

::rez-vykopu

Príklad: dom 12 × 10 m s jednou vnútornou nosnou stenou, podlaha 30 cm nad terénom, hrúbka podlahy s podkladovou doskou a podsypom 45 cm, ornica 25 cm, pracovný pás okolo domu 80 cm a spodok pásov 1 m pod terénom.

- **Ornica:** zoberie sa jej asi 39 m³. Okolo domu sa 9 m³ vráti, pod domom nie, zostane 30 m³. Prebytok ornice je zhruba plocha domu × hrúbka ornice.
- **Ryhy pre pásy:** asi 54 m pásov × 0,5 m × 0,75 m = 20 m³ výkopku, teda zeminy pod ornicou. Ryhu vyplní betón, výkopok z nej zostane. Hĺbku určuje hlavne nezámrzná hĺbka, na Slovensku zvyčajne 0,8 až 1,2 m pod terénom, v íloch 1,2 až 1,5 m, vo vysoko plastických íloch kvôli vysychaniu až 1,6 m.
- **Dosypanie pod dom:** spodok podsypu je 15 cm pod terénom, ornica siahala do 25 cm, chýba 10 cm, teda 12 m³. Sype sa obvykle hutnený výkopok, výkopku potom zostane 8 m³. Íl a plastickú hlinu nahradí štrk, rozhoduje projekt.

## S pivnicou zostane asi desaťkrát viac

| Dom 12 × 10 m na rovine | Vykopané | Ornica navyše | Výkopok navyše | Najväčšia hromada |
|:---|---:|---:|---:|---:|
| Pásy, pod dom výkopok | 60 | 30 | 8 | 74 |
| Celá pivnica, konštrukčná výška 3,05 m, pásy | 652 | 30 | 368 | 814 |

Čísla sú zaokrúhlené, v m³ rastlej zeminy, teda tak, ako leží v zemi. Hromada je nakyprená.

::rez-sklepu

Najväčšia hromada je väčšia ako prebytok: je nakyprená a leží v nej aj zemina, ktorá sa vráti. Ornicu skladuj zvlášť a radšej nízko, do 1,5 m. Hromady z príkladu zaberú aj so svahmi asi 80 až 100 m².

## Odvoz zeminy: koľko áut počítať

Na korbe zaberie hlina asi o štvrtinu viac ako v zemi a auto jej odvezie 7 až 10 m³ podľa veľkosti. Celých 38 m³ z príkladu je na korbe asi 48 m³, teda 5 až 7 áut. Keď ornicu necháš na záhrade, odíde len výkopok, asi 10 m³ na korbe, teda zhruba 2 autá. S pivnicou a s ornicou na záhrade asi 45 až 65 áut. Prepočet na tony je v článku o [koeficiente nakyprenia](clanek:koeficient-nakyprenia-zeminy).

To je ideálny prípad, v praxi počítaj s rezervou. Ryhy bývajú širšie, časť zeminy sa do zásypu nehodí, pod domom môže byť štrk a na pozemku chýba miesto. Jeden stavebník pri dome na pásoch odviezol 9 áut, ornicu pritom nechal na pozemku a ryhy sa mu po daždi rozšírili skoro o polovicu.

Pre vlastný odhad spočítaj v kalkulačke nakyprenú ornicu navyše a nakyprený výkopok navyše a vydeľ siedmimi. Najväčšiu hromadu nepočítaj, časť sa z nej vráti. Koľko auto odvezie, povie dopravca.

::vyzva Nakresli dom v skutočných rozmeroch | Kalkulačka počíta obdĺžnik. V editore nakreslíš skutočný pôdorys, kóty ti ukážu rozmery domu aj dĺžky stien na zadanie do kalkulačky a dom uvidíš v 3D. Verzia Zadarmo má 30 úprav denne a jeden projekt.

## Na svahu to vyjde inak

Kalkulačka počíta rovinu. Na svahu sa základy robia po stupňoch a dole bývajú vyššie. O objeme najviac rozhoduje, ako vysoko dom osadíš.

::obrazek /img/clanky/kolik-zeminy-z-vykopu/zaklad-svah.webp | 3D pohľad na prízemný dom na svahu s oknami na všetkých stranách a vchodom na hornej strane svahu, sivý základ je na dolnej strane vyšší | Dom na mierne svahovitej parcele: základ (pre názornosť sivý) sa na dolnej strane pretiahne od terénu až pod podlahu. Terén parcely pozná editor TupTuDu zatiaľ len v Česku | 1200 | 700

## Kam so zeminou

Záhrada aj orná pôda patria na Slovensku do poľnohospodárskej pôdy. Kto ju použije na stavbu, musí ornicu zobrať zvlášť a hospodárne využiť, podmienky určí okresný úrad. Ornica sa obvykle vracia na záhradu. Vhodný výkopok použi na terénne úpravy, väčšie úpravy patria do projektu. Nekontaminovaná zemina, ktorá sa pri stavbe použije priamo na pozemku, nie je odpad. Čo z pozemku odíde, je spravidla odpad, preto odvoz nechaj firme s dokladom, kam zemina išla.

V číslach nie sú prípojky, vsakovacia jama, žumpa ani čistiareň, nádrž na dažďovú vodu, príjazd, terasa ani chodníky. Ornica sa počíta len z pásu 80 cm okolo domu a celá sa tam vracia, aj kde bude okapový chodník.
