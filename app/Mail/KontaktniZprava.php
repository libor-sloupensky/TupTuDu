<?php

namespace App\Mail;

use App\Models\KontaktniZprava as Zprava;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Zpráva z kontaktního formuláře pro provozovatele (config app.interni_email).
 * Reply-To = odesílatel, takže stačí v poště kliknout na Odpovědět.
 */
class KontaktniZprava extends Mailable
{
    use Queueable;

    /** Téma česky — mail je interní, čte ho provozovatel. */
    private const TEMATA = [
        'dotaz' => 'Dotaz',
        'problem' => 'Problém',
        'zruseni_uctu' => 'Zrušení účtu',
        'osobni_udaje' => 'Osobní údaje',
        'jine' => 'Jiné',
    ];

    public function __construct(public Zprava $zprava) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [new Address($this->zprava->email, $this->zprava->jmeno)],
            subject: "Kontakt — {$this->nazevTematu()}: {$this->zprava->jmeno}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.kontaktni-zprava', with: ['tema' => $this->nazevTematu()]);
    }

    private function nazevTematu(): string
    {
        return self::TEMATA[$this->zprava->tema] ?? $this->zprava->tema;
    }
}
