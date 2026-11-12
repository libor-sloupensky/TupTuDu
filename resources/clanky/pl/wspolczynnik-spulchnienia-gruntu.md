---
titulek: Współczynnik spulchnienia gruntu i ile waży m³ ziemi
klicove_slovo: współczynnik spulchnienia gruntu
popis: Sprawdź, o ile więcej miejsca zajmie ziemia po wykopaniu. Współczynniki dla piasku, gliny, iłu i skały oraz przeliczenie na kursy wywrotki i tony.
perex: Współczynnik spulchnienia gruntu mówi, o ile więcej miejsca zajmie ziemia po wykopaniu. Dla zwykłej ziemi wynosi ok. 1,25, czyli zajmie mniej więcej o jedną czwartą więcej, dla skały nawet o połowę więcej. Z 10 m³ wykopu w zwykłej ziemi będzie więc na skrzyni ok. 12,5 m³.
publikovano: 2026-11-11
overeno: 2026-11-11
autor: Libor z TupTuDu
revize: 2026-11-12
stav: zverejneno
souvisejici: ziemia-z-wykopu, jak-narysowac-rzut-domu
klic: koeficient-nakypreni-zeminy
zeme: PL
- Prace Instytutu Kolejnictwa 161 (2019), E. Skrzyński, Osiadania podtorza gruntowego: tablica 2 spulchnienie czasowe i trwałe (piasek suchy a ziemia uprawna 5–15 % / 1–2 %, piasek wilgotny, gliniasty, żwir 15–25 % / 2–3 %, glina piaszczysta, glina a ił plastyczne 20–30 % / 3–5 %, gliny ciężkie, iły półzwarte, otoczaki 25–35 % / 5–7 %, gruz a skály 30–50 % / 7–20 %), tablica 3 (ziemia zwykła 1,25) | https://ikolej.pl/fileadmin/user_upload/wydawnictwa/Prace_IK/Zeszyt_161/3_Skrzynski_Osiadania_podtorza_gruntowego.pdf
- Adibud: Jak oszacować ilość ziemi do wywozu (písky 1,10–1,15, hlinité zeminy 1,20–1,30, těžké jíly 1,35–1,45, mokrý jíl až 2 t/m³) | https://adibud.pl/blog/jak-oszacowac-ilosc-ziemi-do-wywozu-po-wykopach/
- ATC, ćwiczenia z technologii robót (kategorie zemin a nakypření, 1 m³ písku 1,8 t) | https://www.atcgrupa.pl/wp-content/uploads/2025/09/%C4%86wiczenia-z-technologii-rob%C3%B3t-rozwi%C4%85zanie.pdf
- kb.pl: Cennik nawiezienia ziemi na działkę (velký sklápěč asi 20 t) | https://kb.pl/cenniki/uslugi/cennik-nawiezienia-ziemi-na-dzialke-zakup-i-transport/
- TupTuDu, editor: koeficient nakypření v Podrobnostech řádku Fundamenty (Szczegóły, Spulchnienie), řádek jen s parcelou, parcela výběrem na mapě i v PL (config/pozemky.php, modules/lokalizace.md, stav 12. 11. 2026), vzorový projekt s parcelou dostane každý uživatel | interní
---
::nakypreni

## Współczynnik spulchnienia gruntu dla popularnych gruntów

| Rodzaj gruntu | Współczynnik spulchnienia |
|:---|---:|
| Piasek suchy, ziemia uprawna | 1,05–1,15 |
| Piasek wilgotny, piasek gliniasty, żwir | 1,15–1,25 |
| Glina piaszczysta, glina i ił plastyczne | 1,20–1,30 |
| Glina ciężka, ił półzwarty, otoczaki | 1,25–1,35 |
| Gruz, skała po odspojeniu | 1,30–1,50 |

Objętość w gruncie pomnóż przez współczynnik, a dostaniesz objętość na pryzmie albo na skrzyni. To wartości orientacyjne, tuż po wykopaniu. Ile grunt naprawdę się spulchni, zależy głównie od jego rodzaju, wilgotności i od tego, jak był ubity. Gdy nie wiesz, jaki masz grunt, licz z 1,25.

## Dlaczego podaje się dwie objętości

**Objętość w gruncie**, czyli w stanie rodzimym, to objętość, jaką ziemia zajmowała w gruncie. Według niej liczy się, ile się wykopie i ile wróci do zasypki zagęszczanej warstwami. Nawet po zagęszczeniu grunt zajmuje zwykle o kilka procent więcej niż przed wykopaniem, to tak zwane spulchnienie końcowe.

**Objętość po spulchnieniu** to objętość ziemi na pryzmie i na skrzyni. Według niej planujesz miejsce na działce i [wywóz ziemi](clanek:ziemia-z-wykopu). Wykop w kosztorysie firmy bywa liczony w m³ gruntu rodzimego, przewoźnik liczy kursy, m³ na skrzyni albo tony, a miejsce, które ziemię przyjmuje, najczęściej tony. Pytaj więc, o które metry sześcienne chodzi.

## Ile waży m³ ziemi

Orientacyjnie 1,6 do 2,0 t na m³ gruntu rodzimego. Piasek waży ok. 1,8 t, mokra glina 2 t i więcej, humus mniej. Spulchnienie zmienia objętość, masa zostaje ta sama. Z 10 m³ wykopu w zwykłej ziemi będzie więc 12,5 m³ na skrzyni i ok. 18 t. Duża wywrotka zabiera ok. 20 t, więc przy ciężkiej ziemi szybciej osiągnie ładowność, niż zapełni skrzynię.

## Ile ziemi będziesz wywozić ty

Ile przy twoim domu się wykopie i ile z tego zostanie, policzy [kalkulator ziemi z wykopu](clanek:ziemia-z-wykopu). W [TupTuDu](aplikace:) zobaczysz objętość w gruncie i po spulchnieniu na projekcie przykładowym, który dostaje każdy nowy użytkownik: w panelu Kondygnacje i powierzchnie kliknij wiersz Fundamenty. Współczynnik ustawisz w Szczegółach, jeden dla humusu i urobku, a objętość po spulchnieniu od razu się przeliczy. Podpowiedź w edytorze podaje wartości ogólne, dla swojego gruntu weź wartość z tabeli wyżej. We własnym projekcie edytor policzy ziemię, gdy wybierzesz na mapie swoją działkę.

::vyzva Wypróbuj na projekcie przykładowym | Otwórz projekt przykładowy, kliknij wiersz Fundamenty i ustaw współczynnik spulchnienia według swojego gruntu. Zmiany w nim nie wliczają się do limitu planu Darmowy.
