<h1>Zásady ochrany osobních údajů</h1>
<p>Účinné od: 30. 10. 2026</p>

<h2>1. Správce</h2>
<p>
    Správcem osobních údajů je <strong>WormUP s.r.o.</strong>, IČO 07994605, se sídlem Žamberecká 483,
    517 54 Vamberk, Česká republika (dále „my“). S dotazy a žádostmi se obracejte přes
    <a href="{{ \App\Support\Domeny::url('web', '/contact?tema=osobni_udaje') }}">kontaktní formulář</a> nebo písemně na adresu sídla.
</p>

<h2>2. Jaké údaje zpracováváme a proč</h2>
<table>
    <tr><th>Údaje</th><th>Účel</th><th>Právní základ</th></tr>
    <tr>
        <td>Jméno, příjmení, e-mail, heslo (jen v zašifrované podobě), zvolený jazyk a země, čas souhlasu s podmínkami</td>
        <td>Vedení účtu a poskytování služby</td>
        <td>Plnění smlouvy (čl. 6 odst. 1 písm. b GDPR)</td>
    </tr>
    <tr>
        <td>Při přihlášení přes Google: jméno, e-mail a identifikátor účtu Google</td>
        <td>Přihlášení bez hesla</td>
        <td>Plnění smlouvy</td>
    </tr>
    <tr>
        <td>Projekty a nahrané podklady (výkresy, obrázky), zadaná čísla parcel</td>
        <td>Práce na projektu, ukládání a zobrazení</td>
        <td>Plnění smlouvy</td>
    </tr>
    <tr>
        <td>IP adresa</td>
        <td>Určení země návštěvníka kvůli výchozímu jazyku a dostupným funkcím (z lokální databáze, nikam se neodesílá); zabezpečení a ochrana proti zneužití</td>
        <td>Oprávněný zájem (čl. 6 odst. 1 písm. f GDPR)</td>
    </tr>
    <tr>
        <td>Jméno, e-mail a text zprávy z kontaktního formuláře</td>
        <td>Vyřízení dotazu nebo žádosti a odpověď na ni</td>
        <td>Oprávněný zájem; u žádostí k účtu plnění smlouvy</td>
    </tr>
    <tr>
        <td>Údaje o předplatném: tarif, stav a období předplatného, identifikátory zákazníka a předplatného u Paddle,
            přehled plateb (datum, částka, měna, číslo dokladu). Údaje o platební kartě nezískáváme.</td>
        <td>Poskytování placeného tarifu, správa předplatného a zobrazení dokladů</td>
        <td>Plnění smlouvy</td>
    </tr>
    <tr>
        <td>Počet úprav v editoru za den</td>
        <td>Denní limit úprav v tarifu Zdarma</td>
        <td>Plnění smlouvy</td>
    </tr>
    <tr>
        <td>Technické záznamy o chybách (adresa stránky, prohlížeč, IP adresa, ID uživatele)</td>
        <td>Odhalování a oprava chyb služby</td>
        <td>Oprávněný zájem</td>
    </tr>
</table>
<p>Údaje nepoužíváme k profilování ani k automatizovanému rozhodování a neprodáváme je.</p>

<h2>3. Cookies</h2>
<p>
    Používáme nezbytné cookies: pro přihlášení (relace), ochranu formulářů (CSRF) a zapamatování
    zvoleného jazyka.
</p>

<h2>4. Kdo s údaji pracuje</h2>
<ul>
    <li><strong>THINline s.r.o.</strong> (Český hosting), IČO 26747359, Jeseniova 1196/52, Praha 3 — servery a e-mail v České republice.</li>
    <li><strong>Google</strong> — jen pokud se přihlásíte přes Google (Google Ireland Ltd. / Google LLC).</li>
    <li><strong>Paddle.com Market Limited</strong> (Londýn, Spojené království) — náš online prodejce placených tarifů
        (Merchant of Record). Platební a fakturační údaje (jméno, e-mail, země a adresa, platební karta) zadáváte
        přímo do platebního okna Paddle a Paddle je zpracovává jako samostatný správce podle svých
        <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener">zásad ochrany osobních údajů</a>.
        Od nás dostane jméno a e-mail vašeho účtu, my od něj stav předplatného a přehled plateb.</li>
    <li><strong>Poskytovatelé mapových a geografických dat</strong> — mapový podklad (Mapy.com, Seznam.cz, a.s.) a geologická data (Česká geologická služba) načítá přímo váš prohlížeč, takže tito poskytovatelé vidí vaši IP adresu. Katastrální a výškopisná data (v České republice od Českého úřadu zeměměřického a katastrálního) načítá náš server a odesílá jen označení parcely a souřadnice, ne vaše osobní údaje. Rozsah a poskytovatelé se liší podle země.</li>
</ul>

<h2>5. Předávání mimo EU</h2>
<p>
    Údaje ukládáme v EU. Mimo EU se mohou dostat jen při přihlášení přes Google (USA); Google je zapojen
    do rámce EU–USA pro ochranu údajů (Data Privacy Framework). Při placení předplatného se údaje dostanou
    ke společnosti Paddle ve Spojeném království, pro které platí rozhodnutí Evropské komise o odpovídající
    ochraně osobních údajů.
</p>

<h2>6. Jak dlouho údaje uchováváme</h2>
<ul>
    <li>Účet, projekty a podklady — po dobu trvání účtu; po jeho zrušení je smažeme.</li>
    <li>Údaje o předplatném a platbách — po dobu trvání účtu.</li>
    <li>Počty úprav v editoru — {{ config('uchovavani.denni_upravy_mesicu') }} měsíce.</li>
    <li>Zprávy z kontaktního formuláře — {{ config('uchovavani.kontaktni_zpravy_mesicu') }} měsíců od odeslání.</li>
    <li>Záznamy o chybách a technické logy — {{ config('uchovavani.technicke_zaznamy_mesicu') }} měsíců od posledního výskytu.</li>
    <li>Odkaz pro obnovu hesla — {{ config('auth.passwords.users.expire') }} minut.</li>
    <li>Údaje potřebné k plnění zákonných povinností (např. účetní doklady) — po dobu stanovenou zákonem.</li>
</ul>

<h2>7. Vaše práva</h2>
<p>
    Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování a přenositelnost
    a právo vznést námitku proti zpracování na základě oprávněného zájmu. Stačí nám napsat přes
    <a href="{{ \App\Support\Domeny::url('web', '/contact?tema=osobni_udaje') }}">kontaktní formulář</a> a uvést e-mail, na který je účet registrovaný — žádost
    ověříme zprávou na tento e-mail. Jméno, e-mail, jazyk a zemi můžete sami
    upravit v nastavení účtu. Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů
    (<a href="https://uoou.gov.cz" target="_blank">uoou.gov.cz</a>) nebo u dozorového úřadu ve své zemi.
</p>

<h2>8. Zdroj údajů o poloze</h2>
<p>Zemi podle IP adresy určujeme z databáze <a href="https://db-ip.com" target="_blank">DB-IP</a> uložené na našem serveru.</p>
