# CubiCasa Parser — Python mikroslužba

Experimentální parser půdorysů z datasetu CubiCasa5K (i libovolných SVG stejné struktury) do kanonického JSON formátu Kalkulio (`nodes/walls/openings`).

**Izolovaný od stávajícího Laravel kódu.** Komunikuje přes HTTP.

Detailní plán: [../../modules/cubicasa.md](../../modules/cubicasa.md)

## Setup (dev)

```bash
cd services/cubicasa-parser
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
```

## Použití

### CLI (Fáze 2)
```bash
python parse_cubicasa.py samples/colorful_1234/model.svg > out.json
```

### FastAPI server (Fáze 4)
```bash
uvicorn main:app --reload --port 8001
```

Request:
```bash
curl -X POST http://127.0.0.1:8001/parse-floorplan \
  -H "Content-Type: application/json" \
  -d '{"svg": "<svg>...</svg>"}'
```

## Testy

```bash
pytest tests/
```

## Získání samplu dat

1. Stáhnout ze Zenodo (odkaz v README hlavního repa [CubiCasa5k](https://github.com/CubiCasa/CubiCasa5k))
2. Rozbalit
3. Zkopírovat 5-10 náhodných složek `{id}/model.svg` do `samples/`
4. Složka `samples/` je v gitignore — data se nedistribuují (CC BY-NC 4.0)
