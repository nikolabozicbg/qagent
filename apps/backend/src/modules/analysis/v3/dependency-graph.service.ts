import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { ParsedFile, ImportInfo, ExportInfo } from './ast-parser.service';
import { TSConfigInfo } from './project-scanner.service';

/**
 * Dependency Graph Builder v3.0
 * 
 * Phase 1.3: Builds complete dependency graph between files
 * - Resolves all import paths including aliases
 * - Detects barrel exports (index.ts re-exports)
 * - Tracks internal vs external dependencies
 * - Detects circular dependencies
 */

export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  barrelFiles: string[];              // Files that re-export from multiple sources
  circularDeps: string[][];           // Groups of circular dependencies
  entryPoints: string[];              // Files with no incoming edges
  statistics: GraphStatistics;
}

export interface GraphNode {
  filePath: string;
  relativePath: string;
  exports: ExportedSymbol[];
  imports: ImportedSymbol[];
  importedBy: string[];               // Files that import this file
  importsFrom: string[];              // Files this imports from
  isBarrel: boolean;                  // Re-exports from multiple files
  isEntryPoint: boolean;              // No internal imports to this file
  depth: number;                      // Distance from entry points
}

export interface ExportedSymbol {
  name: string;
  type: 'default' | 'named' | 'all';
  isReExport: boolean;
  originalSource: string | null;      // For re-exports
}

export interface ImportedSymbol {
  name: string;
  alias: string | null;
  source: string;                     // Resolved path
  isExternal: boolean;                // From node_modules
  resolvedPath: string | null;        // Full resolved path for internal imports
}

export interface GraphEdge {
  from: string;                       // Source file
  to: string;                         // Target file
  type: 'import' | 'reexport';
  symbols: string[];                  // Imported symbol names
}

export interface GraphStatistics {
  totalFiles: number;
  totalEdges: number;
  externalDeps: number;
  internalDeps: number;
  barrelCount: number;
  avgImportsPerFile: number;
  maxDepth: number;
}

@Injectable()
export class DependencyGraphService {
  
  /**
   * Build dependency graph from parsed files
   */
  buildGraph(
    parsedFiles: ParsedFile[],
    projectRoot: string,
    tsConfig: TSConfigInfo | null
  ): DependencyGraph {
    console.log(`📊 Dependency Graph: Building from ${parsedFiles.length} files`);
    const startTime = Date.now();
    
    // Create file path lookup for resolution
    const fileLookup = this.createFileLookup(parsedFiles);
    
    // Initialize graph
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const barrelFiles: string[] = [];
    
    // First pass: Create nodes and resolve imports
    for (const file of parsedFiles) {
      const node = this.createNode(file, fileLookup, projectRoot, tsConfig);
      nodes.set(file.relativePath, node);
      
      if (node.isBarrel) {
        barrelFiles.push(file.relativePath);
      }
    }
    
    // Second pass: Build edges and track importedBy
    for (const file of parsedFiles) {
      const node = nodes.get(file.relativePath);
      if (!node) continue;
      
      for (const imp of node.imports) {
        if (!imp.isExternal && imp.resolvedPath) {
          // Find target node
          const targetRelPath = this.toRelativePath(imp.resolvedPath, projectRoot);
          const targetNode = nodes.get(targetRelPath);
          
          if (targetNode) {
            // Add edge
            edges.push({
              from: file.relativePath,
              to: targetRelPath,
              type: 'import',
              symbols: [imp.alias || imp.name],
            });
            
            // Track relationships
            node.importsFrom.push(targetRelPath);
            targetNode.importedBy.push(file.relativePath);
          }
        }
      }
    }
    
    // Third pass: Detect circular dependencies
    const circularDeps = this.detectCircularDeps(nodes);
    
    // Fourth pass: Calculate depth and entry points
    const entryPoints = this.calculateDepths(nodes);
    
    // Calculate statistics
    const statistics = this.calculateStatistics(nodes, edges, parsedFiles.length);
    
    const buildTime = Date.now() - startTime;
    console.log(`   Built graph: ${nodes.size} nodes, ${edges.length} edges in ${buildTime}ms`);
    
    return {
      nodes,
      edges,
      barrelFiles,
      circularDeps,
      entryPoints,
      statistics,
    };
  }
  
