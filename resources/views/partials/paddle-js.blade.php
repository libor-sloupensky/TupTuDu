{{-- Paddle.js — platební okno (overlay) pro předplatné (modules/platby.md).
     Místo @paddleJS z Cashieru kvůli vlastnímu nastavení okna a událostem:
     každá událost Paddlu se přepošle jako window událost `paddle-udalost`.
     Jazyk okna Paddle bere z prohlížeče. Inicializace až po načtení stránky —
     to už je načtený hlásič chyb (partials/error-tracker na konci layoutu). --}}
<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function () {
        try {
            @if (config('cashier.sandbox'))
                Paddle.Environment.set('sandbox');
            @endif
            Paddle.Initialize({
                token: @json(config('cashier.client_side_token')),
                checkout: { settings: { displayMode: 'overlay', theme: 'light', allowLogout: false } },
                eventCallback: function (udalost) {
                    window.dispatchEvent(new CustomEvent('paddle-udalost', { detail: udalost }));
                },
            });
        } catch (e) {
            // typicky blokátor reklam nepustil cdn.paddle.com — tlačítko pak hlásí chybu samo
            window.zalogujChybu?.(e, 'Předplatné: inicializace Paddle.js');
        }
    });
</script>
