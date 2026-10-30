<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'chyba_spojeni' => 'Chyba připojení. Zkuste to prosím znovu.',
        'ulozeno' => 'Uloženo',
    ],
    // Limity tarifu v editoru (public/js/koncept-v3/limit-tarifu.js) — stejné texty jako tarify.php
    'tarify' => [
        'limit_uprav_nadpis' => 'Dnešní limit úprav je vyčerpaný',
        'limit_uprav_text' => 'Ve verzi Zdarma můžete udělat :limit úprav denně — počítá se každá nová stěna, posun nebo otvor. Prohlížet můžete dál, upravovat zase zítra. S předplatným upravujete bez omezení.',
        'limit_projektu_nadpis' => 'Další projekt váš tarif nedovoluje',
        'limit_projektu_text' => 'Počet projektů ve vašem tarifu: :limit. Vyšší tarif dovolí víc projektů — nebo smažte projekt, který už nepotřebujete.',
        'zbyva_uprav' => 'Dnes zbývá :zbyva z :limit úprav',
        'zobrazit_predplatne' => 'Zobrazit předplatné',
        'zavrit' => 'Zavřít',
    ],
];
