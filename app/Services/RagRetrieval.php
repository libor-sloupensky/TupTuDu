<?php

namespace App\Services;

use App\Models\RagChunk;
use App\Models\RagKolekce;
use Illuminate\Support\Collection;

class RagRetrieval
{
    private RagEmbedding $embedding;

    public function __construct()
    {
        $this->embedding = (new RagEmbedding())->setModul('rag_query');
    }

    /** Volající (PoradceService, …) může nastavit jemnější modul pro reporting. */
    public function setModul(string $modul): self
    {
        $this->embedding->setModul($modul);
        return $this;
    }

    /**
     * Najde nejrelevantnější chunky pro daný dotaz.
     * Automaticky přitáhne sousední chunky pro kontext.
     *
     * @param string $dotaz Uživatelský dotaz
     * @param int $pocet Kolik hlavních chunků vrátit (top N)
     * @param array $filtry Volitelné filtry: ['typ' => 'norma', 'kolekce_id' => 5]
     * @return Collection Seřazené chunky s cosine similarity
     */
    public function hledej(string $dotaz, int $pocet = 5, array $filtry = []): Collection
    {
        // Jsou v DB vůbec nějaké embeddingy? Pokud ne, rovnou keyword search
        $maEmbeddingy = RagChunk::whereNotNull('embedding')->exists();

        if ($maEmbeddingy) {
            try {
                $dotazEmbedding = $this->embedding->embedQuery($dotaz);
            } catch (\Throwable $e) {
                $dotazEmbedding = [];
            }
        } else {
            $dotazEmbedding = [];
        }

        // Pokud embeddings fungují — cosine similarity
        if (!empty($dotazEmbedding)) {
            $query = RagChunk::whereNotNull('embedding')->with('kolekce');

            if (!empty($filtry['kolekce_id'])) {
                $query->where('kolekce_id', $filtry['kolekce_id']);
            }
            if (!empty($filtry['typ'])) {
                $query->whereHas('kolekce', fn ($q) => $q->where('typ', $filtry['typ']));
            }

            $chunky = $query->get();

            $vysledky = $chunky->map(function ($chunk) use ($dotazEmbedding) {
                $similarity = $this->cosineSimilarity($dotazEmbedding, $chunk->embedding);
                $autorita = $chunk->kolekce?->autorita ?? 3;
                $chunk->similarity = round($similarity * (0.7 + $autorita * 0.1), 4);
                return $chunk;
            });

            return $vysledky->sortByDesc('similarity')->take($pocet)->values();
        }

        // Fallback: keyword search (bez embeddingů)
        $vysledky = $this->keywordSearch($dotaz, $pocet, $filtry);

        // Na localhostu fallback na vzdálený RAG pokud lokálně nic
        if ($vysledky->isEmpty() && config('app.env') === 'local') {
            $vysledky = $this->remoteSearch($dotaz, $pocet);
        }

        return $vysledky;
    }

    /**
     * Sestaví kontext pro AI prompt z relevantních chunků.
     * Pro každý nalezený chunk přitáhne i sousední (#-1, #+1) pro úplnější kontext.
     */
    public function sestavKontext(string $dotaz, int $pocet = 5, array $filtry = []): string
    {
        $chunky = $this->hledej($dotaz, $pocet, $filtry);

        if ($chunky->isEmpty()) {
            return '';
        }

        // Přitáhnout sousední chunky pro každý nalezený
        $rozsireneChunky = $this->rozsirOSousedni($chunky);

        $kontext = "=== ZNALOSTNÍ BÁZE ===\n";
        $kontext .= "Následující informace pocházejí z ověřených zdrojů.\n";
        $kontext .= "DŮLEŽITÉ: Parafrázuj obsah vlastními slovy, nikdy necituj doslovně (výjimka: zákony a vyhlášky).\n\n";

        foreach ($rozsireneChunky as $skupina) {
            $zdroj = $skupina['kolekce'] ?? 'Neznámý zdroj';
            $typ = $skupina['typ'] ?? '';
            $role = $skupina['role'] ?? '';
            $rozsah = $skupina['rozsah'] ?? '';
            $kontext .= "--- [{$zdroj}] ({$typ}" . ($role ? ", {$role}" : '') . ") ---\n";
            if ($rozsah) {
                $kontext .= "ROZSAH PLATNOSTI: {$rozsah}\n";
            }
            $kontext .= $skupina['text'] . "\n\n";
        }

        return $kontext;
    }

