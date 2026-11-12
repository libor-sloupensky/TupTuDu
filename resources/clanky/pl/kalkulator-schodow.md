---
titulek: Kalkulator schodów: wysokość stopnia, wzór i rysunek
klicove_slovo: kalkulator schodów
popis: Kalkulator schodów prostych, ze spocznikiem, zabiegowych i kręconych. Liczba i wysokość stopni, wzór 2h + s, wymagania w Polsce i rysunek w skali.
perex: Kalkulator schodów liczy tak jak projektant: wysokość od podłogi na dole do podłogi na górze dzieli przez ok. 175 mm i zaokrągla do pełnej liczby stopni, a szerokość stopnia wylicza ze wzoru 2h + s = 630 mm. W Polsce wysokość stopnia w domu jednorodzinnym może wynosić najwyżej 190 mm. Dla 2,90 m wychodzi 17 stopni po 171 mm, szerokość stopnia 289 mm i bieg prosty ok. 4,6 m.
publikovano: 2026-11-11
overeno: 2026-11-11
autor: Libor z TupTuDu
revize: 2026-11-12
stav: zverejneno
obrazek: /img/clanky/vypocet-schodiste/vypocet-schodiste.jpg
souvisejici: jak-narysowac-rzut-domu, minimalna-wysokosc-pomieszczen
klic: vypocet-schodiste
zeme: PL
- Rozporządzenie w sprawie warunków technicznych (WT 2002), t.j. Dz.U. 2022 poz. 1225, § 68 ust. 1 a 4 (RD: rameno a podesta min. 0,8 m, stupeň max. 0,19 m, šířka se měří mezi madly nebo mezi stěnou a madlem), § 69 ust. 1 a 2 (17 stupňů v rameni, RD výjimka), ust. 4 (2h + s = 0,6–0,65 m), ust. 6 (vějířové a zabíhající: 0,25 m nejvýš 0,4 m od vnitřního madla nebo sloupku) | https://api.sejm.gov.pl/eli/acts/DU/2022/1225/text.pdf
- Stav WT 2002: uznany za uchylony 21. 9. 2026 (z DU/2019/1696) | https://api.sejm.gov.pl/eli/acts/DU/2002/690
- Ustawa z 31. 7. 2026, Dz.U. 2026 poz. 1161, nový čl. 102a a 102b Prawa budowlanego (18 měsíců od 20. 9. 2026 lze projektovat podle WT platných do 19. 9. 2026, s prohlášením investora) | https://api.sejm.gov.pl/eli/acts/DU/2026/1161/text.pdf
- Projekt nových WT z 6. 8. 2026 (TRIS): § 63 (RD rameno a podesta 0,8 m, stupeň 0,19 m), § 64 ust. 1 a 2 (18 stupňů, RD výjimka), ust. 4 (2h + s = 0,6–0,65 m), ust. 7 (0,25 m nejvýš 0,4 m od vnitřního madla nebo sloupku); k 11. 11. 2026 nové nařízení v ELI nevyšlo | https://technical-regulation-information-system.ec.europa.eu/pl/notification/28411/text/D/PL
- Murator: Wygodne schody, wzór (stupeň 15 cm velmi pohodlný, 17 cm normální, 19 cm obtížný; 2h + s 60–65 cm, průměrně 63 cm; běžný sklon 30–36°) | https://muratordom.pl/budowa/stropy-balkony-schody/wzor-na-schody-kalkulator-schodow-jak-zaprojektowac-schody-i-obliczyc-ich-koszt-aa-RC4P-3aZT-rhVV.html
- kb.pl: Jakie są optymalne wymiary schodów (prostor nad schody nejméně 205 cm, v praxi 210–220 cm, šířka 80 cm) | https://kb.pl/porady/jakie-sa-optymalne-wymiary-schodow/
- TupTuDu, kalkulačka s polskými limity bloku (vyskaMax 190, sirkaMin 80, naslapMin 0, zakrivMin 250, zakrivOd 400, zatacka rozlozene), přepočteno 12. 11. 2026: 2,60 m 15 × 173 mm, 2,80 m 16 × 175, 2,90 m 17 × 171 / 289 mm / 4,62 m / 30,6°, 3,00 m 17 × 176 / 277 / 4,43 / 32,5°, 3,10 m 18 × 172; do L se zabíhajícími šíře 1,0 m 2,84 × 2,84 m (40 cm od vnitřního madla: kolem osy 191 mm, rozložené 231 mm), šíře 0,9 m rozložené 256 mm a 2,82 × 2,82 m, šíře 0,8 m 283 mm; s podestou 3,02 × 3,31 m; točité Ø 2,0 m 221 mm a podchod 2,18 m, Ø 1,8 m 266 mm, šířka bez madla 0,84 m a podchod 1,81 m | interní
- TupTuDu, editor: NASLAP_MIN_ZEME jen CZ, mimo Česko nášlap bez minima, stejně jako polská kalkulačka (public/js/koncept-v3/dum.js) | interní
---
::kalkulacka-schodiste vyskaMax=190 | sirkaMin=80 | naslapMin=0 | zakrivMin=250 | zakrivOd=400 | zatacka=rozlozene

