---
titulek: Výpočet schodiště: výška schodu, vzorec a kalkulačka
klicove_slovo: výpočet schodiště
popis: Kalkulačka schodiště pro přímé, lomené do L a do U, se zabíhajícími stupni i točité. Počet a výška stupňů, nášlap podle vyhlášky a nákres v měřítku.
perex: Výpočet schodiště začíná výškou od podlahy dole k podlaze nahoře. Vyděl ji asi 175 mm a zaokrouhli na celý počet výšek, šířku stupně (nášlap) dopočítáš ze vzorce 2h + b = 630 mm. V Česku musí nášlap v rodinném domě vyjít aspoň 275 mm. Pro 2,90 m vyjde 17 výšek po 171 mm, nášlap 289 mm a přímé rameno dlouhé asi 4,6 m.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-11
autor: Libor z TupTuDu
stav: zverejneno
obrazek: /img/clanky/vypocet-schodiste/vypocet-schodiste.jpg
souvisejici: jak-nakreslit-pudorys-domu, minimalni-rozmery-mistnosti
- Vyhláška 146/2024 Sb. o požadavcích na výstavbu ve znění 97/2026 Sb., § 31 odst. 3 (stejná výška stupňů v rameni hlavního schodiště), § 94 (splnění přes normy) | https://www.zakonyprolidi.cz/cs/2024-146
- Vyhláška 146/2024 Sb., příloha 4 bod 2 (nášlap hlavního schodiště 0,3 m, v rodinném domě 0,275 m; zakřivené rameno do 1,1 m měřeno 0,4 m od vnějšího okraje, širší 0,3 m od vnitřního okraje aspoň 0,18 m) | https://krajta.slv.cz/2024/146/pril_4
- MMR: Normy ČSN a jejich závaznost (norma je doporučující, závazná jen tam, kde to stanoví předpis) | https://mmr.gov.cz/cs/ministerstvo/stavebni-pravo/pravo-a-legislativa/novy-stavebni-zakon/normy-csn
- FAST VUT, S10 Návrh schodiště (výška od podlahy k podlaze, n = H / h′ zaokrouhlit, výšku stupně nezaokrouhlovat, b = 630 − 2h, L = (n − 1) × b, podchodná výška 2100 mm) | https://www.fce.vutbr.cz/PST/bstud/BH02_2015/S10_navrh_schodiste.pdf
- ESTAV.cz: Schodiště a jeho základní rozměry (RD výška stupně max. 190 mm, pohodlně do 180 mm, šířka ramene RD 900 mm, podchodná výška 2100 mm, v rameni 16 stupňů, v RD až 18, sklon běžný 25 až 35°, odkaz na ČSN 73 4130) | https://www.estav.cz/cz/2581.schodiste-a-jeho-zakladni-rozmery
- ESTAV.cz: Výpočet schodiště (postup) | https://www.estav.cz/cz/1966.vypocet-schodiste
- TZB-info: Výpočet schodiště, nápověda (délka kroku 600 až 650 mm, standardně 630 mm, výška stupně 150 až 190 mm, sklon 25 až 35°, podchodná výška 2100 mm, v rameni 16 stupňů, v RD až 18) | https://www.tzb-info.cz/docu/tabulky/0001/000146_help.html
- ČKAIT TS 02 (výstupní čára zakřivených ramen blíž k vnějšímu okraji, třetina šířky od vnější hrany) | https://profesis.ckait.cz/dokumenty-ckait/ts-02/
- VUT FAST, Schodiště, rozdělení (poloha výstupní čáry zakřiveného ramene podle šířky: do 900 mm 300 mm od vnějšího okraje, do 1 200 mm 400 mm, do 1 800 mm třetina) | https://www.fce.vutbr.cz/PST/kacalek.p/BH03/prednaska/01%20uvod_schodiste_rozdeleni.pdf
- TupTuDu, kalkulačka: zabíhající stupně a točité schody, public/js/kalkulacka-schodiste.js (zúžení rozložené na stupně kolem zatáčky, točité: podchodná výška = výšky na otáčku × výška stupně − 50 mm tloušťky stupně) | interní
- TupTuDu, výpočet editoru: public/js/koncept-v3/dum.js, funkce schodyGeo a castiSchodu (n = round(H / 0,175), h = H / n, b = 630 − 2h omezené na 220 až 320 mm, přímé schody n − 1 nášlapů) | interní
---
::kalkulacka-schodiste

Kalkulačka počítá přímé schody, lomené do L a do U s odpočívadly i se zabíhajícími stupni a točité schody. Zadej výšku od hotové podlahy dole k hotové podlaze nahoře, ne světlou výšku místnosti, ta je menší o strop.

## Vzorec pro výpočet schodiště

