---
titulek: Auflockerungsfaktor: Wie viel mehr Erde auf dem Lkw landet
klicove_slovo: Auflockerungsfaktor
popis: Wie viel mehr Platz Erde nach dem Ausheben braucht: Auflockerungsfaktoren für übliche Böden und die Umrechnung auf Kubikmeter zum Abfahren und auf Tonnen.
perex: Der Auflockerungsfaktor sagt, um wie viel mehr Platz Erde nach dem Ausheben braucht. Bei gewöhnlichem Lehmboden liegt er bei etwa 1,25, also rund ein Viertel mehr, bei gelöstem Fels bei bis zu 1,6. Aus 10 m³ Aushub in Lehm werden so etwa 12,5 m³ auf der Ladefläche.
publikovano: 2026-11-11
overeno: 2026-11-11
autor: Libor z TupTuDu
revize: 2026-11-12
stav: zverejneno
souvisejici: erdaushub-berechnen, grundriss-zeichnen
klic: koeficient-nakypreni-zeminy
zeme: DE, AT
- Deutschland-Rechner: Erdaushub-Rechner (Auflockerung Sand und Kies 1,15, Mutterboden 1,20, Lehm und Ton 1,30, Fels 1,50, im Text 15 bis 60 % je nach Bodenart; Dichte fest Lehm und Ton etwa 1,9 t/m³, Sand und Kies etwa 1,5 t/m³) | https://www.deutschland-rechner.de/erdaushub-rechner
- Rechner-Portal: Erdaushub-Rechner nach Krause/Ulke, Zahlentafeln für den Baubetrieb, mittlere Richtwerte je Bodenklasse der ATV DIN 18300:2012 (Sand und Kies mitteldicht 1,14, dicht 1,23; Lehm mitteldicht 1,19, dicht 1,25; Lehm dicht etwa 1,84 t/m³) | https://rechner-portal.de/bau-handwerk/beton-mauerwerk/erdaushub-rechner
- Bauprofessor: Auflockerungsfaktor (Definition nach dem Lösen, Beispiel Lehm fS = 1,3; Mutterboden 2000 m³ ergeben 2400 m³ Miete) | https://www.bauprofessor.de/auflockerungsfaktor/
- fertighaus.de: Erdaushub entsorgen (Deponie nach Tonnen, Wertstoffhöfe nach Kubikmetern) | https://www.fertighaus.de/ratgeber/hausbau/erdaushub-entsorgung-und-kosten/
- TupTuDu, Rechner für den Erdaushub: public/js/kalkulacka-zemina.js (Auflockerung 1,25 als Vorgabe) | interní
- TupTuDu, editor: zemina (rostlý a nakypřený objem) v panelu Fundament, jakmile je vybraný pozemek na mapě, v DE z katastru mimo Bavorsko, v AT a Bavorsku obkreslení; výchozí hodnoty z české praxe pro všechny země: spára 1,0 m, svah 1 : 0,5, odkop 0,8 m, skladba 45 cm (u desky 70 cm), ornice 25 cm, nakypření 1,25, pod dům výkopek (public/js/koncept-v3/zemina.js, VYCHOZI) (config/pozemky.php, modules/lokalizace.md, stav 12. 11. 2026) | interní
---
::nakypreni

## Auflockerungsfaktor für übliche Böden

| Bodenart | Auflockerungsfaktor |
|:---|---:|
| Sand und Kies | 1,10 bis 1,20 |
| Mutterboden | 1,20 |
| Lehm und Ton | 1,20 bis 1,30 |
| Gelöster Fels | 1,40 bis 1,60 |

Das Volumen im Boden mal Faktor ergibt das Volumen auf dem Haufen oder auf dem Lkw. Die Werte sind Richtwerte und gelten direkt nach dem Ausheben. Wie stark sich ein Boden auflockert, hängt vor allem von der Bodenart ab, vom Wassergehalt und davon, wie dicht er gelagert war.

## Fest und lose: warum es zwei Zahlen gibt

**Festes Volumen** ist das, was im Boden lag. Danach rechnest du, wie viel ausgehoben wird und wie viel als Verfüllung zurückkommt, die lagenweise verdichtet wird.

**Loses Volumen** ist das, was auf dem Haufen und auf dem Lkw liegt. Danach planst du den Platz auf dem Grundstück und die [Abfuhr des Erdaushubs](clanek:erdaushub-berechnen). In Angeboten für Erdarbeiten steht der Aushub oft in m³ fest, Fuhrunternehmen rechnen nach Fuhren oder Stunden, Deponien oft nach Tonnen. Frag deshalb immer, welche Kubikmeter gemeint sind.

## Wie viel der Aushub wiegt

Im Boden wiegt Erde etwa 1,5 bis 2,0 t pro m³, Lehm um 1,8 t, nasser Boden mehr. Beim Auflockern ändert sich das Volumen, das Gewicht bleibt gleich. Aus 10 m³ Aushub in Lehm werden so 12,5 m³ auf dem Lkw mit etwa 18 t. Bei der Bestellung zählt, was zuerst voll ist: die Mulde oder die zulässige Nutzlast.

## Was bei deinem Haus übrig bleibt

Wie viel bei deinem Haus anfällt, hängt von Grundfläche, Fundament und Keller ab. Zeichnest du den [Grundriss in TupTuDu](aplikace:), hast du die genauen Außenmaße und die Länge der tragenden Wände für den [Rechner für den Erdaushub](clanek:erdaushub-berechnen). Wählst du im Editor dazu dein Grundstück auf der Karte, rechnet er die Erdmengen selbst, fest und aufgelockert. Er startet mit Werten aus der tschechischen Praxis, etwa Gründungstiefe 1,0 m und Böschung 1 : 0,5, deine Werte stellst du im Bereich Fundament ein.

::vyzva Erst der Grundriss, dann der Aushub | Zeichne dein Haus in echten Maßen und sieh es dir in 3D an. Mit den Außenmaßen rechnest du im Erdaushub-Rechner aus, was übrig bleibt. Die Gratis-Version hat 30 Änderungen pro Tag und ein Projekt.
