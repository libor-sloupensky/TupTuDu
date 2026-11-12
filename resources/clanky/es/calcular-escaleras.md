---
titulek: Calcular escaleras: huella, contrahuella y calculadora
klicove_slovo: calcular escaleras
popis: Calculadora de escaleras rectas, en L, en U, con peldaños compensados y de caracol: peldaños, contrahuella y huella según el CTE, con dibujo a escala.
perex: Para calcular escaleras parte de la altura de suelo a suelo. Divídela por unos 175 mm y redondea: ese es el número de peldaños. La huella sale de la fórmula 2C + H = 630 mm. En España, dentro de una vivienda la contrahuella no puede pasar de 20 cm y la huella debe medir al menos 22 cm. Para 2,90 m salen 17 peldaños de 171 mm, huella de 289 mm y un tramo recto de unos 4,6 m.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
obrazek: /img/clanky/vypocet-schodiste/vypocet-schodiste.jpg
souvisejici: como-hacer-plano-casa, medidas-minimas-habitacion
klic: vypocet-schodiste
zeme: ES
- CTE DB SUA (texto consolidado, RD 450/2022), SUA 1 4.1 (escalera de uso restringido: ancho del tramo 0,80 m, contrahuella max. 20 cm, huella min. 22 cm; trazado curvo: huella en el eje si el ancho es menor de 1 m, a 50 cm del lado estrecho si es mayor, min. 5 cm en el lado estrecho, max. 44 cm en el ancho; mesetas partidas con peldaños a 45°; barandilla en lados abiertos), SUA 1 3.2.1 a 3.2.3 (zábradlí 0,90 m do výšky pádu 6 m, bez otvorů pro kouli 10 cm, nešplhatelné) | https://www.codigotecnico.org/pdf/Documentos/SUA/DcmSUA.pdf
- CTE DB SUA, SUA 1 4.2 (uso general: huella min. 28 cm, contrahuella 13 a 18,5 cm, 54 ≤ 2C + H ≤ 70 cm, tramo max. 3,20 m), SUA 2 1.1 (altura libre de paso 2,10 m v uso restringido), Anejo A (uso restringido zahrnuje vnitřek bytů a domů) | https://www.codigotecnico.org/pdf/Documentos/SUA/DcmSUA.pdf
- Decret 141/2012 (Katalánsko), annex 1, 3.4.3 (vnitřní schody bytu min. 0,90 m, zábradlí 0,90 m) | https://aplicacions.habitatge.gencat.cat/files/decret141%20HABITABILITAT%20201260882.pdf
- FAST VUT, S10 Návrh schodiště (výška od podlahy k podlaze, n = H / h zaokrouhlit, výšku stupně nezaokrouhlovat, b = 630 − 2h, L = (n − 1) × b) | https://www.fce.vutbr.cz/PST/bstud/BH02_2015/S10_navrh_schodiste.pdf
- TupTuDu, kalkulačka schodiště: public/js/kalkulacka-schodiste.js s limity pro Španělsko (naslapMin 220, zakrivMin 220, sirkaMin 80, výška stupně 130 až 185, podchod 2100); tabulka spočítaná funkcí spocitej; L s odpočívadlem 3,02 × 3,31 m, zabíhající do L 2,84 × 2,84 m, točité Ø 2 m šířka 0,94 m a podchodná výška 2,18 m; blok s zatacka=rozlozene; meze 5 a 44 cm ani místo měření podle CTE kalkulačka nehlídá (výpočet točitých podle revize: Ø 2 m a 15 stupňů na otáčku = venku 41,9 cm, u jádra 5,0 cm, jádro asi 24 cm, šířka 88 cm, v ose 23,5 cm, podchod 2,51 m) | interní
- TupTuDu, editor: public/js/koncept-v3/dum.js (NASLAP_MIN_ZEME jen CZ, ve Španělsku bez přidávání výšek, nášlap omezen na 220 až 320 mm jako v kalkulačce) | interní
---
::kalkulacka-schodiste sirkaMin=80 | naslapMin=220 | zakrivMin=220 | vyskaMin=130 | vyskaMax=185 | podchod=2100 | rameno=18 | zatacka=rozlozene

Introduce la altura del suelo terminado de abajo al de arriba, no la altura libre de la habitación, que es menor por el forjado.

## Fórmula para calcular escaleras

1. **Número de peldaños:** divide la altura entre plantas por 175 mm y redondea al número entero.
2. **Contrahuella:** divide la altura entre plantas por ese número. No redondees: todas deben salir iguales.
3. **Huella:** H = 630 − 2C. Los 630 mm son la longitud media del paso humano (regla de Blondel).
4. **Tramo recto:** (número de peldaños − 1) × huella. Hay una huella menos, porque el último paso llega al suelo de arriba.
5. **Pendiente:** el ángulo cuya tangente es C / H.

