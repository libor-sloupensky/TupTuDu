<?php

namespace App\Services;

use App\Models\AiVolani;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Centrální klient pro Anthropic Claude API.
 * Každé volání se loguje do tabulky `ai_volani` (model, tokens, cena, modul, uživatel).
 *
 * Použití:
 *   $api = app(ClaudeApi::class);
 *   $text = $api->message(
 *       model: 'claude-haiku-4-5',
 *       system: 'Jsi …',
 *       user: 'Otázka …',
 *       maxTokens: 2048,
 *       modul: 'tezba_prospekty',
 *       poznamka: 'ICO 12345678',
 *   );
 */
class ClaudeApi
{
    /**
     * AKTUÁLNÍ MODELY Anthropic Claude API.
     *
     * Jediné místo v projektu, kde se modely deklarují. Všechny servisy/controllery
     * mají používat `ClaudeApi::MODEL_HAIKU` / `MODEL_SONNET` / `MODEL_OPUS` místo
     * hard-coded stringu. Když Anthropic deprecnuje verzi, stačí update zde
     * (nebo override v .env přes ANTHROPIC_MODEL_*).
     *
     * Historie změn:
     * - 2026-06-18: Sonnet 4 (claude-sonnet-4-20250514) → 4.6
     * - 2026-06-18: Opus 4 (claude-opus-4-20250514) → 4.8
     */
    public const MODEL_HAIKU  = 'claude-haiku-4-5';
    public const MODEL_SONNET = 'claude-sonnet-4-6';
    public const MODEL_OPUS   = 'claude-opus-4-8';

    /** Vrátí aktuální Haiku (override přes ANTHROPIC_MODEL_HAIKU v .env). */
    public static function modelHaiku(): string
    {
        return config('services.anthropic.model_haiku') ?: self::MODEL_HAIKU;
    }
    public static function modelSonnet(): string
    {
        return config('services.anthropic.model_sonnet') ?: self::MODEL_SONNET;
    }
    public static function modelOpus(): string
    {
        return config('services.anthropic.model_opus') ?: self::MODEL_OPUS;
    }

    /**
     * Ceny v USD za 1M tokenů. Output je 5× input. Batch API = 50 % sleva.
     * Aktualizovat při změně Anthropic price listu.
     */
    private const CENY = [
        // Haiku
        'claude-haiku-3-5'              => ['input' => 0.80, 'output' => 4.00],
        'claude-3-5-haiku-20241022'     => ['input' => 0.80, 'output' => 4.00],
        'claude-haiku-4-5'              => ['input' => 1.00, 'output' => 5.00],
        'claude-haiku-4-5-20251001'     => ['input' => 1.00, 'output' => 5.00],
        // Sonnet — claude-sonnet-4-20250514 deprecated 2026-06-18, používáme 4-6
        'claude-sonnet-4'               => ['input' => 3.00, 'output' => 15.00],
        'claude-sonnet-4-20250514'      => ['input' => 3.00, 'output' => 15.00], // legacy log
        'claude-sonnet-4-6'             => ['input' => 3.00, 'output' => 15.00],
        // Opus — claude-opus-4-20250514 deprecated, používáme 4-8
        'claude-opus-4-20250514'        => ['input' => 15.00, 'output' => 75.00], // legacy log
        'claude-opus-4-7'               => ['input' => 15.00, 'output' => 75.00],
        'claude-opus-4-8'               => ['input' => 15.00, 'output' => 75.00],
    ];

    private string $apiKey;

    public function __construct()
    {
        $this->apiKey = (string) config('services.anthropic.key');
    }

