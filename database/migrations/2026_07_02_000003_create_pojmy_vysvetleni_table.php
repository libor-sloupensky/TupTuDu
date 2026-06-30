<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pojmy_vysvetleni', function (Blueprint $table) {
            $table->id();
            $table->string('termin', 191);
            $table->string('kontext', 50)->nullable();
            $table->text('popis');
            $table->timestamp('vytvoreno')->nullable();
            $table->timestamp('upraveno')->nullable();
            $table->unique(['termin', 'kontext']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pojmy_vysvetleni');
    }
};
