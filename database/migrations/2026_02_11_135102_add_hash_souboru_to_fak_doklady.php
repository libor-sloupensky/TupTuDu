<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->string('hash_souboru', 64)->nullable()->after('cesta_souboru');
            $table->index(['firma_ico', 'hash_souboru']);
        });
    }

    public function down(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->dropIndex(['firma_ico', 'hash_souboru']);
            $table->dropColumn('hash_souboru');
        });
    }
};
