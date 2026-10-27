<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Models\Bug;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BugyController extends Controller
{
    public function index(Request $request)
    {
        $filtr = $request->input('stav', 'aktivni'); // aktivni / opravene / vse
        $typ = $request->input('typ', 'vse'); // server / client / pomaly / vse

        $q = Bug::query()->with('uzivatel:id,jmeno,prijmeni,email');

        if ($filtr === 'aktivni') $q->where('opraveno', false);
        if ($filtr === 'opravene') $q->where('opraveno', true);
        if ($typ === 'server') $q->where('typ', 'server');
        if ($typ === 'client') $q->where('typ', 'client');
        if ($typ === 'pomaly') $q->where('typ', 'pomaly_request');
        if ($typ === 'dotazy') $q->where('typ', 'pomaly_dotaz');
        // „Všechny typy" = jen skutečné bugy (perf-monitoring pomaly_* nejsou bugy)
        // vč. výpadků AI služeb a záloh — ty nesmí zapadnout.
        if ($typ === 'vse') $q->whereIn('typ', ['server', 'client', 'ai', 'zaloha']);

        $bugy = $q->orderByDesc('naposledy_v')->paginate(50);

        $pocty = array_merge(Bug::poctyZalozek(), [
            // Číslo v záložce = jen skutečné chyby; upozornění (warning: cron timeouty,
            // hlídač toku poptávek, 419…) se počítají zvlášť a v přehledu jsou ztlumená.
            'aktivni' => Bug::where('opraveno', false)->whereIn('typ', ['server', 'client', 'ai', 'zaloha'])->where('uroven', 'error')->count(),
            'upozorneni' => Bug::where('opraveno', false)->whereIn('typ', ['server', 'client', 'ai', 'zaloha'])->where('uroven', '!=', 'error')->count(),
            'opravene' => Bug::where('opraveno', true)->count(),
        ]);

        return view('masterteam.bugy.index', compact('bugy', 'pocty', 'filtr', 'typ'));
    }

    public function show(Bug $bug)
    {
        $bug->load(['uzivatel:id,jmeno,prijmeni,email', 'opravil:id,jmeno']);
        return view('masterteam.bugy.show', compact('bug'));
    }

    public function oznacOpraveno(Bug $bug)
    {
        $bug->update([
            'opraveno' => true,
            'opraveno_v' => now(),
            'opravil_uzivatel_id' => Auth::id(),
        ]);
        \Illuminate\Support\Facades\Cache::forget('bugy-aktivni-pocet');
        return response()->json(['ok' => true]);
    }

    public function smazat(Bug $bug)
    {
        $bug->delete();
        \Illuminate\Support\Facades\Cache::forget('bugy-aktivni-pocet');
        return response()->json(['ok' => true]);
    }
}
