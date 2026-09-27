# AgriSmart — Smart Agriculture Intelligence Platform

MERN application for farmers, buyers and admins. Live data comes only from real sources
(data.gov.in mandi prices, OpenWeather). When a source is unavailable or has no credentials,
the app says so; it never substitutes made-up numbers.

## Status: read this first

The code has been linted, unit-tested (server 106 tests, client 22), built, and the server's HTTP layer
has been smoke-tested. It has **not** yet been run against a real MongoDB, the live external APIs, or in a
browser. Do a first end-to-end pass on your machine (steps below) before relying on it.

## Stack

- **Client:** React 18, Vite, React Router 7, Tailwind CSS 4, Recharts, Leaflet + OpenStreetMap, lucide-react
- **Server:** Node 20+, Express 4, MongoDB + Mongoose, JWT, bcryptjs, zod, helmet, express-rate-limit
- **AI microservice:** Python, FastAPI, Pydantic, httpx — a separate, optional service used only for
  photo-based crop analysis (see `python-ai-service/README.md`). It does not replace Express; Express still
  owns auth, data and every other route.
- **Integrations:** data.gov.in (market), OpenWeather (weather), Resend (email), Google Gemini API (assistant
  chat, and — via the Python service — crop-photo analysis)

## Structure

    agrismart/
      server/
        app.js server.js seed.js          app factory, entry point, demo-data seeder
        config-free: everything via .env (see .env.example)
        models/        User Field DiaryEntry CropHealth CropAnalysis SoilReading MarketPrice
                       Notification AuditLog Listing SavedListing Inquiry Media PasswordReset
        routes/        auth users fields diary crop-health (incl. AI photo analysis) soil weather
                       market notifications listings media search assistant admin
        services/      marketService (data.gov.in) marketStore weatherService emailService
                       assistantService cropAnalysisService (calls python-ai-service)
        middleware/ utils/ scripts/ tests/
      client/
        src/
          pages/       Login ForgotPassword ResetPassword FarmerDashboard FarmMap Fields Diary CropHealth
                       Weather Market Listings BuyerDashboard Admin Notifications Profile Settings
          components/  ui (glass system) layout (shell, nav, search, voice)
                       crop (SoilReadings, CropHealthAssistant — AI photo analysis) market listings assistant
          context/ i18n/ locales/ hooks/ services/ utils/ theme.js
        tests/
      python-ai-service/
        main.py requirements.txt .env.example tests/   FastAPI service; called only by Express, never the browser

## Environment variables (server/.env)

| Variable | Needed for |
|---|---|
| `MONGODB_URI`, `JWT_SECRET` | Required to start. Use a long random `JWT_SECRET`. |
| `PORT`, `CLIENT_ORIGIN`, `APP_URL` | Port (default 5000), allowed browser origin(s), public frontend URL used in emails |
| `DATA_GOV_API_KEY`, `DATA_GOV_RESOURCE_ID` | Market prices. Key from your data.gov.in account; confirm the mandi resource ID |
| `OPENWEATHER_API_KEY` | Weather and forecast |
| `RESEND_API_KEY`, `EMAIL_FROM` | Password-reset email. Verify your domain in Resend for real users |
| `AI_API_KEY`, `AI_MODEL` | AI assistant (optional; default model `gemini-2.5-flash-lite`) |
| `PYTHON_AI_SERVICE_URL` | AI crop-photo analysis on the Crop Health page. Points at `python-ai-service` (default `http://localhost:8001`); that service needs its own `AI_API_KEY` too — see `python-ai-service/README.md` |
| `SEED_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional: demo password, and `create-admin` script |

Client (`client/.env`, optional): `VITE_MAPBOX_TOKEN` — a Mapbox **public** token (`pk.…`) that enables the Satellite
layer on the Farm Map. Restrict it to your site's URL in the Mapbox dashboard. Secret tokens (`sk.…`) are refused.

Keys are used only on the server (or, for photo analysis, the Python service) and never sent to the browser.
Missing keys disable only their feature.

## Run it

1. Install Node 20+ and MongoDB (local `mongod` or a MongoDB Atlas URI).
2. `npm run install:all`
3. `cp server/.env.example server/.env` and fill in at least `MONGODB_URI` and `JWT_SECRET`.
4. Optional demo data: `npm run seed`
5. Terminal 1: `npm run dev:server`   Terminal 2: `npm run dev:client`
6. Open http://localhost:5173

**Optional — AI crop-photo analysis:** `cd python-ai-service && python3 -m venv .venv && source .venv/bin/activate
&& pip install -r requirements.txt && cp .env.example .env` (fill in `AI_API_KEY`), then `npm run dev:ai` (or
`uvicorn main:app --reload --port 8001` from inside that folder) in a third terminal, and set
`PYTHON_AI_SERVICE_URL=http://localhost:8001` in `server/.env`. Without it, "Analyze photo" on the Crop Health
page shows an unavailable message rather than a fake result.

