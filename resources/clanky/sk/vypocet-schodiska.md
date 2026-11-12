---
titulek: Výpočet schodiska: výška schodu, vzorec a kalkulačka
klicove_slovo: výpočet schodiska
popis: Kalkulačka schodiska pre priame, lomené do L a do U aj točité schody. Počet a výška stupňov podľa slovenskej vyhlášky a normy, s nákresom v mierke.
perex: Výpočet schodiska začína výškou od podlahy dole k podlahe hore. Vydeľ ju asi 175 mm a zaokrúhli na celý počet výšok, šírku stupňa dopočítaš zo vzorca 2h + b = 630 mm. Na Slovensku vyhláška dovoľuje v jednom ramene najviac 16 stupňov a sklon hlavného schodiska najviac 35°. Pri bežných 3,00 m vyjde 17 výšok po 176 mm a šírka stupňa 277 mm, schodisko preto potrebuje medzipodestu.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
klic: vypocet-schodiste
zeme: SK
souvisejici: kreslenie-podorysu-domu, minimalne-rozmery-miestnosti
- Vyhláška MŽP SR 532/2002 Z. z. v znení 34/2020 Z. z., § 27 ods. 2 (podchodná výška, šírka ramena a šírka stupňa podľa STN 73 4130), ods. 3 (rovnaká výška stupňov v ramene, najviac 16 stupňov v ramene, pomocné schodisko 18), ods. 4 (sklon hlavného schodiska najviac 35°, schodisko vnútri bytu s konštrukčnou výškou pod 3 000 mm a schodisko do podzemného podlažia 41°), § 43 ods. 5 (svetlá výška obytnej miestnosti podľa STN), § 45 ods. 3 (rodinný dom: hlavné schodisko podchodná výška 2 100 mm, priechodná šírka 900 mm, pomocné 750 mm) | https://static.slov-lex.sk/static/SK/ZZ/2002/532/20200301.html
- Zákon 25/2025 Z. z. (stavebný zákon), § 84 ods. 23 (vyhláška 532/2002 platí do účinnosti nových vykonávacích predpisov, najneskôr do 31. 3. 2027) | https://www.zakonypreludi.sk/zz/2025-25
- SLOVGAS, monitoring stavebnej legislatívy za august 2026 (návrh vyhlášky ÚÚPV o všeobecných stavebno-technických požiadavkách na výstavbu, LP/2026/438, pripomienky od 20. 8. 2026) | https://www.slovgas.sk/aktuality/monitoring-stavebnej-legislativy-a-regulacie-za-august-2026/
- STU SvF, Žilinský a Giecová: Konštrukcie pozemných stavieb, Schody (podľa STN 73 4130: 2h + b = 630 mm, možno znížiť na 600 mm; šírka schodu na výstupnej čiare aspoň 210 mm, nástupnica 250 mm, odporúča sa 260 mm; kosé schody v najužšom mieste a na vnútornej strane zakrivenia 130 mm; výstupná čiara pri ramene do 900 mm 300 mm a do 1 200 mm 400 mm od vonkajšieho okraja; normálne schody sklon 25 až 35°, výška 150 až 180 mm; hlavné schodisko v rodinnom dome 900 mm, lepšie 1 000 mm; norma v rodinnom dome pripúšťa 18 výšok v ramene; točité ramená v obytných budovách len s veľmi podradným charakterom) | https://www.svf.stuba.sk/buxus/docs/dokumenty/skripta/Zilinsky__Gieciova_Konstrukcie_pozemnych_stavieb_Schody_www.stranky.pdf
- komarch.sk: Čo je nové v STN 73 4301 (svetlá výška obytných miestností 2 600 mm) | https://komarch.sk/spravy/co-je-nove-v-stn-73-4301-bytove-domy-odpovede-na-otazky-z-webinaru
- inardex.sk: Nebudú moje schody strmé? (výška schodu do 180 mm vhodná na bývanie, nad 180 mm strmé, 2h + b = 630 mm) | https://inardex.sk/serial/c4932/
- stavebnik.sk: Požiadavky na schodisko (v jednom ramene 16 stupňov, v rodinnom dome podľa normy 18) | https://www.stavebnik.sk/clanky/poziadavky-na-schodisko.html
- TupTuDu, kalkulačka public/js/kalkulacka-schodiste.js s parametrami pre Slovensko (výška 300 cm, rameno 16, bez pridávania výšok, stupne v zákrute rozložené do ramien, kontrola 130 mm 30 cm od vnútorného okraja len pri ramene nad 1,1 m, krok 600 až 630 mm; nástupnicu 250 mm, sklon 35° ani šírku na vnútornej strane nekontroluje); editor pre krajinu SK výšky nepridáva (NASLAP_MIN_ZEME v public/js/koncept-v3/dum.js), n = round(H / 0,175), b = 630 − 2h | interní
- TupTuDu, príklady v tabuľke a pôdorysy schodov do L prepočítané kalkulačkou s parametrami pre Slovensko 11. 11. 2026 (2,90 m so 16 stupňami: 181,25 mm, šírka 267,5 mm, sklon 34,1°) | interní
---
::kalkulacka-schodiste vyska=300 | rameno=16 | naslapMin=0 | zakrivMin=130 | krokMax=630 | zatacka=rozlozene

Zadaj výšku od hotovej podlahy dole k hotovej podlahe hore, nie svetlú výšku miestnosti, tá je menšia o strop.

## Vzorec na výpočet schodiska

