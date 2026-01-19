"use strict";
/**
 * Ant Design Form Plugin (Stub)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntdFormPlugin = void 0;
class AntdFormPlugin {
    constructor() {
        this.name = 'antd-form';
        this.version = '1.0.0';
        this.type = 'form';
        this.priority = 85;
    }
    async detect(context) {
        const { packageJson } = context;
        const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
        return !!deps?.['antd'];
    }
    async analyze(context) {
        // TODO: Implement Ant Design form analysis
        return {
            pluginName: this.name,
            success: true,
            library: 'antd',
            forms: [],
        };
    }
}
exports.AntdFormPlugin = AntdFormPlugin;
