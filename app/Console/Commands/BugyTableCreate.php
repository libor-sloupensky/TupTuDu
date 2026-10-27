<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Manuální vytvoření tabulky `bugy` (deploy-hook migrate nedetekuje migraci).
 * Idempotentní — kontrola Schema::hasTable.
 */
class BugyTableCreate extends Command
{
    protected $signature = 'bugy:create-table {--limit=}';
    protected $description = 'Vytvoří tabulku bugy (alternativa k migraci 2026_06_18_180000)';

    public function handle(): int
    {
        if (Schema::hasTable('bugy')) {
            $this->info('Tabulka bugy už existuje.');
            return 0;
        }

        Schema::create('bugy', function (Blueprint $table) {
            $table->id();
            $table->string('typ', 20);
            $table->string('uroven', 20)->default('error');
            $table->string('hash', 64)->unique();
            $table->string('zprava', 500);
            $table->string('soubor', 255)->nullable();
            $table->text('stack_trace')->nullable();
            $table->string('uri', 500)->nullable();
            $table->string('metoda', 10)->nullable();
            $table->foreignId('uzivatel_id')->nullable()->constrained('uzivatele')->nullOnDelete();
            $table->string('user_agent', 500)->nullable();
            $table->ipAddress('ip')->nullable();
            $table->json('kontext')->nullable();
            $table->boolean('opraveno')->default(false);
            $table->timestamp('opraveno_v')->nullable();
            $table->foreignId('opravil_uzivatel_id')->nullable()->constrained('uzivatele')->nullOnDelete();
            $table->unsignedInteger('pocet_vyskytu')->default(1);
            $table->timestamp('zacatek_v')->useCurrent();
            $table->timestamp('naposledy_v')->useCurrent();
            $table->timestamp('vytvoreno')->useCurrent();
            $table->timestamp('upraveno')->useCurrent()->useCurrentOnUpdate();

            $table->index(['opraveno', 'naposledy_v']);
            $table->index(['typ', 'naposledy_v']);
        });

        $this->info('Tabulka bugy vytvořena.');
        return 0;
    }
}
