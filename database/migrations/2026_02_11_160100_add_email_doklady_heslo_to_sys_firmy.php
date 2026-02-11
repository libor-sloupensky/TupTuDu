<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sys_firmy', function (Blueprint $table) {
            $table->string('email_doklady_heslo')->nullable()->after('email_doklady');
        });
    }

    public function down(): void
    {
        Schema::table('sys_firmy', function (Blueprint $table) {
            $table->dropColumn('email_doklady_heslo');
        });
    }
};
