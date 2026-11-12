/**
 * Archiv důkazů ke srovnávacím stránkám (modules/srovnani.md, Data a důkazy). Vývojový nástroj, běží lokálně.
 *
 *   node services/konkurence/dukazy.cjs zaloz                     soukromý bucket s verzováním a zámkem objektů
 *   node services/konkurence/dukazy.cjs snimej vstup.json vystup.json [--vlaken=3]
 *        vstup: ["https://…", …]; ke každé adrese celý snímek stránky (JPEG) a HTML do S3,
 *        výstup: { url: { klic, html, sha256, datum, stav } } (stav = HTTP kód nebo chyba)
 *
 * Bucket `tuptudu-katalog-dukazy` (Frankfurt) je SOUKROMÝ: snímky cizích stránek jsou autorská díla, slouží jen jako důkaz.
 * Klíč z .env (KATALOG_AWS_KEY) smí jen do bucketů tuptudu-katalog*, proto ten název. Bez knihoven, Node 24+.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { otevriProhlizec, pauza } = require('../import-test/prohlizec.cjs');

const [prikaz, ...zbytek] = process.argv.slice(2);
const argy = zbytek.filter(a => !a.startsWith('--'));
const volby = Object.fromEntries(zbytek.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const env = Object.fromEntries(fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').split(/\r?\n/)
    .filter(r => /^[A-Z_]+=/.test(r)).map(r => { const i = r.indexOf('='); return [r.slice(0, i), r.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KLIC = env.KATALOG_AWS_KEY, TAJNY = env.KATALOG_AWS_SECRET;
const REGION = 'eu-central-1';
const BUCKET = 'tuptudu-katalog-dukazy';
const XMLNS = 'xmlns="http://s3.amazonaws.com/doc/2006-03-01/"';

const sha = (d) => crypto.createHash('sha256').update(d).digest('hex');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();

/** Podepsaný požadavek (AWS Signature V4), stejně jako services/katalog/s3.cjs. */
async function s3(metoda, cesta, dotaz = '', telo = '', dalsi = {}) {
    const ted = new Date().toISOString().replace(/[-:]|\.\d+/g, '');
    const obor = `${ted.slice(0, 8)}/${REGION}/s3/aws4_request`;
    const hash = sha(telo);
    const hlavicky = { ...dalsi, 'x-amz-content-sha256': hash, 'x-amz-date': ted };
    if (telo && telo.length) hlavicky['content-md5'] = crypto.createHash('md5').update(telo).digest('base64');
    const host = `${BUCKET}.s3.${REGION}.amazonaws.com`;
    const podepsat = { ...hlavicky, host };
    const nazvy = Object.keys(podepsat).sort();
    const dotazKan = dotaz.split('&').filter(Boolean).map(c => (c.includes('=') ? c : c + '=')).sort().join('&');
    const kanon = [metoda, cesta, dotazKan, nazvy.map(n => `${n}:${podepsat[n]}\n`).join(''), nazvy.join(';'), hash].join('\n');
    const k = hmac(hmac(hmac(hmac('AWS4' + TAJNY, ted.slice(0, 8)), REGION), 's3'), 'aws4_request');
    const podpis = crypto.createHmac('sha256', k).update(['AWS4-HMAC-SHA256', ted, obor, sha(kanon)].join('\n')).digest('hex');
    return fetch(`https://${host}${cesta}${dotaz ? '?' + dotaz : ''}`, {
        method: metoda, body: telo && telo.length ? telo : undefined,
        headers: { ...hlavicky, authorization: `AWS4-HMAC-SHA256 Credential=${KLIC}/${obor}, SignedHeaders=${nazvy.join(';')}, Signature=${podpis}` },
    });
}
const chyba = async (r) => { const t = await r.text(); return `${r.status} ${(t.match(/<Code>(.*?)<\/Code>/) || [])[1] || ''}`.trim(); };

async function zaloz() {
    // Zámek objektů jde zapnout jen při založení a sám zapne verzování
    let r = await s3('PUT', '/', '', `<CreateBucketConfiguration ${XMLNS}><LocationConstraint>${REGION}</LocationConstraint></CreateBucketConfiguration>`,
        { 'x-amz-bucket-object-lock-enabled': 'true' });
    if (r.ok) console.log('OK  bucket založen se zámkem objektů:', BUCKET);
    else {
        let c = await chyba(r);
        if (c.includes('AccessDenied')) {
            // Klíč nesmí zapnout zámek objektů: založit bez něj, chrání verzování (smazání nechá starou verzi)
            console.log('POZOR zámek objektů nepovolen, zakládám jen s verzováním');
            r = await s3('PUT', '/', '', `<CreateBucketConfiguration ${XMLNS}><LocationConstraint>${REGION}</LocationConstraint></CreateBucketConfiguration>`);
            c = r.ok ? 'BucketAlreadyOwnedByYou' : await chyba(r);
        }
        if (!c.includes('BucketAlreadyOwnedByYou')) throw new Error('založení: ' + c);
        console.log('OK  bucket už existuje:', BUCKET);
    }
    const nastav = async (nazev, popis, telo) => {
        const x = await s3('PUT', '/', nazev, telo);
        console.log(x.ok ? 'OK ' : 'CHYBA', popis, x.ok ? '' : await chyba(x));
    };
    await nastav('publicAccessBlock', 'vše soukromé', `<PublicAccessBlockConfiguration ${XMLNS}><BlockPublicAcls>true</BlockPublicAcls><IgnorePublicAcls>true</IgnorePublicAcls><BlockPublicPolicy>true</BlockPublicPolicy><RestrictPublicBuckets>true</RestrictPublicBuckets></PublicAccessBlockConfiguration>`);
    await nastav('versioning', 'verzování', `<VersioningConfiguration ${XMLNS}><Status>Enabled</Status></VersioningConfiguration>`);
    // Výchozí ochrana 2 roky v režimu governance: smazat nejde běžně, jen se zvláštním oprávněním
    await nastav('object-lock', 'zámek objektů 2 roky (governance)', `<ObjectLockConfiguration ${XMLNS}><ObjectLockEnabled>Enabled</ObjectLockEnabled><Rule><DefaultRetention><Mode>GOVERNANCE</Mode><Years>2</Years></DefaultRetention></Rule></ObjectLockConfiguration>`);
    await nastav('tagging', 'štítek projektu', `<Tagging ${XMLNS}><TagSet><Tag><Key>projekt</Key><Value>tuptudu</Value></Tag></TagSet></Tagging>`);
    const t = await s3('PUT', '/_test/pristup.txt', '', Buffer.from('test ' + new Date().toISOString()), { 'content-type': 'text/plain' });
    console.log(t.ok ? 'OK  zápis funguje' : 'CHYBA zápis ' + await chyba(t));
    const v = await fetch(`https://${BUCKET}.s3.${REGION}.amazonaws.com/_test/pristup.txt`);
    console.log(v.status === 403 ? 'OK  zvenku nečitelné (403)' : 'POZOR zvenku vrací ' + v.status);
}

