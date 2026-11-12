<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Hodnota jednoho parametru u jednoho konkurenta v jednom měření. */
class KonkurenceHodnota extends Model
{
    protected $table = 'konkurence_hodnoty';

    protected $fillable = [
        'mereni_id', 'konkurent_id', 'parametr_id', 'hodnota', 'placene',
        'cislo', 'data', 'text', 'poznamka', 'zdroj', 'doklad', 'doklad_v', 'overeno',
    ];

    protected function casts(): array
    {
        return [
            'placene' => 'boolean',
            'cislo' => 'float',
            'data' => 'array',
            'overeno' => 'date',
            'doklad_v' => 'datetime',
        ];
    }

    /** Smí na veřejnou stránku: má doklad (snímek zdroje) a ověření není starší než 6 měsíců (modules/srovnani.md). */
    public function lzeZverejnit(): bool
    {
        return $this->doklad && $this->overeno && $this->overeno->gte(now()->subMonths(6));
    }

    /** Pořadí stavu pro srovnání: má 2, částečně 1, nemá 0; nezjištěné a skryté null (nesrovnává se). */
    public function sila(): ?int
    {
        return match ($this->hodnota) { 'ano' => 2, 'castecne' => 1, 'ne' => 0, default => null };
    }

    public const STAVY = [
        'ano' => 'má',
        'castecne' => 'částečně',
        'ne' => 'nemá',
        '?' => 'nezjištěno',
        'skryte' => 'v kódu, skryté',
    ];

    public function parametr()
    {
        return $this->belongsTo(KonkurenceParametr::class, 'parametr_id');
    }

    public function konkurent()
    {
        return $this->belongsTo(Konkurent::class, 'konkurent_id');
    }

    /** Krátký text hodnoty pro tabulku (u typu stav prázdný, ten se kreslí značkou). */
    public function kratce(): string
    {
        return match ($this->parametr?->typ) {
            'cislo' => $this->cislo === null ? '' : rtrim(rtrim(number_format($this->cislo, 2, ',', ' '), '0'), ','),
            'seznam' => implode(' ', $this->data ?? []),
            'text', 'datum' => (string) $this->text,
            default => '',
        };
    }

    /** Porovnatelný otisk hodnoty — dvě měření se liší, když se liší otisk. */
    public function otisk(): string
    {
        $data = $this->data ?? [];
        sort($data);

        return json_encode([$this->hodnota, $this->placene, $this->cislo, $data, $this->text]);
    }
}
