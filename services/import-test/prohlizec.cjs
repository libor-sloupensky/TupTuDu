/**
 * Ovládání Chrome přes ladicí protokol (CDP) — bez knihoven, jen Node 24+.
 *
 * Slouží k ověřování UI Konceptu V3 lokálně: přihlášení, proklik průvodce
 * importem, snímky obrazovky. Není to součást aplikace, jen vývojový nástroj.
 *
 * Použití:
 *   const { otevriProhlizec } = require('./prohlizec.cjs');
 *   const p = await otevriProhlizec({ viditelny: false });
 *   await p.jdiNa('http://127.0.0.1:8000/login');
 *   await p.snimek('prihlaseni.png');
 *   await p.zavri();
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(c => fs.existsSync(c));

const pauza = (ms) => new Promise(r => setTimeout(r, ms));

async function otevriProhlizec({ viditelny = false, port = 9333, sirka = 1600, vyska = 1000, posuvniky = false } = {}) {
    if (!CHROME) throw new Error('Nenalezen Chrome ani Edge.');

    const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'v3-test-'));
    const proces = spawn(CHROME, [
        viditelny ? '--new-window' : '--headless=new',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profil}`,
        `--window-size=${sirka},${vyska}`,
        '--no-first-run', '--no-default-browser-check', '--disable-gpu',
        // posuvníky se běžně schovávají (kvůli čistým snímkům), při jejich
        // kontrole je ale potřeba nechat je vykreslit
        ...(posuvniky ? [] : ['--hide-scrollbars']),
        'about:blank',
    ], { stdio: 'ignore' });

    // počkat na ladicí rozhraní
    let verze = null;
    for (let i = 0; i < 60 && !verze; i++) {
        try { verze = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); }
        catch { await pauza(250); }
    }
    if (!verze) { proces.kill(); throw new Error('Chrome nenastartoval.'); }

    const ws = new WebSocket(verze.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let cid = 0;
    const cekajici = new Map();
    const udalosti = [];
    ws.onmessage = (ev) => {
        const zprava = JSON.parse(ev.data);
        if (zprava.id && cekajici.has(zprava.id)) {
            const { res, rej } = cekajici.get(zprava.id);
            cekajici.delete(zprava.id);
            zprava.error ? rej(new Error(zprava.error.message)) : res(zprava.result);
        } else if (zprava.method) {
            udalosti.push(zprava);
        }
    };
    const posli = (method, params = {}, sessionId) => new Promise((res, rej) => {
        const id = ++cid;
        cekajici.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
        setTimeout(() => { if (cekajici.delete(id)) rej(new Error('timeout: ' + method)); }, 60000);
    });

    // vlastní karta
    const { targetId } = await posli('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await posli('Target.attachToTarget', { targetId, flatten: true });
    const cmd = (method, params) => posli(method, params, sessionId);

    await cmd('Page.enable');
    await cmd('Runtime.enable');
    await cmd('DOM.enable');
    await cmd('Log.enable');
    await cmd('Network.enable');

    const chyby = [];
    const spatneOdpovedi = [];
    ws.addEventListener('message', (ev) => {
        const z = JSON.parse(ev.data);
        if (z.method === 'Network.responseReceived' && z.params.response.status >= 400) {
            spatneOdpovedi.push(z.params.response.status + ' ' + z.params.response.url);
        }
    });
    const chybyDetail = [];
    ws.addEventListener('message', (ev) => {
        const z = JSON.parse(ev.data);
        if (z.method === 'Log.entryAdded' && z.params.entry.level === 'error') {
            const e = z.params.entry;
            chyby.push(e.text);
            chybyDetail.push({ text: e.text, zdroj: e.source, url: e.url, radek: e.lineNumber });
        }
        if (z.method === 'Runtime.exceptionThrown') {
            const d = z.params.exceptionDetails;
            chyby.push(d.text + ' ' + (d.exception?.description || ''));
            chybyDetail.push({ text: d.text, url: d.url, radek: d.lineNumber });
        }
    });

    const vyhodnot = async (vyraz) => {
        const r = await cmd('Runtime.evaluate', { expression: vyraz, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error('JS: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
        return r.result.value;
    };

    return {
        chyby,
        chybyDetail,
        spatneOdpovedi,
        cmd,
        vyhodnot,

        async jdiNa(url) {
            await cmd('Page.navigate', { url });
            // počkat na dokončení načtení
            for (let i = 0; i < 80; i++) {
                const stav = await vyhodnot('document.readyState');
                if (stav === 'complete') break;
                await pauza(150);
            }
            await pauza(400);
        },

        /** Klik na prvek podle CSS selektoru (přes JS, ne souřadnice). */
        async klik(selektor) {
            const ok = await vyhodnot(`(() => { const e = document.querySelector(${JSON.stringify(selektor)}); if (!e) return false; e.click(); return true; })()`);
            if (!ok) throw new Error('prvek nenalezen: ' + selektor);
            await pauza(250);
        },

        /** Čeká, až výraz vrátí pravdivou hodnotu. */
        async cekej(vyraz, limitMs = 20000, popis = '') {
            const konec = Date.now() + limitMs;
            while (Date.now() < konec) {
                try { if (await vyhodnot(vyraz)) return true; } catch { /* stránka se přenačítá */ }
                await pauza(200);
            }
            throw new Error('nedočkal jsem se: ' + (popis || vyraz));
        },

        /** Vloží soubor do <input type=file>. */
        async vlozSoubor(selektor, cesta) {
            const { root } = await cmd('DOM.getDocument', { depth: -1 });
            const { nodeId } = await cmd('DOM.querySelector', { nodeId: root.nodeId, selector: selektor });
            if (!nodeId) throw new Error('input nenalezen: ' + selektor);
            await cmd('DOM.setFileInputFiles', { nodeId, files: [path.resolve(cesta)] });
            await pauza(300);
        },

        async snimek(soubor) {
            const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(soubor, Buffer.from(data, 'base64'));
            return soubor;
        },

        async zavri() {
            try { await posli('Target.closeTarget', { targetId }); } catch { /* končíme */ }
            ws.close();
            proces.kill();
            try { fs.rmSync(profil, { recursive: true, force: true }); } catch { /* zbytek profilu */ }
        },
    };
}

module.exports = { otevriProhlizec, pauza };
