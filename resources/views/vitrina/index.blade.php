<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>TupTuDu — projekt v přípravě</title>
    <style>
        :root {
            --c-bg: #0f1115;
            --c-surface: #171a21;
            --c-text: #e7e9ee;
            --c-muted: #9aa0ab;
            --c-primary: #4f8cff;
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
            border: 1px solid rgba(255, 255, 255, .06);
            border-radius: 16px;
            padding: 2.5rem 2rem;
            max-width: 32rem; width: 100%;
            text-align: center;
        }
        h1 { margin: 0 0 .5rem; font-size: 1.75rem; letter-spacing: -.02em; }
        .brand { color: var(--c-primary); }
        p { margin: .25rem 0; color: var(--c-muted); line-height: 1.6; }
    </style>
</head>
<body>
    <main class="card">
        <h1><span class="brand">TupTuDu</span></h1>
        <p>Projekt v přípravě.</p>
    </main>
</body>
</html>
