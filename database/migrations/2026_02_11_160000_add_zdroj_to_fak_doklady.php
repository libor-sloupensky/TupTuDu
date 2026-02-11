<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->string('zdroj', 20)->default('upload')->after('chybova_zprava');
        });
    }

    public function down(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->dropColumn('zdroj');
        });
    }
};
