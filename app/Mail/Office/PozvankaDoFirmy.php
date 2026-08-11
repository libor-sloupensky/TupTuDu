<?php

namespace App\Mail\Office;

use App\Models\Office\Firma;
use App\Models\Office\Pozvani;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PozvankaDoFirmy extends Mailable
{
    use Queueable, SerializesModels;

    public string $registracniUrl;

    public function __construct(
        public Pozvani $pozvani,
        public Firma $firma,
    ) {
        $this->registracniUrl = url('/registrace?pozvanka=' . $pozvani->token);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "TupTuDu - Pozvánka do firmy {$this->firma->nazev}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'office.emails.pozvanka',
        );
    }
}
