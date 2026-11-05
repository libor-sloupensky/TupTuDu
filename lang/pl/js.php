<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'akce_selhala' => 'Działanie nie powiodło się:',
        'chyba_spojeni' => 'Błąd połączenia. Spróbuj ponownie.',
        'ulozeno' => 'Zapisano',
    ],
    // Stejný koncept uložený jinde (koncept-k-ui.js, _konfliktUlozeni)
    'koncept' => [
        'konflikt_nadpis' => 'Projekt został w międzyczasie zmieniony gdzie indziej',
        'konflikt_text' => 'Ten projekt ma nowszą wersję w innej karcie lub na innym urządzeniu. Zapisywanie jest wstrzymane, aby jedna praca nie nadpisała drugiej. Wczytaj aktualną wersję albo nadpisz ją tym, co widzisz tutaj.',
        'konflikt_nacist' => 'Wczytaj aktualną wersję',
        'konflikt_prepsat' => 'Nadpisz tą wersją',
    ],
    // Limity tarifu v editoru (public/js/koncept-v3/limit-tarifu.js) — stejné texty jako tarify.php
    'tarify' => [
        'limit_uprav_nadpis' => 'Dzisiejszy limit edycji został wyczerpany',
        'limit_uprav_text' => 'W planie Darmowy możesz wykonać :limit edycji dziennie — liczy się każda nowa ściana, przesunięcie lub otwór. Oglądać możesz dalej, a edytować znowu jutro. Z subskrypcją edytujesz bez ograniczeń.',
        'limit_projektu_nadpis' => 'Twój plan nie pozwala na kolejny projekt',
        'limit_projektu_text' => 'Liczba projektów w twoim planie: :limit. Wyższy plan pozwala na więcej projektów — możesz też usunąć projekt, którego już nie potrzebujesz.',
        'zbyva_uprav' => 'Dziś pozostało: :zbyva z :limit edycji',
        'zobrazit_predplatne' => 'Zobacz subskrypcję',
        'zavrit' => 'Zamknij',
    ],
];
