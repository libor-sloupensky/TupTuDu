---
titulek: Calcolo scale: alzata, pedata e formula con calcolatore
klicove_slovo: calcolo scale
popis: Calcolatore per scale dritte, a L e a U con pianerottolo o a ventaglio e a chiocciola: numero di alzate, pedata secondo la norma italiana e disegno in scala.
perex: Il calcolo delle scale parte dall'altezza tra il pavimento di sotto e quello di sopra. Dividila per circa 17,5 cm e arrotonda al numero intero di alzate, poi ricavi la pedata dalla formula 2a + p = 63 cm. In Italia una scala interna di casa deve avere pedata di almeno 25 cm e rampa larga almeno 80 cm. Per 3,00 m vengono 17 alzate da 176 mm, pedata di 277 mm e una rampa dritta lunga circa 4,4 m.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
obrazek: /img/clanky/vypocet-schodiste/vypocet-schodiste.jpg
souvisejici: disegnare-planimetria-casa, dimensioni-minime-camera-da-letto
klic: vypocet-schodiste
zeme: IT
- DM 14 giugno 1989 n. 236, punto 8.1.10 (scale che non sono parte comune né di uso pubblico: larghezza minima 0,80 m, pedata minima 25 cm, 2a + p tra 62 e 64 cm, parapetto alto almeno 1 m; scale comuni 1,20 m e pedata 30 cm), punto 4.1.10 (stessa alzata e pedata in ogni rampa), art. 1 (edifici privati di nuova costruzione e ristrutturazioni) | https://www.bosettiegatti.eu/info/norme/statali/1989_0236.htm
- DM 5 luglio 1975, art. 1 (altezza minima dei locali abitabili 2,70 m) | https://www.edilizia.com/leggi-normative/decreto-ministeriale-sanita-del-5-luglio-1975/
- edilizia.com: calcolo delle scale (alzata di circa 16–18 cm come valore di progetto preliminare, DM 236/1989, altezza libera da verificare lungo la linea di salita) | https://www.edilizia.com/?p=96643
- Università di Trieste, B. Chiarelli, Muoversi negli edifici (pianerottoli tra successioni di 3 e al massimo 15 gradini, passaggio sotto la rampa superiore a 210 cm, testo del DM 236/1989) | https://moodle2.units.it/pluginfile.php/821962/mod_resource/content/1/38_Muoversi%20negli%20edifici.pdf
- Università di Trieste, I sistemi di collegamento verticale (pendenza 23–35° normale, linea di salita a 40–50 cm dal corrimano, 2a + p = 62–64 cm) | https://moodle2.units.it/pluginfile.php/768106/mod_resource/content/1/L11%20_%20Muoversi%20negli%20edifici_sistemi%20di%20collegamento%20verticale.pdf
- TupTuDu, calcolatore: public/js/kalkulacka-schodiste.js con i parametri dell'articolo per l'Italia (naslapMin 250, sirkaMin 80, krok 620–640, alzata 160–180, rameno 15, zakrivMin 0, podchod 2100); tabella e forme calcolate 11. 11. 2026 | interní
- TupTuDu, editor: public/js/koncept-v3/dum.js, schodyGeo (n = round(H / 0,175), p = 630 − 2a; NASLAP_MIN_ZEME solo per CZ, in Italia nessun gradino aggiunto, per le altezze usuali risultato uguale al calcolatore) | interní
---
::kalkulacka-schodiste vyska=300 | sirkaMin=80 | vyskaMin=160 | vyskaMax=180 | krokMin=620 | krokMax=640 | naslapMin=250 | zakrivMin=0 | podchod=2100 | rameno=15

Inserisci l'altezza da pavimento finito a pavimento finito, non l'altezza della stanza. In Italia, con locali alti 2,70 m, di solito sono circa 3 m.

## Formula per il calcolo delle scale

1. **Alzate:** dividi l'altezza tra i pavimenti per 175 mm e arrotonda al numero intero.
2. **Alzata:** dividi l'altezza per il numero di alzate, senza arrotondare: i gradini devono essere tutti uguali e l'ultimo deve arrivare esatto al pavimento.
3. **Pedata:** p = 630 − 2a, in millimetri. 630 mm è la lunghezza media del passo. In Italia per una scala di casa deve venire almeno 250 mm, altrimenti aggiungi un'alzata.
4. **Rampa dritta:** (alzate − 1) × pedata. L'ultimo passo arriva sul pavimento del piano, quindi le pedate sono una in meno.
5. **Pendenza:** l'angolo la cui tangente è a / p.

