"""AgriSmart AI service — a small FastAPI microservice, called only by the Express API.

It exists for exactly one reason: AgriSmart's Node/Express backend has no existing feature
that looks at a crop photo and says what might be wrong with it. Market prices, weather and the
general assistant are already implemented well in Node (see server/services/) and are NOT
duplicated here. This service adds a single, genuinely new capability: structured, photo-based
crop-health analysis using a vision-capable model.

Architecture (see README.md for the full picture):

    React -> Express (server/routes/cropHealth.js) -> this service -> AI provider

The browser never talks to this service directly, and this service never talks to MongoDB.
"""

import json
import os
from typing import Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

load_dotenv()  # reads python-ai-service/.env into os.environ (AI_API_KEY, AI_VISION_MODEL, ...)

API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-2.5-flash-lite"
MAX_BASE64_CHARS = 3_000_000  # ~2.2 MB decoded, matching Express's media upload cap


def api_url(model: str) -> str:
    return API_URL_TEMPLATE.format(model=model)


# Gemini's structured-output schema (a Struct subset of OpenAPI) for the analysis shape.
# "model" is deliberately excluded — that field is added by this service, not the AI provider.
RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "possible_issue": {"type": "STRING"},
        "severity": {"type": "STRING", "enum": ["low", "moderate", "high", "unknown"]},
        "explanation": {"type": "STRING"},
        "recommended_actions": {"type": "ARRAY", "items": {"type": "STRING"}},
        "preventive_measures": {"type": "ARRAY", "items": {"type": "STRING"}},
        "when_to_seek_help": {"type": "STRING"},
    },
    "required": ["possible_issue", "severity", "explanation"],
}

app = FastAPI(title="AgriSmart AI Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("NODE_API_ORIGIN", "http://localhost:5000")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class AnalyzeContext(BaseModel):
    """Optional, already-known context passed in by Express (soil/weather). Never fetched here."""

    soil_moisture_pct: Optional[float] = None
    weather_condition: Optional[str] = None
    weather_temperature_c: Optional[float] = None


class AnalyzeRequest(BaseModel):
    image_base64: str
    content_type: Literal["image/jpeg", "image/png", "image/webp"]
    crop: str = Field(min_length=1, max_length=80)
    symptoms: str = Field(default="", max_length=500)
    context: AnalyzeContext = AnalyzeContext()

    @field_validator("image_base64")
    @classmethod
    def not_too_large(cls, v: str) -> str:
        if not v:
            raise ValueError("image_base64 is required")
        if len(v) > MAX_BASE64_CHARS:
            raise ValueError("Image is too large")
        return v


class AnalyzeResponse(BaseModel):
    possible_issue: str
    severity: Literal["low", "moderate", "high", "unknown"] = "unknown"
    explanation: str
    recommended_actions: list[str] = []
    preventive_measures: list[str] = []
    when_to_seek_help: str = ""
    model: str


SYSTEM_PROMPT = """You are an agricultural crop-health analysis assistant looking at ONE photo of a crop.
Respond with ONLY a single JSON object, no other text, no markdown fences, matching exactly this shape:
{
  "possible_issue": string — short name of the most likely issue visible (or "No clear issue visible" if it looks healthy),
  "severity": one of "low", "moderate", "high", "unknown",
  "explanation": string — 2 to 4 plain sentences on what you see and why,
  "recommended_actions": array of short strings — concrete next steps,
  "preventive_measures": array of short strings — how to avoid this in future,
  "when_to_seek_help": string — one or two sentences on when to involve a local agricultural expert
}
Rules:
- Base your answer only on what is visible in the photo plus the crop name, reported symptoms and field context given to you. Do not invent facts beyond that.
- Never output a numeric confidence, certainty or probability of any kind, in this field or any other.
- If the photo is unclear, blurry, or does not show enough of the plant to say anything useful, say so in "explanation", set "possible_issue" to "Unable to determine from this photo", "severity" to "unknown", and use "recommended_actions" to ask for a clearer photo.
- This is decision support for a farmer, not a certified diagnosis. Keep "when_to_seek_help" honest about that limit.
Output the JSON object and nothing else."""


def build_user_text(req: AnalyzeRequest) -> str:
    lines = [f"Crop: {req.crop}"]
    if req.symptoms:
        lines.append(f"Symptoms reported by the farmer: {req.symptoms}")
    ctx = req.context
    if ctx.soil_moisture_pct is not None:
        lines.append(f"Latest recorded soil moisture: {ctx.soil_moisture_pct}%")
    if ctx.weather_condition:
        temp = f", {ctx.weather_temperature_c}\u00b0C" if ctx.weather_temperature_c is not None else ""
        lines.append(f"Current weather: {ctx.weather_condition}{temp}")
    lines.append("Analyze the attached photo of this crop.")
    return "\n".join(lines)


def parse_json_object(raw: str) -> Optional[dict]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        brace = cleaned.find("{")
        if brace != -1:
            cleaned = cleaned[brace:]
    try:
        data = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return None
    return data if isinstance(data, dict) else None


@app.get("/health")
async def health():
    return {"status": "ok", "ai_configured": bool(os.environ.get("AI_API_KEY"))}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    api_key = os.environ.get("AI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI crop analysis is not configured.")

    model = os.environ.get("AI_VISION_MODEL") or os.environ.get("AI_MODEL") or DEFAULT_MODEL
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"inlineData": {"mimeType": req.content_type, "data": req.image_base64}},
                    {"text": build_user_text(req)},
                ],
            }
        ],
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {
            "maxOutputTokens": 700,
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                api_url(model),
                headers={
                    "content-type": "application/json",
                    "x-goog-api-key": api_key,
                },
                json=payload,
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach the AI provider.")

    if res.status_code != 200:
        raise HTTPException(status_code=502, detail="The AI provider could not analyze this image.")

    data = res.json()
    candidates = data.get("candidates") or []
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    text = "\n".join(p.get("text", "") for p in parts if "text" in p).strip()

    parsed = parse_json_object(text)
    if parsed is None:
        raise HTTPException(status_code=502, detail="The AI provider returned an unreadable response.")

    # Defensive: strip any confidence-like field even though the prompt forbids it — never trust or forward one.
    for key in ("confidence", "confidence_score", "certainty", "probability"):
        parsed.pop(key, None)
    parsed["model"] = model

    try:
        return AnalyzeResponse(**parsed)
    except Exception as exc:  # pydantic ValidationError or similar shape mismatch
        raise HTTPException(status_code=502, detail=f"The AI provider returned an unexpected response shape: {exc}") from exc
