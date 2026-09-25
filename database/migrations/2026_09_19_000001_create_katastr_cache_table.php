<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cache parcel z ČÚZK WFS (převzato z kalkulia) — používá KatastrService.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('katastr_cache', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('ku_kod')->index();
            $table->string('cislo_parcely', 20);
            $table->enum('typ_parcely', ['pozemkova', 'stavebni']);
            $table->json('data'); // polygon, atributy, bbox
            $table->json('vyskovy_profil')->nullable();
            $table->timestamp('vytvoreno')->useCurrent();
            $table->timestamp('upraveno')->useCurrent()->useCurrentOnUpdate();

            $table->unique(['ku_kod', 'cislo_parcely', 'typ_parcely'], 'katastr_cache_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('katastr_cache');
    }
};
