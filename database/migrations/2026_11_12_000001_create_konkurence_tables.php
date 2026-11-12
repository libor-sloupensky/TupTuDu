<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Analýza konkurence v DB (modules/konkurence.md). Katalog sledovaných parametrů s režimem
 * sledovat / tiše / nesledovat, konkurenti, měsíční měření (každé je úplný snímek hodnot,
 * vývoj = rozdíl dvou měření) a události ze života konkurenta (vydání, novinky, změny cen).
 * Data nejdou do veřejného repozitáře, plní je `konkurence:import` (storage/app/konkurence).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('konkurence_parametry', function (Blueprint $table) {
            $table->id();
            $table->string('klic', 40)->unique();          // a_steny, i_jazyky_nastroj …
            $table->string('skupina', 10);                 // klíč skupiny z KonkurenceParametr::SKUPINY
            $table->string('nazev', 120);
            $table->string('popis', 500)->nullable();
            $table->string('typ', 10)->default('stav');    // stav | cislo | text | seznam | datum
            $table->string('jednotka', 20)->nullable();
            $table->string('rezim', 12)->default('sledovat'); // sledovat | tise | nesledovat
            $table->string('jak_merit', 500)->nullable();  // odkud a jak se hodnota zjišťuje
            $table->boolean('automaticky')->default(false); // jde vyčíst strojově (API, sitemap…)
            $table->date('pridano')->nullable();            // kdy parametr přibyl do katalogu
            $table->unsignedSmallInteger('poradi')->default(0);
            $table->timestamps();
        });

        Schema::create('konkurenti', function (Blueprint $table) {
            $table->id();
            $table->string('klic', 40)->unique();
            $table->string('nazev', 190);
            $table->string('kratky', 60)->nullable();
            $table->string('segment', 20);                 // KonkurenceKonkurent::SEGMENTY
            $table->string('web', 300)->nullable();
            $table->string('zeme', 190)->nullable();       // sídlo provozovatele
            $table->json('platformy')->nullable();
            $table->text('cilovka')->nullable();
            $table->string('rezim', 12)->default('sledovat');
            $table->text('kvalita')->nullable();           // vyspělost, hodnocení uživatelů
            $table->json('navic')->nullable();             // co má navíc oproti TupTuDu
            $table->json('chybi')->nullable();             // co mu chybí
            $table->text('poznamka')->nullable();
            $table->date('pridano')->nullable();
            $table->unsignedSmallInteger('poradi')->default(0);
            $table->timestamps();
        });

        Schema::create('konkurence_mereni', function (Blueprint $table) {
            $table->id();
            $table->date('datum')->unique();
            $table->string('nazev', 120);
            $table->text('poznamka')->nullable();
            $table->timestamps();
        });

        Schema::create('konkurence_hodnoty', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mereni_id')->constrained('konkurence_mereni')->cascadeOnDelete();
            $table->foreignId('konkurent_id')->constrained('konkurenti')->cascadeOnDelete();
            $table->foreignId('parametr_id')->constrained('konkurence_parametry')->cascadeOnDelete();
            $table->string('hodnota', 12)->nullable();     // u typu stav: ano | castecne | ne | ? | skryte
            $table->boolean('placene')->default(false);    // jen v placeném tarifu
            $table->decimal('cislo', 14, 2)->nullable();   // u typu cislo
            $table->json('data')->nullable();              // u typu seznam (kódy jazyků …)
            $table->text('text')->nullable();              // u typu text a datum
            $table->text('poznamka')->nullable();
            $table->string('zdroj', 1000)->nullable();     // URL dokladu
            $table->date('overeno')->nullable();           // kdy hodnota naposledy ověřena (převzatá drží staré datum)
            $table->timestamps();
            $table->unique(['mereni_id', 'konkurent_id', 'parametr_id'], 'konkurence_hodnoty_bunka');
        });

        Schema::create('konkurence_udalosti', function (Blueprint $table) {
            $table->id();
            $table->foreignId('konkurent_id')->constrained('konkurenti')->cascadeOnDelete();
            $table->date('datum');                         // u měsíční přesnosti první den měsíce
            $table->string('typ', 12)->default('funkce');  // vydani | funkce | cena | obsah | jine
            $table->string('popis', 500);
            $table->string('zdroj', 1000)->nullable();
            $table->timestamps();
            $table->index(['konkurent_id', 'datum']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('konkurence_udalosti');
        Schema::dropIfExists('konkurence_hodnoty');
        Schema::dropIfExists('konkurence_mereni');
        Schema::dropIfExists('konkurenti');
        Schema::dropIfExists('konkurence_parametry');
    }
};
