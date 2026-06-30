<?php

namespace App\Services;

use App\Models\AiVolani;
use App\Models\RagChunk;
use App\Models\RagKolekce;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Embedding service — Voyage AI (voyage-3).
 * Generuje vektorové embeddings pro RAG semantic search.
 */
class RagEmbedding
{
    private const API_URL = 'https://api.voyageai.com/v1/embeddings';
    private const MODEL = 'voyage-3';
    private const DIMENSIONS = 1024;

    /**
     * voyage-3 cena: $0.06 / 1M input tokens (k 2026-05).
     * Pokud se ceník změní, aktualizovat zde — používá se pro zápis cena_usd
     * do ai_volani (Voyage neúčtuje jinak než per-token).
     */
    private const CENA_USD_PER_MIL_TOKENS = 0.06;

    /**
     * Modul, který volání ohlásil — předává se do ai_volani pro analýzu
     * "kdo Voyage spotřebovává". Defaults to 'rag' aby žádné volání
     * nezůstalo neidentifikované.
     */
    private string $modul = 'rag';

    /** Změna modulu pro tento konkrétní instance (volající ho nastaví). */
    public function setModul(string $modul): self
    {
        $this->modul = $modul;
        return $this;
    }

    private function apiKey(): string
    {
        // config() může být cachovaný — fallback na env()
        return config('services.voyage.key') ?: env('VOYAGE_API_KEY', '');
    }

    /**
     * Vygeneruje embedding pro jeden text.
     */
    public function embed(string $text): array
    {
        return $this->embedBatch([$text])[0] ?? [];
    }

    /**
     * Vygeneruje embeddings pro pole textů (batch, max 128).
     */
    public function embedBatch(array $texts, string $inputType = 'document'): array
    {
        $key = $this->apiKey();
        if (empty($key)) {
            echo "  [WARN] VOYAGE_API_KEY prázdný (config=" . config('services.voyage.key', 'NULL') . ", env=" . (env('VOYAGE_API_KEY') ? 'SET' : 'EMPTY') . ")\n";
            Log::warning('Voyage AI: VOYAGE_API_KEY není nastaven');
            return array_fill(0, count($texts), []);
        }

        // Voyage limit: max 128 textů, max 32K tokenů per text
        $texts = array_map(fn($t) => mb_substr($t, 0, 30000), $texts);
        $chunks = array_chunk($texts, 128);
        $allEmbeddings = [];

        foreach ($chunks as $chunk) {
            $start = microtime(true);
            try {
                $response = Http::timeout(30)->withHeaders([
                    'Authorization' => 'Bearer ' . $key,
                    'Content-Type' => 'application/json',
                ])->post(self::API_URL, [
                    'input' => array_values($chunk),
                    'model' => self::MODEL,
                    'input_type' => $inputType, // 'document' pro indexaci, 'query' pro hledání
                ]);

                $trvaniMs = (int) round((microtime(true) - $start) * 1000);

                if (!$response->successful()) {
                    $err = "Voyage AI HTTP {$response->status()}: " . mb_substr($response->body(), 0, 200);
                    echo "  [VOYAGE ERROR] {$err}\n";
                    Log::warning('Voyage AI chyba', ['status' => $response->status(), 'body' => $response->body()]);
                    $this->logVolani(0, count($chunk), false, $response->status(), $trvaniMs, $inputType);
                    return array_fill(0, count($texts), []);
                }

                $data = $response->json();
                foreach ($data['data'] ?? [] as $item) {
                    $allEmbeddings[] = $item['embedding'];
                }

                // Voyage vrací total_tokens v usage — přesné, neodhadovat
                $tokens = (int) ($data['usage']['total_tokens'] ?? 0);
                $this->logVolani($tokens, count($chunk), true, $response->status(), $trvaniMs, $inputType);
            } catch (\Throwable $e) {
                $trvaniMs = (int) round((microtime(true) - $start) * 1000);
                echo "  [VOYAGE EXCEPTION] {$e->getMessage()}\n";
                Log::error('Voyage AI exception: ' . $e->getMessage());
                $this->logVolani(0, count($chunk), false, null, $trvaniMs, $inputType, $e->getMessage());
                return array_fill(0, count($texts), []);
            }
        }

        return $allEmbeddings;
    }

    /**
     * Zápis volání do ai_volani — pro /masterteam/ai-naklady reporting.
     * Voyage účtuje jen vstupní tokeny, vystupni_tokens=0.
     */
    private function logVolani(int $tokens, int $pocetTextu, bool $uspesne, ?int $httpStatus, int $trvaniMs, string $inputType, ?string $chyba = null): void
    {
        try {
            AiVolani::create([
                'provider' => 'voyage',
                'model' => self::MODEL,
                'modul' => $this->modul,
                'uzivatel_id' => auth()->id(),
                'vstupni_tokens' => $tokens,
                'vystupni_tokens' => 0,
                'cache_read_tokens' => 0,
                'cache_create_tokens' => 0,
                'cena_usd' => $tokens / 1_000_000 * self::CENA_USD_PER_MIL_TOKENS,
                'batch' => false,
                'uspesne' => $uspesne,
                'http_status' => $httpStatus,
                'trvani_ms' => $trvaniMs,
                'poznamka' => $chyba ?? "type={$inputType}, batch={$pocetTextu}",
                'vytvoreno' => now(),
            ]);
        } catch (\Throwable $e) {
            // Logování chyby logování (ironické) nesmí spadit volání
            Log::warning('Voyage logování selhalo: ' . $e->getMessage());
        }
    }

    /**
     * Vygeneruje embedding pro search dotaz (jiný input_type).
     */
    public function embedQuery(string $text): array
    {
        $result = $this->embedBatch([$text], 'query');
        return $result[0] ?? [];
    }

    /**
     * Vygeneruje embeddings pro všechny chunky kolekce.
     */
    public function embedujKolekci(RagKolekce $kolekce): int
    {
        $chunky = RagChunk::where('kolekce_id', $kolekce->id)
            ->whereNull('embedding')
            ->orderBy('poradi')
            ->get();

        if ($chunky->isEmpty()) return 0;

        $zpracovano = 0;

        // Batch po 32 chuncích
        foreach ($chunky->chunk(32) as $batch) {
            $texty = $batch->pluck('obsah')->toArray();
            $embeddings = $this->embedBatch($texty, 'document');

            foreach ($batch->values() as $i => $chunk) {
                if (!empty($embeddings[$i])) {
                    $chunk->update(['embedding' => $embeddings[$i]]);
                    $zpracovano++;
                }
            }
        }

        Log::info("Voyage AI: embedováno {$zpracovano} chunků kolekce {$kolekce->id}");
        return $zpracovano;
    }

    /**
     * Je embedding service dostupný?
     */
    public function jeDostupny(): bool
    {
        return !empty($this->apiKey());
    }
}