  /**
   * Create lookup map for file resolution
   */
  private createFileLookup(parsedFiles: ParsedFile[]): Map<string, string> {
    const lookup = new Map<string, string>();
    
    for (const file of parsedFiles) {
      // Map by full path
      lookup.set(file.filePath, file.filePath);
      
      // Map by path without extension
      const withoutExt = file.filePath.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
      lookup.set(withoutExt, file.filePath);
      
      // Map index files for directory imports
      if (file.relativePath.endsWith('/index.ts') || 
          file.relativePath.endsWith('/index.tsx') ||
          file.relativePath.endsWith('/index.js')) {
        const dir = path.dirname(file.filePath);
        lookup.set(dir, file.filePath);
      }
    }
    
    return lookup;
  }
  
  /**
   * Create graph node from parsed file
   */
  private createNode(
    file: ParsedFile,
    fileLookup: Map<string, string>,
    projectRoot: string,
    tsConfig: TSConfigInfo | null
  ): GraphNode {
    // Process exports
    const exports: ExportedSymbol[] = file.exports.map(exp => ({
      name: exp.name,
      type: exp.type,
      isReExport: exp.isReExport,
      originalSource: exp.reExportSource,
    }));
    
    // Process and resolve imports
    const imports: ImportedSymbol[] = file.imports.map(imp => {
      const resolved = this.resolveImport(
        imp.source,
        file.filePath,
        fileLookup,
        projectRoot,
        tsConfig
      );
      
      // Get primary imported symbol
      const primarySpec = imp.specifiers[0];
      
      return {
        name: primarySpec?.name || 'default',
        alias: primarySpec?.alias || null,
        source: imp.source,
        isExternal: resolved.isExternal,
        resolvedPath: resolved.path,
      };
    });
    
    // Check if barrel (re-exports from multiple files)
    const reExportCount = file.exports.filter(e => e.isReExport).length;
    const isBarrel = reExportCount >= 2;
    
    return {
      filePath: file.filePath,
      relativePath: file.relativePath,
      exports,
      imports,
      importedBy: [],
      importsFrom: [],
      isBarrel,
      isEntryPoint: false,
      depth: -1,
    };
  }
  
  /**
   * Resolve import path to actual file
   */
  private resolveImport(
    source: string,
    fromFile: string,
    fileLookup: Map<string, string>,
    projectRoot: string,
    tsConfig: TSConfigInfo | null
  ): { path: string | null; isExternal: boolean } {
    // Check if external (no ./ or ../ prefix and not an alias)
    if (!source.startsWith('.') && !source.startsWith('/')) {
      // Check if it's a path alias
      if (tsConfig?.pathAliases) {
        for (const [alias, resolved] of tsConfig.pathAliases) {
          if (source === alias || source.startsWith(alias + '/')) {
            const remainder = source.slice(alias.length);
            const fullPath = resolved + remainder;
            const found = this.findFile(fullPath, fileLookup);
            if (found) {
              return { path: found, isExternal: false };
            }
          }
        }
      }
      
      // External package
      return { path: null, isExternal: true };
    }
    
    // Relative import
    const fromDir = path.dirname(fromFile);
    const resolved = path.resolve(fromDir, source);
    
    const found = this.findFile(resolved, fileLookup);
    return { path: found, isExternal: false };
  }
  
  /**
   * Find file with possible extension variations
   */
  private findFile(basePath: string, lookup: Map<string, string>): string | null {
    // Try exact
    if (lookup.has(basePath)) {
      return lookup.get(basePath)!;
    }
    
    // Try with extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
    for (const ext of extensions) {
      if (lookup.has(basePath + ext)) {
        return lookup.get(basePath + ext)!;
      }
    }
    
    // Try as directory (index file)
    for (const ext of extensions) {
      const indexPath = path.join(basePath, 'index' + ext);
      if (lookup.has(indexPath.replace(ext, ''))) {
        return lookup.get(indexPath.replace(ext, ''))!;
      }
    }
    
    return null;
  }
  
