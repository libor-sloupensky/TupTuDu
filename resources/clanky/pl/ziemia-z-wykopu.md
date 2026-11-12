---
titulek: Ziemia z wykopu pod fundamenty: ile zostanie, kalkulator
klicove_slovo: ziemia z wykopu
popis: Policz, ile ziemi z wykopu pod fundamenty zostanie i ile kursów wywrotki zamówić. Darmowy kalkulator i przykłady dla domu na ławach i z piwnicą.
perex: Ile ziemi z wykopu zostanie? Przy domu 12 × 10 m na płaskim terenie i na ławach wykopie się ok. 60 m³, ok. 21 m³ wróci do zasypki, a prawie 40 m³ zostanie, z tego 30 m³ humusu. Gdy humus zostanie w ogrodzie, wystarczy zwykle jeden kurs dużej wywrotki. Z piwnicą zostanie prawie 400 m³.
publikovano: 2026-11-11
overeno: 2026-11-11
autor: Libor z TupTuDu
revize: 2026-11-12
stav: zverejneno
obrazek: /img/clanky/kolik-zeminy-z-vykopu/vykop-svah.jpg
souvisejici: wspolczynnik-spulchnienia-gruntu, jak-narysowac-rzut-domu
klic: kolik-zeminy-z-vykopu
zeme: PL
- Ustawa o odpadach, t.j. Dz.U. 2026 poz. 1328, art. 2 pkt 3 (zákon se nevztahuje na nekontaminovanou zeminu použitou ve stavu přirozeném na pozemku, kde byla vytěžena; zemina, která z pozemku odjede, je odpad) | https://api.sejm.gov.pl/eli/acts/DU/2026/1328/text.pdf
- kb.pl: Strefy przemarzania gruntu w Polsce (PN-81/B-03020, pásma 0,8 / 1,0 / 1,2 / 1,4 m, Varšava, Lodž a Poznaň 1,0 m) | https://kb.pl/budownictwo/fundamenty/strefy-przemarzania-gruntu-w-polsce-co-warto-wiedziec-przed-budowa/
- Inżynier Budownictwa: Przemarzanie gruntu a projektowanie fundamentów (pásma promrzání, 1,4 m na severovýchodě) | https://inzynierbudownictwa.pl/przemarzanie-gruntu-a-projektowanie-fundamentow/
- Murator: Zasypywanie fundamentów (písek a pospółka, humus do zásypu nepatří, soudržnou zeminu jen podle podloží) | https://muratordom.pl/budowa/fundamenty/zasypywanie-fundamentow-aa-faJu-Qu71-mB8u.html
- kb.pl: Nie zasypuj fundamentów byle czym (nejčastěji pospółka, jíl se hůř hutní) | https://kb.pl/aktualnosci/budowa-domu/zasypywanie-fundamentow-czym-i-jak/
- Murator: Wykopy pod fundamenty (rýhy pro ławy bývají širší kvůli bednění) | https://muratordom.pl/budowa/fundamenty/wykopy-pod-fundamenty-jak-prowadzic-prace-ziemne-aa-XP9G-PapH-Eg2k.html
- kb.pl: Cennik nawiezienia ziemi na działkę (sklápěče asi 5, 12 a 20 t) | https://kb.pl/cenniki/uslugi/cennik-nawiezienia-ziemi-na-dzialke-zakup-i-transport/
- Adibud: Jak oszacować ilość ziemi do wywozu (3osý sklápěč 10–12 m³, 4osý 16–18 m³) | https://adibud.pl/blog/jak-oszacowac-ilosc-ziemi-do-wywozu-po-wykopach/
- TupTuDu, kalkulačka zeminy: public/js/kalkulacka-zemina.js, příklady spočítané 11. 11. 2026 (spára 1,0 m: výkopek navíc 8 m³, se štěrkem či pískem 20 m³, sklep 368 m³; spára 0,8 m: 3 m³, 1,2 m: 14 m³, 1,4 m: 19 m³) | interní
- TupTuDu, editor: řádek Fundamenty jen s parcelou (maZaklady v public/js/koncept-v3/dum.js), katastr jen CZ (config/lokalizace.php), vzorový projekt má parcelu i výškový profil a kopii dostane každý uživatel (App\Support\VzorovyProjekt) | interní
---
::kalkulacka-zeminy spara=100

## Dlaczego nie wystarczy długość × szerokość × głębokość

Ten wzór powie ci, ile ziemi wykopiesz. Ciebie interesuje jednak, ile wróci do zasypki, a ile trzeba wywieźć.

## Ile ziemi z wykopu zostanie i skąd się bierze

::rez-vykopu

Przykład: dom 12 × 10 m z jedną wewnętrzną ścianą nośną, podłoga 30 cm nad terenem, warstwy podłogi z chudym betonem i podsypką razem 45 cm, humus 25 cm, przestrzeń robocza wokół domu 80 cm i spód ław 1 m pod terenem.

- **Humus:** zdejmuje się go ok. 39 m³. Wokół domu 9 m³ wraca, spod domu nie, zostaje 30 m³. Nadmiar humusu to mniej więcej powierzchnia domu × grubość warstwy.
- **Wykop pod ławy:** ok. 54 m ław × 0,5 m × 0,75 m = 20 m³ urobku, czyli gruntu spod humusu. Głębokość wynika głównie z głębokości przemarzania, w Polsce zależnie od strefy 0,8, 1,0, 1,2 lub 1,4 m pod terenem.
- **Zasypka pod domem:** spód podsypki jest 15 cm pod terenem, humus sięgał do 25 cm, brakuje 10 cm, czyli 12 m³. Gdy urobek to piasek lub pospółka, zasypuje się nim i zostaje go 8 m³. Glinę zastępuje zwykle dowieziony piasek, wtedy zostaje 20 m³. Decyduje projekt.

