import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Sparkles, 
  FolderOpen,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { SuiteListCard } from '@components/suites';
import { useSuiteStore } from '@stores/useSuiteStore';
import { useProjectStore } from '@stores/useProjectStore';
import { useToast } from '@contexts/ToastContext';
import api from '@services/api';

type SortOption = 'priority' | 'name' | 'totalCases' | 'category' | 'coverage';
type FilterOption = 'all' | 'with-tests' | 'without-tests' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export default function SuitesList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { suites, setSuites } = useSuiteStore();
  const { currentProject } = useProjectStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Load suites on mount
  useEffect(() => {
    if (currentProject?.projectPath && suites.length === 0) {
      handleDiscoverSuites();
    }
  }, [currentProject?.projectPath]);

  const handleDiscoverSuites = async () => {
    if (!currentProject?.projectPath) {
      showToast({
        type: 'error',
        message: 'No project selected',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.discoverTestSuites(currentProject.projectPath);
      setSuites(result.suites);
      showToast({
        type: 'success',
        message: `Discovered ${result.suites.length} test suites`,
      });
    } catch (error) {
      console.error('Failed to discover suites:', error);
      showToast({
        type: 'error',
        message: 'Failed to discover test suites',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort suites
  const filteredSuites = suites
    .filter(suite => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          suite.name.toLowerCase().includes(query) ||
          suite.category.toLowerCase().includes(query) ||
          suite.description?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter(suite => {
      // Status filter
      if (filterBy === 'all') return true;
      if (filterBy === 'with-tests') {
        const cases = suite.testCases || [];
        return cases.some(tc => tc.testFilePath || tc.status === 'passing' || tc.status === 'passed');
      }
      if (filterBy === 'without-tests') {
        const cases = suite.testCases || [];
        return !cases.some(tc => tc.testFilePath || tc.status === 'passing' || tc.status === 'passed');
      }
      if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(filterBy)) {
        return suite.priority === filterBy;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort
      switch (sortBy) {
        case 'priority':
          const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'totalCases':
          return (b.testCases?.length || 0) - (a.testCases?.length || 0);
        case 'coverage':
          const aCoverage = (a.testCases || []).filter(tc => tc.testFilePath).length / Math.max(a.testCases?.length || 1, 1);
          const bCoverage = (b.testCases || []).filter(tc => tc.testFilePath).length / Math.max(b.testCases?.length || 1, 1);
          return bCoverage - aCoverage;
        default:
          return 0;
      }
    });

  // Calculate stats
  const stats = {
    total: suites.length,
    totalCases: suites.reduce((acc, s) => acc + (s.testCases?.length || s.stats?.totalCases || 0), 0),
    generatedCases: suites.reduce((acc, s) => {
      const cases = s.testCases || [];
      return acc + cases.filter(tc => tc.testFilePath || tc.status === 'passing' || tc.status === 'passed').length;
    }, 0),
    suitesWithTests: suites.filter(s => {
      const cases = s.testCases || [];
      return cases.some(tc => tc.testFilePath || tc.status === 'passing' || tc.status === 'passed');
    }).length,
    suitesWithoutTests: suites.filter(s => {
      const cases = s.testCases || [];
      return !cases.some(tc => tc.testFilePath || tc.status === 'passing' || tc.status === 'passed');
    }).length,
    passingCases: suites.reduce((acc, s) => {
      const cases = s.testCases || [];
      return acc + cases.filter(tc => tc.status === 'passing' || tc.status === 'passed').length;
    }, 0),
    failingCases: suites.reduce((acc, s) => {
      const cases = s.testCases || [];
      return acc + cases.filter(tc => tc.status === 'failing' || tc.status === 'failed').length;
    }, 0),
  };
  
  const coveragePercent = stats.totalCases > 0 
    ? Math.round((stats.generatedCases / stats.totalCases) * 100) 
    : 0;

  // Handlers
  const handleRunAll = async () => {
    if (!currentProject?.projectPath) return;
    
    // Collect all test files from all suites
    const testFiles: string[] = [];
    suites.forEach(suite => {
      (suite.testCases || []).forEach(tc => {
        if (tc.testFilePath) {
          testFiles.push(tc.testFilePath);
        }
      });
    });
    
    if (testFiles.length === 0) {
      showToast({ type: 'warning', message: 'No test files to run' });
      return;
    }
    
    showToast({ type: 'info', message: `Running ${testFiles.length} tests...` });
    try {
      const result = await api.runTests({
        projectPath: currentProject.projectPath,
        testFiles,
        framework: currentProject.framework || 'playwright'
      });
      navigate('/app/results', { state: { result } });
    } catch (error: any) {
      showToast({ type: 'error', message: error.message || 'Failed to run tests' });
    }
  };

  const handleGenerateAll = async () => {
    if (!currentProject?.projectPath) return;
    showToast({ type: 'info', message: 'Generating tests for all suites...' });
    // Navigate to first suite without tests
    const pendingSuite = suites.find(s => {
      const cases = s.testCases || [];
      return !cases.some(tc => tc.testFilePath);
    });
    if (pendingSuite) {
      navigate(`/app/suites/${pendingSuite.id}`);
    }
  };

  const handleRunSuite = async (suite: any) => {
    if (!currentProject?.projectPath) return;
    
    const testFiles = (suite.testCases || [])
      .filter((tc: any) => tc.testFilePath)
      .map((tc: any) => tc.testFilePath);
    
    console.log('🎯 handleRunSuite:', suite.name);
    console.log('   testCases:', suite.testCases?.length || 0);
    console.log('   testFiles found:', testFiles);
    
    if (testFiles.length === 0) {
      showToast({ type: 'warning', message: 'No test files to run in this suite' });
      return;
    }
    
    showToast({ type: 'info', message: `Running ${testFiles.length} tests from ${suite.name}...` });
    try {
      const result = await api.runTests({
        projectPath: currentProject.projectPath,
        testFiles,
        framework: currentProject.framework || 'playwright'
      });
      console.log('✅ Test run result:', result);
      if (!result.success) {
        console.error('❌ Test run failed:', result.error);
        console.error('   stdout:', result.stdout);
        console.error('   stderr:', result.stderr);
      }
      navigate('/app/results', { state: { result, suite } });
    } catch (error: any) {
      showToast({ type: 'error', message: error.message || 'Failed to run tests' });
    }
  };

  const handleGenerateSuite = async (suite: any) => {
    // Navigate to suite detail to generate
    navigate(`/app/suites/${suite.id}`);
  };

  return (
    <div className="h-screen bg-dark overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/dashboard')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Test Suites</h1>
              <p className="text-sm text-white/50">
                {currentProject?.projectPath ? (
                  <>
                    {currentProject.projectPath.split('/').pop()}
                    <span className="mx-2">•</span>
                    {stats.total} suites, {stats.totalCases} cases
                  </>
                ) : (
                  'No project selected'
                )}
              </p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {stats.suitesWithoutTests > 0 && (
              <button
                onClick={handleGenerateAll}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Generate All ({stats.suitesWithoutTests})
              </button>
            )}
            {stats.suitesWithTests > 0 && (
              <button
                onClick={handleRunAll}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Run All ({stats.suitesWithTests})
              </button>
            )}
            <button
              onClick={handleDiscoverSuites}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Coverage Overview */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-white/60 mb-1">Overall Coverage</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{coveragePercent}%</span>
                <span className="text-white/40 text-sm">
                  {stats.generatedCases} / {stats.totalCases} cases generated
                </span>
              </div>
            </div>
            
            {/* Status Summary */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.suitesWithTests}</p>
                  <p className="text-xs text-white/40">With Tests</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.suitesWithoutTests}</p>
                  <p className="text-xs text-white/40">Pending</p>
                </div>
              </div>
              {stats.failingCases > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.failingCases}</p>
                    <p className="text-xs text-white/40">Failing</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="border-b border-white/10 px-8 py-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search suites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterBy('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterBy === 'all' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterBy('with-tests')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filterBy === 'with-tests' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              With Tests
            </button>
            <button
              onClick={() => setFilterBy('without-tests')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filterBy === 'without-tests' 
                  ? 'bg-slate-500/20 text-slate-400' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending
            </button>
            
            <div className="w-px h-6 bg-white/10" />
            
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => (
              <button
                key={priority}
                onClick={() => setFilterBy(priority as FilterOption)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterBy === priority 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-white/10"
          >
            <option value="priority">Priority</option>
            <option value="coverage">Coverage</option>
            <option value="name">Name</option>
            <option value="totalCases">Cases</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* No Project State */}
        {!currentProject?.projectPath && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderOpen className="w-16 h-16 text-white/20 mb-4" />
            <h2 className="text-xl font-bold mb-2">No Project Selected</h2>
            <p className="text-white/50 mb-4 text-sm">
              Select a project from the dashboard to view suites.
            </p>
            <button
              onClick={() => navigate('/app/dashboard')}
              className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors text-sm"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Loading State */}
        {currentProject?.projectPath && isLoading && (
          <div className="flex flex-col items-center justify-center h-full">
            <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-white/80">Discovering test suites...</p>
            <p className="text-sm text-white/40 mt-1">Analyzing your application</p>
          </div>
        )}

        {/* Empty State */}
        {currentProject?.projectPath && !isLoading && suites.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-16 h-16 text-white/20 mb-4" />
            <h2 className="text-xl font-bold mb-2">No Test Suites Yet</h2>
            <p className="text-white/50 mb-4 text-sm">
              Discover test suites from your project structure.
            </p>
            <button
              onClick={handleDiscoverSuites}
              className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Discover Suites
            </button>
          </div>
        )}

        {/* Suites List */}
        {currentProject?.projectPath && !isLoading && filteredSuites.length > 0 && (
          <div className="space-y-4">
            {filteredSuites.map(suite => (
              <SuiteListCard
                key={suite.id}
                suite={suite}
                onClick={() => navigate(`/app/suites/${suite.id}`)}
                onRun={() => handleRunSuite(suite)}
                onGenerate={() => handleGenerateSuite(suite)}
              />
            ))}
          </div>
        )}

        {/* No Results */}
        {currentProject?.projectPath && !isLoading && suites.length > 0 && filteredSuites.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Search className="w-12 h-12 text-white/20 mb-3" />
            <h2 className="text-lg font-bold mb-2">No Results</h2>
            <p className="text-white/50 mb-4 text-sm">
              Try different search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterBy('all');
              }}
              className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
