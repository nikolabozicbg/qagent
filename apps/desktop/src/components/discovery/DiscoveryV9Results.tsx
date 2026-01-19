/**
 * DiscoveryV9Results Component
 * 
 * Renders the results of V9 Discovery pipeline.
 * Shows suites/cases/steps with provenance tracking.
 */

import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  TestTube2,
  ListChecks,
  CheckCircle2,
  FileCode2,
  Globe,
  GitMerge,
  Search,
  Filter,
} from 'lucide-react';

// V9 Discovery Result types - aligned with canonical shared-discovery-types
// Accepts either shape: backend canonical or simplified UI shape
type ProvenanceSource = 'SBG' | 'ROG' | 'MERGED';
type CasePriority = 'critical' | 'high' | 'medium' | 'low';

interface StepV9 {
  index: number;
  // Can be string (simplified) or StepAction object (canonical)
  action: string | { type: string; selector: string | null; value: string | null };
  expected: string | { description: string } | null;
  provenance: {
    from: ProvenanceSource;
    refs: string[];
    filePath: string | null;
    lineNumber: number | null;
    runtimeObservationId?: string | null;
  };
  description?: string;
}

interface CaseProvenance {
  // Simplified shape
  from?: ProvenanceSource;
  refs?: string[];
  // Canonical shape
  staticGraphRefs?: string[];
  runtimeRunRefs?: string[];
}

interface CaseV9 {
  id: string;
  name: string;
  intent: string;
  priority: CasePriority;
  confidence: number;
  preconditions: string[];
  steps: StepV9[];
  successCriteria: string[];
  failureScenarios: string[];
  provenance: CaseProvenance;
  tags?: string[];
}

interface SuiteCoverage {
  routes: string[];
  // Optional fields for different shapes
  components?: string[];
  actions?: string[];
  forms?: string[];
  apiEndpoints?: string[];
}

interface SuiteV9 {
  id: string;
  name: string;
  description: string;
  tags: string[];
  cases: CaseV9[];
  coverage: SuiteCoverage;
}

// Summary can have different shapes depending on source
interface DiscoverySummary {
  totalSuites: number;
  totalCases: number;
  totalSteps: number;
  // Optional fields - may or may not be present
  averageConfidence?: number;
  verifiedCaseRate?: number;
  selectorStabilityScore?: number;
  runtimeEvidenceRate?: number;
  provenanceBreakdown?: {
    pureStatic: number;
    pureRuntime: number;
    merged: number;
  };
  qualityIndicators?: {
    hasHighConfidenceCases: boolean;
    hasCriticalPathCoverage: boolean;
    hasFormInteractionCoverage: boolean;
    completenessScore: number;
  };
}

interface DiscoveryDiagnostics {
  // Canonical shape
  errors?: Array<{ code: string; message: string; filePath: string | null; details: unknown }>;
  warnings?: Array<{ code: string; message: string; filePath: string | null; details: unknown }>;
  artifactsPath?: string | null;
  // Simplified shape
  processingTimeMs?: number;
  inputStats?: { sbgNodes: number; rogPages: number };
  mergeStats?: { matchedNodes: number; unmatchedStatic: number; unmatchedRuntime: number };
}

export interface DiscoveryV9ResultsProps {
  result: {
    success: boolean;
    suites: SuiteV9[];
    summary: DiscoverySummary;
    diagnostics: DiscoveryDiagnostics;
    timestamp: string;
    version: 'v9';
  };
}

const priorityColors = {
  critical: 'text-error',
  high: 'text-warning',
  medium: 'text-info',
  low: 'text-text-tertiary',
};

const priorityBgColors = {
  critical: 'bg-error/10 border-error/20',
  high: 'bg-warning/10 border-warning/20',
  medium: 'bg-info/10 border-info/20',
  low: 'bg-surface-elevated/50 border-border/20',
};

