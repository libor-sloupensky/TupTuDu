<?php

namespace App\Console\Commands;

use App\Models\Uzivatel;
use App\Notifications\ZkouskaKonci;
use App\Support\Tarif;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * E-mail „zkouška zdarma končí“ 2 dny před koncem zkušební verze Stavebníku (modules/platby.md).
 * Jednou na uživatele (uzivatele.zkouska_mail_v), jen ověřeným adresám a jen komu zkouška pořád
 * běží — kdo si mezitím koupil předplatné, mail nedostane. Spouští PlanovaneUlohy každou hodinu.
 */
class ZkouskaUpozorneni extends Command
{
    protected $signature = 'zkouska:upozorneni {--dry-run : Jen vypsat, komu by mail odešel}';

    protected $description = 'Pošle upozornění 2 dny před koncem zkoušky zdarma';

    /** Kolik hodin před koncem zkoušky mail poslat. */
    private const PRED_KONCEM_HODIN = 48;

    public function handle(): int
    {
        $suchy = (bool) $this->option('dry-run');
        $uzivatele = Uzivatel::whereNull('zkouska_mail_v')
            ->whereNotNull('email_overen_v')
            ->where('zkouska_do', '>', now())
            ->where('zkouska_do', '<=', now()->addHours(self::PRED_KONCEM_HODIN))
            ->get();

        $odeslano = 0;
        foreach ($uzivatele as $uzivatel) {
            if (Tarif::uzivatele($uzivatel) !== Tarif::ZKOUSKA) {
                continue;   // mezitím zaplatil (nebo je v master týmu)
            }
            if ($suchy) {
                $this->line("poslal bych: #{$uzivatel->id}, zkouška do {$uzivatel->zkouska_do}");

                continue;
            }
            try {
                $uzivatel->notify(new ZkouskaKonci);
                $uzivatel->forceFill(['zkouska_mail_v' => now()])->save();
                $odeslano++;
            } catch (\Throwable $e) {
                Log::error('Zkouška: upozornění na konec se nepodařilo odeslat', [
                    'uzivatel_id' => $uzivatel->id,
                    'chyba' => $e->getMessage(),
                ]);
            }
        }

        $this->line("zkouska: odesláno {$odeslano} z {$uzivatele->count()}");

        return self::SUCCESS;
    }
}