    /**
     * Pošle messages request a uloží log volání. Vrací text odpovědi nebo null.
     * Při fatální chybě (kredit, auth, rate limit) hodí RuntimeException.
     */
    public function message(
        string $model,
        string $system,
        string $user,
        int $maxTokens = 2048,
        string $modul = 'unknown',
        ?int $uzivatelId = null,
        ?string $poznamka = null,
        int $timeout = 60,
    ): ?string {
        if ($uzivatelId === null && Auth::check()) {
            $uzivatelId = Auth::id();
        }

        $start = microtime(true);

        try {
            $response = Http::timeout($timeout)->withHeaders([
                'x-api-key' => $this->apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'max_tokens' => $maxTokens,
                'system' => $system,
                'messages' => [['role' => 'user', 'content' => $user]],
            ]);
        } catch (\Throwable $e) {
            $this->log($model, $modul, $uzivatelId, 0, 0, 0, 0, false, false, null,
                (int)((microtime(true) - $start) * 1000), $poznamka);
            throw $e;
        }

        $duration = (int) ((microtime(true) - $start) * 1000);
        $status = $response->status();

        if (!$response->successful()) {
            $this->log($model, $modul, $uzivatelId, 0, 0, 0, 0, false, false, $status, $duration, $poznamka);

            // Fatální chyby (kredit, auth, rate) → throw, ostatní vrátí null
            if (in_array($status, [400, 401, 403, 429, 529])) {
                $body = Str::limit($response->body(), 200);
                throw new \RuntimeException("Claude API fatální chyba ({$status}): {$body}");
            }
            return null;
        }

        $data = $response->json();
        $usage = $data['usage'] ?? [];
        $inputTokens = (int) ($usage['input_tokens'] ?? 0);
        $outputTokens = (int) ($usage['output_tokens'] ?? 0);
        $cacheRead = (int) ($usage['cache_read_input_tokens'] ?? 0);
        $cacheCreate = (int) ($usage['cache_creation_input_tokens'] ?? 0);

        $cena = $this->vypoctiCenu($model, $inputTokens, $outputTokens, $cacheRead, $cacheCreate, false);

        $this->log($model, $modul, $uzivatelId, $inputTokens, $outputTokens, $cacheRead, $cacheCreate,
            true, false, $status, $duration, $poznamka, $cena);

        return $data['content'][0]['text'] ?? null;
    }

    /**
     * Verze pro multi-message conversation (history). Stejné API jako message().
     *
     * @param array $messages Pole [['role' => 'user'|'assistant', 'content' => '...'], ...]
     */
    public function messages(
        string $model,
        string $system,
        array $messages,
        int $maxTokens = 2048,
        string $modul = 'unknown',
        ?int $uzivatelId = null,
        ?string $poznamka = null,
        int $timeout = 60,
    ): ?string {
        if ($uzivatelId === null && Auth::check()) {
            $uzivatelId = Auth::id();
        }

        $start = microtime(true);

        try {
            $response = Http::timeout($timeout)->withHeaders([
                'x-api-key' => $this->apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'max_tokens' => $maxTokens,
                'system' => $system,
                'messages' => $messages,
            ]);
        } catch (\Throwable $e) {
            $this->log($model, $modul, $uzivatelId, 0, 0, 0, 0, false, false, null,
                (int)((microtime(true) - $start) * 1000), $poznamka);
            throw $e;
        }

        $duration = (int) ((microtime(true) - $start) * 1000);
        $status = $response->status();

        if (!$response->successful()) {
            $this->log($model, $modul, $uzivatelId, 0, 0, 0, 0, false, false, $status, $duration, $poznamka);
            if (in_array($status, [400, 401, 403, 429, 529])) {
                throw new \RuntimeException("Claude API ({$status}): " . Str::limit($response->body(), 200));
            }
            return null;
        }

        $data = $response->json();
        $usage = $data['usage'] ?? [];
        $cena = $this->vypoctiCenu($model,
            (int)($usage['input_tokens'] ?? 0),
            (int)($usage['output_tokens'] ?? 0),
            (int)($usage['cache_read_input_tokens'] ?? 0),
            (int)($usage['cache_creation_input_tokens'] ?? 0),
            false);

        $this->log($model, $modul, $uzivatelId,
            (int)($usage['input_tokens'] ?? 0),
            (int)($usage['output_tokens'] ?? 0),
            (int)($usage['cache_read_input_tokens'] ?? 0),
            (int)($usage['cache_creation_input_tokens'] ?? 0),
            true, false, $status, $duration, $poznamka, $cena);

        return $data['content'][0]['text'] ?? null;
    }

