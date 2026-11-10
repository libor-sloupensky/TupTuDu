<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexace webu ve vyhledávači Google (modules/statistiky.md): poslední známý stav
 * každé adresy ze sitemapy a denní součty pro graf v Masterteamu. Plní `indexace:kontrola`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('indexace_url', function (Blueprint $table) {
            $table->id();
            $table->string('adresa', 500)->unique();
            $table->boolean('zaindexovano')->default(false);
            $table->string('stav', 190)->nullable();        // slovní stav z Googlu („Odesláno a indexováno“)
            $table->timestamp('prochazeno')->nullable();    // kdy adresu naposledy navštívil robot
            $table->timestamp('zkontrolovano_v')->nullable();
        });

        Schema::create('indexace_denne', function (Blueprint $table) {
            $table->date('den')->primary();
            $table->unsignedInteger('adres');
            $table->unsignedInteger('zaindexovano');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('indexace_denne');
        Schema::dropIfExists('indexace_url');
    }
};
