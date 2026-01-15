/**
 * V5 Discovery - LLM Client
 * 
 * Wrapper around AIProviderService for V5 pipeline.
 * Provides structured prompts and response parsing for each agent.
 */

import { AIProviderService, AIMessage } from '../../../../services/ai-provider.service';

export interface LLMClient {
  complete(prompt: string, options?: LLMOptions): Promise<string>;
  completeJSON<T>(prompt: string, options?: LLMOptions): Promise<T>;
  isAvailable(): boolean;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Create LLM client from AIProviderService
 */
export function createLLMClient(aiProvider: AIProviderService): LLMClient {
  return {
    async complete(prompt: string, options?: LLMOptions): Promise<string> {
      if (!aiProvider.isConfigured()) {
        throw new Error('AI provider not configured');
      }
      
      const messages: AIMessage[] = [];
      
      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      
      messages.push({ role: 'user', content: prompt });
      
      const result = await aiProvider.createCompletion({
        messages,
        temperature: options?.temperature ?? 0.3, // Lower for more deterministic
        maxTokens: options?.maxTokens ?? 4096,
        jsonMode: false,
      });
      
      return result.content;
    },
    
    async completeJSON<T>(prompt: string, options?: LLMOptions): Promise<T> {
      if (!aiProvider.isConfigured()) {
        throw new Error('AI provider not configured');
      }
      
      const messages: AIMessage[] = [];
      
      const systemPrompt = (options?.systemPrompt || '') + 
        '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation.';
      
      messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });
      
      console.log(`   ⏱️ LLM call starting... (prompt: ${prompt.length} chars)`);
      const startTime = Date.now();
      
      const result = await aiProvider.createCompletion({
        messages,
        temperature: options?.temperature ?? 0.2,
        maxTokens: options?.maxTokens ?? 4096,
        jsonMode: true,
      });
      
      console.log(`   ⏱️ LLM call finished in ${Date.now() - startTime}ms (response: ${result.content.length} chars)`);
      
      // Parse JSON response
      try {
        // Try to extract JSON from response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as T;
        }
        return JSON.parse(result.content) as T;
      } catch (error) {
        console.error('   ❌ Failed to parse LLM JSON response:', result.content.slice(0, 200));
        throw new Error('Invalid JSON response from LLM');
      }
    },
    
    isAvailable(): boolean {
      return aiProvider.isConfigured();
    }
  };
}

/**
 * Create a mock LLM client for testing (returns empty/default responses)
 */
export function createMockLLMClient(): LLMClient {
  return {
    async complete(): Promise<string> {
      return '';
    },
    async completeJSON<T>(): Promise<T> {
      return {} as T;
    },
    isAvailable(): boolean {
      return false;
    }
  };
}
