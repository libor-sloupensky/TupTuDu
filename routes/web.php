<?php

use Illuminate\Support\Facades\Route;

// Titulka — web je zatím jen backend (administrace na /masterteam, Etapa 2+).
Route::get('/', function () {
    return view('vitrina.index');
});
