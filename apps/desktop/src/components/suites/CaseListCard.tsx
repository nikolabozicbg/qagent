import { 
  Play, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileCode,
  Timer,
  MousePointer,
  Navigation,
  Edit3,
  Eye,
  Send,
  Loader2
} from 'lucide-react';
import { TestCase, PRIORITY_COLORS, STATUS_COLORS } from '@/types/suite.types';

interface CaseListCardProps {
  testCase: TestCase;
  onClick?: () => void;
  onRun?: () => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
  showStepsPreview?: boolean;
  maxStepsPreview?: number;
}

const STATUS_CONFIG = {
  passed: { icon: CheckCircle2, label: 'Passing' },
  passing: { icon: CheckCircle2, label: 'Passing' },
  failed: { icon: XCircle, label: 'Failed' },
  failing: { icon: XCircle, label: 'Failing' },
  flaky: { icon: AlertTriangle, label: 'Flaky' },
  pending: { icon: Clock, label: 'Pending' },
  running: { icon: Clock, label: 'Running' },
  'not-generated': { icon: Clock, label: 'Not Generated' },
};

export function CaseListCard({ 
  testCase, 
  onClick, 
  onRun, 
  onGenerate,
  isGenerating = false,
  showStepsPreview = true,
  maxStepsPreview = 3
}: CaseListCardProps) {
  const isGenerated = testCase.testFilePath || 
    testCase.status === 'passing' || 
    testCase.status === 'passed';
  
  const priorityColor = PRIORITY_COLORS[testCase.priority] || PRIORITY_COLORS['MEDIUM'];
  const statusColor = STATUS_COLORS[testCase.status] || STATUS_COLORS['pending'];
  const statusConfig = STATUS_CONFIG[testCase.status] || STATUS_CONFIG['pending'];
  const StatusIcon = statusConfig.icon;

  const steps = testCase.steps || [];
  const previewSteps = steps.slice(0, maxStepsPreview);
  const hasMoreSteps = steps.length > maxStepsPreview;

  // Get icon for step action
  const getStepIcon = (action: string) => {
    const actionLower = action?.toLowerCase() || '';
    if (actionLower.includes('navigate') || actionLower.includes('go to')) return Navigation;
    if (actionLower.includes('click') || actionLower.includes('press')) return MousePointer;
    if (actionLower.includes('fill') || actionLower.includes('type') || actionLower.includes('enter')) return Edit3;
    if (actionLower.includes('verify') || actionLower.includes('check') || actionLower.includes('assert')) return Eye;
    if (actionLower.includes('submit') || actionLower.includes('send')) return Send;
    return MousePointer;
  };

  // Format step text for display
  const formatStepText = (step: any) => {
    const action = step.action || '';
    const target = step.target || step.selector || '';
    const value = step.value || '';
    
    // Build readable text
    let text = action;
    if (target && !action.toLowerCase().includes(target.toLowerCase())) {
      text += ` ${target}`;
    }
    if (value) {
      text += `: "${value}"`;
    }
    return text || step.description || 'Step';
  };

  // Format test file path for display
  const formatFilePath = (path: string) => {
    const parts = path.split('/');
    return parts.slice(-2).join('/'); // Show last 2 segments
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div 
      className={`
        rounded-xl transition-all cursor-pointer hover:scale-[1.005]
        ${isGenerated 
          ? 'bg-white/5 border border-white/15 hover:border-white/25' 
          : 'bg-white/[0.02] border border-dashed border-white/10 hover:border-white/20'
        }
      `}
      onClick={onClick}
    >
      {/* Main Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Status Icon */}
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${statusColor}15` }}
            >
              <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
            </div>
            
            {/* Title & Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h4 className="font-medium text-white">{testCase.name}</h4>
                
                {/* Generated Badge */}
                {isGenerated && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Generated
                  </span>
                )}
                
                {/* Priority Badge */}
                <span 
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: `${priorityColor}20`,
                    color: priorityColor 
                  }}
                >
                  {testCase.priority}
                </span>
              </div>
              
              {testCase.description && (
                <p className="text-sm text-white/50 line-clamp-1">{testCase.description}</p>
              )}
            </div>
          </div>

          {/* Right Side: Action */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isGenerated ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRun?.();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Run
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isGenerating) onGenerate?.();
                }}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            )}
            <ChevronRight className="w-4 h-4 text-white/30" />
          </div>
        </div>

        {/* Steps Preview */}
        {showStepsPreview && steps.length > 0 && (
          <div className="bg-white/[0.03] rounded-lg p-3 mb-3">
            <div className="space-y-2">
              {previewSteps.map((step, idx) => {
                const StepIcon = getStepIcon(step.action);
                return (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-5 h-5 rounded bg-white/5 flex-shrink-0">
                      <StepIcon className="w-3 h-3 text-white/40" />
                    </div>
                    <span className="text-sm text-white/70 line-clamp-1">
                      {formatStepText(step)}
                    </span>
                  </div>
                );
              })}
              {hasMoreSteps && (
                <div className="text-xs text-white/40 pl-[30px]">
                  +{steps.length - maxStepsPreview} more steps
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer: Meta Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-white/40">
            {/* Steps Count */}
            <span className="flex items-center gap-1">
              <span className="font-medium text-white/60">{steps.length}</span> steps
            </span>
            
            {/* Duration */}
            {(testCase.estimatedDuration || testCase.metadata?.estimatedDuration) && (
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {formatDuration(testCase.estimatedDuration || testCase.metadata?.estimatedDuration || 0)}
              </span>
            )}
            
            {/* Last Run */}
            {testCase.lastRun && (
              <span className="text-white/30">
                Last: {new Date(testCase.lastRun.timestamp).toLocaleDateString()}
                {testCase.lastRun.duration && ` (${formatDuration(testCase.lastRun.duration)})`}
              </span>
            )}
          </div>
          
          {/* Test File Path */}
          {testCase.testFilePath && (
            <span className="flex items-center gap-1 text-white/30 font-mono">
              <FileCode className="w-3 h-3" />
              {formatFilePath(testCase.testFilePath)}
            </span>
          )}
        </div>
      </div>

      {/* Tags Strip */}
      {testCase.tags && testCase.tags.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2 overflow-x-auto">
          {testCase.tags.map((tag, idx) => (
            <span 
              key={idx}
              className="text-xs px-2 py-0.5 bg-white/5 rounded text-white/50 whitespace-nowrap"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
