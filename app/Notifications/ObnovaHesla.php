<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * E-mail „Zapomenuté heslo". Odkaz s tokenem skládá Laravel (ResetPassword::resetUrl)
 * na stejné subdoméně, kde si uživatel obnovu vyžádal.
 */
class ObnovaHesla extends ResetPassword
{
    protected function buildMailMessage($url): MailMessage
    {
        return (new MailMessage)
            ->subject(__('emaily.heslo_predmet'))
            ->greeting(__('emaily.pozdrav'))
            ->line(__('emaily.heslo_text'))
            ->action(__('emaily.heslo_tlacitko'), $url)
            ->line(__('emaily.heslo_platnost', ['minut' => config('auth.passwords.users.expire')]))
            ->line(__('emaily.heslo_nezadal'))
            ->salutation(__('emaily.podpis'));
    }
}
