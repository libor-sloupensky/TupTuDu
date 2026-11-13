<?php

namespace App\Notifications;

use App\Support\Domeny;
use App\Support\Lokalizace;
use App\Support\Tarif;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Upozornění 2 dny před koncem zkušební verze Stavebníku (zkouska:upozorneni, modules/platby.md).
 * Říká, kdy zkouška končí, že se nic neplatí a projekty zůstanou, a kolik stojí pokračování.
 * Jazyk podle Uzivatel::preferredLocale(), měna podle země účtu.
 */
class ZkouskaKonci extends Notification
{
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $uzivatel): MailMessage
    {
        $mena = Tarif::mena($uzivatel->zeme);
        $datum = Lokalizace::datum($uzivatel->zkouska_do->timezone(config('app.timezone')));

        return (new MailMessage)
            ->subject(__('emaily.zkouska_konci_predmet', ['datum' => $datum]))
            ->greeting(__('emaily.pozdrav'))
            ->line(__('emaily.zkouska_konci_text', ['datum' => $datum]))
            ->line(__('emaily.zkouska_konci_potom', ['limit' => Tarif::limit(Tarif::ZDARMA, 'kroku_denne')]))
            ->line(__('emaily.zkouska_konci_cena', [
                'mesic' => Tarif::castka(Tarif::cena(Tarif::STAVEBNIK, 'mesic', $mena), $mena),
                'rok' => Tarif::castka(Tarif::cena(Tarif::STAVEBNIK, 'rok', $mena), $mena),
                'projektu' => Tarif::limit(Tarif::STAVEBNIK, 'projektu'),
            ]))
            ->action(__('emaily.zkouska_konci_tlacitko'), Domeny::url('app', '/billing?tarif=stavebnik'))
            ->line(__('emaily.zkouska_konci_nic'))
            ->salutation(__('emaily.podpis'));
    }
}
