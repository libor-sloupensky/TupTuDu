# TupTuDu.com — Pravidla pro Claude Code

## Jazyk
- Commit messages, komentáře v kódu a komunikace: **česky**
- Ceny a náklady uvádět v **CZK**

## Workflow — obecný vývoj
- Před úpravou kódu vždy přečíst aktuální stav souboru
- Preferovat úpravu existujících souborů před vytvářením nových
- Push jen funkční kód — otestovat lokálně před push
- **Netvrdím "hotovo"** dokud neukážu výsledek testu / dry-runu

## Workflow — ověřování změn
- Po každé změně ověřit 3 vrstvy: (1) backend výstup, (2) JS zpracování, (3) vizuální výsledek
- **Nikdy neopravovat symptom** — nejdřív zmapovat celý datový tok
- **Max 2 debug cykly** — pokud po 2 opravách problém trvá, přehodnotit přístup od základu

## Brand
- Veškerý UI stav projektu se ukládá konzistentně — promyslet stav i invalidaci PŘEDEM
- Brand barvy NIKDY nehard-codovat hex — vždy CSS proměnné (`var(--c-primary)` atd.)

## Správa kontextu
- Na začátku práce na modulu přečíst příslušnou dokumentaci, pokud existuje
- Na konci sezení nebo na výzvu **"aktualizuj kontext"**: aktualizovat příslušný modul
- Pokud chybí kontext: říct to a požádat o příslušný soubor — nikdy nedomýšlet

---

**Tento soubor je zatím minimální** — další detaily (tech stack, deploy, moduly, hosting)
si doplním postupně podle potřeby.
