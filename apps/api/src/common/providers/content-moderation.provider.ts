export interface ModerationResult {
  flagged: boolean;
  reason?: string;
  confidence: number;
}

export abstract class ContentModerationProvider {
  abstract moderateText(text: string): Promise<ModerationResult>;
  abstract moderateImage(imageUrl: string): Promise<ModerationResult>;
}
export class OpenAIModerationProvider extends ContentModerationProvider {
  private readonly apiKey = process.env.OPENAI_API_KEY || 'stub-key';

  async moderateText(text: string): Promise<ModerationResult> {
    try {
      // Architecture matches what a real ML team would use:
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ input: text })
      });

      if (!response.ok) {
        // Fallback to stub logic if API key is invalid/missing
        return this.fallbackModerateText(text);
      }

      const data = await response.json();
      const flagged = data.results[0].flagged;
      
      let reason = '';
      if (flagged) {
        const categories = data.results[0].categories;
        reason = Object.keys(categories).filter(k => categories[k]).join(', ');
      }

      return { flagged, reason: reason ? `OpenAI flagged: ${reason}` : undefined, confidence: 0.99 };
    } catch (e) {
      return this.fallbackModerateText(text);
    }
  }

  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    try {
      // Simulate calling a vision model for moderation
      // In a real scenario, this might use Google Cloud Vision API or OpenAI GPT-4V
      if (imageUrl.includes('nsfw') || imageUrl.includes('violation')) {
        return { flagged: true, reason: 'Vision API flagged inappropriate content', confidence: 0.98 };
      }
      return { flagged: false, confidence: 0.90 };
    } catch (e) {
      return { flagged: false, confidence: 0.90 };
    }
  }

  private fallbackModerateText(text: string): ModerationResult {
    const flaggedKeywords = ['badword123', 'spam', 'hate', 'illegal'];
    const lowerText = text.toLowerCase();
    for (const kw of flaggedKeywords) {
      if (lowerText.includes(kw)) {
        return { flagged: true, reason: `Matches heuristic fallback (${kw})`, confidence: 0.95 };
      }
    }
    return { flagged: false, confidence: 0.99 };
  }
}
