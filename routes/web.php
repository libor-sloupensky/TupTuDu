<?php

use App\Http\Controllers\Masterteam\UzivateleController;
use Illuminate\Support\Facades\Route;

// Titulka — web je zatím jen backend (administrace na /masterteam).
Route::get('/', function () {
    return view('vitrina.index');
});

// Administrace (Masterteam) — jen pro přihlášené členy master týmu (IČO master subjektu).
Route::middleware(['auth', 'master'])->prefix('masterteam')->name('masterteam.')->group(function () {
    Route::get('/', fn () => view('masterteam.dashboard'))->name('dashboard');

    // Správa uživatelů master týmu
    Route::get('uzivatele', [UzivateleController::class, 'index'])->name('uzivatele.index');
    Route::post('uzivatele', [UzivateleController::class, 'store'])->name('uzivatele.store');
    Route::patch('uzivatele/{uzivatel}/role', [UzivateleController::class, 'toggleRole'])->name('uzivatele.role');
    Route::delete('uzivatele/{uzivatel}', [UzivateleController::class, 'destroy'])->name('uzivatele.destroy');
});
