<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Tokeny pro obnovu zapomenutého hesla (config/auth.php → passwords.users.table).
// Struktura podle výchozí Laravelí tabulky password_reset_tokens.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reset_hesel', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reset_hesel');
    }
};
