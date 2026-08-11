<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modul Doklady (převzato z projektu office).
 *
 * Prefix `office_` odděluje účetní agendu od plánovací části projektu.
 * Firmy si modul zatím nese vlastní (PK = IČO, jak to bylo v office) —
 * sjednocení se `subjekty` přijde až v kroku sloučení identit. Jediná
 * vazba ven vede přes office_user_firma.user_id → uzivatele.id.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Firmy, ke kterým doklady patří. PK je IČO, ne auto-increment —
        // celý modul se na firmu odkazuje IČem.
        Schema::create('office_firmy', function (Blueprint $table) {
            $table->string('ico', 20)->primary();
            $table->string('nazev');
            $table->string('dic', 20)->nullable();
            $table->string('ulice')->nullable();
            $table->string('mesto')->nullable();
            $table->string('psc', 10)->nullable();
            $table->string('email')->nullable();
            $table->string('telefon', 20)->nullable();
            $table->boolean('je_ucetni')->default(false);

            // Příjem dokladů e-mailem
            $table->string('email_doklady')->nullable();
            $table->string('email_doklady_heslo')->nullable();
            $table->boolean('email_system_aktivni')->default(false);
            $table->boolean('email_vlastni_aktivni')->default(false);
            $table->string('email_vlastni')->nullable();
            $table->string('email_vlastni_host')->nullable();
            $table->unsignedSmallInteger('email_vlastni_port')->nullable();
            $table->string('email_vlastni_sifrovani', 10)->nullable()->default('ssl');
            $table->string('email_vlastni_uzivatel')->nullable();
            $table->string('email_vlastni_heslo')->nullable();

            // Google Drive sync — refresh token je v DB šifrovaný
            $table->boolean('google_drive_aktivni')->default(false);
            $table->text('google_refresh_token')->nullable();
            $table->string('google_folder_id', 100)->nullable();
            $table->string('google_drive_sablona')->nullable();

            $table->timestamps();
        });

        // Dodavatelé — sdílený číselník napříč firmami, klíčem je IČO
        Schema::create('office_dodavatele', function (Blueprint $table) {
            $table->string('ico', 20)->primary();
            $table->string('nazev');
            $table->string('dic', 20)->nullable();
            $table->string('ulice')->nullable();
            $table->string('mesto')->nullable();
            $table->string('psc', 10)->nullable();
            $table->timestamps();
        });

        // Přístup uživatelů k firmám. Jediné místo, kde se modul potkává
        // s identitou zbytku aplikace.
        Schema::create('office_user_firma', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('firma_ico', 20);
            $table->enum('role', ['ucetni', 'firma', 'dodavatel']);
            $table->string('interni_role', 20)->default('spravce');
            $table->timestamps();

            $table->index('user_id');
            $table->index('firma_ico');
            $table->unique(['user_id', 'firma_ico']);
        });

        // Vztah účetní ↔ klientská firma, včetně oprávnění účetní
        Schema::create('office_ucetni_vazby', function (Blueprint $table) {
            $table->id();
            $table->string('ucetni_ico', 20);
            $table->string('klient_ico', 20);
            $table->enum('stav', ['ceka_na_ucetni', 'ceka_na_firmu', 'schvaleno', 'zamitnuto'])
                ->default('ceka_na_firmu');
            $table->dateTime('zadost_odeslana_at')->nullable();
            $table->boolean('perm_vkladat')->default(true);
            $table->boolean('perm_upravovat')->default(true);
            $table->boolean('perm_mazat')->default(false);
            $table->timestamps();

            $table->index('ucetni_ico');
            $table->index('klient_ico');
        });

        // Pozvánky do firmy
        Schema::create('office_pozvani', function (Blueprint $table) {
            $table->increments('id');
            $table->string('firma_ico', 20);
            $table->string('jmeno');
            $table->string('email');
            $table->string('interni_role', 20)->default('spravce');
            $table->string('token', 64)->unique();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('accepted_at')->nullable();

            $table->index('firma_ico');
        });

        // Kategorie dokladů — per firma, uživatel si je upravuje v nastavení
        Schema::create('office_kategorie', function (Blueprint $table) {
            $table->increments('id');
            $table->string('firma_ico', 20);
            $table->string('nazev', 100);
            $table->string('popis', 500)->nullable();
            $table->integer('poradi')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();

            $table->index('firma_ico');
        });

        Schema::create('office_doklady', function (Blueprint $table) {
            $table->id();
            $table->string('firma_ico', 20);
            $table->string('dodavatel_ico', 20)->nullable();

            // Soubory: cesta_souboru = zpracované PDF, cesta_originalu = původní upload
            $table->string('nazev_souboru');
            $table->string('cesta_souboru');
            $table->string('cesta_originalu', 500)->nullable();
            $table->string('hash_souboru', 64)->nullable();

            // Údaje vytažené AI
            $table->string('dodavatel_nazev')->nullable();
            $table->string('odberatel_ico', 20)->nullable();
            $table->string('odberatel_nazev')->nullable();
            $table->string('cislo_dokladu', 100)->nullable();
            $table->string('variabilni_symbol', 20)->nullable();
            $table->string('cislo_uctu', 50)->nullable();
            $table->string('iban', 34)->nullable();
            $table->string('zpusob_platby', 20)->nullable();
            $table->boolean('reverse_charge')->default(false);
            $table->date('datum_vystaveni')->nullable();
            $table->date('datum_prijeti')->nullable();
            $table->date('duzp')->nullable();
            $table->date('datum_splatnosti')->nullable();
            $table->decimal('castka_celkem', 12, 2)->nullable();
            $table->decimal('castka_zaklad', 12, 2)->nullable();
            $table->decimal('castka_dph', 12, 2)->nullable();
            $table->string('mena', 10)->default('CZK');
            $table->string('kategorie', 100)->nullable();
            $table->text('poznamka')->nullable();

            // Kontrola, že doklad patří opravdu téhle firmě
            $table->boolean('adresni')->default(true);
            $table->boolean('overeno_adresat')->default(false);

            // Syrové vstupy/výstupy AI — kvůli dohledání, proč vyšlo, co vyšlo
            $table->longText('raw_text')->nullable();
            $table->longText('raw_ai_odpoved')->nullable();

            $table->string('stav', 30)->default('nahrano');
            $table->string('typ_dokladu', 30)->default('faktura');
            $table->string('kvalita', 20)->default('dobra');
            $table->text('kvalita_poznamka')->nullable();
            $table->unsignedSmallInteger('poradi_v_souboru')->default(1);
            $table->text('chybova_zprava')->nullable();
            $table->string('zdroj', 20)->default('upload');
            $table->string('nahral')->nullable();
            $table->unsignedBigInteger('duplicita_id')->nullable();

            // Google Drive sync
            $table->string('google_drive_file_id', 100)->nullable();
            $table->string('google_drive_ucetni_file_id', 100)->nullable();
            $table->dateTime('google_drive_nahrano_at')->nullable();

            $table->timestamps();

            $table->index('firma_ico');
            $table->index('dodavatel_ico');
            $table->index('duplicita_id');
            $table->index('hash_souboru');
        });

        // Fulltext nad rozpoznaným textem — hledání napříč doklady.
        // Odděleně od create(), Blueprint::fullText() na longtext v MariaDB zlobí.
        try {
            Illuminate\Support\Facades\DB::statement('ALTER TABLE office_doklady ADD FULLTEXT idx_raw_text (raw_text)');
        } catch (\Throwable $e) {
            // Fulltext není kritický — hledání funguje i přes LIKE
        }

        Schema::create('office_polozky', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('doklad_id');
            $table->smallInteger('poradi')->default(1);
            $table->string('text', 500);
            $table->decimal('mnozstvi', 12, 3)->nullable();
            $table->string('jednotka', 20)->nullable();
            $table->decimal('cena_za_jednotku', 12, 2)->nullable();
            $table->decimal('zaklad_dane', 12, 2)->nullable();
            $table->decimal('sazba_dph', 5, 2)->nullable();
            $table->decimal('castka_dph', 12, 2)->nullable();
            $table->decimal('castka_celkem', 12, 2)->nullable();
            $table->timestamps();

            $table->index('doklad_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('office_polozky');
        Schema::dropIfExists('office_doklady');
        Schema::dropIfExists('office_kategorie');
        Schema::dropIfExists('office_pozvani');
        Schema::dropIfExists('office_ucetni_vazby');
        Schema::dropIfExists('office_user_firma');
        Schema::dropIfExists('office_dodavatele');
        Schema::dropIfExists('office_firmy');
    }
};
