<x-layouts.app title="Koncept testování — TupTuDu">
    <style>
        .kt-wrap { padding: 1.5rem 2rem; max-width: 1400px; margin: 0 auto; }
        .kt-prompt { width: 100%; min-height: 90px; padding: .7rem .9rem; font-family: var(--s-font);
            font-size: 1rem; border: 1px solid var(--c-border); border-radius: 8px; resize: vertical; }
        .kt-prompt:focus { outline: none; border-color: var(--c-primary); box-shadow: 0 0 0 3px var(--c-primary-10); }
        .kt-bar { display: flex; align-items: center; gap: 1rem; margin: .5rem 0 1.5rem; }
        .kt-save { font-size: .82rem; color: var(--c-text-secondary); }
        .kt-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        @media (min-width: 1200px) { .kt-grid { grid-template-columns: repeat(4, 1fr); } }
        .kt-col { border: 1px solid var(--c-border); border-radius: 10px; background: var(--c-surface); overflow: hidden; display: flex; flex-direction: column; }
        .kt-col h3 { margin: 0; padding: .6rem .8rem; font-size: .95rem; border-bottom: 1px solid var(--c-border); display: flex; justify-content: space-between; align-items: baseline; }
        .kt-col h3 .ms { font-size: .75rem; color: var(--c-text-secondary); font-weight: 600; }
        .kt-out { margin: 0; padding: .75rem; font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
            font-size: 11px; line-height: 1.25; white-space: pre; overflow: auto; max-height: 70vh; min-height: 8rem; }
        .kt-out.chyba { color: var(--c-error); white-space: pre-wrap; }
        .kt-out.cekam { color: var(--c-text-secondary); font-family: var(--s-font); }
    </style>

    <div class="kt-wrap">
        <h1>Koncept testování</h1>
        <p class="muted">Zadej prompt a nech ho vygenerovat jako ASCII půdorys všemi modely najednou — pro porovnání „chápání architektury".</p>

        <label for="kt-prompt">Prompt (uloží se automaticky)</label>
        <textarea id="kt-prompt" class="kt-prompt">{{ $prompt }}</textarea>
        <div class="kt-bar">
            <button id="kt-gen" class="btn btn-primary">Vygenerovat</button>
            <span id="kt-save" class="kt-save"></span>
        </div>

        <div class="kt-grid">
            @foreach ($modely as $id => $nazev)
                <div class="kt-col">
                    <h3><span>{{ $nazev }}</span><span class="ms" data-ms="{{ $id }}"></span></h3>
                    <pre class="kt-out cekam" data-out="{{ $id }}">Zatím nevygenerováno.</pre>
                </div>
            @endforeach
        </div>
    </div>

    <script>
    (function () {
        const csrf = document.querySelector('meta[name=csrf-token]').content;
        const modely = @json(array_keys($modely));
        const promptEl = document.getElementById('kt-prompt');
        const saveEl = document.getElementById('kt-save');
        const genBtn = document.getElementById('kt-gen');

        // Autosave promptu (debounce)
        let t = null;
        promptEl.addEventListener('input', function () {
            clearTimeout(t);
            saveEl.textContent = 'ukládám…';
            t = setTimeout(async function () {
                try {
                    await fetch('/masterteam/koncept-testovani/prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
                        body: JSON.stringify({ prompt: promptEl.value }),
                    });
                    saveEl.textContent = 'uloženo ✓';
                } catch (e) { saveEl.textContent = 'uložení selhalo'; }
            }, 700);
        });

        function generujModel(model) {
            const out = document.querySelector('[data-out="' + model + '"]');
            const ms = document.querySelector('[data-ms="' + model + '"]');
            out.className = 'kt-out cekam';
            out.textContent = 'generuji…';
            ms.textContent = '';
            return fetch('/masterteam/koncept-testovani/generovat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
                body: JSON.stringify({ model: model, prompt: promptEl.value }),
            }).then(r => r.json()).then(function (d) {
                if (d.ms != null) ms.textContent = (d.ms / 1000).toFixed(1) + ' s';
                if (d.error) { out.className = 'kt-out chyba'; out.textContent = 'CHYBA: ' + d.error; }
                else { out.className = 'kt-out'; out.textContent = d.text || '(prázdné)'; }
            }).catch(function (e) {
                out.className = 'kt-out chyba'; out.textContent = 'CHYBA požadavku: ' + e;
            });
        }

        genBtn.addEventListener('click', function () {
            genBtn.disabled = true;
            genBtn.textContent = 'Generuji…';
            Promise.all(modely.map(generujModel)).finally(function () {
                genBtn.disabled = false;
                genBtn.textContent = 'Vygenerovat';
            });
        });
    })();
    </script>
</x-layouts.app>
