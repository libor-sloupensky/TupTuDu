<?php

namespace Database\Seeders;

use App\Models\Subjekt;
use App\Models\Uzivatel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MasterTeamSeeder extends Seeder
{
    public function run(): void
    {
        $uzivatel = Uzivatel::firstOrCreate(
            ['email' => 'libor.sloupensky@seznam.cz'],
            [
                'jmeno' => 'Libor',
                'prijmeni' => 'Sloupenský',
                'heslo' => Hash::make('TupTuDuMaster2026!'),
                'email_overen_v' => now(),
            ]
        );

        // Master subjekt — IČO firmy, podle kterého JeMaster middleware pouští do adminu.
        $masterSubjekt = Subjekt::firstOrCreate(
            ['ico' => config('app.master_ico')],
            ['nazev' => 'TupTuDu', 'slug' => 'tuptudu']
        );

        $uzivatel->subjekty()->syncWithoutDetaching([
            $masterSubjekt->id => ['je_vlastnik' => true],
        ]);
    }
}
