import { ChevronRight, Play, Eye, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { TestCase } from '@/types/suite.types';
import { PRIORITY_COLORS, STATUS_COLORS } from '@/types/suite.types';

interface CaseCardProps {
  testCase: TestCase;
  onClick?: () => void;
  onRun?: () => void;
  onViewCode?: () => void;
}

const STATUS_ICONS = {
  passed: CheckCircle2,
  failed: XCircle,
  pending: Clock,
  running: AlertCircle,
  'not-generated': Clock, // Backend returns 'not-generated', show same as pending
  passing: CheckCircle2,   // Backend also uses 'passing'
  failing: XCircle,        // Backend also uses 'failing'
  flaky: AlertCircle,      // Backend also uses 'flaky'
};

export function CaseCard({ testCase, onClick, onRun, onViewCode }: CaseCardProps) {
  const StatusIcon = STATUS_ICONS[testCase.status] || Clock;
  const statusColor = STATUS_COLORS[testCase.status] || STATUS_COLORS['pending'];
  const priorityColor = PRIORITY_COLORS[testCase.priority] || PRIORITY_COLORS['MEDIUM'];

  return (
    <div 
      className={`glass rounded-lg p-5 border-l-4 hover:bg-white/5 transition-all cursor-pointer`}
      style={{ borderLeftColor: priorityColor }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${statusColor}20` }}
          >
            <StatusIcon className="w-5 h-5" style={{ color: statusColor }} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">{testCase.name}</h4>
            <p className="text-sm text-white/60">{testCase.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span 
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ 
              backgroundColor: `${priorityColor}20`,
              color: priorityColor 
            }}
          >
            {testCase.priority}
          </span>
          <span 
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ 
              backgroundColor: `${statusColor}20`,
              color: statusColor 
            }}
          >
            {testCase.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center bg-white/5 rounded-lg py-2">
          <p className="text-lg font-bold">{testCase.steps.length}</p>
          <p className="text-xs text-white/60">Steps</p>
        </div>
        <div className="text-center bg-white/5 rounded-lg py-2">
          <p className="text-lg font-bold">{testCase.metadata?.estimatedDuration || testCase.estimatedDuration || 0}s</p>
          <p className="text-xs text-white/60">Duration</p>
        </div>
        <div className="text-center bg-white/5 rounded-lg py-2">
          <p className="text-lg font-bold">{testCase.testFilePath ? '✓' : '✗'}</p>
          <p className="text-xs text-white/60">Generated</p>
        </div>
      </div>

      {/* Test File Path */}
      {testCase.testFilePath && (
        <div className="mb-3 p-2 bg-white/5 rounded text-xs text-white/60 font-mono truncate">
          {testCase.testFilePath}
        </div>
      )}

      {/* Tags */}
      {testCase.tags && testCase.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {testCase.tags.map((tag, idx) => (
            <span 
              key={idx}
              className="text-xs px-2 py-0.5 bg-white/10 rounded text-white/70"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-white/60">
          {testCase.lastRun && (
            <span>Last run: {new Date(testCase.lastRun.timestamp).toLocaleDateString()}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onViewCode && testCase.testFilePath && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewCode();
              }}
              className="text-sm px-3 py-1.5 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              Code
            </button>
          )}
          {onRun && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRun();
              }}
              className="text-sm px-3 py-1.5 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
          )}
          <ChevronRight className="w-5 h-5 text-white/40" />
        </div>
      </div>
    </div>
  );
}
