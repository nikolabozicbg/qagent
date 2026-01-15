import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOnboardingStore } from '@stores/onboardingStore';
import { ProgressBar } from '@components/onboarding/ProgressBar';
import { apiService } from '@services/api';
import { wsService } from '@services/websocket';
import { useSuiteStore } from '@stores/useSuiteStore';
import { useProjectStore } from '@stores/useProjectStore';
import { Brain, CheckCircle2, Loader2, Route as RouteIcon, Layers, ChevronDown, ChevronRight, TestTube2, Search, CheckSquare, Square, AlertCircle, TrendingUp, Minus, TrendingDown, FolderOpen, Play, ListChecks } from 'lucide-react';
import { useApp } from '@contexts/AppContext';

// Types for proper hierarchy
interface TestStep {
  id: string;
  action: string;
  target: string;
  description: string;
  selector?: string;
  assertions?: string[];
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  priority: string;
  tags: string[];
  steps: TestStep[];
  status: string;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: string;
  tags: string[];
  testCases: TestCase[];
  stats: {
    totalCases: number;
    totalSteps: number;
    estimatedDuration: number;
    complexity: string;
  };
  metadata: {
    components: string[];
    routes: string[];
    characteristics: string[];
  };
}

const priorityColors = {
  critical: 'text-error',
  high: 'text-warning',
  medium: 'text-info',
  low: 'text-text-tertiary',
};

const priorityIcons = {
  critical: AlertCircle,
  high: TrendingUp,
  medium: Minus,
  low: TrendingDown,
};

