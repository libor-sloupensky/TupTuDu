---
titulek: Treppe berechnen: Stufenhöhe, Formel und Treppenrechner
klicove_slovo: Treppe berechnen
popis: Treppenrechner für gerade, gewendelte und Wendeltreppen: Steigung, Auftritt und Platzbedarf nach den Maßen, die in Deutschland und Österreich gelten.
perex: Eine Treppe berechnest du aus der Höhe von Fußboden zu Fußboden. Teile sie durch etwa 17,5 cm und runde auf eine ganze Zahl von Steigungen, den Auftritt ergibt die Schrittmaßregel 2s + a = 63 cm. Bei 2,90 m sind das 17 Steigungen mit je 17,1 cm, 28,9 cm Auftritt und ein gerader Lauf von etwa 4,6 m.
publikovano: 2026-11-11
overeno: 2026-11-11
autor: Libor z TupTuDu
revize: 2026-11-12
stav: zverejneno
obrazek: /img/clanky/vypocet-schodiste/vypocet-schodiste.jpg
souvisejici: grundriss-zeichnen, schlafzimmer-groesse
klic: vypocet-schodiste
zeme: DE, AT
- DIBt, Muster-Verwaltungsvorschrift Technische Baubestimmungen 2025/1, A 4.2.1 und Anlage A 4.2/1 zu DIN 18065 (von der Einführung ausgenommen sind Treppen in Wohngebäuden der Gebäudeklassen 1 und 2 und in Wohnungen) | https://www.dibt.de/fileadmin/dibt-website/Dokumente/Referat/P5/Technische_Bestimmungen/MVVTB_2025-1.pdf
- WEKA: DIN 18065 Gebäudetreppen (Wohngebäude mit nicht mehr als zwei Wohnungen: notwendige Treppe Laufbreite 80 cm, Steigung 140 bis 200 mm, Auftritt 230 bis 370 mm, Schrittmaß 590 bis 650 mm, lichte Durchgangshöhe 200 cm, Wendelstufen innen 50 mm, Zwischenpodest nach 18 Steigungen nur bei sonstigen Gebäuden) | https://www.weka.de/architekten-ingenieure/din-18065/
- OIB-Richtlinie 4, Ausgabe Mai 2023, hier als Anlage 4 Tir. LGBl. Nr. 59/2026 (Tabelle 1 Wohnungstreppen lichte Laufbreite 0,90 m; 2.4.8 Durchgangshöhe 2,10 m; 3.2.1 Tabelle 3 Wohnungstreppen Stufenhöhe höchstens 20 cm, Auftritt mindestens 24 cm, Schrittmaßregel 62 cm ± 3 cm; 3.2.2 Podest nach höchstens 20 Stufen; 3.2.3 gekrümmte Lauflinie 20 cm vom inneren Rand mindestens 12 cm bei Wohnungstreppen) | https://www.ris.bka.gv.at/Dokumente/Landesnormen/LTI40055262/Anlage_4.pdf
- Musterbauordnung, Fassung 2002, zuletzt geändert 25.09.2020, § 34 Abs. 7 (Treppe darf nicht unmittelbar hinter einer Tür beginnen, die in Richtung der Treppe aufschlägt) | https://bauministerkonferenz.de/Dokumente/42323530.pdf
- sanier.de: Treppenformeln (Schrittmaßregel, Bequemlichkeitsregel a − s = 12, Sicherheitsregel s + a = 46 cm, Richtwert 17/29, Steigung 16 bis 18 cm) | https://www.sanier.de/treppen/treppenformeln-so-wird-die-treppe-berechnet
- toom: Treppe berechnen (Schrittlänge 63 cm, Anzahl der Steigungen aus der Geschosshöhe) | https://toom.de/selbermachen/bauen-renovieren/treppen/treppe-berechnen/
- TupTuDu, Rechner: public/js/kalkulacka-schodiste.js mit den Parametern dieses Artikels (n = round(H / 0,175), h = H / n, a = 630 − 2h, Mindestauftritt 240 mm, höchstens 20 Steigungen im Lauf, gewendelte Stufen in die Läufe verzogen und 200 mm vom inneren Rand mindestens 120 mm geprüft; 2,90 m: 17 × 171 mm, Auftritt 289 mm, Lauf 4,62 m; bei 1 m Laufbreite L mit Podest 3,02 × 3,31 m, viertelgewendelt 2,84 × 2,84 m, halbgewendelt 2,37 × 2,00 m; viertelgewendelt um die Achse 95 mm in 20 cm, in die Läufe verzogen 174 mm; Wendeltreppe Durchmesser 1,8 m: Laufbreite 0,84 m, Kopfhöhe 1,81 m, Durchmesser 2,0 m: 0,94 m und 2,18 m, Durchmesser 2,1 m: 0,99 m und 2,36 m) | interní
- TupTuDu, Editor: public/js/koncept-v3/dum.js, schodyGeo und castiSchodu (gleiche Regel, außerhalb Tschechiens ohne Mindestauftritt, NASLAP_MIN_ZEME) | interní
---
::kalkulacka-schodiste vyskaMin=140 | vyskaMax=200 | krokMin=590 | sirkaMin=90 | naslapMin=240 | rameno=20 | zatacka=rozlozene | zakrivOd=200 | zakrivMin=120

