/**
 * Úložiště katalogu v AWS S3: založení bucketu s veřejným čtením a ověření přístupu, viz modules/katalog.md.
 * Klíče bere z .env (KATALOG_AWS_KEY, KATALOG_AWS_SECRET) a nikdy je nevypisuje. Bez knihoven, jen Node.
 *
 * Spuštění: node services/katalog/s3.cjs zaloz [--bucket=tuptudu-katalog]
 *           node services/katalog/s3.cjs over [--bucket=tuptudu-katalog] [--cizi=bucket]
 * zaloz jde pustit znovu, přepíše nastavení. --cizi ověří, že se klíč do jiného bucketu nedostane.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [prikaz, ...zbytek] = process.argv.slice(2);
const volby = Object.fromEntries(zbytek.map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const env = Object.fromEntries(fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').split(/\r?\n/)
    .map(r => r.match(/^(KATALOG_[A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].trim()]));
const KLIC = env.KATALOG_AWS_KEY, TAJNY = env.KATALOG_AWS_SECRET;
const REGION = 'eu-central-1';
const BUCKET = volby.bucket || 'tuptudu-katalog';
const XMLNS = 'xmlns="http://s3.amazonaws.com/doc/2006-03-01/"';
// Hvězdička smí být v každé adrese jen jedna. Národní domény se doplní sem a zaloz se pustí znovu.
const ADRESY = ['https://tuptudu.com', 'https://*.tuptudu.com', 'http://tuptudu.localhost:*', 'http://*.tuptudu.localhost:8002', 'http://127.0.0.1:*'];
const TEST = '/_test/pristup.txt';

const sha = (d) => crypto.createHash('sha256').update(d).digest('hex');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
const adresa = (bucket, cesta, dotaz) => `https://${bucket}.s3.${REGION}.amazonaws.com${cesta}${dotaz ? '?' + dotaz : ''}`;

/** Podepsaný požadavek (AWS Signature V4). Hodnoty v dotazu musí být bez znaků, které se kódují. */
async function s3(metoda, cesta, dotaz = '', telo = '', bucket = BUCKET) {
    const ted = new Date().toISOString().replace(/[-:]|\.\d+/g, '');
    const obor = `${ted.slice(0, 8)}/${REGION}/s3/aws4_request`;
    const hash = sha(telo);
    const hlavicky = { 'x-amz-content-sha256': hash, 'x-amz-date': ted };
    if (telo) hlavicky['content-md5'] = crypto.createHash('md5').update(telo).digest('base64');
    const podepsat = { ...hlavicky, host: new URL(adresa(bucket, '/')).host };
    const nazvy = Object.keys(podepsat).sort();
    const dotazKan = dotaz.split('&').filter(Boolean).map(c => (c.includes('=') ? c : c + '=')).sort().join('&');
    const kanon = [metoda, cesta, dotazKan, nazvy.map(n => `${n}:${podepsat[n]}\n`).join(''), nazvy.join(';'), hash].join('\n');
    const klic = hmac(hmac(hmac(hmac('AWS4' + TAJNY, ted.slice(0, 8)), REGION), 's3'), 'aws4_request');
    const podpis = crypto.createHmac('sha256', klic).update(['AWS4-HMAC-SHA256', ted, obor, sha(kanon)].join('\n')).digest('hex');
    return fetch(adresa(bucket, cesta, dotaz), {
        method: metoda,
        body: telo || undefined,
        headers: { ...hlavicky, authorization: `AWS4-HMAC-SHA256 Credential=${KLIC}/${obor}, SignedHeaders=${nazvy.join(';')}, Signature=${podpis}` },
    });
}

/** Kód chyby z odpovědi S3, aby šel vypsat bez celého XML. */
const chyba = async (r) => {
    const t = await r.text();
    return `${r.status} ${(t.match(/<Code>(.*?)<\/Code>/) || [])[1] || ''} ${(t.match(/<Message>(.*?)<\/Message>/) || [])[1] || ''}`.trim();
};

async function nastav(nazev, popis, telo) {
    const r = await s3('PUT', '/', nazev, telo);
    if (!r.ok) throw new Error(`${popis}: ${await chyba(r)}`);
    console.log('   OK  ', popis);
}

