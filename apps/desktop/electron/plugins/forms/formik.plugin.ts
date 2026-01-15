/**
 * Formik Plugin (Stub)
 */

import {
  ScannerPlugin,
  ProjectContext,
  AnalysisContext,
  FormPluginResult,
} from '../types';

export class FormikPlugin implements ScannerPlugin<FormPluginResult> {
  name = 'formik';
  version = '1.0.0';
  type = 'form' as const;
  priority = 90;

  async detect(context: ProjectContext): Promise<boolean> {
    const { packageJson } = context;
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
    return !!deps?.['formik'];
  }

  async analyze(context: AnalysisContext): Promise<FormPluginResult> {
    // TODO: Implement full Formik analysis
    return {
      pluginName: this.name,
      success: true,
      library: 'formik',
      forms: [],
    };
  }
}
