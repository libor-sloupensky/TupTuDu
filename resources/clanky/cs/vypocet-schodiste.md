---
titulek: Výpočet schodiště: výška schodu, vzorec a kalkulačka
klicove_slovo: výpočet schodiště
popis: Zadej výšku od podlahy k podlaze a hned uvidíš počet stupňů, výšku schodu, nášlap i délku ramene. Se vzorcem 2h + b = 630 mm a doporučeními pro Česko.
perex: Výpočet schodiště začíná výškou od podlahy dole k podlaze nahoře. Vyděl ji asi 175 mm a zaokrouhli na celý počet výšek, šířku stupně (nášlap) dopočítáš ze vzorce 2h + b = 630 mm. Pro 2,90 m vyjde 17 výšek po 171 mm, nášlap 289 mm a přímé rameno dlouhé asi 4,6 m.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-11
autor: Libor z TupTuDu
stav: koncept
obrazek: /img/clanky/vypocet-schodiste/vypocet-schodiste.jpg
souvisejici: jak-nakreslit-pudorys-domu, minimalni-rozmery-mistnosti
- Vyhláška 146/2024 Sb. o požadavcích na výstavbu ve znění 97/2026 Sb., § 31 odst. 3 (stejná výška stupňů v rameni hlavního schodiště, čísla v mm neuvádí), § 94 (splnění přes normy) | https://www.zakonyprolidi.cz/cs/2024-146
- MMR: Normy ČSN a jejich závaznost (norma je doporučující, závazná jen tam, kde to stanoví předpis) | https://mmr.gov.cz/cs/ministerstvo/stavebni-pravo/pravo-a-legislativa/novy-stavebni-zakon/normy-csn
- FAST VUT, S10 Návrh schodiště (výška od podlahy k podlaze, n = H / h′ zaokrouhlit, výšku stupně nezaokrouhlovat, b = 630 − 2h, L = (n − 1) × b, podchodná výška 2100 mm) | https://www.fce.vutbr.cz/PST/bstud/BH02_2015/S10_navrh_schodiste.pdf
- ESTAV.cz: Schodiště a jeho základní rozměry (RD výška stupně max. 190 mm, pohodlně do 180 mm, šířka ramene RD 900 mm, podchodná výška 2100 mm, v rameni 16 stupňů, v RD až 18, sklon běžný 25 až 35°, odkaz na ČSN 73 4130) | https://www.estav.cz/cz/2581.schodiste-a-jeho-zakladni-rozmery
- ESTAV.cz: Výpočet schodiště (postup) | https://www.estav.cz/cz/1966.vypocet-schodiste
- TZB-info: Výpočet schodiště, nápověda (délka kroku 600 až 650 mm, standardně 630 mm, výška stupně 150 až 190 mm, sklon 25 až 35°, podchodná výška 2100 mm, v rameni 16 stupňů, v RD až 18) | https://www.tzb-info.cz/docu/tabulky/0001/000146_help.html
- TupTuDu, výpočet editoru: public/js/koncept-v3/dum.js, funkce schodyGeo a castiSchodu (n = round(H / 0,175), h = H / n, b = 630 − 2h omezené na 220 až 320 mm, přímé schody n − 1 nášlapů) | interní
---
::kalkulacka-schodiste

Zadej výšku od hotové podlahy dole k hotové podlaze nahoře, ne světlou výšku místnosti. Ta je menší o tloušťku stropu i se skladbou podlahy.

## Vzorec pro výpočet schodiště

1. **Počet výšek:** výšku mezi podlažími vyděl 175 mm a zaokrouhli na celé číslo.
2. **Výška schodu:** výšku mezi podlažími vyděl tímto počtem. Výsledek nezaokrouhluj, všechny stupně musí vyjít stejně vysoké a poslední přesně na podlahu.
3. **Nášlap:** b = 630 − 2h. Číslo 630 mm je průměrná délka lidského kroku.
4. **Délka přímého ramene:** (počet výšek − 1) × nášlap. Nášlapů je o jeden méně, poslední krok vede rovnou na podlahu patra.
5. **Sklon:** úhel, jehož tangens je h / b.

