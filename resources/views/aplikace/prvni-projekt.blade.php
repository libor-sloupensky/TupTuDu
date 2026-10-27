{{-- Úvodní obrazovka zákazníka, který ještě nemá žádný projekt (ProjektyController::index). --}}
<x-layouts.zakaznik :title="__('projekty.prvni_titulek')">
    <div class="tt-prvni-projekt">
        <h1>{{ __('projekty.prvni_nadpis', ['jmeno' => auth()->user()->jmeno]) }}</h1>
        <p>{{ __('projekty.prvni_popis') }}</p>
        <form method="POST" action="{{ route('app.projekty.novy') }}">
            @csrf
            <button type="submit" class="btn btn-primary">{{ __('projekty.prvni_tlacitko') }}</button>
        </form>
    </div>
</x-layouts.zakaznik>
