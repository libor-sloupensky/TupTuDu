<?php

// Editor V3, nástroje kolem kresby: průvodce importem výkresu (import-pudorysu.js, import-prohlizec.js),
// katalog (katalog.js), export a sdílení (export-sdileni.js) a hlášky serveru
// (KonceptV3Controller, KonceptV3PodkladController, KonceptV3SdileniController, Katastr\Dmr5gService).
// Do JS jde přes ttSkupiny v koncept-v3.blade.php → preloz('ed_nastroje.klic').
return [
    // Průvodce importem půdorysu
    'import' => [
        'krok_soubor' => 'Plan',
        'krok_strana' => 'Page',
        'krok_meritko' => 'Échelle',
        'krok_obrys' => 'Contour',
        'krok_steny' => 'Murs',
        'pokyn_soubor' => 'Choisissez un plan, ou utilisez un plan déjà importé.',
        'pokyn_strana' => 'Choisissez la page qui contient le plan.',
        'pokyn_meritko' => 'Mesurez une dimension connue sur le plan — cliquez sur deux points et saisissez leur distance réelle.',
        'pokyn_obrys' => 'Décalquez le bord extérieur des murs extérieurs — cliquez sur les angles de la maison.',
        'pokyn_steny' => 'Choisissez la variante qui correspond le mieux aux murs.',
        'jen_formaty' => 'Seuls les fichiers PDF, PNG et JPG sont pris en charge.',
        'nahrani_selhalo' => 'Impossible d’importer le fichier.',
        'nahrani_selhalo_chyba' => 'Impossible d’importer le fichier : :chyba',
        'strana_selhala' => 'Impossible de préparer la page.',
        'strana_selhala_chyba' => 'Impossible de préparer la page : :chyba',
        'nejdriv_zmer' => 'Mesurez d’abord une dimension connue.',
        'nejdriv_meritko' => 'Réglez d’abord l’échelle.',
        'jen_vektor' => 'Pour l’instant, la reconnaissance des murs ne fonctionne qu’avec des PDF vectoriels (plan d’architecte).',
        'worker_selhal' => 'échec du worker',
        'rozpoznani_nevyslo' => 'échec de la reconnaissance',
        'rozpoznani_selhalo' => 'La reconnaissance a échoué : :chyba',
        'steny_nenalezeny' => 'Aucun mur trouvé sur le plan. Essayez un autre cadrage, ou décalquez le plan à la main.',
        'nahradit_kresbu' => 'Ce projet contient déjà un dessin. Le remplacer par les murs du plan ?',
        'akce_steny' => 'Import des murs du plan',
        'akce_steny_otvory' => 'one=Import des murs du plan (:pocet ouverture)|other=Import des murs du plan (:pocet ouvertures)',
        'zadej_rozmer' => 'saisissez la dimension',
        'klikni_druhy_bod' => 'cliquez sur le second point',
    ],

    // Katalog nábytku a vybavení
    'katalog' => [
        'sirka' => 'Largeur',
        'hloubka' => 'Profondeur',
        'vyska' => 'Hauteur',
        'chyba_http' => 'Catalogue : HTTP :status',
        'akce_vlozeni' => 'Insertion de l’objet : :nazev',
        'akce_rozmer' => 'Changement de dimensions de l’objet',
        'akce_puvodni' => 'Dimensions d’origine de l’objet',
        'akce_otoceni' => 'Rotation de l’objet',
        'akce_kopie' => 'Copie de l’objet',
        'akce_smazani' => 'Suppression de l’objet',
        'akce_vyska' => 'Hauteur de l’objet au-dessus du sol',
    ],

    // Kategorie katalogu podle id z public/katalog/katalog.json
    'kategorie' => [
        'pohovky' => 'Canapés',
        'kresla' => 'Fauteuils',
        'zidle' => 'Chaises',
        'stoly' => 'Tables à manger',
        'stolky' => 'Tables basses',
        'postele' => 'Lits',
        'skrine' => 'Armoires et commodes',
        'police' => 'Bibliothèques et étagères',
        'psaci' => 'Bureaux',
        'svitidla' => 'Luminaires',
        'koberce' => 'Tapis',
        'obrazy' => 'Tableaux',
        'zrcadla' => 'Miroirs',
        'rostliny' => 'Plantes et pots',
    ],

    // Export obrázků; soubor_* jsou části názvu staženého souboru
    'export' => [
        'obrazek_selhal' => 'Impossible de créer l’image',
        'meritko_koty' => ':delka  ·  cotes en cm',
        'podtitul' => 'Outil en ligne pour concevoir maison et rénovation',
        'neni_co_exportovat' => 'Rien à exporter : ce niveau n’a pas de murs.',
        'soubor_projekt' => 'projet',
        'soubor_pudorysy' => 'plans',
        'soubor_pudorys' => 'plan-:podlazi',
    ],

    // Sdílení odkazem (editor a KonceptV3SdileniController)
    'sdileni' => [
        'neni_co_sdilet' => 'Rien à partager : la maison n’a pas de murs.',
        'odkaz_neulozen' => 'Impossible d’enregistrer le lien.',
        'odkaz_aktualni' => 'Le lien montre l’état actuel.',
        'vypnout_potvrzeni' => 'Désactiver le lien ? Les personnes qui l’ont ne verront plus le projet. Un nouveau partage créera une nouvelle adresse.',
        'vypnuti_http' => 'Désactivation du lien : HTTP :status',
        'chybi_plan' => 'Il manque le plan d’un des niveaux.',
        'neplatny_model' => 'Modèle 3D non valide.',
    ],

    // Výchozí popisy kroků historie ze serveru
    'historie' => [
        'uprava' => 'Modification',
        'zacatek' => 'Début',
    ],

    // Nahrání výkresu (KonceptV3PodkladController)
    'podklad' => [
        'vyber_vykres' => 'Choisissez un plan.',
        'jen_formaty' => 'Seuls les fichiers PDF, PNG ou JPG peuvent être importés.',
        'soubor_velky' => 'Le fichier dépasse :mb Mo.',
        'chybi_poppler' => 'Le serveur ne dispose pas des outils de lecture PDF (poppler). Importez une image, ou installez poppler.',
        'vykres_neexistuje' => 'Ce plan n’existe pas.',
        'nenalezen' => 'Fond de plan introuvable.',
    ],

    // Katastr, výškový profil a vysvětlení pojmů (KonceptV3Controller, Katastr\Dmr5gService)
    'katastr' => [
        'parcela_nenalezena' => 'Parcelle introuvable. Vérifiez le numéro de parcelle et le territoire cadastral.',
        'pojem_kratky' => 'Terme trop court',
        'ai_nedostupna' => 'IA non disponible',
        'ai_selhala' => 'La réponse de l’IA a échoué',
        'ai_prazdna' => 'Réponse de l’IA vide',
        'neocekavana_chyba' => 'Erreur inattendue',
        'zadny_polygon' => 'Aucun polygone valide.',
        'polygon_body' => 'Un polygone doit avoir au moins 3 points.',
        'polygon_bez_bodu' => 'Aucun point dans le polygone de la parcelle.',
        'vysky_nedostupne' => 'Les données d’altitude ne sont pas disponibles pour cette zone.',
        'souradnice_mimo' => 'Coordonnées hors de la plage S-JTSK : :lat, :lon',
    ],
];