| Da pavimento a pavimento | Alzate | Alzata | Pedata | Rampa dritta | Pendenza |
|---:|---:|---:|---:|---:|---:|
| 2,80 m | 16 | 175 mm | 280 mm | 4,20 m | 32,0° |
| 2,90 m | 17 | 171 mm | 289 mm | 4,62 m | 30,6° |
| 3,00 m | 17 | 176 mm | 277 mm | 4,43 m | 32,5° |
| 3,05 m | 17 | 179 mm | 271 mm | 4,34 m | 33,5° |
| 3,10 m | 18 | 172 mm | 286 mm | 4,85 m | 31,1° |
| 3,20 m | 18 | 178 mm | 274 mm | 4,67 m | 32,9° |

## Alzata e pedata: cosa chiede la norma in Italia

Per gli edifici nuovi le misure delle scale le dà il DM 236/1989 sulle barriere architettoniche. Per una scala interna di casa chiede rampa larga almeno 80 cm, pedata di almeno 25 cm, 2a + p tra 62 e 64 cm, gradini uguali in ogni rampa e parapetto alto almeno 1 m. Il regolamento edilizio del Comune può chiedere di più. Nella pratica si usa:

- **Alzata** intorno a 16–18 cm. Sopra i 19 cm la pedata scende sotto i 25.
- **Pendenza** comoda fino a circa 35°.
- **Altezza libera** sopra i gradini di almeno 2,10 m.
- **Pianerottolo** almeno ogni 15 gradini secondo i manuali. In casa non è un obbligo, ma una rampa dritta da 17 alzate stanca e il calcolatore la segnala.

Le misure definitive le conferma il progettista.

## La scala ci sta in casa?

La scala dritta per 3,00 m occupa circa 4,4 m, più lo spazio libero prima del primo gradino e dopo l'ultimo. Più corta è la scala a L o a U: il pianerottolo prende il posto di una pedata e i gradini si dividono in due rampe. Accorcia la scala con una svolta, non con alzate più alte.

::obrazek /img/clanky/vypocet-schodiste/schodiste-v-hale-3d.webp | Vista 3D dall'alto del piano terra senza piano superiore e senza tetto: la scala dritta sale nell'ingresso lungo un muro portante interno, accanto alla porta d'ingresso e alle porte del bagno, dello studio e del soggiorno. | Scala dritta per 2,90 m nell'ingresso: 17 alzate da 171 mm, rampa di 4,62 m. Davanti al primo gradino restano 1,25 m e le finestre sono lontane dalla scala, editor TupTuDu | 1200 | 700

I gradini a ventaglio girano senza pianerottolo e occupano ancora meno: a L per 3,00 m circa 2,75 × 2,75 m con rampa larga 1 m, con pianerottolo 2,94 × 3,22 m. Anche la chiocciola vuole la rampa da 80 cm, cioè un diametro di almeno 1,8 m, meglio 2 m: con 1,8 m sotto il giro superiore restano 1,95 m, con 2 m 2,35 m.

Al piano di sopra serve un foro nel solaio che lasci l'altezza libera: spesso decide dove la scala ci sta. Le misure di corridoi e camere le trovi nelle [dimensioni minime della camera da letto](clanek:dimensioni-minime-camera-da-letto).

## Calcolo delle scale direttamente in pianta

Nell'[editor TupTuDu](aplikace:) disegni nella tua pianta tutte le forme del calcolatore. I gradini li calcola dall'altezza tra i piani allo stesso modo, al piano di sopra taglia il foro nel solaio e in 3D vedi dove porta la scala. Se cambi a mano alzata e pedata o accorci il foro, ti mostra l'altezza libera. Come iniziare lo spiega la guida per [disegnare la planimetria di casa](clanek:disegnare-planimetria-casa).

::vyzva Prova la scala nella tua casa | Aggiungi un piano, torna al piano terra, scegli lo strumento Scala e clicca sull'inizio e poi nella direzione di salita. Vedrai i gradini, il foro al piano di sopra e la scala in 3D. La versione Gratis ha 30 modifiche al giorno e un progetto.
