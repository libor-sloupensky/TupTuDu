<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('uzivatel_subjekt', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uzivatel_id')->constrained('uzivatele')->cascadeOnDelete();
            $table->foreignId('subjekt_id')->constrained('subjekty')->cascadeOnDelete();
            $table->boolean('je_vlastnik')->default(false);
            $table->timestamp('vytvoreno')->nullable();
            $table->timestamp('upraveno')->nullable();
            $table->unique(['uzivatel_id', 'subjekt_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uzivatel_subjekt');
    }
};
