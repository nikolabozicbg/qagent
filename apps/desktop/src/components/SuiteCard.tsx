import { ChevronRight, Play, Eye, Wrench } from 'lucide-react';
import { TestSuite } from '@/types/suite.types';
import { PRIORITY_COLORS, CATEGORY_ICONS } from '@/types/suite.types';

interface SuiteCardProps {
  suite: TestSuite;
  onClick?: () => void;
  onRun?: () => void;
  onViewDetails?: () => void;
}

export function SuiteCard({ suite, onClick, onRun, onViewDetails }: SuiteCardProps) {
  const CategoryIcon = CATEGORY_ICONS[suite.category] || Wrench;
  const priorityColor = PRIORITY_COLORS[suite.priority] || PRIORITY_COLORS['MEDIUM'];
  
  const completedCases = suite.testCases.filter(tc => tc.status === 'passed').length;
  const failedCases = suite.testCases.filter(tc => tc.status === 'failed').length;
  const pendingCases = suite.testCases.filter(tc => tc.status === 'pending').length;

  return (
    <div 
      className={`glass rounded-xl p-6 border-l-4 hover:bg-white/5 transition-all cursor-pointer`}
      style={{ borderLeftColor: priorityColor }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <CategoryIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">{suite.name}</h3>
            <p className="text-sm text-white/60">{suite.category}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span 
            className="text-xs font-medium px-3 py-1 rounded-full"
            style={{ 
              backgroundColor: `${priorityColor}20`,
              color: priorityColor 
            }}
          >
            {suite.priority}
          </span>
        </div>
      </div>

      {/* Description */}
      {suite.description && (
        <p className="text-sm text-white/70 mb-4">{suite.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{suite.stats.totalCases}</p>
          <p className="text-xs text-white/60">Test Cases</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{suite.stats.totalSteps}</p>
          <p className="text-xs text-white/60">Steps</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{suite.stats.estimatedDuration}s</p>
          <p className="text-xs text-white/60">Est. Time</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-white/60 mb-2">
          <span>Progress</span>
          <span>{completedCases}/{suite.stats.totalCases} completed</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
          {completedCases > 0 && (
            <div 
              className="bg-success"
              style={{ width: `${(completedCases / suite.stats.totalCases) * 100}%` }}
            />
          )}
          {failedCases > 0 && (
            <div 
              className="bg-error"
              style={{ width: `${(failedCases / suite.stats.totalCases) * 100}%` }}
            />
          )}
          {pendingCases > 0 && (
            <div 
              className="bg-white/20"
              style={{ width: `${(pendingCases / suite.stats.totalCases) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/60">
          {completedCases > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" />
              {completedCases} passed
            </span>
          )}
          {failedCases > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-error" />
              {failedCases} failed
            </span>
          )}
          {pendingCases > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white/20" />
              {pendingCases} pending
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onViewDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="text-sm px-3 py-1.5 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              View
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
