<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kdy odešel e-mail „zkouška zdarma končí“ (zkouska:upozorneni, modules/platby.md) — posílá se jednou.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->timestamp('zkouska_mail_v')->nullable()->after('zkouska_do');
        });
    }

    public function down(): void
    {
        Schema::table('uzivatele', function (Blueprint $table) {
            $table->dropColumn('zkouska_mail_v');
        });
    }
};
