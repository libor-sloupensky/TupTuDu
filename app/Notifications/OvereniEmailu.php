<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * E-mail s odkazem na ověření adresy. Podepsaný odkaz skládá Laravel
 * (VerifyEmail::verificationUrl), tady jsou jen naše texty — jazyk podle
 * Uzivatel::preferredLocale().
 */
class OvereniEmailu extends VerifyEmail
{
    protected function buildMailMessage($url): MailMessage
    {
        return (new MailMessage)
            ->subject(__('emaily.overeni_predmet'))
            ->greeting(__('emaily.pozdrav'))
            ->line(__('emaily.overeni_text'))
            ->action(__('emaily.overeni_tlacitko'), $url)
            ->line(__('emaily.overeni_nezadal'))
            ->salutation(__('emaily.podpis'));
    }
}
