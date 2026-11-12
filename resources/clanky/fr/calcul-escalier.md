---
titulek: Calcul escalier : hauteur de marche, giron et loi de Blondel
klicove_slovo: calcul escalier
popis: Calculateur d’escalier droit, quart tournant ou en colimaçon : nombre et hauteur des marches, giron, loi de Blondel et dessin à l’échelle.
perex: Le calcul de votre escalier part de la hauteur de sol fini à sol fini. Divisez-la par environ 175 mm, arrondissez au nombre entier de marches, puis tirez le giron de la loi de Blondel, 2h + g = 630 mm. Pour 2,80 m, cela donne 16 marches de 175 mm, un giron de 280 mm et un escalier droit d’environ 4,2 m. En France, des dimensions minimales ne s’imposent qu’aux maisons neuves vendues ou louées.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
obrazek: /img/clanky/vypocet-schodiste/vypocet-schodiste.jpg
souvisejici: faire-un-plan-de-maison, taille-minimum-chambre
klic: vypocet-schodiste
zeme: FR
- Arrêté du 24 décembre 2015 relatif à l’accessibilité des bâtiments d’habitation collectifs et des maisons individuelles lors de leur construction, JO du 27 décembre 2015, art. 12 (escalier des logements : largeur minimale 0,80 m, hauteur de marche ≤ 18 cm, giron ≥ 24 cm) | https://www.gers.gouv.fr/index.php/contenu/telechargement/16832/129369/file/Arr%C3%AAt%C3%A9%20du%2027%20d%C3%A9cembre%202015%20BHC%20et%20MI%20neufs.pdf
- Code de la construction et de l’habitation : règles d’accessibilité applicables aux maisons individuelles construites pour être louées, mises à disposition ou vendues, à l’exclusion de celles construites par le propriétaire pour son propre usage (version 2019 citée, reprise aux art. R162-5 et suivants) | https://www.legifrance.gouv.fr/codes/id/LEGIARTI000039041316/2019-09-01/
- AQC, Fiche qualité réglementaire F5 Accessibilité des logements, janvier 2023 (arrêté modifié du 24 décembre 2015, art. R162-1 à R162-7 du CCH, escaliers intérieurs des logements sur plusieurs niveaux) | https://qualiteconstruction.com/wp-content/uploads/2024/05/Fiche-Qualite-Reglementaire-F05-Accessibilite-Logements-AQC.pdf
- CODIFAB et FCBA, Calepin de chantier Escalier en bois, juillet 2018, d’après NF DTU 36.3 (Blondel 0,60 à 0,64 m préférentiel, 0,58 à 0,66 m autres constructions ; giron courant 240 mm en habitation ; échappée minimale 1,90 m, recommandée 2,10 m en locaux privatifs ; confortable si H/G < 0,78) | https://biblio-bois.info/wp-content/uploads/2020/01/calepin_de_chantier_escalier_en_bois_-_juillet_2018_bd.pdf
- FCBA et IRABOIS, fiche P.O.B. 81.04 Escaliers, janvier 2015, selon XP P21-211 (G + 2H de 580 à 640 mm, hauteur de marche au plus 210 mm, échappée au moins 1,90 m, volée de 20 marches au plus sans palier, emmarchement au moins 0,70 m) | https://www.biblio-bois.info/document/fiche-pob-escaliers-fcba-irabois/
- Castorama, Prévoir les dimensions d’un escalier (hauteur de marche 16 à 21 cm, 2h + g de 61 à 64 cm, échappée au moins 190 cm, palier quand la volée approche 20 marches) | https://www.castorama.fr/idees-et-conseils/prevoir-les-dimensions-d-un-escalier/CF_CPRD_npcart_100261.art
- TupTuDu, calculateur : public/js/kalkulacka-schodiste.js avec les limites France en paramètres du bloc (giron 240 mm, hauteur 160 à 180 mm, Blondel 600 à 640 mm, largeur 80 cm, 20 marches par volée, échappée 2 100 mm, contrôle à 30 cm du bord intérieur désactivé) ; éditeur : public/js/koncept-v3/dum.js (n = round(H / 0,175), g = 630 − 2h limité à 220 à 320 mm, sans giron minimal hors Tchéquie) | interní
---
::kalkulacka-schodiste vyska=280 | vyskaMin=160 | vyskaMax=180 | krokMin=600 | krokMax=640 | sirkaMin=80 | rameno=20 | naslapMin=240 | zakrivMin=0 | podchod=2100

Le calculateur traite les escaliers droits, quart tournant, demi-tournant, deux quarts tournants et en colimaçon. Saisissez la hauteur de sol fini à sol fini, pas la hauteur sous plafond, plus petite de l’épaisseur du plancher.

## La loi de Blondel en cinq étapes

