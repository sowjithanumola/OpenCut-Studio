export interface AICaptionItem {
  startTime: number;
  duration: number;
  text: string;
}

export interface AITitleItem {
  text: string;
  subtitle?: string;
  animation?: 'fade' | 'zoom-in' | 'typewriter' | 'slide-up';
  color?: string;
}

export interface AIEditSuggestionItem {
  type: 'pacing' | 'transition' | 'audio' | 'color';
  message: string;
}

export async function generateAICaptions(mediaContext: string, clipDuration: number): Promise<{
  success: boolean;
  captions: AICaptionItem[];
  source: string;
  message?: string;
}> {
  try {
    const res = await fetch('/api/ai/captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaContext, clipDuration })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('AI captions fetch failed:', err);
    return {
      success: false,
      captions: [],
      source: 'error',
      message: err?.message || 'Network request failed'
    };
  }
}

export async function generateAITitles(videoTopic: string, style: string): Promise<{
  success: boolean;
  titles: AITitleItem[];
  source: string;
}> {
  try {
    const res = await fetch('/api/ai/titles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoTopic, style })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('AI titles fetch failed:', err);
    return {
      success: false,
      titles: [],
      source: 'error'
    };
  }
}

export async function generateAIEditSuggestions(clipCount: number, totalDuration: number, style: string): Promise<{
  success: boolean;
  suggestions: AIEditSuggestionItem[];
  source: string;
}> {
  try {
    const res = await fetch('/api/ai/edit-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clipCount, totalDuration, style })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('AI edit suggestions fetch failed:', err);
    return {
      success: false,
      suggestions: [],
      source: 'error'
    };
  }
}
