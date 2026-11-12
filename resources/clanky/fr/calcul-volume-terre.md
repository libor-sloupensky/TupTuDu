---
titulek: Calcul du volume de terre à évacuer : calculateur gratuit
klicove_slovo: calcul volume terre
popis: Calculez la terre excavée, remblayée et à évacuer pour votre maison : déblais, terre végétale et nombre de camions, sur semelles ou avec sous-sol.
perex: Calcul du volume de terre pour une maison de 12 × 10 m sur semelles filantes, en terrain plat : on excave environ 57 m³. Si les déblais servent de remblai sous la maison, 24 m³ retournent dans le terrain et il en reste 33 m³, dont 30 m³ de terre végétale. Si la terre végétale reste au jardin, il n’y a presque rien à évacuer. Avec un sous-sol complet, l’excédent dépasse 350 m³.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
obrazek: /img/clanky/kolik-zeminy-z-vykopu/vykop-svah.jpg
souvisejici: coefficient-de-foisonnement, faire-un-plan-de-maison
klic: kolik-zeminy-z-vykopu
zeme: FR
- AQC, Mémo chantier Fondations de maisons individuelles, décembre 2021 (hors-gel minimum de 0,50 m en zone tempérée à 0,90 m en montagne, selon NF DTU 13.1 ; semelle filante 40 × 20 cm minimum ; sous-sol : talus 1/1 et 1 m d’espace de travail conseillé) | https://qualiteconstruction.com/wp-content/uploads/2024/05/Memo-Chantier-Fondations-Maisons-Individuelles-AQC.pdf
- NF DTU 13.1 : profondeur hors gel H = H0 + (A − 150) / 4000 selon la zone et l’altitude A (formule citée par la revue du 12 novembre 2026, texte de la norme payant) | revue interne
- Préfecture de la Somme, Construire en terrain argileux (fondations à au moins 0,80 m en exposition moyenne et 1,20 m en exposition forte, sauf sol dur non argileux plus haut, avec les autres dispositions constructives ; étude géotechnique de conception ou techniques particulières de construction) | https://www.somme.gouv.fr/index.php/contenu/telechargement/41059/240237/file/construire_en_terrain_argileux_reglementation_et_bonnes_pratiques-v_modif%20ccmi.pdf
- Arrêté du 22 juillet 2020 définissant les zones exposées au retrait-gonflement des argiles (exposition moyenne ou forte, carte sur Géorisques) | https://www.Jura.gouv.fr/contenu/telechargement/19583/141515/file/AM22072020zonesexposees.pdf
- Code de l’urbanisme, art. R*421-23 f (affouillements et exhaussements de plus de 2 m sur au moins 100 m² : déclaration préalable, sauf s’ils sont nécessaires à un permis de construire) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031764703/
- Ministère de la Transition écologique, traçabilité des déchets, terres excavées et sédiments (registre chronologique et registre national, décret n° 2021-321, que les terres aient ou non le statut de déchet) | https://www.ecologie.gouv.fr/politiques-publiques/tracabilite-dechets-terres-excavees-sediments
- HelloPro, dimensions d’une benne TP (porteur 6x4 : 10 à 12 t de charge utile, 10 à 15 m³ ; 8x4 : 16,5 à 17 t, 12,5 à 16 m³ ; la charge utile limite souvent avant le volume) | https://conseils.hellopro.fr/quelles-sont-les-dimensions-d-une-benne-tp-5515.html
- Futura Sciences, Aménager son terrain avant la construction d’une maison (terrassement, déblais et remblais) | https://www.futura-sciences.com/maison/questions-reponses/batiment-amenager-son-terrain-avant-construction-maison-1746/
- TupTuDu, calculateur de terre : public/js/kalkulacka-zemina.js, mêmes règles que l’éditeur (modules/zemina.md) ; valeurs France en paramètres du bloc : fond des semelles 0,80 m, talus 1/1, espace de travail 1 m, hauteur d’étage du sous-sol 2,70 m ; camions : 10 à 17 t de charge utile divisées par 1,8 t/m³ en place et foisonnement 1,25, soit 7 à 12 m³ foisonnés | interní
---
::kalkulacka-zeminy spara=80 | svah=1 | odkop=100 | vyskaSklepu=270

## Calcul du volume de terre : d’où vient l’excédent

Longueur × largeur × profondeur ne donne que le volume excavé, pas ce qu’il faut évacuer.

::rez-vykopu

Exemple : maison de 12 × 10 m avec un mur porteur intérieur, plancher 30 cm au-dessus du terrain, 45 cm du sol fini au bas de la couche de forme, 25 cm de terre végétale, 1 m d’espace de travail et fond des semelles à 80 cm sous le terrain.

