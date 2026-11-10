"""Klíčové události v GA4 (modules/marketing.md, část Analýza webu).

Registrace (sign_up) a založení projektu (projekt_zalozen) posílá web přes App\\Support\\Mereni.
Skript je v GA4 označí jako klíčové, ať jdou vidět v přehledech a později jako konverze do Google Ads.
Opakované spuštění nic nezdvojí, existující jen vypíše.

  py services/ga4-klicove-udalosti.py
"""
import json
import os
import sys

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

KLIC = os.environ.get('TUPTUDU_GOOGLE_SA') or os.path.expanduser('~/.tuptudu-google/service-account.json')
PROPERTY = 'properties/561796471'
KLICOVE = ['sign_up', 'projekt_zalozen']


def main():
    with open(KLIC, encoding='utf-8') as f:
        info = json.load(f)
    cred = service_account.Credentials.from_service_account_info(info, scopes=['https://www.googleapis.com/auth/analytics.edit'])
    cred.refresh(Request())
    hl = {'Authorization': f'Bearer {cred.token}'}
    url = f'https://analyticsadmin.googleapis.com/v1beta/{PROPERTY}/keyEvents'

    r = requests.get(url, headers=hl, timeout=30)
    if r.status_code != 200:
        sys.exit(f'FAIL seznam: HTTP {r.status_code} {r.text[:400]}')
    existujici = {k['eventName'] for k in r.json().get('keyEvents', [])}
    print('v GA4 už jsou:', ', '.join(sorted(existujici)) or 'žádné')

    for nazev in KLICOVE:
        if nazev in existujici:
            print(f'OK   {nazev} už je klíčová')
            continue
        r = requests.post(url, headers=hl, json={'eventName': nazev, 'countingMethod': 'ONCE_PER_EVENT'}, timeout=30)
        if r.status_code != 200:
            sys.exit(f'FAIL {nazev}: HTTP {r.status_code} {r.text[:400]}')
        print(f'OK   {nazev} označena jako klíčová')


if __name__ == '__main__':
    main()
