import { Injectable } from '@nestjs/common';
import { LanguageProvider } from './base/language-provider.interface';
import { JavaScriptProvider } from './javascript/javascript.provider';
import { PythonProvider } from './python/python.provider';
import { CSharpProvider } from './csharp/csharp.provider';

@Injectable()
export class ProviderRegistryService {
  private providers: Map<string, LanguageProvider> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    // Register all language providers
    this.registerProvider(new JavaScriptProvider());
    this.registerProvider(new PythonProvider());
    this.registerProvider(new CSharpProvider());

    // Future: Add more providers
    // this.registerProvider(new JavaProvider());
    // this.registerProvider(new GoProvider());
    // this.registerProvider(new RustProvider());
  }

  registerProvider(provider: LanguageProvider): void {
    const metadata = provider.getMetadata();
    this.providers.set(metadata.language, provider);
    console.log(`✅ Registered language provider: ${metadata.displayName}`);
  }

  getProvider(language: string): LanguageProvider | null {
    return this.providers.get(language) || null;
  }

  getProviders(languages: string[]): LanguageProvider[] {
    return languages
      .map(lang => this.getProvider(lang))
      .filter((provider): provider is LanguageProvider => provider !== null);
  }

  getAllProviders(): LanguageProvider[] {
    return Array.from(this.providers.values());
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(language: string): boolean {
    return this.providers.has(language);
  }

  getProviderMetadata(language: string) {
    const provider = this.getProvider(language);
    return provider ? provider.getMetadata() : null;
  }

  getAllMetadata() {
    return this.getAllProviders().map(p => p.getMetadata());
  }
}
