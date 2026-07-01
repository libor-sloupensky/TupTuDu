<?php

namespace Database\Seeders;

use App\Models\PravidloObjektu;
use Illuminate\Database\Seeder;

class PravidlaObjektuSeeder extends Seeder
{
    public function run(): void
    {
        $json = file_get_contents(database_path('seeders/pravidla_objektu_data.json'));
        $pravidla = json_decode($json, true);

        foreach ($pravidla as $p) {
            PravidloObjektu::updateOrCreate(
                ['typ_objektu' => $p['typ_objektu']],
                $p
            );
        }

        $this->command->info('Naplněno ' . count($pravidla) . ' pravidel objektů.');
    }
}
