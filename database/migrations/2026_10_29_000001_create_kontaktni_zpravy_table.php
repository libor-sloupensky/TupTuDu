<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Zprávy z kontaktního formuláře (tuptudu.com/contact). Ukládají se i přes odeslání
// mailem — když mail selže, zpráva se neztratí (odeslano_v zůstane null).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kontaktni_zpravy', function (Blueprint $table) {
            $table->id();
            $table->string('jmeno', 100);
            $table->string('email', 190);
            $table->string('email_uctu', 190)->nullable()->comment('E-mail účtu odesílatele (při zaškrtnutí stejný jako email); NULL = neuveden');
            $table->string('tema', 30);
            $table->text('zprava');
            $table->string('jazyk', 5)->nullable();
            $table->string('zeme', 2)->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('odeslano_v')->nullable()->comment('Kdy odešel mail provozovateli; null = neodešel');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kontaktni_zpravy');
    }
};
