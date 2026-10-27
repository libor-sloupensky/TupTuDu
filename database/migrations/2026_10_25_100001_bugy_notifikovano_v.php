<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Kdy odešla e-mailová notifikace o bugu (bugy:notifikace). NULL = ještě
 * neodešla. Stávající bugy se označí jako oznámené, aby první běh neposlal
 * historii.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bugy', function (Blueprint $table) {
            $table->timestamp('notifikovano_v')->nullable()->after('naposledy_v');
        });

        DB::table('bugy')->update(['notifikovano_v' => now()]);
    }

    public function down(): void
    {
        Schema::table('bugy', function (Blueprint $table) {
            $table->dropColumn('notifikovano_v');
        });
    }
};
