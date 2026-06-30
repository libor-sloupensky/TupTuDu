<x-layouts.app title="Chyby — Kalkulio">
    <div>
        <div class="mb-4">
            <h1 class="text-2xl font-bold text-gray-800">Chyby</h1>
            <p class="text-sm text-gray-500 mt-1">
                Backendové i frontendové chyby automaticky zachycené v systému. Deduplikace přes hash —
                stejná chyba 1000× = 1 řádek s počtem výskytů.
            </p>
        </div>

        {{-- Filtry --}}
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
                @foreach(['aktivni' => 'Aktivní', 'opravene' => 'Opravené', 'vse' => 'Vše'] as $val => $label)
                    @php $pocet = $pocty[$val] ?? null; @endphp
                    <a href="?stav={{ $val }}&typ={{ $typ }}"
                       class="rounded-md px-3 py-1.5 transition {{ $filtr === $val ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50' }}">
                        {{ $label }}
                        @if($val === 'aktivni' && $pocty['aktivni'] > 0)
                            <span class="ml-1 text-xs">({{ $pocty['aktivni'] }})</span>
                        @endif
                    </a>
                @endforeach
            </div>
            <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
                @foreach(['vse' => 'Všechny typy', 'server' => 'Server', 'client' => 'Klient (JS)'] as $val => $label)
                    <a href="?stav={{ $filtr }}&typ={{ $val }}"
                       class="rounded-md px-3 py-1.5 transition {{ $typ === $val ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-50' }}">
                        {{ $label }}
                    </a>
                @endforeach
            </div>
        </div>

        @if($chyby->isEmpty())
            <div class="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-gray-400">
                Žádné chyby ✨
            </div>
        @else
            <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                            <th class="px-3 py-2">Typ</th>
                            <th class="px-3 py-2">Zpráva</th>
                            <th class="px-3 py-2">Soubor</th>
                            <th class="px-3 py-2 text-right">Výskyty</th>
                            <th class="px-3 py-2">Naposledy</th>
                            <th class="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        @foreach($chyby as $c)
                            <tr class="hover:bg-gray-50 {{ $c->opraveno ? 'opacity-60' : '' }}">
                                <td class="px-3 py-2">
                                    <span class="text-xs px-2 py-0.5 rounded {{ $c->typ === 'server' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700' }}">
                                        {{ $c->typ === 'server' ? '🖥 Server' : '💻 Klient' }}
                                    </span>
                                </td>
                                <td class="px-3 py-2">
                                    <a href="{{ route('masterteam.chyby.show', $c) }}"
                                       class="text-gray-800 hover:text-primary font-medium truncate block max-w-md" title="{{ $c->zprava }}">
                                        {{ $c->zprava }}
                                    </a>
                                </td>
                                <td class="px-3 py-2 text-xs text-gray-500 font-mono truncate max-w-xs">
                                    {{ $c->soubor ?: '—' }}
                                </td>
                                <td class="px-3 py-2 text-right">
                                    <span class="inline-block min-w-[2rem] {{ $c->pocet_vyskytu > 10 ? 'text-red-600 font-bold' : 'text-gray-600' }}">
                                        {{ $c->pocet_vyskytu }}×
                                    </span>
                                </td>
                                <td class="px-3 py-2 text-xs text-gray-500">
                                    {{ $c->naposledy_v?->diffForHumans() }}
                                </td>
                                <td class="px-3 py-2 text-right">
                                    @if($c->opraveno)
                                        <span class="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                            opraveno
                                        </span>
                                    @else
                                        <button type="button"
                                                onclick="oznacOpraveno({{ $c->id }})"
                                                title="Označit chybu jako opravenou"
                                                class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                                            </svg>
                                            označit jako opravené
                                        </button>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            @if($chyby->hasPages())
                <div class="mt-4">{{ $chyby->links() }}</div>
            @endif
        @endif
    </div>

    <script>
        async function oznacOpraveno(id) {
            const resp = await fetch(`/masterteam/chyby/${id}/opraveno`, {
                method: 'PATCH',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
                    'Accept': 'application/json',
                },
            });
            if (resp.ok) location.reload();
        }
    </script>
</x-layouts.app>
