<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'akce_selhala' => 'La acción ha fallado:',
        'chyba_spojeni' => 'Error de conexión. Inténtalo de nuevo.',
        'ulozeno' => 'Guardado',
    ],
    // Stejný koncept uložený jinde (koncept-k-ui.js, _konfliktUlozeni)
    'koncept' => [
        'konflikt_nadpis' => 'El proyecto ha cambiado en otro sitio',
        'konflikt_text' => 'Hay una versión más reciente de este proyecto en otra pestaña o en otro dispositivo. Para que no se sobrescriba el trabajo, el guardado está en pausa. Carga la versión actual o sobrescríbela con lo que ves aquí.',
        'konflikt_nacist' => 'Cargar la versión actual',
        'konflikt_prepsat' => 'Sobrescribir con esta versión',
    ],
    // Limity tarifu v editoru (public/js/koncept-v3/limit-tarifu.js) — stejné texty jako tarify.php
    'tarify' => [
        'limit_uprav_nadpis' => 'Has llegado al límite de cambios de hoy',
        'limit_uprav_text' => 'En el plan Gratis puedes hacer :limit cambios al día; cuenta cada pared nueva, cada movimiento y cada hueco. Puedes seguir viendo tus proyectos y volver a editarlos mañana. Con una suscripción editas sin límites.',
        'limit_projektu_nadpis' => 'Tu plan no permite más proyectos',
        'limit_projektu_text' => 'Número de proyectos de tu plan: :limit. Un plan superior permite más proyectos; también puedes borrar uno que ya no necesites.',
        'zbyva_uprav' => 'Hoy te quedan :zbyva de :limit cambios',
        'zobrazit_predplatne' => 'Ver suscripción',
        'zavrit' => 'Cerrar',
        'zkouska_tlacitko' => 'Probar gratis :dni días',
        'zkouska_popis' => 'Sin tarjeta y sin compromiso. Cambios ilimitados, un proyecto. Después tu cuenta vuelve sola al plan Gratis.',
        'zkouska_nadpis' => 'Tu prueba gratis ha empezado',
        'zkouska_chyba' => 'No se pudo activar la prueba. Inténtalo de nuevo.',
        'zkouska_odznak' => 'Prueba :dni días sin límites, gratis',
        'zkouska_zbyva' => 'one=Prueba gratis: queda :pocet día|many=Prueba gratis: quedan :pocet días|other=Prueba gratis: quedan :pocet días',
        'zkouska_nabidka_nadpis' => 'Prueba Home gratis durante :dni días',
        'zkouska_nabidka_text' => 'En el plan Gratis el número de cambios al día es limitado. Durante la prueba dibujas y cambias sin límites. Basta un clic, no tienes que rellenar nada.',
    ],
];
