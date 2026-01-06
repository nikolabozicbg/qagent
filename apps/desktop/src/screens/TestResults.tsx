import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Image as ImageIcon, Code, AlertTriangle, TrendingUp, Calendar, Download } from 'lucide-react';
import { apiService } from '@services/api';
import { useApp } from '@contexts/AppContext';
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
  screenshot?: string;
  retries?: number;
}

export default function TestResults() {
  const { selectedProjectPath } = useApp();
  const { showToast } = useToast();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'skipped'>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (selectedProjectPath) {
      loadTestResults();
    }
  }, [selectedProjectPath]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-error" />;
      case 'skipped':
        return <Clock className="w-5 h-5 text-white/40" />;
    }
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

  return (
    <div className="h-full bg-dark overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Test Results</h1>
          <p className="text-sm text-white/60">View test run history and failures</p>
        </div>
        
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
            
            {/* Export Dropdown */}
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
                    <Download className="w-4 h-4 text-success" />
                    <span>Export as CSV</span>
                  </button>
                </div>
              </>
            )}
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
                    <div className="space-y-2">
                      {filteredTests.map((test) => (
                        <button
                          key={test.id}
                          onClick={() => setSelectedTest(test)}
                          className={`w-full glass rounded-lg p-4 text-left border-l-4 transition-all ${
                            test.status === 'passed'
                              ? 'border-success'
                              : test.status === 'failed'
                              ? 'border-error'
                              : 'border-white/20'
                          } ${
                            selectedTest?.id === test.id
                              ? 'bg-white/10 border-primary'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              {getStatusIcon(test.status)}
                              <div className="flex-1">
                                <p className="font-semibold">{test.testName}</p>
                                <p className="text-xs text-white/60 font-mono mt-1">{test.testFile}</p>
                                {test.retries && test.retries > 0 && (
                                  <p className="text-xs text-warning mt-1">
                                    Retried {test.retries} time(s)
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-white/60">{(test.duration / 1000).toFixed(2)}s</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Test Detail Sidebar */}
                {selectedTest && (
                  <div className="w-96 border-l border-white/10 overflow-y-auto p-6 animate-fade-in-up">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(selectedTest.status)}
                          <h3 className="font-semibold">{selectedTest.testName}</h3>
                        </div>
                        <p className="text-xs text-white/60 font-mono">{selectedTest.testFile}</p>
                      </div>

                      {selectedTest.error && (
                        <div className="glass rounded-lg p-4 border-l-4 border-error">
                          <div className="flex items-start gap-2 mb-2">
                            <Code className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                            <h4 className="text-sm font-semibold text-error">Error</h4>
                          </div>
                          <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap">
                            {selectedTest.error}
                          </pre>
                        </div>
                      )}

                      {selectedTest.screenshot && (
                        <div className="glass rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <ImageIcon className="w-4 h-4 text-accent" />
                            <h4 className="text-sm font-semibold">Screenshot</h4>
                          </div>
                          <img
                            src={selectedTest.screenshot}
                            alt="Test screenshot"
                            className="w-full rounded-lg border border-white/10"
                          />
                        </div>
                      )}

                      <div className="glass rounded-lg p-4">
                        <h4 className="text-sm font-semibold mb-3">Details</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-white/60">Duration:</span>
                            <span className="text-white/80">{(selectedTest.duration / 1000).toFixed(2)}s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Status:</span>
                            <span className="text-white/80 capitalize">{selectedTest.status}</span>
                          </div>
                          {selectedTest.retries && (
                            <div className="flex justify-between">
                              <span className="text-white/60">Retries:</span>
                              <span className="text-white/80">{selectedTest.retries}</span>
                            </div>
                          )}
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
