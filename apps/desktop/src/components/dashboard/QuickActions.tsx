import { Play, Sparkles, CheckCircle2 } from 'lucide-react';

interface QuickActionsProps {
  testsReady: number;
  casesWithoutTests: number;
  missingCaseNames: string[];
  lastRunStatus?: 'passed' | 'failed' | 'none';
  lastRunTime?: string;
  onRunAll: () => void;
  onGenerateMissing: () => void;
  isRunning?: boolean;
  isGenerating?: boolean;
}

export function QuickActions({
  testsReady,
  casesWithoutTests,
  missingCaseNames,
  lastRunStatus = 'none',
  lastRunTime,
  onRunAll,
  onGenerateMissing,
  isRunning = false,
  isGenerating = false,
}: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Run All Tests */}
      <button
        onClick={onRunAll}
        disabled={testsReady === 0 || isRunning}
        className="glass rounded-xl p-5 text-left hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Play className={`w-5 h-5 text-primary ${isRunning ? 'animate-pulse' : ''}`} />
          </div>
          <span className="text-lg font-semibold">Run All Tests</span>
        </div>
        <p className="text-sm text-white/60 mb-2">
          {testsReady} {testsReady === 1 ? 'test' : 'tests'} ready
        </p>
        {lastRunStatus !== 'none' && lastRunTime && (
          <div className="flex items-center gap-2 text-xs">
            <span className={lastRunStatus === 'passed' ? 'text-success' : 'text-error'}>
              {lastRunStatus === 'passed' ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  All passed
                </span>
              ) : (
                'Some failed'
              )}
            </span>
            <span className="text-white/40">• {lastRunTime}</span>
          </div>
        )}
      </button>

      {/* Generate Missing Tests */}
      <button
        onClick={onGenerateMissing}
        disabled={casesWithoutTests === 0 || isGenerating}
        className="glass rounded-xl p-5 text-left hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group border border-dashed border-white/10 hover:border-primary/30"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
            <Sparkles className={`w-5 h-5 text-accent ${isGenerating ? 'animate-spin' : ''}`} />
          </div>
          <span className="text-lg font-semibold">Generate Missing Tests</span>
        </div>
        <p className="text-sm text-white/60 mb-2">
          {casesWithoutTests} {casesWithoutTests === 1 ? 'case' : 'cases'} without tests
        </p>
        {missingCaseNames.length > 0 && (
          <p className="text-xs text-white/40 truncate">
            {missingCaseNames.slice(0, 2).join(', ')}
            {missingCaseNames.length > 2 && `, +${missingCaseNames.length - 2} more`}
          </p>
        )}
      </button>
    </div>
  );
}
