/**
 * Ant Design Form Plugin (Stub)
 */

import {
  ScannerPlugin,
  ProjectContext,
  AnalysisContext,
  FormPluginResult,
} from '../types';

export class AntdFormPlugin implements ScannerPlugin<FormPluginResult> {
  name = 'antd-form';
  version = '1.0.0';
  type = 'form' as const;
  priority = 85;

  async detect(context: ProjectContext): Promise<boolean> {
    const { packageJson } = context;
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
    return !!deps?.['antd'];
  }

  async analyze(context: AnalysisContext): Promise<FormPluginResult> {
    // TODO: Implement Ant Design form analysis
    return {
      pluginName: this.name,
      success: true,
      library: 'antd',
      forms: [],
    };
  }
}
