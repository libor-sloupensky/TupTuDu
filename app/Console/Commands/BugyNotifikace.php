<?php

namespace App\Console\Commands;

use App\Mail\BugyNotifikace as BugyNotifikaceMail;
use App\Models\Bug;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * E-mail o nových závažných bugech — souhrnně, bez zahlcení schránky.
 *
 * Ochrana proti zahlcení:
 *   - mail jen při VZNIKU bugu (opakovaný výskyt aktivního bugu nic neposílá,
 *     jen roste pocet_vyskytu); opravený bug, který se vrátí, znovu nejdřív
 *     po 24 h (Bug::zachyt nuluje notifikovano_v)
 *   - jeden souhrnný mail za běh (cron každých 10 min → max 6/h)
 *   - denní strop config('app.bugy_notifikace_max_den'); co se nevejde,
 *     počká na první mail dalšího dne
 *
 * Závažné = úroveň error (server, client, ai, zaloha…) + hlídač toku poptávek
 * (warning, ale znamená, že nechodí zakázky).
 */
class BugyNotifikace extends Command
{
    protected $signature = 'bugy:notifikace {--dry-run : Jen vypíše, co by poslal}';

    protected $description = 'Pošle e-mail o nových závažných bugech (souhrnně, s denním stropem)';

    /** Kolik bugů vypsat v mailu podrobně, zbytek jen počtem. */
    private const MAX_V_MAILU = 15;

    public function handle(): int
    {
        $email = config('app.bugy_notifikace_email');
        if (! $email) {
            $this->warn('Není nastavený BUGY_NOTIFIKACE_EMAIL ani ZALOHA_EMAIL — nic neposílám.');
            return self::SUCCESS;
        }

        $dotaz = self::zavazneNeoznamene();
        $pocet = (clone $dotaz)->count();
        if ($pocet === 0) {
            $this->info('Žádné nové závažné bugy.');
            return self::SUCCESS;
        }

        $klicDne = 'bugy_notifikace_odeslano_' . now()->format('Y-m-d');
        $odeslanoDnes = (int) Cache::get($klicDne, 0);
        $maxDen = (int) config('app.bugy_notifikace_max_den', 12);
        if ($odeslanoDnes >= $maxDen) {
            $this->warn("Denní strop {$maxDen} mailů vyčerpán — {$pocet} bugů počká na zítřek.");
            return self::SUCCESS;
        }

        $bugy = (clone $dotaz)->orderByDesc('zacatek_v')->limit(self::MAX_V_MAILU)->get();
        $idsVse = (clone $dotaz)->pluck('id');

        if ($this->option('dry-run')) {
            $this->info("Poslal bych {$pocet} bugů na {$email}:");
            foreach ($bugy as $b) {
                $this->line("  #{$b->id} [{$b->typ}] " . mb_substr($b->zprava, 0, 100));
            }
            return self::SUCCESS;
        }

        try {
            Mail::to($email)->send(new BugyNotifikaceMail($bugy, $pocet, $odeslanoDnes + 1 >= $maxDen));
        } catch (\Throwable $e) {
            // Ne report() ani Log::error (zrcadlí se do bugů) — selhání mailu by založilo bug,
            // který by se zkoušel oznámit dokola. Bugy zůstanou neoznámené, příští běh to zkusí.
            Log::warning('bugy:notifikace — odeslání mailu selhalo: ' . $e->getMessage());
            $this->error('Odeslání selhalo: ' . $e->getMessage());
            return self::FAILURE;
        }

        // Označit všechny čekající (i ty nad MAX_V_MAILU — jsou v mailu počtem)
        Bug::whereIn('id', $idsVse)->update(['notifikovano_v' => now()]);
        Cache::put($klicDne, $odeslanoDnes + 1, now()->addDays(2));

        $this->info("Odesláno: {$pocet} bugů na {$email}.");
        return self::SUCCESS;
    }

    /** Aktivní závažné bugy, o kterých ještě nepřišel mail. */
    public static function zavazneNeoznamene(): Builder
    {
        return Bug::query()
            ->where('opraveno', false)
            ->whereNull('notifikovano_v')
            ->where(function (Builder $q) {
                $q->where('uroven', 'error')
                  ->orWhere('soubor', 'like', 'poptavky:kontrola-toku%');
            });
    }
}
