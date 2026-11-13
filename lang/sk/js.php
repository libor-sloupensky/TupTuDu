<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'akce_selhala' => 'Akcia zlyhala:',
        'chyba_spojeni' => 'Chyba pripojenia. Skús to, prosím, znova.',
        'ulozeno' => 'Uložené',
    ],
    // Stejný koncept uložený jinde (koncept-k-ui.js, _konfliktUlozeni)
    'koncept' => [
        'konflikt_nadpis' => 'Projekt sa medzitým zmenil inde',
        'konflikt_text' => 'Tento projekt je novší na inej karte alebo v inom zariadení. Aby sa práca navzájom neprepísala, ukladanie je pozastavené. Načítaj aktuálnu verziu alebo ju prepíš tým, čo vidíš tu.',
        'konflikt_nacist' => 'Načítať aktuálnu verziu',
        'konflikt_prepsat' => 'Prepísať touto verziou',
    ],
    // Limity tarifu v editoru (public/js/koncept-v3/limit-tarifu.js) — stejné texty jako tarify.php
    'tarify' => [
        'limit_uprav_nadpis' => 'Dnešný limit úprav je vyčerpaný',
        'limit_uprav_text' => 'Vo verzii Zadarmo môžeš urobiť :limit úprav denne — počíta sa každá nová stena, posun alebo otvor. Prezerať môžeš ďalej, upravovať zase zajtra. S predplatným upravuješ bez obmedzení.',
        'limit_projektu_nadpis' => 'Ďalší projekt tvoja tarifa neumožňuje',
        'limit_projektu_text' => 'Počet projektov v tvojej tarife: :limit. Vyššia tarifa umožní viac projektov — alebo zmaž projekt, ktorý už nepotrebuješ.',
        'zbyva_uprav' => 'Dnes zostáva :zbyva z :limit úprav',
        'zobrazit_predplatne' => 'Zobraziť predplatné',
        'zavrit' => 'Zavrieť',
        'zkouska_tlacitko' => 'Vyskúšať :dni dní zadarmo',
        'zkouska_popis' => 'Bez karty a bez záväzku. Upravuješ bez obmedzenia, projekt máš jeden. Potom sa účet sám vráti na Zadarmo.',
        'zkouska_nadpis' => 'Skúška zadarmo beží',
        'zkouska_chyba' => 'Skúšku sa nepodarilo zapnúť. Skús to prosím znova.',
        'zkouska_odznak' => 'Vyskúšaj :dni dní bez obmedzenia zadarmo',
        'zkouska_zbyva' => 'one=Skúška zadarmo: zostáva :pocet deň|few=Skúška zadarmo: zostávajú :pocet dni|many=Skúška zadarmo: zostáva :pocet dňa|other=Skúška zadarmo: zostáva :pocet dní',
        'zkouska_nabidka_nadpis' => 'Vyskúšaj Home :dni dní zadarmo',
        'zkouska_nabidka_text' => 'Vo verzii Zadarmo je počet úprav za deň obmedzený. V skúške kreslíš a upravuješ bez obmedzenia. Stačí kliknúť, nič nevypĺňaš.',
    ],
];
