{{-- Blok článku `:::druh Titulek` … `:::`: upozornění U1 (modules/brand.md). --}}
<div class="tt-upozorneni {{ in_array($druh, ['pozor', 'chyba', 'hotovo'], true) ? $druh : '' }}">
    @if ($titulek !== '')
        <div class="tt-upozorneni-titulek">{{ $titulek }}</div>
    @endif
    {!! $html !!}
</div>