const provenanceColors = {
  SBG: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ROG: 'bg-green-500/10 text-green-400 border-green-500/20',
  MERGED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const provenanceIcons = {
  SBG: FileCode2,
  ROG: Globe,
  MERGED: GitMerge,
};

export function DiscoveryV9Results({ result }: DiscoveryV9ResultsProps) {
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const toggleSuite = (id: string) => {
    setExpandedSuites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCase = (id: string) => {
    setExpandedCases(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter suites based on search and priority
  const filteredSuites = useMemo(() => {
    return result.suites.filter(suite => {
      const matchesSearch = searchQuery === '' ||
        suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suite.cases.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority = filterPriority === 'all' ||
        suite.cases.some(c => c.priority === filterPriority);

      return matchesSearch && matchesPriority;
    });
  }, [result.suites, searchQuery, filterPriority]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          icon={Layers}
          label="Suites"
          value={result.summary.totalSuites}
          color="primary"
        />
        <SummaryCard
          icon={TestTube2}
          label="Test Cases"
          value={result.summary.totalCases}
          color="success"
        />
        <SummaryCard
          icon={ListChecks}
          label="Test Steps"
          value={result.summary.totalSteps}
          color="info"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Confidence"
          value={result.summary.averageConfidence != null 
            ? `${Math.round(result.summary.averageConfidence * 100)}%`
            : result.summary.verifiedCaseRate != null
              ? `${result.summary.verifiedCaseRate}%`
              : 'N/A'}
          color="warning"
        />
      </div>

      {/* Provenance Breakdown - only show if available */}
      {result.summary.provenanceBreakdown && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">Provenance Breakdown</h3>
          <div className="flex gap-4">
            <ProvenanceBadge
              type="SBG"
              label="Static (Code)"
              count={result.summary.provenanceBreakdown.pureStatic}
            />
            <ProvenanceBadge
              type="ROG"
              label="Runtime (Explored)"
              count={result.summary.provenanceBreakdown.pureRuntime}
            />
            <ProvenanceBadge
              type="MERGED"
              label="Merged (Both)"
              count={result.summary.provenanceBreakdown.merged}
            />
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary\" size={16} />
          <input
            type="text"
            placeholder="Search suites and cases..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-elevated rounded-lg border border-border/30 text-text-primary text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-text-tertiary" />
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-surface-elevated rounded-lg border border-border/30 text-text-primary text-sm px-3 py-2 focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Suites List */}
      <div className="space-y-3">
        {filteredSuites.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-text-tertiary">No suites match your search criteria</p>
          </div>
        ) : (
          filteredSuites.map(suite => (
            <SuiteCard
              key={suite.id}
              suite={suite}
              isExpanded={expandedSuites.has(suite.id)}
              onToggle={() => toggleSuite(suite.id)}
              expandedCases={expandedCases}
              onToggleCase={toggleCase}
            />
          ))
        )}
      </div>

      {/* Diagnostics Footer */}
      <div className="text-xs text-text-tertiary text-center">
        {result.diagnostics.processingTimeMs != null && (
          <>Processed in {result.diagnostics.processingTimeMs}ms</>  
        )}
        {result.diagnostics.inputStats && (
          <> | {result.diagnostics.inputStats.sbgNodes} static nodes | {result.diagnostics.inputStats.rogPages} runtime pages</>
        )}
        {result.diagnostics.mergeStats && (
          <> | {result.diagnostics.mergeStats.matchedNodes} merged</>
        )}
        {result.diagnostics.errors && result.diagnostics.errors.length > 0 && (
          <> | {result.diagnostics.errors.length} errors</>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: typeof Layers;
  label: string;
  value: number | string;
  color: 'primary' | 'success' | 'info' | 'warning';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 border-primary/20 text-primary',
    success: 'bg-success/10 border-success/20 text-success',
    info: 'bg-info/10 border-info/20 text-info',
    warning: 'bg-warning/10 border-warning/20 text-warning',
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg border ${colorClasses[color]}`}>
          <Icon size={14} />
        </div>
        <span className="text-xs text-text-tertiary uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

function ProvenanceBadge({ type, label, count }: {
  type: 'SBG' | 'ROG' | 'MERGED';
  label: string;
  count: number;
}) {
  const Icon = provenanceIcons[type];
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${provenanceColors[type]}`}>
      <Icon size={14} />
      <span className="text-xs font-medium">{label}</span>
      <span className="text-xs font-bold">{count}</span>
    </div>
  );
}

function SuiteCard({ suite, isExpanded, onToggle, expandedCases, onToggleCase }: {
  suite: SuiteV9;
  isExpanded: boolean;
  onToggle: () => void;
  expandedCases: Set<string>;
  onToggleCase: (id: string) => void;
}) {
  const highPriorityCases = suite.cases.filter(c => c.priority === 'critical' || c.priority === 'high').length;

  return (
    <div className="card overflow-hidden">
      {/* Suite Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown size={16} className="text-text-tertiary" />
          ) : (
            <ChevronRight size={16} className="text-text-tertiary" />
          )}
          <div className="text-left">
            <h3 className="text-sm font-semibold text-text-primary">{suite.name}</h3>
            <p className="text-xs text-text-tertiary">{suite.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-text-tertiary">
            {suite.cases.length} cases
          </span>
          {highPriorityCases > 0 && (
            <span className="px-2 py-0.5 bg-warning/10 text-warning text-xs rounded-full">
              {highPriorityCases} high priority
            </span>
          )}
          <div className="flex gap-1">
            {suite.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-surface-elevated text-text-tertiary text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </button>

      {/* Suite Cases */}
      {isExpanded && (
        <div className="border-t border-border/20 divide-y divide-border/10">
          {suite.cases.map(caseItem => (
            <CaseItem
              key={caseItem.id}
              caseItem={caseItem}
              isExpanded={expandedCases.has(caseItem.id)}
              onToggle={() => onToggleCase(caseItem.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CaseItem({ caseItem, isExpanded, onToggle }: {
  caseItem: CaseV9;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Handle both simplified (from) and canonical (staticGraphRefs) provenance shapes
  const provenanceType: ProvenanceSource = caseItem.provenance.from 
    || (caseItem.provenance.staticGraphRefs?.length && caseItem.provenance.runtimeRunRefs?.length ? 'MERGED' 
        : caseItem.provenance.staticGraphRefs?.length ? 'SBG' 
        : 'ROG');
  const ProvenanceIcon = provenanceIcons[provenanceType];

  return (
    <div>
      {/* Case Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-surface-elevated/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown size={14} className="text-text-tertiary" />
          ) : (
            <ChevronRight size={14} className="text-text-tertiary" />
          )}
          <div className="text-left">
            <p className="text-sm text-text-primary">{caseItem.name}</p>
            <p className="text-xs text-text-tertiary">{caseItem.intent}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 text-xs rounded border ${priorityBgColors[caseItem.priority]} ${priorityColors[caseItem.priority]}`}>
            {caseItem.priority}
          </span>
          <span className="text-xs text-text-tertiary">
            {Math.round(caseItem.confidence * 100)}% conf
          </span>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${provenanceColors[provenanceType]}`}>
            <ProvenanceIcon size={12} />
            <span className="text-xs">{provenanceType}</span>
          </div>
        </div>
      </button>

      {/* Case Steps */}
      {isExpanded && (
        <div className="px-6 pb-4 space-y-2">
          {/* Preconditions */}
          {caseItem.preconditions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Preconditions</p>
              <ul className="text-xs text-text-secondary space-y-0.5">
                {caseItem.preconditions.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2">
            {caseItem.steps.map(step => (
              <StepItem key={step.index} step={step} />
            ))}
          </div>

          {/* Success Criteria */}
          {caseItem.successCriteria.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/20">
              <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Success Criteria</p>
              <ul className="text-xs text-success/80 space-y-0.5">
                {caseItem.successCriteria.map((c, i) => (
                  <li key={i}>✓ {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepItem({ step }: { step: StepV9 }) {
  const ProvenanceIcon = provenanceIcons[step.provenance.from];
  
  // Handle both string and object action formats
  const actionText = typeof step.action === 'string' 
    ? step.action 
    : `${step.action.type}${step.action.selector ? ` on ${step.action.selector}` : ''}${step.action.value ? ` with "${step.action.value}"` : ''}`;
  
  // Handle both string and object expected formats
  const expectedText = step.expected 
    ? (typeof step.expected === 'string' ? step.expected : step.expected.description)
    : null;

  return (
    <div className="flex items-start gap-3 p-3 bg-surface-elevated/30 rounded-lg">
      <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary text-xs font-bold rounded">
        {step.index}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">{actionText}</p>
        {expectedText && (
          <p className="text-xs text-text-tertiary mt-1">Expected: {expectedText}</p>
        )}
        {step.provenance.filePath && (
          <p className="text-xs text-text-tertiary font-mono mt-1">
            📄 {step.provenance.filePath}
            {step.provenance.lineNumber && `:${step.provenance.lineNumber}`}
          </p>
        )}
      </div>
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${provenanceColors[step.provenance.from]}`}>
        <ProvenanceIcon size={10} />
      </div>
    </div>
  );
}