Wpisz wysokość od gotowej podłogi na dole do gotowej podłogi na górze, a nie wysokość pomieszczenia, ta jest mniejsza o strop.

## Wzór na schody krok po kroku

1. **Liczba stopni:** wysokość między kondygnacjami podziel przez 175 mm i zaokrąglij do liczby całkowitej.
2. **Wysokość stopnia (h):** wysokość między kondygnacjami podziel przez tę liczbę. Wyniku nie zaokrąglaj, wszystkie stopnie muszą wyjść równe, a ostatni dokładnie na podłogę.
3. **Szerokość stopnia (s):** s = 630 − 2h. Liczba 630 mm to średnia długość kroku, w Polsce 2h + s ma się mieścić między 600 a 650 mm.
4. **Długość biegu prostego:** (liczba stopni − 1) × szerokość stopnia. Szerokości jest o jedną mniej, bo ostatni krok prowadzi już na podłogę piętra.
5. **Nachylenie:** kąt, którego tangens wynosi h / s.

| Od podłogi do podłogi | Stopni | Wysokość stopnia | Szerokość stopnia | Bieg prosty | Nachylenie |
|---:|---:|---:|---:|---:|---:|
| 2,60 m | 15 | 173 mm | 283 mm | 3,97 m | 31,5° |
| 2,80 m | 16 | 175 mm | 280 mm | 4,20 m | 32,0° |
| 2,90 m | 17 | 171 mm | 289 mm | 4,62 m | 30,6° |
| 3,00 m | 17 | 176 mm | 277 mm | 4,43 m | 32,5° |
| 3,10 m | 18 | 172 mm | 286 mm | 4,85 m | 31,1° |

## Wysokość stopnia schodów i inne wymiary w Polsce

W Polsce wymiary schodów określają warunki techniczne dla budynków. Wersja z 2002 r. formalnie wygasła we wrześniu 2026 r., ale na oświadczenie inwestora można według niej projektować do 20 marca 2028 r. Ona i projekt nowej z 2026 r. podają dla domu jednorodzinnego to samo:

- **Wysokość stopnia** najwyżej 190 mm. Wygodnie chodzi się po stopniach od 150 do 170 mm.
- **2h + s** od 600 do 650 mm.
- **Szerokość biegu i spocznika** co najmniej 80 cm, mierzona między poręczami albo między ścianą a poręczą. Wygodniej 90 do 100 cm.
- **Stopnie zabiegowe i schody kręcone:** stopień musi mieć co najmniej 25 cm w odległości 40 cm od poręczy wewnętrznej lub słupa.
- **Liczba stopni w biegu:** w domu jednorodzinnym przepisy jej nie ograniczają. Długi bieg i tak warto przerwać spocznikiem.

