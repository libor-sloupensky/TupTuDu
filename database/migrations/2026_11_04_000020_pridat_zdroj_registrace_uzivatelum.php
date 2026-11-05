<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Článek webu, ze kterého se uživatel zaregistroval (modules/blog.md). Hodnotí se podle toho,
// které články přivádějí lidi k editoru. NULL = registrace odjinud.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->string('zdroj_registrace', 80)->nullable()->after('souhlas_podminky_v');
        });
    }

    public function down(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->dropColumn('zdroj_registrace');
        });
    }
};
