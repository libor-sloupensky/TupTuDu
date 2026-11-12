<?php

use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\BugController;
use App\Http\Controllers\Masterteam\BugyController;
use App\Http\Controllers\Masterteam\KonceptTestovaniController;
use App\Http\Controllers\Masterteam\KonceptV3Controller;
use App\Http\Controllers\Masterteam\KonceptV3PodkladController;
use App\Http\Controllers\Masterteam\PravidlaObjektuController;
use App\Http\Controllers\Masterteam\Seo404Controller;
use App\Http\Controllers\Masterteam\StatistikyController;
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
        // Nepřihlášenému celá titulní stránka (popis produktu, ukázky, odkaz na ceník), ne holý login —
        // Paddle schvaluje app.tuptudu.com jako doménu pokladny a za přihlášení nevidí.
        // Samotný ceník (tlačítka vedou na login) vyhodnotil 30. 10. 2026 jako login wall.
        return auth()->check() ? redirect('/projects') : view('vitrina.index');
    }

    // Web: každý jazyk má vlastní adresu. Výchozí stránka jen přesměruje podle volby a polohy.
    if (Domeny::jeWeb()) {
        return redirect('/' . app()->getLocale());
    }

    return view('vitrina.index');
});

// robots.txt a sitemap.xml — obsah podle části (web indexovat, app a masterteam ne), viz SeoController.
Route::get('/robots.txt', [App\Http\Controllers\SeoController::class, 'robots'])->name('seo.robots');
Route::get('/sitemap.xml', [App\Http\Controllers\SeoController::class, 'sitemap'])->name('seo.sitemap');

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

// Přenos dat analýzy konkurence na produkci (token v hlavičce X-DB-Token), modules/konkurence.md
Route::post('/interni/konkurence/import', [App\Http\Controllers\Masterteam\KonkurenceController::class, 'importPresToken'])
    ->middleware('throttle:6,1')->name('interni.konkurence.import');

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
    // Přehled = statistiky: návštěvy, registrace s platícími, vyhledávání a indexace (modules/statistiky.md)
    Route::get('/', [StatistikyController::class, 'index'])->name('dashboard');

    // Data grafů na Přehledu; samostatná adresa statistik vede na Přehled
    Route::redirect('statistiky', '/masterteam');
    Route::get('statistiky/registrace', [StatistikyController::class, 'registraceData'])->name('statistiky.registrace');
    Route::get('statistiky/navstevy', [StatistikyController::class, 'navstevyData'])->name('statistiky.navstevy');
    Route::get('statistiky/vyhledavani', [StatistikyController::class, 'vyhledavaniData'])->name('statistiky.vyhledavani');
    Route::get('statistiky/cesta', [StatistikyController::class, 'cestaData'])->name('statistiky.cesta');

    // Správa uživatelů master týmu
    Route::get('uzivatele', [UzivateleController::class, 'index'])->name('uzivatele.index');
    Route::post('uzivatele', [UzivateleController::class, 'store'])->name('uzivatele.store');
    Route::patch('uzivatele/{uzivatel}/role', [UzivateleController::class, 'toggleRole'])->name('uzivatele.role');
    Route::delete('uzivatele/{uzivatel}', [UzivateleController::class, 'destroy'])->name('uzivatele.destroy');

    // ───────── Koncept V3 (editor, tabulka koncepty_v3) ─────────
    Route::get('koncept-v3', [KonceptV3Controller::class, 'indexK'])->name('koncept-v3');
    Route::post('koncept-v3/vytvorit', [KonceptV3Controller::class, 'vytvorit'])->name('koncept-v3.vytvorit');
    Route::post('koncept-v3/import-pudorys', [KonceptV3Controller::class, 'importZPudorysu'])->name('koncept-v3.import-pudorys');
    // Katastr — statické routy PŘED parametrickými (jinak {koncept:id} matchne "katastr")
    Route::post('koncept-v3/katastr/parcela', [KonceptV3Controller::class, 'nactiParcelu'])->name('koncept-v3.katastr.parcela');
    Route::post('koncept-v3/katastr/stavby', [KonceptV3Controller::class, 'nactiStavby'])->name('koncept-v3.katastr.stavby');
    Route::post('koncept-v3/katastr/vyskovy-profil', [KonceptV3Controller::class, 'nactiVyskovy'])->name('koncept-v3.katastr.vyskovy');
    Route::post('koncept-v3/katastr/sousednost', [KonceptV3Controller::class, 'overSousednost'])->name('koncept-v3.katastr.sousednost');
    Route::post('koncept-v3/katastr/okolni', [KonceptV3Controller::class, 'nactiOkolniParcely'])->name('koncept-v3.katastr.okolni');
    Route::post('koncept-v3/katastr/bod', [KonceptV3Controller::class, 'nactiParceluVBode'])->name('koncept-v3.katastr.bod');
    Route::post('koncept-v3/katastr/info', [KonceptV3Controller::class, 'infoMista'])->name('koncept-v3.katastr.info');
    Route::get('koncept-v3/katastr/dlazdice/{zeme}', [KonceptV3Controller::class, 'dlazdiceParcel'])->where('zeme', '[A-Za-z]{2}')->name('koncept-v3.katastr.dlazdice');
    Route::post('koncept-v3/vysvetleni', [KonceptV3Controller::class, 'vysvetleniPojmu'])->name('koncept-v3.vysvetleni');
    // Parametrické routy — {koncept:id} na konci (model KonceptV3 přes type-hint v controlleru)
    Route::patch('koncept-v3/{koncept:id}/ulozit', [KonceptV3Controller::class, 'ulozit'])->name('koncept-v3.ulozit');
    Route::delete('koncept-v3/{koncept:id}', [KonceptV3Controller::class, 'smazat'])->name('koncept-v3.smazat');
    Route::get('koncept-v3/{koncept:id}/export', [KonceptV3Controller::class, 'exportJson'])->name('koncept-v3.export');
    Route::get('koncept-v3/{koncept:id}/sdileni', [App\Http\Controllers\KonceptV3SdileniController::class, 'stav'])->name('koncept-v3.sdileni');
    Route::post('koncept-v3/{koncept:id}/sdileni', [App\Http\Controllers\KonceptV3SdileniController::class, 'uloz']);
    Route::delete('koncept-v3/{koncept:id}/sdileni', [App\Http\Controllers\KonceptV3SdileniController::class, 'vypni']);
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

    // Analýza konkurence v DB (modules/konkurence.md)
    Route::get('konkurence', [App\Http\Controllers\Masterteam\KonkurenceController::class, 'index'])->name('konkurence');
    Route::get('konkurence/{konkurent:klic}/profil', [App\Http\Controllers\Masterteam\KonkurenceController::class, 'nahledProfilu'])->name('konkurence.profil');
    Route::get('konkurence/{konkurent:klic}/srovnani', [App\Http\Controllers\Masterteam\KonkurenceController::class, 'nahledSrovnani'])->name('konkurence.srovnani');
    Route::patch('konkurence/parametr/{parametr}/rezim', [App\Http\Controllers\Masterteam\KonkurenceController::class, 'rezimParametru'])->name('konkurence.parametr.rezim');
    Route::patch('konkurence/konkurent/{konkurent}/rezim', [App\Http\Controllers\Masterteam\KonkurenceController::class, 'rezimKonkurenta'])->name('konkurence.konkurent.rezim');
});

