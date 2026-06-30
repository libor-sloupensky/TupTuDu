<?php

namespace App\Services;

use App\Models\Koncept;
use App\Services\ClaudeApi;
use App\Services\Pravidla\PravidlaService;
use App\Services\RagEmbedding;

class KonceptAiService
{
    private string $apiKey;
    private string $model;
    private int $maxTokens;
    private PravidlaService $pravidla;

    public function __construct(PravidlaService $pravidla)
    {
        $this->apiKey = config('services.anthropic.key') ?? '';
        $this->model = config('services.anthropic.model') ?? 'claude-sonnet-4-6';
        $this->maxTokens = 4096;
        $this->pravidla = $pravidla;
    }

    /**
     * Vytvoří nový koncept z textového popisu.
     */
    public function vytvorKoncept(string $popis, ?Koncept $koncept = null, ?array $katastr = null, array $chatHistorie = []): array
    {
        if (empty($chatHistorie)) {
            $chatHistorie = $koncept?->chat ?? [];
        }
        $konceptData = $koncept?->data;
        return $this->zavolejApi($konceptData, null, $popis, $chatHistorie, $koncept, $katastr);
    }

    /**
     * Upraví existující koncept dle požadavku.
     */
    public function setModel(string $model): void
    {
        $this->model = $model;
    }

    public function upravKoncept(array $aktualniData, ?string $oznacenyPrvekId, string $pozadavek, array $chatHistorie = [], ?Koncept $koncept = null, ?array $katastr = null, ?array $zvyrazneni = null): array
    {
        return $this->zavolejApi($aktualniData, $oznacenyPrvekId, $pozadavek, $chatHistorie, $koncept, $katastr, $zvyrazneni);
    }

