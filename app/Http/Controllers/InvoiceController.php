<?php

namespace App\Http\Controllers;

use App\Models\Doklad;
use App\Models\Firma;
use App\Services\DokladProcessor;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function create()
    {
        return view('invoices.upload');
    }

    public function index()
    {
        $firma = Firma::first();
        $doklady = $firma
            ? Doklad::where('firma_ico', $firma->ico)->orderByDesc('created_at')->get()
            : collect();

        return view('invoices.index', compact('doklady', 'firma'));
    }

    public function show(Doklad $doklad)
    {
        return view('invoices.show', compact('doklad'));
    }

    public function download(Doklad $doklad)
    {
        $path = storage_path('app/private/' . $doklad->cesta_souboru);
        if (!file_exists($path)) {
            abort(404, 'Soubor nebyl nalezen.');
        }
        return response()->download($path, $doklad->nazev_souboru);
    }

    public function store(Request $request)
    {
        $request->validate([
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $firma = Firma::first();
        if (!$firma) {
            return back()->withErrors(['document' => 'Nejdříve vyplňte nastavení firmy.']);
        }

        $file = $request->file('document');
        $fileHash = hash_file('sha256', $file->getRealPath());

        $processor = new DokladProcessor();

        // Kontrola duplicit
        $existujici = $processor->isDuplicate($fileHash, $firma->ico);
        if ($existujici) {
            return back()->withErrors([
                'document' => 'Tento doklad byl již nahrán ('
                    . ($existujici->cislo_dokladu ?: $existujici->nazev_souboru)
                    . ', ' . $existujici->created_at->format('d.m.Y H:i') . ').',
            ]);
        }

        $path = $file->storeAs(
            'doklady/' . $firma->ico,
            time() . '_' . $file->getClientOriginalName(),
            'local'
        );
        $fullPath = storage_path('app/private/' . $path);

        $doklad = $processor->process(
            $fullPath,
            $file->getClientOriginalName(),
            $firma,
            $path,
            $fileHash,
            'upload'
        );

        if ($doklad->stav === 'chyba') {
            return back()->withErrors(['document' => 'Chyba při zpracování: ' . $doklad->chybova_zprava]);
        }

        return redirect()->route('doklady.show', $doklad);
    }
}
