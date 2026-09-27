# AgriSmart AI service

A small FastAPI microservice with exactly one job: given a crop photo, return a structured,
non-fabricated health analysis. It is called only by the Express API — never by the browser —
and it never touches MongoDB.

```
React  ->  Express (server/routes/cropHealth.js)  ->  this service  ->  Google Gemini API
```

Everything else AgriSmart already does well in Node (market prices, weather, the general
assistant) stays in Node. This service was added because image-based crop diagnosis did not
exist anywhere in the codebase — not to move existing, working logic into Python.

## Endpoints

- `GET /health` — `{ status, ai_configured }`
- `POST /analyze` — body:
  ```json
  {
    "image_base64": "...",
    "content_type": "image/jpeg",
    "crop": "Wheat",
    "symptoms": "Yellowing leaf tips",
    "context": { "soil_moisture_pct": 22.5, "weather_condition": "Rain", "weather_temperature_c": 26 }
  }
  ```
  `context` is optional and is only ever data Express already looked up (the field's latest soil
  reading, current weather) — this service never fetches soil or weather itself.

  Response:
  ```json
  {
    "possible_issue": "Nitrogen deficiency",
    "severity": "moderate",
    "explanation": "...",
    "recommended_actions": ["..."],
    "preventive_measures": ["..."],
    "when_to_seek_help": "...",
    "model": "gemini-2.5-flash-lite"
  }
  ```
  There is deliberately no confidence/certainty/probability field: the model is instructed never
  to produce one, and if it ever does anyway, `main.py` strips it before the response leaves this
  service. If the photo is unclear the model is instructed to say so in plain language rather than
  guess.

## Run it

```
cd python-ai-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in AI_API_KEY
uvicorn main:app --reload --port 8001
```

Then set `PYTHON_AI_SERVICE_URL=http://localhost:8001` in `server/.env`. If it's unset, or this
service is down, the "Analyze photo" feature in the app shows an unavailable message — it never
falls back to fake results.

## Test

```
pip install -r requirements-dev.txt
pytest
```

Tests mock the Gemini HTTP call (`respx`) — no network access or API key needed to run them.