    /**
     * Volá Claude s tool_use (structured output) — Claude je vynucena vyplnit
     * strukturovaný objekt podle daného JSON Schema. Vrací rozparsovaný
     * objekt z `tool_use.input`, nebo null při chybě.
     *
     * Použití:
     *   $schema = [
     *       'name' => 'vrat_data',
     *       'description' => '...',
     *       'input_schema' => [
     *           'type' => 'object',
     *           'properties' => [...],
     *           'required' => [...],
     *       ],
     *   ];
     *   $vystup = $api->messagesWithTool(model: '...', system: '...', messages: [...], tool: $schema);
     *   // $vystup je array s vyplněnými poli podle schématu
     *
     * Garantuje, že Claude vrátí přesně tato pole (žádný regex parsing, žádné
     * fallbacky na špatný JSON).
     */
    public function messagesWithTool(
        string $model,
        string $system,
        array $messages,
        array $tool,
        int $maxTokens = 2048,
        string $modul = 'unknown',
        ?int $uzivatelId = null,
        ?string $poznamka = null,
        int $timeout = 60,
    ): ?array {
        if ($uzivatelId === null && Auth::check()) {
            $uzivatelId = Auth::id();
        }

        $start = microtime(true);

        try {
            $response = Http::timeout($timeout)->withHeaders([
                'x-api-key' => $this->apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'max_tokens' => $maxTokens,
                'system' => $system,
                'messages' => $messages,
                'tools' => [$tool],
                'tool_choice' => ['type' => 'tool', 'name' => $tool['name']],
            ]);
        } catch (\Throwable $e) {
            $this->log($model, $modul, $uzivatelId, 0, 0, 0, 0, false, false, null,
                (int)((microtime(true) - $start) * 1000), $poznamka);
            throw $e;
        }

        $duration = (int) ((microtime(true) - $start) * 1000);
        $status = $response->status();

        if (!$response->successful()) {
            $this->log($model, $modul, $uzivatelId, 0, 0, 0, 0, false, false, $status, $duration, $poznamka);
            if (in_array($status, [400, 401, 403, 429, 529])) {
                throw new \RuntimeException("Claude API ({$status}): " . Str::limit($response->body(), 200));
            }
            return null;
        }

        $data = $response->json();
        $usage = $data['usage'] ?? [];
        $cena = $this->vypoctiCenu($model,
            (int)($usage['input_tokens'] ?? 0),
            (int)($usage['output_tokens'] ?? 0),
            (int)($usage['cache_read_input_tokens'] ?? 0),
            (int)($usage['cache_creation_input_tokens'] ?? 0),
            false);

        $this->log($model, $modul, $uzivatelId,
            (int)($usage['input_tokens'] ?? 0),
            (int)($usage['output_tokens'] ?? 0),
            (int)($usage['cache_read_input_tokens'] ?? 0),
            (int)($usage['cache_creation_input_tokens'] ?? 0),
            true, false, $status, $duration, $poznamka, $cena);

        // Najít tool_use blok v response.content (Claude může před tím poslat
        // i krátký "thinking" text blok, ale tool_choice ho vynutí).
        foreach (($data['content'] ?? []) as $block) {
            if (($block['type'] ?? '') === 'tool_use' && isset($block['input'])) {
                return is_array($block['input']) ? $block['input'] : null;
            }
        }

        return null;
    }

