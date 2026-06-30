<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Administrace — TupTuDu</title>
    <link rel="stylesheet" href="/css/app.css">
    <style>
        main { padding: 2rem 1.5rem; max-width: 60rem; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="topbar">
        <span class="brand-title"><span class="brand">TupTuDu</span> · administrace</span>
        <form method="POST" action="/logout">@csrf<button type="submit" class="btn btn-sm">Odhlásit</button></form>
    </div>
    <main>
        <h1>Vítej, {{ auth()->user()->celeJmeno() }}</h1>
        <p class="muted">Jsi přihlášen jako master tým (IČO {{ config('app.master_ico') }}).</p>

        <nav style="margin-top:1.5rem;">
            <ul>
                <li><a href="/masterteam/koncept">Koncept (editor půdorysů)</a></li>
                <li><a href="/masterteam/pravidla-objektu">Pravidla objektů</a></li>
                <li><a href="/masterteam/uzivatele">Správa uživatelů</a></li>
            </ul>
        </nav>
    </main>
</body>
</html>
