<?php

namespace App\Console\Commands;

use App\Models\KonceptV3;
use App\Models\Uzivatel;
use App\Support\Mereni;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Cesta od registrace k placení a používání funkcí editoru za období (modules/marketing.md, Analýza webu).
 * Počítá z dat, která už máme: uživatelé, projekty, denní úpravy, předplatné a souhrnné počty funkcí.
 * Master tým se nepočítá. Jen čte.
 */
class MereniCesta extends Command
{
    protected $signature = 'mereni:cesta {--dni=30 : Registrace za posledních N dní}';

    protected $description = 'Kolik registrovaných došlo k projektu, ke stěnám, vrátilo se a zaplatilo; použití funkcí editoru';

    public function handle(): int
    {
        $dni = max(1, (int) $this->option('dni'));
        $od = now()->subDays($dni)->startOfDay();

        $master = DB::table('uzivatel_subjekt')
            ->join('subjekty', 'subjekty.id', '=', 'uzivatel_subjekt.subjekt_id')
            ->where('subjekty.ico', config('app.master_ico'))
            ->pluck('uzivatel_subjekt.uzivatel_id');
        $uzivatele = Uzivatel::where(Uzivatel::CREATED_AT, '>=', $od)->whereNotIn('id', $master)->get(['id', 'email_overen_v']);
        $ids = $uzivatele->pluck('id');

        $projekty = KonceptV3::whereIn('uzivatel_id', $ids)->get(['uzivatel_id', 'data']);
        // Stěny jsou v datech aktivního podlaží nebo v uložených podlažích domu
        $seStenami = $projekty->filter(fn ($p) => str_contains(json_encode($p->data ?? []), '"steny":[{'))->pluck('uzivatel_id')->unique();
        $vratili = DB::table('denni_upravy')->whereIn('uzivatel_id', $ids)
            ->select('uzivatel_id')->groupBy('uzivatel_id')->havingRaw('COUNT(DISTINCT den) >= 2')->pluck('uzivatel_id');
        $platici = DB::table('subscriptions')->where('billable_type', (new Uzivatel)->getMorphClass())
            ->whereIn('billable_id', $ids)->whereIn('status', ['active', 'trialing', 'past_due'])->distinct()->pluck('billable_id');

        $kroky = [
            ['Registrace', $ids->count()],
            ['Ověřený e-mail', $uzivatele->whereNotNull('email_overen_v')->count()],
            ['Založil projekt', $projekty->pluck('uzivatel_id')->unique()->count()],
            ['Nakreslil stěny', $seStenami->count()],
            ['Upravoval aspoň 2 různé dny', $vratili->count()],
            ['Platí', $platici->count()],
        ];
        $zaklad = max(1, $kroky[0][1]);
        $this->line("Cesta k projektu, registrace za posledních {$dni} dní (bez master týmu):");
        $this->table(['Krok', 'Uživatelů', 'Z registrací'], array_map(
            fn ($k) => [$k[0], $k[1], round($k[1] / $zaklad * 100) . ' %'],
            $kroky,
        ));

        $funkce = DB::table('statistika_funkci')->where('den', '>=', $od->toDateString())
            ->select('funkce', DB::raw('SUM(pocet) AS pocet'), DB::raw('COUNT(*) AS dni'))
            ->groupBy('funkce')->pluck('pocet', 'funkce');
        $this->line('Funkce editoru (prohlížeč nejvýš jednou za den):');
        $this->table(['Funkce', 'Použití'], array_map(fn ($f) => [$f, (int) ($funkce[$f] ?? 0)], Mereni::FUNKCE));
        $this->line('Denní úpravy se drží ' . config('uchovavani.denni_upravy_mesicu') . ' měsíce, starší návraty se nezapočtou.');

        return self::SUCCESS;
    }
}
