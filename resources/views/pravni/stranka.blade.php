{{-- Rám právní stránky (PravniController). Obsah = celý dokument v jazyce návštěvníka. --}}
<x-layouts.web :title="$titulek . ' — TupTuDu'">
    <article class="tt-pravni">
        @include($obsah)
    </article>
</x-layouts.web>
