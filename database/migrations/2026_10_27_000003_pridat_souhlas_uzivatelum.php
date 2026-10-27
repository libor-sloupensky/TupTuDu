<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kdy uživatel při registraci souhlasil s obchodními podmínkami a zásadami
// ochrany osobních údajů (doklad souhlasu). NULL = účet založený ručně v masterteamu.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->timestamp('souhlas_podminky_v')->nullable()->after('email_overen_v');
        });
    }

    public function down(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->dropColumn('souhlas_podminky_v');
        });
    }
};
