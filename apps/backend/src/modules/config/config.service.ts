import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

export interface AuthConfig {
  enabled: boolean;
  username: string;
  password: string;
  loginRoute?: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  successUrlPattern?: string;
}

export interface ProjectConfig {
  projectPath: string;
  projectName?: string;
  framework: string;
  baseUrl: string;
  testDir: string;
  auth?: AuthConfig;
  updatedAt: number;
}

@Injectable()
export class ConfigService {
  // In-memory cache
  private cache: Map<string, ProjectConfig> = new Map();

  /**
   * Get project configuration
   */
  async getConfig(projectPath: string): Promise<ProjectConfig | null> {
    // Check cache first
    if (this.cache.has(projectPath)) {
      return this.cache.get(projectPath)!;
    }

    // Try to read from file
    try {
      const configPath = this.getConfigPath(projectPath);
      const content = await fs.readFile(configPath, 'utf-8');
      const config: ProjectConfig = JSON.parse(content);
      
      // Update cache
      this.cache.set(projectPath, config);
      
      console.log(`✅ Loaded config for: ${projectPath}`);
      return config;
    } catch (error) {
      // File doesn't exist yet
      console.log(`⚠️  No config found for: ${projectPath}`);
      return null;
    }
  }

  /**
   * Save project configuration
   */
  async saveConfig(config: ProjectConfig): Promise<void> {
    const configWithTimestamp: ProjectConfig = {
      ...config,
      updatedAt: Date.now(),
    };

    // Save to cache
    this.cache.set(config.projectPath, configWithTimestamp);

    // Try to save to file
    try {
      const configPath = this.getConfigPath(config.projectPath);
      const configDir = dirname(configPath);

      // Ensure directory exists
      await fs.mkdir(configDir, { recursive: true });

      // Write config file
      await fs.writeFile(
        configPath,
        JSON.stringify(configWithTimestamp, null, 2),
        'utf-8'
      );

      console.log(`✅ Saved config for: ${config.projectPath}`);
    } catch (error: any) {
      console.error(`⚠️  Failed to save config file: ${error.message}`);
      console.log(`   Config is cached in memory only`);
    }
  }

  /**
   * Delete project configuration
   */
  async deleteConfig(projectPath: string): Promise<void> {
    // Remove from cache
    this.cache.delete(projectPath);

    // Try to delete file
    try {
      const configPath = this.getConfigPath(projectPath);
      await fs.unlink(configPath);
      console.log(`✅ Deleted config for: ${projectPath}`);
    } catch (error) {
      // File doesn't exist - no problem
    }
  }

  /**
   * Get path to config file
   */
  private getConfigPath(projectPath: string): string {
    return join(projectPath, '.qagent', 'config.json');
  }
}
