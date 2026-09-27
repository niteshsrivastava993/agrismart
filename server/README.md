# AgriSmart API (Phase 1 backend)

    cp .env.example .env     # set MONGODB_URI, JWT_SECRET, plus OPENWEATHER_API_KEY / DATA_GOV_API_KEY
    npm install
    npm run create-admin     # optional, uses ADMIN_EMAIL / ADMIN_PASSWORD
    npm run dev
    npm test                 # unit tests (no database needed)

Endpoints (JSON; `Authorization: Bearer <token>` except register/login):

- POST /api/auth/register | /login | /logout, GET /api/auth/me
- GET/POST /api/fields (optional `boundary`: up to 200 [lat, lon] corners, or [] to clear), GET/PATCH/DELETE /api/fields/:id (farmer only, owner-scoped)
- GET/POST /api/diary?q=&field=&order=asc|desc, PATCH/DELETE /api/diary/:id (farmer only, owner-scoped)
- GET/POST /api/crop-health?field=&order=, PATCH/DELETE /api/crop-health/:id (farmer only; scores are farmer-recorded)
- POST /api/crop-health/analyze (farmer; 15 requests per 15 min; body `{field, imageId, crop, symptoms?}`) — sends the photo plus the field's latest soil reading and current weather to `python-ai-service` and stores the structured result. 503 if `PYTHON_AI_SERVICE_URL` isn't set (or that service has no `AI_API_KEY`); 502 if the AI response is missing or malformed. Never returns a confidence/certainty score.
- GET /api/crop-health/analyses?field=&limit=&page=, GET/DELETE /api/crop-health/analyses/:id (farmer only, owner-scoped) — AI analysis history, separate from the manual health log above
- Listings: GET /api/listings (any role, filters q/category/state/district/sort; seller shown by first name only), GET /mine, POST, PATCH/DELETE /:id (farmer); GET /saved, PUT/DELETE /:id/save, POST /:id/inquiries (buyer; shares name + mobile with the seller); GET /inquiries/received (farmer)
- GET /api/assistant/status, POST /api/assistant/chat (AI_API_KEY required; the model calls tools for live prices, weather and the farmer's fields, and returns its sources; 30 requests per 15 min)
- POST /api/auth/forgot-password, /api/auth/reset-password (Resend email; 1-hour single-use link; same reply for unknown emails)
- GET /api/search?q= (2+ chars; scoped by role: farmers get own fields, crops, diary, listings; buyers get active listings; admins get users; everyone gets notifications and collected market prices)
- PATCH /api/users/me (name, mobile, state, district, language; role and email cannot be changed), POST /api/users/me/password
- POST /api/media (farmer; raw JPEG/PNG/WebP body up to 2 MB, checked by file signature), GET/DELETE /api/media/:id (owner only). Diary and crop health entries take an optional imageId. `npm run cleanup-media` removes uploads never attached to a record (older than 24 h)
- GET /api/notifications, POST /api/notifications/read-all, PATCH /:id/read, DELETE /:id (any role; farmers get harvest reminders 7 days ahead)
- GET/POST /api/soil, PATCH/DELETE /api/soil/:id, GET /api/soil/latest (farmer; manual readings only), GET /api/crop-health/latest (newest record per field)
- GET /api/market/prices?commodity=Wheat&state=Uttar%20Pradesh (data.gov.in, normalized, cached 30 min)
- GET /api/market/trend?commodity=Wheat&state=..&days=30 (from prices this app has stored; history starts at first fetch)
- GET /api/weather/current and /api/weather/forecast with ?lat=..&lon=.. or ?q=Lucknow (OpenWeather; cached 10 / 30 min; forecast is 5 days in local calendar days)
- GET /api/admin/stats | /users | /audit, PATCH /api/admin/users/:id/active (admin only)

Notes: without API keys, market/weather return 503 "Connect API credentials to view live data." No fake data.
data.gov.in filters are exact-match and case-sensitive. Confirm the mandi resource ID in your data.gov.in account.
Passwords use bcryptjs (pure-JS bcrypt). Admin accounts can only be created via the script.

## Demo data (development only)

    npm run seed              # (re)creates demo users and records
    npm run seed -- --clean   # removes all demo data
    npm run seed -- --force   # required if NODE_ENV=production (not recommended)

Creates an admin, a farmer and a buyer at `*@agrismart.demo` (password `Demo@12345`, or set `SEED_PASSWORD`),
plus three fields, diary entries, crop health records and two marketplace listings for the farmer. Every record has `isDemo: true`
and field names end in "(Demo)". No market or weather data is seeded: those always come from the live APIs.

## Password reset email (Resend)

1. Create a Resend API key and set `RESEND_API_KEY`.
2. Set `EMAIL_FROM`. For real users, verify your own domain in Resend and use an address on it.
   `onboarding@resend.dev` only delivers to the email address of your own Resend account (fine for testing).
3. Set `APP_URL` to the public address of the frontend so the emailed link points to it.

Without these, `/forgot-password` returns 503 and the UI says reset email is not configured.
Resetting or changing a password signs out all other sessions.
