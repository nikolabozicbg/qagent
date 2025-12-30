import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ComponentMetadata {
  filePath: string;
  sourceCode: string;
  componentName: string;
  fileType: 'tsx' | 'jsx' | 'ts' | 'js';
  exists: boolean;
}

@Injectable()
export class ComponentExtractorService {
  private readonly logger = new Logger(ComponentExtractorService.name);

  /**
   * Extract full component source code and metadata
   */
  async extractComponent(
    componentPath: string,
    projectRoot: string,
  ): Promise<ComponentMetadata> {
    try {
      const fullPath = path.isAbsolute(componentPath)
        ? componentPath
        : path.join(projectRoot, componentPath);

      // Check if file exists
      const exists = await this.fileExists(fullPath);
      if (!exists) {
        this.logger.warn(`Component file not found: ${fullPath}`);
        return {
          filePath: fullPath,
          sourceCode: '',
          componentName: this.extractComponentName(componentPath),
          fileType: this.getFileType(componentPath),
          exists: false,
        };
      }

      // Read source code
      const sourceCode = await fs.readFile(fullPath, 'utf-8');

      return {
        filePath: fullPath,
        sourceCode,
        componentName: this.extractComponentName(componentPath),
        fileType: this.getFileType(componentPath),
        exists: true,
      };
    } catch (error) {
      this.logger.error(
        `Error extracting component ${componentPath}:`,
        error.message,
      );
      return {
        filePath: componentPath,
        sourceCode: '',
        componentName: this.extractComponentName(componentPath),
        fileType: this.getFileType(componentPath),
        exists: false,
      };
    }
  }

  /**
   * Extract multiple components in parallel
   */
  async extractComponents(
    componentPaths: string[],
    projectRoot: string,
  ): Promise<ComponentMetadata[]> {
    const promises = componentPaths.map((path) =>
      this.extractComponent(path, projectRoot),
    );
    return Promise.all(promises);
  }

  /**
   * Extract component name from file path
   */
  private extractComponentName(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName;
  }

  /**
   * Get file type from extension
   */
  private getFileType(filePath: string): 'tsx' | 'jsx' | 'ts' | 'js' {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.tsx':
        return 'tsx';
      case '.jsx':
        return 'jsx';
      case '.ts':
        return 'ts';
      case '.js':
        return 'js';
      default:
        return 'jsx';
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
