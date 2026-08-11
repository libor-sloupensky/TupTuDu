<?php

/**
 * Routy modulu Doklady (převzato z projektu office).
 *
 * Vše pod prefixem /doklady a jménem office.*, aby nekolidovalo
 * s plánovací částí aplikace. Načítá se z bootstrap/app.php.
 */

use App\Http\Controllers\Office\AresController;
use App\Http\Controllers\Office\FirmaController;
use App\Http\Controllers\Office\GoogleDriveController;
use App\Http\Controllers\Office\InvoiceController;
use App\Http\Controllers\Office\KlientiController;
use App\Http\Controllers\Office\MobileController;
use App\Http\Controllers\Office\VazbyController;
use Illuminate\Support\Facades\Route;

Route::name('office.')->group(function () {

    // ARES lookup — bez firmy, používá se i při zakládání
    Route::get('/api/ares/{ico}', [AresController::class, 'lookup'])
        ->middleware('throttle:30,1')->name('ares.lookup');

    // --- Mobilní aplikace (skenování dokladů) ---
    Route::get('/mobile/prihlaseni', [MobileController::class, 'prihlaseni'])->name('mobile.prihlaseni');
    Route::post('/mobile/prihlaseni', [MobileController::class, 'login'])->name('mobile.login');
    Route::middleware(['auth', 'office.firma'])->group(function () {
        Route::get('/mobile/skenovat', [MobileController::class, 'skenovat'])->name('mobile.skenovat');
        Route::post('/mobile/prepnout-firmu/{ico}', [MobileController::class, 'prepnoutFirmu'])->name('mobile.prepnoutFirmu');
        Route::post('/mobile/odhlaseni', [MobileController::class, 'logout'])->name('mobile.logout');
    });

    // --- Volba firmy (ještě bez middleware office.firma — uživatel žádnou mít nemusí) ---
    Route::middleware('auth')->group(function () {
        Route::get('/doklady/firma/zadna', [FirmaController::class, 'zadnaFirma'])->name('firma.zadna');
        Route::post('/doklady/firma/lookup-pristup', [FirmaController::class, 'lookupPristup'])->name('firma.lookupPristup');
        Route::post('/doklady/firma/vytvorit', [FirmaController::class, 'vytvorFirmu'])->name('firma.vytvorFirmu');
        Route::post('/doklady/firma/prepnout/{ico}', [FirmaController::class, 'prepnout'])->name('firma.prepnout');

        // Google Drive OAuth pro sync dokladů
        Route::get('/doklady/google/redirect', [GoogleDriveController::class, 'redirect'])->name('google.redirect');
        Route::get('/doklady/google/callback', [GoogleDriveController::class, 'callback'])->name('google.callback');
        Route::post('/doklady/google/disconnect', [GoogleDriveController::class, 'disconnect'])->name('google.disconnect');
    });

    // --- Vlastní agenda dokladů ---
    Route::middleware(['auth', 'office.firma'])->group(function () {

        Route::post('/doklady/upload', [InvoiceController::class, 'store'])->name('invoices.store');
        Route::get('/doklady', [InvoiceController::class, 'index'])->name('doklady.index');
        Route::post('/doklady/ai-search', [InvoiceController::class, 'aiSearch'])->name('doklady.aiSearch');
        Route::get('/doklady/mesic/{mesic}/zip', [InvoiceController::class, 'downloadMonth'])->name('doklady.downloadMonth');
        Route::post('/doklady/stahnout-vybrane', [InvoiceController::class, 'downloadSelected'])->name('doklady.downloadSelected');

        // Nastavení firmy — statické cesty PŘED /doklady/{doklad}, jinak by je parametr pohltil
        Route::get('/doklady/nastaveni', [FirmaController::class, 'nastaveni'])->name('firma.nastaveni');
        Route::post('/doklady/nastaveni', [FirmaController::class, 'ulozit'])->name('firma.ulozit');
        Route::post('/doklady/nastaveni/ares', [FirmaController::class, 'obnovitAres'])->name('firma.obnovitAres');
        Route::post('/doklady/nastaveni/toggle-ucetni', [FirmaController::class, 'toggleUcetni'])->name('firma.toggleUcetni');
        Route::post('/doklady/nastaveni/kategorie', [FirmaController::class, 'ulozitKategorie'])->name('firma.ulozitKategorie');
        Route::delete('/doklady/nastaveni/kategorie/{id}', [FirmaController::class, 'smazatKategorii'])->name('firma.smazatKategorii');
        Route::post('/doklady/nastaveni/email-system-toggle', [FirmaController::class, 'toggleSystemEmail'])->name('firma.toggleSystemEmail');
        Route::post('/doklady/nastaveni/email-vlastni', [FirmaController::class, 'ulozitVlastniEmail'])->name('firma.ulozitVlastniEmail');
        Route::post('/doklady/nastaveni/email-vlastni-test', [FirmaController::class, 'testEmailVlastni'])->name('firma.testEmailVlastni');
        Route::post('/doklady/nastaveni/drive-sablona', [FirmaController::class, 'ulozitDriveSablona'])->name('firma.ulozitDriveSablona');
        Route::post('/doklady/nastaveni/uzivatele', [FirmaController::class, 'pridatUzivatele'])->name('firma.pridatUzivatele');
        Route::patch('/doklady/nastaveni/uzivatele/{userId}', [FirmaController::class, 'upravitUzivatele'])->name('firma.upravitUzivatele');
        Route::delete('/doklady/nastaveni/uzivatele/{userId}', [FirmaController::class, 'odebratUzivatele'])->name('firma.odebratUzivatele');
        Route::delete('/doklady/nastaveni/pozvanky/{id}', [FirmaController::class, 'zrusitPozvanku'])->name('firma.zrusitPozvanku');

        // Klienti — jen pro účetní
        Route::middleware('office.role:ucetni')->group(function () {
            Route::get('/doklady/klienti', [KlientiController::class, 'index'])->name('klienti.index');
            Route::post('/doklady/klienti', [KlientiController::class, 'store'])->name('klienti.store');
            Route::post('/doklady/klienti/lookup', [KlientiController::class, 'lookup'])->name('klienti.lookup');
            Route::post('/doklady/klienti/zadost', [KlientiController::class, 'poslZadost'])->name('klienti.poslZadost');
            Route::delete('/doklady/klienti/{klientIco}', [KlientiController::class, 'destroy'])->name('klienti.destroy');
        });

        // Schvalování vazeb účetní ↔ klient
        Route::middleware('office.role:firma,dodavatel,ucetni')->group(function () {
            Route::post('/doklady/vazby/{id}/schvalit', [VazbyController::class, 'approve'])->name('vazby.approve');
            Route::post('/doklady/vazby/{id}/zamitnout', [VazbyController::class, 'reject'])->name('vazby.reject');
            Route::post('/doklady/vazby/{id}/odpojit', [VazbyController::class, 'disconnect'])->name('vazby.disconnect');
            Route::post('/doklady/vazby/{id}/opravneni', [VazbyController::class, 'updateOpravneni'])->name('vazby.updateOpravneni');
        });

        // Parametrické routy až nakonec
        Route::get('/doklady/{doklad}', [InvoiceController::class, 'show'])->name('doklady.show');
        Route::get('/doklady/{doklad}/stahnout', [InvoiceController::class, 'download'])->name('doklady.download');
        Route::get('/doklady/{doklad}/nahled', [InvoiceController::class, 'preview'])->name('doklady.preview');
        Route::get('/doklady/{doklad}/nahled-original', [InvoiceController::class, 'previewOriginal'])->name('doklady.previewOriginal');
        Route::patch('/doklady/{doklad}', [InvoiceController::class, 'update'])->name('doklady.update');
        Route::delete('/doklady/{doklad}', [InvoiceController::class, 'destroy'])->name('doklady.destroy');
    });
});
