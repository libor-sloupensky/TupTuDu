<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('koncepty', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uzivatel_id')->constrained('uzivatele')->cascadeOnDelete();
            $table->string('nazev');
            $table->json('data')->nullable();
            $table->unsignedInteger('verze')->default(1);
            $table->string('faze', 20)->default('navrh');   // 'rozhovor' | 'navrh'
            $table->json('metadata')->nullable();
            $table->json('historie')->nullable();
            $table->json('chat')->nullable();
            $table->timestamp('vytvoreno')->nullable();
            $table->timestamp('upraveno')->nullable();
            $table->index(['uzivatel_id', 'upraveno']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('koncepty');
    }
};
