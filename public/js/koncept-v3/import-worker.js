/**
 * Worker pro rozpoznávání stěn z výkresu.
 *
 * Analýza velkých SVG (desítky MB) trvá vteřiny — ve workeru přitom
 * nezamrzne průvodce ani editor.
 */
// Verze se přebírá z adresy workeru — bez ní by prohlížeč mohl donekonečna
// podávat starý analyzátor z cache (a změny v rozpoznávání by se neprojevily).
const _verze = new URL(self.location.href).searchParams.get('v') || '';
importScripts('/js/koncept-v3/import-analyza.js' + (_verze ? '?v=' + _verze : ''));

self.onmessage = (zprava) => {
    const { svg, nast } = zprava.data || {};
    try {
        const zacatek = Date.now();
        const { varianty, usecekCelkem } = self.ImportAnalyza.navrhniVarianty(svg, nast || {});

        self.postMessage({
            ok: true,
            usecekCelkem,
            cas: (Date.now() - zacatek) / 1000,
            varianty: varianty.map(v => ({
                styl: v.styl,
                osy: v.osy.map(o => ({ x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, tloustka: o.tloustka, obvodova: !!o.obvodova })),
                delka: v.delka,
                skore: v.skore,
                napojenost: v.napojenost,
                plocha: v.plocha,
                // otvory se musí přenést výslovně — odpověď se skládá ručně
                otvory: (v.otvory || []).map(o => ({
                    x: o.x, y: o.y, sirka: o.sirka, tloustka: o.tloustka,
                    typ: o.typ, oblouk: !!o.oblouk,
                })),
            })),
        });
    } catch (e) {
        self.postMessage({ ok: false, chyba: e.message });
    }
};
