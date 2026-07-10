# pudorys-parser — čtečka a učení z reálných půdorysů

Pilotní pipeline pro strategii „učit se z reálných plánů" (viz paměť tuptudu-ai-pudorys).

## Co tu je
- **extract_rules.py** — čtečka textu z PDF portfolií (PyMuPDF/fitz). Vytáhne odstavce
  architektonického uvažování (dispozice, zóny, orientace, program) → `korpus_uvazovani.txt`.
  Spuštění: `python extract_rules.py` (cesta ke složce s PDF je uvnitř).
- **korpus_uvazovani.txt** — vytěžený korpus (188 odstavců z 26 prací; 2 čistě rastrové = 0).
- **pravidla_naucena.json** — NAUČENÁ rozhodovací pravidla (organizační principy, knihovna
  místností s typickými plochami/orientací/napojením, co aplikovat). Vytěženo z korpusu.

## Zjištění (raster vs vektor)
Portfolia (27–64 stran) míchají zadání, situace, řezy, pohledy, rendery a půdorysy.
8/10 má na kreslicích stranách vektor (přesná geometrie), 2/10 jsou čistě rastr.
„Vektor" je ale hromada čar bez významu → čtení geometrie je samostatný úkol.
Nalézt a izolovat samotný půdorys je pod-problém → hlavní čtečka = vision-LLM na
vykreslených stranách (klasifikace+lokalizace+čtení), vektor jako pozdější zpřesnění.

## Aplikováno do nástroje
Z `pravidla_naucena.json` zapracováno do koncept-solveru: přidány místnosti Pracovna,
Šatna, Prádelna; zpřesněny orientační tendence a napojení dle evidence z reálných BP.
