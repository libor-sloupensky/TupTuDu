<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabulka `chyby` — log backendových i frontendových chyb.
 *
 * Deduplikace: chyby se stejným `hash` (= file:line:message kategorií)
 * se neukládají jako nové řádky, jen inkrementují pocet_vyskytu a updatují
 * naposledy_v. Masterteam tak vidí 1 řádek per unikátní chyba.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chyby', function (Blueprint $table) {
            $table->id();
            $table->string('typ', 20); // 'server' nebo 'client'
            $table->string('uroven', 20)->default('error'); // error / warning / notice
            $table->string('hash', 64)->unique(); // sha256(typ + file:line + message normalizovaná)
            $table->string('zprava', 500); // krátké shrnutí
            $table->string('soubor', 255)->nullable(); // path:line
            $table->text('stack_trace')->nullable();
            $table->string('uri', 500)->nullable(); // URL kde se chyba stala
            $table->string('metoda', 10)->nullable(); // GET/POST...
            $table->foreignId('uzivatel_id')->nullable()->constrained('uzivatele')->nullOnDelete();
            $table->string('user_agent', 500)->nullable();
            $table->ipAddress('ip')->nullable();
            $table->json('kontext')->nullable(); // dodatečná data: input bez hesel, query params
            $table->boolean('opraveno')->default(false);
            $table->timestamp('opraveno_v')->nullable();
            $table->foreignId('opravil_uzivatel_id')->nullable()->constrained('uzivatele')->nullOnDelete();
            $table->unsignedInteger('pocet_vyskytu')->default(1);
            $table->timestamp('zacatek_v')->useCurrent(); // první výskyt
            $table->timestamp('naposledy_v')->useCurrent(); // poslední výskyt
            $table->timestamp('vytvoreno')->useCurrent();
            $table->timestamp('upraveno')->useCurrent()->useCurrentOnUpdate();

            $table->index(['opraveno', 'naposledy_v']);
            $table->index(['typ', 'naposledy_v']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chyby');
    }
};
