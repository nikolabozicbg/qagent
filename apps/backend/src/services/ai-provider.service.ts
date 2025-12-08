import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type AIProvider = 'openai' | 'anthropic';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AICompletionResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

/**
 * Unified AI Provider Service
 * 
 * Supports both OpenAI and Anthropic (Claude) APIs with a single interface.
 * Switch between providers via environment variable AI_PROVIDER.
 * 
 * Benefits of Claude for code generation:
 * - Better code understanding and structure
 * - More precise instruction following
 * - Fewer hallucinations in API usage
 * - 200K context window
 */
@Injectable()
export class AIProviderService {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private provider: AIProvider;

  constructor(private configService: ConfigService) {
    // Determine provider from env (default to openai for backward compatibility)
    this.provider = (this.configService.get<string>('AI_PROVIDER') || 'openai') as AIProvider;
  }

  /**
   * Get current provider
   */
  getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * Set provider dynamically
   */
  setProvider(provider: AIProvider) {
    this.provider = provider;
  }

  /**
   * Create chat completion using configured provider
   */
  async createCompletion(options: AICompletionOptions): Promise<AICompletionResult> {
    if (this.provider === 'anthropic') {
      return this.createAnthropicCompletion(options);
    }
    return this.createOpenAICompletion(options);
  }

  /**
   * OpenAI completion
   */
  private async createOpenAICompletion(options: AICompletionOptions): Promise<AICompletionResult> {
    const client = this.getOpenAIClient();
    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';

    const response = await client.chat.completions.create({
      model,
      messages: options.messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      response_format: options.jsonMode ? { type: 'json_object' } : undefined,
    });

    return {
      content: response.choices[0].message.content || '',
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model,
      provider: 'openai',
    };
  }

  /**
   * Anthropic (Claude) completion
   */
  private async createAnthropicCompletion(options: AICompletionOptions): Promise<AICompletionResult> {
    const client = this.getAnthropicClient();
    const model = this.configService.get<string>('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20241022';

    // Anthropic requires system message separate from messages array
    const systemMessage = options.messages.find(m => m.role === 'system');
    const userMessages = options.messages.filter(m => m.role !== 'system');

    const response = await client.messages.create({
      model,
      max_tokens: options.maxTokens || 4096,
      system: systemMessage?.content || 'You are a helpful AI assistant.',
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
    });

    // Extract text content from response
    const textContent = response.content.find(c => c.type === 'text');
    let content = textContent?.type === 'text' ? textContent.text : '';

    // If JSON mode requested, try to extract JSON from response
    if (options.jsonMode && content) {
      content = this.extractJSON(content);
    }

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      model,
      provider: 'anthropic',
    };
  }

  /**
   * Extract JSON from Claude response (Claude doesn't have native JSON mode)
   */
  private extractJSON(content: string): string {
    // Try to find JSON block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    // Try to parse entire content as JSON
    try {
      JSON.parse(content);
      return content;
    } catch {
      // Return as-is if not valid JSON
      return content;
    }
  }

  /**
   * Get or create OpenAI client
   */
  private getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      this.openaiClient = new OpenAI({ apiKey });
    }
    return this.openaiClient;
  }

  /**
   * Get or create Anthropic client
   */
  private getAnthropicClient(): Anthropic {
    if (!this.anthropicClient) {
      const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      this.anthropicClient = new Anthropic({ apiKey });
    }
    return this.anthropicClient;
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    if (this.provider === 'anthropic') {
      return !!this.configService.get<string>('ANTHROPIC_API_KEY');
    }
    return !!this.configService.get<string>('OPENAI_API_KEY');
  }

  /**
   * Get provider info for debugging
   */
  getProviderInfo(): { provider: AIProvider; model: string; configured: boolean } {
    const model = this.provider === 'anthropic'
      ? this.configService.get<string>('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20241022'
      : this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';

    return {
      provider: this.provider,
      model,
      configured: this.isConfigured(),
    };
  }
}
