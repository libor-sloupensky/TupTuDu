---
titulek: Excavation calculator: soil left over from your foundations
klicove_slovo: excavation calculator
popis: Work out how much soil is left over after digging your foundations and how many lorry loads it takes to remove it, with and without a basement.
perex: For a 12 × 10 m house on strip footings on flat ground, about 60 m³ of soil is dug out. If compacted subsoil can go under the floor, around 21 m³ goes back and nearly 40 m³ is left over, 30 m³ of it topsoil. With the topsoil kept in the garden, one or two lorry loads go away; with hardcore under the floor, usual in England, two to four. With a basement, almost 400 m³ is left. The excavation calculator below works it out for your house.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
obrazek: /img/clanky/kolik-zeminy-z-vykopu/vykop-svah.jpg
souvisejici: soil-bulking-factor, how-to-draw-a-floor-plan
klic: kolik-zeminy-z-vykopu
- TupTuDu, soil calculator: public/js/kalkulacka-zemina.js, defaults 12 × 10 m, floor 30 cm above ground, build-up 45 cm, topsoil 25 cm, working space 80 cm, footings 1 m deep and 0.5 m wide, bulking 1.25; example = dug 59.6 m³, back 21.3 m³, left 38.3 m³ (topsoil 30, subsoil 8.25), loose 47.8 m³; hardcore under the house: subsoil left 20.25 m³ (25.3 m³ loose, about 36 t) plus 12 m³ of stone; basement 3.05 m: dug 651.6 m³, subsoil left 367.5 m³ (459 m³ loose, about 660 t), heap 814 m³ | interní
- Approved Document A (England), 2E4: strip foundations at least 0.45 m deep against frost, shrinkable clay 0.75 / 0.9 / 1.0 m, deeper near trees | https://assets.publishing.service.gov.uk/media/5a80437640f0b623026927b2/BR_PDF_AD_A_2013.pdf
- Approved Document C (England), 4.6 to 4.7: ground supported floor of dense concrete laid on a hardcore bed | https://assets.publishing.service.gov.uk/media/5a8192a0e5274a2e8ab54b5f/BR_PDF_AD_C_2013.pdf
- ESTAV.cz: Podkladní betonová deska a její podsyp (Czech practice: excavated soil as fill under the slab, clays not, gravel as a replacement) | https://www.estav.cz/cz/8774.zaklady-pro-rodinny-dum-podkladni-betonova-deska-a-jeji-podsyp-3
- ČESKÉSTAVBY.cz: Jak se staví základy domu (strip footings filled with concrete, fill under the slab) | https://www.ceskestavby.cz/clanky/jak-se-stavi-zaklady-domu-25506.html
- FAST VUT: Zemní práce (topsoil heaps at most 1.5 m high, 1.2 m recommended) | https://www.fce.vutbr.cz/tst/x_txt_predmet_bw51_1_zemni-prace.pdf
- Portland Skips, tipper hire FAQ: 8-wheel tipper payload about 18 to 20 tonnes | https://portlandskips.co.uk/tipper-hire-faqs
- Mainland Aggregates, grab hire: a grab lorry removes up to 16 tonnes, approx. 10 m³, in one load | https://www.mainlandaggregates.co.uk/grab-hire.html
- Kolik materiálu: Kolik stojí odvoz zeminy (a Czech lorry takes about 7 to 8 m³ of loose soil) | https://kolikmaterialu.cz/kolik-stoji-odvoz-zeminy/
- ESTAV.cz: Jak si postavit rodinný dům, zemní práce (Czech self-build: strip footings, topsoil kept on the plot, trenches almost half wider after rain, 9 lorry loads sent away) | https://www.estav.cz/cz/548.jak-si-postavit-rodinny-dum-zemni-prace
- GOV.UK: Decide if a material is waste or not (excavated soil used elsewhere is likely waste, CL:AIRE code as the non-waste route) | https://www.gov.uk/government/publications/legal-definition-of-waste-guidance/decide-if-a-material-is-waste-or-not
- GOV.UK: Waste duty of care code of practice (waste only to authorised businesses, transfer documentation) | https://www.gov.uk/government/publications/waste-duty-of-care-code-of-practice
- Dům a zahrada: Svažitý pozemek (stepped footings on a slope) | https://www.dumazahrada.cz/stavba/svazity-pozemek-jak-cist-svah-orientace-odvodneni-zaklady/
- TupTuDu, editor: výpočet zeminy, jakmile je vybraný pozemek na mapě (ve všech zemích, katastr v CZ, SK, PL, FR, ES, IT a DE mimo Bavorsko, jinde obkreslení); výšky terénu z modelu 1 m v CZ, SK, PL, FR, AT a v 6 spolkových zemích DE (BY, NW, HE, BB, BE, MV), jinde rovina; výchozí hodnoty z české praxe pro všechny země: spára 1,0 m, svah 1 : 0,5, odkop 0,8 m, skladba 45 cm (u desky 70 cm), ornice 25 cm, nakypření 1,25, pod dům výkopek (public/js/koncept-v3/zemina.js, VYCHOZI), stejné jako výchozí hodnoty kalkulačky (config/pozemky.php, modules/lokalizace.md, stav 12. 11. 2026) | interní
---
::kalkulacka-zeminy

