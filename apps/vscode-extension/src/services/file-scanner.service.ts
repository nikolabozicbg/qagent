import * as vscode from 'vscode';
import * as path from 'path';
import { StackType } from '../types/enhanced-analysis.types';

/**
 * File information
 */
export interface ScannedFile {
  path: string;
  relativePath: string;
  language: string;
  type: 'component' | 'service' | 'controller' | 'page' | 'hook' | 'util' | 'model' | 'other';
  hasTest: boolean;
  testFilePath?: string;
}

/**
 * FileScanner Service
 * 
 * Scans workspace and categorizes files by stack type (Frontend/Backend).
 * Detects source files and matches them with test files.
 */
export class FileScannerService {
  
  /**
   * Scan workspace and return files for specific stack type
   */
  async scanStackFiles(workspaceRoot: string, stackType: StackType): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];
    
    if (stackType === 'frontend') {
      return this.scanFrontendFiles(workspaceRoot);
    } else if (stackType === 'backend') {
      return this.scanBackendFiles(workspaceRoot);
    }
    
    return files;
  }
  
  /**
   * Scan frontend files (components, pages, hooks)
   */
  private async scanFrontendFiles(workspaceRoot: string): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];
    const seenPaths = new Set<string>();
    
    // Common frontend patterns - specific first
    const specificPatterns = [
      'src/components/**/*.{tsx,jsx,ts,js}',
      'src/pages/**/*.{tsx,jsx,ts,js}',
      'src/app/**/*.{tsx,jsx,ts,js}', // Next.js app directory
      'src/hooks/**/*.{ts,js}',
      'src/lib/**/*.{tsx,jsx,ts,js}',
      'src/utils/**/*.{ts,js}',
      'src/helpers/**/*.{ts,js}',
      'src/constants/**/*.{ts,js}',
      'src/redux/**/*.{ts,js}',
      'src/store/**/*.{ts,js}',
      'src/actions/**/*.{ts,js}',
      'src/reducers/**/*.{ts,js}',
      'src/*.{ts,js}', // Root-level files like store.js, reducer.js
      'src/features/**/*.{tsx,jsx,ts,js}',
      'src/modules/**/*.{tsx,jsx,ts,js}',
      'components/**/*.{tsx,jsx,ts,js}',
      'pages/**/*.{tsx,jsx,ts,js}',
      'app/**/*.{tsx,jsx,ts,js}' // Next.js app router root
    ];
    
    // Try specific patterns first
    for (const pattern of specificPatterns) {
      const foundFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceRoot, pattern),
        '**/node_modules/**'
      );
      
      for (const fileUri of foundFiles) {
        const filePath = fileUri.fsPath;
        
        if (seenPaths.has(filePath) || this.isTestFile(filePath)) {
          continue;
        }
        seenPaths.add(filePath);
        
        const relativePath = path.relative(workspaceRoot, filePath);
        const fileType = this.detectFrontendFileType(filePath);
        const language = this.detectLanguage(filePath);
        
        files.push({
          path: filePath,
          relativePath,
          language,
          type: fileType,
          hasTest: false,
          testFilePath: undefined
        });
      }
    }
    
    // Fallback: if no files found, scan ALL src/ TSX/JSX files
    if (files.length === 0) {
      const fallbackPatterns = [
        'src/**/*.{tsx,jsx}',
        '**/*.{tsx,jsx}'
      ];
      
      for (const pattern of fallbackPatterns) {
        const foundFiles = await vscode.workspace.findFiles(
          new vscode.RelativePattern(workspaceRoot, pattern),
          '{**/node_modules/**,**/.next/**,**/dist/**,**/build/**}'
        );
        
        for (const fileUri of foundFiles) {
          const filePath = fileUri.fsPath;
          
          if (seenPaths.has(filePath) || this.isTestFile(filePath)) {
            continue;
          }
          seenPaths.add(filePath);
          
          const relativePath = path.relative(workspaceRoot, filePath);
          const fileType = this.detectFrontendFileType(filePath);
          const language = this.detectLanguage(filePath);
          
          files.push({
            path: filePath,
            relativePath,
            language,
            type: fileType,
            hasTest: false,
            testFilePath: undefined
          });
        }
        
        // Stop if we found files
        if (files.length > 0) break;
      }
    }
    
    return files;
  }
  
  /**
   * Scan backend files (services, controllers, models)
   */
  private async scanBackendFiles(workspaceRoot: string): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];
    
    // Common backend patterns (NestJS, Express)
    const patterns = [
      'src/**/*.service.{ts,js}',
      'src/**/*.controller.{ts,js}',
      'src/**/*.module.{ts,js}',
      'src/**/*.middleware.{ts,js}',
      'src/**/*.guard.{ts,js}',
      'src/**/*.repository.{ts,js}',
      'src/**/*.model.{ts,js}',
      'src/**/*.entity.{ts,js}'
    ];
    
    for (const pattern of patterns) {
      const foundFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceRoot, pattern),
        '**/node_modules/**'
      );
      
      for (const fileUri of foundFiles) {
        const filePath = fileUri.fsPath;
        
        // Skip test files
        if (this.isTestFile(filePath)) {
          continue;
        }
        
        const relativePath = path.relative(workspaceRoot, filePath);
        const fileType = this.detectBackendFileType(filePath);
        const language = this.detectLanguage(filePath);
        
        files.push({
          path: filePath,
          relativePath,
          language,
          type: fileType,
          hasTest: false,
          testFilePath: undefined
        });
      }
    }
    
    return files;
  }
  
  /**
   * Check if file is a test file
   */
  private isTestFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(fileName) ||
           /\.e2e-spec\.(ts|js)$/.test(fileName) ||
           fileName.includes('.test.') ||
           fileName.includes('.spec.');
  }
  
  /**
   * Detect frontend file type from path
   */
  private detectFrontendFileType(filePath: string): ScannedFile['type'] {
    const lowerPath = filePath.toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();
    
    // Components - UI elements
    if (lowerPath.includes('/components/') || lowerPath.endsWith('.component.tsx') || lowerPath.endsWith('.component.jsx')) {
      return 'component';
    }
    
    // Pages - routes/screens
    if (lowerPath.includes('/pages/') || lowerPath.includes('/app/')) {
      return 'page';
    }
    
    // Hooks - custom React hooks
    if (lowerPath.includes('/hooks/') || (lowerPath.includes('use') && /use[A-Z]/.test(path.basename(filePath)))) {
      return 'hook';
    }
    
    // Utilities - helpers, constants, Redux, store, etc.
    if (lowerPath.includes('/utils/') || 
        lowerPath.includes('/helpers/') ||
        lowerPath.includes('/constants/') ||
        lowerPath.includes('/redux/') ||
        lowerPath.includes('/store/') ||
        lowerPath.includes('/actions/') ||
        lowerPath.includes('/reducers/') ||
        fileName.includes('reducer') ||
        fileName.includes('store') ||
        fileName.includes('action') ||
        fileName === 'constants.js' ||
        fileName === 'constants.ts') {
      return 'util';
    }
    
    return 'other';
  }
  
  /**
   * Detect backend file type from path
   */
  private detectBackendFileType(filePath: string): ScannedFile['type'] {
    const fileName = path.basename(filePath);
    
    if (fileName.includes('.service.')) {
      return 'service';
    }
    
    if (fileName.includes('.controller.')) {
      return 'controller';
    }
    
    if (fileName.includes('.model.') || fileName.includes('.entity.')) {
      return 'model';
    }
    
    return 'other';
  }
  
  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'TypeScript';
      case '.js':
      case '.jsx':
        return 'JavaScript';
      case '.py':
        return 'Python';
      case '.go':
        return 'Go';
      case '.cs':
        return 'C#';
      default:
        return 'Unknown';
    }
  }
}
