import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  MousePointer,
  Navigation,
  Edit3,
  Eye,
  Send,
  Target,
  ArrowRight
} from 'lucide-react';
import { TestStep } from '@/types/suite.types';
import { STATUS_COLORS } from '@/types/suite.types';

interface StepItemProps {
  step: TestStep;
  stepNumber: number;
}

// Get icon based on action type
const getActionIcon = (action: string | undefined) => {
  const actionLower = action?.toLowerCase() || '';
  if (actionLower.includes('navigate') || actionLower.includes('go to') || actionLower.includes('open')) return Navigation;
  if (actionLower.includes('click') || actionLower.includes('press') || actionLower.includes('tap')) return MousePointer;
  if (actionLower.includes('fill') || actionLower.includes('type') || actionLower.includes('enter') || actionLower.includes('input')) return Edit3;
  if (actionLower.includes('verify') || actionLower.includes('check') || actionLower.includes('assert') || actionLower.includes('expect')) return Eye;
  if (actionLower.includes('submit') || actionLower.includes('send') || actionLower.includes('confirm')) return Send;
  return Target;
};

export function StepItem({ step, stepNumber }: StepItemProps) {
  const ActionIcon = getActionIcon(step.action);
  const statusColor = step.status ? (STATUS_COLORS[step.status] || '#6b7280') : '#6b7280';
  const isPassed = step.status === 'passed' || step.status === 'passing';
  const isFailed = step.status === 'failed' || step.status === 'failing';

  // Format the action for display
  const formatAction = () => {
    const action = step.action || 'Action';
    const target = step.target || '';
    const value = step.value || '';
    
    let parts = [action];
    if (target) parts.push(target);
    if (value) parts.push(`"${value}"`);
    
    return parts.join(' ');
  };

  return (
    <div className={`
      rounded-xl border transition-all
      ${isFailed ? 'bg-red-500/5 border-red-500/20' : isPassed ? 'bg-green-500/5 border-green-500/20' : 'bg-white/[0.02] border-white/10'}
    `}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Step Number Circle */}
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
            ${isFailed ? 'bg-red-500/20 text-red-400' : isPassed ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}
          `}>
            {stepNumber}
          </div>

          {/* Step Content */}
          <div className="flex-1 min-w-0">
            {/* Main Action Line */}
            <div className="flex items-center gap-2 mb-1">
              <ActionIcon className={`w-4 h-4 flex-shrink-0 ${isFailed ? 'text-red-400' : isPassed ? 'text-green-400' : 'text-primary'}`} />
              <span className="font-medium text-white">{formatAction()}</span>
            </div>
            
            {/* Selector (if present) */}
            {step.selector && (
              <div className="flex items-center gap-2 mt-2">
                <ArrowRight className="w-3 h-3 text-white/30 flex-shrink-0" />
                <code className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded font-mono truncate">
                  {step.selector}
                </code>
              </div>
            )}

            {/* Expected Result */}
            {step.expectedResult && (
              <div className="flex items-start gap-2 mt-2">
                <Eye className="w-3 h-3 text-white/30 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-white/50">
                  Expected: <span className="text-white/70">{step.expectedResult}</span>
                </span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          {step.status && (
            <div 
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0"
              style={{ 
                backgroundColor: `${statusColor}15`,
                color: statusColor 
              }}
            >
              {isPassed && <CheckCircle2 className="w-3 h-3" />}
              {isFailed && <XCircle className="w-3 h-3" />}
              {!isPassed && !isFailed && <Clock className="w-3 h-3" />}
            </div>
          )}
        </div>
      </div>

      {/* Error Message (if failed) */}
      {isFailed && step.error && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-red-400 font-medium mb-1">Error</div>
                <div className="text-sm text-white/70 break-words">{step.error}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
