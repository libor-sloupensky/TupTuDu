<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Přihlášení — TupTuDu</title>
    <style>
        :root {
            --c-bg: #0f1115;
            --c-surface: #171a21;
            --c-border: rgba(255,255,255,.08);
            --c-text: #e7e9ee;
            --c-muted: #9aa0ab;
            --c-primary: #4f8cff;
            --c-error: #ff6b6b;
        }
        * { box-sizing: border-box; }
        html, body { height: 100%; margin: 0; }
        body {
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; padding: 1.5rem;
            background: var(--c-bg); color: var(--c-text);
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        }
        .card {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: 16px;
            padding: 2rem;
            max-width: 24rem; width: 100%;
        }
        h1 { margin: 0 0 1.5rem; font-size: 1.35rem; }
        .brand { color: var(--c-primary); }
        label { display: block; font-size: .85rem; color: var(--c-muted); margin: 0 0 .35rem; }
        input {
            width: 100%; padding: .6rem .75rem; margin-bottom: 1rem;
            background: #0f1115; color: var(--c-text);
            border: 1px solid var(--c-border); border-radius: 8px; font-size: 1rem;
        }
        input:focus { outline: none; border-color: var(--c-primary); }
        button {
            width: 100%; padding: .7rem; border: 0; border-radius: 8px;
            background: var(--c-primary); color: #fff; font-size: 1rem; font-weight: 600;
            cursor: pointer;
        }
        .errors { color: var(--c-error); font-size: .85rem; margin: 0 0 1rem; }
        .errors ul { margin: 0; padding-left: 1.1rem; }
        .row-check { display: flex; align-items: center; gap: .5rem; margin-bottom: 1rem; }
        .row-check input { width: auto; margin: 0; }
        .row-check label { margin: 0; }
    </style>
</head>
<body>
    <main class="card">
        <h1>Přihlášení do <span class="brand">TupTuDu</span></h1>

        @if ($errors->any())
            <div class="errors">
                <ul>
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form method="POST" action="/login">
            @csrf
            <label for="email">E-mail</label>
            <input id="email" type="email" name="email" value="{{ old('email') }}" required autofocus>

            <label for="password">Heslo</label>
            <input id="password" type="password" name="password" required>

            <div class="row-check">
                <input id="remember" type="checkbox" name="remember">
                <label for="remember">Zapamatovat přihlášení</label>
            </div>

            <button type="submit">Přihlásit se</button>
        </form>
    </main>
</body>
</html>
