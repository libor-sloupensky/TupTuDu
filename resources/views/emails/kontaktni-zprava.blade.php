{{-- Interní mail provozovateli (App\Mail\KontaktniZprava). Česky — čte ho jen provozovatel. --}}
<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">
    <p style="margin: 0 0 12px;">
        <strong>{{ $tema }}</strong> — zpráva z kontaktního formuláře TupTuDu (#{{ $zprava->id }})
    </p>
    <table style="border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 2px 12px 2px 0; color: #666;">Jméno</td><td>{{ $zprava->jmeno }}</td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #666;">E-mail</td><td>{{ $zprava->email }}</td></tr>
        {{-- Žádost k účtu ověřovat mailem na adresu účtu, ne na adresu odesílatele --}}
        <tr><td style="padding: 2px 12px 2px 0; color: #666;">E-mail účtu</td><td>
            @if ($zprava->email_uctu)
                <strong>{{ $zprava->email_uctu }}</strong>{{ $zprava->email_uctu === $zprava->email ? ' (stejný)' : ' (jiný než pro odpověď)' }}
                — {{ \App\Models\Uzivatel::where('email', $zprava->email_uctu)->exists() ? 'účet existuje' : 'účet s tímto e-mailem nenalezen' }}
            @else
                neuveden
            @endif
        </td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #666;">Jazyk / země</td><td>{{ $zprava->jazyk ?? '—' }} / {{ $zprava->zeme ?? '—' }}</td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #666;">Odesláno</td><td>{{ $zprava->created_at?->format('d.m.Y H:i') }}</td></tr>
    </table>
    <div style="white-space: pre-wrap; padding: 12px; background: #f7f5f2; border-radius: 6px;">{{ $zprava->zprava }}</div>
    <p style="margin: 16px 0 0; color: #666; font-size: 12px;">Odpovědět jde přímo z pošty — odpověď půjde na adresu odesílatele.</p>
</div>
