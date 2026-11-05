/**
 * Veřejná kalkulačka zeminy: obdélníkový dům na rovině, přesný vzorec bez mřížky (články, modules/blog.md).
 *
 * Záměrně samostatný kód, veřejná stránka nesmí načítat nic z js/koncept-v3. Hodnoty a pravidla odpovídají
 * výpočtu v editoru (modules/zemina.md), shodu hlídá services/import-test/test-kalkulacka-zeminy.cjs.
 * Texty jsou v šabloně clanky/bloky/kalkulacka-zeminy, tady se jen dosazují čísla.
 *
 * Délky v metrech, výšky vůči terénu, objemy v m³.
 */
(function (koren) {
    const VYCHOZI = {
        delka: 12, sirka: 10, typ: 'pasy', sklep: false,
        podDum: 'sterk',    // čím se dosype pod dům: sterk, vykopek
        nadTerenem: 0.3,    // podlaha 1.NP nad terénem
        vnitrni: 10,        // délka vnitřních nosných stěn
        spara: 1.0,         // základová spára pod terénem
        sirkaPasu: 0.5,
        skladba: 0.45,      // tloušťka základu: od podlahy po spodek konstrukce
        ornice: 0.25,
        odkop: 0.8,         // pracovní prostor kolem domu
        svah: 0.5,          // vodorovně na 1 m výšky
        nakypreni: 1.25,
        vyskaSklepu: 3.05,
    };
    const SVISLE_DO = 0.8;          // do této hloubky se výkop svahovat nemusí
    const NABEH_SVAHU = 0.4;        // o tolik hlouběji už má svah plnou šířku
    const PAS_POD_SKLEPEM = 0.5;

    function spocitej(vstup) {
        const v = { ...VYCHOZI, ...(vstup || {}) };
        const plochaDomu = v.delka * v.sirka;
        const obvod = 2 * (v.delka + v.sirka);
        // Plocha obrysu odsazeného o d: rohy jsou čtvrtkruhy
        const plocha = (d) => plochaDomu + obvod * d + Math.PI * d * d;

        const kota = v.sklep ? v.nadTerenem - v.vyskaSklepu : v.nadTerenem;
        const dno = kota - v.skladba;
        const hl = -dno;

        // Spodek základu může být i nad terénem: základ se prodlouží až k domu a víc se dosype
        const sirkaSvahu = hl > SVISLE_DO ? hl * Math.max(v.svah, 0.01) * Math.min(1, (hl - SVISLE_DO) / NABEH_SVAHU) : 0;
        const D = Math.max(hl, v.ornice);

        // Svah: hloubka klesá lineárně od hl k nule, výkopek je část pod ornicí
        let vykopekSvah = 0;
        if (sirkaSvahu > 0 && hl > v.ornice) {
            const U = sirkaSvahu * (1 - v.ornice / hl);
            const c0 = hl - v.ornice, c1 = hl / sirkaSvahu, p0 = obvod + 2 * Math.PI * v.odkop, p1 = 2 * Math.PI;
            vykopekSvah = c0 * p0 * U + (c0 * p1 - c1 * p0) * U * U / 2 - c1 * p1 * U * U * U / 3;
        }

        // Rýhy pasů: beton vyplní celou rýhu, zemina z nich jde do přebytku
        let ryhy = 0;
        if (v.typ === 'pasy') {
            const dnoRyhy = Math.min(-v.spara, dno - (kota < -0.01 ? PAS_POD_SKLEPEM : 0));
            ryhy = Math.max(0, -D - dnoRyhy) * v.sirkaPasu * (obvod + v.vnitrni);
        }

        const vykopekZona = Math.max(0, D - v.ornice);
        const orniceVykop = v.ornice * plocha(v.odkop + sirkaSvahu);
        const orniceZpet = v.ornice * (plocha(v.odkop + sirkaSvahu) - plochaDomu);
        const vykopekVykop = vykopekZona * plocha(v.odkop) + vykopekSvah + ryhy;
        // Kolem domu se vrací všechno. Pod domem se dosype po spodek konstrukce, štěrkem nebo vhodným výkopkem.
        const dosypani = Math.max(0, dno + D) * plochaDomu;
        const vykopekZpet = vykopekZona * (plocha(v.odkop) - plochaDomu) + vykopekSvah + (v.podDum === 'vykopek' ? dosypani : 0);

        return {
            ornice: {
                vykopano: orniceVykop, zpet: orniceZpet, prebytek: orniceVykop - orniceZpet,
                prebytekNakypreny: (orniceVykop - orniceZpet) * v.nakypreni,
            },
            vykopek: {
                vykopano: vykopekVykop, zpet: vykopekZpet, prebytek: vykopekVykop - vykopekZpet,
                prebytekNakypreny: (vykopekVykop - vykopekZpet) * v.nakypreni, ryhy,
            },
            sterk: v.podDum === 'vykopek' ? 0 : dosypani,
            hromada: (orniceVykop + vykopekVykop) * v.nakypreni,
        };
    }

    /** Hodnota z pole: čárka i tečka, mimo rozsah se srovná na mez, prázdné pole dá výchozí hodnotu. */
    function hodnotaPole(pole, meritko, vychozi) {
        const cislo = parseFloat(String(pole.value).replace(',', '.'));
        if (!Number.isFinite(cislo)) return vychozi;
        const min = pole.min === '' ? -Infinity : parseFloat(pole.min);
        const max = pole.max === '' ? Infinity : parseFloat(pole.max);
        return Math.min(max, Math.max(min, cislo)) * meritko;
    }

    function pripoj(blok) {
        const format = new Intl.NumberFormat(document.documentElement.lang || 'cs', { maximumFractionDigits: 0 });
        const zapis = (klic, hodnota) => {
            const prvek = blok.querySelector(`[data-v="${klic}"]`);
            if (prvek) prvek.textContent = format.format(Math.max(0, hodnota));
        };
        const ukaz = (klic, ano) => {
            blok.querySelectorAll(`[data-ukaz="${klic}"]`).forEach((prvek) => { prvek.hidden = !ano; });
        };

        const prepocet = () => {
            const vstup = {};
            blok.querySelectorAll('[data-pole]').forEach((pole) => {
                const klic = pole.dataset.pole;
                if (pole.tagName === 'SELECT') vstup[klic] = klic === 'sklep' ? pole.value === 'ano' : pole.value;
                else vstup[klic] = hodnotaPole(pole, parseFloat(pole.dataset.meritko || '1'), VYCHOZI[klic]);
            });
            blok.querySelectorAll('[data-pouze-sklep]').forEach((prvek) => { prvek.hidden = !vstup.sklep; });
            blok.querySelectorAll('[data-pouze-pasy]').forEach((prvek) => { prvek.hidden = vstup.typ !== 'pasy'; });

            const r = spocitej(vstup);
            zapis('ornice-navic', r.ornice.prebytek);
            zapis('ornice-navic-nakypreny', r.ornice.prebytekNakypreny);
            const chybi = r.vykopek.prebytek < -0.5;
            ukaz('vykopek-navic', !chybi);
            ukaz('vykopek-chybi', chybi);
            zapis('vykopek-navic', r.vykopek.prebytek);
            zapis('vykopek-navic-nakypreny', r.vykopek.prebytekNakypreny);
            zapis('vykopek-chybi', -r.vykopek.prebytek);
            zapis('ornice-vykopano', r.ornice.vykopano);
            zapis('ornice-zpet', r.ornice.zpet);
            zapis('vykopek-vykopano', r.vykopek.vykopano);
            zapis('vykopek-zpet', r.vykopek.zpet);
            zapis('celkem-vykopano', r.ornice.vykopano + r.vykopek.vykopano);
            zapis('celkem-zpet', r.ornice.zpet + r.vykopek.zpet);
            zapis('celkem-zbude', Math.max(0, r.ornice.prebytek) + Math.max(0, r.vykopek.prebytek));
            zapis('sterk', r.sterk);
            ukaz('sterk', r.sterk > 0.5);
            zapis('hromada', r.hromada);
            return r;
        };

        // Nosná deska má silnější skladbu než podlaha na pasech, výchozí hodnota se mění, dokud ji uživatel sám nepřepíše
        const skladba = blok.querySelector('[data-pole="skladba"]');
        const typ = blok.querySelector('[data-pole="typ"]');
        skladba.addEventListener('input', () => { skladba.dataset.zmeneno = '1'; });
        typ.addEventListener('change', () => {
            if (!skladba.dataset.zmeneno) skladba.value = typ.value === 'deska' ? skladba.dataset.vychoziDeska : skladba.dataset.vychoziPasy;
        });

        let hlaseno = false;
        const priZmene = () => {
            prepocet();
            if (hlaseno) return;
            hlaseno = true;
            window.gtag?.('event', 'kalkulacka_pouzita', { kalkulacka: 'zemina', clanek: blok.dataset.clanek || '' });
        };
        blok.addEventListener('input', priZmene);
        blok.addEventListener('change', priZmene);
        blok.addEventListener('submit', (e) => e.preventDefault());
        prepocet();
    }

    const Kalkulacka = { VYCHOZI, spocitej };
    koren.KalkulackaZeminy = Kalkulacka;
    if (typeof document !== 'undefined') {
        document.querySelectorAll('[data-kalkulacka="zemina"]').forEach(pripoj);
    }
})(typeof window !== 'undefined' ? window : globalThis);
