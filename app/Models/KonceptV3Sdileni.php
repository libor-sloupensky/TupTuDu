<?php

namespace App\Models;

use App\Support\Tarif;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\File;

/**
 * Odkaz pro čtení na stav projektu. Soubory leží v storage/app/sdileni/{token}: hotové obrázky
 * a předpočítaný 3D model. Editor ani data projektu se ke čtenáři nedostanou (modules/sdileni.md).
 */
class KonceptV3Sdileni extends Model
{
    protected $table = 'koncepty_v3_sdileni';

    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $guarded = [];

    protected $casts = ['podlazi' => 'array'];

    public function koncept(): BelongsTo
    {
        return $this->belongsTo(KonceptV3::class, 'koncept_id');
    }

    /** Odkaz platí, jen když účet autora existuje a jeho tarif sdílení má. Dnes ho mají všechny. */
    public function jeUzamceny(): bool
    {
        $autor = $this->koncept?->uzivatel;

        return ! $autor || ! Tarif::maExporty($autor);
    }

    public static function slozka(string $token): string
    {
        return storage_path('app/sdileni/' . $token);
    }

    public function smazSoubory(): void
    {
        File::deleteDirectory(self::slozka($this->token));
    }

    protected static function booted(): void
    {
        static::deleting(fn (KonceptV3Sdileni $s) => $s->smazSoubory());
    }
}
