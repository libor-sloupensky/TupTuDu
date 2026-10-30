<x-layouts.web :title="__('web.titulek')">
    <x-slot:hlava>
        <style>
            .wrap { display: flex; align-items: center; justify-content: center; min-height: 64vh; padding: 1.5rem; text-align: center; }
            h1 { font-size: 1.75rem; }
        </style>
    </x-slot:hlava>
    <div class="wrap">
        <h1>{{ __('web.v_priprave') }}</h1>
    </div>
</x-layouts.web>
