<?php

namespace App\Http\Controllers\Aplikace;

use App\Http\Controllers\Controller;
use App\Support\Tarif;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * Předplatné zákazníka (app.tuptudu.com/billing) — tarif, využití, platba přes
 * Paddle (Laravel Cashier), změna tarifu, zrušení, karta a doklady.
 * Tarify a ceny: config/tarify.php, App\Support\Tarif, modules/platby.md.
 *
 * Předplatné vzniká až zprávou z Paddlu (webhook → Cashier), ne tady: po zaplacení
 * se stránka vrátí s ?zaplaceno=1 a čeká na aktivaci (routa stav).
 */
class PredplatneController extends Controller
{
    public function index(Request $request)
    {
        $uzivatel = $request->user();
        $stav = Tarif::stav($uzivatel);
        $predplatne = $uzivatel->subscription();
        // zrušené po konci období = už žádné předplatné, nabídne se nové
        if ($predplatne?->canceled()) {
            $predplatne = null;
        }

        // Platební okno Paddlu jen tomu, kdo nemá rozjeté předplatné — nezaplacené
        // (past_due) se řeší kartou, jinak by vzniklo druhé předplatné.
        $nabidky = [];
        $platbaChyba = false;
        if (! $predplatne && ! $uzivatel->jeMaster() && Tarif::platbyZapnute()) {
            try {
                foreach (Tarif::PLACENE as $tarif) {
                    foreach (Tarif::OBDOBI as $obdobi) {
                        $nabidky[$tarif][$obdobi] = $uzivatel
                            ->subscribe(Tarif::cenaPaddle($tarif, $obdobi), 'default')
                            ->returnTo(route('app.predplatne', ['zaplaceno' => 1]))
                            ->options();
                    }
                }
            } catch (\Throwable $e) {
                // Zákazník vidí hlášku na stránce, my záznam v bugách (Log::error se zrcadlí)
                Log::error('Předplatné: nepodařilo se připravit platbu Paddle', [
                    'uzivatel_id' => $uzivatel->id,
                    'chyba' => $e->getMessage(),
                ]);
                $nabidky = [];
                $platbaChyba = true;
            }
        }

        $dalsiPlatba = null;
        if ($predplatne && $predplatne->active() && ! $predplatne->onGracePeriod()) {
            try {
                $dalsiPlatba = $predplatne->nextPayment();
            } catch (\Throwable $e) {
                Log::warning('Předplatné: další platbu z Paddlu nejde načíst', ['chyba' => $e->getMessage()]);
            }
        }

        return view('aplikace.predplatne', [
            'uzivatel' => $uzivatel,
            'stav' => $stav,
            'upravDnes' => Tarif::upravDnes($uzivatel),
            'predplatne' => $predplatne,
            'aktualniCena' => Tarif::podleCeny($predplatne?->items->first()?->price_id),
            'dalsiPlatba' => $dalsiPlatba,
            'nabidky' => $nabidky,
            'platbaChyba' => $platbaChyba,
            'platbyZapnute' => Tarif::platbyZapnute(),
            'mena' => Tarif::mena($uzivatel->zeme),
            'transakce' => $uzivatel->transactions()->limit(24)->get(),
            'zvyraznit' => $request->query('tarif'),
        ]);
    }

    /** Stav pro čekání po zaplacení — aktivuje se, až dorazí zpráva z Paddlu. */
    public function stav(Request $request)
    {
        $uzivatel = $request->user();

        return response()->json([
            'tarif' => Tarif::uzivatele($uzivatel),
            'predplatne' => (bool) $uzivatel->subscription()?->valid(),
        ]);
    }

