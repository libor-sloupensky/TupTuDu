---
titulek: Peso specifico della terra e coefficiente di rigonfiamento
klicove_slovo: peso specifico terra
popis: Quanto pesa un metro cubo di terra e quanto aumenta di volume una volta scavata: coefficienti per i terreni comuni, metri cubi sul camion e tonnellate.
perex: Il peso specifico della terra è di circa 1,8 t per metro cubo di terreno in sito, cioè circa 18 kN/m³. Scavata, la terra aumenta di volume: il coefficiente di rigonfiamento della terra comune è circa 1,25, quindi 10 m³ di scavo diventano circa 12,5 m³ sul camion. Il peso resta lo stesso, circa 18 t.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
souvisejici: scavo-fondazioni, disegnare-planimetria-casa
klic: koeficient-nakypreni-zeminy
zeme: IT
- edilizia.com: scavo di sbancamento (il terreno smosso occupa più spazio di quello in posto, coefficiente 25 % come esempio non universale, densità del materiale sciolto 1,55 t/m³ come ipotesi, impianti spesso a tonnellata) | https://www.edilizia.com/?p=92625
- Prezzario DEI urbanizzazione 2023, avvertenze (scavi misurati in sito senza aumento di volume, trasporti sul volume prima dello scavo senza l'aumento oppure a peso) | https://www.build.it/upload/libri/430/DEI_PrezzarioUrbanizzazioneInfAmb_IIsem2023_Avvertenze.pdf
- RTS, HSV 800-1 Zemní práce (rigonfiamento e massa volumica per classi di terreno; fisica valida ovunque) | https://www.cenovasoustava.cz/files/HSV_800-1.pdf
- Technický dozor Brno: zemina z výkopu (coefficienti di rigonfiamento) | https://dozor-brno.cz/poradna-vykopova-zemina.html
- FAST VUT: Zemní práce (rigonfiamento, terreno vegetale 20 %) | https://www.fce.vutbr.cz/tst/x_txt_predmet_bw51_1_zemni-prace.pdf
- Codice della strada, art. 62 (massa limite degli autoveicoli isolati a tre assi 25 t) | https://www.brocardi.it/codice-della-strada/titolo-iii/capo-i/art62.html
- Autocarro ribaltabile a tre assi in vendita: massa complessiva 26.000 kg, portata utile 14.170 kg (esempio di mezzo) | https://www.machineseeker.it/iveco-stralis+420+ribaltabile+3+latoi+euro6/i-18013266
- TupTuDu, editor: rostlý a nakypřený objem v panelu Fondazioni, jakmile je vybraný pozemek na mapě, v IT katastr Agenzia Entrate (provincie Trento a Bolzano bez katastru, obkreslení), výšky terénu v IT nejsou, terén je rovina; výchozí hodnoty z české praxe pro všechny země: spára 1,0 m, svah 1 : 0,5, odkop 0,8 m, skladba 45 cm (u desky 70 cm), ornice 25 cm, nakypření 1,25, pod dům výkopek (public/js/koncept-v3/zemina.js, VYCHOZI) (config/pozemky.php, modules/lokalizace.md, stav 12. 11. 2026) | interní
---
::nakypreni

## Coefficiente di rigonfiamento dei terreni più comuni

| Terreno | Coefficiente di rigonfiamento |
|:---|---:|
| Sabbia e ghiaia | 1,15 |
| Terreno vegetale | 1,20 |
| Terra comune | 1,25 |
| Argilla | 1,30 |
| Roccia disgregata | 1,45 |

Moltiplica il volume in sito per il coefficiente e hai il volume sul cumulo o sul camion. I valori sono orientativi e valgono subito dopo lo scavo. Il rigonfiamento reale dipende soprattutto dal tipo di terreno e da quanto era compatto.

## Perché si usano due volumi

Il **volume in sito**, detto anche in banco o in posto, è quello che stava nel terreno. Serve per calcolare quanta terra scavi e quanta torna nel rinterro, che si compatta a strati.

Il **volume smosso** è quello del cumulo e del cassone. Ti serve per lo spazio in cantiere e per il [trasporto della terra di scavo](clanek:scavo-fondazioni). In Italia nei computi lo scavo si misura in sito e anche il trasporto si conta spesso sul volume prima dello scavo, oppure a peso. L'impianto che riceve la terra di solito la fa pagare a tonnellata. Chiedi sempre di quali metri cubi si parla.

## Peso specifico della terra: quanto pesa un metro cubo

Un metro cubo di terra in sito pesa più o meno da 1,5 a 1,9 t, la terra comune circa 1,8 t, quella bagnata anche di più. Con il rigonfiamento cambia il volume, il peso resta lo stesso: un metro cubo smosso di terra comune pesa circa 1,45 t, cioè 1,8 diviso 1,25. Da 10 m³ di scavo vengono così 12,5 m³ sul camion e circa 18 t.

Quando ordini il camion conta quello che si riempie prima, il cassone o la portata. In Italia un camion a tre assi può pesare a pieno carico 25 t e porta circa 14 t, cioè circa 8 m³ di terra comune misurata in sito.

## Quanta terra porterai via tu

Quanta terra scavi per la tua casa e quanta ne resta lo calcola il [calcolatore dello scavo delle fondazioni](clanek:scavo-fondazioni), con il coefficiente che scegli tu. Lo stesso conto lo fa l'editor TupTuDu sulla tua casa: [disegnala](aplikace:), scegli il lotto sulla mappa e nel pannello Fondazioni vedi il volume in sito e quello smosso. Parte da valori della pratica ceca, per esempio 45 cm dal pavimento al fondo del magrone invece dei circa 60 cm con il vespaio, e li cambi nello stesso pannello. In Italia l'editor non ha le quote del terreno e considera il lotto in piano.

::vyzva Disegna la tua casa | Disegna la pianta nelle misure reali, aggiungi i piani e guarda la casa in 3D. Le misure esterne e quelle dei muri portanti ti servono nel calcolatore dello scavo. La versione Gratis ha 30 modifiche al giorno e un progetto.
