<?php

namespace Database\Seeders;

use App\Models\Subjekt;
use App\Models\Uzivatel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MasterTeamSeeder extends Seeder
{
    public function run(): void
    {
        // Heslo master admina jen z env (GitHub Secret MASTER_PASSWORD), nikdy v gitu.
        // Pro fresh install bez secretu náhodné (admin si pak nastaví jinak).
        $heslo = config('app.master_password');

        $uzivatel = Uzivatel::firstOrCreate(
            ['email' => 'libor.sloupensky@seznam.cz'],
            [
                'jmeno' => 'Libor',
                'prijmeni' => 'Sloupenský',
                'heslo' => Hash::make($heslo ?: Str::random(32)),
                'email_overen_v' => now(),
            ]
        );

        // Synchronizace hesla podle secretu — změní se jen když se MASTER_PASSWORD
        // změní (Hash::check). Až přibude UI pro změnu hesla, tuto synchronizaci odebrat.
        if ($heslo && ! Hash::check($heslo, (string) $uzivatel->heslo)) {
            $uzivatel->forceFill(['heslo' => Hash::make($heslo)])->save();
        }

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
