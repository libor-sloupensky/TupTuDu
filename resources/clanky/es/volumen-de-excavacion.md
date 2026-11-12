---
titulek: Volumen de excavación: calculadora y cuánta tierra sobra
klicove_slovo: volumen de excavación
popis: Calcula el volumen de excavación de tu casa, cuánta tierra vuelve al relleno y cuánta sobra para retirar. Ejemplos con zapatas corridas y con sótano.
perex: ¿Qué volumen de excavación sale al cimentar una casa? En una de 12 × 10 m en terreno llano, con zapatas corridas, se excavan unos 54 m³, se reutilizan en el relleno unos 21 m³ y sobran unos 33 m³, de ellos 30 m³ de tierra vegetal. Si la tierra vegetal se queda en el jardín, en el mejor caso basta un solo viaje de camión. Con sótano sobran casi 400 m³.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
obrazek: /img/clanky/kolik-zeminy-z-vykopu/vykop-svah.jpg
souvisejici: esponjamiento-de-tierras, como-hacer-plano-casa
klic: kolik-zeminy-z-vykopu
zeme: ES
- CTE DB SE-C, 4.5.1.3.2 odst. 3 (i při mělkém únosném podloží je vhodné jít 0,5 až 0,8 m pod terén, hloubku určuje projekt), 3 (geotechnický průzkum), 7.3.2 (zásyp: hlavně zrnité zeminy, soudržné jen vybrané, ne bobtnavé) | https://www.codigotecnico.org/pdf/Documentos/SE/DBSE-C.pdf
- CTE DB HS 1, 2.2 (podlahy na terénu včetně podlahy nad větranou mezerou) a DB HS 6, 3.2 (espacio de contención ventilado, větraná mezera pod podlahou proti radonu); forjado sanitario je ve Španělsku běžný, pod dům se pak nic nesype | https://www.codigotecnico.org/pdf/Documentos/HS/DBHS.pdf
- Ley 7/2022 de residuos, čl. 3.2.b (nekontaminovaná zemina použitá v přirozeném stavu na stejné stavbě není odpad) a čl. 31.2 (každá přeprava odpadu s identifikačním dokladem) | https://www.boe.es/buscar/pdf/2022/BOE-A-2022-5809-consolidado.pdf
- Real Decreto 105/2008 o stavebních odpadech, čl. 3.1.a (zemina znovu použitá na stavbě, jiné stavbě nebo zásypu s doloženým určením), čl. 4.1.d a 6.2 (kauce k povolení stavby podle předpisů autonomního společenství) | https://www.boe.es/buscar/pdf/2008/BOE-A-2008-2486-consolidado.pdf
- Franquet Bernis, Querol Gómez: Esponjamiento, compactación y compensación de tierras (objem na korbě = rostlý objem × nakypření, korby sklápěčů asi 13,5 m³, návěsy 24 m³) | https://www.eumed.net/libros-gratis/2011b/967/esponjamiento%20compactacion%20y%20compensacion%20de%20tierras.html
- FAST VUT: Zemní práce (ornici skladovat nejvýš do 1,5 m) | https://www.fce.vutbr.cz/tst/x_txt_predmet_bw51_1_zemni-prace.pdf
- TupTuDu, kalkulačka zeminy: public/js/kalkulacka-zemina.js, příklad 12 × 10 m se spárou 0,8 m: vykopáno 54,15 m³, zpět 21,30, zbude 32,85 (ornice 30, výkopek 2,85), se štěrkem výkopek 14,85 a štěrk 12, hromada 67,7; sklep 3,05 m: 651,6 / 397,5 / 814,5 | interní
- TupTuDu, editor: výpočet zeminy jen s parcelou z katastru (maZaklady v public/js/koncept-v3/dum.js, modules/zemina.md), katastr jen v Česku (config/lokalizace.php) | interní
---
::kalkulacka-zeminy spara=80

## Por qué no basta con largo × ancho × profundidad

Esa fórmula dice cuánta tierra sacas. A ti te interesa cuánta vuelve a la obra y cuánta hay que llevarse.

## Volumen de excavación: de dónde sale cada metro cúbico

::rez-vykopu

Ejemplo: casa de 12 × 10 m con un muro de carga interior, suelo 30 cm sobre el terreno, 45 cm de paquete de suelo con solera (losa de hormigón) y encachado (capa de grava bajo la solera), 25 cm de tierra vegetal, espacio de trabajo de 80 cm y fondo de las zapatas a 80 cm bajo el terreno.

