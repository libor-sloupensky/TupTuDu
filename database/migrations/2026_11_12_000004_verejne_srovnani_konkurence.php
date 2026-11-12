<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Veřejné srovnávací stránky (modules/srovnani.md): veřejné poznámky hodnot po jazycích a u konkurenta
 * adresa stránky, veřejný popis po jazycích a jazyky, ve kterých má stránky.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('konkurence_hodnoty', function (Blueprint $table) {
            // {"cs": {"p": "poznámka", "t": "text hodnoty (ceník…)"}, "en": {…}}
            $table->json('poznamky')->nullable()->after('poznamka');
        });
        Schema::table('konkurenti', function (Blueprint $table) {
            $table->string('adresa', 80)->nullable()->unique()->after('klic');   // planner-5d
            $table->json('verejne')->nullable()->after('poznamka');              // {"cs": {"popis": "…", "platformy": "…"}}
            $table->json('jazyky')->nullable()->after('verejne');                // jazyky se stránkami ["cs", "pl"]
        });
    }

    public function down(): void
    {
        Schema::table('konkurence_hodnoty', fn (Blueprint $t) => $t->dropColumn('poznamky'));
        Schema::table('konkurenti', function (Blueprint $t) {
            $t->dropUnique(['adresa']);
            $t->dropColumn(['adresa', 'verejne', 'jazyky']);
        });
    }
};
