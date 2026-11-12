---
titulek: Esponjamiento de tierras: cuánto ocupa en el camión
klicove_slovo: esponjamiento de tierras
popis: Descubre cuánto más ocupa la tierra al excavarla: coeficientes de esponjamiento por tipo de suelo y el paso a metros cúbicos de camión y a toneladas.
perex: El esponjamiento de tierras es el aumento de volumen de la tierra al excavarla. En tierra común el coeficiente ronda 1,25, es decir, ocupa una cuarta parte más; en roca fragmentada, casi la mitad más. De 10 m³ excavados en tierra común salen unos 12,5 m³ en el camión.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
souvisejici: volumen-de-excavacion, como-hacer-plano-casa
klic: koeficient-nakypreni-zeminy
zeme: ES
- Franquet Bernis, Querol Gómez: Esponjamiento, compactación y compensación de tierras (definice koeficientu v %, orientační nakypření 10 až 40 % podle zeminy, cubicación z rostlého objemu, ne z převezeného) | https://www.eumed.net/libros-gratis/2011b/967/esponjamiento%20compactacion%20y%20compensacion%20de%20tierras.html
- Diputación Foral de Bizkaia, projekt, Anejo 8 Movimiento de tierras (coeficiente de paso zemin na skládku 1,20, do hutněného násypu 1,0) | https://www.bizkaia.eus/Home2/archivos/DPTO10/Temas/Anejo%20N%C2%BA08_Movimiento%20de%20tierras%20y%20gesti%C3%B3n%20de%20sobrantes.pdf?idioma=CA
- CTE DB SE-C, Anejo D, tabla D.27 (objemová tíha: štěrk 19–22, písek 17–20, hlína 17–20, jíl 15–22, ornice v násypu 17 kN/m³) | https://www.codigotecnico.org/pdf/Documentos/SE/DBSE-C.pdf
- FAST VUT: Zemní práce (nakypření podle zemin, ornice 20 %) | https://www.fce.vutbr.cz/tst/x_txt_predmet_bw51_1_zemni-prace.pdf
- RTS, HSV 800-1: Zemní práce (nakypření a objemová hmotnost podle tříd) | https://www.cenovasoustava.cz/files/HSV_800-1.pdf
- TupTuDu, editor: panel Cimentación (rostlý a nakypřený objem, koeficient v Detalles) jen s parcelou (maZaklady v public/js/koncept-v3/dum.js); parcela výběrem na mapě i ve Španělsku, výšky terénu tam nejsou a terén je rovina; výchozí hodnoty z české praxe pro všechny země: spára 1,0 m, svah 1 : 0,5, odkop 0,8 m, skladba 45 cm, nakypření 1,25 (public/js/koncept-v3/zemina.js, VYCHOZI) (config/pozemky.php, modules/lokalizace.md, stav 12. 11. 2026) | interní
---
::nakypreni

## Coeficientes de esponjamiento de tierras por tipo de suelo

| Tipo de suelo | Coeficiente de esponjamiento |
|:---|---:|
| Grava y arena | 1,15 |
| Tierra vegetal | 1,20 |
| Tierra común | 1,25 |
| Arcilla | 1,30 |
| Roca fragmentada | 1,45 |

Multiplica el volumen en el terreno por el coeficiente y tendrás el volumen en el montón o en el camión. Son valores orientativos, recién excavada la tierra, y a menudo se dan en porcentaje: 1,25 es un 25 %. El esponjamiento real depende sobre todo del tipo de suelo y de lo compacto que estaba. Las tablas varían según la fuente: algunas dan solo un 10 % para el terreno suelto y un 40 % para la roca.

## Por qué se dan dos cifras

El **volumen en banco** es el que ocupaba la tierra en el terreno. Con él se calcula cuánto se excava y cuánto vuelve al relleno, que se compacta por tongadas.

El **volumen esponjado** es el que ocupa en el montón y en el camión. Con él planificas el sitio en la parcela y la [retirada de tierras](clanek:volumen-de-excavacion). La excavación de un presupuesto suele medirse en banco, mientras que el transporte y el vertedero pueden cobrarse por metro cúbico esponjado, por viaje, por horas o por toneladas. Pregunta siempre de qué metros cúbicos se habla.

## Cuánto pesa la tierra

El Código Técnico da para los suelos un peso de 15 a 22 kN/m³, es decir, de 1,5 a 2,2 t por m³ en banco. La tierra común ronda 1,8 t y, mojada, pesa más. Al esponjarse cambia el volumen, no el peso: de 10 m³ excavados en tierra común salen 12,5 m³ en el camión y unas 18 t. Por eso, al pedir un camión importa qué se llena antes, la caja o la carga máxima.

## Cuánta tierra vas a retirar tú

Cuánto se excava en tu casa y cuánto sobra lo calcula la [calculadora de tierras](clanek:volumen-de-excavacion), en la que también cambias el coeficiente de esponjamiento. En el editor de TupTuDu, el panel Cimentación muestra el volumen en banco y el esponjado según la forma real de la casa en cuanto eliges su parcela en el mapa. El editor parte de valores de la práctica checa, como la zapata a 1,0 m de profundidad, que cambias en ese mismo panel. En España no conoce el relieve y toma el terreno como llano. Puedes [dibujar tu casa en TupTuDu](aplikace:) y llevar sus medidas también a la calculadora.

::vyzva Dibuja tu casa a escala real | Dibuja la planta, activa las cotas y lleva las medidas exteriores y la longitud de los muros de carga a la calculadora de tierras. El plan Gratis tiene 30 cambios al día y un proyecto.
