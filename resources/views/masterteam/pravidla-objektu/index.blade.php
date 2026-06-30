<x-layouts.app>
<div class="max-w-5xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold text-gray-800">Pravidla objektů</h1>
        <div class="flex gap-2">
            <a href="{{ route('masterteam.pravidla-objektu.create') }}"
               class="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition">
                + Nové pravidlo
            </a>
        </div>
    </div>

    <p class="text-sm text-gray-500 mb-4">
        Pravidla definují jak AI navrhuje objekty v konceptu. Lze je vytvořit ručně nebo nechat AI vygenerovat ze znalostní báze.
    </p>

    @if(session('success'))
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg mb-4 text-sm">
            {{ session('success') }}
        </div>
    @endif

    {{-- Generování + obnovení --}}
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div class="flex flex-wrap gap-4 items-end">
            <form method="POST" action="{{ route('masterteam.pravidla-objektu.generovat') }}" class="flex flex-wrap gap-2 items-end flex-1">
                @csrf
                <div>
                    <label class="text-[10px] text-gray-500">Název</label>
                    <input type="text" name="nazev" placeholder="Koupelna" required
                           onfocus="this.placeholder=''" onblur="if(!this.value)this.placeholder='Koupelna'"
                           class="block w-36 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary">
                </div>
                <div>
                    <label class="text-[10px] text-gray-500">Kategorie</label>
                    <select name="kategorie" class="block text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
                        @foreach($kategorie as $k => $v)
                            <option value="{{ $k }}">{{ $v }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="text-[10px] text-gray-500">Klíčová slova (volitelné)</label>
                    <input type="text" name="keywords" placeholder="hygiena, sprcha, vana"
                           onfocus="this.placeholder=''" onblur="if(!this.value)this.placeholder='hygiena, sprcha, vana'"
                           class="block w-52 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary">
                </div>
                <button type="submit" class="px-4 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition">
                    Generovat z RAG
                </button>
            </form>
            <form method="POST" action="{{ route('masterteam.pravidla-objektu.obnovit') }}"
                  onsubmit="return confirm('Smazat a přegenerovat VŠECHNA pravidla z RAG?')">
                @csrf
                <button type="submit" class="px-4 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition">
                    Obnovit vše z RAG
                </button>
            </form>
        </div>
    </div>

    @if($pravidla->isEmpty())
        <div class="text-center py-12 text-gray-400">
            <p class="text-lg mb-2">Žádná pravidla</p>
            <p class="text-sm">Vytvořte první pravidlo nebo nechte AI vygenerovat ze znalostní báze.</p>
        </div>
    @else
        @php $currentKat = null; @endphp
        @foreach($pravidla as $p)
            @if($p->kategorie !== $currentKat)
                @php $currentKat = $p->kategorie; @endphp
                <h2 class="text-sm font-semibold text-gray-500 mt-6 mb-2 uppercase tracking-wide">
                    {{ $kategorie[$currentKat] ?? $currentKat }}
                </h2>
            @endif
            <div class="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 mb-2 hover:border-primary/30 transition">
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-800">{{ $p->nazev }}</span>
                        <code class="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{{ $p->typ_objektu }}</code>
                        @if($p->zdroj === 'ai_rag')
                            <span class="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">AI</span>
                        @elseif($p->zdroj === 'ai_rag+manual')
                            <span class="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">AI+ruční</span>
                        @endif
                    </div>
                    <p class="text-xs text-gray-400 mt-0.5 truncate max-w-xl">{{ \Illuminate\Support\Str::limit($p->pravidla, 120) }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0 ml-4">
                    <span class="text-[10px] text-gray-400">{{ $p->upraveno->format('d.m.Y') }}</span>
                    <a href="{{ route('masterteam.pravidla-objektu.edit', $p) }}"
                       class="text-xs text-primary hover:underline">Upravit</a>
                    <form method="POST" action="{{ route('masterteam.pravidla-objektu.destroy', $p) }}"
                          onsubmit="return confirm('Smazat pravidlo?')">
                        @csrf @method('DELETE')
                        <button class="text-xs text-red-500 hover:underline">Smazat</button>
                    </form>
                </div>
            </div>
        @endforeach
    @endif

    {{-- Generovat z RAG přesunuto nahoru --}}
</div>
</x-layouts.app>