async function zaloz() {
    const vznik = await s3('PUT', '/', '', `<CreateBucketConfiguration ${XMLNS}><LocationConstraint>${REGION}</LocationConstraint></CreateBucketConfiguration>`);
    if (vznik.ok) console.log('   OK   bucket založen:', BUCKET);
    else {
        const c = await chyba(vznik);
        if (!c.includes('BucketAlreadyOwnedByYou')) throw new Error(`založení: ${c}`);
        console.log('   OK   bucket už je náš:', BUCKET);
    }
    // Veřejné jsou jen soubory přes pravidlo bucketu. Seznam souborů veřejný není, ACL se nepoužívají.
    await nastav('publicAccessBlock', 'veřejné čtení povolené jen přes pravidlo bucketu',
        `<PublicAccessBlockConfiguration ${XMLNS}><BlockPublicAcls>true</BlockPublicAcls><IgnorePublicAcls>true</IgnorePublicAcls><BlockPublicPolicy>false</BlockPublicPolicy><RestrictPublicBuckets>false</RestrictPublicBuckets></PublicAccessBlockConfiguration>`);
    await nastav('policy', 'pravidlo: soubory smí číst každý', JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Sid: 'VerejneCteni', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${BUCKET}/*` }],
    }));
    const pravidla = ADRESY.map(a => `<AllowedOrigin>${a}</AllowedOrigin>`).join('');
    await nastav('cors', 'CORS pro naše adresy',
        `<CORSConfiguration ${XMLNS}><CORSRule>${pravidla}<AllowedMethod>GET</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedHeader>*</AllowedHeader><MaxAgeSeconds>86400</MaxAgeSeconds></CORSRule></CORSConfiguration>`);
    await nastav('tagging', 'štítek projektu pro rozdělení faktury',
        `<Tagging ${XMLNS}><TagSet><Tag><Key>projekt</Key><Value>tuptudu</Value></Tag></TagSet></Tagging>`);
}

async function over() {
    let chyb = 0;
    const kontrola = (popis, ok, detail = '') => {
        if (!ok) chyb++;
        console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
    };
    const zapis = await s3('PUT', TEST, '', 'ok');
    kontrola('klíč smí zapsat soubor', zapis.ok, zapis.ok ? '' : await chyba(zapis));
    const nase = await fetch(adresa(BUCKET, TEST), { headers: { origin: 'https://www.tuptudu.com' } });
    kontrola('kdokoli soubor přečte a naše adresa projde přes CORS', nase.ok && nase.headers.get('access-control-allow-origin') === 'https://www.tuptudu.com', `${nase.status} ${nase.headers.get('access-control-allow-origin')}`);
    const cizi = await fetch(adresa(BUCKET, TEST), { headers: { origin: 'https://example.com' } });
    kontrola('cizí web přes CORS neprojde', !cizi.headers.get('access-control-allow-origin'), String(cizi.headers.get('access-control-allow-origin')));
    const seznam = await fetch(adresa(BUCKET, '/', 'list-type=2'));
    kontrola('seznam souborů veřejný není', seznam.status === 403, String(seznam.status));
    const smaz = await s3('DELETE', TEST);
    kontrola('klíč smí soubor smazat', smaz.ok, String(smaz.status));
    if (volby.cizi) {
        // max-keys=0 nic nevypíše, ani kdyby to prošlo
        const r = await s3('GET', '/', 'list-type=2&max-keys=0', '', volby.cizi);
        kontrola('do jiného bucketu se klíč nedostane', r.status === 403, String(r.status));
    }
    if (chyb) process.exit(1);
}

(async () => {
    if (!KLIC || !TAJNY) throw new Error('V .env chybí KATALOG_AWS_KEY nebo KATALOG_AWS_SECRET');
    if (prikaz === 'zaloz') await zaloz();
    else if (prikaz === 'over') await over();
    else throw new Error('Příkaz: zaloz, nebo over');
})().catch((e) => { console.error('CHYBA', e.message); process.exit(1); });
