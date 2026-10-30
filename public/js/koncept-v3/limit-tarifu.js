/**
 * Limity tarifu v editoru V3 (App\Support\Tarif, config/tarify.php, modules/platby.md).
 *
 * Tarif Zdarma má denní limit úprav (úprava = nový krok historie) a počet projektů.
 * Hlídá je server (odpověď 402). Editor to ví dřív, aby úprava nad limit vůbec
 * nevznikla: kresba se vrátí na poslední krok a ukáže se nabídka předplatného.
 * Limity posílá server v _kkInitData.limit — null = bez omezení (masterteam).
 *
 * Mixin komponenty editoru, skládá ho window.konceptV3Komponenta (import-pudorysu.js).
 * Napojení v koncept-k-ui.js: _zapisKrok, ulozit, _zalozKoncept, novyProjekt.
 */
window.KonceptLimit = {
    _limitStav: undefined,

    /** Limity z _kkInitData (definuje se až za skripty editoru → čte se při prvním dotazu). */
    _limit() {
        if (this._limitStav === undefined) this._limitStav = window._kkInitData?.limit || null;
        return this._limitStav;
    },

    /** Smí vzniknout další krok? Když ne, vrátí kresbu na poslední krok a ukáže nabídku. */
    _limitPovolKrok() {
        const l = this._limit();
        if (!l || l.zbyva === null || l.zbyva > 0) return true;
        this._limitVratKresbu();
        this.limitDialog('upravy');
        return false;
    },

    /** Krok vznikl — ubrat ze zbytku (server ho při uložení potvrdí). */
    _limitPoKroku() {
        const l = this._limit();
        if (!l || l.zbyva === null) return;
        l.zbyva = Math.max(0, l.zbyva - 1);
        this._limitOdznak();
    },

    /** Zbytek podle serveru (odpověď na uložení); null = bez omezení (třeba právě zaplatil). */
    _limitZeServeru(zbyva) {
        const l = this._limit();
        if (!l || zbyva === undefined) return;
        l.zbyva = zbyva;
        this._limitOdznak();
    },

    /** Zahodí úpravu nad limit — stejně jako přechod v historii (_prejdiNaKrok). */
    _limitVratKresbu() {
        if (!this.engine || !this._stavKroku) return;
        if (this.kreslimStenu || this.stenaUseky?.length) {
            this.zrusRozkreslenyUsek?.();
            this.kreslimStenu = false;
            this.stenaStart = null;
            this.stenaUseky = [];
            this.renderer?.clearTemp();
        }
        this.engine.fromJSON(JSON.parse(this._stavKroku));
        this.renderer?.clearSelection();
        this.renderer?.render();
    },

    /** Nabídka předplatného po vyčerpání limitu; typ 'upravy' | 'projekty'. */
    limitDialog(typ) {
        const l = this._limit() || {};
        this._limitStyly();
        document.getElementById('kk-limit-dialog')?.remove();

        const projekty = typ === 'projekty';
        const pozadi = document.createElement('div');
        pozadi.id = 'kk-limit-dialog';
        pozadi.className = 'kk-limit-pozadi';
        pozadi.innerHTML = `
            <div class="kk-limit-okno" role="dialog" aria-modal="true" aria-labelledby="kk-limit-nadpis">
                <h2 id="kk-limit-nadpis"></h2>
                <p></p>
                <div class="kk-limit-tlacitka">
                    <button type="button" class="btn" data-zavrit></button>
                    <a class="btn btn-primary"></a>
                </div>
            </div>`;
        pozadi.querySelector('h2').textContent = preloz(projekty ? 'tarify.limit_projektu_nadpis' : 'tarify.limit_uprav_nadpis');
        pozadi.querySelector('p').textContent = projekty
            ? preloz('tarify.limit_projektu_text', { limit: l.projektu ?? '' })
            : preloz('tarify.limit_uprav_text', { limit: l.kroku_denne ?? '' });
        const zavrit = pozadi.querySelector('[data-zavrit]');
        zavrit.textContent = preloz('tarify.zavrit');
        const odkaz = pozadi.querySelector('a');
        odkaz.textContent = preloz('tarify.zobrazit_predplatne');
        odkaz.href = l.predplatne_url || '/billing';

        const zavri = () => { pozadi.remove(); document.removeEventListener('keydown', naKlavesu, true); };
        const naKlavesu = (e) => { if (e.key === 'Escape') { e.stopPropagation(); zavri(); } };
        zavrit.addEventListener('click', zavri);
        pozadi.addEventListener('click', (e) => { if (e.target === pozadi) zavri(); });
        document.addEventListener('keydown', naKlavesu, true);
        document.body.appendChild(pozadi);
        odkaz.focus();
    },

    /** Štítek „Dnes zbývá N z 30 úprav“ nad plátnem — jen když zbývá málo. */
    _limitOdznak() {
        const l = this._limit();
        const platno = document.getElementById('kk-canvas-wrap');
        let odznak = document.getElementById('kk-limit-odznak');
        if (!l || l.zbyva === null || l.zbyva > 10 || !platno) {
            odznak?.remove();
            return;
        }
        this._limitStyly();
        if (!odznak) {
            odznak = document.createElement('a');
            odznak.id = 'kk-limit-odznak';
            odznak.className = 'kk-limit-odznak';
            platno.appendChild(odznak);
        }
        odznak.href = l.predplatne_url || '/billing';
        odznak.textContent = preloz('tarify.zbyva_uprav', { zbyva: l.zbyva, limit: l.kroku_denne });
        odznak.classList.toggle('vycerpano', l.zbyva === 0);
    },

    _limitStyly() {
        if (document.getElementById('kk-limit-styly')) return;
        const styl = document.createElement('style');
        styl.id = 'kk-limit-styly';
        styl.textContent = `
            .kk-limit-pozadi { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center;
                justify-content: center; padding: 1rem; background: rgba(0,0,0,.35); }
            .kk-limit-okno { max-width: 26rem; width: 100%; padding: 1.5rem; background: var(--c-surface);
                border: 1px solid var(--c-border); border-radius: var(--s-radius-lg); box-shadow: var(--s-shadow); }
            .kk-limit-okno h2 { margin: 0 0 .5rem; font-size: 1.15rem; font-weight: 800; }
            .kk-limit-okno p { margin: 0 0 1.25rem; color: var(--c-text-secondary); }
            .kk-limit-tlacitka { display: flex; justify-content: flex-end; gap: .5rem; flex-wrap: wrap; }
            .kk-limit-tlacitka .btn:focus { outline: none; box-shadow: 0 0 0 3px var(--c-primary-20); }
            .kk-limit-odznak { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 20;
                padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap;
                background: var(--c-surface); color: var(--c-text-secondary); border: 1px solid var(--c-border); }
            .kk-limit-odznak:hover { color: var(--c-primary-text); text-decoration: none; }
            .kk-limit-odznak.vycerpano { color: var(--c-primary-text); border-color: var(--c-primary); }`;
        document.head.appendChild(styl);
    },
};

// Štítek se zbytkem hned po načtení (komponenta vznikne až v Alpine)
document.addEventListener('alpine:initialized', () => {
    const koren = document.getElementById('kk-canvas-wrap')?.closest('[x-data]');
    if (koren) window.Alpine.$data(koren)._limitOdznak?.();
});
