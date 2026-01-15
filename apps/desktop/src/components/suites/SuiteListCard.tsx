import { Play, Sparkles, ChevronRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { TestSuite, PRIORITY_COLORS } from '@/types/suite.types';

interface SuiteListCardProps {
  suite: TestSuite;
  onClick?: () => void;
  onRun?: () => void;
  onGenerate?: () => void;
}

export function SuiteListCard({ suite, onClick, onRun, onGenerate }: SuiteListCardProps) {
  const totalCases = suite.testCases?.length || 0;
  const generatedCases = suite.testCases?.filter(tc => 
    tc.testFilePath || tc.status === 'passing' || tc.status === 'passed'
  ).length || 0;
  const hasTests = generatedCases > 0;
  const allGenerated = generatedCases === totalCases && totalCases > 0;
  
  const priorityColor = PRIORITY_COLORS[suite.priority] || PRIORITY_COLORS['MEDIUM'];
  
  // Determine suite status
  const passingCases = suite.testCases?.filter(tc => 
    tc.status === 'passing' || tc.status === 'passed'
  ).length || 0;
  const failingCases = suite.testCases?.filter(tc => 
    tc.status === 'failing' || tc.status === 'failed'
  ).length || 0;
  const flakyCases = suite.testCases?.filter(tc => tc.status === 'flaky').length || 0;
  
  // Overall suite status indicator
  const getSuiteStatus = () => {
    if (!hasTests) return { icon: Clock, color: '#64748b', label: 'Not Generated' };
    if (failingCases > 0) return { icon: AlertTriangle, color: '#ef4444', label: 'Failing' };
    if (flakyCases > 0) return { icon: AlertTriangle, color: '#f59e0b', label: 'Flaky' };
    return { icon: CheckCircle2, color: '#22c55e', label: 'Passing' };
  };
  
  const status = getSuiteStatus();
  const StatusIcon = status.icon;

  return (
    <div 
      className={`
        rounded-xl p-5 transition-all cursor-pointer hover:scale-[1.01]
        ${hasTests 
          ? 'bg-white/5 border-2 border-white/20 hover:border-white/30' 
          : 'bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-white/20'
        }
      `}
      onClick={onClick}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Status + Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${status.color}15` }}
          >
            <StatusIcon className="w-5 h-5" style={{ color: status.color }} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white truncate">{suite.name}</h3>
              <span 
                className="text-xs font-medium px-2 py-0.5 rounded flex-shrink-0"
                style={{ 
                  backgroundColor: `${priorityColor}20`,
                  color: priorityColor 
                }}
              >
                {suite.priority}
              </span>
            </div>
            
            {suite.description && (
              <p className="text-sm text-white/50 line-clamp-1">{suite.description}</p>
            )}
          </div>
        </div>

        {/* Right: Stats + Action */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Generated Count */}
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold ${hasTests ? 'text-white' : 'text-white/40'}`}>
                {generatedCases}
              </span>
              <span className="text-white/40 text-sm">/ {totalCases}</span>
            </div>
            <p className="text-xs text-white/40">cases</p>
          </div>

          {/* Progress Ring */}
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-white/10"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke={hasTests ? '#22c55e' : '#64748b'}
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(generatedCases / Math.max(totalCases, 1)) * 125.6} 125.6`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
              {totalCases > 0 ? Math.round((generatedCases / totalCases) * 100) : 0}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!allGenerated && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate?.();
                }}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Generate ({totalCases - generatedCases})
              </button>
            )}
            {hasTests && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRun?.();
                }}
                className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors text-sm"
              >
                <Play className="w-4 h-4" />
                Run ({generatedCases})
              </button>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-white/30" />
        </div>
      </div>

      {/* Bottom Row: Meta Info */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
        {suite.category && (
          <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
            {suite.category}
          </span>
        )}
        
        {hasTests && (
          <>
            {passingCases > 0 && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {passingCases} passing
              </span>
            )}
            {failingCases > 0 && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {failingCases} failing
              </span>
            )}
            {flakyCases > 0 && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {flakyCases} flaky
              </span>
            )}
          </>
        )}
        
        {!hasTests && (
          <span className="text-xs text-white/30 italic">No tests generated yet</span>
        )}
        
        <span className="text-xs text-white/30 ml-auto">
          {suite.testCases?.reduce((sum, tc) => sum + (tc.steps?.length || 0), 0) || 0} total steps
        </span>
      </div>
    </div>
  );
}
