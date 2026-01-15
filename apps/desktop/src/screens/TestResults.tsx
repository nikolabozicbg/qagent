import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Code, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Download,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  FileCode,
  Lightbulb,
  ExternalLink,
  Play
} from 'lucide-react';
import { apiService } from '@services/api';
import { useApp } from '@contexts/AppContext';
import { useProjectStore } from '@stores/useProjectStore';
import { SkeletonList } from '@components/Skeleton';
import { useToast } from '@contexts/ToastContext';

interface TestRun {
  id: string;
  timestamp: string;
  framework: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  totalTests?: number;
  duration: number;
  tests: TestResult[];
}

interface TestResult {
  id: string;
  testFile: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  stack?: string;
  screenshot?: string;
  retries?: number;
}

export default function TestResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProjectPath } = useApp();
  const { currentProject } = useProjectStore();
  const { showToast } = useToast();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'skipped'>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  // Check if we have result from navigation state (from CaseDetail run)
  const navigationState = location.state as { result?: any; testCase?: any; suite?: any } | null;

  useEffect(() => {
    // If we have navigation state, use it directly
    if (navigationState?.result) {
      const navResult = navigationState.result;
      const mockRun: TestRun = {
        id: `run-${Date.now()}`,
        timestamp: new Date().toISOString(),
        framework: currentProject?.framework || 'playwright',
        passed: navResult.passed || 0,
        failed: navResult.failed || 0,
        skipped: navResult.skipped || 0,
        total: navResult.totalTests || navResult.total || 0,
        duration: navResult.duration || 0,
        tests: navResult.tests || []
      };
      setTestRuns([mockRun]);
      setSelectedRun(mockRun);
      setIsLoading(false);
    } else if (selectedProjectPath) {
      loadTestResults();
    }
  }, [selectedProjectPath, navigationState]);

  const loadTestResults = async () => {
    setIsLoading(true);
    try {
      const results = await apiService.getTestResults(selectedProjectPath!);
      setTestRuns(results);
      if (results.length > 0) {
        setSelectedRun(results[0]);
      }
    } catch (error) {
      console.error('Failed to load test results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTests = selectedRun?.tests.filter(test => {
    if (filter === 'all') return true;
    return test.status === filter;
  }) || [];

  const getStatusIcon = (status: string, size: string = 'w-5 h-5') => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className={`${size} text-green-400`} />;
      case 'failed':
        return <XCircle className={`${size} text-red-400`} />;
      case 'skipped':
        return <Clock className={`${size} text-white/40`} />;
      default:
        return <Clock className={`${size} text-white/40`} />;
    }
  };

  // Copy error to clipboard
  const handleCopyError = async (error: string, id: string) => {
    await navigator.clipboard.writeText(error);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // AI Fix Suggestions
  const getAISuggestions = () => {
    if (!selectedRun || selectedRun.failed === 0) return [];
    return [
      {
        id: '1',
        title: 'Check selector stability',
        description: 'The element selector might be dynamic. Consider using data-testid attributes for more stable selectors.',
        code: `// Instead of:\nawait page.locator('.btn-submit');\n\n// Use:\nawait page.getByTestId('submit-button');`
      },
      {
        id: '2', 
        title: 'Add wait for element',
        description: 'The element might not be immediately visible. Add explicit wait.',
        code: `await page.waitForSelector('[data-testid="element"]', { state: 'visible' });`
      },
      {
        id: '3',
        title: 'Verify page load',
        description: 'Ensure the page has fully loaded before interacting with elements.',
        code: `await page.waitForLoadState('networkidle');`
      }
    ];
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPassRate = (run: TestRun) => {
    return ((run.passed / run.total) * 100).toFixed(0);
  };

  const exportAsJSON = () => {
    if (!selectedRun) return;
    
    const dataStr = JSON.stringify(selectedRun, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${selectedRun.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast({
      type: 'success',
      message: 'Test results exported as JSON',
    });
    setShowExportMenu(false);
  };

  const exportAsCSV = () => {
    if (!selectedRun) return;
    
    // CSV Header
    const headers = ['Test File', 'Test Name', 'Status', 'Duration (ms)', 'Error'];
    const csvData = [headers.join(',')];
    
    // CSV Rows
    selectedRun.tests.forEach(test => {
      const row = [
        test.testFile,
        `"${test.testName.replace(/"/g, '""')}"`, // Escape quotes
        test.status,
        test.duration.toString(),
        test.error ? `"${test.error.replace(/"/g, '""')}"` : '',
      ];
      csvData.push(row.join(','));
    });
    
    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${selectedRun.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast({
      type: 'success',
      message: 'Test results exported as CSV',
    });
    setShowExportMenu(false);
  };

  const isSuccess = selectedRun ? selectedRun.failed === 0 : true;
  const passRate = selectedRun ? Math.round((selectedRun.passed / (selectedRun.total || selectedRun.totalTests || 1)) * 100) : 0;
  const aiSuggestions = getAISuggestions();

  return (
    <div className="h-full bg-dark overflow-hidden flex flex-col">
      {/* Header */}
      <div className={`border-b px-8 py-5 ${selectedRun ? (isSuccess ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5') : 'border-white/10'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </button>
            
            {selectedRun && (
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSuccess ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {isSuccess ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold">
                    {isSuccess ? 'All Tests Passed!' : 'Some Tests Failed'}
                  </h1>
                  <p className="text-sm text-white/50">
                    {navigationState?.testCase?.name || 'Test Run'}
                    {navigationState?.suite?.name && ` • ${navigationState.suite.name}`}
                  </p>
                </div>
              </div>
            )}
            
            {!selectedRun && (
              <div>
                <h1 className="text-xl font-bold">Test Results</h1>
                <p className="text-sm text-white/50">View test run history and failures</p>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            {selectedRun && (
              <>
                <button
                  onClick={() => {
                    showToast({ type: 'info', message: 'Re-running tests...' });
                    loadTestResults();
                  }}
                  className="flex items-center gap-2 px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-run
                </button>
                {!isSuccess && (
                  <button
                    onClick={() => showToast({ type: 'info', message: 'Generating fix suggestions...' })}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Fix
                  </button>
                )}
              </>
            )}
            
            {/* Export Button */}
            {selectedRun && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                
                {showExportMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 glass border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={exportAsJSON}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                      >
                        <Code className="w-4 h-4 text-primary" />
                        <span>Export as JSON</span>
                      </button>
                      <button
                        onClick={exportAsCSV}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 border-t border-white/10"
                      >
                        <Download className="w-4 h-4 text-green-400" />
                        <span>Export as CSV</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats (when run selected) */}
        {selectedRun && (
          <div className="grid grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{selectedRun.passed}</p>
                  <p className="text-xs text-white/40">Passed</p>
                </div>
              </div>
            </div>
            
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{selectedRun.failed}</p>
                  <p className="text-xs text-white/40">Failed</p>
                </div>
              </div>
            </div>
            
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(selectedRun.duration / 1000).toFixed(1)}s</p>
                  <p className="text-xs text-white/40">Duration</p>
                </div>
              </div>
            </div>
            
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${passRate === 100 ? 'bg-green-500/20' : passRate >= 75 ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
                  <TrendingUp className={`w-5 h-5 ${passRate === 100 ? 'text-green-400' : passRate >= 75 ? 'text-yellow-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{passRate}%</p>
                  <p className="text-xs text-white/40">Pass Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar - Test Runs */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white/80">Test Runs</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4">
                <SkeletonList count={5} />
              </div>
            ) : testRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <AlertTriangle className="w-12 h-12 text-white/20 mb-4" />
                <p className="text-white/60">No test runs found</p>
              </div>
            ) : (
              <div className="p-2">
                {testRuns.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className={`w-full p-4 rounded-lg mb-2 text-left transition-colors ${
                      selectedRun?.id === run.id
                        ? 'bg-primary/20 border border-primary'
                        : 'glass hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(run.timestamp)}
                      </span>
                      <span className="text-xs font-semibold text-white/80">
                        {getPassRate(run)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="w-3 h-3" />
                        {run.passed}
                      </span>
                      <span className="flex items-center gap-1 text-error">
                        <XCircle className="w-3 h-3" />
                        {run.failed}
                      </span>
                      <span className="text-white/60">• {(run.duration / 1000).toFixed(1)}s</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedRun ? (
            <>
              {/* Summary Bar */}
              <div className="p-6 border-b border-white/10">
                <div className="grid grid-cols-5 gap-4">
                  <div className="glass rounded-lg p-4">
                    <p className="text-xs text-white/60 mb-1">Total Tests</p>
                    <p className="text-2xl font-bold">{selectedRun.total}</p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <p className="text-xs text-white/60 mb-1">Passed</p>
                    <p className="text-2xl font-bold text-success">{selectedRun.passed}</p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <p className="text-xs text-white/60 mb-1">Failed</p>
                    <p className="text-2xl font-bold text-error">{selectedRun.failed}</p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <p className="text-xs text-white/60 mb-1">Pass Rate</p>
                    <p className="text-2xl font-bold flex items-center gap-1">
                      {getPassRate(selectedRun)}%
                      <TrendingUp className="w-4 h-4 text-success" />
                    </p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <p className="text-xs text-white/60 mb-1">Duration</p>
                    <p className="text-2xl font-bold">{(selectedRun.duration / 1000).toFixed(1)}s</p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mt-4">
                  {(['all', 'passed', 'failed', 'skipped'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                        filter === f
                          ? 'bg-primary text-white'
                          : 'glass hover:bg-white/10'
                      }`}
                    >
                      {f}
                      {f !== 'all' && (
                        <span className="ml-2 text-xs">
                          ({selectedRun.tests.filter(t => t.status === f).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test List */}
              <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 overflow-y-auto p-6">
                  {filteredTests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-white/60">No {filter} tests</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTests.map((test) => (
                        <div
                          key={test.id}
                          onClick={() => setSelectedTest(test)}
                          className={`rounded-xl border cursor-pointer transition-all ${
                            test.status === 'passed'
                              ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                              : test.status === 'failed'
                              ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          } ${
                            selectedTest?.id === test.id ? 'ring-2 ring-primary' : ''
                          }`}
                        >
                          <div className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {getStatusIcon(test.status)}
                                <div className="flex-1">
                                  <p className="font-medium">{test.testName}</p>
                                  <p className="text-xs text-white/40 font-mono mt-1 flex items-center gap-1">
                                    <FileCode className="w-3 h-3" />
                                    {test.testFile}
                                  </p>
                                  {test.retries && test.retries > 0 && (
                                    <p className="text-xs text-yellow-400 mt-1">
                                      Retried {test.retries} time(s)
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm text-white/40">{(test.duration / 1000).toFixed(2)}s</span>
                            </div>
                            
                            {/* Inline Error Display */}
                            {test.error && (
                              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-red-400 flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    Error
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyError(test.error + (test.stack ? '\n' + test.stack : ''), test.id);
                                    }}
                                    className="text-xs text-white/40 hover:text-white flex items-center gap-1"
                                  >
                                    {copied === test.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    {copied === test.id ? 'Copied' : 'Copy'}
                                  </button>
                                </div>
                                <p className="text-sm text-white/70 mb-2">{test.error}</p>
                                {test.stack && (
                                  <pre className="text-xs text-white/50 font-mono overflow-x-auto">
                                    {test.stack}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Suggestions Sidebar (when failures exist) */}
                {selectedRun && selectedRun.failed > 0 && (
                  <div className="w-80 border-l border-white/10 overflow-y-auto p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="w-5 h-5 text-yellow-400" />
                      <h3 className="font-semibold">AI Fix Suggestions</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {aiSuggestions.map((suggestion) => (
                        <div 
                          key={suggestion.id}
                          className="glass rounded-xl p-4 border border-yellow-500/20"
                        >
                          <h4 className="font-medium text-yellow-400 text-sm mb-2">{suggestion.title}</h4>
                          <p className="text-xs text-white/60 mb-3">{suggestion.description}</p>
                          <div className="bg-[#1e1e2e] rounded-lg p-2 overflow-x-auto">
                            <pre className="text-xs font-mono text-white/80">
                              <code>{suggestion.code}</code>
                            </pre>
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(suggestion.code);
                              showToast({ type: 'success', message: 'Code copied to clipboard' });
                            }}
                            className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copy fix
                          </button>
                        </div>
                      ))}

                      {/* Learn More Link */}
                      <div className="glass rounded-xl p-4 border border-white/10">
                        <h4 className="font-medium text-sm mb-2">Need more help?</h4>
                        <p className="text-xs text-white/50 mb-3">
                          Check out Playwright debugging documentation.
                        </p>
                        <a 
                          href="https://playwright.dev/docs/debug"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:text-primary-hover flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Playwright Debug Guide
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Celebration (when all passed) */}
                {selectedRun && selectedRun.failed === 0 && filteredTests.length > 0 && (
                  <div className="w-80 border-l border-white/10 overflow-y-auto p-4">
                    <div className="glass rounded-xl p-6 text-center border border-green-500/20 bg-green-500/5">
                      <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-7 h-7 text-green-400" />
                      </div>
                      <h3 className="text-lg font-bold text-green-400 mb-2">Great Work!</h3>
                      <p className="text-white/60 text-sm mb-4">
                        All {selectedRun.total || selectedRun.totalTests} tests passed successfully.
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => navigate('/app/suites')}
                          className="w-full px-4 py-2 glass hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                        >
                          Back to Suites
                        </button>
                        <button
                          onClick={() => navigate('/app/dashboard')}
                          className="w-full px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors"
                        >
                          Dashboard
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="glass rounded-xl p-4 mt-4">
                      <h4 className="font-medium text-sm mb-3">Run Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-white/50">Total Duration</span>
                          <span className="font-mono">{(selectedRun.duration / 1000).toFixed(1)}s</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/50">Avg per Test</span>
                          <span className="font-mono">{((selectedRun.duration / 1000) / (selectedRun.total || selectedRun.totalTests || 1)).toFixed(2)}s</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/50">Tests Run</span>
                          <span>{selectedRun.total || selectedRun.totalTests}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <AlertTriangle className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/60">Select a test run to view results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
