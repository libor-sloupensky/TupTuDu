<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sys_firmy', function (Blueprint $table) {
            $table->text('pravidla_zpracovani')->nullable()->after('je_ucetni');
        });
    }

    public function down(): void
    {
        Schema::table('sys_firmy', function (Blueprint $table) {
            $table->dropColumn('pravidla_zpracovani');
        });
    }
};
