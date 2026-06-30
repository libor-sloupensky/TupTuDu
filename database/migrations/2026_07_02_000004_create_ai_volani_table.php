<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_volani', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 30)->default('anthropic'); // anthropic | voyage
            $table->string('model', 60);
            $table->string('modul', 50);
            $table->unsignedBigInteger('uzivatel_id')->nullable();
            $table->unsignedInteger('vstupni_tokens')->default(0);
            $table->unsignedInteger('vystupni_tokens')->default(0);
            $table->unsignedInteger('cache_read_tokens')->default(0);
            $table->unsignedInteger('cache_create_tokens')->default(0);
            $table->decimal('cena_usd', 10, 6)->default(0);
            $table->boolean('batch')->default(false);
            $table->boolean('uspesne')->default(true);
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->unsignedInteger('trvani_ms')->default(0);
            $table->string('poznamka')->nullable();
            $table->timestamp('vytvoreno')->nullable();
            $table->index(['modul', 'vytvoreno']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_volani');
    }
};
