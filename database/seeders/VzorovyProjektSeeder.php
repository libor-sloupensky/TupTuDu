<?php

namespace Database\Seeders;

use App\Models\Subjekt;
use App\Support\VzorovyProjekt;
use Illuminate\Database\Seeder;

/**
 * Šablona vzorového projektu z database/vzor (App\Support\VzorovyProjekt, modules/aplikace.md).
 * Při prvním nasazení ji založí, při dalších ji přepíše, když se výchozí verze v repozitáři změnila
 * (`php artisan vzor:prevzit` z pracovní verze, Libor 11. 11. 2026). Podklad je výkres bez osobních údajů.
 */
class VzorovyProjektSeeder extends Seeder
{
    public function run(): void
    {
        $soubor = database_path(VzorovyProjekt::SOUBOR);
        if (! is_file($soubor)) {
            return;
        }
        $autor = Subjekt::where('ico', config('app.master_ico'))->first()?->uzivatele()->wherePivot('je_vlastnik', true)->first();
        if (! $autor) {
            return;
        }
        $obsah = json_decode(file_get_contents($soubor), true);
        $pdf = is_file(database_path(VzorovyProjekt::SOUBOR_PDF)) ? file_get_contents(database_path(VzorovyProjekt::SOUBOR_PDF)) : null;
        VzorovyProjekt::zapisSablonu($obsah, $pdf, $autor);
    }
}
