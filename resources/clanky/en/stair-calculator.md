---
titulek: Stair calculator: rise, going and the 2R + G formula
klicove_slovo: stair calculator
popis: Work out the number of steps, the rise and the going from your floor-to-floor height. Straight, L and U-shaped, winder and spiral stairs, drawn to scale.
perex: To calculate stairs, start with the height from floor to floor. Divide it by about 175 mm, round to a whole number of risers and get the going from 2R + G = 630 mm. For 2.90 m that gives 17 risers of 171 mm, a going of 289 mm and a straight flight about 4.6 m long. The stair calculator below works it out and draws it to scale.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
obrazek: /img/clanky/vypocet-schodiste/vypocet-schodiste.jpg
souvisejici: how-to-draw-a-floor-plan, minimum-bedroom-size
klic: vypocet-schodiste
- Approved Document K (England), 2013 edition: Table 1.1 private stair rise 150 to 220 mm, going 220 to 300 mm, maximum pitch 42°, 2R + G 550 to 700 mm; para 1.11 headroom 2 m (loft conversions 1.9 m); width set only for buildings other than dwellings; para 1.17 change of direction after 36 risers; para 1.25 to 1.27 and Diagram 1.9 tapered treads measured at the centre of the tread below 1 m width, 270 mm from each side from 1 m, at least 50 mm at the narrow end, going not shorter than the straight treads; para 1.28 spiral stairs to BS 5395-2 | https://assets.publishing.service.gov.uk/media/60d5bdcde90e07716f516cfd/Approved_Document_K.pdf
- International Residential Code 2021 as reproduced in the Viewrail visual guide: R311.7.1 width at least 36 in (914 mm), R311.7.2 headroom 6 ft 8 in (2032 mm), R311.7.5.1 riser at most 7¾ in (196 mm), R311.7.5.2 tread at least 10 in (254 mm), R311.7.10.1 spiral stairs clear width at least 26 in (660 mm), walkline radius at most 24½ in, tread 6¾ in at the walkline, rise at most 9½ in, headroom 6 ft 6 in | https://assets.viewrail.com/image/upload/v1790277282/2021%20residential%20code%20visualizer.pdf
- Viewrail: Tread depth and risers (IRC riser 7¾ in, tread 10 in) | https://resources.viewrail.com/code-compliance/stair-code/tread-depth-and-risers
- FAST VUT, S10 Návrh schodiště (height from floor to floor, n = H / h′ rounded, rise not rounded, b = 630 − 2h, L = (n − 1) × b) | https://www.fce.vutbr.cz/PST/bstud/BH02_2015/S10_navrh_schodiste.pdf
- TZB-info: Výpočet schodiště, nápověda (stride 600 to 650 mm, 630 mm standard, rise 150 to 190 mm, pitch 25 to 35°) | https://www.tzb-info.cz/docu/tabulky/0001/000146_help.html
- ESTAV.cz: Schodiště a jeho základní rozměry (comfortable rise up to 180 mm, pitch 25 to 35°, flight width 900 mm, 16 to 18 risers in a flight) | https://www.estav.cz/cz/2581.schodiste-a-jeho-zakladni-rozmery
- TupTuDu, calculator: public/js/kalkulacka-schodiste.js with England limits (vyskaMax 220, krokMin 550, krokMax 700, naslapMin 220, zakrivMin 220, podchod 2000; width 90 cm and 18 risers kept as a guide; pitch and the 300 mm maximum going are not checked; winders measured on the walking line 40 cm from the outer edge); 2.60 m = 15 × 173 mm, 283 mm, 3.97 m, 31.5°; 2.80 m = 16 × 175, 280, 4.20 m, 32.0°; 2.90 m = 17 × 171, 289, 4.62 m, 30.6°; 3.05 m = 17 × 179, 271, 4.34 m, 33.5°; 3.10 m = 18 × 172, 286, 4.85 m, 31.1°; L with winders 2.84 × 2.84 m (radiating winders: about 130 to 140 mm going 270 to 300 mm from the inner edge), L with a landing 3.02 × 3.31 m; spiral 2 m: flight 0.94 m, headroom 2.18 m, 1.8 m: 0.84 m and 1.81 m | interní
- TupTuDu, editor: public/js/koncept-v3/dum.js (n = round(H / 0.175), b = 630 − 2h limited to 220 to 320 mm, no added riser outside Czechia, opening in the floor above, headroom shown, metric units only) | interní
---
::kalkulacka-schodiste vyskaMax=220 | krokMin=550 | krokMax=700 | naslapMin=220 | zakrivMin=220 | podchod=2000