1. **Počet výšok:** výšku medzi podlažiami vydeľ 175 mm a zaokrúhli na celé číslo.
2. **Výška schodu:** výšku medzi podlažiami vydeľ týmto počtom. Výsledok nezaokrúhľuj, všetky stupne musia vyjsť rovnako vysoké a posledný presne na podlahu.
3. **Šírka stupňa:** b = 630 − 2h. Číslo 630 mm je priemerná dĺžka ľudského kroku, norma na Slovensku pripúšťa znížiť ho na 600 mm.
4. **Dĺžka priameho ramena:** (počet výšok − 1) × šírka stupňa. Nástupníc je o jednu menej, posledný krok vedie rovno na podlahu poschodia.
5. **Sklon:** uhol, ktorého tangens je h / b.

| Od podlahy k podlahe | Výšok | Výška schodu | Šírka stupňa | Priame rameno | Sklon | Jedno rameno na Slovensku |
|---:|---:|---:|---:|---:|---:|:---|
| 2,60 m | 15 | 173 mm | 283 mm | 3,97 m | 31,5° | áno |
| 2,80 m | 16 | 175 mm | 280 mm | 4,20 m | 32,0° | áno |
| 2,90 m | 17 | 171 mm | 289 mm | 4,62 m | 30,6° | len so 16 stupňami po 181 mm, nad odporúčaných 180 mm |
| 3,00 m | 17 | 176 mm | 277 mm | 4,43 m | 32,5° | nie, treba medzipodestu |
| 3,10 m | 18 | 172 mm | 286 mm | 4,85 m | 31,1° | nie, treba medzipodestu |

Počet stupňov je počet výšok. Pri svetlej výške 2,6 m, ktorú žiada norma, býva výška od podlahy k podlahe 2,9 až 3,0 m. Priame schody v jednom ramene vtedy na Slovensku väčšinou nevyjdú, s výškou schodu do 180 mm sa 16 stupňov zmestí len do 2,88 m.

## Aká má byť výška schodu na Slovensku

Záväzná vyhláška 532/2002 žiada pre hlavné schodisko v rodinnom dome:

- rovnakú výšku všetkých stupňov v ramene,
- najviac **16 stupňov** v jednom ramene. Norma pre rodinné domy pripúšťa až 18, vyhláška však len 16,
- **sklon** najviac 35°. Výnimku do 41° má schodisko vnútri bytu s konštrukčnou výškou pod 3 m a schodisko do podzemného podlažia. Či výnimka platí aj pre schodisko v rodinnom dome, posúdi projektant,
- **priechodnú šírku ramena** aspoň 900 mm a **podchodnú výšku** aspoň 2 100 mm.

Šírku stupňa vyhláška prenecháva norme STN 73 4130. Tá žiada na výstupnej čiare aspoň 210 mm, nástupnicu aspoň 250 mm a odporúča výšku schodu 150 až 180 mm. Pohodlnejšie je rameno široké 1 000 mm. Nástupnicu a sklon kalkulačka nekontroluje, sklon si over vo výsledku. Vyhláška platí, kým ju nenahradí nová, najneskôr do 31. marca 2027. Konkrétne rozmery nakoniec potvrdí projektant.

## Zmestia sa schody do domu

Priame schody v jednom ramene zaberú pre 2,80 m asi 4,2 m dĺžky, k tomu voľné miesto pred prvým stupňom a za posledným. Pri bežných 2,9 až 3,0 m treba na Slovensku medzipodestu, napríklad schodisko do L alebo do U, alebo priame s medzipodestou. Pre 3,00 m zaberie schodisko do L s medzipodestou asi 2,94 × 3,22 m.

Menej miesta zaberú zabiehajúce stupne, ktoré zatáčajú bez medzipodesty: do L pre 2,80 m asi 2,63 × 2,63 m. Sú však jedno rameno, takže aj pre ne platí najviac 16 stupňov a pri vyššom podlaží nevyjdú. Na vnútornej strane zákruty má mať stupeň podľa slovenskej normy aspoň 130 mm. Kalkulačka preto stupne rozkladá do ramien, túto šírku však nekontroluje, over si ju v riadku Najužšie miesto stupňa a v nákrese.

Točité schody zaberú najmenej miesta. Ako hlavné schodisko rodinného domu ich však na Slovensku over s projektantom: norma chce aj pri nich na vnútornej strane stupňa aspoň 130 mm a okolo tenkého stĺpika to nevyjde.

Nad schodmi musí byť v poschodí otvor v strope taký dlhý, aby vyšla podchodná výška. Ten často rozhodne, kam sa schodisko v dispozícii zmestí. Rozmery chodby a izieb nájdeš v článku [minimálne rozmery miestností](clanek:minimalne-rozmery-miestnosti).

## Výpočet schodiska priamo v pôdoryse

V [editore TupTuDu](aplikace:) nakreslíš do svojho pôdorysu všetky tvary z kalkulačky. Stupne vypočíta z výšky medzi podlažiami rovnako ako kalkulačka, v hornom podlaží vyreže otvor v strope a v 3D uvidíš, kam schody vedú. Výšku aj šírku stupňa môžeš zmeniť ručne a otvor v strope skrátiť, editor potom ukáže podchodnú výšku. Pri zabiehajúcich stupňoch prepni Stupne v zákrute na Rozložené. Limit 16 stupňov v ramene over v kalkulačke. Ako začať s domom, opisuje článok o [kreslení pôdorysu domu](clanek:kreslenie-podorysu-domu).

::vyzva Vyskúšaj schody vo svojom dome | Pridaj poschodie, vráť sa do prízemia, vyber nástroj Schodisko a klikni na začiatok a potom v smere výstupu. Uvidíš stupne, otvor v poschodí aj 3D. Verzia Zadarmo má 30 úprav denne a jeden projekt.
