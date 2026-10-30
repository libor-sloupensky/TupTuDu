{{-- E-mail provozovatele chráněný před roboty, kteří sbírají adresy pro spam.
     V HTML není adresa vcelku (části pozpátku v data-*), skládá ji až skript v prohlížeči.
     Bez JavaScriptu zůstane čitelné „info (zavináč) tuptudu.com" — zákonná povinnost
     (uvést e-mail provozovatele) je splněná i tak. Použití: @include('partials.email-chraneny') --}}
<span class="tt-email" data-a="ofni" data-b="moc.udutput">info ({{ __('obecne.zavinac') }}) tuptudu.com</span>
@once
    <script>
        document.querySelectorAll('.tt-email').forEach((el) => {
            const otoc = (s) => s.split('').reverse().join('');
            const adresa = otoc(el.dataset.a) + String.fromCharCode(64) + otoc(el.dataset.b);
            const odkaz = document.createElement('a');
            odkaz.href = 'mai' + 'lto:' + adresa;
            odkaz.textContent = adresa;
            el.replaceWith(odkaz);
        });
    </script>
@endonce
