<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->unsignedBigInteger('duplicita_id')->nullable()->after('zdroj');
            $table->foreign('duplicita_id')->references('id')->on('fak_doklady')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->dropForeign(['duplicita_id']);
            $table->dropColumn('duplicita_id');
        });
    }
};
