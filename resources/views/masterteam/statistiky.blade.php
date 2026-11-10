<x-layouts.app title="Přehled — TupTuDu">
    {{-- Chart.js jen na této stránce, ne v layoutu (30 kB gzip). --}}
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>

    {{-- Jeden přepínač období pro všechny grafy. Každý graf se načítá zvlášť, výpadek jednoho neshodí ostatní. --}}
    <div class="space-y-6" x-data="prehled()" x-init="nactiVse()">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h1 class="text-2xl font-bold text-gray-800">Přehled</h1>
            <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm" role="group" aria-label="Období">
                <template x-for="o in obdobi" :key="o.dnu">
                    <button type="button" @click="dnu = o.dnu; nactiVse()"
                            :class="dnu === o.dnu ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50'"
                            class="rounded-md px-3 py-1.5 transition" x-text="o.nazev"></button>
                </template>
            </div>
        </div>

        {{-- ═══════════════ Návštěvy (GA4) ═══════════════ --}}
        <section class="rounded-lg border border-gray-200 bg-white p-5">
            <div class="mb-3 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900">Návštěvy webu</h2>
                <a href="https://analytics.google.com/analytics/web/#/p{{ config('services.google_api.ga4_sluzba') }}/reports/intelligenthome"
                   target="_blank" rel="noopener" class="text-xs text-gray-500 hover:text-primary">Otevřít v GA →</a>
            </div>
            @if ($googleNastaven)
                <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div class="rounded border border-gray-100 bg-gray-50 p-3">
                        <div class="text-xs uppercase tracking-wider text-gray-500">Návštěvníků</div>
                        <div class="mt-0.5 text-2xl font-bold text-primary-dark" x-text="nav.navstevnici">–</div>
                    </div>
                    <div class="rounded border border-gray-100 bg-gray-50 p-3">
                        <div class="text-xs uppercase tracking-wider text-gray-500">Návštěv</div>
                        <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="nav.relace">–</div>
                    </div>
                    <div class="rounded border border-gray-100 bg-gray-50 p-3">
                        <div class="text-xs uppercase tracking-wider text-gray-500">Zobrazených stránek</div>
                        <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="nav.zobrazeni">–</div>
                    </div>
                    <div class="rounded border border-gray-100 bg-gray-50 p-3">
                        <div class="text-xs uppercase tracking-wider text-gray-500">Registruje se</div>
                        <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="konverze">–</div>
                        <div class="text-xs text-gray-500">návštěvníků</div>
                    </div>
                </div>
                <div style="position: relative; height: 260px;"><canvas id="grafNavstev"></canvas></div>
                <p class="mt-2 text-xs text-gray-500">
                    Měří se od 1. 11. 2026 a jen návštěvníci, kteří souhlasili s analytickými cookies. Skutečná návštěvnost je vyšší.
                </p>
                <p x-show="chyba.navstevy" x-cloak class="mt-2 text-sm text-red-600" x-text="chyba.navstevy"></p>
            @else
                <p class="rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                    Chybí klíč pro čtení z Googlu (<code>GOOGLE_SA_JSON</code>), návštěvy a vyhledávání se nezobrazí.
                </p>
            @endif
        </section>

        {{-- ═══════════════ Registrace a platící (vlastní data) ═══════════════ --}}
        <section class="rounded-lg border border-gray-200 bg-white p-5">
            <h2 class="mb-3 text-lg font-semibold text-gray-900">Registrace a platící</h2>
            <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="rounded border border-gray-100 bg-gray-50 p-3">
                    <div class="text-xs uppercase tracking-wider text-gray-500">Registrace za období</div>
                    <div class="mt-0.5 text-2xl font-bold text-primary-dark" x-text="reg.celkem">–</div>
                    <div class="text-xs text-gray-500">průměr <span x-text="reg.prumer">–</span> denně</div>
                </div>
                <div class="rounded border border-gray-100 bg-gray-50 p-3">
                    <div class="text-xs uppercase tracking-wider text-gray-500">Uživatelů celkem</div>
                    <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="reg.uzivatelu">–</div>
                </div>
                <div class="rounded border border-gray-100 bg-gray-50 p-3">
                    <div class="text-xs uppercase tracking-wider text-gray-500">Platících teď</div>
                    <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="reg.platiciTed">–</div>
                    <div class="text-xs text-gray-500"><span x-text="reg.podil">–</span> uživatelů</div>
                </div>
                <div class="rounded border border-gray-100 bg-gray-50 p-3">
                    <div class="text-xs uppercase tracking-wider text-gray-500">Tržby za období</div>
                    <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="reg.trzby">–</div>
                    <div class="text-xs text-gray-500">bez DPH</div>
                </div>
            </div>
            <div style="position: relative; height: 300px;"><canvas id="grafRegistraci"></canvas></div>
            <p class="mt-2 text-xs text-gray-500">
                Bez master týmu. Platící = zákazníci s běžícím předplatným ke konci dne (pravá osa).
                Tržby jsou před odečtením poplatků Paddlu a vrácených plateb.
            </p>
        </section>

        {{-- ═══════════════ Cesta k placení a funkce editoru (vlastní data) ═══════════════ --}}
        <section class="rounded-lg border border-gray-200 bg-white p-5">
            <div class="grid gap-8 md:grid-cols-2">
                <div>
                    <h2 class="mb-1 text-lg font-semibold text-gray-900">Cesta k placení</h2>
                    <p class="mb-3 text-xs text-gray-500">Uživatelé registrovaní ve zvoleném období a kam až došli.</p>
                    <template x-for="k in cesta.kroky" :key="k.nazev">
                        <div class="mb-2">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-700" x-text="k.nazev"></span>
                                <span class="text-gray-900"><strong x-text="k.pocet"></strong> <span class="text-xs text-gray-500" x-text="k.podil"></span></span>
                            </div>
                            <div class="mt-1 h-2 rounded bg-gray-100"><div class="h-2 rounded bg-primary" :style="`width: ${k.sirka}%`"></div></div>
                        </div>
                    </template>
                </div>
                <div>
                    <h2 class="mb-1 text-lg font-semibold text-gray-900">Funkce editoru</h2>
                    <p class="mb-3 text-xs text-gray-500">Kolikrát se funkce použila, jeden prohlížeč nejvýš jednou za den. Měří se od nasazení měření.</p>
                    <template x-for="f in cesta.funkce" :key="f.nazev">
                        <div class="mb-2">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-700" x-text="f.nazev"></span>
                                <strong class="text-gray-900" x-text="f.pocet"></strong>
                            </div>
                            <div class="mt-1 h-2 rounded bg-gray-100"><div class="h-2 rounded bg-primary/60" :style="`width: ${f.sirka}%`"></div></div>
                        </div>
                    </template>
                </div>
            </div>
            <p x-show="chyba.cesta" x-cloak class="mt-2 text-sm text-red-600" x-text="chyba.cesta"></p>
        </section>

        {{-- ═══════════════ Vyhledávání a indexace (Search Console) ═══════════════ --}}
        @if ($googleNastaven)
            <section class="rounded-lg border border-gray-200 bg-white p-5">
                <div class="mb-3 flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-gray-900">Vyhledávání Google</h2>
                    <a href="https://search.google.com/search-console?resource_id={{ urlencode(config('services.google_api.gsc_web')) }}"
                       target="_blank" rel="noopener" class="text-xs text-gray-500 hover:text-primary">Otevřít v Search Console →</a>
                </div>
                <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div class="rounded border border-gray-100 bg-gray-50 p-3">
                        <div class="text-xs uppercase tracking-wider text-gray-500">Zobrazení ve výsledcích</div>
                        <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="vyh.zobrazeni">–</div>
                    </div>
                    <div class="rounded border border-gray-100 bg-gray-50 p-3">
                        <div class="text-xs uppercase tracking-wider text-gray-500">Kliknutí</div>
                        <div class="mt-0.5 text-2xl font-bold text-primary-dark" x-text="vyh.kliknuti">–</div>
                    </div>
                    <div class="rounded border border-gray-100 bg-gray-50 p-3">
                        <div class="text-xs uppercase tracking-wider text-gray-500">Průměrná pozice</div>
                        <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="vyh.pozice">–</div>
                    </div>
                    <div class="rounded border border-gray-100 bg-gray-50 p-3">
                        <div class="text-xs uppercase tracking-wider text-gray-500">V indexu Google</div>
                        <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="vyh.index">–</div>
                        <div class="text-xs text-gray-500" x-text="vyh.zkontrolovano"></div>
                    </div>
                </div>

                <div style="position: relative; height: 240px;"><canvas id="grafVyhledavani"></canvas></div>
                <p class="mt-2 text-xs text-gray-500">Poslední dva až tři dny Search Console teprve dopočítává.</p>

                <h3 class="mb-2 mt-6 text-sm font-semibold text-gray-900">Indexace stránek ze sitemapy</h3>
                <div style="position: relative; height: 200px;"><canvas id="grafIndexace"></canvas></div>
                <p class="mt-2 text-xs text-gray-500">
                    Počet se zjišťuje jednou denně dotazem na každou adresu, graf se plní ode dne první kontroly.
                </p>

                <details x-show="vyh.chybi.length" x-cloak class="mt-3 text-sm">
                    <summary class="cursor-pointer text-gray-700">
                        Stránky mimo index (<span x-text="vyh.chybi.length"></span>)
                    </summary>
                    <table class="mt-2 w-full text-left text-xs">
                        <thead class="text-gray-500">
                            <tr><th class="py-1 pr-3 font-medium">Adresa</th><th class="py-1 pr-3 font-medium">Stav podle Googlu</th><th class="py-1 font-medium">Robot naposledy</th></tr>
                        </thead>
                        <tbody>
                            <template x-for="u in vyh.chybi" :key="u.adresa">
                                <tr class="border-t border-gray-100">
                                    <td class="py-1 pr-3"><a :href="u.adresa" target="_blank" rel="noopener" class="hover:text-primary" x-text="u.adresa.replace('https://www.tuptudu.com', '')"></a></td>
                                    <td class="py-1 pr-3 text-gray-700" x-text="u.stav"></td>
                                    <td class="py-1 text-gray-500" x-text="u.prochazeno || 'ještě ne'"></td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </details>
                <p x-show="chyba.vyhledavani" x-cloak class="mt-2 text-sm text-red-600" x-text="chyba.vyhledavani"></p>
            </section>
        @endif

        <p x-show="nacita > 0" class="text-xs text-gray-400">Načítám…</p>
    </div>

    <script>
        // Přehled — Alpine.js komponenta. `nactiVse()` načte data všech grafů pro zvolené období.
        function prehled() {
            const googleNastaven = @json($googleNastaven);
            const adresy = {
                registrace: @json(route('masterteam.statistiky.registrace')),
                navstevy: @json(route('masterteam.statistiky.navstevy')),
                vyhledavani: @json(route('masterteam.statistiky.vyhledavani')),
                cesta: @json(route('masterteam.statistiky.cesta')),
            };

            // Barvy jen z CSS proměnných značky (public/css/app.css), žádný hex.
            const barva = (promenna, pruhlednost = 1) => {
                const hodnota = getComputedStyle(document.documentElement).getPropertyValue(promenna).trim();
                return pruhlednost === 1 ? hodnota : `color-mix(in srgb, ${hodnota} ${pruhlednost * 100}%, transparent)`;
            };
            const sklonuj = (n, jedna, dveAzCtyri, vice) => `${n} ${n === 1 ? jedna : (n >= 2 && n <= 4 ? dveAzCtyri : vice)}`;
            const cislo = (n) => new Intl.NumberFormat('cs-CZ').format(n);
            const castka = (hodnota, mena) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: mena, maximumFractionDigits: 0 }).format(hodnota);
            const procenta = (cast, celek) => celek > 0 ? (Math.round(cast / celek * 1000) / 10 + ' %').replace('.', ',') : '–';

            const sloupce = (label, data, promenna, dalsi = {}) => ({
                type: 'bar', label, data, backgroundColor: barva(promenna, 0.75), borderRadius: 2, maxBarThickness: 24,
                pointStyle: 'rect', ...dalsi, // v legendě čtvereček
            });
            const cara = (label, data, promenna, dalsi = {}) => ({
                type: 'line', label, data, borderColor: barva(promenna), backgroundColor: barva(promenna), borderWidth: 2,
                pointStyle: 'line', pointRadius: 0, pointHoverRadius: 4, tension: 0.35, ...dalsi, // v legendě čára
            });
            const osa = (text, dalsi = {}) => ({
                beginAtZero: true, suggestedMax: 4, ticks: { precision: 0 },
                title: { display: true, text, font: { size: 11 } }, ...dalsi,
            });

            // Grafy mimo Alpine stav — Chart.js uvnitř Alpine proxy při update() zlobí
            const grafy = {};
            const kresli = (id, dnu, labels, datasets, scales, popisek) => {
                grafy[id]?.destroy();
                grafy[id] = new Chart(document.getElementById(id), {
                    data: { labels, datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { intersect: false, mode: 'index' },
                        plugins: {
                            legend: {
                                position: 'top', align: 'end', reverse: true, // pořadí jako ve výčtu řad
                                labels: { usePointStyle: true, pointStyleWidth: 28, boxHeight: 8, font: { size: 11 } },
                            },
                            tooltip: { callbacks: { label: (item) => item.parsed.y === null ? null : popisek(item) } },
                        },
                        scales: {
                            ...scales,
                            // U delších období zredukovat popisky, ať se nepřekrývají
                            x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: dnu <= 30 ? 15 : 12 } },
                        },
                    },
                });
            };
            const hodnota = (item) => `${item.dataset.label}: ${cislo(item.parsed.y)}`;

            return {
                obdobi: [
                    { dnu: 7, nazev: '7 dní' }, { dnu: 30, nazev: '30 dní' }, { dnu: 90, nazev: '90 dní' },
                    { dnu: 365, nazev: 'Rok' }, { dnu: 0, nazev: 'Vše' },
                ],
                dnu: 30,
                nacita: 0,
                chyba: { navstevy: '', vyhledavani: '', cesta: '' },
                cesta: { kroky: [], funkce: [] },
                nav: { navstevnici: '–', relace: '–', zobrazeni: '–', pocet: null },
                reg: { celkem: '–', prumer: '–', uzivatelu: '–', platiciTed: '–', podil: '–', trzby: '–', pocet: null },
                vyh: { zobrazeni: '–', kliknuti: '–', pozice: '–', index: '–', zkontrolovano: '', chybi: [] },

                // Kolik návštěvníků se zaregistrovalo — jen když jsou obě čísla ze stejného období.
                // Víc registrací než změřených návštěvníků (měření jen se souhlasem) nedává smysl → nic.
                get konverze() {
                    const maSmysl = this.nav.pocet !== null && this.reg.pocet !== null && this.reg.pocet <= this.nav.pocet;
                    return maSmysl ? procenta(this.reg.pocet, this.nav.pocet) : '–';
                },

                nactiVse() {
                    const dnu = this.dnu;
                    this.nav.pocet = this.reg.pocet = null;
                    this.nacti('registrace', dnu, (d) => this.ukazRegistrace(d));
                    this.nacti('cesta', dnu, (d) => this.ukazCestu(d));
                    if (googleNastaven) {
                        this.nacti('navstevy', dnu, (d) => this.ukazNavstevy(d));
                        this.nacti('vyhledavani', dnu, (d) => this.ukazVyhledavani(d));
                    }
                },

                async nacti(co, dnu, ukaz) {
                    this.nacita++;
                    if (co in this.chyba) this.chyba[co] = '';
                    try {
                        const r = await fetch(`${adresy[co]}?dnu=${dnu}`, { headers: { 'Accept': 'application/json' } });
                        if (!r.ok) throw new Error('HTTP ' + r.status);
                        const d = await r.json();
                        if (dnu === this.dnu) ukaz(d); // mezitím přepnuté období = starou odpověď zahodit
                    } catch (e) {
                        if (co in this.chyba) {
                            // Stránka má vlastní hlášku u grafu → jen tichý zápis do bugů
                            this.chyba[co] = co === 'cesta' ? 'Data se nepodařilo načíst.' : 'Data z Googlu se teď nepodařilo načíst.';
                            window.zalogujChybu?.(e, 'Přehled: načtení grafu ' + co, { dnu });
                        } else {
                            chybaUzivateli(e, 'Přehled: načtení grafu registrací', { dnu });
                        }
                    } finally {
                        this.nacita--;
                    }
                },

                ukazCestu(d) {
                    const registraci = d.kroky[0]?.[1] || 0;
                    const nejvic = Math.max(1, ...d.funkce.map(([, pocet]) => pocet));
                    this.cesta = {
                        kroky: d.kroky.map(([nazev, pocet]) => ({
                            nazev, pocet, podil: registraci > 0 ? procenta(pocet, registraci) : '',
                            sirka: registraci > 0 ? pocet / registraci * 100 : 0,
                        })),
                        funkce: d.funkce.map(([nazev, pocet]) => ({ nazev, pocet, sirka: pocet / nejvic * 100 })),
                    };
                },

                ukazNavstevy(d) {
                    this.nav = {
                        navstevnici: cislo(d.celkem.navstevnici), relace: cislo(d.celkem.relace),
                        zobrazeni: cislo(d.celkem.zobrazeni), pocet: d.celkem.navstevnici,
                    };
                    kresli('grafNavstev', d.dnu, d.labels, [
                        sloupce('Návštěvníci', d.navstevnici, '--c-primary', { order: 2 }),
                        cara('Návštěvy', d.relace, '--c-text', { order: 1 }),
                        cara('Zobrazené stránky', d.zobrazeni, '--c-text-secondary', { order: 0, borderDash: [4, 3], hidden: true }),
                    ], { y: osa('Za den') }, hodnota);
                },

                ukazRegistrace(d) {
                    const meny = Object.entries(d.trzby || {});
                    this.reg = {
                        celkem: d.celkem,
                        prumer: String(d.prumer_den).replace('.', ','),
                        uzivatelu: d.uzivatelu,
                        platiciTed: d.platici_ted,
                        podil: procenta(d.platici_ted, d.uzivatelu),
                        trzby: meny.length ? meny.map(([mena, hodnota]) => castka(hodnota, mena)).join(' + ') : castka(0, 'CZK'),
                        pocet: d.celkem,
                    };
                    kresli('grafRegistraci', d.dnu, d.labels, [
                        sloupce('Registrace', d.registrace, '--c-primary', { order: 3 }),
                        cara('7denní průměr', d.klouzavy_7, '--c-primary-text', { order: 2 }),
                        cara('30denní průměr', d.klouzavy_30, '--c-text', { order: 1 }),
                        // schodově: stav ke konci dne, ne plynulá změna
                        cara('Platící', d.platici, '--c-ok', { order: 0, yAxisID: 'platici', stepped: true, tension: 0 }),
                    ], {
                        y: osa('Registrace za den', { ticks: { stepSize: 1, precision: 0 } }),
                        platici: osa('Platících', { position: 'right', grid: { drawOnChartArea: false } }),
                    }, (item) => {
                        const val = item.parsed.y;
                        if (item.dataset.yAxisID === 'platici') return `Platící: ${val}`;
                        return item.dataset.type === 'line'
                            ? `${item.dataset.label}: ${val.toFixed(1).replace('.', ',')}`
                            : sklonuj(val, 'registrace', 'registrace', 'registrací');
                    });
                },

                ukazVyhledavani(d) {
                    const i = d.indexace;
                    this.vyh = {
                        zobrazeni: cislo(d.celkem.zobrazeni),
                        kliknuti: cislo(d.celkem.kliknuti),
                        pozice: d.celkem.pozice === null ? '–' : String(d.celkem.pozice).replace('.', ','),
                        index: i.adres ? `${i.zaindexovano} z ${i.adres}` : '–',
                        zkontrolovano: i.zkontrolovano ? 'kontrola ' + i.zkontrolovano : 'zatím bez kontroly',
                        chybi: i.chybi,
                    };
                    kresli('grafVyhledavani', d.dnu, d.labels, [
                        sloupce('Kliknutí', d.kliknuti, '--c-primary', { order: 1, yAxisID: 'kliknuti' }),
                        cara('Zobrazení', d.zobrazeni, '--c-text', { order: 0 }),
                    ], {
                        y: osa('Zobrazení'),
                        kliknuti: osa('Kliknutí', { position: 'right', grid: { drawOnChartArea: false } }),
                    }, hodnota);
                    kresli('grafIndexace', d.dnu, d.labels, [
                        cara('V indexu', d.zaindexovano, '--c-ok', { stepped: true, tension: 0, pointRadius: 2, fill: true, backgroundColor: barva('--c-ok', 0.15) }),
                        cara('Adres v sitemapě', d.adres, '--c-text-secondary', { stepped: true, tension: 0, pointRadius: 2, borderDash: [4, 3] }),
                    ], { y: osa('Stránek') }, hodnota);
                },
            };
        }
    </script>
</x-layouts.app>
