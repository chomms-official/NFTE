"""Refresh the offline country snapshot. Run manually; never fetch during a build.

Usage: python scripts/import-country-data.py [--snapshot-dir PATH]
The optional directory contains downloaded countries.json, population.json and
malaria.json API responses. Reviewed WHO/CDC facts are committed under data/sources.
"""
import argparse
import csv
import datetime
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--snapshot-dir', type=pathlib.Path)
args = parser.parse_args()
urls = {
    'countries': 'https://api.worldbank.org/v2/country?format=json&per_page=400',
    'population': 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=400',
    'malaria': 'https://api.worldbank.org/v2/country/all/indicator/SH.MLR.INCD.P3?format=json&mrnev=1&per_page=400',
}
def load(name):
    if args.snapshot_dir:
        result = json.loads((args.snapshot_dir / (name + '.json')).read_text())
    else:
        with urllib.request.urlopen(urls[name], timeout=30) as response:
            result = json.load(response)
    assert result[0]['pages'] == 1, 'Increase page size; never silently truncate data'
    return result

wb = {c['id']: c for c in load('countries')[1] if c['region']['id'] != 'NA'}
raw = {key: load(key) for key in ['population', 'malaria']}
observations = {key: {o['countryiso3code']: o for o in response[1] if o['countryiso3code'] in wb and o['value'] is not None} for key, response in raw.items()}
with (ROOT / 'data/sources/who-dengue-2024.csv').open() as stream:
    dengue = {r['country_as_published']: int(r['reported_cases']) for r in csv.DictReader(stream)}
je = json.loads((ROOT / 'data/sources/cdc-je-2026.json').read_text())
sources = {
    'population': {
        'name': 'World Bank · Population, total', 'url': 'https://data.worldbank.org/indicator/SP.POP.TOTL',
        'dataUrl': urls['population'], 'updatedAt': raw['population'][0]['lastupdated'],
        'attribution': 'UN Population Division, national statistical offices, Eurostat and UN Statistics Division via World Bank (CC BY 4.0)',
    },
    'malaria': {
        'name': 'WHO · via World Bank', 'url': 'https://data.worldbank.org/indicator/SH.MLR.INCD.P3',
        'dataUrl': urls['malaria'], 'updatedAt': raw['malaria'][0]['lastupdated'],
        'attribution': 'WHO Global Health Observatory / World Health Statistics via World Bank (CC BY 4.0)',
    },
    'dengue': {
        'name': 'WHO · 2024 dengue report, Table 1',
        'url': 'https://www.who.int/publications/i/item/who-wer10052-665-678',
        'dataUrl': 'https://iris.who.int/server/api/core/bitstreams/b405cbfa-3642-4da1-a45e-627c58cec6f2/content',
        'publishedAt': '2025-12-26', 'reportedBy': '2025-12-10',
        'attribution': 'WHO Weekly Epidemiological Record 100(52), pp. 667–670, Table 1, first numeric column',
    },
    'je': {
        'name': 'CDC · Yellow Book 2026, Table 4.7.1',
        'url': 'https://www.cdc.gov/yellow-book/hcp/travel-associated-infections-diseases/japanese-encephalitis.html',
        'updatedAt': '2026-02-20', 'attribution': 'CDC; transmission season summarized from Table 4.7.1',
    },
}
# Explicit identifiers and reviewed name aliases only; no fuzzy country joins.
aliases = {'Ivory Coast': 'Côte d’Ivoire', 'Bolivia': 'Bolivia (Plurinational State of)',
           'Iran': 'Iran (Islamic Republic of)', 'Laos': 'Lao People’s Democratic Republic',
           'East Timor': 'Timor-Leste', 'Vietnam': 'Viet Nam'}
countries = {}
for feature in json.loads((ROOT / 'public/assets/countries.geojson').read_text())['features']:
    p = feature['properties']
    code, name = p['ADM0_A3'], p['ADMIN']
    iso = next((c for c in [p.get('ISO_A3'), p.get('WB_A3'), code] if c in wb), None)
    if code == 'KOS': iso = 'XKX'  # Natural Earth / World Bank identifier difference.
    record = {'name': name, 'population': None, 'malaria': None, 'dengue': None, 'je': None}
    for metric in ['population', 'malaria']:
        o = observations[metric].get(iso)
        if o:
            assert isinstance(o['value'], (int, float)) and o['value'] >= 0
            record[metric] = {'value': o['value'], 'year': int(o['date']), 'sourceId': metric,
                              'url': sources[metric]['url'] + '?locations=' + wb[iso]['iso2Code']}
    reported = dengue.get(aliases.get(name, name))
    if reported is not None:
        record['dengue'] = {'value': reported, 'year': 2024, 'sourceId': 'dengue', 'url': sources['dengue']['url']}
        if code == 'FRA':
            record['dengue']['scope'] = 'France row only; WHO lists overseas areas separately.'
    if code in je:
        record['je'] = {'value': je[code], 'year': 2026, 'sourceId': 'je', 'url': sources['je']['url']}
    countries[code] = record

result = {'schemaVersion': 1, 'retrievedAt': datetime.date.today().isoformat(), 'sources': sources, 'countries': countries}
(ROOT / 'src/data/country-evidence.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print({key: sum(c[key] is not None for c in countries.values()) for key in ['population', 'malaria', 'dengue', 'je']})
