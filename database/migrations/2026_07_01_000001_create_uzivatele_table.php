<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('uzivatele', function (Blueprint $table) {
            $table->id();
            $table->string('jmeno')->nullable();
            $table->string('prijmeni')->nullable();
            $table->string('email')->unique();
            $table->string('telefon')->nullable();
            $table->string('heslo')->nullable();
            $table->string('google_id')->nullable()->unique();
            $table->timestamp('email_overen_v')->nullable();
            $table->boolean('notifikace_poptavky')->default(true);
            $table->timestamp('posledni_prihlaseni')->nullable();
            $table->rememberToken();
            $table->timestamp('vytvoreno')->nullable();
            $table->timestamp('upraveno')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uzivatele');
    }
};
