<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Doklad k hodnotě analýzy konkurence (modules/srovnani.md, Data a důkazy): na veřejné srovnávací stránce
 * smí být jen hodnota se snímkem zdroje a s ověřením ne starším než 6 měsíců. `doklad` = klíč snímku v archivu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('konkurence_hodnoty', function (Blueprint $table) {
            $table->string('doklad', 500)->nullable()->after('zdroj');
            $table->timestamp('doklad_v')->nullable()->after('doklad');
        });
    }

    public function down(): void
    {
        Schema::table('konkurence_hodnoty', function (Blueprint $table) {
            $table->dropColumn(['doklad', 'doklad_v']);
        });
    }
};