- **Tierra vegetal:** se retiran unos 39 m³. Alrededor de la casa vuelven 9 m³, bajo ella no: sobran 30 m³, la superficie de la casa por el espesor.
- **Zanjas:** 54 m de zapata × 0,5 m × 0,55 m = 15 m³ de la tierra bajo la vegetal, que sobra porque el hormigón llena la zanja. En España el Código Técnico no fija la profundidad: aconseja bajar de 0,5 a 0,8 m aunque el firme esté más arriba, y la cota la decide el proyecto con el estudio geotécnico.
- **Relleno bajo la casa:** la base del paquete de suelo queda 15 cm bajo el terreno y la tierra vegetal llegaba a 25 cm: faltan 10 cm, 12 m³. Con tierra excavada apta y compactada solo sobran 3 m³. Si es arcillosa, se rellena con zahorra (árido compactado) o grava, según el proyecto. Con forjado sanitario (cámara ventilada bajo el suelo), habitual en España, bajo la casa no se rellena: en la calculadora elige Grava y sobran unos 15 m³, dos camiones.

## Con sótano sobra unas doce veces más

| Casa de 12 × 10 m en llano | Excavado | Tierra vegetal sobrante | Tierra excavada sobrante | Mayor montón |
|:---|---:|---:|---:|---:|
| Zapatas, relleno con tierra excavada | 54 | 30 | 3 | 68 |
| Zapatas, relleno con grava (12 m³) | 54 | 30 | 15 | 68 |
| Sótano completo, altura de planta 3,05 m | 652 | 30 | 368 | 814 |

Cifras redondeadas en m³ en banco, es decir, tal como está la tierra en el terreno. El montón está esponjado.

::rez-sklepu

El mayor montón, el acopio durante la obra, supera al sobrante: está esponjado e incluye la tierra que luego vuelve. Apila la tierra vegetal aparte y en montones bajos, para que no pierda calidad. Con sus taludes, los montones del ejemplo ocupan unos 80 a 100 m².

## Retirada de tierras: cuántos camiones

En el camión, la tierra ocupa una cuarta parte más. Un camión de obra lleva, a grandes rasgos, de 10 a 14 m³, y con tierra suele mandar el peso, no la caja; lo exacto te lo dirá el transportista. Los 33 m³ del ejemplo son unos 41 m³, de 3 a 5 viajes; si la tierra vegetal se queda en el jardín, en el mejor caso un solo viaje. Con sótano, unos 500 m³: de 35 a 50 viajes. El paso a toneladas está en [esponjamiento de tierras](clanek:esponjamiento-de-tierras).

Es el caso ideal: las zanjas salen más anchas y parte de la tierra no sirve para rellenar. Para tu casa, divide los dos sobrantes esponjados de la calculadora por lo que lleve el camión.

## En pendiente sale distinto

La calculadora supone terreno llano. En pendiente, las zapatas se escalonan y la cimentación sale más alta en la parte baja.
::obrazek /img/clanky/kolik-zeminy-z-vykopu/zaklad-svah.webp | Vista 3D de una casa de una planta en una parcela en pendiente, con ventanas en todos los lados y la entrada en la parte alta; la cimentación gris es más alta en la parte baja | Casa en una parcela con poca pendiente: la cimentación (en gris para que se vea) baja hasta el terreno y es más alta en la parte baja. Editor TupTuDu con el terreno de una parcela del catastro checo | 1200 | 700

En el [editor de TupTuDu](aplikace:) la excavación según la casa y el terreno se calcula de momento solo con parcelas del catastro de Chequia. En España dibujas la casa a escala y sacas de ella las medidas para la calculadora.

::vyzva Antes de excavar, dibuja tu casa | Dibuja la planta real con sus muros de carga y activa las cotas: tendrás las medidas exteriores para la calculadora y verás la casa en 3D. El plan Gratis tiene 30 cambios al día y un proyecto.

## Adónde va la tierra

La tierra limpia reutilizada en la propia obra no es un residuo. La que sale va a un destino autorizado (planta de reciclaje, vertedero u otra obra que la aproveche) con su documento de identificación. Guarda el justificante: en muchas comunidades la licencia lleva una fianza de residuos que se devuelve al acreditar su gestión.

Las cifras no incluyen acometidas, fosa séptica, aljibe, acceso, terraza ni caminos. La tierra vegetal se cuenta solo en el espacio de trabajo de 80 cm y vuelve entera.
