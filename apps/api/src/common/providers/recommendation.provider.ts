export abstract class RecommendationProvider {
  abstract scoreFeed(items: any[], userId: string): Promise<any[]>;
  abstract scoreContentBased(items: any[], userId: string): Promise<any[]>;
  abstract getSimilarityScore(text1: string, text2: string): Promise<number>;
  abstract suggestTags(text: string): Promise<string[]>;
}

export class OpenAIRecommendationProvider extends RecommendationProvider {
  private readonly apiKey = process.env.OPENAI_API_KEY || 'stub-key';

  async scoreFeed(items: any[], userId: string): Promise<any[]> {
    // A real ML system would pass features to a ranking model.
    // For this stub, we compute a weighted score mimicking a real model's signals:
    // recency (40%), engagement (40%), affinity (20%).
    return items.map(item => {
      let score = 0;
      
      // Recency
      if (item.createdAt) {
        const hoursOld = (new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
        score += Math.max(0, 40 - hoursOld); // decays over 40 hours
      }
      
      // Engagement
      const likes = item._count?.likes || 0;
      const comments = item._count?.comments || 0;
      score += Math.min(40, (likes * 2) + (comments * 3));
      
      // Affinity (stubbed user affinity simulation)
      score += Math.random() * 20;

      return { ...item, _score: score };
    }).sort((a, b) => (b._score || 0) - (a._score || 0));
  }

  async scoreContentBased(items: any[], userId: string): Promise<any[]> {
    // Recommends stories/projects based on tag/category overlap & popularity.
    return items.map(item => {
      let score = 0;
      const popularity = item.viewCount || Math.random() * 100;
      score += Math.min(50, popularity / 10);
      
      // Stub: overlap of tags with user interests
      const randomOverlap = Math.random() * 50;
      score += randomOverlap;
      
      return { ...item, _score: score };
    }).sort((a, b) => (b._score || 0) - (a._score || 0));
  }

  async getSimilarityScore(text1: string, text2: string): Promise<number> {
    try {
      // Simulate real OpenAI embeddings call
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: [text1, text2]
        })
      });

      if (!response.ok) return this.fallbackSimilarity(text1, text2);

      const data = await response.json();
      const vec1 = data.data[0].embedding;
      const vec2 = data.data[1].embedding;
      return this.cosineSimilarity(vec1, vec2);
    } catch (e) {
      return this.fallbackSimilarity(text1, text2);
    }
  }

  async suggestTags(text: string): Promise<string[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Extract 3-5 relevant tags from the following text as a comma-separated list.' },
            { role: 'user', content: text }
          ]
        })
      });

      if (!response.ok) return this.fallbackSuggestTags(text);

      const data = await response.json();
      const content = data.choices[0].message.content;
      return content.split(',').map((t: string) => t.trim());
    } catch (e) {
      return this.fallbackSuggestTags(text);
    }
  }

  private fallbackSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private fallbackSuggestTags(text: string): string[] {
    const suggestions: string[] = [];
    const lowerText = text.toLowerCase();
    if (lowerText.includes('react') || lowerText.includes('vue')) suggestions.push('Frontend');
    if (lowerText.includes('node') || lowerText.includes('python')) suggestions.push('Backend');
    if (lowerText.includes('hackathon')) suggestions.push('Event');
    if (lowerText.includes('ai') || lowerText.includes('machine learning')) suggestions.push('AI/ML');
    return suggestions;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
