<?php

namespace App\Http\Controllers\Masterteam;

use App\Http\Controllers\Controller;
use App\Models\Seo404;
use Illuminate\Http\Request;

class Seo404Controller extends Controller
{
    public function index(Request $request)
    {
        $razeni = $request->input('razeni', 'pocet'); // pocet / naposledy / prvni
        $zdroj = $request->input('zdroj', 'externi'); // externi / interni / direct / vse
        $kdo = $request->input('kdo', 'lide');         // lide / boti / vse

        // Filtruje se Eloquent kolekcí (jeBot je metoda PHP) — paginate
        // dělá ručně přes Collection po filtraci. Tabulka má pár tisíc
        // řádků, pro SEO analýzu výkon stačí.
        $vse = Seo404::query()->get();

        $vse = $vse->filter(function ($z) use ($zdroj) {
            $host = $z->referer ? strtolower(parse_url($z->referer, PHP_URL_HOST) ?? '') : '';
            return match ($zdroj) {
                'externi' => $z->referer && $host !== '' && !str_ends_with($host, 'tuptudu.com'),
                'interni' => $z->referer && str_ends_with($host, 'tuptudu.com'),
                'direct'  => !$z->referer,
                default   => true,
            };
        });

        if ($kdo !== 'vse') {
            $vse = $vse->filter(fn ($z) => $kdo === 'boti' ? $z->jeBot() : !$z->jeBot());
        }

        $vse = match ($razeni) {
            'naposledy' => $vse->sortByDesc('naposledy_v'),
            'prvni'     => $vse->sortByDesc('prvni_v'),
            default     => $vse->sortBy([['pocet_vyskytu', 'desc'], ['naposledy_v', 'desc']]),
        };

        // Ručně paginate filtrovanou kolekci
        $strana = (int) $request->input('page', 1);
        $perPage = 50;
        $celkem = $vse->count();
        $zaznamy = new \Illuminate\Pagination\LengthAwarePaginator(
            $vse->slice(($strana - 1) * $perPage, $perPage)->values(),
            $celkem,
            $perPage,
            $strana,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        $statistiky = [
            'unique' => $celkem,
            'celkem_vyskytu' => (int) $vse->sum('pocet_vyskytu'),
            'za_24h' => $vse->filter(fn ($z) => $z->naposledy_v >= now()->subDay())->count(),
        ];

        $pocty = \App\Models\Bug::poctyZalozek();

        return view('masterteam.seo404.index', compact(
            'zaznamy', 'statistiky', 'razeni', 'pocty', 'zdroj', 'kdo'
        ));
    }

    public function smazat(Seo404 $seo404)
    {
        $seo404->delete();
        return response()->json(['ok' => true]);
    }
}
