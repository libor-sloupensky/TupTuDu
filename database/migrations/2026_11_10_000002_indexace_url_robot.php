<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Kterým robotem Google stránku naposledy prošel (MOBILE, DESKTOP) — výpis stránek v Masterteamu. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('indexace_url', function (Blueprint $table) {
            $table->string('robot', 30)->nullable()->after('prochazeno');
        });
    }

    public function down(): void
    {
        Schema::table('indexace_url', function (Blueprint $table) {
            $table->dropColumn('robot');
        });
    }
};
