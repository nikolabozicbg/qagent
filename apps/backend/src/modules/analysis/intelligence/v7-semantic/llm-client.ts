import { AIMessage, AIProviderService } from '../../../../services/ai-provider.service';

export interface V7LLMClient {
  completeJSON<T>(prompt: string, options: { systemPrompt: string; temperature?: number; maxTokens?: number }): Promise<T>;
  isAvailable(): boolean;
}

export function createV7LLMClient(aiProvider: AIProviderService): V7LLMClient {
  return {
    async completeJSON<T>(prompt, options) {
      if (!aiProvider.isConfigured()) {
        throw new Error('AI provider not configured');
      }

      const systemPrompt = options.systemPrompt + '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation.';
      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      const result = await aiProvider.createCompletion({
        messages,
        temperature: options.temperature ?? 0.1,
        maxTokens: options.maxTokens ?? 4096,
        jsonMode: true,
      });

      // Parse JSON response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : result.content;
      return JSON.parse(jsonText) as T;
    },

    isAvailable() {
      return aiProvider.isConfigured();
    },
  };
}
