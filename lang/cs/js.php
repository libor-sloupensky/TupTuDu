<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'chyba_spojeni' => 'Chyba připojení. Zkus to prosím znovu.',
        'ulozeno' => 'Uloženo',
        'akce_selhala' => 'Akce se nezdařila:',
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
        'zkouska_tlacitko' => 'Vyzkoušet :dni dní zdarma',
        'zkouska_popis' => 'Bez karty a bez závazku. Upravuješ bez omezení, projekt máš jeden. Pak se účet sám vrátí na Zdarma.',
        'zkouska_nadpis' => 'Zkouška zdarma běží',
        'zkouska_chyba' => 'Zkoušku se nepodařilo zapnout. Zkus to prosím znovu.',
        'zkouska_odznak' => 'Vyzkoušej :dni dní bez omezení zdarma',
        'zkouska_zbyva' => 'one=Zkouška zdarma: zbývá :pocet den|few=Zkouška zdarma: zbývají :pocet dny|many=Zkouška zdarma: zbývá :pocet dne|other=Zkouška zdarma: zbývá :pocet dní',
        'zkouska_nabidka_nadpis' => 'Vyzkoušej Stavebníka :dni dní zdarma',
        'zkouska_nabidka_text' => 'Ve verzi Zdarma je počet úprav za den omezený. Ve zkoušce kreslíš a upravuješ bez omezení. Stačí kliknout, nic nevyplňuješ.',
    ],
];
