<?php

use App\Models\KonceptV3;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Veřejný kód projektu do adresy (app.tuptudu.com/projects/k7x2m) — místo
// pořadového čísla, které by prozrazovalo počet projektů. Generuje KonceptV3::novyKod().
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('koncepty_v3', function (Blueprint $table) {
            // 12 znaků rezerva, kdyby 5 jednou nestačilo
            $table->string('kod', 12)->nullable()->unique()->after('id');
        });

        foreach (DB::table('koncepty_v3')->whereNull('kod')->pluck('id') as $id) {
            DB::table('koncepty_v3')->where('id', $id)->update(['kod' => KonceptV3::novyKod()]);
        }
    }

    public function down(): void
    {
        Schema::table('koncepty_v3', function (Blueprint $table) {
            $table->dropUnique(['kod']);
            $table->dropColumn('kod');
        });
    }
};
