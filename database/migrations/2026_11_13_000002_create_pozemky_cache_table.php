<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mezipaměť dat pozemků z národních služeb (výškový profil, okolní parcely, stavby), App\Services\Pozemky\Mezipamet.
 * Projekt se otevře z vlastních dat, národní služba se ptá jen poprvé a tiše při obnově (pozemky:obnovit).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pozemky_cache', function (Blueprint $table) {
            $table->id();
            $table->char('klic', 40)->unique();            // sha1(druh|země|parametry)
            $table->string('druh', 12);                     // vysky | okoli | stavby
            $table->char('zeme', 2);
            $table->json('parametry');                      // polygony nebo obálka, z nich se při obnově ptá znovu
            $table->longText('data');                       // výsledek jako JSON
            $table->timestamp('nacteno_v');                 // kdy přišla data z národní služby
            $table->timestamp('pouzito_v');                 // kdy je naposledy chtěl editor (obnovují se jen používané)
            $table->timestamp('chyba_v')->nullable();       // poslední neúspěšná obnova
            $table->index(['druh', 'nacteno_v']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pozemky_cache');
    }
};
