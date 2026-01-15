import { ChevronRight, Lock, FileEdit, Compass, DollarSign, Wrench, User, CreditCard } from 'lucide-react';
import { TestSuite } from '@/types/suite.types';

interface SuitesTableProps {
  suites: TestSuite[];
  onSuiteClick: (suiteId: string) => void;
  onViewAll: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  authentication: Lock,
  crud: FileEdit,
  navigation: Compass,
  workflow: DollarSign,
  banking: CreditCard,
  user: User,
  other: Wrench,
};

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'text-error',
  HIGH: 'text-warning',
  MEDIUM: 'text-accent',
  LOW: 'text-white/50',
};

function getStatusDisplay(suite: TestSuite) {
  const testCases = suite.testCases || [];
  const generated = testCases.filter(tc => 
    tc.status !== 'not-generated' && tc.status !== 'pending'
  ).length;
  
  if (generated === 0) {
    return { label: 'No tests', icon: '⚪', color: 'text-white/50' };
  }
  
  const passing = testCases.filter(tc => tc.status === 'passed' || tc.status === 'passing').length;
  const failing = testCases.filter(tc => tc.status === 'failed' || tc.status === 'failing').length;
  
  if (failing > 0) {
    return { label: 'Failing', icon: '❌', color: 'text-error' };
  }
  
  if (passing === testCases.length) {
    return { label: 'Passing', icon: '✅', color: 'text-success' };
  }
  
  return { label: 'Partial', icon: '🟡', color: 'text-warning' };
}

export function SuitesTable({ suites, onSuiteClick, onViewAll }: SuitesTableProps) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Suites</h2>
        <button
          onClick={onViewAll}
          className="text-sm text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="divide-y divide-white/5">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_80px_100px_100px_80px_40px] gap-4 px-6 py-3 text-xs text-white/40 uppercase tracking-wide">
          <span>Suite</span>
          <span className="text-center">Cases</span>
          <span className="text-center">Generated</span>
          <span className="text-center">Status</span>
          <span className="text-center">Priority</span>
          <span></span>
        </div>

        {/* Table Rows */}
        {suites.slice(0, 5).map((suite) => {
          const CategoryIcon = CATEGORY_ICONS[suite.category] || Wrench;
          const testCases = suite.testCases || [];
          const generatedCount = testCases.filter(tc => 
            tc.status !== 'not-generated' && tc.status !== 'pending'
          ).length;
          const status = getStatusDisplay(suite);
          const totalCases = suite.stats?.totalCases ?? testCases.length;
          
          return (
            <div
              key={suite.id}
              onClick={() => onSuiteClick(suite.id)}
              className="grid grid-cols-[1fr_80px_100px_100px_80px_40px] gap-4 px-6 py-4 hover:bg-white/5 cursor-pointer transition-colors items-center"
            >
              {/* Suite Name */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CategoryIcon className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium truncate">{suite.name}</span>
              </div>

              {/* Cases */}
              <span className="text-center text-white/70">{totalCases}</span>

              {/* Generated */}
              <span className={`text-center ${generatedCount === 0 ? 'text-white/40' : 'text-white/70'}`}>
                {generatedCount}/{totalCases}
              </span>

              {/* Status */}
              <div className={`flex items-center justify-center gap-2 ${status.color}`}>
                <span>{status.icon}</span>
                <span className="text-sm">{status.label}</span>
              </div>

              {/* Priority */}
              <span className={`text-center text-sm font-medium ${PRIORITY_STYLES[suite.priority]}`}>
                {suite.priority}
              </span>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
          );
        })}

        {/* Show more indicator if more than 5 suites */}
        {suites.length > 5 && (
          <div className="px-6 py-3 text-center text-sm text-white/40">
            +{suites.length - 5} more suites
          </div>
        )}
      </div>
    </div>
  );
}