Wolnej wysokości nad schodami przepisy nie podają, w praktyce zostaw co najmniej 205 cm, wygodniej 210 cm. Schody w domu mają zwykle nachylenie 30 do 36°, łagodniejsze są wygodniejsze. Ostateczne wymiary potwierdza projektant.

## Czy schody zmieszczą się w domu

Schody proste dla 2,90 m zajmą ok. 4,6 m długości, do tego wolne miejsce przed pierwszym stopniem i za ostatnim. Krótsze są schody w kształcie L lub U: spocznik zastąpi jedną szerokość stopnia, a pozostałe stopnie podzielą się na biegi. Schody skracaj raczej zakrętem niż wyższym stopniem.

::obrazek /img/clanky/vypocet-schodiste/schodiste-v-hale-3d.webp | Widok 3D z góry na parter bez piętra i dachu: schody proste wznoszą się w holu wzdłuż wewnętrznej ściany nośnej, obok wejścia od ulicy, drzwi do WC, gabinetu i salonu. | Schody proste dla 2,90 m w holu: 17 stopni po 171 mm, bieg 4,62 m. Przed pierwszym stopniem zostaje 1,25 m, okna są poza schodami, edytor TupTuDu | 1200 | 700

Mniej miejsca zajmą stopnie zabiegowe, które skręcają bez spocznika: w kształcie L dla 2,90 m i biegu 1 m ok. 2,84 × 2,84 m, ze spocznikiem 3,02 × 3,31 m. W Polsce stopień zabiegowy musi mieć co najmniej 25 cm w odległości 40 cm od poręczy wewnętrznej. Przy biegu 1 m to się nie uda (ok. 19 cm, z ustawieniem Rozłożone na biegi ok. 23 cm), przy 90 cm z ustawieniem Rozłożone na biegi tak (ok. 26 cm, rzut 2,82 × 2,82 m).

Stopień schodów kręconych musi mieć 25 cm w odległości 40 cm od słupa. Dla 2,90 m przy średnicy 2 m wychodzi ok. 22 cm, przy 1,8 m wymóg spełnisz, ale nad głową zostanie tylko ok. 1,8 m. Jako schody główne wymagają więc indywidualnego projektu. Wszystko to kalkulator policzy i narysuje.

W stropie nad schodami potrzebny jest otwór na tyle długi, żeby nad schodami została wolna wysokość. Często to on rozstrzyga, gdzie schody zmieszczą się w układzie domu. Wymiary korytarza i pokoi znajdziesz w artykule o [minimalnej wysokości i wymiarach pomieszczeń](clanek:minimalna-wysokosc-pomieszczen).

## Z kalkulatora schodów prosto do rzutu domu

W [edytorze TupTuDu](aplikace:) narysujesz w swoim rzucie wszystkie kształty schodów z kalkulatora. Stopnie policzy z wysokości między kondygnacjami tak samo jak kalkulator, na wyższej kondygnacji wytnie otwór w stropie, a w 3D zobaczysz, dokąd schody prowadzą. Wysokość i szerokość stopnia możesz zmienić ręcznie, a otwór w stropie skrócić, edytor pokaże wtedy prześwit przy krawędzi otworu. Jak zacząć z domem, opisuje artykuł [jak narysować rzut domu](clanek:jak-narysowac-rzut-domu).

::vyzva Wypróbuj schody w swoim domu | Dodaj kondygnację, wróć na parter, wybierz narzędzie Schody, kliknij miejsce pierwszego stopnia, a potem w kierunku, w którym schody mają prowadzić w górę. Zobaczysz stopnie, otwór w stropie na piętrze i widok 3D. Plan Darmowy ma 30 edycji dziennie i jeden projekt.
