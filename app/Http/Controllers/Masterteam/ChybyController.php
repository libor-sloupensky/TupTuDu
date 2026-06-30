<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Models\Chyba;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChybyController extends Controller
{
    public function index(Request $request)
    {
        $filtr = $request->input('stav', 'aktivni'); // aktivni / opravene / vse
        $typ = $request->input('typ', 'vse'); // server / client / vse

        $q = Chyba::query()->with('uzivatel:id,jmeno,prijmeni,email');

        if ($filtr === 'aktivni') $q->where('opraveno', false);
        if ($filtr === 'opravene') $q->where('opraveno', true);
        if ($typ === 'server') $q->where('typ', 'server');
        if ($typ === 'client') $q->where('typ', 'client');

        $chyby = $q->orderByDesc('naposledy_v')->paginate(50);

        $pocty = [
            'aktivni' => Chyba::where('opraveno', false)->count(),
            'opravene' => Chyba::where('opraveno', true)->count(),
            'server' => Chyba::where('opraveno', false)->where('typ', 'server')->count(),
            'client' => Chyba::where('opraveno', false)->where('typ', 'client')->count(),
        ];

        return view('masterteam.chyby.index', compact('chyby', 'pocty', 'filtr', 'typ'));
    }

    public function show(Chyba $chyba)
    {
        $chyba->load(['uzivatel:id,jmeno,prijmeni,email', 'opravil:id,jmeno']);
        return view('masterteam.chyby.show', compact('chyba'));
    }

    public function oznacOpraveno(Chyba $chyba)
    {
        $chyba->update([
            'opraveno' => true,
            'opraveno_v' => now(),
            'opravil_uzivatel_id' => Auth::id(),
        ]);
        \Illuminate\Support\Facades\Cache::forget('chyby-aktivni-pocet');
        return response()->json(['ok' => true]);
    }

    public function smazat(Chyba $chyba)
    {
        $chyba->delete();
        \Illuminate\Support\Facades\Cache::forget('chyby-aktivni-pocet');
        return response()->json(['ok' => true]);
    }
}