| De suelo a suelo | Peldaños | Contrahuella | Huella | Tramo recto | Pendiente |
|---:|---:|---:|---:|---:|---:|
| 2,70 m | 15 | 180 mm | 270 mm | 3,78 m | 33,7° |
| 2,80 m | 16 | 175 mm | 280 mm | 4,20 m | 32,0° |
| 2,90 m | 17 | 171 mm | 289 mm | 4,62 m | 30,6° |
| 3,00 m | 17 | 176 mm | 277 mm | 4,43 m | 32,5° |
| 3,05 m | 17 | 179 mm | 271 mm | 4,34 m | 33,5° |

El número de peldaños es el número de contrahuellas.

## Medidas de una escalera de vivienda en España

Las fija el Código Técnico de la Edificación (CTE), de obligado cumplimiento. Dentro de una vivienda la escalera es de uso restringido y debe tener:

- **Contrahuella** de 20 cm como máximo y **huella** de 22 cm como mínimo.
- **Ancho del tramo** de al menos 80 cm. En Cataluña, en vivienda nueva, 90 cm.
- **Barandilla** de al menos 90 cm en los lados abiertos, sin huecos por los que pase una esfera de 10 cm y sin barras horizontales que los niños puedan escalar.
- **Altura libre de paso** de al menos 2,10 m.
- **En tramos curvos**, la huella se mide en el eje si la escalera tiene menos de 1 m de ancho, y a 50 cm del lado estrecho si es más ancha. En el lado estrecho debe medir al menos 5 cm y en el ancho, como máximo, 44 cm.

Son mínimos, no medidas cómodas. Las escaleras comunes de un edificio piden huella de 28 cm, contrahuella de 13 a 17,5 cm (18,5 cm si hay ascensor) y 2C + H entre 54 y 70 cm; acercarte a esos valores hace la tuya más cómoda. Las medidas definitivas las confirma tu arquitecto.

## ¿Cabe la escalera en tu casa?

La escalera recta para 2,90 m ocupa unos 4,6 m de largo, más el espacio libre al arrancar y al llegar. Más corta es la escalera en L o en U con descansillo. Mejor acortar con un giro que con peldaños más altos.

::obrazek /img/clanky/vypocet-schodiste/schodiste-v-hale-3d.webp | Vista 3D desde arriba de la planta baja sin la planta superior ni la cubierta: una escalera recta sube en el recibidor junto a un muro de carga interior, al lado de la entrada desde la calle y de las puertas del aseo, del despacho y del salón. | Escalera recta para 2,90 m en el recibidor: 17 peldaños de 171 mm y tramo de 4,62 m. Delante del primer peldaño quedan 1,25 m y las ventanas quedan fuera de la escalera, editor TupTuDu | 1200 | 700

Menos sitio ocupan los peldaños compensados, que giran sin descansillo: en L para 2,90 m, unos 2,84 × 2,84 m; con descansillo, 3,02 × 3,31 m. En España, los peldaños que se juntan en un punto de la esquina solo se admiten como meseta partida en dos peldaños a 45°; por eso la calculadora parte de «Compensados en los tramos». En una escalera de caracol, la huella no puede pasar de 44 cm en el borde exterior ni bajar de 5 cm junto al núcleo: con 2 m de diámetro salen unos 15 peldaños por vuelta y un núcleo o hueco central de unos 24 cm. La calculadora no comprueba estos límites ni el punto de medición del CTE en los tramos curvos.

Sobre la escalera, el forjado necesita un hueco lo bastante largo para esa altura libre, y a menudo decide dónde cabe la escalera. Las medidas del pasillo y los dormitorios están en [medidas mínimas de una habitación](clanek:medidas-minimas-habitacion).

## Calcular escaleras sobre el plano de tu casa

En el [editor de TupTuDu](aplikace:) dibujas en tu plano todas las formas de la calculadora. Calcula los peldaños a partir de la altura entre plantas igual que la calculadora, abre el hueco en el forjado de arriba y en 3D ves adónde llega la escalera. Puedes cambiar a mano la contrahuella y la huella y acortar el hueco del forjado: el editor te muestra entonces la altura libre de paso. Cómo empezar la casa lo cuenta el artículo [cómo hacer un plano de una casa](clanek:como-hacer-plano-casa).

::vyzva Prueba la escalera en tu casa | Añade una planta, vuelve a la planta baja, elige la herramienta Escalera y haz clic en el arranque y luego en la dirección de subida. Verás los peldaños, el hueco en el forjado y el 3D. El plan Gratis tiene 30 cambios al día y un proyecto.
