<?php

use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\ChybaController;
use App\Http\Controllers\Masterteam\ChybyController;
use App\Http\Controllers\Masterteam\KonceptController;
use App\Http\Controllers\Masterteam\PravidlaObjektuController;
use App\Http\Controllers\Masterteam\UzivateleController;
use Illuminate\Support\Facades\Route;

// Titulka — web je zatím jen backend (administrace na /masterteam).
Route::get('/', function () {
    return view('vitrina.index');
});

// Error tracking — příjem JS chyb z frontendu (window.onerror, unhandledrejection).
Route::post('/api/chyba', [ChybaController::class, 'ulozit'])
    ->middleware('throttle:60,1')
    ->name('api.chyba');

// Google OAuth přihlášení (Socialite) — jen pro existující uživatele master týmu.
Route::get('/auth/google', [GoogleController::class, 'redirect'])->name('auth.google');
Route::get('/auth/google/callback', [GoogleController::class, 'callback'])->name('auth.google.callback');

// Administrace (Masterteam) — jen pro přihlášené členy master týmu (IČO master subjektu).
Route::middleware(['auth', 'master'])->prefix('masterteam')->name('masterteam.')->group(function () {
    Route::get('/', fn () => view('masterteam.dashboard'))->name('dashboard');

    // Správa uživatelů master týmu
    Route::get('uzivatele', [UzivateleController::class, 'index'])->name('uzivatele.index');
    Route::post('uzivatele', [UzivateleController::class, 'store'])->name('uzivatele.store');
    Route::patch('uzivatele/{uzivatel}/role', [UzivateleController::class, 'toggleRole'])->name('uzivatele.role');
    Route::delete('uzivatele/{uzivatel}', [UzivateleController::class, 'destroy'])->name('uzivatele.destroy');

    // ───────── Koncept (editor) ─────────
    Route::get('koncept', [KonceptController::class, 'indexK'])->name('koncept');
    Route::get('koncept/test-paket-e', [KonceptController::class, 'testPaketE'])->name('koncept.testPaketE');
    Route::post('koncept/test-paket-e/ai-uprava', [KonceptController::class, 'testPaketEUprava'])->name('koncept.testPaketEUprava');
    Route::post('koncept/vytvorit', [KonceptController::class, 'vytvorit'])->name('koncept.vytvorit');
    Route::post('koncept/import-pudorys', [KonceptController::class, 'importZPudorysu'])->name('koncept.import-pudorys');
    Route::post('koncept/ai-vytvor', [KonceptController::class, 'aiVytvor'])->name('koncept.aiVytvor');
    Route::post('koncept/import', [KonceptController::class, 'importDxf'])->name('koncept.import');
    // Katastr — statické routy PŘED parametrickými (jinak {koncept:id} matchne "katastr")
    Route::post('koncept/katastr/parcela', [KonceptController::class, 'nactiParcelu'])->name('koncept.katastr.parcela');
    Route::post('koncept/katastr/stavby', [KonceptController::class, 'nactiStavby'])->name('koncept.katastr.stavby');
    Route::post('koncept/katastr/vyskovy-profil', [KonceptController::class, 'nactiVyskovy'])->name('koncept.katastr.vyskovy');
    Route::post('koncept/katastr/sousednost', [KonceptController::class, 'overSousednost'])->name('koncept.katastr.sousednost');
    Route::post('koncept/katastr/okolni', [KonceptController::class, 'nactiOkolniParcely'])->name('koncept.katastr.okolni');
    Route::post('koncept/vysvetleni', [KonceptController::class, 'vysvetleniPojmu'])->name('koncept.vysvetleni');
    // Parametrické routy — {koncept:id} na konci
    Route::patch('koncept/{koncept:id}/ulozit', [KonceptController::class, 'ulozit'])->name('koncept.ulozit');
    Route::delete('koncept/{koncept:id}', [KonceptController::class, 'smazat'])->name('koncept.smazat');
    Route::post('koncept/{koncept:id}/ai-uprav', [KonceptController::class, 'aiUprav'])->name('koncept.aiUprav');
    Route::get('koncept/{koncept:id}/export', [KonceptController::class, 'exportJson'])->name('koncept.export');
    Route::patch('koncept/{koncept:id}/katastr', [KonceptController::class, 'ulozitKatastr'])->name('koncept.katastr.ulozit');

    // ───────── Pravidla objektů ─────────
    Route::get('pravidla-objektu', [PravidlaObjektuController::class, 'index'])->name('pravidla-objektu.index');
    Route::get('pravidla-objektu/nova', [PravidlaObjektuController::class, 'create'])->name('pravidla-objektu.create');
    Route::post('pravidla-objektu', [PravidlaObjektuController::class, 'store'])->name('pravidla-objektu.store');
    Route::get('pravidla-objektu/{pravidlo:id}/edit', [PravidlaObjektuController::class, 'edit'])->name('pravidla-objektu.edit');
    Route::patch('pravidla-objektu/{pravidlo:id}', [PravidlaObjektuController::class, 'update'])->name('pravidla-objektu.update');
    Route::delete('pravidla-objektu/{pravidlo:id}', [PravidlaObjektuController::class, 'destroy'])->name('pravidla-objektu.destroy');
    Route::post('pravidla-objektu/generovat', [PravidlaObjektuController::class, 'generovat'])->name('pravidla-objektu.generovat');
    Route::post('pravidla-objektu/obnovit', [PravidlaObjektuController::class, 'obnovitVse'])->name('pravidla-objektu.obnovit');

    // ───────── Chyby (záznam backend + frontend chyb) ─────────
    Route::get('chyby', [ChybyController::class, 'index'])->name('chyby');
    Route::get('chyby/{chyba}', [ChybyController::class, 'show'])->name('chyby.show');
    Route::patch('chyby/{chyba}/opraveno', [ChybyController::class, 'oznacOpraveno'])->name('chyby.opraveno');
    Route::delete('chyby/{chyba}', [ChybyController::class, 'smazat'])->name('chyby.smazat');
});
