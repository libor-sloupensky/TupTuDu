<?php

namespace App\Console\Commands\Office;

use App\Models\Office\Firma;
use App\Models\Uzivatel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Změní roli uživatele ve firmě.
 *
 * `interni_role` rozhoduje, co uživatel smí uvnitř firmy — sekci
 * „Uživatelé firmy" v nastavení vidí jen superadmin. Role je vedená
 * pro každou firmu zvlášť, takže tentýž člověk může být u jedné firmy
 * superadmin a u druhé jen správce.
 */
class NastavRoli extends Command
{
    protected $signature = 'doklady:role
                            {email : E-mail uživatele}
                            {ico : IČO firmy}
                            {--interni=superadmin : superadmin nebo spravce}
                            {--role= : firma, ucetni nebo dodavatel (nepovinné, jinak beze změny)}';

    protected $description = 'Nastaví roli uživatele ve firmě modulu Doklady';

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $ico = (string) $this->argument('ico');
        $interni = (string) $this->option('interni');

        if (! in_array($interni, ['superadmin', 'spravce'], true)) {
            $this->error("Neplatná interní role '{$interni}' — povolené: superadmin, spravce.");

            return self::FAILURE;
        }

        $uzivatel = Uzivatel::where('email', $email)->first();
        if (! $uzivatel) {
            $this->error("Uživatel {$email} neexistuje.");

            return self::FAILURE;
        }

        $firma = Firma::find($ico);
        if (! $firma) {
            $this->error("Firma s IČO {$ico} neexistuje.");

            return self::FAILURE;
        }

        $vazba = DB::table('office_user_firma')
            ->where('user_id', $uzivatel->id)
            ->where('firma_ico', $ico);

        if (! $vazba->exists()) {
            $this->error("{$email} nemá k firmě {$firma->nazev} žádný přístup.");

            return self::FAILURE;
        }

        $pred = $vazba->first();

        $zmeny = ['interni_role' => $interni, 'updated_at' => now()];
        if ($this->option('role')) {
            $zmeny['role'] = (string) $this->option('role');
        }

        $vazba->update($zmeny);

        $this->info("{$email} @ {$firma->nazev} ({$ico})");
        $this->line("  interní role: {$pred->interni_role} → {$interni}");
        if ($this->option('role')) {
            $this->line("  role:         {$pred->role} → " . $this->option('role'));
        }

        return self::SUCCESS;
    }
}