  /**
   * Convert absolute path to relative
   */
  private toRelativePath(absPath: string, projectRoot: string): string {
    return path.relative(projectRoot, absPath);
  }
  
  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDeps(nodes: Map<string, GraphNode>): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];
    
    const dfs = (nodePath: string, path: string[]): void => {
      if (recursionStack.has(nodePath)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodePath);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }
      
      if (visited.has(nodePath)) return;
      
      visited.add(nodePath);
      recursionStack.add(nodePath);
      
      const node = nodes.get(nodePath);
      if (node) {
        for (const importPath of node.importsFrom) {
          dfs(importPath, [...path, nodePath]);
        }
      }
      
      recursionStack.delete(nodePath);
    };
    
    for (const [nodePath] of nodes) {
      if (!visited.has(nodePath)) {
        dfs(nodePath, []);
      }
    }
    
    return cycles;
  }
  
  /**
   * Calculate depth from entry points and identify entry points
   */
  private calculateDepths(nodes: Map<string, GraphNode>): string[] {
    const entryPoints: string[] = [];
    
    // Find entry points (no internal imports)
    for (const [nodePath, node] of nodes) {
      if (node.importedBy.length === 0) {
        entryPoints.push(nodePath);
        node.isEntryPoint = true;
        node.depth = 0;
      }
    }
    
    // BFS to calculate depths
    const queue = [...entryPoints];
    const visited = new Set<string>(entryPoints);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentNode = nodes.get(current);
      if (!currentNode) continue;
      
      for (const importPath of currentNode.importsFrom) {
        const importNode = nodes.get(importPath);
        if (importNode) {
          if (importNode.depth === -1 || importNode.depth > currentNode.depth + 1) {
            importNode.depth = currentNode.depth + 1;
          }
          
          if (!visited.has(importPath)) {
            visited.add(importPath);
            queue.push(importPath);
          }
        }
      }
    }
    
    return entryPoints;
  }
  
  /**
   * Calculate graph statistics
   */
  private calculateStatistics(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    totalFiles: number
  ): GraphStatistics {
    let externalDeps = 0;
    let internalDeps = 0;
    let barrelCount = 0;
    let totalImports = 0;
    let maxDepth = 0;
    
    for (const node of nodes.values()) {
      for (const imp of node.imports) {
        if (imp.isExternal) {
          externalDeps++;
        } else {
          internalDeps++;
        }
        totalImports++;
      }
      
      if (node.isBarrel) {
        barrelCount++;
      }
      
      if (node.depth > maxDepth) {
        maxDepth = node.depth;
      }
    }
    
    return {
      totalFiles,
      totalEdges: edges.length,
      externalDeps,
      internalDeps,
      barrelCount,
      avgImportsPerFile: nodes.size > 0 ? totalImports / nodes.size : 0,
      maxDepth,
    };
  }
  
  /**
   * Get all files that a component depends on (transitive)
   */
  getTransitiveDependencies(
    graph: DependencyGraph,
    filePath: string
  ): Set<string> {
    const deps = new Set<string>();
    const queue = [filePath];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = graph.nodes.get(current);
      
      if (node) {
        for (const imp of node.importsFrom) {
          if (!deps.has(imp)) {
            deps.add(imp);
            queue.push(imp);
          }
        }
      }
    }
    
    return deps;
  }
  
  /**
   * Get all files that depend on this file (transitive)
   */
  getTransitiveDependents(
    graph: DependencyGraph,
    filePath: string
  ): Set<string> {
    const deps = new Set<string>();
    const queue = [filePath];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = graph.nodes.get(current);
      
      if (node) {
        for (const dependent of node.importedBy) {
          if (!deps.has(dependent)) {
            deps.add(dependent);
            queue.push(dependent);
          }
        }
      }
    }
    
    return deps;
  }
  
  /**
   * Find the shortest path between two files
   */
  findPath(
    graph: DependencyGraph,
    from: string,
    to: string
  ): string[] | null {
    if (from === to) return [from];
    
    const visited = new Set<string>();
    const queue: { path: string[]; current: string }[] = [
      { path: [from], current: from }
    ];
    
    while (queue.length > 0) {
      const { path, current } = queue.shift()!;
      
      if (visited.has(current)) continue;
      visited.add(current);
      
      const node = graph.nodes.get(current);
      if (!node) continue;
      
      for (const next of node.importsFrom) {
        if (next === to) {
          return [...path, next];
        }
        
        if (!visited.has(next)) {
          queue.push({ path: [...path, next], current: next });
        }
      }
    }
    
    return null;
  }
}
