interface CoverageBarProps {
  percentage: number;
  totalCases: number;
  coveredCases: number;
  criticalCovered: number;
  highMissing: number;
}

export function CoverageBar({ 
  percentage, 
  totalCases, 
  coveredCases, 
  criticalCovered,
  highMissing 
}: CoverageBarProps) {
  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Test Coverage</h2>
        <span className="text-2xl font-bold">{percentage}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-white/60">
        <span>{coveredCases}/{totalCases} cases have tests</span>
        <span>•</span>
        <span className="text-success">{criticalCovered} CRITICAL covered</span>
        {highMissing > 0 && (
          <>
            <span>•</span>
            <span className="text-warning">{highMissing} HIGH missing</span>
          </>
        )}
      </div>
    </div>
  );
}
