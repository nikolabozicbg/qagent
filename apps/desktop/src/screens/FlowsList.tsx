import { useState } from 'react';
import { Search, ChevronDown, AlertCircle, CheckCircle2, Clock, Sparkles, Eye, Play, Settings, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@contexts/AppContext';
import { apiService } from '@services/api';
import { useToast } from '@contexts/ToastContext';

interface Flow {
  id: string;
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'no-tests' | 'passing' | 'partial' | 'failing';
  route: string;
  components: number;
  apis: number;
  enriched: boolean;
  lastRun?: string;
  passing?: number;
  total?: number;
  testFile?: boolean;
}

const mockFlows: Flow[] = [
  {
    id: '1',
    name: 'User Login',
    priority: 'CRITICAL',
    status: 'no-tests',
    route: '/signin → /dashboard',
    components: 2,
    apis: 1,
    enriched: true,
  },
  {
    id: '2',
    name: 'Create Transaction',
    priority: 'HIGH',
    status: 'passing',
    route: '/transaction/new → /transactions/:id',
    components: 3,
    apis: 2,
    enriched: true,
    lastRun: '5m ago',
    passing: 12,
    total: 12,
    testFile: true,
  },
  {
    id: '3',
    name: 'Bank Account Management',
    priority: 'HIGH',
    status: 'partial',
    route: '/bankaccounts → /bankaccounts/:id',
    components: 4,
    apis: 3,
    enriched: true,
    lastRun: '12m ago',
    passing: 8,
    total: 10,
    testFile: true,
  },
  {
    id: '4',
    name: 'User Registration',
    priority: 'CRITICAL',
    status: 'no-tests',
    route: '/signup → /dashboard',
    components: 2,
    apis: 1,
    enriched: true,
  },
  {
    id: '5',
    name: 'Payment Processing',
    priority: 'MEDIUM',
    status: 'failing',
    route: '/checkout → /success',
    components: 5,
    apis: 3,
    enriched: false,
    lastRun: '8m ago',
    passing: 4,
    total: 6,
    testFile: true,
  },
  {
    id: '6',
    name: 'Profile Settings',
    priority: 'LOW',
    status: 'passing',
    route: '/settings → /settings/profile',
    components: 3,
    apis: 2,
    enriched: true,
    lastRun: '15m ago',
    passing: 8,
    total: 8,
    testFile: true,
  },
];

export default function FlowsList() {
  const navigate = useNavigate();
  const { flows, selectedProjectPath } = useApp();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [generatingTestId, setGeneratingTestId] = useState<string | null>(null);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);

  const filteredFlows = flows
    .filter(flow => {
      const matchesSearch = flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           flow.route.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || flow.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.name.localeCompare(b.name);
    });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-error';
      case 'HIGH': return 'text-warning';
      case 'MEDIUM': return 'text-accent';
      case 'LOW': return 'text-success';
      default: return 'text-white/60';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'no-tests': return <AlertCircle className="w-5 h-5 text-error" />;
      case 'passing': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'partial': return <Clock className="w-5 h-5 text-warning" />;
      case 'failing': return <AlertCircle className="w-5 h-5 text-error" />;
      default: return <AlertCircle className="w-5 h-5 text-white/60" />;
    }
  };

  const getStatusText = (flow: Flow) => {
    switch (flow.status) {
      case 'no-tests': return '🔴 No tests';
      case 'passing': return `🟢 ${flow.passing}/${flow.total} passing    Last run: ${flow.lastRun}`;
      case 'partial': return `🟡 ${flow.passing}/${flow.total} passing     Last run: ${flow.lastRun}`;
      case 'failing': return `🔴 ${flow.passing}/${flow.total} passing     Last run: ${flow.lastRun}`;
      default: return 'Unknown status';
    }
  };

  return (
    <div className="h-full bg-dark overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Flows ({filteredFlows.length})</h1>
        </div>
        <button className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Flow
        </button>
      </div>

      {/* Search and Filters */}
      <div className="border-b border-white/10 px-8 py-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            type="text"
            placeholder="Search flows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none px-4 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">Filter: All</option>
            <option value="no-tests">No Tests</option>
            <option value="passing">Passing</option>
            <option value="partial">Partial</option>
            <option value="failing">Failing</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none px-4 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="priority">Sort: Priority</option>
            <option value="name">Sort: Name</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
        </div>
      </div>

      {/* Flows List */}
      <div className="flex-1 overflow-y-auto p-8">
        {filteredFlows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-16 h-16 text-white/20 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No flows found</h2>
            <p className="text-white/60 mb-6">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-5xl mx-auto">
            {filteredFlows.map((flow, index) => (
              <div
                key={flow.id}
                className="glass rounded-xl p-6 border border-white/10 hover:border-primary/50 transition-all cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/app/flows/${flow.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(flow.status)}
                    <h3 className="text-xl font-semibold">{flow.name}</h3>
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded bg-white/5 ${getPriorityColor(flow.priority)}`}>
                    {flow.priority}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/60">Status:</span>
                    <span className="text-white/80">{getStatusText(flow)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/60">Route:</span>
                    <span className="text-white/80">{flow.route}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span>Components: {flow.components}</span>
                    <span>•</span>
                    <span>APIs: {flow.apis}</span>
                    {flow.enriched && (
                      <>
                        <span>•</span>
                        <span>Enriched ✓</span>
                      </>
                    )}
                    {flow.testFile && (
                      <>
                        <span>•</span>
                        <span>Test file: ✓</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {flow.status === 'no-tests' ? (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!selectedProjectPath) return;
                          
                          setGeneratingTestId(flow.id);
                          try {
                            await apiService.generateTestForFlow({
                              flowId: flow.id,
                              projectPath: selectedProjectPath,
                              framework: 'playwright', // or detect from project
                              includeEdgeCases: true,
                              includeAccessibility: true,
                            });
                            showToast({
                              type: 'success',
                              message: `Test generated for ${flow.name}`,
                            });
                          } catch (error: any) {
                            showToast({
                              type: 'error',
                              message: `Failed to generate test: ${error.message}`,
                            });
                          } finally {
                            setGeneratingTestId(null);
                          }
                        }}
                        disabled={generatingTestId === flow.id}
                        className="text-sm px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles className="w-4 h-4" />
                        {generatingTestId === flow.id ? 'Generating...' : 'Generate Test'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/flows/${flow.id}`);
                        }}
                        className="text-sm px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Configure
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!selectedProjectPath) return;
                          
                          setRunningTestId(flow.id);
                          try {
                            const result = await apiService.runTests({
                              projectPath: selectedProjectPath,
                              testFiles: flow.testFile ? [flow.testFile as unknown as string] : undefined,
                              framework: 'playwright',
                            });
                            showToast({
                              type: 'success',
                              message: `Tests completed: ${result.passed}/${result.total} passed`,
                            });
                            navigate('/app/test-results');
                          } catch (error: any) {
                            showToast({
                              type: 'error',
                              message: `Failed to run tests: ${error.message}`,
                            });
                          } finally {
                            setRunningTestId(null);
                          }
                        }}
                        disabled={runningTestId === flow.id}
                        className="text-sm px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-4 h-4" />
                        {runningTestId === flow.id ? 'Running...' : 'Run Tests'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/flows/${flow.id}`);
                        }}
                        className="text-sm px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Results
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/flows/${flow.id}`);
                        }}
                        className="text-sm px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Edit Flow
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filteredFlows.length >= 3 && (
              <div className="text-center py-6">
                <p className="text-white/60 text-sm mb-4">
                  Showing {filteredFlows.length} of {flows.length} flows
                </p>
                <button className="text-sm px-6 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors">
                  Load More ↓
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
