import { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle, Loader2, Code, FileText, Download } from 'lucide-react';
import { apiService } from '@services/api';
import { wsService } from '@services/websocket';
import { useToast } from '@contexts/ToastContext';
import { notificationService } from '@services/notification';

interface TestGenerationModalProps {
  flowId: string;
  flowName: string;
  projectPath: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (testFile: string) => void;
}

interface GenerationStep {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  message?: string;
}

export function TestGenerationModal({
  flowId,
  flowName,
  projectPath,
  isOpen,
  onClose,
  onComplete,
}: TestGenerationModalProps) {
  const { showToast } = useToast();
  const [framework, setFramework] = useState<'playwright' | 'cypress'>('playwright');
  const [includeEdgeCases, setIncludeEdgeCases] = useState(true);
  const [includeAccessibility, setIncludeAccessibility] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [smartDecisions, setSmartDecisions] = useState<string[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [testStats, setTestStats] = useState<{ lines: number; testCases: number; assertions: number } | null>(null);
  const [testCases, setTestCases] = useState<Array<{ name: string; type: string }>>([]);
  const [canCancel, setCanCancel] = useState(false);

  const steps: GenerationStep[] = [
    { name: 'Analyzing flow structure', status: 'pending' },
    { name: 'Identifying test scenarios', status: 'pending' },
    { name: 'Generating test code', status: 'pending' },
    { name: 'Adding assertions', status: 'pending' },
    { name: 'Optimizing selectors', status: 'pending' },
    { name: 'Finalizing test suite', status: 'pending' },
  ];

  const [generationSteps, setGenerationSteps] = useState(steps);

  useEffect(() => {
    if (!isOpen) return;

    // Setup WebSocket listeners for test generation
    const handleProgress = (data: { step: string; percentage: number; message: string }) => {
      setProgress(data.percentage);
      setCurrentStep(data.message);
      
      // Update step status
      setGenerationSteps(prev => prev.map(step => {
        if (step.name === data.step) {
          return { ...step, status: 'running' as const, message: data.message };
        }
        if (prev.findIndex(s => s.name === data.step) < prev.findIndex(s => s.name === step.name)) {
          return { ...step, status: 'complete' as const };
        }
        return step;
      }));
    };

    const handleStep = (data: { step: string; message: string }) => {
      setCurrentStep(data.message);
      setGenerationSteps(prev => prev.map(step => 
        step.name === data.step 
          ? { ...step, status: 'running' as const, message: data.message }
          : step
      ));
    };

    const handleDecision = (data: { decision: string; reason?: string }) => {
      setSmartDecisions(prev => [...prev, data.decision]);
    };

    const handleComplete = (data: { code: string; filePath: string; stats?: any; testCases?: any[] }) => {
      setGeneratedCode(data.code);
      setIsGenerating(false);
      setProgress(100);
      setGenerationSteps(prev => prev.map(step => ({ ...step, status: 'complete' as const })));
      
      // Extract stats and test cases if provided
      if (data.stats) {
        setTestStats(data.stats);
      } else {
        // Parse from code if stats not provided
        const lines = data.code.split('\n').length;
        const testCaseMatches = data.code.match(/test\(['"](.*?)['"]/g) || [];
        setTestStats({
          lines,
          testCases: testCaseMatches.length,
          assertions: (data.code.match(/expect\(/g) || []).length
        });
        setTestCases(testCaseMatches.map(m => ({
          name: m.match(/['"](.*?)['"]/)?.[1] || '',
          type: 'test'
        })));
      }
      
      if (data.testCases) {
        setTestCases(data.testCases);
      }
      
      // Send desktop notification
      const fileName = data.filePath.split('/').pop() || 'test file';
      notificationService.testGenerated(fileName);
      
      showToast({
        type: 'success',
        message: `Test generated successfully for ${flowName}!`,
      });
      onComplete?.(data.filePath);
    };

    const handleError = (data: { error: string }) => {
      setError(data.error);
      setIsGenerating(false);
      setGenerationSteps(prev => prev.map((step, idx) => 
        step.status === 'running' ? { ...step, status: 'error' as const } : step
      ));
      showToast({
        type: 'error',
        message: `Failed to generate test: ${data.error}`,
      });
    };

    wsService.onTestGenerationProgress(handleProgress);
    wsService.onTestGenerationComplete(handleComplete);
    wsService.on('test:generation:error', handleError);

    return () => {
      wsService.offTestGenerationProgress(handleProgress);
      wsService.offTestGenerationComplete(handleComplete);
      wsService.off('test:generation:error', handleError);
    };
  }, [isOpen, flowName, onComplete, showToast]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setGenerationSteps(steps);

    try {
      // Connect WebSocket if not connected
      if (!wsService.isConnected()) {
        wsService.connect();
      }

      // Start test generation
      await apiService.generateTestForFlow({
        flowId,
        projectPath,
        framework,
        includeEdgeCases,
        includeAccessibility,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to start test generation');
      setIsGenerating(false);
      showToast({
        type: 'error',
        message: 'Failed to start test generation',
      });
    }
  };

  const handleSave = async () => {
    try {
      // Use Electron IPC to save file
      if (window.electronAPI?.saveTestFile) {
        const fileName = `${flowName.toLowerCase().replace(/\s+/g, '-')}.spec.ts`;
        const filePath = `tests/e2e/${fileName}`;
        
        const result = await window.electronAPI.saveTestFile(filePath, generatedCode);
        
        if (result.ok) {
          showToast({
            type: 'success',
            message: `Test saved to ${filePath}`,
          });
          onClose();
        } else {
          throw new Error(result.error || 'Failed to save file');
        }
      } else {
        // Fallback: download as file
        const blob = new Blob([generatedCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${flowName.toLowerCase().replace(/\s+/g, '-')}.spec.ts`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast({
          type: 'success',
          message: 'Test downloaded successfully',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        message: `Failed to save test: ${err.message}`,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-4xl glass rounded-xl shadow-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Generate Test</h2>
              <p className="text-sm text-white/60">{flowName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isGenerating && !generatedCode && !error && (
            <div className="space-y-6">
              {/* Configuration */}
              <div>
                <h3 className="text-sm font-semibold text-white/80 mb-3">Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/80 mb-2 block">Test Framework</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFramework('playwright')}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                          framework === 'playwright'
                            ? 'bg-primary text-white'
                            : 'glass hover:bg-white/10'
                        }`}
                      >
                        Playwright
                      </button>
                      <button
                        onClick={() => setFramework('cypress')}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                          framework === 'cypress'
                            ? 'bg-primary text-white'
                            : 'glass hover:bg-white/10'
                        }`}
                      >
                        Cypress
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeEdgeCases}
                        onChange={(e) => setIncludeEdgeCases(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                      />
                      <span className="text-sm text-white/80">Include edge case tests</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeAccessibility}
                        onChange={(e) => setIncludeAccessibility(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                      />
                      <span className="text-sm text-white/80">Include accessibility tests</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/80">Generating...</span>
                  <span className="text-sm font-semibold">{progress}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-white/60 mt-2">{currentStep}</p>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {generationSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 glass rounded-lg">
                    {step.status === 'complete' && (
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    )}
                    {step.status === 'running' && (
                      <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                    )}
                    {step.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 flex-shrink-0" />
                    )}
                    {step.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm ${step.status === 'complete' ? 'text-white/60' : 'text-white/90'}`}>
                        {step.name}
                      </p>
                      {step.message && (
                        <p className="text-xs text-white/60 mt-1">{step.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedCode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/80">Generated Test Code</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedCode)}
                    className="text-xs px-3 py-1.5 glass hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="glass rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap">
                  {generatedCode}
                </pre>
              </div>
            </div>
          )}

          {error && (
            <div className="glass rounded-lg p-4 border-l-4 border-error">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-error mb-1">Generation Failed</p>
                  <p className="text-sm text-white/80">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
          {!generatedCode && !isGenerating && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                className="px-6 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Test
              </button>
            </>
          )}
          {generatedCode && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Save Test
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
