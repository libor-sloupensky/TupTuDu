<x-layouts.app :title="'Chyba #' . $chyba->id . ' — Kalkulio'">
    <div class="mx-auto" style="max-width: 60rem;">
        <div class="mb-4">
            <a href="{{ route('masterteam.chyby') }}" class="text-sm text-gray-500 hover:text-primary">← Zpět na seznam</a>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div class="mb-4 flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-xs px-2 py-0.5 rounded {{ $chyba->typ === 'server' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700' }}">
                            {{ $chyba->typ === 'server' ? '🖥 Server' : '💻 Klient' }}
                        </span>
                        <span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{{ ucfirst($chyba->uroven) }}</span>
                        @if($chyba->opraveno)
                            <span class="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">✓ Opraveno</span>
                        @endif
                    </div>
                    <h1 class="text-lg font-bold text-gray-800 break-words">{{ $chyba->zprava }}</h1>
                    @if($chyba->soubor)
                        <p class="text-xs text-gray-500 font-mono mt-1">{{ $chyba->soubor }}</p>
                    @endif
                </div>
                <div class="flex-shrink-0 flex gap-2">
                    @unless($chyba->opraveno)
                        <button type="button" onclick="oznacOpraveno()"
                                class="text-sm px-3 py-1.5 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition">
                            ✓ Opraveno
                        </button>
                    @endunless
                    <button type="button" onclick="smazat()"
                            class="text-sm px-3 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 transition">
                        Smazat
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div><strong class="text-gray-800">Počet výskytů:</strong> {{ $chyba->pocet_vyskytu }}×</div>
                <div><strong class="text-gray-800">První výskyt:</strong> {{ $chyba->zacatek_v?->format('d.m.Y H:i:s') }}</div>
                <div><strong class="text-gray-800">URL:</strong> <span class="break-all text-xs">{{ $chyba->uri ?: '—' }}</span></div>
                <div><strong class="text-gray-800">Naposledy:</strong> {{ $chyba->naposledy_v?->format('d.m.Y H:i:s') }} ({{ $chyba->naposledy_v?->diffForHumans() }})</div>
                <div><strong class="text-gray-800">Metoda:</strong> {{ $chyba->metoda ?: '—' }}</div>
                <div><strong class="text-gray-800">Uživatel:</strong>
                    @if($chyba->uzivatel)
                        {{ $chyba->uzivatel->celeJmeno() ?: $chyba->uzivatel->email }}
                    @else
                        <span class="text-gray-400">Anonymní</span>
                    @endif
                </div>
                <div><strong class="text-gray-800">IP:</strong> <span class="font-mono text-xs">{{ $chyba->ip ?: '—' }}</span></div>
                <div><strong class="text-gray-800">User Agent:</strong> <span class="text-xs break-all">{{ \Illuminate\Support\Str::limit($chyba->user_agent, 60) }}</span></div>
            </div>

            @if($chyba->opraveno)
                <div class="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    Označeno jako opraveno {{ $chyba->opraveno_v?->format('d.m.Y H:i') }}
                    @if($chyba->opravil)
                        uživatelem {{ $chyba->opravil->jmeno }}
                    @endif
                </div>
            @endif
        </div>

        @if($chyba->stack_trace)
            <div class="bg-white rounded-lg border border-gray-200 p-6">
                <h2 class="text-sm font-bold text-gray-800 mb-3">Stack trace</h2>
                <pre class="text-xs text-gray-700 bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap break-words">{{ $chyba->stack_trace }}</pre>
            </div>
        @endif
    </div>

    <script>
        async function oznacOpraveno() {
            const resp = await fetch(`/masterteam/chyby/{{ $chyba->id }}/opraveno`, {
                method: 'PATCH',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
                    'Accept': 'application/json',
                },
            });
            if (resp.ok) location.reload();
        }
        async function smazat() {
            if (!confirm('Skutečně smazat tento záznam chyby?')) return;
            const resp = await fetch(`/masterteam/chyby/{{ $chyba->id }}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
                    'Accept': 'application/json',
                },
            });
            if (resp.ok) window.location.href = '{{ route('masterteam.chyby') }}';
        }
    </script>
</x-layouts.app>