Najwięcej zmienia głębokość ław. Przy tym samym domu zostanie w strefie 1,4 m ok. 19 m³ urobku, w strefie 0,8 m tylko ok. 3 m³.

## Z piwnicą zostanie mniej więcej dziesięć razy więcej

| Dom 12 × 10 m na płaskim terenie | Wykopano | Nadmiar humusu | Nadmiar urobku | Największa pryzma |
|:---|---:|---:|---:|---:|
| Ławy, pod dom urobek | 60 | 30 | 8 | 74 |
| Ławy, pod dom dowieziony piasek (12 m³) | 60 | 30 | 20 | 74 |
| Piwnica pod całym domem, wysokość kondygnacji 3,05 m, ławy | 652 | 30 | 368 | 814 |

Liczby są zaokrąglone, w m³ gruntu rodzimego, czyli tak, jak leżał w ziemi. Pryzma jest spulchniona.

::rez-sklepu

Największa pryzma jest większa niż nadmiar: jest spulchniona i leży w niej także ziemia, która potem wróci. Humus składaj osobno. Pryzmy z przykładu zajmą razem ze skarpami ok. 80 do 100 m².

## Wywóz ziemi: ile kursów wywrotki

Na skrzyni ziemia zajmuje ok. jedną czwartą więcej miejsca niż w gruncie. Mała wywrotka zabierze ok. 10 do 12 m³, duża 16 do 18 m³, ale ze zwykłą, wilgotną ziemią szybciej dojdzie do ładowności ok. 20 t, czyli ok. 14 m³ na skrzyni. Całe 38 m³ z przykładu to na skrzyni ok. 48 m³, czyli 3 do 5 kursów. Gdy humus zostanie w ogrodzie, odjedzie tylko urobek, ok. 10 m³ na skrzyni, zwykle jeden kurs. Z piwnicą i humusem w ogrodzie to ok. 33 do 46 kursów. Przeliczenie na tony znajdziesz w artykule o [współczynniku spulchnienia gruntu](clanek:wspolczynnik-spulchnienia-gruntu).

To przypadek idealny, w praktyce licz z zapasem. Rowy pod ławy bywają szersze pod szalunek, część ziemi nie nadaje się do zasypki, a na działce brakuje miejsca na pryzmy.

Do własnego szacunku zsumuj w kalkulatorze nadmiar humusu i urobku po spulchnieniu i podziel przez 14. Największej pryzmy nie licz, część z niej wróci. Ile naprawdę zabierze auto, powie przewoźnik.

::vyzva Zobacz bilans ziemi w edytorze | Po rejestracji dostaniesz projekt przykładowy: dom na prawdziwej, pochyłej działce. W wierszu Fundamenty edytor pokaże wykop, zasypkę i nadmiar ziemi do wywozu według kształtu domu i terenu. Zmiany w nim nie wliczają się do limitu planu Darmowy.

## Na stoku wyjdzie inaczej

Kalkulator liczy teren płaski. Na stoku ławy wykonuje się schodkowo, a od dolnej strony fundament bywa wyższy. O objętości najbardziej decyduje, jak wysoko osadzisz dom. Edytor [TupTuDu](aplikace:) zna teren działki z danych wysokościowych, na razie tylko w Czechach i w projekcie przykładowym. Schodków nie liczy i pod domem zawsze dosypuje, przy wysokim fundamencie zasypka jest więc raczej górnym szacunkiem.

::obrazek /img/clanky/kolik-zeminy-z-vykopu/zaklad-svah.webp | Dom parterowy w 3D na stoku, z oknami ze wszystkich stron i wejściem od górnej strony, szary fundament jest od dolnej strony wyższy | Dom na lekko pochyłej działce: fundament (dla czytelności szary) od dolnej strony sięga od terenu aż pod podłogę, edytor TupTuDu | 1200 | 700

::obrazek /img/clanky/kolik-zeminy-z-vykopu/vykop-svah.webp | Widok 3D na wykop pod dom zagłębiony w teren | Wykop pod ten sam dom osadzony głębiej w terenie, dom jest ukryty: więcej się kopie, mniej się dosypuje, edytor TupTuDu | 1200 | 700

## Co zrobić z ziemią z wykopu

Humus zdejmij osobno i wykorzystaj, zwykle wraca na ogród. Urobek, który się nadaje, użyj do zasypki i wyrównania terenu na tej samej działce. Niezanieczyszczona ziemia wykorzystana do celów budowlanych w stanie naturalnym tam, gdzie ją wykopano, nie podlega w Polsce przepisom o odpadach, ta, która z działki wyjeżdża, już tak. Wywóz zleć firmie wpisanej do rejestru BDO i weź potwierdzenie, dokąd ziemia trafiła.

W liczbach nie ma przyłączy, szamba ani przydomowej oczyszczalni, zbiornika na deszczówkę, podjazdu, tarasu ani chodników. Humus liczy się tylko z pasa 80 cm wokół domu i cały tam wraca, także tam, gdzie będzie opaska.
