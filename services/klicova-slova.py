"""Objemy hledání z Plánovače klíčových slov Google Ads (stupeň Basic od 9. 11. 2026).

Vývojový nástroj pro články (modules/blog.md, modules/marketing.md). Jen čte, nic v Ads nemění.
Servisní účet a projekt jako google-kontrola.py. Výchozí země Česko, jazyk čeština.

  py services/klicova-slova.py                         objemy pro services/clanky/klicova-slova.txt
  py services/klicova-slova.py slova.txt               objemy pro jiný seznam
  py services/klicova-slova.py --napady "dům ve svahu"   další dotazy k výchozím slovům (generateKeywordIdeas)
  --zeme 2203 --jazyk 1021                             jiná země a jazyk (geoTargetConstants, languageConstants)

Výsledek se vypíše seřazený podle objemu a uloží jako CSV do storage/app/klicova-slova/ (mimo git).
"""
import argparse
import csv
import datetime
import json
import os
import sys

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

KLIC = os.environ.get('TUPTUDU_GOOGLE_SA') or os.path.expanduser('~/.tuptudu-google/service-account.json')
ZAKAZNIK = '1346460395'
API = 'https://googleads.googleapis.com/v26'
KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MESICE = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']


def hlavicky():
    with open(KLIC, encoding='utf-8') as f:
        info = json.load(f)
    cred = service_account.Credentials.from_service_account_info(info, scopes=['https://www.googleapis.com/auth/adwords'])
    cred.refresh(Request())
    # Projekt s úrovní Basic kryje volání, login-customer-id je účet, pod kterým servisní účet vystupuje
    return {'Authorization': f'Bearer {cred.token}', 'x-goog-user-project': info['project_id'], 'login-customer-id': ZAKAZNIK}


def volej(metoda, telo):
    r = requests.post(f'{API}/customers/{ZAKAZNIK}:{metoda}', headers=hlavicky(), json=telo, timeout=120)
    if r.status_code != 200:
        sys.exit(f'FAIL {metoda}: HTTP {r.status_code} {r.text[:600]}')
    return r.json()


def radek(text, m):
    mesicne = {f"{x['year']}-{MESICE.index(x['month']) + 1:02d}": int(x.get('monthlySearches', 0)) for x in m.get('monthlySearchVolumes', [])}
    return {
        'dotaz': text,
        'mesicne_prumer': int(m.get('avgMonthlySearches', 0)),
        'konkurence': m.get('competition', ''),
        'nejnizsi_mesic': min(mesicne.values()) if mesicne else '',
        'nejvyssi_mesic': max(mesicne.values()) if mesicne else '',
        'mesice': ' '.join(f'{k}:{v}' for k, v in sorted(mesicne.items())),
    }


def main():
    a = argparse.ArgumentParser()
    a.add_argument('soubor', nargs='?', default=os.path.join(KOREN, 'services', 'clanky', 'klicova-slova.txt'))
    a.add_argument('--napady', nargs='+', help='výchozí slova pro nové nápady místo objemů ze souboru')
    a.add_argument('--zeme', default='2203', help='geoTargetConstant, 2203 = Česko')
    a.add_argument('--jazyk', default='1021', help='languageConstant, 1021 = čeština')
    arg = a.parse_args()
    cil = {'language': f'languageConstants/{arg.jazyk}', 'geoTargetConstants': [f'geoTargetConstants/{arg.zeme}'], 'keywordPlanNetwork': 'GOOGLE_SEARCH'}

    if arg.napady:
        d = volej('generateKeywordIdeas', {**cil, 'keywordSeed': {'keywords': arg.napady}, 'pageSize': 1000})
        radky = [radek(x['text'], x.get('keywordIdeaMetrics', {})) for x in d.get('results', [])]
        nazev = 'napady'
    else:
        with open(arg.soubor, encoding='utf-8') as f:
            slova = [s.strip() for s in f if s.strip() and not s.startswith('#')]
        d = volej('generateKeywordHistoricalMetrics', {**cil, 'keywords': slova, 'historicalMetricsOptions': {'includeAverageCpc': False}})
        radky = [radek(x['text'], x.get('keywordMetrics', {})) for x in d.get('results', [])]
        # Google slučuje blízké varianty, dotaz bez dat vrátí bez metrik nebo vůbec
        vracene = {r['dotaz'] for r in radky} | {v for x in d.get('results', []) for v in x.get('closeVariants', [])}
        radky += [radek(s, {}) for s in slova if s not in vracene]
        nazev = 'objemy'

    radky.sort(key=lambda r: -r['mesicne_prumer'])
    slozka = os.path.join(KOREN, 'storage', 'app', 'klicova-slova')
    os.makedirs(slozka, exist_ok=True)
    # Čas a první výchozí slovo v názvu: souběžné běhy (víc copywriterů naráz) se nepřepíšou
    if arg.napady:
        nazev += '-' + ''.join(c if c.isalnum() else '-' for c in arg.napady[0].lower())[:30].strip('-')
    cesta = os.path.join(slozka, f'{datetime.date.today()}-{datetime.datetime.now():%H%M%S}-{nazev}-{arg.zeme}.csv')
    with open(cesta, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(radky[0].keys()) if radky else ['dotaz'])
        w.writeheader()
        w.writerows(radky)
    for r in radky:
        print(f"{r['mesicne_prumer']:>7}  {r['konkurence']:<8} {r['dotaz']}")
    print(f'\n{len(radky)} dotazů, uloženo: {cesta}')


if __name__ == '__main__':
    main()
