/**
 * Playwright Service
 * Handles Playwright detection, installation, and configuration
 */

export interface PlaywrightStatus {
  hasPlaywright: boolean;
  isInstalled: boolean;
  version?: string;
  testDir?: string;
  baseURL?: string;
  configPath?: string;
}

export class PlaywrightService {
  /**
   * Check if Playwright is installed in the project
   */
  async checkPlaywright(projectPath: string): Promise<PlaywrightStatus> {
    if (!window.electronAPI?.checkPlaywright) {
      throw new Error('Playwright check not available');
    }

    const checkResult = await window.electronAPI.checkPlaywright(projectPath);
    
    if (!checkResult.ok) {
      return {
        hasPlaywright: false,
        isInstalled: false,
      };
    }

    // If Playwright is installed, try to read config
    let configResult;
    if (checkResult.isInstalled) {
      try {
        configResult = await window.electronAPI.readPlaywrightConfig?.(projectPath);
      } catch (err) {
        console.warn('Failed to read Playwright config:', err);
      }
    }

    return {
      hasPlaywright: checkResult.hasPlaywright,
      isInstalled: checkResult.isInstalled,
      version: checkResult.version,
      testDir: configResult?.testDir,
      baseURL: configResult?.baseURL,
      configPath: configResult?.configPath,
    };
  }

  /**
   * Install Playwright in the project
   */
  async installPlaywright(
    projectPath: string,
    onProgress?: (message: string) => void,
    onComplete?: (success: boolean, error?: string) => void
  ): Promise<{ ok: boolean; error?: string }> {
    if (!window.electronAPI?.installPlaywright) {
      throw new Error('Playwright installation not available');
    }

    // Setup event listeners if callbacks provided
    let progressCleanup: (() => void) | undefined;
    let completeCleanup: (() => void) | undefined;

    if (onProgress && window.electronAPI.onPlaywrightInstallProgress) {
      progressCleanup = window.electronAPI.onPlaywrightInstallProgress((data) => {
        onProgress(data.message);
      });
    }

    if (onComplete && window.electronAPI.onPlaywrightInstallComplete) {
      completeCleanup = window.electronAPI.onPlaywrightInstallComplete((data) => {
        onComplete(data.success, data.error);
      });
    }

    try {
      const result = await window.electronAPI.installPlaywright(projectPath);
      return result;
    } finally {
      // Cleanup event listeners
      progressCleanup?.();
      completeCleanup?.();
    }
  }

  /**
   * Read Playwright configuration
   */
  async readConfig(projectPath: string): Promise<{
    ok: boolean;
    testDir?: string;
    baseURL?: string;
    configPath?: string;
    error?: string;
  }> {
    if (!window.electronAPI?.readPlaywrightConfig) {
      throw new Error('Playwright config reading not available');
    }

    return await window.electronAPI.readPlaywrightConfig(projectPath);
  }

  /**
   * Get test directory for saving generated tests
   * Falls back to 'tests/e2e' if config not found
   */
  async getTestDir(projectPath: string): Promise<string> {
    try {
      const config = await this.readConfig(projectPath);
      return config.testDir || 'tests/e2e';
    } catch {
      return 'tests/e2e';
    }
  }
}

export const playwrightService = new PlaywrightService();
