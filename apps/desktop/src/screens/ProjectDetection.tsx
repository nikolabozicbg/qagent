import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@stores/onboardingStore';
import { ProgressBar } from '@components/onboarding/ProgressBar';
import { apiService } from '@services/api';
import { wsService } from '@services/websocket';
import { DetectedTech } from '@/types/onboarding';
import { Search, CheckCircle2, FileCode, TestTube2, Package, Layers, Gauge, Activity, Terminal, Sparkles, Zap } from 'lucide-react';

export default function ProjectDetection() {
  const navigate = useNavigate();
  const {
    currentStep,
    projectPath,
    setDetectedTech,
    setProjectInsights,
    nextStep,
    prevStep,
  } = useOnboardingStore();

  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localTech, setLocalTech] = useState<DetectedTech[]>([]);
  const [localInsights, setLocalInsights] = useState<any>(null);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'scanning' | 'analyzing' | 'extracting' | 'complete'>('scanning');

  useEffect(() => {
    if (!projectPath) {
      navigate('/onboarding/welcome');
      return;
    }

    analyzeProject();
  }, [projectPath]);

  const addLog = (message: string) => {
    setActivityLog(prev => [...prev.slice(-5), message]); // Keep last 6 logs
  };

  const analyzeProject = async () => {
    let progressInterval: NodeJS.Timeout | null = null;
    try {
      setIsAnalyzing(true);
      setError(null);
      addLog('[SCAN] Initializing workspace...');

      // Connect WebSocket for real-time updates
      wsService.connect();

      // Simulate progress with phases
      let simulatedProgress = 0;
      progressInterval = setInterval(() => {
        simulatedProgress += Math.random() * 3;
        if (simulatedProgress < 90) {
          setProgress(Math.floor(simulatedProgress));
          
          // Update phase based on progress
          if (simulatedProgress < 25) {
            setCurrentPhase('scanning');
          } else if (simulatedProgress < 60) {
            setCurrentPhase('analyzing');
            if (simulatedProgress === Math.floor(simulatedProgress) && simulatedProgress % 10 === 0) {
              addLog(`[ANALYZE] Processing dependencies...`);
            }
          } else if (simulatedProgress < 90) {
            setCurrentPhase('extracting');
            if (simulatedProgress === Math.floor(simulatedProgress) && simulatedProgress % 10 === 0) {
              addLog(`[EXTRACT] Reading test metadata...`);
            }
          }
        }
      }, 400);

      wsService.onProgress((data) => {
        clearInterval(progressInterval);
        setProgress(data.percentage);
      });

      wsService.onTechDetected((tech: DetectedTech) => {
        setLocalTech(prev => [...prev, tech]);
        addLog(`[DETECT] ${tech.name}`);
      });

      // Call API to analyze workspace
      addLog('[ANALYZE] Running deep analysis...');
      const result = await apiService.analyzeWorkspace(projectPath!);

      console.log('Backend response:', result);
      console.log('Project technologies:', result.project?.technologies);
      console.log('Summary:', result.summary);

      // Clear simulated progress
      if (progressInterval) clearInterval(progressInterval);
      setCurrentPhase('complete');
      addLog('[DONE] Analysis complete');
      setProgress(100);

      // Transform backend response to frontend format
      if (result.project?.technologies) {
        let allTech = result.project.technologies.map((t: any) => ({
          name: t.displayName || t.name,
          version: t.version,
          category: t.category || 'framework'
        }));
        
        // Add detected test frameworks
        if (result.testingSetup?.installed) {
          const frameworks = result.testingSetup.installed.map((f: any) => ({
            name: f.displayName || f.name,
            version: f.version,
            category: 'testing'
          }));
          allTech = [...allTech, ...frameworks];
        }
        
        // Save to store for next screen
        setDetectedTech(allTech);
        
        // Clear and animate tech badges appearing one by one
        setLocalTech([]); // Clear first
        allTech.forEach((t: any, index: number) => {
          setTimeout(() => {
            setLocalTech(prev => [...prev, t]);
            addLog(`[FOUND] ${t.name} ${t.version || ''}`);
          }, index * 200);
        });
      }

      // Set project insights from backend response
      const insights = {
        componentsCount: result.summary?.totalFiles || result.summary?.sourceFilesCount || 0,
        routesCount: result.summary?.testedFiles || result.summary?.testFilesCount || 0,
        apiEndpointsCount: result.testingSetup?.installed?.length || 0,
        hasPlaywright: result.testingSetup?.installed?.some((f: any) => f.name === 'playwright') || false,
        hasCypress: result.testingSetup?.installed?.some((f: any) => f.name === 'cypress') || false,
      };
      setProjectInsights(insights);
      setLocalInsights(insights);

      setProgress(100);
      setCurrentPhase('complete');
      setIsAnalyzing(false);
    } catch (err: any) {
      console.error('Analysis error:', err);
      if (progressInterval) clearInterval(progressInterval);
      setError(err.message || 'Failed to analyze project');
      setIsAnalyzing(false);
    }
  };

  const handleContinue = () => {
    wsService.disconnect();
    nextStep();
    navigate('/onboarding/config');
  };

  const handleBack = () => {
    wsService.disconnect();
    prevStep();
    navigate('/onboarding/welcome');
  };

  // Categorize technologies
  const frameworks = localTech.filter(t => t.category === 'framework');
  const testing = localTech.filter(t => t.category === 'testing');
  const others = localTech.filter(t => t.category !== 'framework' && t.category !== 'testing');

  const phaseLabels = {
    scanning: 'Scanning workspace structure...',
    analyzing: 'Analyzing dependencies & frameworks...',
    extracting: 'Extracting test metadata...',
    complete: 'Analysis complete'
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-dark">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto px-8 py-8 w-full overflow-y-auto custom-scrollbar">
        {/* Progress - always at top */}
        <div className="mb-8">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
        </div>

        {/* Header */}
        <div className="mb-6 w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Activity className="text-primary" size={20} />
            </div>
            <h1 className="text-3xl font-bold text-text-primary">
              Deep Project Analysis
            </h1>
            {isAnalyzing && (
              <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">Live</span>
              </div>
            )}
          </div>
          <p className="text-base text-text-secondary ml-11">
            {phaseLabels[currentPhase]}
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-3 gap-6 w-full mb-6">
          {/* LEFT: Progress + Activity Log */}
          <div className="col-span-2 space-y-4">
            {/* Segmented Progress */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gauge size={18} className="text-primary" />
                  <h3 className="text-base font-semibold text-text-primary">Analysis Progress</h3>
                </div>
                <span className="text-3xl font-bold font-mono text-text-primary">{progress}%</span>
              </div>
              
              {/* Segmented bar - HIGHLY VISIBLE */}
              <div className="relative w-full h-5 bg-surface-elevated/80 rounded-full overflow-hidden mb-3 border-2 border-border">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary-hover to-primary transition-all duration-300 shadow-lg"
                  style={{ width: `${progress}%` }}
                >
                  {/* Shimmer effect on progress */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
                {/* Segment markers */}
                <div className="absolute inset-0 flex">
                  {[25, 50, 75].map(mark => (
                    <div
                      key={mark}
                      className="absolute h-full w-[1px] bg-dark/30"
                      style={{ left: `${mark}%` }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Phase labels */}
              <div className="flex justify-between text-xs text-text-tertiary font-mono font-semibold mt-2">
                <span className={currentPhase === 'scanning' ? 'text-primary' : ''}>SCAN</span>
                <span className={currentPhase === 'analyzing' ? 'text-primary' : ''}>ANALYZE</span>
                <span className={currentPhase === 'extracting' ? 'text-primary' : ''}>EXTRACT</span>
                <span className={currentPhase === 'complete' ? 'text-success' : ''}>DONE</span>
              </div>
            </div>

            {/* Activity Log (IDE-like output) */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={16} className="text-text-tertiary" />
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Activity Log</h3>
              </div>
              <div className="space-y-1.5 font-mono text-sm h-32 overflow-hidden">
                {activityLog.length === 0 ? (
                  <div className="text-text-tertiary/50 italic">Waiting for analysis to start...</div>
                ) : (
                  activityLog.map((log, i) => {
                    // Determine color based on log type
                    let colorClass = 'text-text-tertiary';
                    if (log.startsWith('[SCAN]') || log.startsWith('[ANALYZE]')) {
                      colorClass = 'text-info';
                    } else if (log.startsWith('[DETECT]') || log.startsWith('[FOUND]')) {
                      colorClass = 'text-success';
                    } else if (log.startsWith('[EXTRACT]')) {
                      colorClass = 'text-warning';
                    } else if (log.startsWith('[DONE]')) {
                      colorClass = 'text-primary font-semibold';
                    }
                    
                    return (
                      <div
                        key={i}
                        className={`animate-slide-up opacity-0 ${colorClass}`}
                        style={{ 
                          animation: 'slideUp 0.3s ease-out forwards',
                          animationDelay: `${i * 50}ms` 
                        }}
                      >
                        {log}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Quick Stats */}
          <div className="space-y-4">
            {localInsights && (
              <>
                <div className="card p-5 group hover:shadow-glass-lg transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <FileCode size={16} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium text-text-tertiary">Source Files</span>
                  </div>
                  <p className="text-4xl font-bold text-text-primary font-mono">
                    {localInsights.componentsCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-tertiary mt-2">Components</p>
                </div>

                <div className="card p-5 group hover:shadow-glass-lg transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-success/10 border border-success/20">
                      <TestTube2 size={16} className="text-success" />
                    </div>
                    <span className="text-sm font-medium text-text-tertiary">Test Files</span>
                  </div>
                  <p className="text-4xl font-bold text-text-primary font-mono">
                    {localInsights.routesCount}
                  </p>
                  <p className="text-xs text-text-tertiary mt-2">Existing tests</p>
                </div>

                <div className="card p-5 group hover:shadow-glass-lg transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                      <Package size={16} className="text-warning" />
                    </div>
                    <span className="text-sm font-medium text-text-tertiary">Frameworks</span>
                  </div>
                  <p className="text-4xl font-bold text-text-primary font-mono">
                    {localInsights.apiEndpointsCount}
                  </p>
                  <p className="text-xs text-text-tertiary mt-2">Installed</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detected Technologies (Categorized) */}
        {localTech.length > 0 && (
          <div className="w-full mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-success" />
              <h3 className="text-base font-semibold text-text-primary">Technology Stack</h3>
              <span className="ml-auto text-sm text-text-tertiary font-mono">{localTech.length} detected</span>
            </div>
            
            <div className="space-y-3">
              {/* Frameworks */}
              {frameworks.length > 0 && (
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wide mb-2 font-semibold">Core Framework</p>
                  <div className="flex flex-wrap gap-2">
                    {frameworks.map((tech, index) => (
                      <div
                        key={index}
                        className="px-4 py-2.5 bg-primary/10 backdrop-blur border border-primary/20 hover:border-primary/40 rounded-lg text-sm text-text-primary font-mono transition-all duration-200 hover:shadow-glow-sm animate-scale-in group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <span className="font-semibold">{tech.name}</span>
                        {tech.version && <span className="text-text-tertiary ml-1.5">{tech.version}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Testing */}
              {testing.length > 0 && (
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wide mb-2 font-semibold">Testing Stack</p>
                  <div className="flex flex-wrap gap-2">
                    {testing.map((tech, index) => (
                      <div
                        key={index}
                        className="px-4 py-2.5 bg-success/10 backdrop-blur border border-success/20 hover:border-success/40 rounded-lg text-sm text-text-primary font-mono transition-all duration-200 hover:shadow-glow-sm animate-scale-in"
                        style={{ animationDelay: `${(frameworks.length + index) * 50}ms` }}
                      >
                        <span className="font-semibold">{tech.name}</span>
                        {tech.version && <span className="text-text-tertiary ml-1.5">{tech.version}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Others */}
              {others.length > 0 && (
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wide mb-2 font-semibold">Additional</p>
                  <div className="flex flex-wrap gap-2">
                    {others.map((tech, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 bg-surface-elevated/60 backdrop-blur border border-border/50 hover:border-border rounded-lg text-xs text-text-secondary font-mono transition-all duration-200 hover:shadow-glow-sm animate-scale-in"
                        style={{ animationDelay: `${(frameworks.length + testing.length + index) * 50}ms` }}
                      >
                        {tech.name}{tech.version && ` ${tech.version}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Smart Insights (Bottom Banner) */}
        {localInsights && progress === 100 && (
          <div className="w-full mb-6 card p-4 bg-gradient-to-r from-success/5 via-primary/5 to-info/5 border-success/20 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className="text-success" />
              <h3 className="text-base font-semibold text-text-primary">Smart Analysis Complete</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success" />
                <span className="text-text-secondary">Ready for journey discovery</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success" />
                <span className="text-text-secondary">Test metadata extracted</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success" />
                <span className="text-text-secondary">Framework support enabled</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-error/10 border border-error rounded-md p-3 mb-6 text-error text-sm">
            {error}
          </div>
        )}

        {/* Navigation - Fixed at bottom */}
        <div className="sticky bottom-0 bg-dark/95 backdrop-blur-sm border-t border-border pt-4 mt-auto">
          <div className="flex justify-between w-full">
            <button
              onClick={handleBack}
              className="btn-ghost"
            >
              Back
            </button>
            <button
              onClick={handleContinue}
              disabled={isAnalyzing}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
