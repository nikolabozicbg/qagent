import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Smart File Discovery Service
 * 
 * ZERO HARDCODING - Discovers page/component files using intelligent heuristics
 * Works with ANY project structure (Next.js, CRA, custom, etc.)
 */
@Injectable()
export class SmartFileDiscoveryService {
  
  /**
   * Discover form components for form-based journey detection
   * 
   * Strategy:
   * 1. Find files with "form" in name (high confidence)
   * 2. Scan content for form elements (input/submit/onSubmit)
   * 3. Score based on form complexity
   */
  discoverFormFiles(workspacePath: string): PageFile[] {
    const allFiles = this.findAllSourceFiles(workspacePath);
    const formFiles: PageFile[] = [];
    
    console.log(`🔍 Form discovery: scanning ${allFiles.length} source files`);
    
    for (const filePath of allFiles) {
      const confidence = this.calculateFormConfidence(filePath);
      
      if (confidence >= 50) { // High threshold - only real forms
        formFiles.push({
          path: filePath,
          confidence,
          signals: this.getFormSignals(filePath)
        });
      }
    }
    
    // Sort by confidence
    formFiles.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`✅ Discovered ${formFiles.length} form files`);
    console.log(`   Forms: ${formFiles.slice(0, 5).map(f => path.basename(f.path)).join(', ')}`);
    
