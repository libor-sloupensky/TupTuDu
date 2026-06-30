<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pravidla_objektu', function (Blueprint $table) {
            $table->id();
            $table->string('typ_objektu', 80)->unique();
            $table->string('nazev');
            $table->string('kategorie', 30);          // celek, mistnost, konstrukce, exterior, otvor
            $table->string('keywords')->nullable();
            $table->text('pravidla');
            $table->json('metadata')->nullable();      // embedding cache apod.
            $table->string('zdroj', 50)->default('manual');
            $table->foreignId('uzivatel_id')->nullable()->constrained('uzivatele')->nullOnDelete();
            $table->timestamp('vytvoreno')->nullable();
            $table->timestamp('upraveno')->nullable();
            $table->index('kategorie');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pravidla_objektu');
    }
};
