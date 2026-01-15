/**
 * Native HTML Form Plugin (Stub)
 */

import {
  ScannerPlugin,
  ProjectContext,
  AnalysisContext,
  FormPluginResult,
} from '../types';

export class NativeHtmlFormPlugin implements ScannerPlugin<FormPluginResult> {
  name = 'native-html';
  version = '1.0.0';
  type = 'form' as const;
  priority = 50; // Lower priority - fallback for forms without library

  async detect(context: ProjectContext): Promise<boolean> {
    // Always available as fallback
    return true;
  }

  async analyze(context: AnalysisContext): Promise<FormPluginResult> {
    // TODO: Implement native form detection
    return {
      pluginName: this.name,
      success: true,
      library: 'native',
      forms: [],
    };
  }
}
