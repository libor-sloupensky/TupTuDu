# Export a sdílení projektu

## Export
Sekce „Export a sdílení" v pravém panelu editoru, `public/js/koncept-v3/export-sdileni.js`. Všechno vzniká v prohlížeči:
- **Půdorys PNG** aktivního podlaží, nebo všech na jednom listu. 120 px na metr, bílé pozadí, nadpis, měřítko 1 m (s kótami i poznámka „kóty v cm"), zápatí se značkou. **Na výkresu je přesně to, co je zaškrtnuté v přepínačích zobrazení** (Libor 4. 11. 2026): Stěny, Otvory, Kóty, Značky, Body, Místnosti, Vybavení. Aby je uživatel nemusel hledat, jsou tytéž přepínače i v sekci Export a změna platí všude, viz „Přepínače zobrazení" v `modules/dum.md`. Totéž platí pro samostatný odstavec **Parcela a mřížka** (Libor 5. 11. 2026): Mřížka, Parcely, Stavby, Sousedé, Výška, partial `prepinace-parcely`, jedno nastavení s panelem Parcela. Stejně se řídí půdorysy v odkazu. Nikdy na něm není mapový ani výkresový podklad a výběr.
- **Rozsah s parcelou:** obrázek obsáhne celou parcelu a její stavby (`_rozsahExportu` v `renderKatastr`), se sousedy navíc 5 m okolí. Sousedé a výškové body se k tomu výřezu oříznou, jinak by je velké sousední pole roztáhlo. Parcela, která by přesáhla 4000 px plátna (u více podlaží 2000), zmenší měřítko kresby (`_pxNaMetrVykresu`) a úsečka měřítka na listu to sleduje. Popisky a kóty zůstanou čitelné, protože se s přiblížením nezmenšují.
- **Čísla sousedních parcel** jsou jen ve staženém PNG, do odkazu nejdou (`bezCiselParcel`), viz Soukromí.
- **Zápatí:** značka `public/brand/znacka-svetle-1200.png`, popis služby `ed_nastroje.export.podtitul` a `tuptudu.com` (Libor 5. 11. 2026). Na půdorysu vpravo dole vedle měřítka, u 3D v bílém pruhu pod záběrem, aby nic nezakrylo (`_kresliZnacku`, `_list3d`). Texty listu rostou s šířkou obrázku (`meritkoListu`). Náhled odkazu (`_nahledModelu`) zápatí nemá, stránka odkazu má vlastní hlavu.
- **Plán: logo firmy v tarifu Profi**, viz `modules/platby.md`, Nápady na později. Plátno se přepne jen v jednom běhu, takže se nic nemihne a stav se vrátí.
- **3D PNG** z aktuálního pohledu, ve dvojnásobném rozlišení. Z 2D se editor na chvíli přepne do 3D. Se skrytým domem zachytí vypočítaný výkop, samostatné tlačítko není potřeba (Libor 4. 11. 2026).

Plátno 2D se po dobu snímku zvětší na velikost obrázku (`_kresbyPodlazi`), poloprůhledné tvary se kreslí přes pomocné plátno velikosti plátna. Skryté plátno při otevření ve 3D má aspoň 1 px, při nule Konva padala na `drawImage` (bug 58, `test-otevreni-3d-ui.cjs`).

## Odkaz
Veřejná adresa `tuptudu.com/share/{token}` (40 náhodných znaků), správa přes `koncept-v3/{id}/sdileni` a `editor/{id}/share`, `App\Http\Controllers\KonceptV3SdileniController`, tabulka `koncepty_v3_sdileni`, soubory `storage/app/sdileni/{token}` (mimo deploy).

**Rozhodnutí Libora 3. 11. 2026:** nechce otevírat aplikaci světu, aby si někdo zkopíroval kód. Kód v prohlížeči zkopírovat jde vždy a maskování to neřeší, proto stránka odkazu **kód editoru vůbec nenačítá**: jen `three.min.js`, `OrbitControls.js` (veřejné knihovny) a `public/js/sdileni-prohlizec.js`, který umí jen zobrazit trojúhelníky. Pole `steny`, `otvory` a další data projektu se nikam neposílají. Nepřidávat na tu stránku nic z `js/koncept-v3`; hlídá to `test-sdileni-ui.cjs`.

- **Jen pro čtení, stav k datu.** Odkaz ukazuje, co autor naposledy nahrál tlačítkem, ne živý projekt. Aktualizace drží stejnou adresu.
- **Vypnutí** smaže řádek i soubory. Nové sdílení dostane novou adresu, stará zůstane mrtvá. Smazání projektu odkaz zruší i se soubory. Smazání celého účtu jde cizím klíčem bez modelu: odkaz přestane fungovat hned, soubory uklidí denní `sdileni:uklid` (složky bez záznamu v tabulce, starší než hodina).
- **Soukromí:** `noindex`, `Referrer-Policy: no-referrer`, vlastní hlava stránky bez analytiky a cookie lišty, ať se tajná adresa nedostane do měření. Terén jde do odkazu bez polohy (Libor 4. 11. 2026): výšky vůči ±0 domu a tvar parcely v metrech od domu, žádné zeměpisné souřadnice, nadmořská výška ani číslo parcely.
- **Tarif:** obrázky PNG a sdílení odkazem jsou ve všech tarifech, i ve verzi zdarma (Libor 4. 11. 2026, dřív jen placené). **Jen grafické výstupy:** SVG, PDF a formáty, ze kterých jdou vyčíst parametry objektů, neposkytujeme. Zámek odkazu (`jeUzamceny`, `config/tarify.php`) zůstává v kódu pro případ tarifu bez exportů, dnes ho žádný nemá.

Výkop v odkazu: `teren.jamy` má předem spočítanou síť pro každou kombinaci skrytých podlaží v terénu (při více než třech podlažích jen pro všechna), buňky a výšky v cm. Po skrytí těch podlaží se ukáže a terén se vyřízne.

Model: `{verze, zeme, diry, teren, skupiny:[{id,nazev}], materialy, textury, meshe:[{skupina, material, pozice, uv}]}`, pozice a uv jsou Float32 v base64. Editor posílá gzip, server ho posílá dál s `Content-Encoding: gzip`.

## Testy
`node services/import-test/test-sdileni-ui.cjs`, `test-otevreni-3d-ui.cjs` (bug 58)
