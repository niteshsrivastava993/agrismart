import { z } from 'zod';

// Node never calls the AI provider directly for this feature — that call, and the vision-model
// prompt, live in python-ai-service. This service only knows how to reach that microservice.
const resultSchema = z.object({
  possible_issue: z.string().trim().min(1).max(200),
  severity: z.enum(['low', 'moderate', 'high', 'unknown']).default('unknown'),
  explanation: z.string().trim().min(1).max(2000),
  recommended_actions: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
  preventive_measures: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
  when_to_seek_help: z.string().trim().max(500).default(''),
  model: z.string().trim().min(1),
});

export const DISCLAIMER = 'AI-assisted analysis, not a certified diagnosis. Confirm with a local agricultural expert before acting on it.';

export async function analyzeCropImage({ imageBase64, contentType, crop, symptoms, context }) {
  const baseUrl = process.env.PYTHON_AI_SERVICE_URL;
  if (!baseUrl) throw Object.assign(new Error('AI crop analysis is not configured.'), { status: 503 });

  let res;
  try {
    res = await fetch(`${baseUrl.replace(/\/+$/, '')}/analyze`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageBase64,
        content_type: contentType,
        crop,
        symptoms: symptoms || '',
        context: context || {},
      }),
    });
  } catch (e) {
    console.error('crop analysis request failed:', e.message);
    throw Object.assign(new Error('Could not reach the AI analysis service.'), { status: 502 });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('crop analysis upstream status:', res.status, data.detail);
    throw Object.assign(new Error(data.detail || 'AI analysis failed.'), { status: res.status === 503 ? 503 : 502 });
  }

  const parsed = resultSchema.safeParse(data);
  if (!parsed.success) {
    console.error('crop analysis response failed validation:', parsed.error.issues);
    throw Object.assign(new Error('The AI service returned an unexpected response.'), { status: 502 });
  }

  // Note: there is intentionally no confidence field anywhere in this pipeline. The AI service is
  // instructed never to produce one and strips it defensively; nothing here re-adds or invents one.
  const { possible_issue, severity, explanation, recommended_actions, preventive_measures, when_to_seek_help, model } = parsed.data;
  return {
    possibleIssue: possible_issue,
    severity,
    explanation,
    recommendedActions: recommended_actions,
    preventiveMeasures: preventive_measures,
    whenToSeekHelp: when_to_seek_help,
    model,
    disclaimer: DISCLAIMER,
  };
}
