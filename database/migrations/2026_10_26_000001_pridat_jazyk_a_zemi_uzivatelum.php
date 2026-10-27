<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Jazyk a země uživatele (config/lokalizace.php). NULL = neurčeno → rozhodne
// přepínač / národní doména / prohlížeč, u země výchozí CZ.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->string('jazyk', 5)->nullable()->after('telefon');
            $table->char('zeme', 2)->nullable()->after('jazyk');
        });
    }

    public function down(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->dropColumn(['jazyk', 'zeme']);
        });
    }
};