The calculator handles straight stairs, L and U-shaped stairs with landings or winders, and spiral stairs. Enter the height from finished floor to finished floor, not the ceiling height, which is lower by the floor structure. It checks rise, going and 2R + G against England's private-stair limits. Check the pitch yourself: England allows at most 42° and a going of at most 300 mm. For width and risers per flight, which England doesn't limit in a house, the calculator uses 90 cm and 18 risers as a guide.

## Stair calculator formula: how to calculate stairs

1. **Number of risers:** divide the floor-to-floor height by 175 mm and round to a whole number.
2. **Rise:** divide the height by that number. Don't round the result: all steps must be equal and the last one must land exactly on the floor.
3. **Going:** G = 630 − 2R. 630 mm is the length of an average stride. If the going comes out shorter than your rules allow, add a riser.
4. **Straight flight length:** (risers − 1) × going. There is one tread fewer than risers, the last step lands on the upper floor.
5. **Pitch:** the angle whose tangent is rise / going.

| Floor to floor | Risers | Rise | Going | Straight flight | Pitch |
|---:|---:|---:|---:|---:|---:|
| 2.60 m | 15 | 173 mm | 283 mm | 3.97 m | 31.5° |
| 2.80 m | 16 | 175 mm | 280 mm | 4.20 m | 32.0° |
| 2.90 m | 17 | 171 mm | 289 mm | 4.62 m | 30.6° |
| 3.05 m | 17 | 179 mm | 271 mm | 4.34 m | 33.5° |
| 3.10 m | 18 | 172 mm | 286 mm | 4.85 m | 31.1° |

## Stair regulations: England and the US as examples

| | England, private stair | US, residential code |
|:---|:---|:---|
| Rise | 150 to 220 mm | at most 196 mm (7¾ in) |
| Going | 220 to 300 mm | at least 254 mm (10 in) |
| 2R + G | 550 to 700 mm | not set |
| Pitch | at most 42° | follows from rise and going |
| Width | not set for a house | at least 914 mm (36 in) |
| Headroom | 2 m | 2.03 m (6 ft 8 in) |

England's rules are in Approved Document K, the American ones in the International Residential Code, which most states adopt with their own changes. Within the limits, a stair is most comfortable with a rise of about 150 to 180 mm, 2R + G close to 630 mm and a pitch of 25 to 35°. Your designer confirms the final dimensions.

## Will the stairs fit in your house

A straight stair for 2.90 m takes about 4.6 m of length, plus free space before the first and after the last step. An L or U-shaped stair is shorter: a landing replaces one tread and the steps split into flights. Shorten stairs by turning them, not with higher steps.

::obrazek /img/clanky/vypocet-schodiste/schodiste-v-hale-3d.webp | 3D view from above into the ground floor without the upper floor and roof: a straight stair rises in the hall along an internal load-bearing wall, next to the front door and the doors to the toilet, the study and the living room. | A straight stair for 2.90 m in the hall: 17 risers of 171 mm, a 4.62 m flight. 1.25 m is left in front of the first step and the windows are clear of the stairs, TupTuDu editor | 1200 | 700

Winders turn without a landing and save even more: an L-shaped stair for 2.90 m needs about 2.84 × 2.84 m, with a landing 3.02 × 3.31 m. Countries measure winders differently, the calculator 40 cm from the outer edge. In England this compact layout doesn't pass: 270 mm from the narrow side the going comes out at only about 130 to 140 mm against a minimum of 220 mm, the narrow end needs at least 50 mm, and winders may not have a shorter going than the straight treads.

With the calculator's 90 cm guide width, a spiral main stair needs a diameter of about 2 m. The US code allows spiral stairs from 26 in (660 mm) clear width, typically about 1.5 m across; England refers them to BS 5395-2.

The upper floor needs an opening above the stairs long enough for the headroom. It often decides where the stairs fit and shapes the rooms upstairs. Room and hallway sizes are in [minimum bedroom size](clanek:minimum-bedroom-size).

## Stairs in your own floor plan

In the [TupTuDu editor](aplikace:) you draw every shape from the calculator into your floor plan. It works out the steps from the storey height like the calculator, cuts the opening in the floor above and shows in 3D where the stairs lead. You can change the rise and going by hand and shorten the opening, and the editor shows the headroom. The editor works in metric units. How to start is covered in [how to draw a floor plan](clanek:how-to-draw-a-floor-plan).

::vyzva Try stairs in your house | Add a storey, go back to the ground floor, choose the Stairs tool and click the start of the stairs and then in the direction of ascent. You'll see the steps, the opening upstairs and the 3D view. The free plan has 30 edits a day and one project.
