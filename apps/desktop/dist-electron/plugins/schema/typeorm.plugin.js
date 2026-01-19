"use strict";
/**
 * TypeORM Plugin (Stub)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeORMPlugin = void 0;
class TypeORMPlugin {
    constructor() {
        this.name = 'typeorm';
        this.version = '1.0.0';
        this.type = 'schema';
        this.priority = 90;
    }
    async detect(context) {
        const { packageJson } = context;
        const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
        return !!deps?.['typeorm'];
    }
    async analyze(context) {
        // TODO: Implement TypeORM entity analysis
        return {
            pluginName: this.name,
            success: true,
            orm: 'typeorm',
            entities: [],
            relations: [],
        };
    }
}
exports.TypeORMPlugin = TypeORMPlugin;
