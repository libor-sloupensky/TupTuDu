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

            @if (config('services.google.client_id'))
                <div style="margin:1rem 0 .25rem; text-align:center; color:var(--c-text-secondary); font-size:.85rem;">nebo</div>
                <a href="/auth/google" class="btn" style="display:flex; align-items:center; justify-content:center; gap:.6rem;">
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Přihlásit přes Google
                </a>
            @endif
        </main>
    </div>
</body>
</html>
