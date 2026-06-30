<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Uživatelé — TupTuDu administrace</title>
    <style>
        :root {
            --c-bg: #0f1115; --c-surface: #171a21; --c-border: rgba(255,255,255,.08);
            --c-text: #e7e9ee; --c-muted: #9aa0ab; --c-primary: #4f8cff;
            --c-ok: #46c08a; --c-error: #ff6b6b;
        }
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; background: var(--c-bg); color: var(--c-text);
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
        header { display: flex; align-items: center; justify-content: space-between;
            padding: 1rem 1.5rem; border-bottom: 1px solid var(--c-border); }
        .brand { color: var(--c-primary); font-weight: 700; }
        main { padding: 2rem 1.5rem; max-width: 60rem; margin: 0 auto; }
        a { color: var(--c-primary); text-decoration: none; }
        h1 { font-size: 1.4rem; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0 2rem; }
        th, td { text-align: left; padding: .6rem .5rem; border-bottom: 1px solid var(--c-border); font-size: .95rem; }
        th { color: var(--c-muted); font-weight: 600; }
        .tag { font-size: .8rem; padding: .15rem .5rem; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); }
        .tag.vlastnik { color: var(--c-primary); border-color: var(--c-primary); }
        form.inline { display: inline; }
        button { cursor: pointer; border-radius: 8px; border: 1px solid var(--c-border);
            background: none; color: var(--c-text); padding: .35rem .6rem; font-size: .85rem; }
        button.danger { color: var(--c-error); border-color: var(--c-error); }
        .card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; padding: 1.25rem; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
        label { display:block; font-size:.8rem; color: var(--c-muted); margin: 0 0 .25rem; }
        input[type=text], input[type=email], input[type=password] {
            width: 100%; padding: .5rem .6rem; background: #0f1115; color: var(--c-text);
            border: 1px solid var(--c-border); border-radius: 8px; }
        .btn-primary { background: var(--c-primary); color: #fff; border: 0; padding: .6rem 1rem; font-weight: 600; }
        .flash { padding: .6rem .9rem; border-radius: 8px; margin-bottom: 1rem; }
        .flash.ok { background: rgba(70,192,138,.12); color: var(--c-ok); }
        .flash.chyba { background: rgba(255,107,107,.12); color: var(--c-error); }
        .errors { color: var(--c-error); font-size: .85rem; }
        .full { grid-column: 1 / -1; }
        .muted { color: var(--c-muted); }
    </style>
</head>
<body>
    <header>
        <div><span class="brand">TupTuDu</span> · <a href="/masterteam">administrace</a> · uživatelé</div>
        <form method="POST" action="/logout">@csrf<button type="submit">Odhlásit</button></form>
    </header>
    <main>
        <h1>Uživatelé master týmu</h1>

        @if (session('ok'))<div class="flash ok">{{ session('ok') }}</div>@endif
        @if (session('chyba'))<div class="flash chyba">{{ session('chyba') }}</div>@endif
        @if ($errors->any())
            <div class="flash chyba"><ul class="errors">@foreach ($errors->all() as $e)<li>{{ $e }}</li>@endforeach</ul></div>
        @endif

        <table>
            <thead><tr><th>Jméno</th><th>E-mail</th><th>Role</th><th>Akce</th></tr></thead>
            <tbody>
            @foreach ($uzivatele as $u)
                <tr>
                    <td>{{ $u->celeJmeno() }}</td>
                    <td>{{ $u->email }}</td>
                    <td>
                        @if ($u->pivot->je_vlastnik)
                            <span class="tag vlastnik">vlastník</span>
                        @else
                            <span class="tag">správce</span>
                        @endif
                    </td>
                    <td>
                        <form class="inline" method="POST" action="/masterteam/uzivatele/{{ $u->id }}/role">
                            @csrf @method('PATCH')
                            <button type="submit">{{ $u->pivot->je_vlastnik ? 'Na správce' : 'Na vlastníka' }}</button>
                        </form>
                        <form class="inline" method="POST" action="/masterteam/uzivatele/{{ $u->id }}"
                              onsubmit="return confirm('Odebrat uživatele z master týmu?');">
                            @csrf @method('DELETE')
                            <button type="submit" class="danger">Odebrat</button>
                        </form>
                    </td>
                </tr>
            @endforeach
            </tbody>
        </table>

        <div class="card">
            <h2 style="margin-top:0;font-size:1.1rem;">Přidat uživatele</h2>
            <p class="muted" style="margin-top:0;">Vytvoří účet a přidá ho do master týmu. (Pozvánky e-mailem doplníme později.)</p>
            <form method="POST" action="/masterteam/uzivatele">
                @csrf
                <div class="grid">
                    <div><label>Jméno</label><input type="text" name="jmeno" value="{{ old('jmeno') }}" required></div>
                    <div><label>Příjmení</label><input type="text" name="prijmeni" value="{{ old('prijmeni') }}" required></div>
                    <div><label>E-mail</label><input type="email" name="email" value="{{ old('email') }}" required></div>
                    <div><label>Heslo (min. 8 znaků)</label><input type="password" name="heslo" required></div>
                    <div class="full"><label><input type="checkbox" name="je_vlastnik" value="1"> Vlastník (supersprávce)</label></div>
                    <div class="full"><button type="submit" class="btn-primary">Přidat uživatele</button></div>
                </div>
            </form>
        </div>
    </main>
</body>
</html>
