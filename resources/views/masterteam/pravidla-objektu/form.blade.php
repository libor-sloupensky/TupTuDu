<x-layouts.app>
<div class="max-w-3xl mx-auto px-4 py-6">
    <h1 class="text-xl font-bold text-gray-800 mb-6">
        {{ isset($pravidlo) ? 'Upravit pravidlo: ' . $pravidlo->nazev : 'Nové pravidlo' }}
    </h1>

    @if(session('success'))
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg mb-4 text-sm">
            {{ session('success') }}
        </div>
    @endif
    @if(session('error'))
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
            {{ session('error') }}
        </div>
    @endif

    <form method="POST"
          action="{{ isset($pravidlo) ? route('masterteam.pravidla-objektu.update', $pravidlo) : route('masterteam.pravidla-objektu.store') }}"
          class="space-y-4">
        @csrf
        @if(isset($pravidlo)) @method('PATCH') @endif

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Název</label>
                <input type="text" name="nazev" value="{{ old('nazev', $pravidlo->nazev ?? '') }}" required
                       class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                <select name="kategorie" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary">
                    @foreach($kategorie as $k => $v)
                        <option value="{{ $k }}" {{ old('kategorie', $pravidlo->kategorie ?? '') === $k ? 'selected' : '' }}>{{ $v }}</option>
                    @endforeach
                </select>
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Klíčová slova</label>
            <input type="text" name="keywords" value="{{ old('keywords', $pravidlo->keywords ?? '') }}"
                   placeholder="hygiena, sprcha, vana, umyvadlo, vodovod"
                   class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <p class="text-[10px] text-gray-400 mt-1">AI při konceptu hledá pravidla podle těchto slov. Generují se automaticky, lze upravit.</p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Pravidla</label>
            <textarea name="pravidla" rows="20" required
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:border-primary">{{ old('pravidla', $pravidlo->pravidla ?? '') }}</textarea>
            <p class="text-[10px] text-gray-400 mt-1">
                Strukturovaný text — doporučení, rozměry, materiály, vazby. Nepoužívej příkazy (musí/nesmí), piš doporučení (běžně se, doporučuje se).
            </p>
        </div>

        @if(isset($pravidlo))
            <div class="flex items-center gap-2 text-xs text-gray-400">
                <span>Zdroj: {{ $pravidlo->zdroj }}</span>
                <span>·</span>
                <span>Aktualizováno: {{ $pravidlo->upraveno->format('d.m.Y H:i') }}</span>
            </div>
        @endif

        <div class="flex gap-3">
            <button type="submit" class="px-6 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition">
                {{ isset($pravidlo) ? 'Uložit změny' : 'Vytvořit' }}
            </button>
            <a href="{{ route('masterteam.pravidla-objektu.index') }}" class="px-6 py-2 text-sm text-gray-500 hover:text-gray-700">Zpět</a>
        </div>
    </form>
</div>
</x-layouts.app>
