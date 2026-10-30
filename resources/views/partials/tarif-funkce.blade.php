{{-- Funkce v kartě tarifu (ceník webu i předplatné v aplikaci) — jen služby, které jsou
     v zemi návštěvníka (config/lokalizace.php). Mají je všechny tarify; nepsat sem nic, co ještě není. --}}
@funkce('katastr')
    <li>{{ __('tarify.funkce_katastr') }}</li>
@endfunkce
@funkce('mapovy_podklad')
    <li>{{ __('tarify.funkce_mapy') }}</li>
@endfunkce
@funkce('vyskovy_profil')
    <li>{{ __('tarify.funkce_teren') }}</li>
@endfunkce
