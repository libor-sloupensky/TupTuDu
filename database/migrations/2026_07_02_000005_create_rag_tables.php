<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// RAG znalostní báze (pro generování pravidel objektů z norem/příruček).
// Vynechána tabulka `rag_casti` (vyžaduje tabulku `soubory`, kterou v 1. fázi nebereme).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rag_kolekce', function (Blueprint $table) {
            $table->id();
            $table->string('nazev', 255);
            $table->string('podtitulek', 500)->nullable();
            $table->string('typ', 50)->default('prirucka');
            $table->string('autor', 255)->nullable();
            $table->string('isbn', 30)->nullable();
            $table->string('vydavatel', 255)->nullable();
            $table->year('rok_vydani')->nullable();
            $table->date('datum_platnosti')->nullable();
            $table->unsignedTinyInteger('autorita')->default(3);
            $table->string('role', 30)->nullable();
            $table->json('tagy')->nullable();
            $table->unsignedInteger('celkem_stran')->nullable();
            $table->unsignedInteger('nahrano_stran')->default(0);
            $table->string('stav', 30)->default('rozpracovana');
            $table->text('poznamka')->nullable();
            $table->text('chyba')->nullable();
            $table->string('rozsah_platnosti', 255)->nullable();
            $table->foreignId('uzivatel_id')->constrained('uzivatele')->cascadeOnDelete();
            $table->timestamp('vytvoreno')->useCurrent();
            $table->timestamp('upraveno')->useCurrent()->useCurrentOnUpdate();
            $table->index('stav');
            $table->index('typ');
        });

        Schema::create('rag_chunky', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kolekce_id')->constrained('rag_kolekce')->cascadeOnDelete();
            $table->mediumText('obsah');
            $table->unsignedInteger('poradi')->default(0);
            $table->string('sekce', 150)->nullable();
            $table->json('metadata')->nullable();
            $table->json('embedding')->nullable();
            $table->timestamp('vytvoreno')->useCurrent();
            $table->index(['kolekce_id', 'poradi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rag_chunky');
        Schema::dropIfExists('rag_kolekce');
    }
};
