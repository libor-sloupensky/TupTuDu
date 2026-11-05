# AI asistent v editoru — vyjmutý z provozu

**V aplikaci teď žádný AI asistent není.** Libor ho vyjmul 5. 11. 2026, kód se nikde nenačítá a trasy neexistují. Až se bude znovu spouštět, počítá se s novým návrhem. Tenhle soubor říká, co z toho starého stojí za použití.

Vysvětlování pojmů u katastru (`vysvetleniPojmu`) a stránky Koncept testování a Pravidla objektů k asistentovi nepatří a běží dál přes `ClaudeApi`.

## Vzhled

Ve složce `modules/ai-asistent/` (nic z ní se nenačítá):

| Soubor | Co to je |
|---|---|
| `panel.png` | Snímek panelu v editoru se zkušebním rozhovorem |
| `panel.blade.txt` | Značky panelu: hlavička se stavem a volbou modelu, zprávy, vstup |
| `chat-widget.css` | Styly zpráv (`kk-chat-*`) |
| `chat-widget.js` | Formátování zpráv a klikací volby (`kkFormatujChat`, `kkScrollChat`) |

## Kód

Poslední funkční stav je **commit `12f588e`**. Z něj se dá vzít cokoli:

```bash
git show 12f588e:app/Services/KonceptAiService.php
git show 12f588e:public/js/koncept-v3/koncept-k-ui.js   # posliAi, _provedAkci, _sestavParcelaKontext, _detekujOznaceneSteny
```

| Část | Kde byla v `12f588e` |
|---|---|
| Rozhovor a návrh, volání modelu | `app/Services/KonceptAiService.php`, `app/Services/Pravidla/` |
| Trasy a metody | `aiVytvor`, `aiUprav`, `importDxf` v `KonceptV3Controller` |
| Chat v editoru | sekce „AI CHAT“ v `koncept-k-ui.js` |
| Zvýrazňovač stěn pro AI | sekce „ZVÝRAZŇOVAČ“ v `koncept-k-ui.js`, klávesy 3 a B |

## Co v projektu zůstalo

- `resources/pravidla/` — stavební pravidla pro model, s kódem nesouvisí a dají se použít znovu.
- Tabulky a kód RAG (`RagRetrieval`, `RagEmbedding`), používá je stránka Pravidla objektů.
- Sloupce `faze` a `chat` v `koncepty_v3`. Zapisují se jen výchozí hodnoty, starší rozhovory v nich zůstávají. Přes aplikaci už je nic nečte ani neupravuje.

## Před novým spuštěním

- Starý asistent vznikl před domem přes podlaží, zeminou a katalogem, tyhle části dat nezná.
- Doplnit Anthropic jako příjemce do zásad, viz `modules/aplikace.md`.
- Vybrat aktuální modely, staré volby byly Haiku 4.5, Sonnet 4.6 a Opus 4.8.
