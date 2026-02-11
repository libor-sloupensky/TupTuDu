<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->fullText('raw_text', 'fak_doklady_fulltext');
        });
    }

    public function down(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->dropFullText('fak_doklady_fulltext');
        });
    }
};
