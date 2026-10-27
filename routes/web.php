<?php

use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\BugController;
use App\Http\Controllers\Masterteam\BugyController;
use App\Http\Controllers\Masterteam\KonceptController;
use App\Http\Controllers\Masterteam\KonceptTestovaniController;
use App\Http\Controllers\Masterteam\KonceptV3Controller;
use App\Http\Controllers\Masterteam\KonceptV3PodkladController;
use App\Http\Controllers\Masterteam\PravidlaObjektuController;
use App\Http\Controllers\Masterteam\Seo404Controller;
use App\Http\Controllers\Masterteam\UzivateleController;
use App\Support\Domeny;
use Illuminate\Support\Facades\Route;

// Úvod — podle subdomény (config/domeny.php): web = titulka, app = úvod aplikace,
// masterteam = administrace. Ostatní routy si subdoménu hlídají middlewarem `subdomena:…`.
Route::get('/', function () {
    if (Domeny::jeMasterteam()) {
        return redirect('/masterteam');
    }
    if (Domeny::jeApp()) {
        return redirect(auth()->check() ? '/projects' : '/login');
    }

    return view('vitrina.index');
});

// Error tracking — endpoint pro JS bugy (window.onerror, unhandledrejection)
Route::post('/api/bug', [BugController::class, 'ulozit'])
    ->middleware('throttle:60,1')
    ->name('api.chyba');

// Ladění produkce, kde APP_DEBUG=false — poslední chyby se stack trace.
// Hosting umí volat jen URL, ne artisan. Neplatný token → 404, ať se endpoint neprozradí.
Route::get('/cron/chyby/{token}', function (string $token) {
    if (! hash_equals((string) config('services.cron_token'), $token)) {
        abort(404);
    }

    Illuminate\Support\Facades\Artisan::call('chyby:posledni', ['--stack' => true]);

    return response(Illuminate\Support\Facades\Artisan::output(), 200)
        ->header('Content-Type', 'text/plain; charset=utf-8');
})->middleware('throttle:12,1')->name('cron.chyby');

// Jediný cron — hosting volá každých 15 min (nejkratší perioda hostingu).
// Seznam úloh a jejich intervalů je v App\Support\PlanovaneUlohy; nová úloha
// = řádek tam, na hostingu se nic nemění. /cron/bugy/{token} je původní adresa
// (nastavená na hostingu) a dělá totéž.
$hlavniCron = function (string $token) {
    if (! hash_equals((string) config('services.cron_token'), $token)) {
        abort(404);
    }

    return response(App\Support\PlanovaneUlohy::spust(), 200)
        ->header('Content-Type', 'text/plain; charset=utf-8');
};
Route::get('/cron/bugy/{token}', $hlavniCron)->middleware('throttle:12,1')->name('cron.bugy');
Route::get('/cron/{token}', $hlavniCron)->middleware('throttle:12,1')->name('cron');

// Google OAuth přihlášení (Socialite) — jen pro existující uživatele.
// Stejně jako login běží na app i masterteamu (každá subdoména má vlastní session).
Route::middleware('subdomena:app,masterteam')->group(function () {
    Route::get('/auth/google', [GoogleController::class, 'redirect'])->name('auth.google');
    Route::get('/auth/google/callback', [GoogleController::class, 'callback'])->name('auth.google.callback');
});

// Přepínač jazyka (partials/prepinac-jazyka) — volba do session, přihlášenému i do účtu.
Route::get('/jazyk/{kod}', function (Illuminate\Http\Request $request, string $kod) {
    abort_unless(App\Support\Lokalizace::jeJazyk($kod), 404);

    $request->session()->put('jazyk', $kod);
    $request->user()?->update(['jazyk' => $kod]);

    return redirect()->back(fallback: '/');
})->middleware('throttle:30,1')->name('jazyk.prepnout');

