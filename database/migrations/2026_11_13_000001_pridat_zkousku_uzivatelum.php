<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Zkušební verze tarifu Stavebník na 14 dní bez karty (Libor 13. 11. 2026, modules/platby.md).
 * Běží jen v aplikaci, Paddle o ní neví. Jednou na účet: vyplněné zkouska_od = už ji měl.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->timestamp('zkouska_od')->nullable()->after('posledni_prihlaseni');
            $table->timestamp('zkouska_do')->nullable()->after('zkouska_od');
        });
    }

    public function down(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->dropColumn(['zkouska_od', 'zkouska_do']);
        });
    }
};
