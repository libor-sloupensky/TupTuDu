<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Hodnota jednoho parametru u jednoho konkurenta v jednom měření. */
class KonkurenceHodnota extends Model
{
    protected $table = 'konkurence_hodnoty';

    protected $fillable = [
        'mereni_id', 'konkurent_id', 'parametr_id', 'hodnota', 'placene',
        'cislo', 'data', 'text', 'poznamka', 'zdroj', 'overeno',
    ];

    protected function casts(): array
    {
        return [
            'placene' => 'boolean',
            'cislo' => 'float',
            'data' => 'array',
            'overeno' => 'date',
        ];
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