- **Terre végétale :** on en décape environ 42 m³, dont 12 m³ sont remis autour de la maison. Il en reste 30 m³, à peu près la surface de la maison multipliée par l’épaisseur décapée.
- **Tranchées des semelles :** environ 54 m de semelles × 0,5 m × 0,55 m = 15 m³ de déblais, la terre prise sous la terre végétale. Le calculateur suppose une fondation coulée sur toute la hauteur de la tranchée ; avec une semelle de 20 à 30 cm et un soubassement en blocs, une partie des déblais revient autour du soubassement. La profondeur dépend surtout de la mise hors gel : en France, de 0,50 m en zone tempérée à 0,90 m en montagne, davantage en altitude. En zone argileuse, sans étude de sol de conception, au moins 0,80 m en exposition moyenne et 1,20 m en exposition forte, avec les autres dispositions prévues.
- **Remblai sous la maison :** le bas de la couche de forme est à 15 cm sous le terrain, la terre végétale descendait à 25 cm. Il manque 10 cm, soit 12 m³. Avec des déblais compactés, il ne reste que 3 m³ de déblais. Si l’entreprise met de la grave sous le dallage, choisissez « Gravier » : il en reste 15 m³. Sous un vide sanitaire, rien n’est remblayé : choisissez aussi « Gravier » et ignorez la ligne Gravier sous la maison.

## Avec un sous-sol, environ dix fois plus

| Maison de 12 × 10 m, terrain plat | Excavé | Terre végétale en excédent | Déblais en excédent | Plus gros tas |
|:---|---:|---:|---:|---:|
| Semelles, déblais sous la maison | 57 | 30 | 3 | 71 |
| Sous-sol complet, hauteur d’étage 2,70 m, semelles | 720 | 30 | 326 | 901 |

Chiffres arrondis, en m³ de terre en place, avec un talus de 1/1 et 1 m d’espace de travail. Le plus gros tas est foisonné et contient aussi la terre qui sera remise en place.

::rez-sklepu

## Évacuation : combien de camions

Dans la benne, la terre prend environ un quart de volume en plus. Selon sa taille, un camion emporte 7 à 12 m³ de terre foisonnée, souvent limité par le poids. Les 33 m³ de l’exemple font environ 41 m³ dans la benne, soit 4 à 6 camions. Si la terre végétale reste au jardin, un seul camion suffit. Avec de la grave sous le dallage, comptez 2 ou 3 camions de déblais ; avec un sous-sol, terre végétale gardée, environ 35 à 60. La conversion en tonnes est expliquée dans l’article sur le [coefficient de foisonnement](clanek:coefficient-de-foisonnement).

C’est le cas idéal : des tranchées plus larges, une terre impropre au remblai comme l’argile ou le manque de place augmentent l’excédent. Pour votre estimation, divisez les excédents foisonnés du calculateur par la capacité du camion que donnera le transporteur.

::vyzva Mesurez votre maison avant de calculer | Dessinez le plan de votre maison dans TupTuDu : ses cotes vous donnent les dimensions et la longueur des murs porteurs à reporter dans le calculateur. Le calcul de la fouille d’après la parcelle et le terrain n’existe pour l’instant qu’en Tchéquie. La formule Gratuit permet 30 modifications par jour et un projet.

## Sur un terrain en pente

Le calculateur suppose un terrain plat. En pente, les fondations se font en redans et sont plus hautes côté aval. Le volume dépend surtout de la hauteur à laquelle vous calez la maison.

::obrazek /img/clanky/kolik-zeminy-z-vykopu/zaklad-svah.webp | Vue 3D d’une maison de plain-pied sur un terrain en pente, avec des fenêtres sur toutes les façades et l’entrée côté amont ; la fondation grise est plus haute côté aval. | Maison sur un terrain en légère pente : la fondation (en gris pour la lisibilité) se prolonge côté aval jusque sous le plancher, éditeur TupTuDu | 1200 | 700

## Que faire de la terre

Gardez la terre végétale pour le jardin. Les déblais qui conviennent servent aux remblais et aux aménagements. En France, un remblai de plus de 2 m de haut sur au moins 100 m² demande une déclaration préalable, sauf s’il est nécessaire au permis de construire. La terre qui quitte le terrain doit aller vers une installation autorisée ou un autre chantier, avec une traçabilité : demandez à l’entreprise où elle part.

Le calcul ne comprend ni les tranchées des réseaux, ni l’assainissement individuel, ni la cuve, l’accès, la terrasse ou les allées.