async function nahraj(klic, data, typ) {
    for (let i = 0; i < 3; i++) {
        const r = await s3('PUT', '/' + klic.split('/').map(encodeURIComponent).join('/'), '', data, { 'content-type': typ });
        if (r.ok) return;
        if (i === 2) throw new Error('nahrání ' + klic + ': ' + await chyba(r));
        await pauza(1000 * (i + 1));
    }
}

async function snimej() {
    const [vstup, vystup] = argy;
    const adresy = [...new Set(JSON.parse(fs.readFileSync(vstup, 'utf8')))].filter(u => /^https?:\/\//.test(u));
    const hotovo = fs.existsSync(vystup) ? JSON.parse(fs.readFileSync(vystup, 'utf8')) : {};
    const zbyva = adresy.filter(u => !hotovo[u] || !hotovo[u].klic);
    const datum = new Date().toISOString().slice(0, 10);
    console.log(`adres ${adresy.length}, hotových ${adresy.length - zbyva.length}, zbývá ${zbyva.length}`);
    const vlaken = Number(volby.vlaken || 3);
    let index = 0;
    const ulozit = () => fs.writeFileSync(vystup, JSON.stringify(hotovo, null, 1));
    async function pracovnik() {
        const p = await otevriProhlizec({ viditelny: false, sirka: 1366, vyska: 900 });
        try {
            while (index < zbyva.length) {
                const url = zbyva[index++];
                try {
                    let stav = 0;
                    await Promise.race([p.jdiNa(url), pauza(45000)]);
                    await pauza(3500);
                    // Celá stránka: výška obsahu, nejvýš 12 000 px (dlouhé ceníky a nápovědy)
                    const m = await p.cmd('Page.getLayoutMetrics');
                    const vyska = Math.min(12000, Math.ceil((m.cssContentSize || m.contentSize).height));
                    const obr = await p.cmd('Page.captureScreenshot', { format: 'jpeg', quality: 70, captureBeyondViewport: true,
                        clip: { x: 0, y: 0, width: 1366, height: Math.max(900, vyska), scale: 1 } });
                    const html = await p.vyhodnot('document.documentElement.outerHTML');
                    const titulek = await p.vyhodnot('document.title');
                    stav = await p.vyhodnot('(performance.getEntriesByType("navigation")[0] || {}).responseStatus || 0');
                    const jpg = Buffer.from(obr.data, 'base64');
                    const id = sha(url).slice(0, 16);
                    const klic = `${datum}/${id}.jpg`;
                    await nahraj(klic, jpg, 'image/jpeg');
                    await nahraj(`${datum}/${id}.html`, Buffer.from(html), 'text/html; charset=utf-8');
                    hotovo[url] = { klic, html: `${datum}/${id}.html`, sha256: sha(jpg), sha256_html: sha(html), datum, stav, titulek: String(titulek).slice(0, 200) };
                    console.log('OK', stav, url);
                } catch (e) {
                    hotovo[url] = { chyba: String(e.message || e).slice(0, 200), datum };
                    console.log('CHYBA', url, String(e.message || e).slice(0, 120));
                }
                ulozit();
            }
        } finally { await p.zavri(); }
    }
    await Promise.all(Array.from({ length: vlaken }, pracovnik));
    // Manifest dne s otisky, ať jde doložit, že se snímky později neměnily
    const manifest = Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(hotovo).filter(([, v]) => v.datum === datum && v.klic)), null, 1));
    await nahraj(`${datum}/manifest-${Date.now()}.json`, manifest, 'application/json');
    console.log('hotovo, manifest nahrán; chyb', Object.values(hotovo).filter(v => v.chyba).length);
}

(async () => {
    if (prikaz === 'zaloz') await zaloz();
    else if (prikaz === 'snimej') await snimej();
    else console.log('Použití: zaloz | snimej vstup.json vystup.json [--vlaken=3]');
})().catch(e => { console.error(e.message || e); process.exit(1); });
