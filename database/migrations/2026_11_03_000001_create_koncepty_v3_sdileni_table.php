<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('koncepty_v3_sdileni', function (Blueprint $table) {
            $table->id();
            $table->foreignId('koncept_id')->unique()->constrained('koncepty_v3')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->string('nazev', 255);
            $table->json('podlazi');      // [{id, nazev}] shora dolů; soubor plánu je plan-{id}.png
            $table->timestamp('vytvoreno')->nullable();
            $table->timestamp('upraveno')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('koncepty_v3_sdileni');
    }
};
