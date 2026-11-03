{{-- Uzamčený odkaz: autor už nemá tarif se sdílením. Bez názvu projektu a bez dat, viz modules/sdileni.md. --}}
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" data-theme="{{ request()->cookie('tt_rezim') === 'light' ? 'light' : 'dark' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <meta name="referrer" content="no-referrer">
    <title>{{ __('sdileni.uzamceno_titulek') }} — TupTuDu</title>
    @include('partials.hlava-brand')
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
</head>
<body class="tt-web">
    <div class="topbar">
        <a href="{{ \App\Support\Domeny::url('web', '/') }}" class="brand-title" rel="noreferrer">@include('partials.znacka')</a>
    </div>
    <main class="tt-web-obsah">
        <h1>{{ __('sdileni.uzamceno_titulek') }}</h1>
        <p>{{ __('sdileni.uzamceno_text') }}</p>
    </main>
@include('partials.paticka')
</body>
</html>
