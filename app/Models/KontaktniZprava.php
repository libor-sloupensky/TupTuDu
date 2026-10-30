<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Zpráva z kontaktního formuláře (KontaktController). */
class KontaktniZprava extends Model
{
    protected $table = 'kontaktni_zpravy';

    /** Témata ve formuláři — klíče do lang/{jazyk}/kontakt.php → temata. */
    public const TEMATA = ['dotaz', 'problem', 'zruseni_uctu', 'osobni_udaje', 'jine'];

    /** Témata, u kterých jde o konkrétní účet — e-mail účtu je povinný (jinak nepovinný). */
    public const TEMATA_UCTU = ['zruseni_uctu', 'osobni_udaje'];

    protected $fillable = ['jmeno', 'email', 'email_uctu', 'tema', 'zprava', 'jazyk', 'zeme', 'ip', 'user_agent', 'odeslano_v'];

    protected $casts = [
        'odeslano_v' => 'datetime',
    ];
}
