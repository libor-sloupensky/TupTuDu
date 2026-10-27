<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Collection;

/**
 * Souhrnný e-mail o nových závažných bugech (bugy:notifikace).
 */
class BugyNotifikace extends Mailable
{
    use Queueable;

    public function __construct(
        public Collection $bugy,
        public int $celkem,
        public bool $posledniDnes,
    ) {}

    public function envelope(): Envelope
    {
        $prvni = $this->bugy->first();
        $predmet = $this->celkem === 1
            ? 'Nový bug: ' . mb_substr((string) $prvni?->zprava, 0, 80)
            : "Nové bugy ({$this->celkem}): " . mb_substr((string) $prvni?->zprava, 0, 60) . '…';

        return new Envelope(subject: $predmet);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.bugy-notifikace');
    }
}
