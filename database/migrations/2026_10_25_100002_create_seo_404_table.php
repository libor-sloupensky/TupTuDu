<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabulka `seo_404` — neexistující URL, na které někdo přišel (záložka
 * „404 (ztracené)" v /masterteam/bugy). Deduplikace přes hash(uri + doména refereru).
 * Stejné schéma jako příkaz seo404:create-table.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('seo_404')) {
            return;
        }

        Schema::create('seo_404', function (Blueprint $table) {
            $table->id();
            $table->string('hash', 64)->unique();
            $table->string('uri', 500);
            $table->string('referer', 1000)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->unsignedInteger('pocet_vyskytu')->default(1);
            $table->timestamp('prvni_v')->useCurrent();
            $table->timestamp('naposledy_v')->useCurrent();
            $table->timestamp('vytvoreno')->useCurrent();
            $table->timestamp('upraveno')->useCurrent()->useCurrentOnUpdate();

            $table->index('naposledy_v');
            $table->index('pocet_vyskytu');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_404');
    }
};
