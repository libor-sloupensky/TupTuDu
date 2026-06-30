---
id: pultova
nazev: "Pultová střecha"
tagy: [strecha, pultova]
priorita: 20
max_tokeny: 300
---

# Pultová střecha

## Geometrie

- Jeden sklon — střecha se svažuje jedním směrem
- Sklon: typicky 5–25° (modernější stavby i méně)
- Vyšší strana: obvykle severní (lepší osvětlení z jihu)
- Přesah: 0.2–0.5m

## Výhody

- Jednoduchá konstrukce — méně řezů, úspor materiálu
- Vhodná pro moderní architekturu, zahradní domky, garáže
- Sníh: sklouzne na jednu stranu (pozor na umístění chodníku/vstupu)

## Pravidla

- Sklon <5° → nutná speciální hydroizolace (jako plochá střecha)
- Odvodnění: žlab jen na jedné (nižší) straně
- U větších budov: zvážit kombinaci dvou pultových střech (butterfly)

## V JSON projektu

```json
"strecha": { "typ": "pultova", "sklon": 12, "presah": 0.3 }
```
