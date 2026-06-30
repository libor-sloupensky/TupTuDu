<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Uživatelé — TupTuDu administrace</title>
    <link rel="stylesheet" href="/css/app.css">
    <style>
        main { padding: 2rem 1.5rem; max-width: 60rem; margin: 0 auto; }
        table { margin: 1rem 0 2rem; }
        form.inline { display: inline; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
        .grid .full { grid-column: 1 / -1; }
    </style>
</head>
<body>
    <div class="topbar">
        <span class="brand-title"><span class="brand">TupTuDu</span> · <a href="/masterteam">administrace</a> · uživatelé</span>
        <form method="POST" action="/logout">@csrf<button type="submit" class="btn btn-sm">Odhlásit</button></form>
    </div>
    <main>
        <h1>Uživatelé master týmu</h1>

        @if (session('ok'))<div class="flash ok">{{ session('ok') }}</div>@endif
        @if (session('chyba'))<div class="flash chyba">{{ session('chyba') }}</div>@endif
        @if ($errors->any())
            <div class="flash chyba">@foreach ($errors->all() as $e){{ $e }}<br>@endforeach</div>
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
                            <button type="submit" class="btn btn-sm">{{ $u->pivot->je_vlastnik ? 'Na správce' : 'Na vlastníka' }}</button>
                        </form>
                        <form class="inline" method="POST" action="/masterteam/uzivatele/{{ $u->id }}"
                              onsubmit="return confirm('Odebrat uživatele z master týmu?');">
                            @csrf @method('DELETE')
                            <button type="submit" class="btn btn-sm btn-danger">Odebrat</button>
                        </form>
                    </td>
                </tr>
            @endforeach
            </tbody>
        </table>

        <div class="card">
            <h2 style="margin-top:0;font-size:1.1rem;">Přidat uživatele</h2>
            <p class="muted" style="margin-top:0;">Vytvoří účet a přidá ho do master týmu.</p>
            <form method="POST" action="/masterteam/uzivatele">
                @csrf
                <div class="grid">
                    <div><label>Jméno</label><input type="text" name="jmeno" value="{{ old('jmeno') }}" required></div>
                    <div><label>Příjmení</label><input type="text" name="prijmeni" value="{{ old('prijmeni') }}" required></div>
                    <div><label>E-mail</label><input type="email" name="email" value="{{ old('email') }}" required></div>
                    <div><label>Heslo (min. 8 znaků)</label><input type="password" name="heslo" required></div>
                    <div class="full"><label><input type="checkbox" name="je_vlastnik" value="1" style="width:auto;"> Vlastník (supersprávce)</label></div>
                    <div class="full"><button type="submit" class="btn btn-primary">Přidat uživatele</button></div>
                </div>
            </form>
        </div>
    </main>
</body>
</html>
