"use strict";
/**
 * Native HTML Form Plugin (Stub)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeHtmlFormPlugin = void 0;
class NativeHtmlFormPlugin {
    constructor() {
        this.name = 'native-html';
        this.version = '1.0.0';
        this.type = 'form';
        this.priority = 50; // Lower priority - fallback for forms without library
    }
    async detect(context) {
        // Always available as fallback
        return true;
    }
    async analyze(context) {
        // TODO: Implement native form detection
        return {
            pluginName: this.name,
            success: true,
            library: 'native',
            forms: [],
        };
    }
}
exports.NativeHtmlFormPlugin = NativeHtmlFormPlugin;
