<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Logo firmy pro tarif Profi (modules/platby.md). Logo patří firmě (subjektu), ne uživateli:
 * až bude jeden firemní profil sdílet víc uživatelů, stačí je k subjektu přidat.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subjekty', function (Blueprint $table) {
            $table->string('logo')->nullable()->after('slug'); // cesta ve storage/app, např. loga/12.webp
        });
    }

    public function down(): void
    {
        Schema::table('subjekty', function (Blueprint $table) {
            $table->dropColumn('logo');
        });
    }
};
