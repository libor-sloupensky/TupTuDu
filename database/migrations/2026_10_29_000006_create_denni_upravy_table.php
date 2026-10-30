<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Počet úprav v editoru za den — denní limit tarifu Zdarma (App\Support\Tarif,
// config/tarify.php). Jeden řádek na uživatele a den, přičítá se jedním dotazem.
// Staré řádky maže `uchovavani:promazat` (config/uchovavani.php).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('denni_upravy', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uzivatel_id')->constrained('uzivatele')->cascadeOnDelete();
            $table->date('den')->comment('Den podle časové zóny aplikace (Europe/Prague)');
            $table->unsignedInteger('pocet')->default(0)->comment('Kroky historie editoru uložené ten den');
            $table->unique(['uzivatel_id', 'den']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('denni_upravy');
    }
};
