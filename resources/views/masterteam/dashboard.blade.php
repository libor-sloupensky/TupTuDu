<x-layouts.app title="Administrace — TupTuDu">
    <h1>Vítej, {{ auth()->user()->celeJmeno() }}</h1>
    <p class="muted">Jsi přihlášen jako master tým (IČO {{ config('app.master_ico') }}).</p>
    <p class="muted">Vyber modul v levém menu.</p>
</x-layouts.app>