Der Rechner kennt alle üblichen Formen von der geraden bis zur Wendeltreppe. Gib die Höhe vom fertigen Fußboden unten bis zum fertigen Fußboden oben ein, nicht die lichte Raumhöhe, die ist um Decke und Fußbodenaufbau kleiner. Bei Steigung, Auftritt, Schrittmaß, Laufbreite und Kopfhöhe prüft er jeweils den strengeren Wert aus Deutschland und Österreich.

## Treppe berechnen: die Formel

1. **Anzahl der Steigungen:** Höhe zwischen den Geschossen durch 17,5 cm teilen und auf eine ganze Zahl runden.
2. **Steigung:** Die Höhe durch diese Anzahl teilen. Nicht runden, alle Stufen müssen gleich hoch sein und die letzte genau auf dem Boden oben enden.
3. **Auftritt:** a = 63 cm − 2s. 63 cm ist die durchschnittliche Schrittlänge (Schrittmaßregel).
4. **Länge der geraden Treppe:** (Steigungen − 1) × Auftritt. Es gibt einen Auftritt weniger, der letzte Schritt führt direkt auf den Boden oben.
5. **Neigung:** der Winkel, dessen Tangens s / a ist.

| Fußboden bis Fußboden | Steigungen | Steigung | Auftritt | Gerader Lauf | Neigung |
|---:|---:|---:|---:|---:|---:|
| 2,60 m | 15 | 173 mm | 283 mm | 3,97 m | 31,5° |
| 2,75 m | 16 | 172 mm | 286 mm | 4,29 m | 31,0° |
| 2,90 m | 17 | 171 mm | 289 mm | 4,62 m | 30,6° |
| 3,00 m | 17 | 176 mm | 277 mm | 4,43 m | 32,5° |
| 3,10 m | 18 | 172 mm | 286 mm | 4,85 m | 31,1° |

Neben der Schrittmaßregel gibt es die Bequemlichkeitsregel a − s = 12 cm und die Sicherheitsregel a + s = 46 cm. Alle drei treffen sich bei 17 cm Steigung und 29 cm Auftritt.

## Welche Stufenhöhe in Deutschland und Österreich gilt

In Deutschland ist die Treppennorm DIN 18065 für Einfamilienhäuser bauaufsichtlich nicht eingeführt. Planer und Treppenbauer halten ihre Grenzmaße für Häuser mit höchstens zwei Wohnungen trotzdem ein. In Österreich gelten für Treppen innerhalb der Wohnung die Maße der OIB-Richtlinie 4, die die Bundesländer in ihr Baurecht übernehmen.

| Treppe im eigenen Haus | Deutschland (DIN 18065) | Österreich (OIB-Richtlinie 4) |
|:---|:---|:---|
| Steigung | 14 bis 20 cm | höchstens 20 cm |
| Auftritt | 23 bis 37 cm | mindestens 24 cm |
| Schrittmaß 2s + a | 59 bis 65 cm | 59 bis 65 cm |
| Laufbreite | mindestens 80 cm | mindestens 90 cm |
| Durchgangshöhe | mindestens 2,00 m | mindestens 2,10 m |
| Podest | keine Vorgabe | nach höchstens 20 Stufen |

