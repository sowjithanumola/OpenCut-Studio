import { Router } from 'express';
import { GEMINI_MODEL, generateJson, getGeminiClient } from '../gemini';

export const aiRouter = Router();

// AI Captions Endpoint
aiRouter.post('/captions', async (req, res) => {
  try {
    const { mediaContext, clipDuration } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Graceful heuristic fallback if API key is not configured
      const duration = typeof clipDuration === 'number' && clipDuration > 0 ? clipDuration : 8;
      const count = Math.max(2, Math.floor(duration / 2.5));
      const segmentLen = duration / count;
      const fallbackCaptions = [
        { startTime: 0.2, duration: Math.min(2.0, segmentLen), text: 'Welcome to OpenCut Studio' },
        { startTime: Math.min(2.5, segmentLen * 1.2), duration: Math.min(2.0, segmentLen), text: 'Pro browser video editing' },
        { startTime: Math.min(5.0, segmentLen * 2.2), duration: Math.min(2.0, segmentLen), text: 'Smooth realtime playback & rendering' }
      ].filter(c => c.startTime < duration);

      return res.json({
        success: true,
        source: 'local-preset',
        captions: fallbackCaptions,
        message: 'Generated using local timing heuristics (add GEMINI_API_KEY for custom AI caption generation).'
      });
    }

    const duration = typeof clipDuration === 'number' && clipDuration > 0 ? clipDuration : 10;
    const prompt = `You are a professional video editor assistant.
Generate clean, engaging subtitle captions for a video clip of duration ${duration.toFixed(1)} seconds.
Context or theme: "${mediaContext || 'Cinematic video showcase'}".
The video duration is ${duration}s. All caption segments must have startTime >= 0 and (startTime + duration) <= ${duration}.
Break the script into punchy, readable phrases (2-6 words each) suitable for social/cinematic video subtitles.

Output strictly valid JSON with no markdown wrapping in this format:
{
  "captions": [
    { "startTime": 0.5, "duration": 2.0, "text": "Short punchy line" }
  ]
}`;

    const data = await generateJson<{ captions?: unknown[] }>(ai, prompt, { captions: [] });

    return res.json({
      success: true,
      source: GEMINI_MODEL,
      captions: data.captions || [],
    });
  } catch (error: any) {
    console.error('Caption generation error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate captions'
    });
  }
});

// AI Title & Hook Suggestions Endpoint
aiRouter.post('/titles', async (req, res) => {
  try {
    const { videoTopic, style } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        source: 'local-preset',
        titles: [
          { text: 'THE NEXT GENERATION', subtitle: 'A new standard in visual storytelling', animation: 'zoom-in', color: '#06b6d4' },
          { text: 'OPENCUT STUDIO', subtitle: 'Crafted directly in the browser', animation: 'typewriter', color: '#f59e0b' },
          { text: 'EPISODE 01', subtitle: 'Behind the Scenes & Process', animation: 'fade', color: '#ffffff' }
        ]
      });
    }

    const prompt = `You are a viral video art director and typography designer.
Suggest 4 bold, engaging video title & lower-third concepts for a video about "${videoTopic || 'Creative Studio'}".
Desired style: "${style || 'Cinematic Modern'}".

Output strictly valid JSON:
{
  "titles": [
    {
      "text": "PRIMARY HEADLINE (UPPERCASE)",
      "subtitle": "Secondary subtitle or descriptor",
      "animation": "fade" | "zoom-in" | "typewriter" | "slide-up",
      "color": "#hexcode"
    }
  ]
}`;

    const data = await generateJson<{ titles?: unknown[] }>(ai, prompt, { titles: [] });

    return res.json({
      success: true,
      source: GEMINI_MODEL,
      titles: data.titles || []
    });
  } catch (error: any) {
    console.error('Title generation error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate titles'
    });
  }
});

// AI Smart Editing / Cut Suggestions Endpoint
aiRouter.post('/edit-suggestions', async (req, res) => {
  try {
    const { clipCount, totalDuration, style } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        source: 'local-preset',
        suggestions: [
          { type: 'pacing', message: 'Cut first clip to 2.5s to establish an immediate hook before title appears.' },
          { type: 'audio', message: 'Add a 0.5s fade-in on background audio to prevent sudden clicks.' },
          { type: 'transition', message: 'Use a subtle Crossfade (0.3s) between B-roll shots for smoother continuity.' }
        ]
      });
    }

    const prompt = `You are a master non-linear video editing director.
Analyze this timeline structure:
- Number of clips: ${clipCount || 3}
- Total duration: ${totalDuration || 10} seconds
- Target mood/style: "${style || 'Dynamic Promo'}"

Give 3 concrete, professional editing recommendations (cut timing, transition choice, audio pacing).

Output strictly valid JSON:
{
  "suggestions": [
    { "type": "pacing" | "transition" | "audio" | "color", "message": "Clear actionable editing tip" }
  ]
}`;

    const data = await generateJson<{ suggestions?: unknown[] }>(ai, prompt, { suggestions: [] });

    return res.json({
      success: true,
      source: GEMINI_MODEL,
      suggestions: data.suggestions || []
    });
  } catch (error: any) {
    console.error('Edit suggestions error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate suggestions'
    });
  }
});
