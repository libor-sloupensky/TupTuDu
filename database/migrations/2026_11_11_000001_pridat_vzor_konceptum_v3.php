<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Vzorový projekt (App\Support\VzorovyProjekt, modules/aplikace.md): jedna šablona a kopie pro každého uživatele.
// Kopii jde upravovat zdarma mimo limity tarifu, každou noc ve 3:00 místního času se vrátí do stavu šablony.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('koncepty_v3', function (Blueprint $table) {
            $table->string('vzor', 10)->nullable()->index()->comment('sablona = vzorový projekt, kopie = kopie uživatele na hraní');
            $table->timestamp('vzor_obnoveno_v')->nullable()->comment('Kdy se kopie naposledy vrátila do stavu šablony');
        });
    }

    public function down(): void
    {
        Schema::table('koncepty_v3', function (Blueprint $table) {
            $table->dropColumn(['vzor', 'vzor_obnoveno_v']);
        });
    }
};
