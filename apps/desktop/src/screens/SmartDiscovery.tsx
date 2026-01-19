import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@stores/onboardingStore';
import { ProgressBar } from '@components/onboarding/ProgressBar';
import { useProjectStore } from '@stores/useProjectStore';
import { Brain, Loader2, Layers, TestTube2, AlertCircle, ListChecks } from 'lucide-react';
import { useApp } from '@contexts/AppContext';
import { DiscoveryV9Results, type DiscoveryV9ResultsProps } from '@components/discovery/DiscoveryV9Results';

// Discovery V9 result type alias
type DiscoveryResultV9 = DiscoveryV9ResultsProps['result'];

// Progress event type from V9 discovery
interface V9ProgressEvent {
  stage: string;
  message: string;
  percent: number;
  details?: { filesScanned?: number; pagesExplored?: number; elementsFound?: number };
}

export default function SmartDiscovery() {
  const navigate = useNavigate();
  const { completeOnboarding } = useApp();
  const { setCurrentProject } = useProjectStore();
  const {
    currentStep,
    projectPath,
    config,
    prevStep,
  } = useOnboardingStore();

  const [discoverState, setDiscoverState] = useState<'DISCOVERING' | 'COMPLETE'>('DISCOVERING');
  const [counts, setCounts] = useState({ suites: 0, cases: 0, steps: 0, critical: 0 });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Analyzing application structure...');

  // V9 Discovery result
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResultV9 | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  
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
    let unsubscribeProgress: (() => void) | undefined;
    
    const startDiscovery = async () => {
      timer = setInterval(() => {
        setElapsedTime((t) => t + 0.1);
      }, 100);
      
      // Subscribe to V9 progress events
      unsubscribeProgress = window.electronAPI.onDiscoveryV9Progress((progress: V9ProgressEvent) => {
        setProgressMessage(progress.message);
        // Update counts based on progress details
        if (progress.details) {
          setCounts(prev => ({
            suites: progress.details?.filesScanned ? Math.floor(progress.details.filesScanned / 5) : prev.suites,
            cases: progress.details?.elementsFound ? Math.floor(progress.details.elementsFound / 3) : prev.cases,
            steps: progress.details?.elementsFound || prev.steps,
            critical: progress.details?.pagesExplored ? Math.floor(progress.details.pagesExplored / 2) : prev.critical,
          }));
        }
      });
      
      await runDiscovery();
      clearInterval(timer);
    };
    
    startDiscovery();

    return () => {
      if (timer) clearInterval(timer);
      if (unsubscribeProgress) unsubscribeProgress();
    };
  }, []);

  const runDiscovery = async () => {
    try {
      console.log('🔍 Running V9 Discovery Pipeline...');
      
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
      
      // Run V9 Discovery - single pipeline, single IPC call
      const v9Result = await window.electronAPI.runDiscoveryV9({
        projectPath: projectPath!,
        baseUrl: config.baseUrl!,
      });

      if (!v9Result?.ok || !v9Result.result) {
        throw new Error(v9Result?.error || 'V9 Discovery failed');
      }

      // Update final counts from result
      const result = v9Result.result as DiscoveryResultV9;
      
      // Log full result for debugging/copying
      console.log('=== V9 DISCOVERY RESULT ===');
      console.log(JSON.stringify(result, null, 2));
      console.log('=== END V9 RESULT ===');
      console.log('V9 Result object (expandable):', result);
      setCounts({
        suites: result.summary.totalSuites,
        cases: result.summary.totalCases,
        steps: result.summary.totalSteps,
        critical: result.suites.reduce((acc, s) => 
          acc + s.cases.filter(c => c.priority === 'critical').length, 0),
      });

      setDiscoveryResult(result);
      setDiscoverState('COMPLETE');
    } catch (err) {
      console.error('Discovery error:', err);
      setDiscoveryError(err instanceof Error ? err.message : 'Discovery failed');
      setDiscoverState('COMPLETE');
    }
  };

  const handleFinish = () => {
    completeOnboarding();
    navigate('/app/dashboard');
  };

  const handleBack = () => {
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
                  {progressMessage}
                </p>
              </div>
            </div>
          </div>

          {/* Counter Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8 w-full">
            {[
              { label: 'Suites', value: counts.suites, icon: Layers, color: 'primary' },
              { label: 'Test Cases', value: counts.cases, icon: TestTube2, color: 'success' },
              { label: 'Test Steps', value: counts.steps, icon: ListChecks, color: 'info' },
              { label: 'Critical', value: counts.critical, icon: AlertCircle, color: 'warning' },
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
                    <div className={`p-2 rounded-lg ${colorClasses[item.color as keyof typeof colorClasses]} group-hover:scale-110 transition-transform`}>
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

  // COMPLETE state - show results or empty state
  return (
    <div className="h-screen w-screen flex flex-col bg-dark">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto px-8 py-8 w-full overflow-y-auto custom-scrollbar">
        <div className="mb-8">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Discovered Test Suites</h1>
            <p className="text-sm text-text-secondary">Test suites, cases, and steps discovered from your application</p>
          </div>
        </div>

        {discoveryError ? (
          <div className="card p-5">
            <p className="text-text-primary font-medium mb-2">Discovery failed</p>
            <pre className="text-xs text-error whitespace-pre-wrap">{discoveryError}</pre>
          </div>
        ) : !discoveryResult || discoveryResult.suites.length === 0 ? (
          <div className="card p-8 text-center">
            <Layers className="mx-auto mb-4 text-text-tertiary" size={48} />
            <p className="text-text-primary font-medium mb-2">No verified user flows found</p>
            <p className="text-sm text-text-tertiary mb-4">
              Discovery scanned your code but no actions produced observable runtime effects (URL changes, API calls, or DOM mutations).
            </p>
            <div className="text-xs text-text-tertiary bg-surface-elevated rounded-lg p-4 text-left inline-block">
              <p className="font-medium mb-2">Possible reasons:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Application not running at the configured base URL</li>
                <li>Links/buttons don't have href or data-testid attributes</li>
                <li>Actions require authentication that wasn't provided</li>
                <li>JavaScript errors preventing page interactions</li>
              </ul>
            </div>
          </div>
        ) : (
          <DiscoveryV9Results result={discoveryResult} />
        )}

        <div className="h-24" /> {/* Spacer for fixed footer */}
        
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
