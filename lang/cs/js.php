<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'chyba_spojeni' => 'Chyba připojení. Zkus to prosím znovu.',
        'ulozeno' => 'Uloženo',
    ],
    // Stejný koncept uložený jinde (koncept-k-ui.js, _konfliktUlozeni)
    'koncept' => [
        'konflikt_nadpis' => 'Projekt se mezitím změnil jinde',
        'konflikt_text' => 'Tento projekt je novější v jiné kartě nebo na jiném zařízení. Aby se práce navzájem nepřepsala, ukládání je pozastavené. Načti aktuální verzi, nebo ji přepiš tím, co vidíš tady.',
        'konflikt_nacist' => 'Načíst aktuální verzi',
        'konflikt_prepsat' => 'Přepsat touto verzí',
    ],
    // Limity tarifu v editoru (public/js/koncept-v3/limit-tarifu.js) — stejné texty jako tarify.php
    'tarify' => [
        'limit_uprav_nadpis' => 'Dnešní limit úprav je vyčerpaný',
        'limit_uprav_text' => 'Ve verzi Zdarma můžeš udělat :limit úprav denně — počítá se každá nová stěna, posun nebo otvor. Prohlížet můžeš dál, upravovat zase zítra. S předplatným upravuješ bez omezení.',
        'limit_projektu_nadpis' => 'Další projekt tvůj tarif nedovoluje',
        'limit_projektu_text' => 'Počet projektů ve tvém tarifu: :limit. Vyšší tarif dovolí víc projektů — nebo smaž projekt, který už nepotřebuješ.',
        'zbyva_uprav' => 'Dnes zbývá :zbyva z :limit úprav',
        'zobrazit_predplatne' => 'Zobrazit předplatné',
        'zavrit' => 'Zavřít',
    ],
];
