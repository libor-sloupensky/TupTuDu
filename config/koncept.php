<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Poppler (příprava PDF podkladů pro import půdorysu)
    |--------------------------------------------------------------------------
    |
    | Složka s binárkami pdfinfo / pdftocairo / pdftotext. Když je prázdná,
    | hledají se v PATH. Na Windows lokálně např. C:\Users\HP\tools\poppler-bin.
    |
    */
    'poppler_cesta' => env('KONCEPT_POPPLER', ''),

    /*
    |--------------------------------------------------------------------------
    | Podklad importu
    |--------------------------------------------------------------------------
    */
    'podklad' => [
        'max_mb' => 25,   // musí se vejít do upload_max_filesize/post_max_size v PHP
        'dpi_nahled' => 40,    // mřížka náhledů stran
        'dpi_podklad' => 150,  // obrázek pod kresbou v editoru
    ],

];
