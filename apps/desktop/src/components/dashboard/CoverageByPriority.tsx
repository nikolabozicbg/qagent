interface PriorityCoverage {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  covered: number;
  total: number;
}

interface CoverageByPriorityProps {
  coverageData: PriorityCoverage[];
}

const PRIORITY_COLORS = {
  CRITICAL: 'bg-error',
  HIGH: 'bg-warning',
  MEDIUM: 'bg-accent',
  LOW: 'bg-white/30',
};

export function CoverageByPriority({ coverageData }: CoverageByPriorityProps) {
  return (
    <div className="glass rounded-xl p-6">
      <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">
        Coverage by Priority
      </h2>
      
      <div className="space-y-4">
        {coverageData.map(({ priority, covered, total }) => {
          const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;
          
          return (
            <div key={priority}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{priority}</span>
                <span className="text-sm text-white/60">
                  {covered}/{total} {percentage > 0 ? `${percentage}%` : '—'}
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${PRIORITY_COLORS[priority]} rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