## Why length × width × depth is not enough

That formula gives the soil dug out, not what goes back and what has to leave the site.

## Excavation calculator example: where the surplus comes from

::rez-vykopu

Example: a 12 × 10 m house with one internal load-bearing wall, the floor 30 cm above ground, 45 cm from the floor to the bottom of the sub-base, 25 cm of topsoil, an 80 cm working space around the house and footings 1 m deep. These are the calculator's and the editor's defaults, common practice in Czechia, where TupTuDu comes from; you change them in the editor's Foundations panel.

- **Topsoil:** about 39 m³ is stripped. 9 m³ goes back around the house, none under it, so 30 m³ is left, roughly the house area × the topsoil depth.
- **Footing trenches:** about 54 m of footings × 0.5 m × 0.75 m = 20 m³ of subsoil, the soil below the topsoil. Concrete fills the trench, so all of it is left over. The depth depends on frost and soil: in England at least 0.45 m, in shrinkable clay 0.75 to 1 m, more near trees.
- **Fill under the house:** the sub-base starts 15 cm below ground and the topsoil went 25 cm deep, so 10 cm, or 12 m³, must be filled. With compacted subsoil, 8 m³ of it is left. In England a ground-bearing floor normally sits on a hardcore bed, so plan on all 20 m³ of subsoil. The design decides.

## With a basement, about ten times more

| 12 × 10 m house on flat ground | Dug out | Topsoil left | Subsoil left | Largest heap |
|:---|---:|---:|---:|---:|
| Strip footings, compacted subsoil under the house | 60 | 30 | 8 | 74 |
| Strip footings, hardcore under the house | 60 | 30 | 20 | 74 |
| Full basement, storey height 3.05 m, strip footings | 652 | 30 | 368 | 814 |

The figures are rounded, in m³ of soil as it lies in the ground (bank volume). The heap is loose.

::rez-sklepu

The largest heap is bigger than the surplus: it is loose and still holds soil that goes back later. Keep topsoil in a separate heap up to about 1.5 m high. At that height the heaps here take about 80 to 100 m² including their slopes.

## Muck away: how many lorry loads

On a lorry, soil takes about a quarter more space than in the ground. A lorry takes roughly 7 to 14 m³ of loose soil, and the weight limit often runs out first: a UK eight-wheel tipper carries about 20 tonnes, roughly 11 m³ from the ground, a grab lorry 16 tonnes, about 10 m³. The 38 m³ from the example is about 48 m³ loose, so 4 to 7 loads. If the topsoil stays in the garden, only about 10 m³ of loose subsoil goes, one or two loads; with hardcore under the floor, two to four. With a basement and the topsoil kept, about 35 to 65 loads. For tonnes, see the [soil bulking factor](clanek:soil-bulking-factor).

That is the ideal case, so allow a margin: trenches end up wider, some soil is unsuitable for backfill and space on the plot runs out. One self-builder in Czechia sent away 9 loads although the topsoil stayed: rain had widened his trenches by almost half.

::vyzva Get the numbers for your house | Draw the real floor plan with external and load-bearing walls and take its dimensions into the calculator. Add your plot on the map and the editor works out the excavation itself. The free plan has 30 edits a day and one project.

## On a slope it works out differently

The calculator assumes flat ground. On a slope, footings are stepped and the foundation is taller downhill. The volume depends most on how high you set the house. The editor knows the real terrain in Czechia, Slovakia, Poland, France, Austria and six German states. Elsewhere it treats the ground as level, so on a slope it gives, like the calculator, only a flat-ground estimate.

::obrazek /img/clanky/kolik-zeminy-z-vykopu/zaklad-svah.webp | 3D view of a single-storey house on a slope with windows on all sides and the entrance uphill; the grey foundation is taller on the downhill side | A house on a gentle slope: the foundation (grey for clarity) runs from the ground up to the floor and is taller downhill. TupTuDu editor on a plot in Czechia with its terrain loaded | 1200 | 700

## Where the soil goes

Put the topsoil back on the garden and use suitable subsoil for landscaping; bigger changes of level belong in the design. Soil that leaves the site is usually waste, in England for example, so hire a registered waste carrier and keep the paperwork showing where it went.

Not included: drains, soakaways, septic and rainwater tanks, the drive, terrace and paths. Topsoil is counted only in the 80 cm working space around the house, and all of it goes back there.
