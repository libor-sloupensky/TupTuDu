---
id: sedlova
nazev: "Sedlová střecha"
tagy: [strecha, sedlova]
priorita: 20
max_tokeny: 500
---

# Sedlová střecha

## Geometrie

- Hřeben vždy podél DELŠÍ osy budovy
- Sklon: typicky 30–45° (pro ČR optimálně 35°)
- Přesah střechy přes obvodové stěny: 0.3–0.6m
- Štíty (trojúhelníkové zakončení) na kratších stranách

## Konstrukční prvky

- Krokve: od hřebene k pozednici (horní hrana obvodové stěny)
- Pozednice: vodorovný trám na obvodové stěně
- Vaznice: podélný trám podpírající krokve (u rozpětí >6m)
- Kleštiny: vodorovné prvky spojující protilehlé krokve

## Pravidla

- Sklon <25° → zvážit jinou krytinu (plech místo tašek)
- Sklon >45° → podkroví využitelné jako obytné
- Krytina: taška (betonová/pálená), plech, šindel
- Okapy: na obou stranách podél delší osy
- Svody: min. 1 svod na 50m² střešní plochy
- Podkrovní okna: vikýře nebo střešní okna (Velux/Fakro)

## V JSON projektu

```json
"strecha": { "typ": "sedlova", "sklon": 35, "presah": 0.4 }
```
