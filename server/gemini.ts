import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = 'gemini-3.8-flash';

/** Lazily create the Gemini client; returns null when no API key is configured. */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Send a prompt to Gemini and parse the JSON response.
 * Falls back to extracting the first {...} block if the model wraps the JSON,
 * and to `fallback` if nothing parseable is found.
 */
export async function generateJson<T>(
  ai: GoogleGenAI,
  prompt: string,
  fallback: T
): Promise<T> {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text) as T;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? (JSON.parse(jsonMatch[0]) as T) : fallback;
  }
}
