/**
 * Import skutečného výkresu na 1.NP a pak na 2.NP: druhý plánek se musí srovnat na spodní podlaží.
 * Bere první nahraný výkres s uloženým měřítkem a obvodem, jeho nastavení nepřepisuje.
 * Spuštění: node services/import-test/test-dum-import-ui.cjs [složka snímků]
 */
const path = require('path');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');
const Z = process.env.V3_URL || 'http://127.0.0.1:8002';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
(async () => {
  const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
  try {
    await p.jdiNa(Z + '/login');
    await p.vyhodnot(`document.querySelector('input[name=email]').value = 'libor.sloupensky@seznam.cz'; document.querySelector('input[name=password]').value = '12345'; document.querySelector('form').submit(); true`);
    await pauza(3000);
    await p.jdiNa(Z + '/masterteam/koncept-v3');
    await p.cekej(`!!(window.Alpine && ${D})`, 20000, 'Alpine');
    await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST', headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'}, body: JSON.stringify({ nazev: 'ClaudeTest dům import' }) }); const j = await r.json(); location.href = j.redirect; })()`);
    await pauza(3000);
    await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
    const importuj = `(async () => { const d = ${D}; d.impUlozNastaveni = async () => {}; const c = window.confirm; window.confirm = () => true;
      await d.impNactiDrive(); const v = d.impDrive.find(x => Object.values(x.strany || {}).some(s => s.kalibMm > 0 && (s.obrys || []).length >= 3)); if (!v) return 'zadny vykres';
      const strana = Object.entries(v.strany).find(([k, s]) => s.kalibMm > 0 && (s.obrys || []).length >= 3)[0];
      await d.impOtevriVykres(v); await d.impVyberStranu(Number(strana)); d.impObnovUlozene();
      await d.impRozpoznat(); const t = Date.now(); while (d.impStav === 'pocitam' && Date.now() - t < 60000) await new Promise(r => setTimeout(r, 300));
      if (!d.impVarianty.length) return 'bez variant: ' + d.impChyba; d.impVybrana = 0; d.impPrevezmiSteny(); window.confirm = c; await new Promise(r => setTimeout(r, 500));
      return { nazev: v.nazev, steny: d.engine.walls.size, podlazi: d.engine.aktivniPodlazi().nazev, zprava: d.dumZprava, podklad: d.podklad ? [Math.round(d.podklad.stredX), Math.round(d.podklad.stredY), +(d.podklad.uhel || 0).toFixed(2)] : null }; })()`;
    let a = await p.vyhodnot(importuj); console.log('1.NP:', JSON.stringify(a));
    const pr = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; d.pridatPodlazi('nahoru'); d.naPodlazi('P1'); d._transformujAktivni((q) => ({ x: q.x + 120, y: q.y - 80 }), 0); d.renderer.render(); d.naPodlazi('P2'); return { aktivni: e.aktivniPodlazi().nazev, kopie: e.walls.size, typy: [...new Set([...e.walls.values()].map(w => w.typ))] }; })()`);
    console.log('2.NP před importem:', JSON.stringify(pr));
    a = await p.vyhodnot(importuj); console.log('2.NP:', JSON.stringify(a));
    const k = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const dole = e.enginePodlazi('P1'); const body = [...dole.walls.values()].filter(w => w.typ === 'obvodova' || w.typ === 'nosna').flatMap(w => [dole.nodes.get(w.nodeA), dole.nodes.get(w.nodeB)]);
      const obv = [...e.walls.values()].filter(w => w.typ === 'obvodova').flatMap(w => [e.nodes.get(w.nodeA), e.nodes.get(w.nodeB)]);
      const od = obv.map(n => Math.min(...body.map(q => Math.hypot(q.x - n.x, q.y - n.y)))); od.sort((x, y) => x - y);
      const nep = d.podepreniPodlazi('P2'); return { rohu: od.length, median: +od[Math.floor(od.length / 2)].toFixed(1), max: +od[od.length - 1].toFixed(1), nepodeprene: nep.size, nosnych: [...e.walls.values()].filter(w => w.typ === 'obvodova' || w.typ === 'nosna').length }; })()`);
    console.log('shoda rohů 2.NP × 1.NP (px, 80 px = 1 m):', JSON.stringify(k));
    await p.snimek(path.join(process.argv[2] || '.', 'dum-import-patro.png'));
    console.log('chyby:', p.chybyDetail.filter(c => !/404/.test(c.text)).slice(0, 4).map(c => (c.text || '').slice(0, 160)));
  } finally { await p.zavri(); }
})().catch(e => { console.error(e); process.exit(2); });