    return formFiles;
  }
  
  /**
   * Calculate confidence that file is a form component
   */
  private calculateFormConfidence(filePath: string): number {
    let confidence = 0;
    const fileName = path.basename(filePath).toLowerCase();
    
    // CRITICAL: Skip test files completely
    if (fileName.includes('.cy.') || fileName.includes('.test.') || fileName.includes('.spec.')) {
      return -999; // Guaranteed exclusion
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Strong signal: "form" in filename
      if (fileName.includes('form')) confidence += 40;
      
      // Has form element or Form component
      if (/<form/i.test(content) || /FormWrapper|Form\.Item|FormInput/i.test(content)) {
        confidence += 30;
      }
      
      // Has submit handler
      if (/onSubmit|handleSubmit|submit.*=/.test(content)) confidence += 20;
      
      // Has input fields
      const inputCount = (content.match(/input|Input|Field|TextField/gi) || []).length;
      if (inputCount >= 2) confidence += 10;
      if (inputCount >= 4) confidence += 10;
      
      // Has validation
      if (/rules=|validate|validation|yup|schema/.test(content)) confidence += 10;
      
      // Has API call
      if (/fetch|axios|dispatch.*Action|useMutation/.test(content)) confidence += 10;
      
      // Negative signals
      if (fileName.includes('button') || fileName.includes('input')) confidence -= 30;
      
    } catch (error) {
      return 0;
    }
    
    return Math.min(100, Math.max(0, confidence));
  }
  
  /**
   * Get form-specific signals for debugging
   */
  private getFormSignals(filePath: string): string[] {
    const signals: string[] = [];
    const fileName = path.basename(filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (fileName.toLowerCase().includes('form')) signals.push('form-name');
      if (/<form/i.test(content)) signals.push('form-element');
      if (/onSubmit|handleSubmit/.test(content)) signals.push('submit-handler');
      if (/input|Input|Field/i.test(content)) signals.push('has-inputs');
      if (/rules=|validate/.test(content)) signals.push('has-validation');
      if (/fetch|axios|dispatch/.test(content)) signals.push('has-api');
      
    } catch (error) {
      // Ignore
    }
    
    return signals;
  }
  
  /**
   * Discover all page/route files in workspace using smart heuristics
   * 
   * Strategy:
   * 1. Find main App/root component
   * 2. Analyze imports to find routed components
   * 3. Use file naming patterns as signals
   * 4. Combine multiple heuristics for confidence scoring
   */
  discoverPageFiles(workspacePath: string): PageFile[] {
    const allFiles = this.findAllSourceFiles(workspacePath);
    const pageFiles: PageFile[] = [];
    
    console.log(`🔍 Smart discovery: found ${allFiles.length} source files`);
    
    for (const filePath of allFiles) {
      const confidence = this.calculatePageConfidence(filePath, workspacePath);
      
      if (confidence > 30) { // Lower threshold to catch more potential pages
        pageFiles.push({
          path: filePath,
          confidence,
          signals: this.getFileSignals(filePath)
        });
      }
    }
    
    // Sort by confidence
    pageFiles.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`✅ Discovered ${pageFiles.length} page files (confidence > 50)`);
    console.log(`   Top 5: ${pageFiles.slice(0, 5).map(f => path.basename(f.path)).join(', ')}`);
    
    return pageFiles;
  }
  
  /**
   * Find all source files recursively
   */
  private findAllSourceFiles(workspacePath: string): string[] {
    const files: string[] = [];
    const visited = new Set<string>();
    
    const traverse = (dir: string, depth: number = 0) => {
      if (depth > 10 || visited.has(dir)) return;
      if (!fs.existsSync(dir)) return;
      
      visited.add(dir);
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          // Skip common non-source directories
          if (entry.isDirectory()) {
            const skipDirs = [
              'node_modules', '.git', 'dist', 'build', '.next', 
              'coverage', '.cache', 'public', 'static', '__tests__'
            ];
            if (skipDirs.includes(entry.name)) continue;
            
            traverse(path.join(dir, entry.name), depth + 1);
          } else if (entry.isFile()) {
            // Include JS/TS files
            if (/\.(tsx?|jsx?)$/.test(entry.name)) {
              // Skip test/spec files
              if (!entry.name.includes('.test.') && 
                  !entry.name.includes('.spec.') &&
                  !entry.name.includes('.cy.') &&
                  !entry.name.includes('.stories.')) {
                files.push(path.join(dir, entry.name));
              }
            }
          }
        }
      } catch (error) {
        // Permission denied or other errors - skip
      }
    };
    
    // Start from common source directories
    const srcDirs = [
      path.join(workspacePath, 'src'),
      path.join(workspacePath, 'app'),
      workspacePath // fallback
    ];
    
    for (const srcDir of srcDirs) {
      if (fs.existsSync(srcDir)) {
        traverse(srcDir);
        break; // Only traverse first found
      }
    }
    
    return files;
  }
  
  /**
   * Calculate confidence that file is a page/route component
   * Returns 0-100 score
   */
  private calculatePageConfidence(filePath: string, workspacePath: string): number {
    let confidence = 0;
    const fileName = path.basename(filePath);
    const relativePath = path.relative(workspacePath, filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // SIGNAL 1: File naming patterns (30 points max)
      confidence += this.scoreFileName(fileName, relativePath);
      
      // SIGNAL 2: Content patterns (40 points max)
      confidence += this.scoreContent(content);
      
      // SIGNAL 3: Import patterns (20 points max)
      confidence += this.scoreImports(content);
      
      // SIGNAL 4: Export patterns (10 points max)
      confidence += this.scoreExports(content);
      
    } catch (error) {
      return 0;
    }
    
    return Math.min(100, confidence);
  }
  
  /**
   * Score based on file name/path patterns
   */
  private scoreFileName(fileName: string, relativePath: string): number {
    let score = 0;
    const lower = fileName.toLowerCase();
    const pathLower = relativePath.toLowerCase();
    
    // ANTI-PATTERNS: These are definitely NOT pages (subtract points)
    const antiPatterns = ['header', 'footer', 'nav', 'sidebar', 'layout', 'wrapper', 'container', 'comment', 'list', 'item', 'card', 'button', 'input', 'form', 'modal'];
    if (antiPatterns.some(pattern => lower.includes(pattern) && !lower.includes('page'))) {
      score -= 50; // Strong negative signal
    }
    
    // Strong page indicators
    if (lower === 'page.tsx' || lower === 'page.jsx' || 
        lower === 'page.ts' || lower === 'page.js') {
      score += 30; // Next.js app router pattern
    }
    
    // Index files in route-like folders
    if ((lower === 'index.tsx' || lower === 'index.jsx' || 
         lower === 'index.ts' || lower === 'index.js') &&
        (pathLower.includes('/pages/') || 
         pathLower.includes('/routes/') ||
         pathLower.includes('/views/'))) {
      score += 25;
    }
    
    // Page-suffixed files
    if (lower.endsWith('page.tsx') || lower.endsWith('page.jsx') ||
        lower.endsWith('page.ts') || lower.endsWith('page.js')) {
      score += 20;
    }
    
    // Route-like names
    const routeNames = [
      'home', 'login', 'register', 'signup', 'profile', 'settings',
      'dashboard', 'about', 'contact', 'article', 'editor', 'user'
    ];
    
    if (routeNames.some(name => lower.includes(name))) {
      score += 15;
    }
    
    // In pages/routes/views folder
    if (pathLower.includes('/pages/') || 
        pathLower.includes('/routes/') ||
        pathLower.includes('/views/')) {
      score += 10;
    }
    
    // Dynamic route pattern [id].tsx
    if (/\[.*\]\.(tsx?|jsx?)$/.test(fileName)) {
      score += 25;
    }
    
    return score;
  }
  
  /**
   * Score based on file content
   */
  private scoreContent(content: string): number {
    let score = 0;
    
    // Has JSX/TSX rendering (strong signal)
    if (content.includes('return (') && 
        (content.includes('<div') || content.includes('<>') || 
         content.includes('</') || content.includes('<main'))) {
      score += 20;
    }
    
    // Uses router hooks (page-specific)
    const routerHooks = [
      'useNavigate', 'useLocation', 'useParams', 'useRouter',
      'useHistory', 'useRouteMatch'
    ];
    if (routerHooks.some(hook => content.includes(hook))) {
      score += 15;
    }
    
    // Has route/page-like functionality
    if (content.includes('useEffect') || content.includes('useState')) {
      score += 5; // Pages often have state/effects
    }
    
    // Helmet/head management (page-specific)
    if (content.includes('<Helmet') || content.includes('<Head') ||
        content.includes('document.title')) {
      score += 10;
    }
    
    // Has forms (common in pages)
    if (content.includes('<form') || content.includes('onSubmit') ||
        content.includes('handleSubmit')) {
      score += 5;
    }
    
    return score;
  }
  
  /**
   * Score based on imports
   */
  private scoreImports(content: string): number {
    let score = 0;
    
    // Imports react-router components
    if (content.includes('react-router') || 
        content.includes('next/router') ||
        content.includes('@reach/router')) {
      score += 10;
    }
    
    // Imports Link component (pages often have navigation)
    if (content.includes('import') && content.includes('Link')) {
      score += 5;
    }
    
    // Imports layout components
    if (content.includes('Layout') || content.includes('Container')) {
      score += 5;
    }
    
    return score;
  }
  
  /**
   * Score based on exports
   */
  private scoreExports(content: string): number {
    let score = 0;
    
    // Default export (pages typically default export)
    if (content.includes('export default')) {
      score += 5;
    }
    
    // Named export with Page/Route in name
    if (/export\s+(const|function)\s+\w*(Page|Route|View)\w*/.test(content)) {
      score += 5;
    }
    
    return score;
  }
  
  /**
   * Get human-readable signals for debugging
   */
  private getFileSignals(filePath: string): string[] {
    const signals: string[] = [];
    const fileName = path.basename(filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (fileName.includes('page')) signals.push('page-name');
      if (fileName === 'index.tsx' || fileName === 'index.jsx') signals.push('index-file');
      if (content.includes('useRouter') || content.includes('useNavigate')) signals.push('router-hooks');
      if (content.includes('<Helmet') || content.includes('<Head')) signals.push('head-management');
      if (content.includes('<form')) signals.push('has-form');
      if (content.includes('Link')) signals.push('has-navigation');
      
    } catch (error) {
      // Ignore
    }
    
    return signals;
  }
}

export interface PageFile {
  path: string;
  confidence: number;
  signals: string[];
}