export default function SmartDiscovery() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // V7 is now the default (Behavior-Driven Discovery)
  // Use ?version=v6, ?version=v5 or ?version=v4 to use older versions
  const version = searchParams.get('version') || 'v7';
  const { completeOnboarding } = useApp();
  const { setSuites } = useSuiteStore();
  const { setCurrentProject } = useProjectStore();
  const {
    currentStep,
    projectPath,
    config,
    setDiscoveredFlows,
    prevStep,
  } = useOnboardingStore();

  const [stage, setStage] = useState<'discovering' | 'complete'>('discovering');
  const [counts, setCounts] = useState({ components: 0, routes: 0, apis: 0, forms: 0 });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // NEW: State for hierarchical view
  const [discoveredSuites, setDiscoveredSuites] = useState<TestSuite[]>([]);
  const [expandedSuiteIds, setExpandedSuiteIds] = useState<Set<string>>(new Set());
  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<string>>(new Set());
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<Set<string>>(new Set());
  
  // Prevent double discovery in React 18 StrictMode
  const discoveryStartedRef = useRef(false);

  useEffect(() => {
    if (!projectPath || !config.baseUrl) {
      navigate('/setup/config');
      return;
    }
    
    // Prevent duplicate calls from StrictMode
    if (discoveryStartedRef.current) return;
    discoveryStartedRef.current = true;

    let timer: NodeJS.Timeout;
    
    const startDiscovery = async () => {
      timer = setInterval(() => {
        setElapsedTime((t) => t + 0.1);
      }, 100);
      
      await runDiscovery();
      clearInterval(timer);
    };
    
    startDiscovery();

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const runDiscovery = async () => {
    try {
      const discoveryStartTime = Date.now();
      wsService.connect();

      wsService.onProgress((progress) => {
        // Simulate count-up animation based on progress
        if (progress.stage === 'discovering') {
          setCounts({
            components: Math.floor(42 * (progress.percentage / 100)),
            routes: Math.floor(12 * (progress.percentage / 100)),
            apis: Math.floor(28 * (progress.percentage / 100)),
            forms: Math.floor(8 * (progress.percentage / 100)),
          });
        }
      });

      wsService.onComplete((data) => {
        if (data.flows) {
          setDiscoveredFlows(data.flows);
          setStage('complete');
        }
      });

      console.log('Calling discoverTestSuites API...');
      
      // Prepare project config
      const projectConfig = {
        projectPath: projectPath!,
        projectName: projectPath!.split('/').pop() || 'Project',
        framework: config.framework!,
        baseUrl: config.baseUrl!,
        testDir: './e2e'
      };
      
      // Set the project in local store
      setCurrentProject(projectConfig);
      
      // Create project in backend (register in cache)
      console.log('➕ Creating project in backend...');
      await useProjectStore.getState().createProjectInBackend(projectConfig);
      
      // Use cloud-ready discovery: scan locally -> send to cloud backend
      // V7 (Behavior-Driven) is default, use ?version=v6/v5/v4 for older versions
      console.log(`🔍 Running cloud-ready suite discovery (${version.toUpperCase()})...`);
      let result;
      if (version === 'v7') {
        result = await apiService.discoverSuitesCloudV7(projectPath!);
      } else if (version === 'v6') {
        result = await apiService.discoverSuitesCloudV6(projectPath!);
      } else if (version === 'v5') {
        result = await apiService.discoverSuitesCloudV5(projectPath!);
      } else {
        result = await apiService.discoverSuitesCloud(projectPath!);
      }
      
      // Ensure minimum 2 seconds display time
      const elapsed = Date.now() - discoveryStartTime;
      const minDisplayTime = 2000; // 2 seconds
      if (elapsed < minDisplayTime) {
        await new Promise(resolve => setTimeout(resolve, minDisplayTime - elapsed));
      }

      console.log('Suite discovery result:', result);
      console.log('Result type:', typeof result);
      console.log('Has suites:', result?.suites);
      console.log('Suites length:', result?.suites?.length);
      console.log('Total cases:', result?.totalCases);
      console.log('Total steps:', result?.totalSteps);
      
      // Animate count-up to final values
      if (result?.suites && result.suites.length > 0) {
        const finalCounts = {
          components: result.suites.length, // Total suites
          routes: result.totalCases || 0, // Total test cases
          apis: result.totalSteps || 0, // Total test steps
          forms: result.suites.filter((s: any) => s.priority === 'CRITICAL').length // Critical suites
        };
        
        // Animate counts smoothly
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          setTimeout(() => {
            setCounts({
              components: Math.floor(finalCounts.components * (i / steps)),
              routes: Math.floor(finalCounts.routes * (i / steps)),
              apis: Math.floor(finalCounts.apis * (i / steps)),
              forms: Math.floor(finalCounts.forms * (i / steps)),
            });
          }, i * 30);
        }
      }

      // Backend returns 'suites'
      if (result?.suites && result.suites.length > 0) {
        // Save suites to global store
        setSuites(result.suites);
        
        // Save suites to local state for hierarchical display
        setDiscoveredSuites(result.suites);
        
        // Auto-select all suites by default
        setSelectedSuiteIds(new Set(result.suites.map((s: TestSuite) => s.id)));
        
        // Auto-expand first suite to show structure
        if (result.suites.length > 0) {
          setExpandedSuiteIds(new Set([result.suites[0].id]));
        }
        
        setMetadata(result.metadata);
        
        // Calculate totals
        const totalCases = result.suites.reduce((sum: number, s: TestSuite) => sum + s.testCases.length, 0);
        const totalSteps = result.suites.reduce((sum: number, s: TestSuite) => 
          sum + s.testCases.reduce((cSum: number, c: TestCase) => cSum + c.steps.length, 0), 0);
        const criticalCount = result.suites.filter((s: TestSuite) => 
          s.priority.toLowerCase() === 'critical'
        ).length;
        
        setCounts({ 
          components: result.suites.length,
          routes: totalCases,
          apis: totalSteps,
          forms: criticalCount
        });
        
        // Legacy: still set flows for backward compatibility
        const flows = result.suites.flatMap((suite: TestSuite) => 
          suite.testCases.map((testCase: TestCase) => ({
            id: testCase.id,
            name: `${suite.name} → ${testCase.name}`,
            priority: suite.priority.toLowerCase(),
            confidence: 90,
            route: testCase.steps.map(s => s.target).filter(Boolean).join(' → '),
            enriched: true,
            componentsCount: testCase.steps.length,
            apisCount: 0,
            steps: testCase.steps.map(s => s.description),
          }))
        );
        setDiscoveredFlows(flows);
        
        setStage('complete');
      } else {
        console.warn('⚠️  No suites found in discovery result');
        setSuites([]);
        setDiscoveredSuites([]);
        setDiscoveredFlows([]);
        setCounts({ components: 0, routes: 0, apis: 0, forms: 0 });
        setStage('complete');
      }
    } catch (err) {
      console.error('Discovery error:', err);
      // Always transition to complete state even on error
      setStage('complete');
    }
  };

  const handleFinish = () => {
    wsService.disconnect();
    completeOnboarding();
    navigate('/app/dashboard');
  };

  const handleBack = () => {
    wsService.disconnect();
    prevStep();
    navigate('/setup/config');
  };

  if (stage === 'discovering') {
    return (
      <div className="h-screen w-screen flex flex-col bg-dark">
        <div className="flex-1 flex flex-col max-w-6xl mx-auto px-8 py-8 w-full">
          {/* Progress - always at top */}
          <div className="mb-8">
            <ProgressBar currentStep={currentStep} totalSteps={4} />
          </div>
          
          {/* Centered content */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">

          <div className="mb-8 w-full text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <Brain className="text-primary" size={24} />
              </div>
              <h1 className="text-3xl font-semibold text-text-primary">
                Discovering Test Suites
              </h1>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Loader2 className="animate-spin text-primary" size={14} />
                <p className="text-sm text-text-secondary">
                  Analyzing application structure, grouping test suites...
                </p>
              </div>
            </div>
          </div>

          {/* Counter Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8 w-full">
            {[
              { label: 'Suites', value: counts.components, icon: Layers, color: 'primary' },
              { label: 'Test Cases', value: counts.routes, icon: TestTube2, color: 'success' },
              { label: 'Test Steps', value: counts.apis, icon: RouteIcon, color: 'info' },
              { label: 'Critical', value: counts.forms, icon: AlertCircle, color: 'warning' },
            ].map((item, index) => {
              const colorClasses = {
                primary: 'bg-primary/10 border-primary/20 text-primary',
                success: 'bg-success/10 border-success/20 text-success',
                info: 'bg-info/10 border-info/20 text-info',
                warning: 'bg-warning/10 border-warning/20 text-warning'
              };
              return (
                <div
                  key={item.label}
                  className="card p-5 hover:shadow-glass-lg transition-all duration-300 group animate-scale-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-lg ${colorClasses[item.color]} group-hover:scale-110 transition-transform`}>
                      <item.icon size={16} />
                    </div>
                    <span className="text-xs text-text-tertiary uppercase tracking-wide font-medium">{item.label}</span>
                  </div>
                  <p className="text-4xl font-bold text-text-primary font-mono">{item.value}</p>
                </div>
              );
            })}
          </div>

          {/* Elapsed Time with pulse */}
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-sm text-text-tertiary font-mono">
              Analyzing... {elapsedTime.toFixed(1)}s
            </p>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper functions for hierarchical view
  const toggleSuiteExpand = (suiteId: string) => {
    setExpandedSuiteIds(prev => {
      const next = new Set(prev);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  };

  const toggleCaseExpand = (caseId: string) => {
    setExpandedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  const toggleSuiteSelection = (suiteId: string) => {
    setSelectedSuiteIds(prev => {
      const next = new Set(prev);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  };

  const selectAllSuites = () => {
    setSelectedSuiteIds(new Set(discoveredSuites.map(s => s.id)));
  };

  const clearAllSuites = () => {
    setSelectedSuiteIds(new Set());
  };

  // Calculate totals from hierarchical data
  const totalCases = discoveredSuites.reduce((sum, s) => sum + s.testCases.length, 0);
  const totalSteps = discoveredSuites.reduce((sum, s) => 
    sum + s.testCases.reduce((cSum, c) => cSum + c.steps.length, 0), 0);

  // Filter suites based on search
  const filteredSuites = discoveredSuites.filter(suite =>
    searchQuery === '' ||
    suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suite.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suite.testCases.some(tc => tc.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Results view
  return (
    <div className="h-screen w-screen flex flex-col bg-dark">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto px-8 py-8 w-full overflow-y-auto custom-scrollbar">
        {/* Progress - always at top */}
        <div className="mb-8">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
        </div>

        <div className="mb-5 w-full">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">
                {discoveredSuites.length} Test Suites Discovered
              </h1>
              <p className="text-sm text-text-secondary">Select suites to add to your dashboard and generate tests</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={selectAllSuites}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <CheckSquare size={13} />
                Select All
              </button>
              <button 
                onClick={clearAllSuites}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-tertiary hover:bg-surface-hover rounded-lg transition-colors"
              >
                <Square size={13} />
                Clear All
              </button>
            </div>
          </div>
          
          {/* Tech Stack Badges with Tooltips */}
          {metadata && (
            <div className="flex items-center gap-2 flex-wrap mb-3 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <span className="text-xs text-text-tertiary font-medium">Detected Stack:</span>
              {metadata.uiLibraries?.map((lib: any) => {
                const libName = typeof lib === 'string' ? lib : lib.name;
                const libConf = typeof lib === 'object' ? lib.confidence : null;
                return (
                  <span 
                    key={libName} 
                    className="px-2 py-1 text-xs font-medium bg-surface-elevated/80 border border-border/60 rounded text-text-secondary hover:bg-surface-elevated hover:border-primary/40 transition-all cursor-default"
                    title={libConf ? `${libName} (${libConf}% confidence)` : libName}
                  >
                    {libName}
                  </span>
                );
              })}
              {metadata.stateManagement?.map((sm: any) => {
                const smName = typeof sm === 'string' ? sm : sm.name || sm.type;
                const smFiles = typeof sm === 'object' ? sm.filesCount : null;
                return (
                  <span 
                    key={smName} 
                    className="px-2 py-1 text-xs font-medium bg-surface-elevated/80 border border-border/60 rounded text-text-secondary hover:bg-surface-elevated hover:border-primary/40 transition-all cursor-default"
                    title={smFiles ? `${smName} (${smFiles} files)` : smName}
                  >
                    {smName}
                  </span>
                );
              })}
              {metadata.totalAPIsDetected > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-surface-elevated/80 border border-border/60 rounded text-text-secondary hover:bg-surface-elevated hover:border-primary/40 transition-all cursor-default">
                  {metadata.totalAPIsDetected} API Endpoints
                </span>
              )}
            </div>
          )}
          
          {/* Inline Summary */}
          <div className="flex items-center gap-4 text-sm text-text-tertiary animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <span><span className="font-mono font-semibold text-text-primary">{discoveredSuites.length}</span> suites</span>
            <span className="text-text-tertiary/30">•</span>
            <span><span className="font-mono font-semibold text-text-primary">{totalCases}</span> test cases</span>
            <span className="text-text-tertiary/30">•</span>
            <span><span className="font-mono font-semibold text-text-primary">{totalSteps}</span> steps</span>
          </div>
        </div>
        
        {/* Search Bar */}
        {discoveredSuites.length > 0 && (
          <div className="mb-4 w-full">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search suites or test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-surface-elevated/60 border border-border/50 rounded-lg text-text-primary placeholder:text-text-tertiary focus:border-primary focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        )}

        {/* Hierarchical Suite List */}
        <div className="space-y-3 mb-24">
          {discoveredSuites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-surface-elevated/60 border border-border/50 mb-4">
                <Brain size={48} className="text-text-tertiary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No suites discovered</h3>
              <p className="text-sm text-text-secondary max-w-md">
                We couldn't find any test suites in your project. Try adjusting your project structure or configuration.
              </p>
            </div>
          ) : filteredSuites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-surface-elevated/60 border border-border/50 mb-4">
                <Search size={48} className="text-text-tertiary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No results found</h3>
              <p className="text-sm text-text-secondary max-w-md">
                No suites match your search query "{searchQuery}"
              </p>
            </div>
          ) : filteredSuites.map((suite) => {
            const isSuiteExpanded = expandedSuiteIds.has(suite.id);
            const isSuiteSelected = selectedSuiteIds.has(suite.id);
            const priorityKey = suite.priority.toLowerCase() as keyof typeof priorityColors;
            const PriorityIcon = priorityIcons[priorityKey] || Minus;
            
            return (
              <div key={suite.id} className="card overflow-hidden">
                {/* Suite Header */}
                <div
                  className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 ${
                    isSuiteSelected
                      ? 'bg-primary/5 border-l-3 border-l-primary'
                      : 'hover:bg-surface-hover/40 border-l-3 border-l-transparent'
                  }`}
                >
                  {/* Expand Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSuiteExpand(suite.id);
                    }}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-hover rounded transition-all"
                  >
                    {isSuiteExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  
                  {/* Checkbox */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSuiteSelection(suite.id);
                    }}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                      isSuiteSelected
                        ? 'bg-primary border-primary'
                        : 'border-border group-hover:border-primary/50'
                    }`}
                  >
                    {isSuiteSelected && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  
                  {/* Suite Icon */}
                  <div className="flex-shrink-0 p-1.5 rounded-lg bg-primary/10 text-primary">
                    <FolderOpen size={16} />
                  </div>
                  
                  {/* Suite Content */}
                  <div className="flex-1 min-w-0" onClick={() => toggleSuiteExpand(suite.id)}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-primary truncate">{suite.name}</h3>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-surface-elevated border border-border/60 rounded text-text-tertiary">
                        {suite.category}
                      </span>
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${priorityColors[priorityKey] || 'text-text-tertiary'} bg-current/10`}>
                        <PriorityIcon size={10} />
                        <span className="text-[9px] font-bold uppercase">{suite.priority}</span>
                      </div>
                    </div>
                    {suite.description && (
                      <p className="text-xs text-text-tertiary truncate mt-0.5">{suite.description}</p>
                    )}
                  </div>
                  
                  {/* Suite Stats */}
                  <div className="flex items-center gap-4 text-xs text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <ListChecks size={12} className="text-success" />
                      <span className="font-mono font-semibold text-text-primary">{suite.testCases.length}</span> cases
                    </span>
                    <span className="flex items-center gap-1">
                      <Play size={12} className="text-info" />
                      <span className="font-mono font-semibold text-text-primary">
                        {suite.testCases.reduce((sum, tc) => sum + tc.steps.length, 0)}
                      </span> steps
                    </span>
                  </div>
                </div>
                
                {/* Expanded Suite - Test Cases */}
                {isSuiteExpanded && (
                  <div className="border-t border-border/30 bg-surface-elevated/10">
                    {/* Tags row */}
                    {suite.tags && suite.tags.length > 0 && (
                      <div className="px-4 py-2 border-b border-border/20 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-text-tertiary uppercase tracking-wide">Tags:</span>
                        {suite.tags.slice(0, 6).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-surface-elevated border border-border/40 rounded text-text-secondary">
                            {tag}
                          </span>
                        ))}
                        {suite.tags.length > 6 && (
                          <span className="text-[10px] text-text-tertiary">+{suite.tags.length - 6} more</span>
                        )}
                      </div>
                    )}
                    
                    {/* Test Cases */}
                    <div className="divide-y divide-border/20">
                      {suite.testCases.map((testCase) => {
                        const isCaseExpanded = expandedCaseIds.has(testCase.id);
                        const casePriorityKey = testCase.priority.toLowerCase() as keyof typeof priorityColors;
                        const CasePriorityIcon = priorityIcons[casePriorityKey] || Minus;
                        
                        return (
                          <div key={testCase.id}>
                            {/* Test Case Header */}
                            <div
                              onClick={() => toggleCaseExpand(testCase.id)}
                              className="flex items-center gap-3 px-4 py-2 pl-14 cursor-pointer hover:bg-surface-hover/30 transition-colors"
                            >
                              {/* Expand Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCaseExpand(testCase.id);
                                }}
                                className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                              >
                                {isCaseExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                              
                              {/* Case Icon */}
                              <TestTube2 size={14} className="flex-shrink-0 text-success" />
                              
                              {/* Case Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-text-primary truncate">{testCase.name}</span>
                                  <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] ${priorityColors[casePriorityKey] || 'text-text-tertiary'} bg-current/10`}>
                                    <CasePriorityIcon size={8} />
                                    <span className="font-bold uppercase">{testCase.priority}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Step Count */}
                              <span className="text-xs text-text-tertiary">
                                <span className="font-mono font-semibold text-text-secondary">{testCase.steps.length}</span> steps
                              </span>
                            </div>
                            
                            {/* Expanded Case - Steps */}
                            {isCaseExpanded && (
                              <div className="bg-dark/30 border-t border-border/20">
                                {testCase.steps.map((step, stepIndex) => (
                                  <div
                                    key={step.id}
                                    className="flex items-start gap-3 px-4 py-2 pl-24 text-xs border-b border-border/10 last:border-0"
                                  >
                                    {/* Step Number */}
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-elevated border border-border/40 flex items-center justify-center text-[10px] font-mono text-text-tertiary">
                                      {stepIndex + 1}
                                    </span>
                                    
                                    {/* Step Action Badge */}
                                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                                      step.action === 'click' ? 'bg-info/10 text-info border border-info/20' :
                                      step.action === 'fill' || step.action === 'type' ? 'bg-warning/10 text-warning border border-warning/20' :
                                      step.action === 'navigate' ? 'bg-primary/10 text-primary border border-primary/20' :
                                      step.action === 'assert' || step.action === 'verify' ? 'bg-success/10 text-success border border-success/20' :
                                      'bg-surface-elevated text-text-tertiary border border-border/40'
                                    }`}>
                                      {step.action}
                                    </span>
                                    
                                    {/* Step Description */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-text-secondary">{step.description}</p>
                                      {step.target && step.target !== step.description && (
                                        <p className="text-text-tertiary font-mono text-[10px] mt-0.5 truncate">{step.target}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation - Floating bottom bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="card px-6 py-3 shadow-2xl backdrop-blur-lg bg-dark/95 border-border/80">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="btn-ghost"
              >
                Back
              </button>
              <div className="h-6 w-px bg-border/50" />
              {selectedSuiteIds.size > 0 && (
                <span className="text-sm text-text-tertiary font-medium">
                  {selectedSuiteIds.size} of {discoveredSuites.length} suites selected
                </span>
              )}
              <button
                onClick={handleFinish}
                disabled={selectedSuiteIds.size === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {selectedSuiteIds.size} Suite{selectedSuiteIds.size !== 1 ? 's' : ''} to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
