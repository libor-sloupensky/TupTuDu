<x-layouts.app title="Statistiky — TupTuDu">
    {{-- Chart.js jen na této stránce, ne v layoutu (30 kB gzip). --}}
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>

    <div class="space-y-6">
        <h1 class="text-2xl font-bold text-gray-800">Statistiky</h1>

        {{-- Návštěvy — vložený přehled z Looker Studia nad GA4 --}}
        <section class="rounded-lg border border-gray-200 bg-white p-5">
            <div class="mb-3 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900">Návštěvy webu</h2>
                <a href="https://analytics.google.com/analytics/web/#/p561796471/reports/intelligenthome"
                   target="_blank" rel="noopener"
                   class="text-xs text-gray-500 hover:text-primary">
                    Otevřít v GA →
                </a>
            </div>
            @if ($lookerUrl)
                {{-- Poměr 12/5.15 = o 3 % víc než plátno přehledu 1200×500, místo na lištu
                     Looker Studia. Bez toho vznikne svislý posuvník a bere kolečko myši. --}}
                <iframe
                    src="{{ $lookerUrl }}"
                    frameborder="0"
                    style="width: 100%; aspect-ratio: 12/5.15; max-height: 465px; border: 0;"
                    allowfullscreen
                    sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox">
                </iframe>
            @else
                <div class="rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                    Přehled návštěv zatím není připojený (chybí <code>LOOKER_NAVSTEVY_URL</code>).
                </div>
            @endif
            <p class="mt-2 text-xs text-gray-400">
                Měří se od 1. 11. 2026 a jen návštěvníci, kteří souhlasili s analytickými cookies.
            </p>
        </section>

        {{-- Registrace a platící — vlastní data --}}
        <section class="rounded-lg border border-gray-200 bg-white p-5"
                 x-data="grafRegistraci()"
                 x-init="nacti(30)">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-lg font-semibold text-gray-900">Registrace a platící</h2>
                <label class="flex items-center gap-2 text-sm">
                    <span class="text-gray-600">Rozsah:</span>
                    <select x-model.number="dnu"
                            @change="nacti(dnu)"
                            class="rounded border-gray-300 py-1 pl-2 pr-8 text-sm">
                        <option value="7">7 dní</option>
                        <option value="30">30 dní</option>
                        <option value="90">90 dní</option>
                        <option value="365">365 dní</option>
                        <option value="0">Celé období</option>
                    </select>
                </label>
            </div>

            <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="rounded border border-gray-100 bg-gray-50 p-3">
                    <div class="text-xs uppercase tracking-wider text-gray-500">Registrace za období</div>
                    <div class="mt-0.5 text-2xl font-bold text-primary-dark" x-text="celkem">–</div>
                    <div class="text-xs text-gray-500">průměr <span x-text="prumer">–</span> denně</div>
                </div>
                <div class="rounded border border-gray-100 bg-gray-50 p-3">
                    <div class="text-xs uppercase tracking-wider text-gray-500">Uživatelů celkem</div>
                    <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="uzivatelu">–</div>
                </div>
                <div class="rounded border border-gray-100 bg-gray-50 p-3">
                    <div class="text-xs uppercase tracking-wider text-gray-500">Platících teď</div>
                    <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="platiciTed">–</div>
                    <div class="text-xs text-gray-500"><span x-text="podil">–</span> uživatelů</div>
                </div>
                <div class="rounded border border-gray-100 bg-gray-50 p-3">
                    <div class="text-xs uppercase tracking-wider text-gray-500">Tržby za období</div>
                    <div class="mt-0.5 text-2xl font-bold text-gray-900" x-text="trzby">–</div>
                    <div class="text-xs text-gray-500">bez DPH</div>
                </div>
            </div>

            <div style="position: relative; height: 300px;">
                <canvas id="grafRegistraci"></canvas>
            </div>

            <p class="mt-2 text-xs text-gray-500">
                Bez master týmu. Platící = zákazníci s běžícím předplatným ke konci dne (pravá osa).
                Tržby jsou před odečtením poplatků Paddlu a vrácených plateb.
            </p>
            <p x-show="loading" class="mt-2 text-xs text-gray-400">Načítám…</p>
        </section>
    </div>

    <script>
        // Graf registrací — Alpine.js komponenta. `nacti(dnu)` zavolá JSON endpoint a překreslí graf:
        // sloupce = registrace za den, čáry = klouzavé průměry, schodová čára = počet platících (pravá osa).
        function grafRegistraci() {
            // Barvy jen z CSS proměnných značky (public/css/app.css), žádný hex.
            const barva = (promenna, pruhlednost = 1) => {
                const hodnota = getComputedStyle(document.documentElement).getPropertyValue(promenna).trim();
                return pruhlednost === 1 ? hodnota : `color-mix(in srgb, ${hodnota} ${pruhlednost * 100}%, transparent)`;
            };
            const sklonuj = (n, jedna, dveAzCtyri, vice) => `${n} ${n === 1 ? jedna : (n >= 2 && n <= 4 ? dveAzCtyri : vice)}`;
            const castka = (hodnota, mena) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: mena, maximumFractionDigits: 0 }).format(hodnota);

            return {
                dnu: 30,
                celkem: '–',
                prumer: '–',
                uzivatelu: '–',
                platiciTed: '–',
                podil: '–',
                trzby: '–',
                loading: false,
                chart: null,

                async nacti(dnu) {
                    this.loading = true;
                    try {
                        const r = await fetch(`{{ route('masterteam.statistiky.registrace') }}?dnu=${dnu}`, {
                            headers: { 'Accept': 'application/json' },
                        });
                        if (!r.ok) throw new Error('HTTP ' + r.status);
                        const d = await r.json();

                        this.celkem = d.celkem;
                        this.prumer = String(d.prumer_den).replace('.', ',');
                        this.uzivatelu = d.uzivatelu;
                        this.platiciTed = d.platici_ted;
                        this.podil = d.uzivatelu > 0
                            ? (Math.round(d.platici_ted / d.uzivatelu * 1000) / 10 + ' %').replace('.', ',')
                            : '–';
                        const meny = Object.entries(d.trzby || {});
                        this.trzby = meny.length ? meny.map(([mena, hodnota]) => castka(hodnota, mena)).join(' + ') : castka(0, 'CZK');

                        const ctx = document.getElementById('grafRegistraci');
                        if (this.chart) this.chart.destroy();
                        // Graf v lokální proměnné — Chart.js uvnitř Alpine proxy (this.chart) při update() zlobí
                        const chart = new Chart(ctx, {
                            data: {
                                labels: d.labels,
                                datasets: [
                                    {
                                        type: 'bar',
                                        label: 'Registrace',
                                        data: d.registrace,
                                        backgroundColor: barva('--c-primary', 0.75),
                                        borderRadius: 2,
                                        maxBarThickness: 24,
                                        order: 3,
                                        pointStyle: 'rect', // v legendě čtvereček (sloupce)
                                    },
                                    {
                                        type: 'line',
                                        label: '7denní průměr',
                                        data: d.klouzavy_7,
                                        borderColor: barva('--c-primary-text'),
                                        backgroundColor: barva('--c-primary-text'),
                                        borderWidth: 2,
                                        pointStyle: 'line', // v legendě čára
                                        pointRadius: 0,
                                        pointHoverRadius: 4,
                                        tension: 0.35,
                                        order: 2,
                                    },
                                    {
                                        type: 'line',
                                        label: '30denní průměr',
                                        data: d.klouzavy_30,
                                        borderColor: barva('--c-text'),
                                        backgroundColor: barva('--c-text'),
                                        borderWidth: 2,
                                        pointStyle: 'line',
                                        pointRadius: 0,
                                        pointHoverRadius: 4,
                                        tension: 0.35,
                                        order: 1,
                                    },
                                    {
                                        type: 'line',
                                        label: 'Platící',
                                        data: d.platici,
                                        yAxisID: 'platici',
                                        stepped: true, // stav ke konci dne, ne plynulá změna
                                        borderColor: barva('--c-ok'),
                                        backgroundColor: barva('--c-ok'),
                                        borderWidth: 2,
                                        pointStyle: 'line',
                                        pointRadius: 0,
                                        pointHoverRadius: 4,
                                        order: 0,
                                    },
                                ],
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                interaction: { intersect: false, mode: 'index' },
                                plugins: {
                                    legend: {
                                        display: true,
                                        position: 'top',
                                        align: 'end',
                                        reverse: true, // pořadí jako ve výčtu řad: registrace, průměry, platící
                                        labels: { usePointStyle: true, pointStyleWidth: 28, boxHeight: 8, font: { size: 11 } },
                                    },
                                    tooltip: {
                                        callbacks: {
                                            title: (items) => items[0]?.label ?? '',
                                            label: (item) => {
                                                const val = item.parsed.y;
                                                if (item.dataset.yAxisID === 'platici') return `Platící: ${val}`;
                                                return item.dataset.type === 'line'
                                                    ? `${item.dataset.label}: ${val.toFixed(1).replace('.', ',')}`
                                                    : sklonuj(val, 'registrace', 'registrace', 'registrací');
                                            },
                                        },
                                    },
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        suggestedMax: 4,
                                        ticks: { stepSize: 1, precision: 0 },
                                        title: { display: true, text: 'Registrace za den', font: { size: 11 } },
                                    },
                                    platici: {
                                        position: 'right',
                                        beginAtZero: true,
                                        suggestedMax: 4,
                                        ticks: { precision: 0 },
                                        grid: { drawOnChartArea: false },
                                        title: { display: true, text: 'Platících', font: { size: 11 } },
                                    },
                                    x: {
                                        // U delších rozsahů zredukovat popisky, ať se nepřekrývají
                                        ticks: {
                                            maxRotation: 0,
                                            autoSkip: true,
                                            maxTicksLimit: d.dnu <= 30 ? 15 : 12,
                                        },
                                    },
                                },
                            },
                        });
                        this.chart = chart;
                    } catch (e) {
                        chybaUzivateli(e, 'Statistiky: načtení grafu registrací', { dnu });
                    } finally {
                        this.loading = false;
                    }
                },
            };
        }
    </script>
</x-layouts.app>