| Od podlahy k podlaze | Výšek | Výška schodu | Nášlap | Přímé rameno | Sklon |
|---:|---:|---:|---:|---:|---:|
| 2,60 m | 15 | 173 mm | 283 mm | 3,97 m | 31,5° |
| 2,80 m | 16 | 175 mm | 280 mm | 4,20 m | 32,0° |
| 2,90 m | 17 | 171 mm | 289 mm | 4,62 m | 30,6° |
| 3,05 m | 17 | 179 mm | 271 mm | 4,34 m | 33,5° |
| 3,20 m | 18 | 178 mm | 274 mm | 4,67 m | 32,9° |

Vyšší patro nemusí znamenat delší schody. Rozhoduje, jak vyjde zaokrouhlení: při 3,05 m je stupňů stejně jako při 2,90 m, jen jsou vyšší a mají užší nášlap, schody jsou proto kratší i strmější. Počet stupňů je počet výšek.

## Jaká má být výška schodu v Česku

Vyhláška o požadavcích na výstavbu rozměry v milimetrech neuvádí. Žádá, aby stupně v jednom rameni hlavního schodiště měly stejnou výšku a v přímém rameni i stejnou šířku. Čísla doporučuje norma ČSN 73 4130, která sama o sobě závazná není. Pro rodinný dům se v Česku běžně počítá s těmito hodnotami:

- **Výška schodu** 150 až 180 mm. Příručky v rodinném domě připouštějí až 190 mm, takové schody jsou ale strmější než 35°.
- **2h + b** mezi 600 a 650 mm, ideálně 630 mm.
- **Šířka ramene** hlavního schodiště aspoň 900 mm, pohodlněji 1 000 mm.
- **Podchodná výška** aspoň 2 100 mm volného místa nad hranami stupňů.
- **Počet výšek** v jednom rameni do 16, v rodinném domě se připouští 18. Víc už potřebuje odpočívadlo, kalkulačka to hlídá.

Sklon pohodlných schodů bývá 25 až 35°. Konkrétní rozměry nakonec potvrzuje projektant.

## Vejdou se schody do domu

Přímé schody pro 2,90 m zaberou asi 4,6 m délky, k tomu volné místo před prvním stupněm a za posledním. Kratší je lomené schodiště do L nebo do U: odpočívadlo nahradí jeden nášlap a ostatní stupně se rozdělí do ramen. Zkracuj schody raději lomením než vyšším stupněm. Ještě méně místa zaberou zabíhající stupně v rohu, ty kalkulačka nepočítá a navrhne je projektant.

::obrazek /img/clanky/vypocet-schodiste/schodiste-do-l-3d.webp | 3D pohled shora do přízemí domu bez střechy: lomené schodiště do L s odpočívadlem v rohu místnosti vede do patra. | Schodiště do L pro 3,05 m mezi podlažími: 17 výšek po 179 mm, 9 stupňů, odpočívadlo a 6 stupňů, šířka 1 m, editor TupTuDu | 1200 | 700

Nad schody musí být v patře otvor ve stropu (prostup) tak dlouhý, aby vyšla podchodná výška. Ten často rozhodne, kam se schodiště v dispozici vejde, a ovlivní i velikost místností v patře. Rozměry chodby a pokojů najdeš v článku [minimální rozměry místností](clanek:minimalni-rozmery-mistnosti).

## Výpočet schodiště přímo v půdorysu

V [editoru TupTuDu](aplikace:) nakreslíš schodiště do svého půdorysu: přímé, do L nebo do U. Stupně spočítá z výšky mezi podlažími stejně jako kalkulačka, v horním podlaží vyřízne otvor přes celé schody (skutečný prostup bývá o pár stupňů kratší) a ve 3D uvidíš, kam schody vedou. Výšku stupně, nášlap a počet stupňů v ramenech můžeš změnit ručně, u výrazně nepohodlných schodů tě editor upozorní. Točité schodiště ani podchodnou výšku editor nepočítá, ty si ohlídej s projektantem. Jak začít s domem, popisuje článek [jak nakreslit půdorys domu](clanek:jak-nakreslit-pudorys-domu).

::vyzva Zkus schody ve svém domě | Přidej patro, vyber nástroj Schodiště, klepni na začátek a ve směru výstupu a uvidíš stupně, prostup v patře i 3D. Verze zdarma má 30 úprav denně a jeden projekt.
