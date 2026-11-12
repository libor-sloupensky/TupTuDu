<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Co přesně parametr analýzy konkurence vyhodnocuje a kdy je „má“, „částečně“ a „nemá“
 * (Libor 12. 11. 2026: popis „jak měřit“ nestačil). Plní konkurence:import.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('konkurence_parametry', function (Blueprint $table) {
            $table->text('kriteria')->nullable()->after('popis');
        });
    }

    public function down(): void
    {
        Schema::table('konkurence_parametry', function (Blueprint $table) {
            $table->dropColumn('kriteria');
        });
    }
};
