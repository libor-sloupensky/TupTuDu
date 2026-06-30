<?php

use Illuminate\Support\Facades\Route;

// Titulka — web je zatím jen backend (administrace na /masterteam).
Route::get('/', function () {
    return view('vitrina.index');
});

// Administrace (Masterteam) — jen pro přihlášené členy master týmu (IČO master subjektu).
Route::middleware(['auth', 'master'])->prefix('masterteam')->name('masterteam.')->group(function () {
    Route::get('/', fn () => view('masterteam.dashboard'))->name('dashboard');
});