    /** Změna tarifu nebo období — rozdíl Paddle dopočítá poměrně za zbývající dny. */
    public function zmenit(Request $request)
    {
        $data = $request->validate([
            'tarif' => ['required', Rule::in(Tarif::PLACENE)],
            'obdobi' => ['required', Rule::in(Tarif::OBDOBI)],
        ]);
        $predplatne = $this->platnePredplatne($request);
        // Naplánované zrušení by změnu odmítlo — nejdřív v předplatném pokračovat
        abort_if($predplatne->onGracePeriod(), 409);

        $cena = Tarif::cenaPaddle($data['tarif'], $data['obdobi']);
        abort_unless($cena, 404);
        if ($predplatne->hasPrice($cena)) {
            return redirect()->route('app.predplatne');
        }

        try {
            $predplatne->swap($cena);
        } catch (\Throwable $e) {
            Log::error('Předplatné: změna tarifu selhala', [
                'uzivatel_id' => $request->user()->id,
                'predplatne' => $predplatne->paddle_id,
                'cena' => $cena,
                'chyba' => $e->getMessage(),
            ]);

            return redirect()->route('app.predplatne')->with('chyba', __('tarify.zmena_chyba'));
        }

        return redirect()->route('app.predplatne')
            ->with('stav', __('tarify.zmeneno', ['tarif' => __('tarify.nazev.' . $data['tarif'])]));
    }

    /** Zrušení ke konci zaplaceného období — do té doby tarif platí. */
    public function zrusit(Request $request)
    {
        $predplatne = $this->platnePredplatne($request);

        try {
            $predplatne->cancel();
        } catch (\Throwable $e) {
            Log::error('Předplatné: zrušení selhalo', [
                'uzivatel_id' => $request->user()->id,
                'predplatne' => $predplatne->paddle_id,
                'chyba' => $e->getMessage(),
            ]);

            return redirect()->route('app.predplatne')->with('chyba', __('tarify.akce_chyba'));
        }

        return redirect()->route('app.predplatne')
            ->with('stav', __('tarify.zruseno', ['datum' => $predplatne->ends_at?->timezone(config('app.timezone'))->format('j. n. Y')]));
    }

    /** Zrušení si zákazník rozmyslel (ještě v zaplaceném období). */
    public function obnovit(Request $request)
    {
        $predplatne = $this->platnePredplatne($request);
        abort_unless($predplatne->onGracePeriod(), 409);

        try {
            $predplatne->stopCancelation();
        } catch (\Throwable $e) {
            Log::error('Předplatné: obnovení selhalo', [
                'uzivatel_id' => $request->user()->id,
                'predplatne' => $predplatne->paddle_id,
                'chyba' => $e->getMessage(),
            ]);

            return redirect()->route('app.predplatne')->with('chyba', __('tarify.akce_chyba'));
        }

        return redirect()->route('app.predplatne')->with('stav', __('tarify.obnoveno'));
    }

    /** Změna platební karty — stránka Paddlu (i u nezaplaceného předplatného). */
    public function karta(Request $request)
    {
        $predplatne = $request->user()->subscription();
        abort_unless($predplatne && ! $predplatne->canceled(), 404);

        try {
            return $predplatne->redirectToUpdatePaymentMethod();
        } catch (\Throwable $e) {
            Log::error('Předplatné: odkaz na změnu karty selhal', [
                'uzivatel_id' => $request->user()->id,
                'predplatne' => $predplatne->paddle_id,
                'chyba' => $e->getMessage(),
            ]);

            return redirect()->route('app.predplatne')->with('chyba', __('tarify.akce_chyba'));
        }
    }

    /** Doklad k platbě (PDF od Paddlu) — jen k vlastní platbě. */
    public function doklad(Request $request, int $transakce)
    {
        $platba = $request->user()->transactions()->findOrFail($transakce);
        abort_unless($platba->invoice_number, 404);

        try {
            return $platba->redirectToInvoicePdf();
        } catch (\Throwable $e) {
            Log::error('Předplatné: doklad z Paddlu nejde stáhnout', [
                'uzivatel_id' => $request->user()->id,
                'transakce' => $platba->paddle_id,
                'chyba' => $e->getMessage(),
            ]);

            return redirect()->route('app.predplatne')->with('chyba', __('tarify.akce_chyba'));
        }
    }

    /** Platné předplatné přihlášeného (aktivní, i když už zrušené ke konci období). */
    private function platnePredplatne(Request $request)
    {
        $predplatne = $request->user()->subscription();
        abort_unless($predplatne && $predplatne->valid(), 404);

        return $predplatne;
    }
}
