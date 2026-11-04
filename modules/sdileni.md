# Export a sdílení projektu

## Export
Sekce „Export a sdílení" v pravém panelu editoru, `public/js/koncept-v3/export-sdileni.js`. Všechno vzniká v prohlížeči:
- **Půdorys PNG** aktivního podlaží, nebo všech na jednom listu. 120 px na metr, bílé pozadí, nadpis, měřítko 1 m, `tuptudu.com`. Bez mřížky, podkladu, bodů, označení stěn a výběru. Plátno se přepne jen v jednom běhu, takže se nic nemihne a stav se vrátí.
- **3D PNG** z aktuálního pohledu, ve dvojnásobném rozlišení. Z 2D se editor na chvíli přepne do 3D.

Plátno 2D se po dobu snímku zvětší na velikost obrázku (`_kresbyPodlazi`), poloprůhledné tvary se kreslí přes pomocné plátno velikosti plátna. Skryté plátno při otevření ve 3D má aspoň 1 px, při nule Konva padala na `drawImage` (bug 58, `test-otevreni-3d-ui.cjs`).

## Odkaz
Veřejná adresa `tuptudu.com/share/{token}` (40 náhodných znaků), správa přes `koncept-v3/{id}/sdileni` a `editor/{id}/share`, `App\Http\Controllers\KonceptV3SdileniController`, tabulka `koncepty_v3_sdileni`, soubory `storage/app/sdileni/{token}` (mimo deploy).

**Rozhodnutí Libora 3. 11. 2026:** nechce otevírat aplikaci světu, aby si někdo zkopíroval kód. Kód v prohlížeči zkopírovat jde vždy a maskování to neřeší, proto stránka odkazu **kód editoru vůbec nenačítá**: jen `three.min.js`, `OrbitControls.js` (veřejné knihovny) a `public/js/sdileni-prohlizec.js`, který umí jen zobrazit trojúhelníky. Pole `steny`, `otvory` a další data projektu se nikam neposílají. Nepřidávat na tu stránku nic z `js/koncept-v3`; hlídá to `test-sdileni-ui.cjs`.

- **Jen pro čtení, stav k datu.** Odkaz ukazuje, co autor naposledy nahrál tlačítkem, ne živý projekt. Aktualizace drží stejnou adresu.
- **Vypnutí** smaže řádek i soubory. Nové sdílení dostane novou adresu, stará zůstane mrtvá. Smazání projektu odkaz zruší i se soubory. Smazání celého účtu jde cizím klíčem bez modelu: odkaz přestane fungovat hned, soubory uklidí denní `sdileni:uklid` (složky bez záznamu v tabulce, starší než hodina).
- **Soukromí:** `noindex`, `Referrer-Policy: no-referrer`, vlastní hlava stránky bez analytiky a cookie lišty, ať se tajná adresa nedostane do měření. Terén ani parcela se nepřenášejí.
- **Tarif:** export i sdílení jen v placených tarifech (`Tarif::maExporty`, `config/tarify.php`), podle `modules/platby.md`. Po přechodu na Zdarma se odkaz uzamkne (Libor 3. 11. 2026): stránka ukáže hlášku, model a obrázky vrací 404, soubory zůstávají a po obnovení tarifu se odkaz sám odemkne. V ceníku uvedeno u placených tarifů.

Model: `{verze, zeme, diry, skupiny:[{id,nazev}], materialy, textury, meshe:[{skupina, material, pozice, uv}]}`, pozice a uv jsou Float32 v base64. Editor posílá gzip, server ho posílá dál s `Content-Encoding: gzip`.

## Testy
`node services/import-test/test-sdileni-ui.cjs`, `test-otevreni-3d-ui.cjs` (bug 58)
