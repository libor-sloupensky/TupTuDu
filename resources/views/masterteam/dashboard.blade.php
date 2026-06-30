<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Administrace — TupTuDu</title>
    <style>
        :root {
            --c-bg: #0f1115;
            --c-surface: #171a21;
            --c-border: rgba(255,255,255,.08);
            --c-text: #e7e9ee;
            --c-muted: #9aa0ab;
            --c-primary: #4f8cff;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100vh;
            background: var(--c-bg); color: var(--c-text);
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        }
        header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 1rem 1.5rem; border-bottom: 1px solid var(--c-border);
        }
        .brand { color: var(--c-primary); font-weight: 700; }
        main { padding: 2rem 1.5rem; max-width: 60rem; margin: 0 auto; }
        .logout { background: none; border: 1px solid var(--c-border); color: var(--c-muted);
            padding: .45rem .8rem; border-radius: 8px; cursor: pointer; font-size: .9rem; }
        .muted { color: var(--c-muted); }
        nav a { color: var(--c-primary); text-decoration: none; }
    </style>
</head>
<body>
    <header>
        <div><span class="brand">TupTuDu</span> · administrace</div>
        <form method="POST" action="/logout">
            @csrf
            <button type="submit" class="logout">Odhlásit</button>
        </form>
    </header>
    <main>
        <h1>Vítej, {{ auth()->user()->celeJmeno() }}</h1>
        <p class="muted">Jsi přihlášen jako master tým (IČO {{ config('app.master_ico') }}).</p>

        <nav style="margin-top:1.5rem;">
            <ul>
                <li><a href="/masterteam/uzivatele">Správa uživatelů</a></li>
            </ul>
        </nav>

        <p class="muted" style="margin-top:1.5rem;">Modul Koncept přibude v další etapě.</p>
    </main>
</body>
</html>
