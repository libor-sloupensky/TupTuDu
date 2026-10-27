<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Historie Konceptu V3 jako časová osa kroků (Ctrl+Z / Ctrl+Shift+Z po ní chodí).
 *
 * Dřív server při každém uložení odložil do historie stav PŘED změnou, ale
 * s popisem nové akce — záznam „Posun stěny“ tak obsahoval dům ještě
 * neposunutý. Nově je každý krok stav PO akci a `historie_aktualni` drží id
 * kroku, na kterém uživatel stojí (po Zpět může být i jiný než poslední).
 *
 * Převod starých záznamů: stav po akci i = stav uložený u záznamu i+1
 * (u posledního aktuální data konceptu); nejstarší odložený stav se stane
 * výchozím krokem „Začátek“.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('koncepty_v3', 'historie_aktualni')) {
            Schema::table('koncepty_v3', function (Blueprint $table) {
                $table->string('historie_aktualni', 40)->nullable()->after('historie');
            });
        }

        DB::table('koncepty_v3')->orderBy('id')->each(function ($k) {
            $stare = json_decode($k->historie ?? '[]', true) ?: [];
            if (!$stare || isset($stare[0]['id'])) return;   // prázdná nebo už převedená

            $data = json_decode($k->data ?? 'null', true);
            $kroky = [[
                'id' => 'h' . $k->id . '-0',
                'popis' => 'Začátek',
                'data' => $stare[0]['data'] ?? null,
                'cas' => $stare[0]['cas'] ?? null,
            ]];
            foreach ($stare as $i => $zaznam) {
                $kroky[] = [
                    'id' => 'h' . $k->id . '-' . ($i + 1),
                    'popis' => $zaznam['popis'] ?? 'Úprava',
                    'data' => array_key_exists($i + 1, $stare) ? ($stare[$i + 1]['data'] ?? null) : $data,
                    'cas' => $zaznam['cas'] ?? null,
                ];
            }
            $kroky = array_values(array_slice($kroky, -50));

            DB::table('koncepty_v3')->where('id', $k->id)->update([
                'historie' => json_encode($kroky, JSON_UNESCAPED_UNICODE),
                'historie_aktualni' => end($kroky)['id'],
            ]);
        });
    }

    public function down(): void
    {
        // Převod formátu historie se nevrací — zahodí se jen ukazatel.
        Schema::table('koncepty_v3', function (Blueprint $table) {
            $table->dropColumn('historie_aktualni');
        });
    }
};
