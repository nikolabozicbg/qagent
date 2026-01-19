import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@stores/onboardingStore';
import { ProgressBar } from '@components/onboarding/ProgressBar';
import { apiService } from '@services/api';
import { wsService } from '@services/websocket';
import { useSuiteStore } from '@stores/useSuiteStore';
import { useProjectStore } from '@stores/useProjectStore';
import { Brain, CheckCircle2, Loader2, Route as RouteIcon, Layers, ChevronDown, ChevronRight, TestTube2, Search, CheckSquare, Square, AlertCircle, TrendingUp, Minus, TrendingDown, FolderOpen, Play, ListChecks } from 'lucide-react';
import { useApp } from '@contexts/AppContext';
import type { V8UiReadyOutput } from '@/types/v8-ui.types';

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
  // Discover is a single entry point: always V7 scan + auto-verify via V8.
  const { completeOnboarding } = useApp();
  const { setCurrentProject } = useProjectStore();
  const {
    currentStep,
    projectPath,
    config,
    setDiscoveredFlows,
    prevStep,
  } = useOnboardingStore();

  const [discoverState, setDiscoverState] = useState<'DISCOVERING' | 'DISCOVER_COMPLETE' | 'DISCOVER_VERIFIED'>('DISCOVERING');
  const [counts, setCounts] = useState({ components: 0, routes: 0, apis: 0, forms: 0 });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // V8 verified UI-ready output (read-only)
  const [v8UiReady, setV8UiReady] = useState<V8UiReadyOutput | null>(null);
  const [v8RunError, setV8RunError] = useState<string | null>(null);
  const [v8IsRunning, setV8IsRunning] = useState(false);
  
  
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
          setDiscoverState('DISCOVER_COMPLETE');
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
      console.log('🔍 Running V7 scan + auto-verification (V8)...');

      // 1) Scan behavior graph locally (V7)
      const scanResult = await window.electronAPI.scanProjectV7(projectPath!);
      if (!scanResult.ok || !scanResult.payload) {
        throw new Error(scanResult.error || 'Failed to scan project for V7');
      }

      // 2) Ask backend for deterministic derivedUserGoals (read-only)
      const goalsData = await apiService.getV7GoalsFromBehaviorGraph(scanResult.payload);
      if (!goalsData?.ok) {
        throw new Error(goalsData?.reason || 'Failed to extract V7 goals');
      }

      // 3) Run V8 auto-execution (no manual mapping)
      if (!window.electronAPI?.runV8BatchAuto) {
        throw new Error('V8 auto-execution is not available (missing Electron IPC)');
      }

      const v8Result = await window.electronAPI.runV8BatchAuto({
        baseUrl: config.baseUrl!,
        behaviorGraphPayload: goalsData.payload,
        derivedUserGoals: goalsData.derivedUserGoals,
      });

      if (!v8Result?.ok || !v8Result.uiReady) {
        throw new Error(v8Result?.error || 'V8 auto-execution failed');
      }

      // UI renders only VERIFIED suites
      setV8UiReady(v8Result.uiReady as V8UiReadyOutput);
      setDiscoverState('DISCOVER_VERIFIED');
      return;
    } catch (err) {
      console.error('Discovery error:', err);
      // Always transition to complete state even on error
      setDiscoverState('DISCOVER_COMPLETE');
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

  if (discoverState === 'DISCOVERING') {
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

  if (discoverState === 'DISCOVER_VERIFIED') {
    const suites = v8UiReady?.suites || [];

    return (
      <div className="h-screen w-screen flex flex-col bg-dark">
        <div className="flex-1 flex flex-col max-w-6xl mx-auto px-8 py-8 w-full overflow-y-auto custom-scrollbar">
          <div className="mb-8">
            <ProgressBar currentStep={currentStep} totalSteps={4} />
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Verified Suites (V8 Runtime)</h1>
              <p className="text-sm text-text-secondary">UI renders verified suites only (no manual mapping, no configuration)</p>
            </div>
          </div>

          {(!v8UiReady || suites.length === 0) ? (
            <div className="card p-5">
              <p className="text-text-primary font-medium mb-2">No verified goals. Check execution mapping or runtime errors.</p>
              {v8RunError && (
                <pre className="text-xs text-error whitespace-pre-wrap">{v8RunError}</pre>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {suites.map((suite) => (
                <div key={suite.name} className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/30">
                    <h3 className="text-sm font-semibold text-text-primary">{suite.name}</h3>
                    <p className="text-xs text-text-tertiary">{suite.cases.length} case(s)</p>
                  </div>
                  <div className="divide-y divide-border/20">
                    {suite.cases.map((c) => (
                      <div key={c.goalId} className="px-4 py-3">
                        <p className="text-sm text-text-primary">{c.name}</p>
                        <p className="text-xs text-text-tertiary font-mono">{c.goalId}</p>

                        <div className="mt-3 space-y-2">
                          {c.steps.map((s, idx) => (
                            <div key={idx} className="rounded border border-border/30 bg-surface-elevated/10 p-3">
                              <p className="text-xs text-text-secondary">
                                <span className="font-mono text-text-tertiary">STEP {idx + 1}:</span>{' '}
                                <span className="font-semibold">{s.action.type}</span>
                                {s.action.selector ? <span className="font-mono"> • {s.action.selector}</span> : null}
                              </p>
                              <div className="mt-2">
                                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Assertions</p>
                                <pre className="text-xs text-text-secondary whitespace-pre-wrap">{JSON.stringify(s.assertions, null, 2)}</pre>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3">
                          <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Provenance</p>
                          <pre className="text-xs text-text-secondary whitespace-pre-wrap">{JSON.stringify(c.provenance, null, 2)}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="card px-6 py-3 shadow-2xl backdrop-blur-lg bg-dark/95 border-border/80">
              <div className="flex items-center gap-4">
                <button onClick={handleBack} className="btn-ghost">Back</button>
                <div className="h-6 w-px bg-border/50" />
                <button onClick={handleFinish} className="btn-primary">Continue</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DISCOVER_COMPLETE fallback (should be rare; main happy-path goes to DISCOVER_VERIFIED)
  return (
    <div className="h-screen w-screen flex flex-col bg-dark">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto px-8 py-8 w-full">
        <div className="mb-8">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
        </div>
        <div className="card p-5">
          <p className="text-text-primary font-medium mb-2">No verified goals. Check execution mapping or runtime errors.</p>
          {v8RunError && (
            <pre className="text-xs text-error whitespace-pre-wrap">{v8RunError}</pre>
          )}
        </div>
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="card px-6 py-3 shadow-2xl backdrop-blur-lg bg-dark/95 border-border/80">
            <div className="flex items-center gap-4">
              <button onClick={handleBack} className="btn-ghost">Back</button>
              <div className="h-6 w-px bg-border/50" />
              <button onClick={handleFinish} className="btn-primary">Continue</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
