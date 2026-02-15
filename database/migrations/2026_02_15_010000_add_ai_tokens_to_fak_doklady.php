<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->unsignedInteger('ai_input_tokens')->nullable()->after('raw_ai_odpoved');
            $table->unsignedInteger('ai_output_tokens')->nullable()->after('ai_input_tokens');
        });
    }

    public function down(): void
    {
        Schema::table('fak_doklady', function (Blueprint $table) {
            $table->dropColumn(['ai_input_tokens', 'ai_output_tokens']);
        });
    }
};
