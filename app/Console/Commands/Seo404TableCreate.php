<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class Seo404TableCreate extends Command
{
    protected $signature = 'seo404:create-table {--limit=}';
    protected $description = 'Vytvoří tabulku seo_404 pro evidenci 404 (SEO insight)';

    public function handle(): int
    {
        if (Schema::hasTable('seo_404')) {
            $this->info('Tabulka seo_404 už existuje.');
            return 0;
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

        $this->info('Tabulka seo_404 vytvořena.');
        return 0;
    }
}
