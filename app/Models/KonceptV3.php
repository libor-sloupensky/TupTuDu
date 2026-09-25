<?php

namespace App\Models;

/**
 * Koncept V3 — stejný model jako Koncept, jen vlastní tabulka.
 * Dědí z Koncept, takže projde všude, kde služby očekávají Koncept
 * (KonceptAiService, PravidlaService, RozhovorService).
 */
class KonceptV3 extends Koncept
{
    protected $table = 'koncepty_v3';
}