// ───────── Veřejný web: titulka, ceník, právní stránky a kontakt ─────────
Route::middleware('subdomena:web')->group(function () {
    // Každá stránka má adresu s jazykem (tuptudu.com/de/pricing), kvůli vyhledávačům (modules/lokalizace.md).
    // Nová veřejná stránka patří sem a do SeoController::STRANKY_WEBU. route() jazyk doplní sám (URL::defaults).
    Route::prefix('{jazyk}')->whereIn('jazyk', App\Support\Lokalizace::jazyky())->group(function () {
        Route::get('/', fn () => view('vitrina.index'))->name('web.uvod');
        Route::get('/terms', [App\Http\Controllers\PravniController::class, 'podminky'])->name('pravni.podminky');
        Route::get('/privacy', [App\Http\Controllers\PravniController::class, 'soukromi'])->name('pravni.soukromi');
        Route::get('/refunds', [App\Http\Controllers\PravniController::class, 'vraceni'])->name('pravni.vraceni');
        Route::get('/model-credits', [App\Http\Controllers\PravniController::class, 'autoriModelu'])->name('autori-modelu');
        Route::get('/pricing', [App\Http\Controllers\CenikController::class, 'index'])->name('cenik');
        Route::get('/contact', [App\Http\Controllers\KontaktController::class, 'formular'])->name('kontakt');
        // 5 zpráv za 10 minut z jedné IP — člověku stačí, spam brzdí
        Route::post('/contact', [App\Http\Controllers\KontaktController::class, 'odeslat'])
            ->middleware('throttle:5,10')->name('kontakt.odeslat');
    });
    // Články jen v jazycích, které je mají (modules/blog.md)
    foreach (App\Support\Clanky::SEGMENTY as $jazyk => $segment) {
        Route::prefix($jazyk . '/' . $segment)->group(function () {
            Route::get('/', [App\Http\Controllers\ClankyController::class, 'prehled']);
            Route::get('/{adresa}', [App\Http\Controllers\ClankyController::class, 'detail'])->where('adresa', '[a-z0-9-]+');
        });
    }
    // Adresy bez jazyka (starší odkazy, Paddle) přesměrují podle volby a polohy
    Route::get('/{stranka}', fn (Illuminate\Http\Request $request) => redirect('/' . app()->getLocale() . $request->getRequestUri()))
        ->whereIn('stranka', ['terms', 'privacy', 'refunds', 'model-credits', 'pricing', 'contact']);
    // Odkaz na stav projektu pro čtení, bez přihlášení (modules/sdileni.md)
    Route::middleware('throttle:120,1')->group(function () {
        Route::get('/share/{token}', [App\Http\Controllers\KonceptV3SdileniController::class, 'zobraz'])->name('sdileni.zobraz');
        Route::get('/share/{token}/model', [App\Http\Controllers\KonceptV3SdileniController::class, 'model']);
        Route::get('/share/{token}/logo', [App\Http\Controllers\KonceptV3SdileniController::class, 'logo']);
        Route::get('/share/{token}/soubor/{soubor}', [App\Http\Controllers\KonceptV3SdileniController::class, 'obrazek']);
    });
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
        Route::post('explain', [KonceptV3Controller::class, 'vysvetleniPojmu'])->middleware('throttle:30,1')->name('vysvetleni');
        Route::post('usage', [KonceptV3Controller::class, 'zmerFunkci'])->middleware('throttle:60,1')->name('mereni');

        // Hledání české parcely podle katastrálního území a čísla jen pro uživatele z ČR (config/lokalizace.php)
        Route::post('land/parcel', [KonceptV3Controller::class, 'nactiParcelu'])->middleware('funkce:katastr_cislo')->name('katastr.parcela');
        // Pozemek z mapy funguje v každé zemi, zdroj dat podle polohy (config/pozemky.php)
        Route::post('land/at-point', [KonceptV3Controller::class, 'nactiParceluVBode'])->middleware('throttle:60,1')->name('katastr.bod');
        Route::post('land/info', [KonceptV3Controller::class, 'infoMista'])->middleware('throttle:120,1')->name('katastr.info');
        Route::get('land/tile/{zeme}', [KonceptV3Controller::class, 'dlazdiceParcel'])->where('zeme', '[A-Za-z]{2}')->middleware('throttle:600,1')->name('katastr.dlazdice');
        Route::post('land/buildings', [KonceptV3Controller::class, 'nactiStavby'])->name('katastr.stavby');
        Route::post('land/nearby', [KonceptV3Controller::class, 'nactiOkolniParcely'])->name('katastr.okolni');
        Route::post('land/neighbours', [KonceptV3Controller::class, 'overSousednost'])->name('katastr.sousednost');
        Route::patch('{koncept:id}/land', [KonceptV3Controller::class, 'ulozitKatastr'])->name('katastr.ulozit');
        Route::post('land/elevation', [KonceptV3Controller::class, 'nactiVyskovy'])->name('katastr.vyskovy');

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
        Route::get('{koncept:id}/share', [App\Http\Controllers\KonceptV3SdileniController::class, 'stav'])->name('sdileni');
        Route::post('{koncept:id}/share', [App\Http\Controllers\KonceptV3SdileniController::class, 'uloz'])->middleware('throttle:20,1');
        Route::delete('{koncept:id}/share', [App\Http\Controllers\KonceptV3SdileniController::class, 'vypni']);
        Route::delete('{koncept:id}', [KonceptV3Controller::class, 'smazat'])->name('smazat');
    });

    // Účet
    Route::get('/account', [App\Http\Controllers\Aplikace\UcetController::class, 'upravit'])->name('ucet');
    Route::patch('/account', [App\Http\Controllers\Aplikace\UcetController::class, 'ulozit'])->name('ucet.ulozit');
    Route::put('/account/password', [App\Http\Controllers\Aplikace\UcetController::class, 'zmenitHeslo'])->name('ucet.heslo');
    // Logo firmy pro tarif Profi (modules/platby.md); GET čte i export v editoru
    Route::get('/account/logo', [App\Http\Controllers\Aplikace\LogoFirmyController::class, 'zobraz'])->name('ucet.logo');
    Route::post('/account/logo', [App\Http\Controllers\Aplikace\LogoFirmyController::class, 'ulozit'])->middleware('throttle:20,1')->name('ucet.logo.ulozit');
    Route::delete('/account/logo', [App\Http\Controllers\Aplikace\LogoFirmyController::class, 'smazat'])->name('ucet.logo.smazat');

    // Předplatné (Paddle přes Laravel Cashier, modules/platby.md). Zprávy z Paddlu
    // chodí na POST /paddle/webhook — routu registruje Cashier sám.
    Route::prefix('billing')->name('predplatne')->controller(App\Http\Controllers\Aplikace\PredplatneController::class)->group(function () {
        Route::get('/', 'index');
        Route::get('status', 'stav')->name('.stav');
        Route::get('change', 'nahled')->middleware('throttle:20,1')->name('.nahled');
        Route::post('change', 'zmenit')->middleware('throttle:10,1')->name('.zmenit');
        Route::post('cancel', 'zrusit')->middleware('throttle:10,1')->name('.zrusit');
        Route::post('resume', 'obnovit')->middleware('throttle:10,1')->name('.obnovit');
        Route::get('payment-method', 'karta')->middleware('throttle:10,1')->name('.karta');
        Route::get('invoices/{transakce}', 'doklad')->whereNumber('transakce')->name('.doklad');
    });
});
