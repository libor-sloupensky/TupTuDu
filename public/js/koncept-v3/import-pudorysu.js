/**
 * Import půdorysu do Konceptu V3 — průvodce (nahrání výkresu, výběr strany, měřítko)
 * a správa podkladu pod kresbou.
 *
 * Objekt se přimíchává do Alpine komponenty editoru:
 *     x-data="{ ...konceptKEditor(_kkInitData), ...KonceptImport }"
 *
 * Rozpoznávání stěn z výkresu NENÍ v tomto souboru — to řeší import-analyza.js.
 */
window.KonceptImport = {
    // ─── Průvodce ───────────────────────────────────────────
    impOtevren: false,
    impKrok: 'soubor',          // soubor | strana | meritko
    impChyba: '',
    impNacitani: false,
    impNazev: '',

    // Nahraný výkres
    impOtisk: null,
    impTyp: null,               // pdf | obrazek
    impStran: 0,
    impStrana: 1,
    impStranaData: null,        // odpověď endpointu /strana

    // Měřítko — vždy se měří ve výkresu.
    // Měřítko z popisku („M 1:50“) se ZÁMĚRNĚ nepoužívá: u printscreenu,
    // scanu nebo ořezaného PDF neplatí a tiše by zkreslilo celý plánek.
    impKalibBody: [],           // [{x,y}] v přirozených px obrázku
    impKalibMm: null,           // záměrně prázdné — uživatel musí rozměr vyplnit vědomě

    // Podklad v editoru (uložený stav = metadata.podklad)
    podklad: null,

    // ─── Start ──────────────────────────────────────────────
    podkladInit() {
        // seznam výkresů je i v panelu Podklad, ne jen v průvodci — panel může
        // být po načtení stránky rozbalený a @toggle by se tehdy nespustil
        this.impNactiDrive();

        const ulozeny = this.metadata?.podklad;
        if (ulozeny && ulozeny.url) {
            this.podklad = { ...ulozeny };
            // Renderer vzniká až v init() editoru — počkat na něj.
            const zkus = () => {
                if (!this.renderer) { setTimeout(zkus, 120); return; }
                this.renderer.nactiPodklad(this.podklad, () => {
                    // Prázdný koncept → ukázat rovnou celý výkres, ať je podle čeho kreslit.
                    if (!this.engine || this.engine.walls.size === 0) this.podkladNaObrazovku();
                });
            };
            zkus();
        }
    },

    // dříve nahrané výkresy (ať se stejný soubor nenahrává pořád dokola)
    impDrive: [],
    // Zapamatovaná kalibrace a obvod vybraného výkresu, po stranách.
    // Nese si otisk výkresu, ke kterému patří — jinak by se při přepnutí
    // na jiný výkres obnovilo měřítko a obrys toho předchozího.
    impUlozene: { otisk: null, strany: {} },

    impOtevri() {
        this.impOtevren = true;
        this.impKrok = 'soubor';
        this.impChyba = '';
        this.impNactiDrive();
    },

    async impNactiDrive() {
        try {
            const resp = await fetch(_kkInitData.routes.podkladSeznam, { headers: { Accept: 'application/json' } });
            const d = await resp.json().catch(() => ({}));
            this.impDrive = d.ok ? d.vykresy : [];
        } catch (e) {
            this.impDrive = [];
        }
    },

    /** Otevřít průvodce rovnou na daném výkresu (z nabídky Podklad). */
    async impOtevriVykres(vykres) {
        this.impOtevren = true;
        await this.impPouzijDrive(vykres);
    },

    /** Znovu použít už nahraný výkres — přeskočí se nahrávání. */
    async impPouzijDrive(vykres) {
        this.impChyba = '';
        this.impOtisk = vykres.otisk;
        this.impTyp = vykres.typ;
        this.impStran = vykres.stran || 1;
        this.impStrana = 1;
        this.impNazev = vykres.nazev;
        this.impStranaData = null;
        this.impKalibBody = [];
        this.impKalibMm = null;
        this.impUlozene = { otisk: vykres.otisk, strany: vykres.strany || {} };

        if (this.impTyp === 'pdf' && this.impStran > 1) {
            this.impKrok = 'strana';
        } else {
            await this.impVyberStranu(1);
        }
    },

    /**
     * Vrátí měřítko a obvod, které si výkres pamatuje z minula.
     * Volá se až po přípravě strany — dřív není znám převod bodů na px.
     */
    impObnovUlozene() {
        const d = this.impStranaData;
        if (this.impUlozene?.otisk !== this.impOtisk) return;   // patří jinému výkresu
        const ulozeno = this.impUlozene.strany?.[String(this.impStrana)];
        if (!d || !ulozeno) return;
        const pxNaBod = d.typ === 'pdf' ? d.dpi / 72 : 1;

        if (ulozeno.kalibBody?.length === 2 && ulozeno.kalibMm > 0) {
            this.impKalibBody = ulozeno.kalibBody.map(([x, y]) => ({ x: x * pxNaBod, y: y * pxNaBod }));
            this.impKalibMm = ulozeno.kalibMm;
        }
        if (ulozeno.obrys?.length >= 3) {
            this.pzObrys = ulozeno.obrys.map(([x, y]) => ({ x: x * pxNaBod, y: y * pxNaBod }));
            this.pzObrysUzavren = true;
        }
    },

    /**
     * Zapamatuje si měřítko a obvod u výkresu (ne u konceptu) — u téhož
     * výkresu se nemění a přeměřovat je pokaždé znovu je jen zdržení.
     */
    async impUlozNastaveni() {
        const d = this.impStranaData;
        if (!this.impOtisk || !d) return;
        const pxNaBod = d.typ === 'pdf' ? d.dpi / 72 : 1;

        const telo = { strana: this.impStrana };
        if (this.impZmereno()) {
            telo.kalibBody = this.impKalibBody.map(b => [b.x / pxNaBod, b.y / pxNaBod]);
            telo.kalibMm = parseFloat(this.impKalibMm);
        }
        if (this.pzObrysUzavren && this.pzObrys.length >= 3) {
            telo.obrys = this.pzObrys.map(b => [b.x / pxNaBod, b.y / pxNaBod]);
        }
        if (telo.kalibBody === undefined && telo.obrys === undefined) return;

        // zapamatovat se nepovedlo → uživateli to nevadí, jen si příště změří znovu
        try {
            const resp = await fetch(_kkInitData.routes.podkladNastaveni.replace(':otisk', this.impOtisk), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': _kkInitData.csrf, 'Accept': 'application/json' },
                body: JSON.stringify(telo),
            });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
        } catch (e) {
            window.zalogujChybu?.(e, 'import podkladu — uložení měřítka a obvodu', { otisk: this.impOtisk, strana: this.impStrana });
        }
    },

    /** Kroky průvodce — výběr strany odpadá u obrázku i u jednostránkového PDF. */
    impKroky() {
        const kroky = ['soubor'];
        if (this.impTyp === 'pdf' && this.impStran > 1) kroky.push('strana');
        kroky.push('meritko', 'obrys', 'steny');
        return kroky;
    },

    impNazevKroku(krok) {
        return {
            soubor: 'Výkres',
            strana: 'Strana',
            meritko: 'Měřítko',
            obrys: 'Obvod domu',
            steny: 'Stěny',
        }[krok] || krok;
    },

    /** Pokyn k aktuálnímu kroku — stojí v hlavičce místo názvu okna. */
    impPokyn() {
        return {
            soubor: 'Vyberte výkres půdorysu, nebo použijte dříve nahraný.',
            strana: 'Vyberte stranu, na které je půdorys.',
            meritko: 'Změřte ve výkresu známý rozměr — klikněte na dva body a zadejte jejich skutečnou vzdálenost.',
            obrys: 'Obkreslete vnější hranu obvodových zdí — klikejte do rohů domu.',
            steny: 'Vyberte variantu, která nejlépe odpovídá stěnám.',
        }[this.impKrok] || '';
    },

    /** Na hotové kroky se lze vracet, na nesplněné ne. */
    impKrokDostupny(krok) {
        if (krok === 'soubor') return true;
        if (krok === 'strana') return !!this.impOtisk && this.impStran > 1;
        if (krok === 'meritko') return !!this.impStranaData;
        if (krok === 'obrys') return this.impZmereno();
        if (krok === 'steny') return this.impVarianty.length > 0 || this.pzObrysUzavren;
        return false;
    },

    impNaKrok(krok) {
        if (!this.impKrokDostupny(krok) || krok === this.impKrok) return;

        this.impChyba = '';
        this.impKrok = krok;
        if (krok === 'meritko') this.pzNastroj = 'kalibrace';
        if (krok === 'obrys') {
            this.pzNastroj = 'obrys';
            this.$nextTick(() => this.pzNaSirku());
        }
    },

    impZavri() {
        this.impOtevren = false;
        this.impNacitani = false;
    },

    // ─── Krok 1: nahrání ────────────────────────────────────
    impPretahuje: false,

    /** Výběr souboru tlačítkem. */
    async impNahrajSoubor(event) {
        const soubor = event.target.files?.[0];
        event.target.value = '';           // stejný soubor jde vybrat znovu
        await this.impNahraj(soubor);
    },

    /** Puštění souboru na plochu (přetažení z plochy nebo z průzkumníka). */
    async impPustSoubor(event) {
        this.impPretahuje = false;
        const soubor = event.dataTransfer?.files?.[0];
        if (!soubor) return;

        const pripona = (soubor.name.split('.').pop() || '').toLowerCase();
        if (!['pdf', 'png', 'jpg', 'jpeg'].includes(pripona)) {
            this.impChyba = 'Podporované jsou jen soubory PDF, PNG a JPG.';
            return;
        }
        await this.impNahraj(soubor);
    },

    async impNahraj(soubor) {
        if (!soubor) return;

        this.impChyba = '';
        this.impNacitani = true;
        this.impNazev = soubor.name;
        try {
            const formular = new FormData();
            formular.append('soubor', soubor);
            const resp = await fetch(_kkInitData.routes.podkladNahrat, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': _kkInitData.csrf, 'Accept': 'application/json' },
                body: formular,
            });
            const d = await resp.json().catch(() => ({}));
            if (!resp.ok || !d.ok) {
                this.impChyba = d.error || d.message || 'Soubor se nepodařilo nahrát.';
                return;
            }

            this.impOtisk = d.otisk;
            this.impTyp = d.typ;
            this.impStran = d.stran || 1;
            this.impStrana = 1;
            this.impStranaData = null;
            this.impKalibBody = [];
            this.impKalibMm = null;      // vzdálenost se nikdy nepředvyplňuje
            this.impUlozene = { otisk: d.otisk, strany: d.strany || {} };

            if (this.impTyp === 'pdf' && this.impStran > 1) {
                this.impKrok = 'strana';
            } else {
                await this.impVyberStranu(1);
            }
        } catch (e) {
            this.impChyba = 'Soubor se nepodařilo nahrát: ' + e.message;
            window.zalogujChybu?.(e, 'import podkladu — nahrání');
        } finally {
            this.impNacitani = false;
        }
    },

    /** URL náhledu strany pro mřížku výběru. */
    impNahledUrl(strana) {
        return _kkInitData.routes.podkladNahled
            .replace(':otisk', this.impOtisk)
            .replace(':strana', strana);
    },

    // ─── Krok 2: výběr strany ───────────────────────────────
    async impVyberStranu(strana) {
        this.impChyba = '';
        this.impNacitani = true;
        this.impStrana = strana;
        try {
            const resp = await fetch(_kkInitData.routes.podkladStrana.replace(':otisk', this.impOtisk), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': _kkInitData.csrf, 'Accept': 'application/json' },
                body: JSON.stringify({ strana }),
            });
            const d = await resp.json().catch(() => ({}));
            if (!resp.ok || !d.ok) {
                this.impChyba = d.error || d.message || 'Stranu se nepodařilo připravit.';
                return;
            }

            this.impStranaData = d;
            this.impKalibBody = [];
            this.impKalibMm = null;
            this.pzObrys = [];
            this.pzObrysUzavren = false;
            this.pzInit?.();
            // co si výkres pamatuje z minula — měřítko a obkreslený obvod
            this.impObnovUlozene();
            this.pzNastroj = 'kalibrace';    // v kroku měřítka se jen měří
            this.impKrok = 'meritko';
        } catch (e) {
            this.impChyba = 'Stranu se nepodařilo připravit: ' + e.message;
            window.zalogujChybu?.(e, 'import podkladu — strana');
        } finally {
            this.impNacitani = false;
        }
    },

    // ─── Krok 3: měřítko ────────────────────────────────────
    /** Přidá bod měření (souřadnice v přirozených px obrázku, už po magnetu). */
    impKalibPridej(bod) {
        if (this.impKalibBody.length >= 2) this.impKalibBody = [];
        this.impKalibBody.push({ x: bod.x, y: bod.y });

        // omyl (dvakrát na stejné místo) — měření zahodit
        if (this.impKalibBody.length === 2 && this.impKalibVzdalenostPx() < 5) {
            this.impKalibBody = [];
        }
    },

    impKalibZnovu() {
        this.impKalibBody = [];
        this.impKalibMm = null;
        this.pzNastroj = 'kalibrace';
    },

    /** Hotové měřítko = dva body i vyplněný skutečný rozměr. */
    impZmereno() {
        return this.impKalibBody.length === 2
            && this.impKalibVzdalenostPx() >= 5
            && parseFloat(this.impKalibMm) > 0;
    },

    /**
     * Esc v průvodci — ruší rozdělanou akci, NEzavírá okno.
     * (Zavřít jde křížkem; jinak by se omylem ztratila rozdělaná práce.)
     */
    impEsc() {
        if (!this.impOtevren) return;

        if (this.pzNastroj === 'obrys' && this.pzObrys.length) {
            this.pzObrysZpet();                // po bodech zpět
            return;
        }
        if (this._pzVyrezStart) {              // právě tažený výřez
            this._pzVyrezStart = null;
            this.pzVyrez = null;
            return;
        }
        if (this.impKalibBody.length) {        // rozdělané nebo hotové měření
            this.impKalibBody = [];
            return;
        }
        if (this.pzVyrez) {                    // hotový výřez
            this.pzVyrez = null;
            return;
        }
        if (this.pzNastroj !== 'vyrez') {      // zpět na výchozí nástroj
            this.pzNastroj = 'vyrez';
        }
    },

    impKalibVzdalenostPx() {
        if (this.impKalibBody.length < 2) return 0;
        const [a, b] = this.impKalibBody;
        return Math.hypot(b.x - a.x, b.y - a.y);
    },

    /** Metry na jeden přirozený px obrázku — jen ze změřeného rozměru. */
    impMetryNaPx() {
        const px = this.impKalibVzdalenostPx();
        const mm = parseFloat(this.impKalibMm);
        if (!px || !(mm > 0)) return 0;
        return (mm / 1000) / px;
    },

    /** Změřeno, ale ještě nevyplněná vzdálenost → zvýraznit políčko. */
    impChybiRozmer() {
        return this.impKalibBody.length === 2 && !(parseFloat(this.impKalibMm) > 0);
    },

    /** Kontrolní rozměr výkresu ve skutečnosti (pro ověření uživatelem). */
    impRozmerM() {
        const mpp = this.impMetryNaPx();
        const d = this.impStranaData;
        if (!mpp || !d) return null;
        const sirkaPx = d.typ === 'pdf' ? (d.sirka_pt / 72 * d.dpi) : d.sirka_px;
        const vyskaPx = d.typ === 'pdf' ? (d.vyska_pt / 72 * d.dpi) : d.vyska_px;
        return { sirka: sirkaPx * mpp, vyska: vyskaPx * mpp };
    },

    /**
     * Jakému měřítku odpovídá zadaný rozměr.
     *
     * Počítá se z papíru: u PDF známe rozměr stránky v bodech i DPI vykreslení,
     * takže 1 px obrázku = 25,4/dpi mm na papíře. Měřítko je pak poměr skutečné
     * vzdálenosti k té papírové. U rastru (sken, printscreen) fyzický rozměr
     * papíru neznáme → vrací null a zobrazí se rozměr výkresu.
     *
     * @returns {null|{jmenovatel:number, standard:boolean}} standard = sedí na
     *          běžné měřítko (do 3 %), jmenovatel je pak rovnou to běžné.
     */
    impMeritko() {
        const d = this.impStranaData;
        const px = this.impKalibVzdalenostPx();
        const mm = parseFloat(this.impKalibMm);
        if (!d || d.typ !== 'pdf' || !d.dpi || !px || !(mm > 0)) return null;

        const papirMm = px * 25.4 / d.dpi;
        if (!(papirMm > 0)) return null;
        const jmenovatel = mm / papirMm;
        if (!isFinite(jmenovatel) || jmenovatel <= 0) return null;

        // Běžná stavařská měřítka; tisk A3 → A4 je zmenší o √2, proto i mezihodnoty
        const bezna = [10, 20, 25, 50, 75, 100, 141, 200, 250, 500, 1000];
        const nejblizsi = bezna.reduce((a, b) => Math.abs(b - jmenovatel) < Math.abs(a - jmenovatel) ? b : a);
        const sedi = Math.abs(nejblizsi - jmenovatel) / jmenovatel <= 0.03;

        return { jmenovatel: sedi ? nejblizsi : Math.round(jmenovatel), standard: sedi };
    },

    impMeritkoPlatne() {
        const r = this.impRozmerM();
        return !!r && r.sirka > 1 && r.sirka < 500;
    },

    // ─── Krok 4: rozpoznání stěn ────────────────────────────
    impStav: 'nic',              // nic | pocitam | hotovo | chyba
    impVarianty: [],
    impVybrana: 0,
    impCas: 0,

    /** Metry na jeden bod PDF (analýza pracuje v bodech, ne v px obrázku). */
    impMetryNaBod() {
        const d = this.impStranaData;
        const mpp = this.impMetryNaPx();
        if (!d || !mpp) return 0;
        if (d.typ !== 'pdf') return mpp;                 // obrázek: body = px
        const pxNaBod = (d.sirka_pt / 72 * d.dpi) / d.sirka_pt;   // = dpi/72
        return mpp * pxNaBod;
    },

    /** Přechod na obkreslení obvodu domu. */
    impNaObrys() {
        if (!this.impMeritkoPlatne()) {
            this.impChyba = 'Nejdřív změřte známý rozměr.';
            return;
        }
        this.impChyba = '';
        this.impKrok = 'obrys';
        this.pzNastroj = 'obrys';
        this.impUlozNastaveni();         // měřítko si výkres zapamatuje
        // Odzoomovat na celý výkres (100 %) — velká změna obrazu je signál,
        // že měření skončilo a čeká se na obkreslení.
        this.$nextTick(() => this.pzCelyVykres());
    },

    /** Obrys domu přepočtený z px obrázku na body PDF. */
    impObrysVBodech() {
        const d = this.impStranaData;
        if (!d || !this.pzObrysUzavren || this.pzObrys.length < 3) return null;
        const pxNaBod = d.typ === 'pdf' ? d.dpi / 72 : 1;
        return this.pzObrys.map(b => [b.x / pxNaBod, b.y / pxNaBod]);
    },

    /** Výřez přepočtený z px obrázku na body PDF. */
    impVyrezVBodech() {
        const d = this.impStranaData;
        if (!this.pzVyrez || !d) return null;
        const pxNaBod = d.typ === 'pdf' ? d.dpi / 72 : 1;
        return {
            x: this.pzVyrez.x / pxNaBod,
            y: this.pzVyrez.y / pxNaBod,
            sirka: this.pzVyrez.sirka / pxNaBod,
            vyska: this.pzVyrez.vyska / pxNaBod,
        };
    },

    /**
     * Srovná vložené otvory podle stěn, jak je nakonec vytvořil engine.
     *
     * `fromJSON` si stěny v T-napojeních rozdělí, takže zeď pod otvorem může
     * být kratší, než s jakou se poloha počítala. Otvor, který se do ní
     * nevejde, se posune dovnitř; když je zeď kratší než otvor, zahodí se —
     * vymyšlený objekt v editoru vadí víc než chybějící.
     */
    impSrovnejOtvory() {
        if (!this.engine) return;
        let zahozeno = 0;
        for (const o of [...this.engine.openings.values()]) {
            const w = this.engine.walls.get(o.wallId);
            if (!w) { this.engine.removeOpening(o.id); zahozeno++; continue; }
            const a = this.engine.nodes.get(w.nodeA);
            const b = this.engine.nodes.get(w.nodeB);
            if (!a || !b) { this.engine.removeOpening(o.id); zahozeno++; continue; }

            const delkaM = Math.hypot(b.x - a.x, b.y - a.y) / this.engine.PX_PER_M;
            if (delkaM < o.sirka) { this.engine.removeOpening(o.id); zahozeno++; continue; }
            o.pozice = Math.max(0, Math.min(delkaM - o.sirka, o.pozice));
        }

        // Na jednom místě zdi jen jeden otvor. Kontroluje se až TEĎ, protože
        // posun otvorů dovnitř zkrácené stěny je může natlačit na sebe —
        // analýza je přitom vracela oddělené.
        const podleSten = new Map();
        for (const o of [...this.engine.openings.values()]) {
            if (!podleSten.has(o.wallId)) podleSten.set(o.wallId, []);
            podleSten.get(o.wallId).push(o);
        }
        for (const naStene of podleSten.values()) {
            naStene.sort((x, y) => y.sirka - x.sirka);      // širší má přednost
            const ponechane = [];
            for (const o of naStene) {
                const koliduje = ponechane.some(v =>
                    Math.min(v.pozice + v.sirka, o.pozice + o.sirka) - Math.max(v.pozice, o.pozice) > 0.02);
                if (koliduje) { this.engine.removeOpening(o.id); zahozeno++; }
                else ponechane.push(o);
            }
        }
        return zahozeno;
    },

    /** Spustí rozpoznávání stěn nad vektory výkresu. */
    async impRozpoznat() {
        const d = this.impStranaData;
        if (!d?.vektor) {
            this.impChyba = 'Rozpoznání stěn umí zatím jen vektorová PDF (výkres od architekta).';
            return;
        }
        if (!this.impMeritkoPlatne()) {
            this.impChyba = 'Nejdřív nastavte měřítko.';
            return;
        }

        this.impKrok = 'steny';
        this.impStav = 'pocitam';
        this.impChyba = '';
        this.impVarianty = [];
        this.impVybrana = 0;
        this.impUlozNastaveni();         // obkreslený obvod si výkres zapamatuje

        try {
            const svg = await (await fetch(d.vektor)).text();

            // Hladiny PDF jsou bonus, ne podmínka — zploštělá PDF je nemají.
            // Selhání téhle adresy proto rozpoznávání nezastaví, jen se o jednu
            // variantu připraví; zapsat ji ale chceme, ať o tom víme.
            let vrstvy = null;
            if (d.vrstvy) {
                try {
                    vrstvy = await (await fetch(d.vrstvy)).json();
                } catch (e) {
                    window.zalogujChybu?.(e, 'import — hladiny PDF', { otisk: d.otisk, strana: d.strana });
                }
            }

            const nast = {
                metryNaBod: this.impMetryNaBod(),
                vyrez: this.impVyrezVBodech(),
                // obkreslený obvod = tvrdá hranice i jisté obvodové stěny
                obrys: this.impObrysVBodech(),
                maxVariant: 4,
                vrstvy,
            };

            const verze = _kkInitData.verzeImportu || Date.now();
            const worker = new Worker('/js/koncept-v3/import-worker.js?v=' + verze);
            const odpoved = await new Promise((hotovo, chyba) => {
                worker.onmessage = (z) => hotovo(z.data);
                worker.onerror = (e) => chyba(new Error(e.message || 'worker selhal'));
                worker.postMessage({ svg, nast });
            });
            worker.terminate();

            if (!odpoved.ok) throw new Error(odpoved.chyba || 'rozpoznání selhalo');

            this.impVarianty = odpoved.varianty;
            this.impCas = odpoved.cas;
            this.impStav = this.impVarianty.length ? 'hotovo' : 'chyba';
            if (!this.impVarianty.length) {
                this.impChyba = 'Ve výkresu se nepodařilo najít stěny. Zkuste jiný výřez, nebo výkres obkreslete ručně.';
            }
            this.$nextTick(() => this.impNakresliNahledy());
        } catch (e) {
            this.impStav = 'chyba';
            this.impChyba = 'Rozpoznání selhalo: ' + e.message;
            window.zalogujChybu?.(e, 'import — rozpoznání stěn');
        }
    },

    /** Vykreslí náhledy variant (výkres + nalezené stěny). */
    impNakresliNahledy() {
        const d = this.impStranaData;
        if (!d) return;
        const sirkaBodu = d.typ === 'pdf' ? d.sirka_pt : d.sirka_px;
        const vyskaBodu = d.typ === 'pdf' ? d.vyska_pt : d.vyska_px;

        this.impVarianty.forEach((v, i) => {
            // x-ref nejde v cyklu pojmenovat dynamicky → hledá se podle data-atributu
            const platno = document.querySelector('canvas[data-nahled="' + i + '"]');
            if (!platno) return;

            // rozlišení plátna = jeho skutečná velikost na obrazovce, jinak
            // se kresba roztáhne a dům přeteče přes okraj náhledu
            const sirkaCSS = platno.clientWidth || 1080;
            const vyskaCSS = platno.clientHeight || 620;
            if (platno.width !== sirkaCSS || platno.height !== vyskaCSS) {
                platno.width = sirkaCSS;
                platno.height = vyskaCSS;
            }

            // náhled zaměřit na obkreslený dům, jinak na výřez, jinak celá strana
            const obrys = this.impObrysVBodech();
            let vyrez = this.impVyrezVBodech() || { x: 0, y: 0, sirka: sirkaBodu, vyska: vyskaBodu };
            if (obrys) {
                const xs = obrys.map(b => b[0]), ys = obrys.map(b => b[1]);
                const okraj = 20;   // bodů PDF kolem domu, ať je vidět okolí
                vyrez = {
                    x: Math.min(...xs) - okraj,
                    y: Math.min(...ys) - okraj,
                    sirka: Math.max(...xs) - Math.min(...xs) + okraj * 2,
                    vyska: Math.max(...ys) - Math.min(...ys) + okraj * 2,
                };
            }
            const k = Math.min(platno.width / vyrez.sirka, platno.height / vyrez.vyska);
            const posunX = (platno.width - vyrez.sirka * k) / 2;
            const posunY = (platno.height - vyrez.vyska * k) / 2;

            const g = platno.getContext('2d');
            g.clearRect(0, 0, platno.width, platno.height);

            // podkres výkresu
            const obrazek = new Image();
            obrazek.onload = () => {
                g.globalAlpha = 0.3;
                const pxNaBod = obrazek.naturalWidth / sirkaBodu;
                g.drawImage(obrazek,
                    vyrez.x * pxNaBod, vyrez.y * pxNaBod, vyrez.sirka * pxNaBod, vyrez.vyska * pxNaBod,
                    posunX, posunY, vyrez.sirka * k, vyrez.vyska * k);
                g.globalAlpha = 1;
                kresliOsy();
            };
            obrazek.onerror = kresliOsy;
            obrazek.src = d.obrazek;

            // px na metr: k je px na bod PDF, metryNaBod je metr na bod
            const pxNaMetr = k / (this.impMetryNaBod() || 0.0353);

            function kresliOsy() {
                for (const o of v.osy) {
                    // obvod (od uživatele) zeleně, vnitřní podle tloušťky
                    g.strokeStyle = o.obvodova ? '#16a34a' : (o.tloustka > 0.3 ? '#c81400' : '#0a74d8');
                    // stěna se kreslí svou SKUTEČNOU tloušťkou, ať je vidět,
                    // jestli sedí s výkresem pod ní
                    g.lineWidth = Math.max(1, o.tloustka * pxNaMetr);
                    g.beginPath();
                    g.moveTo(posunX + (o.x1 - vyrez.x) * k, posunY + (o.y1 - vyrez.y) * k);
                    g.lineTo(posunX + (o.x2 - vyrez.x) * k, posunY + (o.y2 - vyrez.y) * k);
                    g.stroke();
                }
            }
        });
    },

    impVyberVariantu(i) {
        this.impVybrana = i;
    },

    /** Převezme vybranou variantu do editoru jako stěny. */
    impPrevezmiSteny() {
        const varianta = this.impVarianty[this.impVybrana];
        const d = this.impStranaData;
        if (!varianta || !d) return;

        if (this.engine.walls.size > 0
            && !confirm('V konceptu už je kresba. Nahradit ji stěnami z výkresu?')) {
            return;
        }

        // Podklad leží středem strany na počátku — stěny musí sedět přesně na něj.
        const sirkaBodu = d.typ === 'pdf' ? d.sirka_pt : d.sirka_px;
        const vyskaBodu = d.typ === 'pdf' ? d.vyska_pt : d.vyska_px;
        const steny = window.ImportAnalyza.osyNaSteny(
            varianta.osy, this.impMetryNaBod(), [sirkaBodu / 2, vyskaBodu / 2],
        );
        // otvory se vážou na stěny přes id, které osyNaSteny přidělilo
        const otvory = window.ImportAnalyza.otvoryNaSteny(
            varianta.osy, varianta.otvory || [], this.impMetryNaBod(),
        );

        // Podklad (ať je podle čeho opravovat) vložit VŽDY — i když ho uživatel
        // přeskočil a i když jde o tentýž výkres. Musí odpovídat právě
        // importovaným stěnám: dřív se nevyměnil, když šlo o stejný výkres a
        // stranu, takže po přeměření (jiná kóta, jiné měřítko) zůstal pod novou
        // kresbou podklad v původní velikosti — malé stěny na velkém podkladu.
        this.impVloz(false);

        // Tloušťky z měření se smí srovnat na normovou řadu (0.1437 → 0.14).
        this.engine.fromJSON({ steny, otvory }, { snapTloustky: true });
        // Z rozpoznávání vycházejí úhly na desetiny stupně mimo — čáry ve
        // výkrese nejsou přesně rovnoběžné a měřítko to ještě zvětší. Srovnat
        // se musí hned, jinak se ta odchylka přenese do všeho, co uživatel
        // nakreslí navazujícího.
        this._srovnejPraveUhly?.();
        this.impSrovnejOtvory();
        this.renderer.render();
        this.fitView?.();                       // ukázat rovnou celý výsledek
        this._posledniAkce = 'Import stěn z výkresu'
            + (otvory.length ? ' (' + otvory.length + ' otvorů)' : '');
        this.ulozit?.();
        this.obnovSeznamObjektu?.();
        this.impZavri();
    },

    // ─── Vložení podkladu do editoru ────────────────────────
    impVloz(zavrit = true) {
        const r = this.impRozmerM();
        const d = this.impStranaData;
        if (!r || !d) return;

        // Při výměně podkladu za tentýž výkres si uživatel zaslouží ponechat,
        // jak si ho nastavil (sytost, pod/nad kresbou).
        const stejnyVykres = this.podklad
            && this.podklad.otisk === this.impOtisk
            && Number(this.podklad.strana) === Number(this.impStrana);
        const pruhlednost = stejnyVykres ? (this.podklad.pruhlednost ?? 0.5) : 0.5;
        const zobrazeni = stejnyVykres ? (this.podklad.zobrazeni || 'pod') : 'pod';

        this.podklad = {
            url: d.obrazek,
            vektor: d.vektor || null,
            otisk: this.impOtisk,
            strana: this.impStrana,
            nazev: this.impNazev,
            metryNaPx: this.impMetryNaPx(),
            zmerenoMm: this.impKalibMm,
            // výřez (px obrázku) — omezí rozpoznávání stěn jen na půdorys,
            // bez legend, tabulek a razítka
            vyrez: this.pzVyrez ? { ...this.pzVyrez } : null,
            sirkaM: r.sirka,
            vyskaM: r.vyska,
            stredX: 0,
            stredY: 0,
            uhel: 0,
            pruhlednost,
            zobrazeni,
        };

        this.renderer?.nactiPodklad(this.podklad, () => {
            this.renderer.podkladLayer.batchDraw();
            if (!this.engine || this.engine.walls.size === 0) this.podkladNaObrazovku();
        });
        this.podkladUloz();
        if (zavrit) this.impZavri();
    },

    /** Přizpůsobí pohled tak, aby byl vidět celý podklad. */
    podkladNaObrazovku() {
        if (!this.podklad || !this.stage) return;

        const pxNaM = this.engine?.PX_PER_M || 80;
        const sirkaPx = this.podklad.sirkaM * pxNaM;
        const vyskaPx = this.podklad.vyskaM * pxNaM;
        const okraj = 40;
        const zoom = Math.min(
            (this.stage.width() - okraj * 2) / (sirkaPx || 1),
            (this.stage.height() - okraj * 2) / (vyskaPx || 1),
        );

        this.stage.scale({ x: zoom, y: zoom });
        this.stage.position({
            x: this.stage.width() / 2 - (this.podklad.stredX || 0) * zoom,
            y: this.stage.height() / 2 - (this.podklad.stredY || 0) * zoom,
        });
        this.zoom = zoom;
        this.renderer?.renderGrid();
        this.stage.batchDraw();
    },

    // ─── Správa vloženého podkladu ──────────────────────────
    /** Aktuální režim podkladu; staré koncepty mají jen `viditelny`. */
    podkladZobrazeni() {
        if (!this.podklad) return 'skryt';
        if (this.podklad.zobrazeni) return this.podklad.zobrazeni;
        return this.podklad.viditelny === false ? 'skryt' : 'pod';
    },

    podkladZmena(zmeny) {
        if (!this.podklad) return;
        Object.assign(this.podklad, zmeny);
        this.renderer?.aktualizujPodklad(zmeny);
        this.podkladUloz();
    },

    // ─── Podklad jede s celým domem ─────────────────────────
    // Výkres a podklad tvoří celek: když uživatel chytí VŠECHNY stěny
    // (umisťuje dům na parcelu), posune/otočí se i podklad. Při úpravě jen
    // části stěn podklad stojí — slouží jako pravítko, podle kterého se opravuje.

    /** Je vybraný celý dům (všechny stěny) a je co s ním vézt? */
    podkladJedeSVyberem() {
        const pocet = this.engine?.walls.size || 0;
        return !!(this.podklad && this.renderer && pocet > 0
            && this.renderer.selectedWalls.size === pocet);
    },

    /** Posune podklad o dx/dy (px plátna) — jen zobrazení, uloží se po puštění. */
    podkladPosun(dx, dy) {
        if (!this.podklad) return;
        this.podklad.stredX = (this.podklad.stredX || 0) + dx;
        this.podklad.stredY = (this.podklad.stredY || 0) + dy;
        this.renderer?.aktualizujPodklad({ stredX: this.podklad.stredX, stredY: this.podklad.stredY });
    },

    /**
     * Otočí podklad z výchozí polohy `vychozi` kolem (cx, cy) o `delta` rad.
     * Stejný vzorec jako u uzlů stěn (plátno má +y dolů, kladný úhel = po směru
     * hodinových ručiček), takže sedí i na Konva `rotation` ve stupních.
     */
    podkladOtoc(vychozi, cx, cy, delta) {
        if (!this.podklad || !vychozi) return;
        const cos = Math.cos(delta), sin = Math.sin(delta);
        const rx = vychozi.stredX - cx, ry = vychozi.stredY - cy;
        this.podklad.stredX = cx + rx * cos - ry * sin;
        this.podklad.stredY = cy + rx * sin + ry * cos;
        this.podklad.uhel = vychozi.uhel + delta * 180 / Math.PI;
        this.renderer?.aktualizujPodklad({
            stredX: this.podklad.stredX, stredY: this.podklad.stredY, uhel: this.podklad.uhel,
        });
    },

    /** Poloha podkladu pro krok Zpět (jen poloha — sytost a režim Zpět nevrací). */
    podkladPolohaZachyt() {
        // Při startu editoru (výchozí krok historie) ještě podklad nemusí být
        // načtený — jeho uložený stav ale už je v metadatech.
        const p = this.podklad || this.metadata?.podklad;
        if (!p || !p.url) return null;
        return {
            url: p.url,
            stredX: p.stredX || 0,
            stredY: p.stredY || 0,
            uhel: p.uhel || 0,
        };
    },

    podkladPolohaObnov(s) {
        // Jiný podklad (mezitím vyměněný) se podle starého kroku nehýbe.
        if (!s || !this.podklad || this.podklad.url !== s.url) return;
        const p = this.podklad;
        if ((p.stredX || 0) === s.stredX && (p.stredY || 0) === s.stredY && (p.uhel || 0) === s.uhel) return;
        this.podkladZmena({ stredX: s.stredX, stredY: s.stredY, uhel: s.uhel });
    },

    podkladOdeber() {
        this.podklad = null;
        this.renderer?.smazPodklad();
        this.podkladUloz();
    },

    /** Uloží stav podkladu do metadat konceptu (bez verzování kresby). */
    async podkladUloz() {
        if (!this.projektId) return;
        this.metadata = { ...(this.metadata || {}), podklad: this.podklad };
        try {
            await fetch(_kkInitData.routes.ulozit.replace(':id', this.projektId), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': _kkInitData.csrf, 'Accept': 'application/json' },
                body: JSON.stringify({ metadata: this.metadata }),
            });
        } catch (e) {
            window.zalogujChybu?.(e, 'import podkladu — uložení');
        }
    },
};

/**
 * Složí Alpine komponentu editoru V3 z editoru a mixinů importu.
 *
 * NESMÍ se použít `{ ...editor, ...mixin }`: rozprostření getter zavolá a
 * uloží jako pevnou hodnotu. `gridStyle`, `vertikalni`, `seznamObjektu`
 * a spol. by se pak spočítaly jednou při startu a už nikdy — posuvník
 * mezi plátnem a panelem ani přepínač rozložení by se neprojevily.
 */
window.konceptV3Komponenta = function (init) {
    const komponenta = konceptKEditor(init);
    for (const mixin of [window.KonceptImport, window.KonceptImportProhlizec]) {
        if (mixin) Object.defineProperties(komponenta, Object.getOwnPropertyDescriptors(mixin));
    }
    return komponenta;
};