Die Laufbreite misst man bis zum Handlauf, die Treppe selbst wird deshalb 5 bis 10 cm breiter. Bequem sind Steigungen von 16 bis 18 cm. Die endgültigen Maße legt der Planer fest.

## Wie viel Platz die Treppe braucht

Die gerade Treppe für 2,90 m ist etwa 4,6 m lang, dazu kommt freier Platz vor der ersten und hinter der letzten Stufe. Sie darf nicht direkt hinter einer Tür beginnen, die zur Treppe hin aufgeht, das verlangen in Deutschland die Landesbauordnungen. Kürzer wird es mit Podest: L-förmig braucht die Treppe für 2,90 m bei 1 m Laufbreite etwa 3,02 × 3,31 m. Verkürze sie lieber so als mit höheren Stufen.

::obrazek /img/clanky/vypocet-schodiste/schodiste-v-hale-3d.webp | 3D-Ansicht von oben ins Erdgeschoss ohne Obergeschoss und Dach: Eine gerade Treppe steigt in der Diele an der tragenden Innenwand entlang, neben der Haustür und den Türen zum WC, zum Arbeitszimmer und ins Wohnzimmer. | Gerade Treppe für 2,90 m in der Diele: 17 Steigungen mit je 171 mm, Lauf 4,62 m. Vor der ersten Stufe bleiben 1,25 m frei, die Fenster liegen abseits der Treppe, Editor TupTuDu | 1200 | 700

Noch weniger Platz brauchen gewendelte Stufen ohne Podest: viertelgewendelt für 2,90 m bei 1 m Laufbreite etwa 2,84 × 2,84 m, halbgewendelt 2,37 × 2,00 m. Innen werden die Stufen schmal. In Österreich muss eine Stufe 20 cm vom inneren Rand noch 12 cm tief sein, die DIN 18065 nennt für Häuser mit höchstens zwei Wohnungen an der inneren Kante mindestens 5 cm. Laufen die Stufen der Wendelung in einem Punkt zusammen, im Rechner „Um die Achse“, erfüllt die Treppe beides nicht. Der Rechner verzieht die Stufen deshalb in die Läufe und prüft den Auftritt 20 cm vom inneren Rand. Die 5 cm der DIN an der inneren Kante prüft er nicht eigens.

Eine Wendeltreppe als Haupttreppe braucht in Deutschland rund 2 m Durchmesser. In Österreich wird es mit 90 cm Laufbreite bis zum Handlauf und 12 cm Auftritt innen knapp, rechne mit gut 2 m und kläre den Durchmesser mit dem Hersteller. Bei 1,80 m bleiben für 2,90 m Geschosshöhe unter der nächsten Windung nur etwa 1,80 m Kopfhöhe.

Über der Treppe braucht die Decke eine Öffnung, die lang genug für die Durchgangshöhe ist. Sie entscheidet oft, wo die Treppe im Grundriss Platz findet, und nimmt den Zimmern oben Fläche. Wie viel Platz Schlafzimmer und Flur brauchen, steht im Artikel [Wie groß sollte ein Schlafzimmer sein](clanek:schlafzimmer-groesse).

## Die Treppe im eigenen Grundriss

Im [Editor von TupTuDu](aplikace:) setzt du alle Formen aus dem Rechner in deinen Grundriss. Die Stufen berechnet er aus der Geschosshöhe nach derselben Regel, schneidet oben die Deckenöffnung aus und zeigt die Treppe in 3D. Steigung und Auftritt kannst du von Hand ändern und die Deckenöffnung kürzen, dann zeigt der Editor die Durchgangshöhe. Wie du mit dem Haus anfängst, erklärt der Artikel [Grundriss zeichnen](clanek:grundriss-zeichnen).

::vyzva Probier die Treppe in deinem Haus aus | Füge ein Obergeschoss hinzu, wechsle zurück ins Erdgeschoss, wähle das Werkzeug Treppe und klicke auf den Treppenanfang und dann in Laufrichtung. Du siehst die Stufen, die Deckenöffnung oben und das Haus in 3D. Die Gratis-Version hat 30 Änderungen pro Tag und ein Projekt.
