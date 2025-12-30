import * as vscode from 'vscode';
import { DiscoveryProgress } from './types';

/**
 * Progress formatter strategy interface
 */
export interface IProgressFormatter {
  format(progress: DiscoveryProgress): { message: string; increment?: number };
}

/**
 * Default progress formatter implementation
 */
export class DefaultProgressFormatter implements IProgressFormatter {
  format(progress: DiscoveryProgress): { message: string; increment?: number } {
    switch (progress.type) {
      case 'init':
        return { message: 'Initializing scan...', increment: 0 };
        
      case 'component':
      case 'route':
      case 'api':
      case 'form':
        return {
          message: this.formatCounters(progress),
          increment: 2
        };
        
      case 'journey':
        if (progress.data.journey) {
          const { name, confidence } = progress.data.journey;
          return {
            message: `✨ Found: ${name} (${Math.round(confidence * 100)}% confidence)`,
            increment: 5
          };
        }
        return { message: 'Analyzing journeys...' };
        
      case 'complete':
        if (progress.data.summary) {
          const { totalJourneys, estimatedCoverage } = progress.data.summary;
          return {
            message: `✅ Complete! ${totalJourneys} journeys • ${Math.round(estimatedCoverage)}% coverage`,
            increment: 100
          };
        }
        return { message: '✅ Analysis complete!' };
        
      default:
        return { message: 'Processing...' };
    }
  }

  private formatCounters(progress: DiscoveryProgress): string {
    const parts: string[] = [];
    
    if (progress.data.componentsCount !== undefined) {
      parts.push(`📦 ${progress.data.componentsCount} components`);
    }
    if (progress.data.routesCount !== undefined) {
      parts.push(`🛣️ ${progress.data.routesCount} routes`);
    }
    if (progress.data.apisCount !== undefined) {
      parts.push(`🌐 ${progress.data.apisCount} APIs`);
    }
    if (progress.data.formsCount !== undefined) {
      parts.push(`📝 ${progress.data.formsCount} forms`);
    }
    
    // Show current file if available
    if (progress.data.currentFile) {
      return `🔍 ${progress.data.currentFile}`;
    }
    
    return parts.join(' • ') || 'Analyzing...';
  }
}

/**
 * ProgressNotifier - Single Responsibility: Handle VSCode progress UI
 * 
 * SOLID Principles:
 * - Single Responsibility: Only displays progress in VSCode
 * - Open/Closed: Open for extension via IProgressFormatter
 * - Liskov Substitution: Any IProgressFormatter can be used
 * - Interface Segregation: Minimal, focused interface
 * - Dependency Inversion: Depends on IProgressFormatter abstraction
 */
export class ProgressNotifier {
  constructor(
    private readonly formatter: IProgressFormatter = new DefaultProgressFormatter()
  ) {}

  /**
   * Show progress in VSCode notification with cancellation support
   */
  async showProgress(
    title: string,
    onUpdate: (report: (progress: DiscoveryProgress) => void) => Promise<void>,
    options: {
      location?: vscode.ProgressLocation;
      cancellable?: boolean;
    } = {}
  ): Promise<void> {
    return vscode.window.withProgress(
      {
        location: options.location ?? vscode.ProgressLocation.Notification,
        title,
        cancellable: options.cancellable ?? false,
      },
      async (progress, token) => {
        // Setup progress reporter
        const reporter = (discoveryProgress: DiscoveryProgress) => {
          const { message, increment } = this.formatter.format(discoveryProgress);
          progress.report({ message, increment });
        };

        // Check for cancellation
        if (token.isCancellationRequested) {
          throw new Error('Progress cancelled by user');
        }

        token.onCancellationRequested(() => {
          throw new Error('Progress cancelled by user');
        });

        // Run the update callback
        await onUpdate(reporter);
      }
    );
  }

  /**
   * Show simple status bar progress
   */
  async showStatusBarProgress(
    message: string,
    task: () => Promise<void>
  ): Promise<void> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: message,
      },
      async () => {
        await task();
      }
    );
  }
}
