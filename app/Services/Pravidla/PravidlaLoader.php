<?php

namespace App\Services\Pravidla;

use Illuminate\Support\Collection;

class PravidlaLoader
{
    private string $basePath;
    private ?Collection $cache = null;

    public function __construct()
    {
        $this->basePath = resource_path('pravidla');
    }

    /**
     * Načte všechna pravidla z resources/pravidla/ a vrátí kolekci.
     */
    public function nactiVsechna(): Collection
    {
        if ($this->cache !== null) {
            return $this->cache;
        }

        $soubory = $this->najdiSoubory($this->basePath);
        $pravidla = collect();

        foreach ($soubory as $soubor) {
            $parsed = $this->parsujSoubor($soubor);
            if ($parsed) {
                $pravidla->put($parsed['id'], $parsed);
            }
        }

        $this->cache = $pravidla;
        return $pravidla;
    }

    /**
     * Načte jedno pravidlo podle ID.
     */
    public function nacti(string $id): ?array
    {
        return $this->nactiVsechna()->get($id);
    }

    /**
     * Načte vybraná pravidla podle ID.
     */
    public function nactiVybrana(array $ids): Collection
    {
        $vsechna = $this->nactiVsechna();
        return collect($ids)
            ->map(fn($id) => $vsechna->get($id))
            ->filter()
            ->sortBy('priorita');
    }

    /**
     * Vrátí obsah (tělo bez front matter) jednoho pravidla.
     */
    public function obsah(string $id): string
    {
        $pravidlo = $this->nacti($id);
        return $pravidlo['obsah'] ?? '';
    }

    /**
     * Rekurzivně najde všechny .md soubory.
     */
    private function najdiSoubory(string $dir): array
    {
        if (!is_dir($dir)) {
            return [];
        }

        $soubory = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'md') {
                $soubory[] = $file->getPathname();
            }
        }

        return $soubory;
    }

    /**
     * Parsuje MD soubor s YAML front matter.
     */
    private function parsujSoubor(string $cesta): ?array
    {
        $obsah = file_get_contents($cesta);
        if (!$obsah) return null;

        // Parsovat YAML front matter
        $frontMatter = [];
        $telo = $obsah;

        if (preg_match('/\A---\s*\n(.*?)\n---\s*\n(.*)\z/s', $obsah, $m)) {
            $frontMatter = $this->parsujYaml($m[1]);
            $telo = trim($m[2]);
        }

        // Relativní cesta pro fallback ID
        $relativni = str_replace([$this->basePath . '/', $this->basePath . '\\'], '', $cesta);
        $relativni = str_replace('\\', '/', $relativni);
        $fallbackId = str_replace('.md', '', $relativni);
        // Pro soubory začínající _ (jako _zaklad.md) → id bez podtržítka v cestě
        $fallbackId = ltrim($fallbackId, '_');

        $id = $frontMatter['id'] ?? $fallbackId;

        return [
            'id' => $id,
            'nazev' => $frontMatter['nazev'] ?? $id,
            'tagy' => $frontMatter['tagy'] ?? [],
            'priorita' => (int) ($frontMatter['priorita'] ?? 50),
            'max_tokeny' => (int) ($frontMatter['max_tokeny'] ?? 500),
            'zavislosti' => $frontMatter['zavislosti'] ?? [],
            'obsah' => $telo,
            'cesta' => $relativni,
        ];
    }

    /**
     * Jednoduchý YAML parser pro front matter (bez závislosti na ext-yaml).
     */
    private function parsujYaml(string $yaml): array
    {
        $result = [];
        foreach (explode("\n", $yaml) as $line) {
            $line = trim($line);
            if (!$line || str_starts_with($line, '#')) continue;

            if (preg_match('/^(\w+):\s*(.*)$/', $line, $m)) {
                $key = $m[1];
                $value = trim($m[2]);

                // Array hodnota [a, b, c]
                if (preg_match('/^\[(.*)\]$/', $value, $am)) {
                    $items = array_map(fn($v) => trim(trim($v), '"\''), explode(',', $am[1]));
                    $result[$key] = array_filter($items, fn($v) => $v !== '');
                }
                // String v uvozovkách
                elseif (preg_match('/^"(.*)"$/', $value, $sm)) {
                    $result[$key] = $sm[1];
                }
                // Číslo
                elseif (is_numeric($value)) {
                    $result[$key] = $value + 0;
                }
                // Boolean
                elseif (in_array(strtolower($value), ['true', 'false'])) {
                    $result[$key] = strtolower($value) === 'true';
                }
                // Plain string
                else {
                    $result[$key] = $value;
                }
            }
        }
        return $result;
    }
}
