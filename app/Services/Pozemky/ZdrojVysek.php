<?php

namespace App\Services\Pozemky;

/** Digitální model terénu jedné země. */
interface ZdrojVysek
{
    /**
     * Výšky terénu pro body [[lat, lon], ...] ve stejném pořadí, null kde data nejsou.
     * Volá se se stovkami až tisíci bodů najednou (mřížka 2 m na pozemku).
     */
    public function vysky(array $body): array;
}
