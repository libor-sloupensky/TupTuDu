<x-layouts.app :title="'Bug #' . $bug->id . ' — TupTuDu'">
    <div class="mx-auto" style="max-width: 60rem;">
        <div class="mb-4">
            <a href="{{ route('masterteam.bugy') }}" class="text-sm text-gray-500 hover:text-primary">← Zpět na seznam</a>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div class="mb-4 flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-xs px-2 py-0.5 rounded {{ $bug->typ === 'server' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700' }}">
                            {{ $bug->typ === 'server' ? '🖥 Server' : '💻 Klient' }}
                        </span>
                        <span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{{ ucfirst($bug->uroven) }}</span>
                        @if($bug->opraveno)
                            <span class="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">✓ Opraveno</span>
                        @endif
                    </div>
                    <h1 class="text-lg font-bold text-gray-800 break-words">{{ $bug->zprava }}</h1>
                    @if($bug->soubor)
                        <p class="text-xs text-gray-500 font-mono mt-1">{{ $bug->soubor }}</p>
                    @endif
                </div>
                <div class="flex-shrink-0 flex gap-2">
                    @unless($bug->opraveno)
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
                <div><strong class="text-gray-800">Počet výskytů:</strong> {{ $bug->pocet_vyskytu }}×</div>
                <div><strong class="text-gray-800">První výskyt:</strong> {{ $bug->zacatek_v?->format('d.m.Y H:i:s') }}</div>
                <div><strong class="text-gray-800">URL:</strong> <span class="break-all text-xs">{{ $bug->uri ?: '—' }}</span></div>
                <div><strong class="text-gray-800">Naposledy:</strong> {{ $bug->naposledy_v?->format('d.m.Y H:i:s') }} ({{ $bug->naposledy_v?->diffForHumans() }})</div>
                <div><strong class="text-gray-800">Metoda:</strong> {{ $bug->metoda ?: '—' }}</div>
                <div><strong class="text-gray-800">Uživatel:</strong>
                    @if($bug->uzivatel)
                        {{ $bug->uzivatel->celeJmeno() ?: $bug->uzivatel->email }}
                    @else
                        <span class="text-gray-400">Anonymní</span>
                    @endif
                </div>
                <div><strong class="text-gray-800">IP:</strong> <span class="font-mono text-xs">{{ $bug->ip ?: '—' }}</span></div>
                <div><strong class="text-gray-800">User Agent:</strong> <span class="text-xs break-all">{{ \Illuminate\Support\Str::limit($bug->user_agent, 60) }}</span></div>
            </div>

            @if(filled($bug->kontext))
                @php
                    // Klient posílá kontext jako JSON text (už odfiltrovaný od citlivých
                    // klíčů), server jako pole — obojí zobrazit čitelně odsazené.
                    $kontext = $bug->kontext;
                    if (is_string($kontext)) {
                        $dekodovano = json_decode($kontext, true);
                        $kontext = json_last_error() === JSON_ERROR_NONE ? $dekodovano : $kontext;
                    }
                    $kontextText = is_string($kontext)
                        ? $kontext
                        : json_encode($kontext, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                @endphp
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <strong class="text-sm text-gray-800">Kontext</strong>
                    <span class="text-xs text-gray-500">(co uživatel dělal / parametry akce)</span>
                    <pre class="mt-2 text-xs text-gray-700 bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">{{ $kontextText }}</pre>
                </div>
            @endif

            @if($bug->opraveno)
                <div class="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    Označeno jako opraveno {{ $bug->opraveno_v?->format('d.m.Y H:i') }}
                    @if($bug->opravil)
                        uživatelem {{ $bug->opravil->jmeno }}
                    @endif
                </div>
            @endif
        </div>

        @if($bug->stack_trace)
            <div class="bg-white rounded-lg border border-gray-200 p-6">
                <h2 class="text-sm font-bold text-gray-800 mb-3">Stack trace</h2>
                <pre class="text-xs text-gray-700 bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap break-words">{{ $bug->stack_trace }}</pre>
            </div>
        @endif
    </div>

    <script>
        async function oznacOpraveno() {
            const resp = await fetch(`/masterteam/bugy/{{ $bug->id }}/opraveno`, {
                method: 'PATCH',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
                    'Accept': 'application/json',
                },
            });
            if (resp.ok) location.reload();
        }
        async function smazat() {
            if (!confirm('Skutečně smazat tento záznam bugu?')) return;
            const resp = await fetch(`/masterteam/bugy/{{ $bug->id }}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
                    'Accept': 'application/json',
                },
            });
            if (resp.ok) window.location.href = '{{ route('masterteam.bugy') }}';
        }
    </script>
</x-layouts.app>