**Demo accounts** (after `npm run seed`, password `Demo@12345` unless `SEED_PASSWORD` is set):
`farmer@agrismart.demo`, `buyer@agrismart.demo`, `admin@agrismart.demo`.
Demo records are flagged `isDemo` and named "(Demo)". Remove them with `npm --prefix server run seed -- --clean`.
Create a real admin with `npm --prefix server run create-admin`.

## Troubleshooting

**Sign-up or any request fails with a 500 in the browser.** Two different things cause this:

1. *The API isn't reachable.* The Vite terminal prints `http proxy error ... ECONNREFUSED`. Open
   http://localhost:5000/api/health. If it doesn't load, the server isn't running (or uses another `PORT`; then set
   `VITE_API_TARGET=http://localhost:<port>` for the client). If it shows `"database":"unavailable"`, MongoDB isn't connected.
2. *The API threw an error.* The server terminal prints `POST /api/auth/register failed:` with the stack trace, and outside
   production the browser message ends with the cause in brackets.

Run `npm run doctor` for a one-page check of Node, `.env`, MongoDB, the port and which API keys are set.
3. *`ECONNRESET` or `ECONNREFUSED` in the Vite terminal.* The API stopped or never started (`ECONNRESET` on slow requests
   such as weather usually means it was restarted or crashed mid-request). Read the API terminal for the reason.

The server now exits with a clear message if MongoDB can't be reached (5 s), or the port is taken.

## Checks

    npm test        # server + client unit tests, plus HTTP smoke tests (no database needed)
    npm run lint
    npm run build   # client production build in client/dist

## What works

- Accounts with farmer, buyer and admin roles enforced on the server; forgot/reset password by email; sessions
  end when the password changes.
- Farmer: fields (with map, drawn boundaries, health-coloured markers), crop diary and crop health with photos,
  soil readings, AI-assisted crop-photo analysis (optional, needs `python-ai-service`), weather with 5-day
  forecast, market prices with trends, marketplace listings and inquiries, notifications (welcome, harvest
  reminders), profile and settings.
- Buyer: marketplace search, saved listings, contacting sellers (sharing name and mobile only when they choose to).
- Admin: live counts, user activate/deactivate, audit log, configuration status.
- Cross-cutting: global search (Ctrl/Cmd+K), voice search, AI assistant that fetches live data through tools,
  English/Hindi, light/dark/system theme, offline notice, loading, empty and error states.

## Known limitations

- Hindi covers the farmer and buyer screens (navigation, sign-in, dashboard, map, fields, diary, crop health,
  AI photo analysis, soil, weather, market, marketplace, notifications, search, settings, profile, admin, and
  the assistant widget's interface). Still English: server error messages, confirmation pop-ups, dates and
  "Not available" texts from shared formatters, and — separately from the widget's UI — the AI assistant's own
  live replies and voice recognition, since those come from the model/browser rather than the UI strings.
  Have a native speaker review the Hindi wording.
- No sensor intake or social sign-in. Satellite view needs your Mapbox public token and photo backgrounds need your
  own images (see `client/public/backgrounds/README.txt`); without them the app shows OpenStreetMap streets and gradients.
- One photo per diary entry or health record. Inquiries have no reply thread; sellers respond by phone.
- Market trends use only prices this app has fetched, so history starts empty. Market filters are exact-match
  and case-sensitive, as in data.gov.in.
- Field boundaries are not checked for self-intersection. Voice recognition and the AI's own replies are
  English-only; the assistant widget's surrounding interface is localized.
- The sign-in token is kept in browser storage. For a hardened deployment, move it to an httpOnly cookie.
- AI crop-photo analysis (and the general AI assistant) is decision support, not a certified diagnosis, and
  deliberately never reports a confidence/certainty score — the model is instructed not to produce one, and
  the response is validated to strip it if it ever tried to. `python-ai-service` is a separate process that
  must be run and configured on its own; if it is not running, the feature says so rather than guessing.

## Production notes

Build the client, serve `client/dist` from a reverse proxy that forwards `/api` to the server, set
`NODE_ENV=production`, `CLIENT_ORIGIN` and `APP_URL`, and schedule `npm --prefix server run cleanup-media`.
If AI crop-photo analysis is enabled, deploy `python-ai-service` as its own process/container (it has no
database and no shared state) and point `PYTHON_AI_SERVICE_URL` at it; it should not be reachable from the
public internet, only from the Express server.
Server API endpoints are listed in `server/README.md`.
