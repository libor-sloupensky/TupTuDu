<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kolikrát za den se v editoru použila funkce (import výkresu, 3D, export…), souhrnně a bez vazby
// na uživatele, proto to nejsou osobní údaje a zásady soukromí to nemusí uvádět. App\Support\Mereni,
// modules/marketing.md, část Analýza webu. Master tým se nepočítá.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('statistika_funkci', function (Blueprint $table) {
            $table->id();
            $table->date('den')->comment('Den podle časové zóny aplikace (Europe/Prague)');
            $table->string('funkce', 40)->comment('Klíč z App\Support\Mereni::FUNKCE');
            $table->unsignedInteger('pocet')->default(0)->comment('Prohlížeče, které funkci ten den použily (jeden prohlížeč nejvýš jednou za den)');
            $table->unique(['den', 'funkce']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('statistika_funkci');
    }
};
