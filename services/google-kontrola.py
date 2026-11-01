"""Kontrola přístupů servisního účtu ke Google Analytics, Search Console a Google Ads.

Vývojový nástroj (modules/marketing.md) — ověří, že klíč v TUPTUDU_GOOGLE_SA funguje
a že servisní účet vidí property GA4, doménu v Search Console a účet Google Ads.
Nic nemění, jen čte. Spuštění:  py services/google-kontrola.py
"""
import json
import os
import sys

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

KLIC = os.environ.get('TUPTUDU_GOOGLE_SA') or os.path.expanduser('~/.tuptudu-google/service-account.json')
SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/adwords',
]


def hlavicky(cred):
    cred.refresh(Request())
    return {'Authorization': f'Bearer {cred.token}'}


def volej(nazev, url, hl, **kw):
    try:
        r = requests.get(url, headers=hl, timeout=30, **kw)
    except requests.RequestException as e:
        print(f'FAIL {nazev}: {e}')
        return None
    if r.status_code != 200:
        zprava = r.text[:300].replace('\n', ' ')
        print(f'FAIL {nazev}: HTTP {r.status_code} {zprava}')
        return None
    return r.json()


def ads_detail(customer_id, hl, projekt):
    """Vypíše měnu, časové pásmo a kampaně účtu Google Ads (GAQL, jen čtení)."""
    url = f'https://googleads.googleapis.com/v26/customers/{customer_id}/googleAds:search'
    hlav = {**hl, 'x-goog-user-project': projekt, 'login-customer-id': customer_id}
    dotazy = {
        'účet': 'SELECT customer.descriptive_name, customer.currency_code, customer.time_zone, '
                'customer.manager, customer.status FROM customer',
        'kampaně': 'SELECT campaign.name, campaign.status, campaign.advertising_channel_type '
                   'FROM campaign ORDER BY campaign.name',
    }
    for nazev, q in dotazy.items():
        try:
            r = requests.post(url, headers=hlav, json={'query': q}, timeout=30)
        except requests.RequestException as e:
            print(f'  {nazev}: chyba {e}')
            continue
        if r.status_code != 200:
            print(f'  {nazev}: HTTP {r.status_code} {r.text[:200].replace(chr(10), " ")}')
            continue
        radky = r.json().get('results', [])
        if nazev == 'účet':
            for x in radky:
                c = x.get('customer', {})
                print(f'  název „{c.get("descriptiveName")}", měna {c.get("currencyCode")}, pásmo {c.get("timeZone")}, '
                      f'stav {c.get("status")}, manažerský: {c.get("manager")}')
        else:
            print(f'  kampaní: {len(radky)}')
            for x in radky:
                k = x.get('campaign', {})
                print(f'    {k.get("status"):<8} {k.get("advertisingChannelType"):<10} {k.get("name")}')


def main():
    if not os.path.exists(KLIC):
        print(f'FAIL klíč nenalezen: {KLIC}')
        return 1
    with open(KLIC, encoding='utf-8') as f:
        info = json.load(f)
    print(f'klíč: projekt {info.get("project_id")}, účet {info.get("client_email")}')
    cred = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    hl = hlavicky(cred)
    print('token: OK (přihlášení servisního účtu funguje)')
    chyb = 0

    # Google Analytics 4 — seznam účtů a property, které servisní účet vidí
    d = volej('GA4', 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries', hl)
    if d is None:
        chyb += 1
    else:
        ucty = d.get('accountSummaries', [])
        if not ucty:
            print('GA4: přihlášení OK, ale servisní účet nevidí žádnou property → přidat ho v GA4 Admin → Property access management (Viewer)')
            chyb += 1
        for u in ucty:
            for p in u.get('propertySummaries', []):
                print(f'GA4: OK  {u.get("displayName")} / {p.get("displayName")}  ({p.get("property")})')

    # Search Console — ověřené weby
    d = volej('Search Console', 'https://www.googleapis.com/webmasters/v3/sites', hl)
    if d is None:
        chyb += 1
    else:
        weby = d.get('siteEntry', [])
        if not weby:
            print('Search Console: přihlášení OK, ale žádný web → přidat servisní účet v SC Settings → Users and permissions (Full)')
            chyb += 1
        for w in weby:
            print(f'Search Console: OK  {w.get("siteUrl")}  oprávnění {w.get("permissionLevel")}')

    # Google Ads — účty dostupné servisnímu účtu (bez developer tokenu, přístup per Cloud projekt).
    # Hlavička x-goog-user-project říká, který Cloud projekt (s úrovní Explorer) volání kryje;
    # servisní účet na něj potřebuje roli Service Usage Consumer, jinak 403 (bez hlavičky 401).
    d = volej('Google Ads', 'https://googleads.googleapis.com/v26/customers:listAccessibleCustomers',
              {**hl, 'x-goog-user-project': info.get('project_id', '')})
    if d is None:
        chyb += 1
    else:
        ucty = d.get('resourceNames', [])
        if not ucty:
            print('Google Ads: přihlášení OK, ale žádný účet → v Ads Správce → Přístup a zabezpečení → Uživatelé přidat servisní účet (Standardní)')
            chyb += 1
        for u in ucty:
            print(f'Google Ads: OK  {u}')
            ads_detail(u.split('/')[-1], hl, info.get('project_id', ''))

    print(f'\nvýsledek: {"vše OK" if chyb == 0 else str(chyb) + " přístup(y) chybí"}')
    return 0 if chyb == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
