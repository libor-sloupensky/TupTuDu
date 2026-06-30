<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subjekty', function (Blueprint $table) {
            $table->id();
            $table->string('ico', 8)->nullable()->unique();
            $table->string('nazev');
            $table->string('slug')->nullable();
            $table->boolean('aktivni')->default(true);
            $table->timestamp('vytvoreno')->nullable();
            $table->timestamp('upraveno')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subjekty');
    }
};