    private function zavolejApi(?array $konceptData, ?string $prvekId, string $pozadavek, array $chatHistorie = [], ?Koncept $koncept = null, ?array $katastr = null, ?array $zvyrazneni = null): array
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('ANTHROPIC_API_KEY není nastaven. Přidejte ho do .env souboru.');
        }

        // Sestavit systémový prompt z knihoven pravidel
        $systemPrompt = $this->pravidla->sestavSystemPrompt($koncept);

        // Načíst relevantní pravidla objektů z DB (semantic search)
        // Hledat v celém kontextu chatu, ne jen v posledním požadavku
        $kontextProHledani = $pozadavek;
        if (!empty($chatHistorie)) {
            $kontextProHledani = collect($chatHistorie)
                ->pluck('text')
                ->join(' ') . ' ' . $pozadavek;
        }
        $pravidlaObjektu = $this->nactiPravidlaObjektu($kontextProHledani);
        if ($pravidlaObjektu) {
            $systemPrompt .= "\n\n---\n\n" . $pravidlaObjektu;
        }

        // Sestavit zprávy — kontext chatu + aktuální požadavek
        $messages = [];

        // Přidat posledních N zpráv z chatu jako kontext
        $recentChat = array_slice($chatHistorie, -10);
        foreach ($recentChat as $msg) {
            $role = ($msg['role'] ?? '') === 'user' ? 'user' : 'assistant';
            $text = $msg['text'] ?? '';
            if ($text) {
                $messages[] = ['role' => $role, 'content' => $text];
            }
        }

        // Zajistit střídání rolí (Claude API požadavek)
        $messages = $this->zajistiStridaniRoli($messages);

        // Aktuální požadavek
        $userMessage = "Požadavek: {$pozadavek}";

        if ($konceptData) {
            $userMessage .= "\n\nAktuální JSON konceptu:\n" . json_encode($konceptData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

            // Předpočítat délky stěn — AI nemusí počítat
            if (!empty($konceptData['steny'])) {
                $userMessage .= "\n\nPředpočítané délky stěn:";
                foreach ($konceptData['steny'] as $stena) {
                    $dx = ($stena['do'][0] ?? 0) - ($stena['od'][0] ?? 0);
                    $dy = ($stena['do'][1] ?? 0) - ($stena['od'][1] ?? 0);
                    $delka = round(sqrt($dx * $dx + $dy * $dy), 3);
                    $userMessage .= "\n  {$stena['id']}: {$delka}m";
                }
            }
        } else {
            $userMessage .= "\n\nAktuální koncept: žádný (vytvoř nový)";
        }

        if ($prvekId) {
            $userMessage .= "\n\nOznačený prvek: {$prvekId}";
        }

        // Katastrální kontext — parcely, hranice, rozměry, výškový profil
        if (!empty($katastr) && !empty($katastr['parcely'])) {
            $userMessage .= "\n\nKatastrální parcely (pozemek uživatele, souřadnice polygon_m jsou v METRECH ve STEJNÉM souřadném systému jako 'od' a 'do' u stěn — můžeš je přímo použít jako souřadnice stěn):";
            foreach ($katastr['parcely'] as $p) {
                $label = $p['label'] ?? '?';
                $ku = $p['ku'] ?? '';
                $druh = $p['druh'] ?? $p['druh_pozemku_cz'] ?? '';
                $userMessage .= "\n  Parcela {$label}";
                if ($ku) $userMessage .= " (k.ú. {$ku})";
                if ($druh) $userMessage .= " — {$druh}";
                // Rozměry
                if (!empty($p['plocha_m2'])) $userMessage .= ", plocha: {$p['plocha_m2']} m²";
                if (!empty($p['sirka_m']) && !empty($p['delka_m'])) $userMessage .= ", rozměry: {$p['sirka_m']} × {$p['delka_m']} m";
                if (!empty($p['obvod_m'])) $userMessage .= ", obvod: {$p['obvod_m']} m";
                // Polygon v metrech (relativní souřadnice)
                if (!empty($p['polygon_m']) && is_array($p['polygon_m'])) {
                    $body = array_map(fn($b) => '[' . ($b[0] ?? 0) . ', ' . ($b[1] ?? 0) . ']', $p['polygon_m']);
                    $userMessage .= "\n    Hranice (polygon v metrech): " . implode(' → ', $body);
                }
                // Starý formát kompatibilita
                if (!empty($p['hranice']) && is_array($p['hranice'])) {
                    $body = array_map(fn($b) => '[' . ($b[0] ?? 0) . ', ' . ($b[1] ?? 0) . ']', $p['hranice']);
                    $userMessage .= "\n    Hranice (polygon): " . implode(' → ', $body);
                }
            }
            // Výškový profil
            if (!empty($katastr['vyskovy_profil'])) {
                $vp = $katastr['vyskovy_profil'];
                $userMessage .= "\n\nVýškový profil pozemku:";
                if (isset($vp['min_m'])) $userMessage .= " min: {$vp['min_m']} m n.m.";
                if (isset($vp['max_m'])) $userMessage .= ", max: {$vp['max_m']} m n.m.";
                if (isset($vp['rozdil_m'])) $userMessage .= ", rozdíl: {$vp['rozdil_m']} m";
            }
            // Sousedi (starý formát)
            if (!empty($katastr['sousedi'])) {
                $userMessage .= "\n\nSousední parcely:";
                foreach ($katastr['sousedi'] as $s) {
                    $label = $s['label'] ?? '?';
                    $vymera = $s['vymera'] ?? '?';
                    $druh = $s['druh'] ?? '?';
                    $userMessage .= "\n  {$label}: {$vymera} m², {$druh}";
                }
            }
        }

        // Zvýrazňovací čáry a označené stěny
        if (!empty($zvyrazneni)) {
            // Nový formát: seznam objektů pod zvýrazňovačem
            if (isset($zvyrazneni[0]['id']) && isset($zvyrazneni[0]['nazev'])) {
                $userMessage .= "\n\nUživatel zvýraznil na plánku tyto objekty:";
                foreach ($zvyrazneni as $z) {
                    $userMessage .= "\n  • {$z['nazev']} (id: {$z['id']}, délka: " . ($z['delka'] ?? '?') . "m)";
                }
                $userMessage .= "\nPokud uživatel odkazuje na 'tuto', 'tento', 'označené' apod., pravděpodobně myslí výše uvedené.";
            } else {
                // Starý formát: čáry v metrech
                $userMessage .= "\n\nZvýrazněné čáry uživatele (souřadnice v metrech):";
                foreach ($zvyrazneni as $i => $z) {
                    $od = $z['od'] ?? [0, 0];
                    $do = $z['do'] ?? [0, 0];
                    $userMessage .= "\n  Čára " . ($i + 1) . ": od [{$od[0]}, {$od[1]}] do [{$do[0]}, {$do[1]}]";
                }
                $userMessage .= "\nUživatel kreslil nepřesně rukou — respektuj záměr, ne přesné souřadnice.";
            }
        }

        $messages[] = ['role' => 'user', 'content' => $userMessage];
        $messages = $this->zajistiStridaniRoli($messages);

        try {
            // Volání přes tool_use — Claude je vynucena vyplnit strukturovaný
            // objekt podle schématu, nemůže vrátit prázdná nebo špatně
            // formátovaná pole. Žádný regex parsing, žádné fallbacky.
            $data = app(ClaudeApi::class)->messagesWithTool(
                model: $this->model,
                system: $systemPrompt,
                messages: $messages,
                tool: $this->toolDefinition(),
                maxTokens: $this->maxTokens,
                modul: 'koncept',
                poznamka: 'koncept_id: ' . ($koncept?->id ?? 'new') . ' / ' . \Illuminate\Support\Str::limit($pozadavek, 150),
                timeout: 90,
            );
        } catch (\RuntimeException $e) {
            $msg = str_replace('Please wait before retrying.', 'Počkejte chvíli, než to zkusíte znovu.', $e->getMessage());
            throw new \RuntimeException($msg);
        }

        if ($data === null) {
            throw new \RuntimeException('Claude API chyba: prázdná odpověď (tool_use nevyplněn).');
        }

        // Post-processing: validace geometrie otvorů (přesahy stěn, záporné pozice)
        if (!empty($data['steny']) && !empty($data['otvory'])) {
            $data = $this->validovatGeometrii($data);
        }

        return $data;
    }

    /**
     * Tool definice pro Claude — vynucuje strukturu odpovědi. Schéma popisuje,
     * která pole MŮŽE vrátit (typy stěn, otvorů, akcí) a v jaké formě.
     *
     * Claude vyplní podmnožinu polí podle situace:
     *   - Rozhovor: dotaz + (volitelně) metadata
     *   - Návrh: steny + otvory + zmena + (volitelně) rozhovor_hotovy=true
     *   - Úprava: kombinace (zmena + nové/změněné steny/otvory)
     *   - Akce: akce[] pro smazání/undo
     */
    private function toolDefinition(): array
    {
        return [
            'name' => 'vrat_koncept',
            'description' => 'Vrátí strukturu konceptu domu/projektu. V rozhovoru vrať `dotaz` s otázkou pro uživatele. V návrhu vrať `steny[]` + `otvory[]` s geometrií. Pro úpravy vrať nové/změněné prvky + `zmena` s popisem. Souřadnice jsou v METRECH ve stejném souřadném systému jako polygon_m parcely (pokud ho máš v kontextu, můžeš ho použít přímo).',
            'input_schema' => [
                'type' => 'object',
                'properties' => [
                    'dotaz' => [
                        'type' => 'string',
                        'description' => 'Otázka pro uživatele. Vyplň v rozhovoru když potřebuješ víc informací. NEvyplňuj, pokud rovnou kreslíš (steny[]).',
                    ],
                    'zmena' => [
                        'type' => 'string',
                        'description' => 'Krátký popis co jsi udělal/a (např. „Postavil dům 8×12m", „Plot kolem pozemku", „Přidal garáž"). Vyplň pokud jsi něco nakreslil/a.',
                    ],
                    'rozhovor_hotovy' => [
                        'type' => 'boolean',
                        'description' => 'True když jsi sebrala dost informací a chceš ukončit rozhovor (typicky když vracíš první steny[]).',
                    ],
                    'steny' => [
                        'type' => 'array',
                        'description' => 'Seznam stěn k vykreslení. POZOR: pokud chceš plot po obvodu parcely, vrať jeden segment plotu pro každou hranu polygonu_m parcely (uzavřený obvod).',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => ['type' => 'string', 'description' => 'Unikátní ID (např. S1, S2, ...).'],
                                'typ' => [
                                    'type' => 'string',
                                    'enum' => ['obvodova', 'nosna', 'pricka', 'plot', 'zidka'],
                                    'description' => 'Typ stěny. obvodova = vnější stěna domu, nosna = vnitřní nosná, pricka = příčka, plot = oplocení pozemku, zidka = nízká zídka.',
                                ],
                                'od' => [
                                    'type' => 'array',
                                    'items' => ['type' => 'number'],
                                    'minItems' => 2,
                                    'maxItems' => 2,
                                    'description' => 'Počáteční bod [x, y] v metrech.',
                                ],
                                'do' => [
                                    'type' => 'array',
                                    'items' => ['type' => 'number'],
                                    'minItems' => 2,
                                    'maxItems' => 2,
                                    'description' => 'Koncový bod [x, y] v metrech.',
                                ],
                                'tloustka' => ['type' => 'number', 'description' => 'Tloušťka v metrech. Default podle typu (obvodova 0.30, nosna 0.25, pricka 0.10, plot 0.15, zidka 0.25).'],
                                'vyska' => ['type' => 'number', 'description' => 'Výška v metrech. Default: dům 3.0, plot 1.8, zídka 0.6.'],
                            ],
                            'required' => ['id', 'typ', 'od', 'do'],
                        ],
                    ],
                    'otvory' => [
                        'type' => 'array',
                        'description' => 'Otvory ve stěnách — dveře, okna, brány. Pozice je vzdálenost od počátku stěny v metrech.',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => ['type' => 'string'],
                                'stena' => ['type' => 'string', 'description' => 'ID stěny ve které je otvor (např. S1).'],
                                'typ' => [
                                    'type' => 'string',
                                    'enum' => ['dvere', 'okno', 'garazova_vrata', 'francouzske_okno', 'pruchod', 'brana', 'branka'],
                                ],
                                'pozice' => ['type' => 'number', 'description' => 'Vzdálenost levého okraje otvoru od počátku stěny [m].'],
                                'sirka' => ['type' => 'number'],
                                'vyska' => ['type' => 'number'],
                            ],
                            'required' => ['id', 'stena', 'typ', 'pozice', 'sirka'],
                        ],
                    ],
                    'akce' => [
                        'type' => 'array',
                        'description' => 'Akce k provedení nad existujícím konceptem (typicky při úpravách).',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'typ' => ['type' => 'string', 'enum' => ['smazat', 'undo', 'redo']],
                                'id' => ['type' => 'string', 'description' => 'ID prvku k akci (pro typ=smazat).'],
                            ],
                            'required' => ['typ'],
                        ],
                    ],
                    'metadata' => [
                        'type' => 'object',
                        'description' => 'Volná metadata konceptu — pokoje, materiály, rozhodnutí, ... Není striktní schéma, ale ukládá se a předává při dalším volání.',
                    ],
                ],
                'required' => [],
            ],
        ];
    }

    /**
     * Validuje geometrii konceptu — opraví otvory přesahující stěny.
     */
    private function validovatGeometrii(array $data): array
    {
        if (empty($data['steny']) || empty($data['otvory'])) {
            return $data;
        }

        $delkyStěn = [];
        foreach ($data['steny'] as $stena) {
            $dx = ($stena['do'][0] ?? 0) - ($stena['od'][0] ?? 0);
            $dy = ($stena['do'][1] ?? 0) - ($stena['od'][1] ?? 0);
            $delkyStěn[$stena['id']] = sqrt($dx * $dx + $dy * $dy);
        }

        $opravy = [];
        foreach ($data['otvory'] as &$otvor) {
            $stenaId = $otvor['stena'] ?? '';
            $delkaSteny = $delkyStěn[$stenaId] ?? null;
            if ($delkaSteny === null || $delkaSteny <= 0) continue;

            $pozice = $otvor['pozice'] ?? 0;
            $sirka = $otvor['sirka'] ?? 0;

            if ($sirka > $delkaSteny) {
                $otvor['sirka'] = round($delkaSteny * 0.8, 3);
                $sirka = $otvor['sirka'];
                $opravy[] = "{$otvor['id']}: šířka zmenšena na {$sirka}m (stěna {$stenaId} je jen {$delkaSteny}m)";
            }

            if ($pozice < 0) {
                $otvor['pozice'] = 0;
                $pozice = 0;
                $opravy[] = "{$otvor['id']}: pozice opravena na 0 (byla záporná)";
            }

            if ($pozice + $sirka > $delkaSteny + 0.001) {
                $otvor['pozice'] = round($delkaSteny - $sirka, 3);
                if ($otvor['pozice'] < 0) $otvor['pozice'] = 0;
                $opravy[] = "{$otvor['id']}: pozice opravena na {$otvor['pozice']}m (přesahoval stěnu {$stenaId})";
            }
        }
        unset($otvor);

        if ($opravy) {
            $data['_opravy'] = $opravy;
            $data['zmena'] = ($data['zmena'] ?? '') . ' [Automaticky opraveno: ' . implode('; ', $opravy) . ']';
        }

        return $data;
    }

    /**
     * Načte relevantní pravidla objektů z DB podle požadavku uživatele.
     * Používá embedding search (Voyage AI) pro sémantické matchování.
     */
    private function nactiPravidlaObjektu(string $pozadavek): string
    {
        try {
            $embedding = (new RagEmbedding())->setModul('koncept_pravidla');
            if (!$embedding->jeDostupny()) return '';

            $dotazVektor = $embedding->embedQuery($pozadavek);
            if (empty($dotazVektor)) return '';

            // Načíst všechna pravidla — embeddings cachované v metadata
            $pravidla = \App\Models\PravidloObjektu::all();
            if ($pravidla->isEmpty()) return '';

            // Embedovat keywords/názvy — cache v metadata.embedding
            $needsEmbed = $pravidla->filter(fn($p) => empty($p->metadata['embedding']));
            if ($needsEmbed->isNotEmpty()) {
                $texty = $needsEmbed->map(fn($p) => $p->nazev . ' ' . ($p->keywords ?? ''))->values()->toArray();
                $vektory = $embedding->embedBatch($texty, 'document');
                foreach ($needsEmbed->values() as $i => $p) {
                    if (!empty($vektory[$i])) {
                        $meta = $p->metadata ?? [];
                        $meta['embedding'] = $vektory[$i];
                        $p->update(['metadata' => $meta]);
                    }
                }
                $pravidla = \App\Models\PravidloObjektu::all(); // refresh
            }

            $vektory = $pravidla->map(fn($p) => $p->metadata['embedding'] ?? [])->toArray();

            // Cosine similarity
            $scored = [];
            foreach ($pravidla as $i => $p) {
                if (empty($vektory[$i])) continue;
                $sim = $this->cosineSim($dotazVektor, $vektory[$i]);
                if ($sim > 0.3) { // práh relevance
                    $scored[] = ['pravidlo' => $p, 'sim' => $sim];
                }
            }

            // Seřadit podle relevance, max 5
            usort($scored, fn($a, $b) => $b['sim'] <=> $a['sim']);
            $scored = array_slice($scored, 0, 5);

            if (empty($scored)) return '';

            $parts = ["# Pravidla objektů (z databáze)\n"];
            foreach ($scored as $s) {
                $p = $s['pravidlo'];
                $parts[] = "## {$p->nazev}\n{$p->pravidla}";
            }

            return implode("\n\n", $parts);
        } catch (\Throwable $e) {
            return '';
        }
    }

    private function cosineSim(array $a, array $b): float
    {
        $dot = 0; $na = 0; $nb = 0;
        for ($i = 0, $n = min(count($a), count($b)); $i < $n; $i++) {
            $dot += $a[$i] * $b[$i];
            $na += $a[$i] * $a[$i];
            $nb += $b[$i] * $b[$i];
        }
        $denom = sqrt($na) * sqrt($nb);
        return $denom > 0 ? $dot / $denom : 0;
    }

    /**
     * Zajistí střídání rolí user/assistant.
     */
    private function zajistiStridaniRoli(array $messages): array
    {
        if (empty($messages)) return [];

        $result = [];
        foreach ($messages as $msg) {
            if (!empty($result) && end($result)['role'] === $msg['role']) {
                $result[array_key_last($result)]['content'] .= "\n\n" . $msg['content'];
            } else {
                $result[] = $msg;
            }
        }

        while (!empty($result) && $result[0]['role'] !== 'user') {
            array_shift($result);
        }

        return $result;
    }
}
