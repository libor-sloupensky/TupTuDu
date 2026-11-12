---
titulek: Erdaushub berechnen: Wie viel Erde beim Hausbau übrig bleibt
klicove_slovo: Erdaushub berechnen
popis: Berechne, wie viel Erde beim Hausbau übrig bleibt und wie viele Lkw-Ladungen sie ergibt. Kostenloser Rechner und Beispiele für ein Haus mit und ohne Keller.
perex: Den Erdaushub berechnest du aus Baugrube, Fundament und dem, was zurückkommt. Bei einem Haus 12 × 10 m auf ebenem Grund mit Streifenfundamenten werden etwa 54 m³ ausgehoben, rund 21 m³ kommen zurück und gut 30 m³ bleiben übrig, fast alles Mutterboden. Bleibt er im Garten, fährt im besten Fall weniger als eine Lkw-Ladung weg. Mit Keller bleiben gut 360 m³.
publikovano: 2026-11-11
overeno: 2026-11-11
autor: Libor z TupTuDu
revize: 2026-11-12
stav: zverejneno
obrazek: /img/clanky/kolik-zeminy-z-vykopu/vykop-svah.jpg
souvisejici: auflockerungsfaktor, grundriss-zeichnen
klic: kolik-zeminy-z-vykopu
zeme: DE, AT
- TupTuDu, Rechner für den Erdaushub: public/js/kalkulacka-zemina.js mit den Vorgaben dieses Artikels (Gründungssohle 0,8 m, Böschung 1 : 0,6, sonst wie im Editor): Streifenfundamente ausgehoben 54,2 m³, zurück 21,3 m³, Mutterboden übrig 30,0 m³, Aushub übrig 2,9 m³ (mit Kies 14,9 m³ und 12 m³ Kies), Gräben 14,9 m³, größter Haufen 67,7 m³; Keller mit Geschosshöhe 2,75 m (vyskaSklepu=275) ausgehoben 603,4 m³, Aushub übrig 331,5 m³, lose 414,4 m³, größter Haufen 754,3 m³; Bodenplatte mit Frostschürze als Streifenfundamente ohne tragende Innenwände ausgehoben 51,4 m³ | interní
- DIN 4124 Baugruben und Gräben, Böschungswinkel ohne rechnerischen Nachweis (nichtbindige oder weiche bindige Böden 45°, steife oder halbfeste bindige Böden 60°, Fels 80°), hier nach BG BAU | https://www.bgbau.de/fileadmin/Medien-Objekte/Medien/Bausteine/c_469/c_469.pdf
- Bauarbeiterschutzverordnung Österreich, § 50 Abböschen (Mutterböden, Sande, Kiese höchstens 45°, Lehm, Mergel, fester Ton höchstens 60°) | https://www.ris.bka.gv.at/Dokumente/Bundesnormen/NOR12108480/NOR12108480.pdf
- Hausjournal: Fundament frostfrei (in Deutschland mindestens 80 cm) | https://www.hausjournal.net/fundament-frostfrei
- Stavební parametry podle zemí (interní přehled TupTuDu, modules/stavebni-parametry.md: Deutschland mindestens 0,8 m, je nach Zone 0,8 / 1,0 / 1,2 m; Österreich im Mittel 0,8 bis 1,0 m, regional mehr) | interní
- Landesamt für Landwirtschaft, Umwelt und ländliche Räume Schleswig-Holstein: Bodenschutz beim Bauen, Merkblatt für Baufirmen (Oberbodenmieten höchstens 2 m, Unterboden in der Regel 3 m, Mieten nicht befahren) | https://umweltanwendungen.schleswig-holstein.de/nuis/upool/gesamt/geologie/bodenschutzbaufirmen.pdf
- Baugesetzbuch, § 202 Schutz des Mutterbodens | https://www.gesetze-im-internet.de/bbaug/__202.html
- Kreislaufwirtschaftsgesetz, § 2 Abs. 2 Nr. 11 (nicht kontaminiertes Bodenmaterial, am Ort des Aushubs für Bauzwecke verwendet, fällt nicht unter das Gesetz) | https://www.gesetze-im-internet.de/krwg/__2.html
- Abfallwirtschaftsgesetz 2002 Österreich, § 3 Abs. 1 Z 8 (gleiche Ausnahme) | https://www.jusline.at/gesetz/awg/paragraf/3
- fertighaus.de: Erdaushub entsorgen (Mutterboden nach § 202 BauGB erhalten, bei Verdacht auf Belastung Gutachter, belasteter Boden teurer) | https://www.fertighaus.de/ratgeber/hausbau/erdaushub-entsorgung-und-kosten/
- Deutschland-Rechner: Erdaushub-Rechner (Dreiachser etwa 8 m³, Vierachser 12 bis 16 m³ lose; Auflockerung 15 bis 60 %) | https://www.deutschland-rechner.de/erdaushub-rechner
---
::kalkulacka-zeminy spara=80 | svah=0.6 | vyskaSklepu=275

## Warum Länge × Breite × Tiefe nicht reicht

Diese Formel sagt dir, wie viel ausgehoben wird. Dich interessiert aber, wie viel zurückkommt und wie viel abgefahren werden muss.

## Erdaushub berechnen: woher der Überschuss kommt

::rez-vykopu

Beispiel: Haus 12 × 10 m mit einer tragenden Innenwand, Fußboden 30 cm über Gelände, Fußbodenaufbau mit Bodenplatte und Unterbau 45 cm, Mutterboden 25 cm, Arbeitsraum 80 cm um das Haus und Gründungssohle der Streifenfundamente 80 cm unter Gelände.