// Administrace (Masterteam) — jen na masterteam.tuptudu.com a jen pro přihlášené
// členy master týmu (IČO master subjektu). Prefix /masterteam zůstává, ať se
// nemusí měnit adresy natvrdo v JS editoru.
Route::middleware(['subdomena:masterteam', 'auth', 'master'])->prefix('masterteam')->name('masterteam.')->group(function () {
    Route::get('/', fn () => view('masterteam.dashboard'))->name('dashboard');

    // Správa uživatelů master týmu
    Route::get('uzivatele', [UzivateleController::class, 'index'])->name('uzivatele.index');
    Route::post('uzivatele', [UzivateleController::class, 'store'])->name('uzivatele.store');
    Route::patch('uzivatele/{uzivatel}/role', [UzivateleController::class, 'toggleRole'])->name('uzivatele.role');
    Route::delete('uzivatele/{uzivatel}', [UzivateleController::class, 'destroy'])->name('uzivatele.destroy');

    // ───────── Koncept (editor) ─────────
    Route::get('koncept', [KonceptController::class, 'indexK'])->name('koncept');
    Route::get('koncept/test-paket-e', [KonceptController::class, 'testPaketE'])->name('koncept.testPaketE');
    Route::post('koncept/test-paket-e/ai-uprava', [KonceptController::class, 'testPaketEUprava'])->name('koncept.testPaketEUprava');
    Route::post('koncept/vytvorit', [KonceptController::class, 'vytvorit'])->name('koncept.vytvorit');
    Route::post('koncept/import-pudorys', [KonceptController::class, 'importZPudorysu'])->name('koncept.import-pudorys');
    Route::post('koncept/ai-vytvor', [KonceptController::class, 'aiVytvor'])->name('koncept.aiVytvor');
    Route::post('koncept/import', [KonceptController::class, 'importDxf'])->name('koncept.import');
    // Katastr — statické routy PŘED parametrickými (jinak {koncept:id} matchne "katastr")
    Route::post('koncept/katastr/parcela', [KonceptController::class, 'nactiParcelu'])->name('koncept.katastr.parcela');
    Route::post('koncept/katastr/stavby', [KonceptController::class, 'nactiStavby'])->name('koncept.katastr.stavby');
    Route::post('koncept/katastr/vyskovy-profil', [KonceptController::class, 'nactiVyskovy'])->name('koncept.katastr.vyskovy');
    Route::post('koncept/katastr/sousednost', [KonceptController::class, 'overSousednost'])->name('koncept.katastr.sousednost');
    Route::post('koncept/katastr/okolni', [KonceptController::class, 'nactiOkolniParcely'])->name('koncept.katastr.okolni');
    Route::post('koncept/vysvetleni', [KonceptController::class, 'vysvetleniPojmu'])->name('koncept.vysvetleni');
    // Parametrické routy — {koncept:id} na konci
    Route::patch('koncept/{koncept:id}/ulozit', [KonceptController::class, 'ulozit'])->name('koncept.ulozit');
    Route::delete('koncept/{koncept:id}', [KonceptController::class, 'smazat'])->name('koncept.smazat');
    Route::post('koncept/{koncept:id}/ai-uprav', [KonceptController::class, 'aiUprav'])->name('koncept.aiUprav');
    Route::get('koncept/{koncept:id}/export', [KonceptController::class, 'exportJson'])->name('koncept.export');
    Route::patch('koncept/{koncept:id}/katastr', [KonceptController::class, 'ulozitKatastr'])->name('koncept.katastr.ulozit');

    // ───────── Koncept V3 (nová verze editoru — samostatná kopie, vlastní tabulka koncepty_v3) ─────────
    Route::get('koncept-v3', [KonceptV3Controller::class, 'indexK'])->name('koncept-v3');
    Route::post('koncept-v3/vytvorit', [KonceptV3Controller::class, 'vytvorit'])->name('koncept-v3.vytvorit');
    Route::post('koncept-v3/import-pudorys', [KonceptV3Controller::class, 'importZPudorysu'])->name('koncept-v3.import-pudorys');
    Route::post('koncept-v3/ai-vytvor', [KonceptV3Controller::class, 'aiVytvor'])->name('koncept-v3.aiVytvor');
    Route::post('koncept-v3/import', [KonceptV3Controller::class, 'importDxf'])->name('koncept-v3.import');
    // Katastr — statické routy PŘED parametrickými (jinak {koncept:id} matchne "katastr")
    Route::post('koncept-v3/katastr/parcela', [KonceptV3Controller::class, 'nactiParcelu'])->name('koncept-v3.katastr.parcela');
    Route::post('koncept-v3/katastr/stavby', [KonceptV3Controller::class, 'nactiStavby'])->name('koncept-v3.katastr.stavby');
    Route::post('koncept-v3/katastr/vyskovy-profil', [KonceptV3Controller::class, 'nactiVyskovy'])->name('koncept-v3.katastr.vyskovy');
    Route::post('koncept-v3/katastr/sousednost', [KonceptV3Controller::class, 'overSousednost'])->name('koncept-v3.katastr.sousednost');
    Route::post('koncept-v3/katastr/okolni', [KonceptV3Controller::class, 'nactiOkolniParcely'])->name('koncept-v3.katastr.okolni');
    Route::post('koncept-v3/vysvetleni', [KonceptV3Controller::class, 'vysvetleniPojmu'])->name('koncept-v3.vysvetleni');
    // Parametrické routy — {koncept:id} na konci (model KonceptV3 přes type-hint v controlleru)
    Route::patch('koncept-v3/{koncept:id}/ulozit', [KonceptV3Controller::class, 'ulozit'])->name('koncept-v3.ulozit');
    Route::delete('koncept-v3/{koncept:id}', [KonceptV3Controller::class, 'smazat'])->name('koncept-v3.smazat');
    Route::post('koncept-v3/{koncept:id}/ai-uprav', [KonceptV3Controller::class, 'aiUprav'])->name('koncept-v3.aiUprav');
    Route::get('koncept-v3/{koncept:id}/export', [KonceptV3Controller::class, 'exportJson'])->name('koncept-v3.export');
    Route::patch('koncept-v3/{koncept:id}/katastr', [KonceptV3Controller::class, 'ulozitKatastr'])->name('koncept-v3.katastr.ulozit');

    // Podklad pro import půdorysu (PDF/obrázek → obrázek + vektory pro analýzu v prohlížeči)
    Route::get('koncept-v3/podklad/seznam', [KonceptV3PodkladController::class, 'seznam'])->name('koncept-v3.podklad.seznam');
    Route::post('koncept-v3/podklad/nahrat', [KonceptV3PodkladController::class, 'nahrat'])->name('koncept-v3.podklad.nahrat');
    Route::post('koncept-v3/podklad/{otisk}/strana', [KonceptV3PodkladController::class, 'strana'])->name('koncept-v3.podklad.strana');
    Route::post('koncept-v3/podklad/{otisk}/nastaveni', [KonceptV3PodkladController::class, 'nastaveni'])->name('koncept-v3.podklad.nastaveni');
    Route::get('koncept-v3/podklad/{otisk}/nahled/{strana}', [KonceptV3PodkladController::class, 'nahled'])->name('koncept-v3.podklad.nahled');
    Route::get('koncept-v3/podklad/{otisk}/obrazek/{strana}/{dpi}', [KonceptV3PodkladController::class, 'obrazek'])->name('koncept-v3.podklad.obrazek');
    Route::get('koncept-v3/podklad/{otisk}/vektor/{strana}', [KonceptV3PodkladController::class, 'vektor'])->name('koncept-v3.podklad.vektor');
    Route::get('koncept-v3/podklad/{otisk}/vrstvy/{strana}', [KonceptV3PodkladController::class, 'vrstvy'])->name('koncept-v3.podklad.vrstvy');

    // ───────── Koncept testování (porovnání modelů, ASCII) ─────────
    Route::get('koncept-testovani', [KonceptTestovaniController::class, 'index'])->name('koncept-testovani');
    Route::post('koncept-testovani/prompt', [KonceptTestovaniController::class, 'ulozitPrompt'])->name('koncept-testovani.prompt');
    Route::post('koncept-testovani/generovat', [KonceptTestovaniController::class, 'generovat'])->name('koncept-testovani.generovat');

    // ───────── Koncept solver (balonky / bublinový diagram) ─────────
    Route::get('koncept-solver', fn () => view('masterteam.koncept-solver'))->name('koncept-solver');

    // ───────── Pravidla objektů ─────────
    Route::get('pravidla-objektu', [PravidlaObjektuController::class, 'index'])->name('pravidla-objektu.index');
    Route::get('pravidla-objektu/nova', [PravidlaObjektuController::class, 'create'])->name('pravidla-objektu.create');
    Route::post('pravidla-objektu', [PravidlaObjektuController::class, 'store'])->name('pravidla-objektu.store');
    Route::get('pravidla-objektu/{pravidlo:id}/edit', [PravidlaObjektuController::class, 'edit'])->name('pravidla-objektu.edit');
    Route::patch('pravidla-objektu/{pravidlo:id}', [PravidlaObjektuController::class, 'update'])->name('pravidla-objektu.update');
    Route::delete('pravidla-objektu/{pravidlo:id}', [PravidlaObjektuController::class, 'destroy'])->name('pravidla-objektu.destroy');
    Route::post('pravidla-objektu/generovat', [PravidlaObjektuController::class, 'generovat'])->name('pravidla-objektu.generovat');
    Route::post('pravidla-objektu/obnovit', [PravidlaObjektuController::class, 'obnovitVse'])->name('pravidla-objektu.obnovit');

    // Bugy — auto-zachytávané backend i frontend bugy pro masterteam
    Route::get('bugy', [BugyController::class, 'index'])->name('bugy');
    Route::get('bugy/{bug}', [BugyController::class, 'show'])->name('bugy.show');
    Route::patch('bugy/{bug}/opraveno', [BugyController::class, 'oznacOpraveno'])->name('bugy.opraveno');
    Route::delete('bugy/{bug}', [BugyController::class, 'smazat'])->name('bugy.smazat');
    // Starý odkaz na přehled (záložky, historie prohlížeče)
    Route::redirect('chyby', '/masterteam/bugy');

    // 404 — ztracené URL (záložka v přehledu bugů)
    Route::get('seo-404', [Seo404Controller::class, 'index'])->name('seo404');
    Route::delete('seo-404/{seo404}', [Seo404Controller::class, 'smazat'])->name('seo404.smazat');
});