    /**
     * Streaming přes cURL (Laravel Http nepodporuje SSE čtení).
     * Zachytává usage z message_start / message_delta SSE eventů a po dokončení loguje.
     *
     * @param callable $onChunk fn(string $text): void — callback pro každý textový fragment
     */
    public function stream(
        string $model,
        string $system,
        array $messages,
        int $maxTokens,
        string $modul,
        callable $onChunk,
        ?int $uzivatelId = null,
        ?string $poznamka = null,
        int $timeout = 120,
    ): void {
        if ($uzivatelId === null && Auth::check()) {
            $uzivatelId = Auth::id();
        }

        $start = microtime(true);
        $inputTokens = 0;
        $outputTokens = 0;
        $cacheRead = 0;
        $cacheCreate = 0;
        $sseBuffer = '';

        $ch = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'x-api-key: ' . $this->apiKey,
                'anthropic-version: 2023-06-01',
                'content-type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'model' => $model,
                'max_tokens' => $maxTokens,
                'system' => $system,
                'messages' => $messages,
                'stream' => true,
            ]),
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
        ]);

        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data)
            use (&$sseBuffer, $onChunk, &$inputTokens, &$outputTokens, &$cacheRead, &$cacheCreate) {
            $sseBuffer .= $data;

            while (($pos = strpos($sseBuffer, "\n")) !== false) {
                $line = trim(substr($sseBuffer, 0, $pos));
                $sseBuffer = substr($sseBuffer, $pos + 1);

                if (!str_starts_with($line, 'data: ')) continue;
                $json = substr($line, 6);
                if ($json === '[DONE]') continue;

                $event = json_decode($json, true);
                if (!$event) continue;
                $type = $event['type'] ?? '';

                if ($type === 'content_block_delta') {
                    $text = $event['delta']['text'] ?? '';
                    if ($text !== '') $onChunk($text);
                } elseif ($type === 'message_start') {
                    $usage = $event['message']['usage'] ?? [];
                    $inputTokens = (int)($usage['input_tokens'] ?? 0);
                    $cacheRead = (int)($usage['cache_read_input_tokens'] ?? 0);
                    $cacheCreate = (int)($usage['cache_creation_input_tokens'] ?? 0);
                } elseif ($type === 'message_delta') {
                    // output_tokens je cumulative, přepíšeme
                    $usage = $event['usage'] ?? [];
                    if (isset($usage['output_tokens'])) {
                        $outputTokens = (int)$usage['output_tokens'];
                    }
                }
            }

            return strlen($data);
        });

        $ok = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $duration = (int) ((microtime(true) - $start) * 1000);
        $uspesne = $ok && $httpCode === 200;

        $cena = $uspesne
            ? $this->vypoctiCenu($model, $inputTokens, $outputTokens, $cacheRead, $cacheCreate, false)
            : 0.0;

        $this->log($model, $modul, $uzivatelId, $inputTokens, $outputTokens,
            $cacheRead, $cacheCreate, $uspesne, false, $httpCode, $duration, $poznamka, $cena);

        if (!$uspesne) {
            $onChunk("\n\n[Chyba AI ({$httpCode})]");
        }
    }

    /**
     * Zaloguje výsledek batch requestu (volá se z TezbaAiBatch::zpracujVysledky pro každý
     * succeeded/errored item). Batch má 50 % slevu.
     */
    public function logBatchItem(
        string $model,
        string $modul,
        bool $uspesne,
        int $inputTokens,
        int $outputTokens,
        ?string $poznamka = null,
        int $cacheRead = 0,
        int $cacheCreate = 0,
    ): void {
        $cena = $uspesne
            ? $this->vypoctiCenu($model, $inputTokens, $outputTokens, $cacheRead, $cacheCreate, true)
            : 0.0;

        $this->log($model, $modul, null, $inputTokens, $outputTokens, $cacheRead, $cacheCreate,
            $uspesne, true, $uspesne ? 200 : null, 0, $poznamka, $cena);
    }

    private function vypoctiCenu(
        string $model,
        int $input,
        int $output,
        int $cacheRead,
        int $cacheCreate,
        bool $batch,
    ): float {
        $ceny = self::CENY[$model] ?? ['input' => 1.0, 'output' => 5.0];
        $sleva = $batch ? 0.5 : 1.0;

        // Cache čtení = 10 % input ceny, cache vytvoření = 125 % input ceny.
        $vstup = $input / 1_000_000 * $ceny['input'];
        $vystup = $output / 1_000_000 * $ceny['output'];
        $cR = $cacheRead / 1_000_000 * $ceny['input'] * 0.10;
        $cC = $cacheCreate / 1_000_000 * $ceny['input'] * 1.25;

        return round(($vstup + $vystup + $cR + $cC) * $sleva, 6);
    }

    private function log(
        string $model, string $modul, ?int $uzivatelId,
        int $inputTokens, int $outputTokens, int $cacheRead, int $cacheCreate,
        bool $uspesne, bool $batch, ?int $httpStatus, int $trvaniMs, ?string $poznamka, float $cena = 0.0,
    ): void {
        try {
            AiVolani::create([
                'model' => $model,
                'modul' => $modul,
                'uzivatel_id' => $uzivatelId,
                'vstupni_tokens' => $inputTokens,
                'vystupni_tokens' => $outputTokens,
                'cache_read_tokens' => $cacheRead,
                'cache_create_tokens' => $cacheCreate,
                'cena_usd' => $cena,
                'batch' => $batch,
                'uspesne' => $uspesne,
                'http_status' => $httpStatus,
                'trvani_ms' => $trvaniMs,
                'poznamka' => $poznamka ? Str::limit($poznamka, 250) : null,
                'vytvoreno' => now(),
            ]);
        } catch (\Throwable $e) {
            // Logging selhal — nesmí to shodit hlavní volání
            Log::warning('AiVolani log selhal: ' . $e->getMessage());
        }
    }
}
