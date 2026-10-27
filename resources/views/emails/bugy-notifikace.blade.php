{{-- Souhrnný e-mail o nových závažných bugech (App\Mail\BugyNotifikace). --}}
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Nové bugy</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #111111;">
    <h2 style="color: #c14a00; margin: 0 0 4px;">
        {{ $celkem === 1 ? 'Nový závažný bug' : "Nové závažné bugy: {$celkem}" }}
    </h2>
    <p style="margin: 0 0 20px; color: #5f5e5a; font-size: 13px;">
        Mail chodí jen při vzniku chyby — opakování stejné chyby už nepřijde, jen v přehledu roste počet výskytů.
    </p>

    @foreach($bugy as $bug)
        <div style="border: 1px solid #e5e5e5; border-left: 4px solid #c14a00; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: #5f5e5a; margin-bottom: 4px;">
                #{{ $bug->id }} · {{ $bug->typ }} · {{ $bug->uroven }} · {{ $bug->zacatek_v?->format('j. n. Y H:i') }}
                @if($bug->pocet_vyskytu > 1) · {{ $bug->pocet_vyskytu }}× @endif
            </div>
            <div style="font-size: 14px; font-weight: bold; word-break: break-word;">{{ mb_substr($bug->zprava, 0, 300) }}</div>
            @if($bug->uri)
                <div style="font-size: 12px; color: #5f5e5a; margin-top: 4px; word-break: break-all;">{{ mb_substr($bug->uri, 0, 200) }}</div>
            @endif
            <div style="margin-top: 8px;">
                <a href="{{ \App\Support\Domeny::url('masterteam', '/masterteam/bugy/' . $bug->id) }}" style="color: #c14a00; font-size: 13px;">Detail bugu →</a>
            </div>
        </div>
    @endforeach

    @if($celkem > $bugy->count())
        <p style="font-size: 13px;">… a dalších {{ $celkem - $bugy->count() }} v přehledu.</p>
    @endif

    <p style="margin-top: 20px;">
        <a href="{{ \App\Support\Domeny::url('masterteam', '/masterteam/bugy') }}"
           style="display: inline-block; padding: 10px 18px; background: #c14a00; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Otevřít přehled bugů
        </a>
    </p>

    @if($posledniDnes)
        <p style="font-size: 12px; color: #5f5e5a; margin-top: 16px;">
            Toto je poslední mail o bugech pro dnešek (denní strop). Další nové bugy přijdou souhrnně zítra — v přehledu jsou hned.
        </p>
    @endif
</body>
</html>
