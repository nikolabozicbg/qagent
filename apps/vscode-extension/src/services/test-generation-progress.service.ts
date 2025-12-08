import * as vscode from 'vscode';

/**
 * Generation stages for tracking progress
 */
export enum GenerationStage {
  READING_SOURCE = 'reading',
  ANALYZING_DEPS = 'analyzing',
  GENERATING_TESTS = 'generating',
  CREATING_FILE = 'creating',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Progress update event
 */
export interface ProgressUpdate {
  stage: GenerationStage;
  message: string;
  percentage: number;
}

/**
 * Service for tracking and displaying test generation progress
 */
export class TestGenerationProgressService {
  private currentProgress: vscode.Progress<{ message?: string; increment?: number }> | null = null;
  private cancellationToken: vscode.CancellationToken | null = null;
  
  /**
   * Start progress notification with stages
   */
  async withProgress<T>(
    title: string,
    task: (reporter: (update: ProgressUpdate) => void, token: vscode.CancellationToken) => Promise<T>
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
      },
      async (progress, token) => {
        this.currentProgress = progress;
        this.cancellationToken = token;
        
        // Reporter function for task to call
        const reporter = (update: ProgressUpdate) => {
          this.reportProgress(update);
        };
        
        try {
          const result = await task(reporter, token);
          return result;
        } finally {
          this.currentProgress = null;
          this.cancellationToken = null;
        }
      }
    );
  }
  
  /**
   * Report progress update
   */
  private reportProgress(update: ProgressUpdate) {
    if (!this.currentProgress) return;
    
    const stageEmoji = this.getStageEmoji(update.stage);
    this.currentProgress.report({
      message: `${stageEmoji} ${update.message}`,
      increment: update.percentage
    });
  }
  
  /**
   * Get emoji for stage
   */
  private getStageEmoji(stage: GenerationStage): string {
    switch (stage) {
      case GenerationStage.READING_SOURCE:
        return '📖';
      case GenerationStage.ANALYZING_DEPS:
        return '🔍';
      case GenerationStage.GENERATING_TESTS:
        return '⚙️';
      case GenerationStage.CREATING_FILE:
        return '📝';
      case GenerationStage.COMPLETE:
        return '✅';
      case GenerationStage.ERROR:
        return '❌';
      default:
        return '⏳';
    }
  }
  
  /**
   * Check if operation was cancelled
   */
  isCancelled(): boolean {
    return this.cancellationToken?.isCancellationRequested ?? false;
  }
}
