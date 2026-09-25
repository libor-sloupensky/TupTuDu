<?php

namespace App\Console\Commands;

use App\Models\KonceptV3;
use Illuminate\Console\Command;

/**
 * Vyveze ručně nakreslené referenční půdorysy z konceptů do souborů.
 *
 * Reference musí být ve verzování, jinak nejde poznat, jestli se rozpoznávání
 * zlepšilo, nebo se jen změnilo, s čím se porovnává.
 */
class ExportReferenciImportu extends Command
{
    protected $signature = 'koncept-v3:export-referenci {--slozka=services/import-test/reference}';

    protected $description = 'Vyveze referenční koncepty (stěny + otvory + podklad) do JSON pro měření importu';

    public function handle(): int
    {
        $slozka = base_path($this->option('slozka'));
        if (!is_dir($slozka) && !mkdir($slozka, 0777, true) && !is_dir($slozka)) {
            $this->error("Složku $slozka se nepodařilo vytvořit.");
            return self::FAILURE;
        }

        $vyvezeno = 0;
        foreach (KonceptV3::orderBy('id')->get() as $koncept) {
            $data = $this->pole($koncept->data);
            $meta = $this->pole($koncept->metadata);
            $podklad = $meta['podklad'] ?? null;

            // reference = koncept s podkladem a aspoň nějakou kresbou
            if (!$podklad || !($podklad['otisk'] ?? null) || empty($data['steny'])) {
                continue;
            }

            $nazev = $this->nazevSouboru($koncept->nazev ?: ('koncept-' . $koncept->id));
            $cesta = $slozka . '/' . trim($nazev, '-') . '.json';

            file_put_contents($cesta, json_encode([
                'koncept' => $koncept->id,
                'nazev' => $koncept->nazev,
                'steny' => $data['steny'] ?? [],
                'otvory' => $data['otvory'] ?? [],
                'podklad' => $podklad,
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

            $this->line(sprintf('  %-22s %3d stěn · %3d otvorů · %s',
                basename($cesta), count($data['steny'] ?? []), count($data['otvory'] ?? []), $podklad['nazev'] ?? '?'));
            $vyvezeno++;
        }

        $this->info("Vyvezeno $vyvezeno referencí do " . $this->option('slozka'));

        return $vyvezeno ? self::SUCCESS : self::FAILURE;
    }

    /** Název souboru z názvu konceptu — diakritika se přepíše, ne zahodí. */
    private function nazevSouboru(string $nazev): string
    {
        $bezDiakritiky = strtr(mb_strtolower(trim($nazev)), [
            'á' => 'a', 'č' => 'c', 'ď' => 'd', 'é' => 'e', 'ě' => 'e', 'í' => 'i',
            'ň' => 'n', 'ó' => 'o', 'ř' => 'r', 'š' => 's', 'ť' => 't', 'ú' => 'u',
            'ů' => 'u', 'ý' => 'y', 'ž' => 'z',
        ]);

        return trim(preg_replace('~[^a-z0-9]+~', '-', $bezDiakritiky), '-') ?: 'koncept';
    }

    private function pole($hodnota): array
    {
        if (is_array($hodnota)) {
            return $hodnota;
        }

        return is_string($hodnota) ? (json_decode($hodnota, true) ?: []) : [];
    }
}
