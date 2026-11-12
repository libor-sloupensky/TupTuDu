<?php

// Editor V3, nástroje kolem kresby. Klíče a použití viz lang/cs/ed_nastroje.php.
return [
    // Průvodce importem půdorysu
    'import' => [
        'krok_soubor' => 'Plano',
        'krok_strana' => 'Página',
        'krok_meritko' => 'Escala',
        'krok_obrys' => 'Contorno de la casa',
        'krok_steny' => 'Paredes',
        'pokyn_soubor' => 'Elige un plano, o usa uno que ya hayas subido.',
        'pokyn_strana' => 'Elige la página en la que está el plano.',
        'pokyn_meritko' => 'Mide en el plano una dimensión conocida: haz clic en dos puntos e indica su distancia real.',
        'pokyn_obrys' => 'Calca el borde exterior de las paredes exteriores: haz clic en las esquinas de la casa.',
        'pokyn_steny' => 'Elige la opción que mejor se ajuste a las paredes.',
        'jen_formaty' => 'Solo se admiten archivos PDF, PNG y JPG.',
        'nahrani_selhalo' => 'No se ha podido subir el archivo.',
        'nahrani_selhalo_chyba' => 'No se ha podido subir el archivo: :chyba',
        'strana_selhala' => 'No se ha podido preparar la página.',
        'strana_selhala_chyba' => 'No se ha podido preparar la página: :chyba',
        'nejdriv_zmer' => 'Mide primero una dimensión conocida.',
        'nejdriv_meritko' => 'Ajusta primero la escala.',
        'jen_vektor' => 'De momento, el reconocimiento de paredes solo funciona con PDF vectoriales (plano del arquitecto).',
        'worker_selhal' => 'error del worker',
        'rozpoznani_nevyslo' => 'error de reconocimiento',
        'rozpoznani_selhalo' => 'El reconocimiento ha fallado: :chyba',
        'steny_nenalezeny' => 'No se han encontrado paredes en el plano. Prueba otro recorte, o cálcalo a mano.',
        'nahradit_kresbu' => 'Este proyecto ya tiene un dibujo. ¿Quieres sustituirlo por las paredes del plano?',
        'akce_steny' => 'Importar paredes del plano',
        'akce_steny_otvory' => 'one=Importar paredes del plano (:pocet hueco)|other=Importar paredes del plano (:pocet huecos)',
        'zadej_rozmer' => 'indica la medida',
        'klikni_druhy_bod' => 'haz clic en el segundo punto',
    ],

    // Katalog nábytku a vybavení
    'katalog' => [
        'sirka' => 'Ancho',
        'hloubka' => 'Fondo',
        'vyska' => 'Altura',
        'chyba_http' => 'Catálogo: HTTP :status',
        'akce_vlozeni' => 'Insertar objeto: :nazev',
        'akce_rozmer' => 'Cambiar tamaño del objeto',
        'akce_puvodni' => 'Tamaño original del objeto',
        'akce_otoceni' => 'Girar objeto',
        'akce_kopie' => 'Copiar objeto',
        'akce_smazani' => 'Borrar objeto',
        'akce_vyska' => 'Altura del objeto sobre el suelo',
        'akce_barva' => 'Color del objeto',
    ],

    // Kategorie katalogu podle id z public/katalog/katalog.json
    'kategorie' => [
        'pohovky' => 'Sofás',
        'kresla' => 'Sillones',
        'zidle' => 'Sillas',
        'stoly' => 'Mesas de comedor',
        'stolky' => 'Mesitas',
        'postele' => 'Camas',
        'skrine' => 'Armarios y cómodas',
        'police' => 'Librerías y estantes',
        'psaci' => 'Escritorios',
        'svitidla' => 'Iluminación',
        'koberce' => 'Alfombras',
        'obrazy' => 'Cuadros',
        'zrcadla' => 'Espejos',
        'koupelna' => 'Baño y aseo',
        'rostliny' => 'Plantas y macetas',
    ],

    // Export obrázků; soubor_* jsou části názvu staženého souboru
    'export' => [
        'obrazek_selhal' => 'No se ha podido crear la imagen',
        'meritko_koty' => ':delka  ·  cotas en cm',
        'podtitul' => 'Herramienta en línea para diseñar casas y reformas',
        'neni_co_exportovat' => 'No hay nada que exportar, la planta no tiene paredes.',
        'soubor_projekt' => 'proyecto',
        'soubor_pudorysy' => 'planos',
        'soubor_pudorys' => 'plano-:podlazi',
    ],

    // Sdílení odkazem (editor a KonceptV3SdileniController)
    'sdileni' => [
        'neni_co_sdilet' => 'No hay nada que compartir, la casa no tiene paredes.',
        'odkaz_neulozen' => 'No se ha podido guardar el enlace.',
        'odkaz_aktualni' => 'El enlace muestra el estado actual.',
        'vypnout_potvrzeni' => '¿Desactivar el enlace? Quien lo tenga ya no verá el proyecto. Si vuelves a compartirlo, tendrá una dirección nueva.',
        'vypnuti_http' => 'Desactivación del enlace: HTTP :status',
        'chybi_plan' => 'Falta el plano de alguna planta.',
        'neplatny_model' => 'Modelo 3D no válido.',
    ],

    // Výchozí popisy kroků historie ze serveru
    'historie' => [
        'uprava' => 'Edición',
        'zacatek' => 'Inicio',
    ],

    // Nahrání výkresu (KonceptV3PodkladController)
    'podklad' => [
        'vyber_vykres' => 'Elige un plano.',
        'jen_formaty' => 'Solo se pueden subir PDF, PNG o JPG.',
        'soubor_velky' => 'El archivo supera los :mb MB.',
        'chybi_poppler' => 'Faltan en el servidor las herramientas para leer PDF (poppler). Sube una imagen, o instala poppler.',
        'vykres_neexistuje' => 'El plano no existe.',
        'nenalezen' => 'Base no encontrada.',
    ],

    // Katastr, výškový profil a vysvětlení pojmů (KonceptV3Controller, Katastr\Dmr5gService)
    'katastr' => [
        'parcela_nenalezena' => 'Parcela no encontrada. Comprueba el número de parcela y la zona catastral.',
        'pojem_kratky' => 'Término demasiado corto',
        'ai_nedostupna' => 'La IA no está disponible',
        'ai_selhala' => 'La respuesta de la IA ha fallado',
        'ai_prazdna' => 'Respuesta vacía de la IA',
        'neocekavana_chyba' => 'Error inesperado',
        'zadny_polygon' => 'Ningún polígono válido.',
        'polygon_body' => 'El polígono debe tener al menos 3 puntos.',
        'vysky_pomalu' => 'No se ha podido cargar ahora el perfil de altura, el servicio de mapas responde despacio. Inténtalo dentro de un momento.',
        'polygon_bez_bodu' => 'No hay puntos dentro del polígono de la parcela.',
        'vysky_nedostupne' => 'No hay datos de altitud disponibles para esta zona.',
        'vysky_zeme_nejsou' => 'Todavía no tenemos un modelo digital del terreno para este lugar, el terreno será plano.',
        'pozemek_velky' => 'El terreno es demasiado grande para un perfil de altura, elige una parte más pequeña (hasta 1,5 km).',
        'bod_mimo_evropu' => 'Aquí no tenemos catastro, el lugar está fuera de los países disponibles. Puedes dibujar el contorno del terreno.',
        'bod_bez_katastru' => 'Todavía no tenemos catastro para este país. Puedes dibujar el contorno del terreno.',
        'bod_nenalezena' => 'No hemos encontrado ninguna parcela en este punto. Prueba a hacer clic dentro del terreno o dibuja su contorno.',
        'souradnice_mimo' => 'Coordenadas fuera del rango S-JTSK: :lat, :lon',
    ],
];
