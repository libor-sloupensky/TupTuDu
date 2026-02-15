<?php

namespace App\Http\Controllers;

use App\Models\Doklad;
use App\Models\Firma;
use App\Services\DokladProcessor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class InvoiceController extends Controller
{
    private function aktivniFirma(): Firma
    {
        return auth()->user()->aktivniFirma();
    }

    private function autorizujDoklad(Doklad $doklad): void
    {
        $dostupne = auth()->user()->dostupneIco();
        if (!in_array($doklad->firma_ico, $dostupne)) {
            abort(403, 'Nemáte přístup k tomuto dokladu.');
        }
    }

    private function dokladToArray(Doklad $d): array
    {
        return [
            'id' => $d->id,
            'created_at' => $d->created_at->format('d.m.y'),
            'created_at_time' => $d->created_at->format('H:i'),
            'created_at_iso' => $d->created_at->toISOString(),
            'datum_prijeti' => $d->datum_prijeti ? $d->datum_prijeti->format('d.m.y') : null,
            'datum_prijeti_raw' => $d->datum_prijeti ? $d->datum_prijeti->format('Y-m-d') : null,
            'duzp' => $d->duzp ? $d->duzp->format('d.m.y') : null,
            'duzp_raw' => $d->duzp ? $d->duzp->format('Y-m-d') : null,
            'datum_vystaveni' => $d->datum_vystaveni ? $d->datum_vystaveni->format('d.m.y') : null,
            'datum_vystaveni_raw' => $d->datum_vystaveni ? $d->datum_vystaveni->format('Y-m-d') : null,
            'datum_splatnosti' => $d->datum_splatnosti ? $d->datum_splatnosti->format('d.m.y') : null,
            'datum_splatnosti_raw' => $d->datum_splatnosti ? $d->datum_splatnosti->format('Y-m-d') : null,
            'cislo_dokladu' => $d->cislo_dokladu,
            'nazev_souboru' => $d->nazev_souboru,
            'dodavatel_nazev' => $d->dodavatel_nazev,
            'dodavatel_ico' => $d->dodavatel_ico,
            'castka_celkem' => $d->castka_celkem,
            'mena' => $d->mena,
            'castka_dph' => $d->castka_dph,
            'kategorie' => $d->kategorie,
            'stav' => $d->stav,
            'typ_dokladu' => $d->typ_dokladu,
            'kvalita' => $d->kvalita,
            'kvalita_poznamka' => $d->kvalita_poznamka,
            'zdroj' => $d->zdroj,
            'cesta_souboru' => $d->cesta_souboru ? true : false,
            'duplicita_id' => $d->duplicita_id,
            'show_url' => route('doklady.show', $d),
            'update_url' => route('doklady.update', $d),
            'destroy_url' => route('doklady.destroy', $d),
            'preview_url' => $d->cesta_souboru ? route('doklady.preview', $d) : null,
            'preview_ext' => strtolower(pathinfo($d->nazev_souboru, PATHINFO_EXTENSION)),
            'adresni' => $d->adresni,
            'overeno_adresat' => $d->overeno_adresat,
            'chybova_zprava' => $d->chybova_zprava,
            'raw_ai_odpoved' => $d->raw_ai_odpoved,
            'created_at_full' => $d->created_at->format('d.m.Y H:i'),
        ];
    }

    public function index(Request $request)
    {
        $firma = $this->aktivniFirma();

        $allowedSort = ['created_at', 'datum_vystaveni', 'datum_prijeti', 'duzp', 'datum_splatnosti'];
        $sort = in_array($request->query('sort'), $allowedSort) ? $request->query('sort') : 'created_at';
        $dir = $request->query('dir') === 'asc' ? 'asc' : 'desc';
        $q = trim($request->query('q', ''));

        $query = Doklad::where('firma_ico', $firma->ico);

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('cislo_dokladu', 'like', "%{$q}%")
                    ->orWhere('dodavatel_nazev', 'like', "%{$q}%")
                    ->orWhere('nazev_souboru', 'like', "%{$q}%")
                    ->orWhere('dodavatel_ico', 'like', "%{$q}%")
                    ->orWhere('raw_text', 'like', "%{$q}%");
            });
        }

        $doklady = $query->orderBy($sort, $dir)->get();
        $dokladyJson = $doklady->map(fn($d) => $this->dokladToArray($d))->values();

        if ($request->ajax()) {
            return response()->json($dokladyJson);
        }

        return view('invoices.index', compact('doklady', 'firma', 'sort', 'dir', 'q', 'dokladyJson'));
    }

    public function show(Doklad $doklad)
    {
        $this->autorizujDoklad($doklad);
        return view('invoices.show', compact('doklad'));
    }

    public function download(Doklad $doklad)
    {
        $this->autorizujDoklad($doklad);
        $disk = Storage::disk('s3');

        if (!$doklad->cesta_souboru || !$disk->exists($doklad->cesta_souboru)) {
            abort(404, 'Soubor nebyl nalezen.');
        }

        return response()->streamDownload(function () use ($disk, $doklad) {
            echo $disk->get($doklad->cesta_souboru);
        }, $doklad->nazev_souboru);
    }

    public function preview(Doklad $doklad)
    {
        $this->autorizujDoklad($doklad);
        $disk = Storage::disk('s3');

        if (!$doklad->cesta_souboru || !$disk->exists($doklad->cesta_souboru)) {
            abort(404, 'Soubor nebyl nalezen.');
        }

        $ext = strtolower(pathinfo($doklad->nazev_souboru, PATHINFO_EXTENSION));
        $mimeTypes = [
            'pdf' => 'application/pdf',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
        ];
        $mime = $mimeTypes[$ext] ?? 'application/octet-stream';

        return response($disk->get($doklad->cesta_souboru))
            ->header('Content-Type', $mime)
            ->header('Content-Disposition', 'inline; filename="' . $doklad->nazev_souboru . '"');
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'documents' => 'required|array|min:1',
                'documents.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
            ]);

            $firma = $this->aktivniFirma();
            $processor = new DokladProcessor();
            $results = [];

            foreach ($request->file('documents') as $file) {
                $tempPath = $file->getRealPath();
                $fileHash = hash_file('sha256', $tempPath);
                $originalName = $file->getClientOriginalName();

                // Hash duplicate - exact same file, skip entirely
                $existujici = $processor->isDuplicate($fileHash, $firma->ico);
                if ($existujici) {
                    $results[] = [
                        'name' => $originalName,
                        'status' => 'duplicate',
                        'message' => $originalName . ' - již existuje (' . ($existujici->cislo_dokladu ?: $existujici->nazev_souboru) . ')',
                    ];
                    continue;
                }

                $doklady = $processor->process($tempPath, $originalName, $firma, $fileHash, 'upload');

                // Determine overall status for this file
                $status = 'ok';
                $warnings = [];

                foreach ($doklady as $doklad) {
                    if ($doklad->stav === 'chyba') {
                        $status = 'error';
                        $warnings[] = $doklad->chybova_zprava;
                    } elseif ($doklad->kvalita === 'necitelna') {
                        if ($status !== 'error') $status = 'error';
                        $warnings[] = $doklad->kvalita_poznamka ?: 'Nečitelný doklad';
                    } elseif ($doklad->kvalita === 'nizka') {
                        if ($status === 'ok') $status = 'warning';
                        $warnings[] = $doklad->kvalita_poznamka ?: 'Nízká kvalita';
                    } elseif ($doklad->duplicita_id) {
                        if ($status === 'ok') $status = 'warning';
                        $warnings[] = 'Možná duplicita (doklad č. ' . ($doklad->cislo_dokladu ?: '?') . ')';
                    }
                }

                $message = $originalName . ' - zpracováno';
                if (count($doklady) > 1) {
                    $message .= ' (' . count($doklady) . ' dokladů)';
                }
                if ($warnings) {
                    $message .= ' | ' . implode(', ', array_unique($warnings));
                }

                $results[] = [
                    'name' => $originalName,
                    'status' => $status,
                    'message' => $message,
                ];
            }

            if ($request->ajax()) {
                return response()->json($results);
            }

            $ok = collect($results)->where('status', 'ok')->count();
            $total = count($results);
            $message = "Zpracováno {$ok} z {$total} dokladů.";
            $warnResults = collect($results)->whereIn('status', ['warning', 'error']);
            if ($warnResults->isNotEmpty()) {
                $message .= ' ' . $warnResults->pluck('message')->implode('; ');
            }

            return redirect()->route('doklady.index')->with('flash', $message);

        } catch (\Throwable $e) {
            Log::error('InvoiceController::store error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            if ($request->ajax()) {
                return response()->json([
                    ['name' => 'Chyba', 'status' => 'error', 'message' => 'Chyba serveru: ' . $e->getMessage()]
                ], 500);
            }

            return redirect()->route('doklady.index')->with('flash', 'Chyba při zpracování: ' . $e->getMessage());
        }
    }

    public function update(Request $request, Doklad $doklad)
    {
        $this->autorizujDoklad($doklad);

        $editableFields = [
            'datum_prijeti', 'duzp', 'datum_vystaveni', 'datum_splatnosti',
            'dodavatel_nazev', 'dodavatel_ico', 'cislo_dokladu',
            'castka_celkem', 'mena', 'castka_dph', 'kategorie',
        ];

        $field = $request->input('field');
        $value = $request->input('value');

        if (!in_array($field, $editableFields)) {
            return response()->json(['ok' => false, 'error' => 'Pole nelze upravit.'], 422);
        }

        if ($value === '' || $value === null) {
            $value = null;
        }

        $doklad->update([$field => $value]);

        return response()->json(['ok' => true]);
    }

    public function downloadMonth(Request $request, string $mesic)
    {
        if (!preg_match('/^\d{4}-\d{2}$/', $mesic)) {
            abort(400, 'Neplatný formát měsíce. Použijte YYYY-MM.');
        }

        $firma = $this->aktivniFirma();

        $doklady = Doklad::where('firma_ico', $firma->ico)
            ->where('cesta_souboru', 'like', "doklady/{$firma->ico}/{$mesic}/%")
            ->where('cesta_souboru', '!=', '')
            ->get();

        if ($doklady->isEmpty()) {
            abort(404, 'Žádné doklady za tento měsíc.');
        }

        $zipName = "doklady_{$mesic}.zip";
        $tempZip = tempnam(sys_get_temp_dir(), 'doklady_') . '.zip';
        $zip = new ZipArchive();

        if ($zip->open($tempZip, ZipArchive::CREATE) !== true) {
            abort(500, 'Nepodařilo se vytvořit ZIP archiv.');
        }

        $disk = Storage::disk('s3');
        foreach ($doklady as $doklad) {
            if ($disk->exists($doklad->cesta_souboru)) {
                $zip->addFromString($doklad->nazev_souboru, $disk->get($doklad->cesta_souboru));
            }
        }

        $zip->close();

        return response()->download($tempZip, $zipName)->deleteFileAfterSend(true);
    }

    public function destroy(Doklad $doklad)
    {
        $this->autorizujDoklad($doklad);

        if ($doklad->cesta_souboru) {
            Storage::disk('s3')->delete($doklad->cesta_souboru);
        }

        Doklad::where('duplicita_id', $doklad->id)->update(['duplicita_id' => null]);

        $nazev = $doklad->cislo_dokladu ?: $doklad->nazev_souboru;
        $doklad->delete();

        return redirect()->route('doklady.index')->with('flash', "Doklad {$nazev} byl smazán.");
    }
}
