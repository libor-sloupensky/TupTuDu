<x-layouts.app title="Koncept testování — TupTuDu">
    <style>
        .kt-wrap { padding: 1.5rem 2rem; max-width: 1100px; margin: 0 auto; }
        .kt-prompt { width: 100%; min-height: 80px; padding: .7rem .9rem; font-family: var(--s-font);
            font-size: 1rem; border: 1px solid var(--c-border); border-radius: 8px; resize: vertical; }
        .kt-prompt:focus { outline: none; border-color: var(--c-primary); box-shadow: 0 0 0 3px var(--c-primary-10); }
        .kt-bar { display: flex; align-items: center; gap: 1.25rem; margin: .5rem 0 1.5rem; flex-wrap: wrap; }
        .kt-save { font-size: .82rem; color: var(--c-text-secondary); }
        .kt-rezim { display: flex; gap: 1rem; font-size: .9rem; }
        .kt-rezim label { display: flex; align-items: center; gap: .35rem; margin: 0; font-weight: 600; cursor: pointer; }
        .kt-grid { display: flex; flex-direction: column; gap: 1rem; }
        .kt-col { border: 1px solid var(--c-border); border-radius: 10px; background: var(--c-surface); overflow: hidden; }
        .kt-col h3 { margin: 0; padding: .6rem .8rem; font-size: .95rem; border-bottom: 1px solid var(--c-border); display: flex; justify-content: space-between; align-items: center; gap: .75rem; }
        .kt-col h3 .meta { font-size: .78rem; color: var(--c-text-secondary); font-weight: 600; }
        .kt-skore { font-weight: 800; padding: .1rem .5rem; border-radius: 6px; font-size: .85rem; }
        .kt-body { padding: .75rem; }
        .kt-out { margin: 0; font-family: ui-monospace, Consolas, monospace; font-size: 12px; line-height: 1.25;
            white-space: pre; overflow: auto; max-height: 60vh; }
        .kt-poruseni { margin: 0 0 .6rem; padding: .5rem .7rem; border-radius: 8px; font-size: .85rem; }
        .kt-poruseni.ok { background: color-mix(in srgb, var(--c-ok) 12%, transparent); color: var(--c-ok); }
        .kt-poruseni.bad { background: color-mix(in srgb, var(--c-error) 10%, transparent); color: var(--c-error); }
        .kt-poruseni ul { margin: .3rem 0 0; padding-left: 1.1rem; }
        .kt-chyba { color: var(--c-error); white-space: pre-wrap; font-size: .9rem; }
        .kt-cekam { color: var(--c-text-secondary); }
        details.kt-raw { margin-top: .6rem; }
        details.kt-raw pre { font-family: ui-monospace, Consolas, monospace; font-size: 11px; white-space: pre-wrap;
            background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 6px; padding: .5rem; max-height: 30vh; overflow: auto; }
    </style>

    <div class="kt-wrap">
        <h1>Koncept testování</h1>
        <p class="muted">Modely navrhnou dispozici; ve strukturovaném režimu ji <strong>ohodnotíme pravidly</strong> a ASCII <strong>vykreslí náš kód</strong> (logika × přesnost odděleně).</p>

        <label for="kt-prompt">Prompt (uloží se automaticky)</label>
        <textarea id="kt-prompt" class="kt-prompt">{{ $prompt }}</textarea>
        <div class="kt-bar">
            <div class="kt-rezim">
                <label><input type="radio" name="rezim" value="struktura" checked> Strukturovaný + skóre</label>
                <label><input type="radio" name="rezim" value="ascii"> ASCII (kreslí model)</label>
            </div>
            <button id="kt-gen" class="btn btn-primary">Vygenerovat</button>
            <span id="kt-save" class="kt-save"></span>
        </div>

        <div class="kt-grid">
            @foreach ($modely as $id => $nazev)
                <div class="kt-col">
                    <h3>
                        <span>{{ $nazev }} <span class="kt-skore" data-skore="{{ $id }}" style="display:none"></span></span>
                        <span class="meta" data-meta="{{ $id }}"></span>
                    </h3>
                    <div class="kt-body" data-body="{{ $id }}"><span class="kt-cekam">Zatím nevygenerováno.</span></div>
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
        const esc = s => (s || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

        let t = null;
        promptEl.addEventListener('input', function () {
            clearTimeout(t); saveEl.textContent = 'ukládám…';
            t = setTimeout(async function () {
                try {
                    await fetch('/masterteam/koncept-testovani/prompt', {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
                        body: JSON.stringify({ prompt: promptEl.value }),
                    });
                    saveEl.textContent = 'uloženo ✓';
                } catch (e) { saveEl.textContent = 'uložení selhalo'; }
            }, 700);
        });

        function rezim() { return document.querySelector('input[name=rezim]:checked').value; }

        function render(model, d) {
            const body = document.querySelector('[data-body="' + model + '"]');
            const meta = document.querySelector('[data-meta="' + model + '"]');
            const skoreEl = document.querySelector('[data-skore="' + model + '"]');
            meta.textContent = (d.ms != null ? (d.ms / 1000).toFixed(1) + ' s' : '');
            skoreEl.style.display = 'none';

            if (d.error) {
                let html = '<div class="kt-chyba">CHYBA: ' + esc(d.error) + '</div>';
                if (d.raw) html += '<details class="kt-raw"><summary>surová odpověď</summary><pre>' + esc(d.raw) + '</pre></details>';
                body.innerHTML = html;
                return;
            }
            if (d.rezim === 'struktura') {
                const sk = d.skore | 0;
                skoreEl.textContent = sk + '%';
                skoreEl.style.display = '';
                skoreEl.style.background = sk >= 85 ? 'color-mix(in srgb, var(--c-ok) 22%, transparent)'
                    : (sk >= 60 ? 'color-mix(in srgb, var(--c-primary) 22%, transparent)' : 'color-mix(in srgb, var(--c-error) 18%, transparent)');
                let html = '';
                if (d.poruseni && d.poruseni.length) {
                    html += '<div class="kt-poruseni bad">Porušená pravidla:<ul>' + d.poruseni.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></div>';
                } else {
                    html += '<div class="kt-poruseni ok">Všechna pravidla splněna ✓</div>';
                }
                html += '<pre class="kt-out">' + esc(d.ascii) + '</pre>';
                html += '<details class="kt-raw"><summary>strukturovaná data (JSON)</summary><pre>' + esc(d.raw) + '</pre></details>';
                body.innerHTML = html;
            } else {
                body.innerHTML = '<pre class="kt-out">' + esc(d.text) + '</pre>';
            }
        }

        function generujModel(model) {
            const body = document.querySelector('[data-body="' + model + '"]');
            const meta = document.querySelector('[data-meta="' + model + '"]');
            document.querySelector('[data-skore="' + model + '"]').style.display = 'none';
            body.innerHTML = '<span class="kt-cekam">generuji…</span>'; meta.textContent = '';
            return fetch('/masterteam/koncept-testovani/generovat', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
                body: JSON.stringify({ model: model, prompt: promptEl.value, rezim: rezim() }),
            }).then(r => r.json()).then(d => render(model, d)).catch(e => {
                body.innerHTML = '<div class="kt-chyba">CHYBA požadavku: ' + esc(String(e)) + '</div>';
            });
        }

        genBtn.addEventListener('click', function () {
            genBtn.disabled = true; genBtn.textContent = 'Generuji…';
            Promise.all(modely.map(generujModel)).finally(function () {
                genBtn.disabled = false; genBtn.textContent = 'Vygenerovat';
            });
        });
    })();
    </script>
</x-layouts.app>
