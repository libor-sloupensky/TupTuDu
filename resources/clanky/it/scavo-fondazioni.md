---
titulek: Scavo fondazioni: quanta terra resta, con calcolatore
klicove_slovo: scavo fondazioni
popis: Calcola quanta terra resta dallo scavo delle fondazioni e quanti camion servono per portarla via. Calcolatore gratuito, esempi con travi e con cantina.
perex: Quanta terra resta dallo scavo delle fondazioni? Per una casa di 12 × 10 m in piano, su travi di fondazione e con vespaio aerato, si scavano circa 66 m³ e se ne rimettono solo 11: restano circa 55 m³, di cui 30 m³ di terreno vegetale. Se il terreno vegetale resta in giardino, bastano 3 o 4 camion. Con la cantina restano oltre 400 m³.
publikovano: 2026-11-11
overeno: 2026-11-11
revize: 2026-11-12
autor: Libor z TupTuDu
stav: zverejneno
obrazek: /img/clanky/kolik-zeminy-z-vykopu/vykop-svah.jpg
souvisejici: peso-specifico-terra, disegnare-planimetria-casa
klic: kolik-zeminy-z-vykopu
zeme: IT
- DM 17 gennaio 2018, Norme tecniche per le costruzioni (NTC 2018), § 6.4.2: profondità del piano di posa scelta e giustificata nel progetto, sotto il terreno vegetale e sotto lo strato interessato dal gelo e dalle variazioni stagionali del contenuto d'acqua, nessun valore numerico | https://www.gazzettaufficiale.it/eli/id/2018/02/20/18A00716/sg
- Ingenio: come si progettano le fondazioni (NTC 2018 § 6.4, linea di gelo in Italia da circa 50 a 150 cm, quota di posa dalla relazione geologica e geotecnica) | https://www.ingenio-web.it/articoli/come-si-progettano-le-fondazioni-alcuni-esempi-pratici/
- DPR 13 giugno 2017 n. 120, terre e rocce da scavo: art. 2 (cantiere di piccole dimensioni fino a 6.000 m³), art. 4 (sottoprodotti), art. 21 (dichiarazione di utilizzo al Comune e all'ARPA almeno 15 giorni prima degli scavi), art. 23 (rifiuti EER 17 05 04), art. 24 (utilizzo nel sito di produzione) | https://www.gazzettaufficiale.it/eli/id/2017/08/07/17G00135/sg
- D.Lgs. 3 aprile 2006 n. 152, art. 185 comma 1 lettera c (suolo non contaminato riutilizzato allo stato naturale nello stesso sito escluso dai rifiuti) | https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2006-04-03;152~art185
- ARPA e Regione Piemonte: terre e rocce da scavo (dichiarazione di utilizzo per opere non soggette a VIA, dichiarazione di avvenuto utilizzo) | https://www.regione.piemonte.it/web/temi/ambiente-territorio/ambiente/amianto-bonifiche/terre-rocce-scavo
- Prezzario DEI urbanizzazione 2023, avvertenze (scavi misurati in sito senza aumento di volume, trasporti sul volume prima dello scavo oppure a peso) | https://www.build.it/upload/libri/430/DEI_PrezzarioUrbanizzazioneInfAmb_IIsem2023_Avvertenze.pdf
- edilizia.com: scavo di sbancamento (rigonfiamento 25 % come esempio non universale, impianti spesso a tonnellata, misura in posto) | https://www.edilizia.com/?p=92625
- edilizia.com: vespaio aerato (spessore dal pavimento: vuoto 25, soletta 5, isolamento 10, massetto 6, finitura 1,5 cm = 47,5 cm, sotto il magrone) | https://www.edilizia.com/?p=91305
- Regione Friuli Venezia Giulia, Prezzario 2025: vespaio con casseri a perdere da h 10 a 75 cm con soletta da 5 cm | https://www.regione.fvg.it/rafvg/cms/RAFVG/infrastrutture-lavori-pubblici/lavori-pubblici/prezzario-2025/?cod=13.1.GN6.02
- Studio Madera: vespaio aerato (per i locali abitabili controterra richiesto il vespaio o un'alternativa per l'agibilità) | https://studiomadera.it/news/144-vespaio
- Codice della strada, art. 62 (massa limite degli autoveicoli isolati a tre assi 25 t) | https://www.brocardi.it/codice-della-strada/titolo-iii/capo-i/art62.html
- Autocarro ribaltabile a tre assi in vendita: massa complessiva 26.000 kg, portata utile 14.170 kg (esempio di mezzo) | https://www.machineseeker.it/iveco-stralis+420+ribaltabile+3+latoi+euro6/i-18013266
- D.Lgs. 3 aprile 2006 n. 152, art. 193 (trasporto dei rifiuti con il formulario di identificazione) e art. 212 (Albo nazionale gestori ambientali) | https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2006-04-03;152~art193
- TupTuDu, calcolatore dello scavo: public/js/kalkulacka-zemina.js, parametri dell'articolo per l'Italia skladba 60 cm (vespaio aerato su travi), skladbaDeska 100 cm (vespaio su platea), altri valori predefiniti; esempi calcolati 11. 11. 2026 (66 / 11 / 55 m³, cantina 688 / 30 / 386 / 861 m³, fossa della cantina 3,35 m, lo schema rez-sklepu è un esempio con 3,2 m) | interní
---
::kalkulacka-zeminy skladba=60 | skladbaDeska=100

## Perché lunghezza × larghezza × profondità non basta

Ti dice quanta terra scavi, non quanta ne torna nello scavo e quanta devi portare via.

## Quanta terra resta dallo scavo delle fondazioni

::rez-vykopu

Esempio: casa di 12 × 10 m con un muro portante interno, pavimento 30 cm sopra il terreno, terreno vegetale di 25 cm, spazio di lavoro di 80 cm intorno alla casa e piano di posa delle travi a 1 m di profondità.

- **Terreno vegetale:** lo scotico ne toglie circa 39 m³, intorno alla casa ne tornano 9. Ne restano 30 m³, cioè la superficie della casa per lo spessore.
- **Scavi per le travi:** circa 54 m di travi × 0,5 m × 0,7 m = 19 m³ di terra di scavo, che resta tutta. In Italia la trave rovescia si getta di solito nei casseri: si scava più largo e si rinterra, l'eccesso cambia poco, lo scavo e il cumulo crescono.
- **Vespaio aerato:** in Italia sotto i locali abitabili del piano terra si fa di solito un vespaio, spesso con casseri a perdere (igloo). Dal pavimento al fondo del magrone ci sono circa 60 cm: si scava 5 cm oltre lo scotico, altri 6 m³, e sotto la casa non si rimette terra.

Profondità e larghezza delle fondazioni in Italia le decide il progetto strutturale, sulla base della relazione geologica e geotecnica. Le norme tecniche non danno un numero: chiedono di scendere sotto il terreno vegetale e sotto lo strato che gela o cambia molto di umidità con le stagioni.

## Con la cantina resta quasi otto volte tanto

| Casa 12 × 10 m in piano | Scavato | Terreno vegetale in eccesso | Terra di scavo in eccesso | Cumulo più grande |
|:---|---:|---:|---:|---:|
| Travi di fondazione, vespaio aerato | 66 | 30 | 25 | 83 |
| Cantina sotto tutta la casa, altezza di piano 3,05 m | 688 | 30 | 386 | 861 |

Numeri arrotondati, in m³ di terra in sito; il cumulo è di terra smossa.

::rez-sklepu

Lo schema è un esempio con fossa di 3,2 m. Il cumulo supera l'eccesso: la terra smossa occupa più spazio e c'è anche quella che tornerà nello scavo. Il terreno vegetale tienilo a parte, così lo riusi in giardino.

## Camion: quanti ne servono

Sul cassone la terra occupa circa un quarto in più che nel terreno, lo spiega il [coefficiente di rigonfiamento](clanek:peso-specifico-terra). In Italia un camion a tre assi può pesare a pieno carico 25 t: tolto il mezzo porta circa 14 t, cioè circa 8 m³ di terra in sito, una decina di m³ sul cassone. I 55 m³ dell'esempio sono quindi circa 7 camion. Se il terreno vegetale resta in giardino, parte solo la terra di scavo: 3 o 4 camion. Con la cantina, sempre senza il terreno vegetale, circa 50.

È il caso ideale: nella realtà tieni un margine, perché una parte della terra non è adatta al rinterro e in cantiere può mancare lo spazio. Per una stima veloce dividi per 8 l'eccesso in sito del calcolatore. Quanto porta il camion lo sa il trasportatore.

::vyzva Prima disegna la tua casa | Disegna la pianta nelle misure reali e guardala in 3D: le misure esterne e quelle dei muri portanti ti servono nel calcolatore. La versione Gratis ha 30 modifiche al giorno e un progetto.

## In pendenza i conti cambiano

Il calcolatore considera un terreno in piano. In pendenza le fondazioni si fanno a gradoni e a valle vengono più alte. Sul volume conta soprattutto la quota a cui metti la casa.

::obrazek /img/clanky/kolik-zeminy-z-vykopu/zaklad-svah.webp | Vista 3D di una casa a un piano su un terreno in pendenza, con finestre su tutti i lati e ingresso a monte; la fondazione grigia è più alta sul lato a valle. | Casa su un lotto in leggera pendenza: a valle la fondazione (in grigio per chiarezza) scende dal pavimento fino al terreno. Il profilo del terreno l'editor TupTuDu lo conosce per ora solo con le particelle ceche | 1200 | 700

## Dove mettere la terra

In Italia la terra che riutilizzi nello stesso cantiere, per rinterri e modellazione del terreno, non è un rifiuto, purché la non contaminazione sia verificata con le analisi previste (allegato 4 del DPR 120/2017). Se la porti in un altro sito come sottoprodotto servono i requisiti di legge, analisi comprese, e in un cantiere fino a 6.000 m³ la dichiarazione di utilizzo al Comune e all'ARPA almeno 15 giorni prima degli scavi. Altrimenti è un rifiuto e va a un impianto autorizzato: affida il trasporto a un trasportatore iscritto all'Albo gestori ambientali, con il formulario (FIR).

Nei numeri non ci sono allacciamenti, fossa biologica, cisterna per l'acqua piovana, accesso, terrazza e marciapiede. Il terreno vegetale si calcola solo sulla fascia di 80 cm intorno alla casa e torna tutto lì.