// ───────── Právní stránky (veřejný web) ─────────
Route::middleware('subdomena:web')->group(function () {
    Route::get('/terms', [App\Http\Controllers\PravniController::class, 'podminky'])->name('pravni.podminky');
    Route::get('/privacy', [App\Http\Controllers\PravniController::class, 'soukromi'])->name('pravni.soukromi');
});

// ───────── Zákaznická aplikace (app.tuptudu.com) ─────────
// Adresy anglicky (vidí je zákazník), názvy v kódu česky. Projekt = KonceptV3,
// v adrese ho určuje náhodný `kod`. Editor je stejná šablona jako v masterteamu,
// API routy mají stejné přípony názvů (app.projekty.* ↔ masterteam.koncept-v3.*).
Route::middleware(['subdomena:app', 'auth', 'verified'])->name('app.')->group(function () {
    Route::get('/projects', [App\Http\Controllers\Aplikace\ProjektyController::class, 'index'])->name('projekty');
    Route::post('/projects', [App\Http\Controllers\Aplikace\ProjektyController::class, 'novy'])->name('projekty.novy');
    Route::get('/projects/{kod}', [App\Http\Controllers\Aplikace\ProjektyController::class, 'editor'])
        ->where('kod', '[a-z0-9]{5,12}')->name('projekty.editor');

    // API editoru (volá JS editoru, adresy v prohlížeči nejsou vidět)
    Route::prefix('editor')->name('projekty.')->group(function () {
        Route::post('create', [KonceptV3Controller::class, 'vytvorit'])->name('vytvorit');
        Route::post('ai-create', [KonceptV3Controller::class, 'aiVytvor'])->middleware('throttle:10,1')->name('aiVytvor');
        Route::post('explain', [KonceptV3Controller::class, 'vysvetleniPojmu'])->middleware('throttle:30,1')->name('vysvetleni');

        // Katastr jen v zemích, které ho mají (config/lokalizace.php)
        Route::middleware('funkce:katastr')->group(function () {
            Route::post('land/parcel', [KonceptV3Controller::class, 'nactiParcelu'])->name('katastr.parcela');
            Route::post('land/buildings', [KonceptV3Controller::class, 'nactiStavby'])->name('katastr.stavby');
            Route::post('land/nearby', [KonceptV3Controller::class, 'nactiOkolniParcely'])->name('katastr.okolni');
            Route::post('land/neighbours', [KonceptV3Controller::class, 'overSousednost'])->name('katastr.sousednost');
            Route::patch('{koncept:id}/land', [KonceptV3Controller::class, 'ulozitKatastr'])->name('katastr.ulozit');
        });
        Route::post('land/elevation', [KonceptV3Controller::class, 'nactiVyskovy'])->middleware('funkce:vyskovy_profil')->name('katastr.vyskovy');

        // Podklad pro import půdorysu (výkres PDF/obrázek)
        Route::get('plans', [KonceptV3PodkladController::class, 'seznam'])->name('podklad.seznam');
        Route::post('plans', [KonceptV3PodkladController::class, 'nahrat'])->name('podklad.nahrat');
        Route::post('plans/{otisk}/page', [KonceptV3PodkladController::class, 'strana'])->name('podklad.strana');
        Route::post('plans/{otisk}/settings', [KonceptV3PodkladController::class, 'nastaveni'])->name('podklad.nastaveni');
        Route::get('plans/{otisk}/preview/{strana}', [KonceptV3PodkladController::class, 'nahled'])->name('podklad.nahled');
        Route::get('plans/{otisk}/image/{strana}/{dpi}', [KonceptV3PodkladController::class, 'obrazek'])->name('podklad.obrazek');
        Route::get('plans/{otisk}/vector/{strana}', [KonceptV3PodkladController::class, 'vektor'])->name('podklad.vektor');
        Route::get('plans/{otisk}/layers/{strana}', [KonceptV3PodkladController::class, 'vrstvy'])->name('podklad.vrstvy');

        // Parametrické na konec ({koncept:id} — kontrolu vlastníka dělá controller)
        Route::patch('{koncept:id}/save', [KonceptV3Controller::class, 'ulozit'])->name('ulozit');
        Route::post('{koncept:id}/ai-edit', [KonceptV3Controller::class, 'aiUprav'])->middleware('throttle:10,1')->name('aiUprav');
        Route::delete('{koncept:id}', [KonceptV3Controller::class, 'smazat'])->name('smazat');
    });

    // Účet
    Route::get('/account', [App\Http\Controllers\Aplikace\UcetController::class, 'upravit'])->name('ucet');
    Route::patch('/account', [App\Http\Controllers\Aplikace\UcetController::class, 'ulozit'])->name('ucet.ulozit');
    Route::put('/account/password', [App\Http\Controllers\Aplikace\UcetController::class, 'zmenitHeslo'])->name('ucet.heslo');
});
