<x-layouts.app title="SEO 404 — TupTuDu">
    <div>
        <div class="mb-4">
            <h1 class="text-2xl font-bold text-gray-800">404 — ztracené URL</h1>
            <p class="text-sm text-gray-500 mt-1">
                Neexistující URL, na které někdo přišel. Užitečné pro identifikaci ztracených SEO stránek
                (= staré URL z Google indexu nebo zlomené odkazy po migraci).
            </p>
        </div>

        {{-- Horní záložky — sdílené s /masterteam/bugy --}}
        <div class="mb-4">
            @include('masterteam.partials.bugy-navigace', ['aktivni' => 'ztraceno'])
        </div>

        {{-- Statistiky --}}
        <div class="mb-4 grid grid-cols-3 gap-3">
            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div class="text-xs text-gray-500">Unikátních URL</div>
                <div class="text-2xl font-bold text-gray-800">{{ $statistiky['unique'] }}</div>
            </div>
            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div class="text-xs text-gray-500">Celkem výskytů</div>
                <div class="text-2xl font-bold text-gray-800">{{ $statistiky['celkem_vyskytu'] }}</div>
            </div>
            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div class="text-xs text-gray-500">Aktivních za 24 h</div>
                <div class="text-2xl font-bold text-primary">{{ $statistiky['za_24h'] }}</div>
            </div>
        </div>

        {{-- Filtry: zdroj + kdo + řazení --}}
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
                <span class="px-2 py-1.5 text-xs text-gray-500 uppercase">Zdroj</span>
                @foreach([
                    'externi' => 'Externí odkazy',
                    'direct' => 'Bez refereru',
                    'interni' => 'Z našeho webu',
                    'vse' => 'Vše',
                ] as $val => $label)
                    <a href="?zdroj={{ $val }}&kdo={{ $kdo }}&razeni={{ $razeni }}"
                       class="rounded-md px-3 py-1.5 transition {{ $zdroj === $val ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50' }}">
                        {{ $label }}
                    </a>
                @endforeach
            </div>
            <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
                <span class="px-2 py-1.5 text-xs text-gray-500 uppercase">Kdo</span>
                @foreach([
                    'lide' => 'Lidé',
                    'boti' => 'Boti',
                    'vse' => 'Vše',
                ] as $val => $label)
                    <a href="?zdroj={{ $zdroj }}&kdo={{ $val }}&razeni={{ $razeni }}"
                       class="rounded-md px-3 py-1.5 transition {{ $kdo === $val ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-50' }}">
                        {{ $label }}
                    </a>
                @endforeach
            </div>
            <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
                <span class="px-2 py-1.5 text-xs text-gray-500 uppercase">Řazení</span>
                @foreach([
                    'pocet' => 'Počet',
                    'naposledy' => 'Naposledy',
                    'prvni' => 'Poprvé',
                ] as $val => $label)
                    <a href="?zdroj={{ $zdroj }}&kdo={{ $kdo }}&razeni={{ $val }}"
                       class="rounded-md px-3 py-1.5 transition {{ $razeni === $val ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-50' }}">
                        {{ $label }}
                    </a>
                @endforeach
            </div>
        </div>

        @if($zaznamy->isEmpty())
            <div class="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
                Žádné 404 záznamy.
            </div>
        @else
            <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                            <th class="px-4 py-2">URI</th>
                            <th class="px-4 py-2">Referer</th>
                            <th class="px-4 py-2 text-right">Počet</th>
                            <th class="px-4 py-2">Poprvé</th>
                            <th class="px-4 py-2">Naposledy</th>
                            <th class="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        @foreach($zaznamy as $z)
                            <tr class="hover:bg-gray-50" id="seo404-{{ $z->id }}">
                                <td class="px-4 py-2 align-top">
                                    <a href="{{ $z->uri }}" target="_blank" class="text-primary hover:underline break-all">
                                        {{ \Illuminate\Support\Str::limit($z->uri, 80) }}
                                    </a>
                                    <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                        @if($z->jeBot())
                                            <span class="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">🤖 bot</span>
                                        @else
                                            <span class="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">👤 člověk</span>
                                        @endif
                                        @if($z->user_agent)
                                            <span class="truncate">{{ \Illuminate\Support\Str::limit($z->user_agent, 30) }}</span>
                                        @endif
                                    </div>
                                </td>
                                <td class="px-4 py-2 align-top text-gray-600 break-all">
                                    @if($z->referer)
                                        <a href="{{ $z->referer }}" target="_blank" class="hover:underline">
                                            {{ \Illuminate\Support\Str::limit($z->referer, 60) }}
                                        </a>
                                    @else
                                        <span class="text-gray-400">—</span>
                                    @endif
                                </td>
                                <td class="px-4 py-2 align-top text-right font-bold text-gray-800">
                                    {{ $z->pocet_vyskytu }}
                                </td>
                                <td class="px-4 py-2 align-top text-gray-500 whitespace-nowrap">
                                    {{ $z->prvni_v?->diffForHumans() }}
                                </td>
                                <td class="px-4 py-2 align-top text-gray-500 whitespace-nowrap">
                                    {{ $z->naposledy_v?->diffForHumans() }}
                                </td>
                                <td class="px-4 py-2 align-top text-right">
                                    <button type="button"
                                            onclick="smazat404({{ $z->id }})"
                                            class="text-xs text-gray-400 hover:text-red-600">
                                        Smazat
                                    </button>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            <div class="mt-4">{{ $zaznamy->links() }}</div>
        @endif
    </div>

    <script>
        async function smazat404(id) {
            if (!confirm('Smazat tento záznam?')) return;
            const r = await fetch('/masterteam/seo-404/' + id, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'Accept': 'application/json',
                },
            });
            if (r.ok) {
                document.getElementById('seo404-' + id)?.remove();
            } else {
                chybaUzivateli('neznámý důvod', 'Smazání záznamu SEO 404');
            }
        }
    </script>
</x-layouts.app>