    /**
     * Pro nalezené chunky přitáhne sousední (předchozí + následující) ze stejné kolekce.
     * Výsledek seskupí — pokud se sousedé překrývají, spojí je.
     */
    private function rozsirOSousedni(Collection $chunky): array
    {
        // Sbírat všechny potřebné chunk ID (hlavní + sousedé)
        $skupiny = [];
        $pouziteId = [];

        foreach ($chunky as $chunk) {
            $kolekceId = $chunk->kolekce_id;
            $poradi = $chunk->poradi;

            // Přeskočit pokud už byl tento chunk zahrnut jako soused jiného
            if (isset($pouziteId[$chunk->id])) {
                continue;
            }

            // Načíst sousedy (předchozí a následující)
            $sousedni = RagChunk::where('kolekce_id', $kolekceId)
                ->whereBetween('poradi', [$poradi - 1, $poradi + 1])
                ->orderBy('poradi')
                ->get();

            // Spojit texty sousedů v pořadí
            $texty = [];
            foreach ($sousedni as $s) {
                $pouziteId[$s->id] = true;
                $texty[] = $s->obsah;
            }

            $skupiny[] = [
                'kolekce' => $chunk->kolekce?->nazev,
                'typ' => $chunk->kolekce?->typ,
                'role' => $chunk->kolekce?->role,
                'rozsah' => $chunk->kolekce?->rozsah_platnosti,
                'text' => implode("\n\n", $texty),
                'similarity' => $chunk->similarity,
            ];
        }

        return $skupiny;
    }

    /**
     * Keyword search — fallback pokud embeddings nejsou dostupné.
     * Hledá klíčová slova z dotazu v obsahu chunků.
     */
    private function keywordSearch(string $dotaz, int $pocet, array $filtry): Collection
    {
        // Rozdělit dotaz na slova, odfiltrovat české stop words
        $slova = TextTokenizer::tokenizuj($dotaz);

        if (empty($slova)) {
            return collect();
        }

        $query = RagChunk::with('kolekce');

        if (!empty($filtry['kolekce_id'])) {
            $query->where('kolekce_id', $filtry['kolekce_id']);
        }
        if (!empty($filtry['typ'])) {
            $query->whereHas('kolekce', fn ($q) => $q->where('typ', $filtry['typ']));
        }

        // Fuzzy varianty — přesné slovo + ořezaný kmen
        $vsechnyTermy = [];
        foreach ($slova as $slovo) {
            foreach (TextTokenizer::fuzzyVarianty($slovo) as $v) {
                $vsechnyTermy[] = $v;
            }
        }
        $vsechnyTermy = array_unique($vsechnyTermy);

        // WHERE obsah LIKE '%term1%' OR obsah LIKE '%term2%'
        $query->where(function ($q) use ($vsechnyTermy) {
            foreach ($vsechnyTermy as $term) {
                $q->orWhere('obsah', 'LIKE', '%' . $term . '%');
            }
        });

        $chunky = $query->get();

        // Skórovat — přesný match má vyšší váhu než fuzzy
        $vysledky = $chunky->map(function ($chunk) use ($slova) {
            $obsah = mb_strtolower($chunk->obsah);
            $skore = 0;
            foreach ($slova as $slovo) {
                // Přesný match: plná váha
                $skore += mb_substr_count($obsah, $slovo) * 2;
                // Fuzzy match (ořezaný kmen): nižší váha
                foreach (TextTokenizer::fuzzyVarianty($slovo) as $v) {
                    if ($v !== $slovo) $skore += mb_substr_count($obsah, $v);
                }
            }
            $autorita = $chunk->kolekce?->autorita ?? 3;
            $chunk->similarity = round($skore * (0.7 + $autorita * 0.1), 4);
            return $chunk;
        });

        return $vysledky->sortByDesc('similarity')->take($pocet)->values();
    }

    /**
     * Vzdálený RAG search — pro lokální vývoj.
     */
    private function remoteSearch(string $dotaz, int $pocet): Collection
    {
        try {
            $resp = \Illuminate\Support\Facades\Http::timeout(15)->get('https://kalkulio.cz/api/rag/search', [
                'token' => config('services.cron_token'),
                'q' => $dotaz,
                'limit' => $pocet,
            ]);

            if (!$resp->successful() || !$resp->json('ok')) return collect();

            // Vytvořit fake RagChunk objekty z vzdálených dat
            return collect($resp->json('chunky', []))->map(function ($c) {
                $chunk = new RagChunk();
                $chunk->id = $c['id'];
                $chunk->kolekce_id = $c['kolekce_id'];
                $chunk->obsah = $c['obsah'];
                $chunk->sekce = $c['sekce'] ?? null;
                $chunk->similarity = 1;
                return $chunk;
            });
        } catch (\Throwable $e) {
            return collect();
        }
    }

    /**
     * Cosine similarity dvou vektorů.
     */
    private function cosineSimilarity(array $a, array $b): float
    {
        if (count($a) !== count($b) || empty($a)) {
            return 0.0;
        }

        $dot = 0.0;
        $normA = 0.0;
        $normB = 0.0;

        for ($i = 0, $n = count($a); $i < $n; $i++) {
            $dot += $a[$i] * $b[$i];
            $normA += $a[$i] * $a[$i];
            $normB += $b[$i] * $b[$i];
        }

        $normA = sqrt($normA);
        $normB = sqrt($normB);

        if ($normA == 0 || $normB == 0) {
            return 0.0;
        }

        return $dot / ($normA * $normB);
    }
}
