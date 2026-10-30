<h1>Privacy Policy</h1>
<p>Effective from: 30 October 2026</p>

<h2>1. Controller</h2>
<p>
    The controller of personal data is <strong>WormUP s.r.o.</strong>, company ID 07994605, registered office
    Žamberecká 483, 517 54 Vamberk, Czech Republic (“we”). Please send questions and requests via the
    <a href="{{ \App\Support\Domeny::url('web', '/contact?tema=osobni_udaje') }}">contact form</a> or in writing to our registered office.
</p>

<h2>2. What data we process and why</h2>
<table>
    <tr><th>Data</th><th>Purpose</th><th>Legal basis</th></tr>
    <tr>
        <td>First and last name, email, password (stored only in encrypted form), chosen language and country, time of accepting the terms</td>
        <td>Running your account and providing the service</td>
        <td>Performance of a contract (Art. 6(1)(b) GDPR)</td>
    </tr>
    <tr>
        <td>When signing in with Google: name, email and Google account identifier</td>
        <td>Sign-in without a password</td>
        <td>Performance of a contract</td>
    </tr>
    <tr>
        <td>Projects and uploaded materials (drawings, images), entered parcel numbers</td>
        <td>Working on the project, storing and displaying it</td>
        <td>Performance of a contract</td>
    </tr>
    <tr>
        <td>IP address</td>
        <td>Determining the visitor’s country for the default language and available features (from a local database, nothing is sent anywhere); security and abuse prevention</td>
        <td>Legitimate interest (Art. 6(1)(f) GDPR)</td>
    </tr>
    <tr>
        <td>Name, email and message text from the contact form</td>
        <td>Handling your question or request and replying to it</td>
        <td>Legitimate interest; for account requests, performance of a contract</td>
    </tr>
    <tr>
        <td>Subscription data: plan, subscription status and period, customer and subscription identifiers at Paddle,
            payment overview (date, amount, currency, receipt number). We do not receive payment card details.</td>
        <td>Providing a paid plan, managing the subscription and showing receipts</td>
        <td>Performance of a contract</td>
    </tr>
    <tr>
        <td>Number of editor edits per day</td>
        <td>The daily edit limit of the Free plan</td>
        <td>Performance of a contract</td>
    </tr>
    <tr>
        <td>Technical error records (page address, browser, IP address, user ID)</td>
        <td>Detecting and fixing errors in the service</td>
        <td>Legitimate interest</td>
    </tr>
</table>
<p>We do not use the data for profiling or automated decision-making, and we do not sell it.</p>

<h2>3. Cookies</h2>
<p>
    We use essential cookies: for sign-in (session), form protection (CSRF) and remembering the chosen
    language.
</p>

<h2>4. Who works with the data</h2>
<ul>
    <li><strong>THINline s.r.o.</strong> (Český hosting), company ID 26747359, Jeseniova 1196/52, Prague 3 — servers and email in the Czech Republic.</li>
    <li><strong>Google</strong> — only if you sign in with Google (Google Ireland Ltd. / Google LLC).</li>
    <li><strong>Paddle.com Market Limited</strong> (London, United Kingdom) — our online reseller of paid plans
        (Merchant of Record). You enter payment and billing details (name, email, country and address, payment card)
        directly into the Paddle checkout and Paddle processes them as an independent controller under its
        <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener">privacy notice</a>.
        Paddle receives the name and email of your account from us; we receive the subscription status and payment overview from Paddle.</li>
    <li><strong>Providers of map and geographic data</strong> — the base map (Mapy.com, Seznam.cz, a.s.) and geological data (Czech Geological Survey) are loaded directly by your browser, so these providers see your IP address. Cadastral and elevation data (in the Czech Republic from the Czech Office for Surveying, Mapping and Cadastre) are loaded by our server, which only sends the parcel designation and coordinates, not your personal data. The scope and providers vary by country.</li>
</ul>

<h2>5. Transfers outside the EU</h2>
<p>
    We store data in the EU. Data may leave the EU only when you sign in with Google (USA); Google participates
    in the EU–US Data Privacy Framework. When you pay for a subscription, data reaches Paddle in the United
    Kingdom, which is covered by a European Commission adequacy decision.
</p>

<h2>6. How long we keep data</h2>
<ul>
    <li>Account, projects and materials — for as long as the account exists; we delete them when it is closed.</li>
    <li>Subscription and payment data — for as long as the account exists.</li>
    <li>Editor edit counts — {{ config('uchovavani.denni_upravy_mesicu') }} months.</li>
    <li>Contact form messages — {{ config('uchovavani.kontaktni_zpravy_mesicu') }} months from sending.</li>
    <li>Error records and technical logs — {{ config('uchovavani.technicke_zaznamy_mesicu') }} months from the last occurrence.</li>
    <li>Password reset links — {{ config('auth.passwords.users.expire') }} minutes.</li>
    <li>Data required by law (e.g. accounting records) — for the period set by law.</li>
</ul>

<h2>7. Your rights</h2>
<p>
    You have the right to access your data, have it corrected or erased, restrict processing, data portability,
    and to object to processing based on legitimate interest. Just write to us via the
    <a href="{{ \App\Support\Domeny::url('web', '/contact?tema=osobni_udaje') }}">contact form</a>, stating the email your account is registered with — we will verify the request
    by a message sent to that email. You can edit your name, email, language and country
    yourself in your account settings. You also have the right to lodge a complaint with the Czech Office for
    Personal Data Protection (<a href="https://uoou.gov.cz" target="_blank">uoou.gov.cz</a>) or the supervisory
    authority in your country.
</p>

<h2>8. Location data source</h2>
<p>We determine the country from the IP address using the <a href="https://db-ip.com" target="_blank">DB-IP</a> database stored on our server.</p>
