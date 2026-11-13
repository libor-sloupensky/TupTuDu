<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'akce_selhala' => 'Azione non riuscita:',
        'chyba_spojeni' => 'Errore di connessione. Riprova.',
        'ulozeno' => 'Salvato',
    ],
    // Stejný koncept uložený jinde (koncept-k-ui.js, _konfliktUlozeni)
    'koncept' => [
        'konflikt_nadpis' => 'Il progetto è stato modificato altrove',
        'konflikt_text' => 'Esiste una versione più recente di questo progetto in un’altra scheda o su un altro dispositivo. Per evitare che le modifiche si sovrascrivano a vicenda, il salvataggio è in pausa. Carica la versione attuale oppure sovrascrivila con quello che vedi qui.',
        'konflikt_nacist' => 'Carica la versione attuale',
        'konflikt_prepsat' => 'Sovrascrivi con questa versione',
    ],
    // Limity tarifu v editoru (public/js/koncept-v3/limit-tarifu.js) — stejné texty jako tarify.php
    'tarify' => [
        'limit_uprav_nadpis' => 'Hai raggiunto il limite di modifiche di oggi',
        'limit_uprav_text' => 'Nella versione Gratis puoi fare :limit modifiche al giorno: conta ogni nuova parete, spostamento o apertura. Puoi continuare a guardare il progetto e riprendere a modificarlo domani. Con un abbonamento le modifiche sono illimitate.',
        'limit_projektu_nadpis' => 'Il tuo piano non consente un altro progetto',
        'limit_projektu_text' => 'Numero di progetti del tuo piano: :limit. Un piano superiore ne consente di più, altrimenti elimina un progetto che non ti serve più.',
        'zbyva_uprav' => 'Oggi restano :zbyva modifiche su :limit',
        'zobrazit_predplatne' => 'Vedi l’abbonamento',
        'zavrit' => 'Chiudi',
        'zkouska_tlacitko' => 'Prova gratis per :dni giorni',
        'zkouska_popis' => 'Senza carta e senza impegno. Modifiche illimitate, un progetto. Poi il tuo account torna da solo al piano Gratis.',
        'zkouska_nadpis' => 'La tua prova gratuita è iniziata',
        'zkouska_chyba' => 'Non è stato possibile attivare la prova. Riprova.',
        'zkouska_odznak' => 'Prova :dni giorni senza limiti, gratis',
        'zkouska_zbyva' => 'one=Prova gratuita: manca :pocet giorno|many=Prova gratuita: mancano :pocet giorni|other=Prova gratuita: mancano :pocet giorni',
        'zkouska_nabidka_nadpis' => 'Prova Home gratis per :dni giorni',
        'zkouska_nabidka_text' => 'Con il piano Gratis il numero di modifiche al giorno è limitato. Durante la prova disegni e modifichi senza limiti. Basta un clic, non devi compilare nulla.',
    ],
];
