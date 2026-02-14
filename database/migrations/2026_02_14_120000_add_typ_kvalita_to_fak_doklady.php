<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Změna stav enum na string (flexibilnější)
        DB::statement("ALTER TABLE fak_doklady MODIFY COLUMN stav VARCHAR(30) NOT NULL DEFAULT 'nahrano'");

        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->string('typ_dokladu', 30)->default('faktura')->after('stav');
            $table->string('kvalita', 20)->default('dobra')->after('typ_dokladu');
            $table->text('kvalita_poznamka')->nullable()->after('kvalita');
            $table->unsignedSmallInteger('poradi_v_souboru')->default(1)->after('kvalita_poznamka');
        });
    }

    public function down(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->dropColumn(['typ_dokladu', 'kvalita', 'kvalita_poznamka', 'poradi_v_souboru']);
        });

        DB::statement("ALTER TABLE fak_doklady MODIFY COLUMN stav ENUM('nahrano','zpracovava_se','dokonceno','chyba') NOT NULL DEFAULT 'nahrano'");
    }
};
