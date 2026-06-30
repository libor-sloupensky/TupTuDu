<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RagKolekce extends Model
{
    const CREATED_AT = 'vytvoreno';
    const UPDATED_AT = 'upraveno';

    protected $table = 'rag_kolekce';

    protected $fillable = [
        'nazev', 'podtitulek', 'typ', 'autor', 'rok_vydani',
        'autorita', 'role', 'tagy', 'celkem_stran', 'nahrano_stran',
        'stav', 'poznamka', 'rozsah_platnosti', 'chyba', 'uzivatel_id',
    ];

    protected $casts = [
        'autorita' => 'integer',
        'celkem_stran' => 'integer',
        'nahrano_stran' => 'integer',
        'tagy' => 'array',
    ];

    const TYPY = [
        'legislativa' => 'Legislativa',
        'csn' => 'ČSN norma',
        'prirucka' => 'Příručka / návod',
        'faq' => 'FAQ / slovníček',
        'katalog' => 'Katalog / product sheet',
        'cenik' => 'Ceník',
        'projekt' => 'Stavební projekt',
    ];

    const ROLE = [
        'pravidlo' => 'Pravidlo',
        'doporuceni' => 'Doporučení',
        'inspirace' => 'Inspirace',
    ];

    const STAVY = [
        'rozpracovana' => 'Rozpracovaná',
        'ke_zpracovani' => 'Ke zpracování',
        'zpracovava_se' => 'Zpracovává se',
        'hotova' => 'Hotová',
        'chyba' => 'Chyba',
    ];

    public function uzivatel(): BelongsTo
    {
        return $this->belongsTo(Uzivatel::class);
    }

    public function casti(): HasMany
    {
        return $this->hasMany(RagCast::class, 'kolekce_id')->orderBy('strana_od');
    }

    public function chunky(): HasMany
    {
        return $this->hasMany(RagChunk::class, 'kolekce_id')->orderBy('poradi');
    }

    public function prepoctiNahranoStran(): void
    {
        $stran = $this->casti()->sum(\DB::raw('strana_do - strana_od + 1'));
        $this->update(['nahrano_stran' => $stran]);
    }

    public function maKompletnStrany(): bool
    {
        if (! $this->celkem_stran) {
            return false;
        }
        return $this->nahrano_stran >= $this->celkem_stran;
    }

    public function chybejiciStrany(): array
    {
        if (! $this->celkem_stran) {
            return [];
        }

        $pokryte = [];
        foreach ($this->casti as $cast) {
            for ($i = $cast->strana_od; $i <= $cast->strana_do; $i++) {
                $pokryte[$i] = true;
            }
        }

        $chybejici = [];
        for ($i = 1; $i <= $this->celkem_stran; $i++) {
            if (! isset($pokryte[$i])) {
                $chybejici[] = $i;
            }
        }

        return $chybejici;
    }

    public function prekryvajiciSeStrany(): array
    {
        $casti = $this->casti()->orderBy('strana_od')->get();
        $prekryvy = [];

        for ($i = 0; $i < $casti->count() - 1; $i++) {
            if ($casti[$i]->strana_do >= $casti[$i + 1]->strana_od) {
                $prekryvy[] = [
                    'strany' => $casti[$i + 1]->strana_od . '-' . min($casti[$i]->strana_do, $casti[$i + 1]->strana_do),
                    'cast_a' => $casti[$i]->id,
                    'cast_b' => $casti[$i + 1]->id,
                ];
            }
        }

        return $prekryvy;
    }
}