- **Mutterboden (Oberboden):** Abgetragen werden etwa 39 m³. Um das Haus kommen 9 m³ zurück, unter das Haus nicht, übrig bleiben 30 m³, also etwa Hausfläche × Schichtdicke.
- **Gräben für die Streifenfundamente:** etwa 54 m Fundament × 0,5 m × 0,55 m = 15 m³ Aushub unter dem Mutterboden. Den Graben füllt der Beton, der Aushub daraus bleibt übrig. Die Tiefe bestimmt der Frost: Die Gründungssohle muss frostfrei liegen, in Deutschland und Österreich meist mindestens 0,8 m unter Gelände, in rauen Lagen und im Gebirge tiefer. Den Wert für dein Grundstück nennt der Statiker.
- **Auffüllen unter dem Haus:** Die Unterkante des Aufbaus liegt 15 cm unter Gelände, der Mutterboden reichte 25 cm tief, es fehlen 10 cm, also 12 m³. Mit verdichtetem Aushub bleiben nur etwa 3 m³ übrig. Eignet sich der Boden nicht, etwa Ton, kommt Kies hinein, dann bleiben 15 m³ Aushub. Das entscheidet die Planung.

Steht das Haus auf einer Bodenplatte mit Frostschürze, nimm im Rechner Streifenfundamente, setz die tragenden Innenwände auf null und trag die Stärke deines Aufbaus ein.

## Mit Keller bleibt mehr als zehnmal so viel

| Haus 12 × 10 m, eben | Ausgehoben | Mutterboden übrig | Aushub übrig | Größter Haufen |
|:---|---:|---:|---:|---:|
| Streifenfundamente, Aushub unter das Haus | 54 | 30 | 3 | 68 |
| Streifenfundamente, Kies unter das Haus | 54 | 30 | 15 | 68 |
| Ganzer Keller, Geschosshöhe 2,75 m | 603 | 30 | 332 | 754 |

Die Zahlen sind gerundet, in m³ fest, also wie im Boden, der Haufen ist aufgelockert.

Der größte Haufen ist größer als der Überschuss: Er ist aufgelockert und enthält auch die Erde, die später zurückkommt. Mutterboden lagerst du getrennt in Mieten, die nicht befahren werden, nach Merkblättern zum Bodenschutz höchstens 2 m hoch.

## Abfuhr: wie viele Lkw-Ladungen

Auf der Ladefläche braucht Erde etwa ein Viertel mehr Platz als im Boden. Ein Dreiachs-Kipper nimmt etwa 8 m³ mit, ein Vierachser 12 bis 16 m³, oft begrenzt aber das Gewicht. Die 33 m³ aus dem Beispiel sind lose etwa 41 m³, also rund 5 Fuhren mit dem Dreiachser. Bleibt der Mutterboden im Garten, fahren nur etwa 4 m³ Aushub weg, weniger als eine Ladung. Mit Keller und Mutterboden im Garten sind es etwa 410 m³ lose, also 25 bis 50 Fuhren. Die Umrechnung auf Tonnen steht im Artikel über den [Auflockerungsfaktor](clanek:auflockerungsfaktor).

Das ist der Idealfall, in der Praxis rechnest du mit Reserve. Gräben werden breiter, nicht jeder Aushub eignet sich zum Verfüllen, unter dem Haus kann Kies liegen und auf dem Grundstück fehlt der Platz.

Für deine Schätzung zählst du im Rechner aufgelockerten Oberboden und Aushub zusammen und teilst durch die Ladung, die dir das Fuhrunternehmen nennt. Den größten Haufen zählst du nicht, ein Teil davon kommt zurück. Außenmaße und tragende Wände liest du aus deinem [Grundriss](clanek:grundriss-zeichnen) ab.

::vyzva Zeichne dein Haus in echten Maßen | Für die Schätzung brauchst du die Außenmaße und die Länge der tragenden Wände. Im Editor zeichnest du den Grundriss und siehst das Haus in 3D. Die Erdmengen rechnet er vorerst nur bei Grundstücken in Tschechien. Die Gratis-Version hat 30 Änderungen pro Tag und ein Projekt.

## Am Hang sieht es anders aus

Der Rechner geht von ebenem Gelände aus. Am Hang werden Fundamente abgetreppt und sind talseitig höher. Über die Menge entscheidet vor allem, wie hoch du das Haus setzt. Das Gelände kennt der Editor vorerst nur bei Grundstücken in Tschechien, wo er das amtliche Geländemodell lädt.

::obrazek /img/clanky/kolik-zeminy-z-vykopu/zaklad-svah.webp | 3D-Ansicht eines eingeschossigen Hauses am Hang mit Fenstern auf allen Seiten und dem Eingang auf der Bergseite, das graue Fundament ist talseitig höher | Haus auf einem leicht geneigten Grundstück in Tschechien: Das Fundament (zur Verdeutlichung grau) reicht talseitig vom Gelände bis unter den Fußboden, Editor TupTuDu | 1200 | 700

## Wohin mit der Erde

Den Mutterboden musst du in Deutschland nach dem Baugesetzbuch erhalten und vor Vernichtung schützen, meist kommt er nach dem Bau zurück in den Garten. Unbelasteter Aushub, den du auf dem eigenen Grundstück wieder einbaust, ist in Deutschland und Österreich kein Abfall. Was das Grundstück verlässt, gilt in der Regel als Abfall. Überlass den Abtransport deshalb einem Fachbetrieb, der dir die Entsorgung mit Wiege- oder Lieferschein belegt. Viele Annahmestellen verlangen vorher eine Bodenprobe.

In den Zahlen fehlen Hausanschlüsse, Sickerschacht, Zisterne, Zufahrt, Terrasse und Wege. Der Mutterboden zählt nur im 80 cm breiten Streifen um das Haus und kommt dort ganz zurück, auch wo später ein Kiesstreifen liegt.