1. **Nombre de hauteurs :** divisez la hauteur à monter par 175 mm et arrondissez à l’entier.
2. **Hauteur de marche :** divisez la hauteur à monter par ce nombre. N’arrondissez pas : toutes les marches doivent être identiques et la dernière arriver exactement au sol.
3. **Giron :** g = 630 − 2h. 630 mm correspond au pas moyen ; en France, on vise 2h + g entre 600 et 640 mm.
4. **Reculement d’un escalier droit :** (nombre de hauteurs − 1) × giron. Il y a un giron de moins que de hauteurs, la dernière marche est le sol de l’étage.
5. **Pente :** l’angle dont la tangente vaut h / g.

| De sol à sol | Hauteurs | Hauteur de marche | Giron | Reculement | Pente |
|---:|---:|---:|---:|---:|---:|
| 2,50 m | 14 | 179 mm | 273 mm | 3,55 m | 33,2° |
| 2,60 m | 15 | 173 mm | 283 mm | 3,97 m | 31,5° |
| 2,70 m | 15 | 180 mm | 270 mm | 3,78 m | 33,7° |
| 2,80 m | 16 | 175 mm | 280 mm | 4,20 m | 32,0° |
| 2,90 m | 17 | 171 mm | 289 mm | 4,62 m | 30,6° |
| 3,00 m | 17 | 176 mm | 277 mm | 4,43 m | 32,5° |

Le nombre de marches est égal au nombre de hauteurs.

## Hauteur de marche et giron : les règles en France

En France, les dimensions de l’escalier ne sont imposées que dans une maison neuve construite pour être vendue ou louée : marche de 18 cm au plus, giron d’au moins 24 cm, largeur d’au moins 80 cm. Une maison que vous faites construire pour vous en est dispensée. Pour un escalier confortable, on retient en général :

- **Hauteur de marche** de 16 à 18 cm.
- **Loi de Blondel :** 2h + g entre 60 et 64 cm.
- **Largeur** d’au moins 80 cm.
- **Échappée** d’au moins 1,90 m au-dessus des marches, 2,10 m recommandés.
- **Nombre de marches** par volée : 20 au plus, au-delà un palier. Le calculateur le vérifie.

Un escalier est dit confortable quand sa pente reste sous 38°, soit h / g inférieur à 0,78. Les cotes définitives sont celles de votre maître d’œuvre ou de votre fabricant d’escalier.

## L’escalier tient-il dans la maison ?

Un escalier droit pour 2,80 m prend environ 4,2 m de long, plus un dégagement devant la première marche et après la dernière. Un escalier quart tournant ou demi-tournant avec palier est plus compact : le palier remplace un giron et les marches se répartissent sur deux volées. Raccourcissez l’escalier en le faisant tourner plutôt qu’en augmentant la hauteur de marche.

::obrazek /img/clanky/vypocet-schodiste/schodiste-v-hale-3d.webp | Vue 3D plongeante du rez-de-chaussée sans étage ni toit : un escalier droit monte dans le hall le long d’un mur porteur intérieur, près de l’entrée côté rue et des portes du WC, du bureau et du séjour. | Escalier droit pour 2,90 m de sol à sol dans le hall : 17 marches de 171 mm, reculement de 4,62 m. Il reste 1,25 m devant la première marche et les fenêtres sont hors de l’escalier, éditeur TupTuDu | 1200 | 700

Sans palier, les marches tournent dans l’angle et prennent encore moins de place : un quart tournant balancé pour 2,80 m et 1 m de large tient dans environ 2,63 × 2,63 m, contre 2,96 × 2,96 m avec palier. Le calculateur trace la ligne de foulée à 40 cm du bord extérieur, plus loin du coin intérieur qu’on ne la place souvent en France : vérifiez le côté étroit des marches sur le plan. Comme escalier principal, un colimaçon demande un diamètre d’environ 2 m ; plus petit, l’échappée sous le tour supérieur devient trop faible. Le calculateur les dessine aussi.

Au-dessus de l’escalier, il faut une trémie, une ouverture dans le plancher assez longue pour garder l’échappée. Elle décide souvent de la place de l’escalier dans le plan et de la taille des pièces à l’étage. Les dimensions des chambres et des couloirs sont dans l’article sur la [taille minimum d’une chambre](clanek:taille-minimum-chambre).

## Calcul de votre escalier dans le plan

Dans [l’éditeur TupTuDu](aplikace:), vous dessinez dans votre plan toutes les formes du calculateur, avec palier ou avec des marches tournantes. Les marches sont calculées à partir de la hauteur entre niveaux, comme dans le calculateur ; l’éditeur découpe la trémie dans le plancher de l’étage et la 3D montre où mène l’escalier. Vous pouvez modifier la hauteur de marche et le giron, ou raccourcir la trémie : l’éditeur affiche alors l’échappée. Pour bien démarrer, voyez comment [faire un plan de maison](clanek:faire-un-plan-de-maison).

::vyzva Essayez l’escalier dans votre maison | Ajoutez un étage, revenez au rez-de-chaussée, choisissez l’outil Escalier, cliquez sur le départ puis dans le sens de la montée. Vous verrez les marches, la trémie à l’étage et la 3D. La formule Gratuit permet 30 modifications par jour et un projet.
