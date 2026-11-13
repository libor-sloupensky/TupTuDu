{{-- Společné styly srovnávacích stránek (modules/srovnani.md). Barvy jen z proměnných brandu.
     Náhled v Masterteamu: texty zatím česky natvrdo, před zveřejněním přejdou do lang skupiny `srovnani`. --}}
<style>
    .sr { max-width: 60rem; margin: 0 auto; padding: 24px 16px 64px; color: var(--c-text); }
    .sr h1 { font-size: clamp(28px, 4vw, 40px); line-height: 1.15; margin: 8px 0 12px; }
    .sr h2 { font-size: 22px; margin: 36px 0 12px; }
    .sr-tlumene { color: var(--c-text-secondary); }
    .sr-autor { font-size: 14px; color: var(--c-text-secondary); border-left: 3px solid var(--c-primary); padding: 6px 12px; margin: 12px 0 20px; }
    .sr-nahled { position: sticky; top: 0; z-index: 30; background: var(--c-chip); color: var(--c-text); border: 1px dashed var(--c-warn); border-radius: 8px; padding: 8px 14px; font-size: 14px; margin-bottom: 16px; }
    .sr-karty { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 12px; }
    .sr-karta { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 10px; padding: 14px 16px; font-size: 15px; }
    /* Nadpis karty je výraznější než obsah (Libor 13. 11. 2026) */
    .sr-karta-nadpis { font-size: 17px; font-weight: 700; margin-bottom: 8px; color: var(--c-text); }
    .sr-odrazky { margin: 6px 0 4px; padding-left: 1.2em; }
    .sr-odrazky li { margin: 3px 0; line-height: 1.45; }
    .sr-my { background: var(--c-primary-10); }
    .sr-dve { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 720px) { .sr-dve { grid-template-columns: 1fr; } }
    .sr-tab { width: 100%; border-collapse: collapse; font-size: 14.5px; }
    .sr-tab th, .sr-tab td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--c-border); }
    .sr-tab thead th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--c-text-secondary); }
    .sr-tab tr.sr-skupina th { background: color-mix(in srgb, var(--c-text) 5%, transparent); font-size: 13px; }
    .sr-obal { overflow-x: auto; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 10px; }
    .sr-h { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; white-space: nowrap; }
    .sr-d { width: 11px; height: 11px; border-radius: 50%; display: inline-block; flex: none; }
    .sr-d.ano { background: var(--c-ok); }
    .sr-d.castecne { border: 2px solid var(--c-warn); background: linear-gradient(90deg, var(--c-warn) 50%, transparent 50%); }
    .sr-d.ne { border: 1.5px solid var(--c-border-strong); }
    .sr-d.q { border: 1.5px dashed var(--c-text-secondary); }
    .sr-pozn { display: block; font-size: 12.5px; color: var(--c-text-secondary); line-height: 1.4; margin-top: 2px; }
    .sr-bez-dokladu { outline: 1.5px dashed var(--c-warn); outline-offset: 2px; border-radius: 4px; }
    .sr-stitek { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 5px; background: var(--c-primary-10); color: var(--c-primary-text); }
    .sr-cta { display: inline-block; background: var(--c-primary); color: var(--c-on-primary); font-weight: 700; padding: 10px 18px; border-radius: 8px; text-decoration: none; }
    .sr-metodika { font-size: 14px; color: var(--c-text-secondary); margin-top: 40px; border-top: 1px solid var(--c-border); padding-top: 16px; }
    .sr-metodika p + p { margin-top: 8px; }
    .sr ul { padding-left: 1.2em; }
</style>
