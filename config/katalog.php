<?php

// Katalog objektů: modely, náhledy a značky jsou v S3, v repozitáři jen katalog.json (modules/katalog.md).
// KATALOG_ZAKLAD=/katalog přepne na lokální soubory v public/katalog.

return [
    'zaklad' => env('KATALOG_ZAKLAD', 'https://tuptudu-katalog.s3.eu-central-1.amazonaws.com'),
];
