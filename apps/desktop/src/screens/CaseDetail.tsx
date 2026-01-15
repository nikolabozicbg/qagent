import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ListOrdered,
  Code,
  History,
  FileCode,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Save,
  ExternalLink
} from 'lucide-react';
import { StepItem } from '@components/StepItem';
import { useSuiteStore } from '@stores/useSuiteStore';
import { useProjectStore } from '@stores/useProjectStore';
import { useToast } from '@contexts/ToastContext';
import { PRIORITY_COLORS, STATUS_COLORS } from '@/types/suite.types';
import api from '@services/api';

const STATUS_ICONS: Record<string, any> = {
  passed: CheckCircle2,
  passing: CheckCircle2,
  failed: XCircle,
  failing: XCircle,
  pending: Clock,
  running: AlertCircle,
  'not-generated': Clock,
  flaky: AlertCircle,
};

type TabType = 'steps' | 'code' | 'history';

export default function CaseDetail() {
  const navigate = useNavigate();
  const { suiteId, caseId } = useParams<{ suiteId: string; caseId: string }>();
  const { getSuiteById, updateCaseFilePath } = useSuiteStore();
  const { currentProject } = useProjectStore();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('steps');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  
  const suite = getSuiteById(suiteId || '');
  const testCase = suite?.testCases?.find(tc => tc.id === caseId);

  if (!suite || !testCase) {
    return (
      <div className="h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Test Case Not Found</h2>
          <p className="text-white/50 mb-4 text-sm">The requested test case could not be found.</p>
          <button
            onClick={() => navigate(`/app/suites/${suiteId}`)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors text-sm"
          >
            Back to Suite
          </button>
        </div>
      </div>
    );
  }

  const isGenerated = testCase.testFilePath || testCase.status === 'passing' || testCase.status === 'passed';
  const StatusIcon = STATUS_ICONS[testCase.status] || Clock;
  const statusColor = STATUS_COLORS[testCase.status] || STATUS_COLORS['pending'];
  const priorityColor = PRIORITY_COLORS[testCase.priority] || PRIORITY_COLORS['MEDIUM'];

  const steps = testCase.steps || [];
  const stepStats = {
    total: steps.length,
    passed: steps.filter(s => s.status === 'passed').length,
    failed: steps.filter(s => s.status === 'failed').length,
    pending: steps.filter(s => !s.status || s.status === 'pending').length,
  };

  // Handle Generate Test - Uses new generateFromCase endpoint
  const handleGenerate = async () => {
    if (!currentProject?.projectPath) {
      showToast({ type: 'error', message: 'No project selected' });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await api.generateFromCase({
        testCase: {
          id: testCase.id,
          name: testCase.name,
          description: testCase.description,
          priority: testCase.priority,
          steps: steps.map(s => ({
            action: s.action,
            target: s.target,
            value: s.value,
            selector: s.selector,
            expectedResult: s.assertions?.[0], // Use first assertion as expectedResult
            description: s.description,
            assertions: s.assertions,
            api: s.api
          })),
          testData: testCase.testData,
          metadata: testCase.metadata
        },
        suite: {
          id: suite.id,
          name: suite.name,
          category: suite.category
        },
        workspacePath: currentProject.projectPath,
        baseUrl: currentProject.baseUrl
      });

      if (result.success) {
        setGeneratedCode(result.testCode);
        setActiveTab('code');
        showToast({ 
          type: 'success', 
          message: `Generated ${result.stats.linesOfCode} lines with ${result.stats.assertions} assertions!`
        });
      } else {
        showToast({ type: 'error', message: result.error || 'Generation failed' });
      }
    } catch (error: any) {
      showToast({ type: 'error', message: error.message || 'Failed to generate test' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Run Test
  const handleRun = async () => {
    if (!currentProject?.projectPath) {
      showToast({ type: 'error', message: 'No project selected' });
      return;
    }

    setIsRunning(true);
    try {
      const result = await api.runTests({
        projectPath: currentProject.projectPath,
        testFiles: testCase.testFilePath ? [testCase.testFilePath] : undefined,
        framework: currentProject.framework || 'playwright'
      });

      // Navigate to results
      navigate('/app/results', { 
        state: { 
          result,
          testCase,
          suite
        } 
      });
    } catch (error: any) {
      showToast({ type: 'error', message: error.message || 'Failed to run test' });
    } finally {
      setIsRunning(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    const code = generatedCode || mockGeneratedCode;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mock history data
  const runHistory = testCase.lastRun ? [
    {
      id: '1',
      timestamp: testCase.lastRun.timestamp,
      status: testCase.lastRun.status,
      duration: testCase.lastRun.duration || 0,
      error: testCase.lastRun.error
    }
  ] : [];

  // Mock generated code for display
  const mockGeneratedCode = `import { test, expect } from '@playwright/test';

test.describe('${suite.name}', () => {
  test('${testCase.name}', async ({ page }) => {
${steps.map((s, i) => `    // Step ${i + 1}: ${s.action}
    ${s.selector ? `await page.locator('${s.selector}')` : '// TODO: Add selector'}${s.value ? `.fill('${s.value}')` : '.click()'};`).join('\n')}
    
    // Assertions
    await expect(page).toHaveURL(/.*success/);
  });
});`;

  return (
    <div className="h-screen bg-dark overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/app/suites/${suiteId}`)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </button>
            
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${statusColor}15` }}
              >
                <StatusIcon className="w-5 h-5" style={{ color: statusColor }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{testCase.name}</h1>
                  {isGenerated && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Generated
                    </span>
                  )}
                  <span 
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: `${priorityColor}20`,
                      color: priorityColor 
                    }}
                  >
                    {testCase.priority}
                  </span>
                </div>
                <p className="text-sm text-white/50">
                  <button 
                    onClick={() => navigate(`/app/suites/${suiteId}`)}
                    className="hover:text-primary transition-colors"
                  >
                    {suite.name}
                  </button>
                  <span className="mx-2">•</span>
                  {steps.length} steps
                  {testCase.estimatedDuration && (
                    <><span className="mx-2">•</span>{testCase.estimatedDuration}s</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {!isGenerated ? (
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Test'}
              </button>
            ) : (
              <button 
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isRunning ? 'Running...' : 'Run Test'}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('steps')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'steps'
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            Steps ({steps.length})
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'code'
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code className="w-4 h-4" />
            Code
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Steps Tab */}
        {activeTab === 'steps' && (
          <>
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ListOrdered className="w-16 h-16 text-white/20 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Steps Defined</h2>
                <p className="text-white/50 text-sm">
                  This test case doesn't have any steps yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Stats Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Test Steps</h2>
                  <div className="flex items-center gap-4 text-sm">
                    {stepStats.passed > 0 && (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 className="w-4 h-4" /> {stepStats.passed} passed
                      </span>
                    )}
                    {stepStats.failed > 0 && (
                      <span className="flex items-center gap-1 text-red-400">
                        <XCircle className="w-4 h-4" /> {stepStats.failed} failed
                      </span>
                    )}
                    {stepStats.pending > 0 && (
                      <span className="flex items-center gap-1 text-white/40">
                        <Clock className="w-4 h-4" /> {stepStats.pending} pending
                      </span>
                    )}
                  </div>
                </div>
                
                {steps.map((step, index) => (
                  <StepItem 
                    key={step.id || index} 
                    step={step} 
                    stepNumber={index + 1}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Code Tab */}
        {activeTab === 'code' && (
          <div className="h-full flex flex-col">
            {/* Empty State - No Test Generated Yet */}
            {!isGenerated && !generatedCode && !isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="glass rounded-2xl p-8 max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                    <FileCode className="w-8 h-8 text-white/30" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Test Generated Yet</h3>
                  <p className="text-white/50 text-sm mb-6">
                    Click "Generate Test" to create Playwright code from the {steps.length} steps defined in this test case.
                  </p>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Test
                  </button>
                </div>
              </div>
            )}

            {/* Generating State */}
            {isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="glass rounded-2xl p-8 max-w-lg w-full">
                  <div className="flex items-center gap-3 mb-6">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    <h3 className="text-lg font-semibold">Generating Test Code...</h3>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                  
                  {/* Steps */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-white/70">Analyzing steps</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-white/70">Detecting selectors</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                      <span className="text-sm text-white">Generating Playwright code...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-white/30" />
                      <span className="text-sm text-white/40">Adding assertions</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-white/30" />
                      <span className="text-sm text-white/40">Finalizing</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsGenerating(false)}
                    className="mt-6 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Preview State - Code generated but not saved */}
            {generatedCode && !isGenerated && !isGenerating && (
              <>
                {/* Preview Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-400 text-xs font-medium">
                      Preview
                    </div>
                    <div>
                      <h2 className="font-semibold">Generated Test Code</h2>
                      <p className="text-xs text-white/40 font-mono">
                        Will be saved to: tests/{suite.category || 'e2e'}/{testCase.name.toLowerCase().replace(/\s+/g, '-')}.spec.ts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-2 px-3 py-1.5 glass hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 px-3 py-1.5 glass hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                  </div>
                </div>
                
                {/* Code Block */}
                <div className="flex-1 bg-[#1e1e2e] rounded-xl border border-white/10 overflow-hidden mb-4">
                  <pre className="p-4 overflow-auto h-full text-sm font-mono text-white/80 leading-relaxed">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setGeneratedCode(null)}
                    className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg font-medium transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentProject?.projectPath || !generatedCode) return;
                      
                      const fileName = testCase.name.toLowerCase().replace(/\s+/g, '-') + '.spec.ts';
                      const relativePath = `tests/e2e/${fileName}`;
                      const absolutePath = `${currentProject.projectPath}/${relativePath}`;
                      
                      try {
                        const result = await window.electronAPI?.saveTestFile(absolutePath, generatedCode);
                        if (result?.ok) {
                          // Update store with the file path
                          updateCaseFilePath(testCase.id, relativePath);
                          showToast({ type: 'success', message: `Test saved to ${fileName}` });
                          setGeneratedCode(null); // Clear preview to show saved state
                        } else {
                          showToast({ type: 'error', message: result?.error || 'Failed to save file' });
                        }
                      } catch (error: any) {
                        showToast({ type: 'error', message: error.message || 'Failed to save file' });
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save to Project
                  </button>
                </div>
              </>
            )}

            {/* Saved State - Test file exists */}
            {isGenerated && !isGenerating && (
              <>
                {/* Saved Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <FileCode className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <h2 className="font-semibold">{testCase.testFilePath ? testCase.testFilePath.split('/').pop() : 'Generated Test'}</h2>
                      <p className="text-xs text-white/40">
                        <span className="text-green-400">✓ Saved</span>
                        <span className="mx-2">•</span>
                        {testCase.testFilePath || 'Test file'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-2 px-3 py-1.5 glass hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-1.5 glass hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 px-3 py-1.5 glass hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regen
                    </button>
                  </div>
                </div>
                
                {/* Code Block */}
                <div className="flex-1 bg-[#1e1e2e] rounded-xl border border-white/10 overflow-hidden">
                  <pre className="p-4 overflow-auto h-full text-sm font-mono text-white/80 leading-relaxed">
                    <code>{generatedCode || mockGeneratedCode}</code>
                  </pre>
                </div>
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <>
            {runHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <History className="w-16 h-16 text-white/20 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Run History</h2>
                <p className="text-white/50 text-sm mb-4">
                  This test hasn't been run yet.
                </p>
                {isGenerated && (
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    Run Test Now
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold mb-4">Run History</h2>
                {runHistory.map((run) => (
                  <div 
                    key={run.id}
                    className={`rounded-xl p-4 border ${
                      run.status === 'passed' || run.status === 'passing'
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {(run.status === 'passed' || run.status === 'passing') ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span className="font-medium">
                          {run.status === 'passed' || run.status === 'passing' ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      <span className="text-sm text-white/40">
                        {new Date(run.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-white/60">
                      Duration: {run.duration}s
                    </div>
                    {run.error && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-400 font-medium mb-1">Error:</p>
                        <p className="text-sm text-white/70 font-mono">{run.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
