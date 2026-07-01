<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Uložení předdefinovaného promptu pro stránku "Koncept testování" (per uživatel).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('koncept_test', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uzivatel_id')->unique()->constrained('uzivatele')->cascadeOnDelete();
            $table->text('prompt')->nullable();
            $table->timestamp('vytvoreno')->nullable();
            $table->timestamp('upraveno')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('koncept_test');
    }
};
