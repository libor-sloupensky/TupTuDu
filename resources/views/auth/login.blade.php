<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Přihlášení — TupTuDu</title>
    <link rel="stylesheet" href="/css/app.css">
    <style>
        .wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
        .card { max-width: 24rem; width: 100%; }
        h1 { font-size: 1.35rem; margin-top: 0; }
        .row-check { display: flex; align-items: center; gap: .5rem; margin-bottom: 1rem; }
        .row-check input { width: auto; margin: 0; }
        .row-check label { margin: 0; }
        button { width: 100%; }
    </style>
</head>
<body>
    <div class="wrap">
        <main class="card">
            <h1>Přihlášení do <span class="brand">TupTuDu</span></h1>

            @if ($errors->any())
                <div class="flash chyba">
                    @foreach ($errors->all() as $error){{ $error }}@endforeach
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

                <button type="submit" class="btn btn-primary">Přihlásit se</button>
            </form>
        </main>
    </div>
</body>
</html>