1. **Počet výšek:** výšku mezi podlažími vyděl 175 mm a zaokrouhli na celé číslo.
2. **Výška schodu:** výšku mezi podlažími vyděl tímto počtem. Výsledek nezaokrouhluj, všechny stupně musí vyjít stejně vysoké a poslední přesně na podlahu.
3. **Nášlap:** b = 630 − 2h. Číslo 630 mm je průměrná délka lidského kroku. V Česku musí v rodinném domě vyjít aspoň 275 mm, jinak přidej jednu výšku.
4. **Délka přímého ramene:** (počet výšek − 1) × nášlap. Nášlapů je o jeden méně, poslední krok vede rovnou na podlahu patra.
5. **Sklon:** úhel, jehož tangens je h / b.

| Od podlahy k podlaze | Výšek | Výška schodu | Nášlap | Přímé rameno | Sklon |
|---:|---:|---:|---:|---:|---:|
| 2,60 m | 15 | 173 mm | 283 mm | 3,97 m | 31,5° |
| 2,80 m | 16 | 175 mm | 280 mm | 4,20 m | 32,0° |
| 2,90 m | 17 | 171 mm | 289 mm | 4,62 m | 30,6° |
| 3,05 m | 18 | 169 mm | 291 mm | 4,95 m | 30,2° |
| 3,10 m | 18 | 172 mm | 286 mm | 4,85 m | 31,1° |

Při 3,05 m by 17 výšek dalo nášlap jen 271 mm, proto 18. Počet stupňů je počet výšek.

## Jaká má být výška schodu v Česku

Vyhláška o požadavcích na výstavbu závazně žádá nášlap hlavního schodiště v rodinném domě aspoň 275 mm (v jiných stavbách 300 mm) a stejně vysoké stupně v rameni. Ostatní čísla doporučuje norma ČSN 73 4130, sama o sobě nezávazná. V rodinném domě se v Česku běžně počítá s těmito hodnotami:

- **Výška schodu** 150 až 180 mm. Se vzorcem 2h + b = 630 mm ale nad 177 mm vyjde nášlap pod 275 mm.
- **2h + b** mezi 600 a 650 mm, ideálně 630 mm.
- **Šířka ramene** hlavního schodiště aspoň 900 mm, pohodlněji 1 000 mm.
- **Podchodná výška** aspoň 2 100 mm volného místa nad hranami stupňů.
- **Počet výšek** v jednom rameni do 16, v rodinném domě se připouští 18. Víc už potřebuje odpočívadlo, kalkulačka to hlídá.

Sklon pohodlných schodů bývá 25 až 35°. Konkrétní rozměry nakonec potvrzuje projektant.

## Vejdou se schody do domu

Přímé schody pro 2,90 m zaberou asi 4,6 m délky, k tomu volné místo před prvním stupněm a za posledním. Kratší je lomené schodiště do L nebo do U: odpočívadlo nahradí jeden nášlap a ostatní stupně se rozdělí do ramen. Zkracuj schody raději lomením než vyšším stupněm.

::obrazek /img/clanky/vypocet-schodiste/schodiste-v-hale-3d.webp | 3D pohled shora do přízemí bez patra a střechy: přímé schody stoupají v hale podél vnitřní nosné stěny, vedle vchodu z ulice, dveří na WC, do pracovny a do obýváku. | Přímé schody pro 2,90 m v hale: 17 výšek po 171 mm, rameno 4,62 m. Před prvním stupněm zbude 1,25 m, okna jsou mimo schody, editor TupTuDu | 1200 | 700

Méně místa zaberou zabíhající stupně, které zatáčí bez odpočívadla: do L pro 2,90 m asi 2,84 × 2,84 m, s odpočívadlem 3,02 × 3,31 m. U ramene do 1,1 m se v Česku nášlap měří 40 cm od vnějšího okraje a i tam musí mít 275 mm. Točité schody potřebují jako hlavní schodiště průměr kolem 2 m, jinak nevyjde šířka ramene 90 cm a ke stupni o otáčku výš zbude nad hlavou málo místa. Obojí kalkulačka spočítá a nakreslí.

Nad schody musí být v patře otvor ve stropu (prostup) tak dlouhý, aby vyšla podchodná výška. Ten často rozhodne, kam se schodiště v dispozici vejde, a ovlivní i velikost místností v patře. Rozměry chodby a pokojů najdeš v článku [minimální rozměry místností](clanek:minimalni-rozmery-mistnosti).

## Výpočet schodiště přímo v půdorysu

V [editoru TupTuDu](aplikace:) nakreslíš do svého půdorysu všechny tvary z kalkulačky: přímé, do L a do U s odpočívadly i se zabíhajícími stupni a točité. Stupně spočítá z výšky mezi podlažími stejně jako kalkulačka, v horním podlaží vyřízne otvor ve stropu a ve 3D uvidíš, kam schody vedou. Výšku stupně i nášlap můžeš změnit ručně a otvor ve stropu zkrátit, editor pak ukáže podchodnou výšku. Jak začít s domem, popisuje článek [jak nakreslit půdorys domu](clanek:jak-nakreslit-pudorys-domu).

::vyzva Zkus schody ve svém domě | Přidej patro, vrať se do přízemí, vyber nástroj Schodiště a klepni na začátek a ve směru výstupu. Uvidíš stupně, prostup v patře i 3D. Verze zdarma má 30 úprav denně a jeden projekt.
