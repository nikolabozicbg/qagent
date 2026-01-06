import { useState, useEffect } from 'react';
import { X, Play, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { apiService } from '@services/api';
import { wsService } from '@services/websocket';
import { useToast } from '@contexts/ToastContext';
import { notificationService } from '@services/notification';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
  testFiles?: string[];
  framework: string;
}

interface TestResult {
  testFile: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

export function TestRunnerModal({
  isOpen,
  onClose,
  projectPath,
  testFiles,
  framework,
}: TestRunnerModalProps) {
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState({ passed: 0, failed: 0, total: 0, duration: 0 });

  useEffect(() => {
    if (!isOpen) return;

    // Setup WebSocket listeners
    const handleTestUpdate = (update: { testFile: string; status: string; duration?: number; error?: string }) => {
      setTests(prev => {
        const existing = prev.find(t => t.testFile === update.testFile);
        if (existing) {
          return prev.map(t =>
            t.testFile === update.testFile
              ? { ...t, status: update.status as any, duration: update.duration, error: update.error }
              : t
          );
        }
        return [...prev, { ...update, status: update.status as any }];
      });
    };

    const handleComplete = (data: { passed: number; failed: number; total: number; duration: number }) => {
      setSummary(data);
      setIsRunning(false);
      
      // Send desktop notification
      notificationService.testComplete(data.passed, data.failed, data.duration / 1000);
      
      if (data.failed === 0) {
        showToast({
          type: 'success',
          message: `All tests passed! (${data.passed}/${data.total})`,
        });
      } else {
        showToast({
          type: 'error',
          message: `${data.failed} test(s) failed`,
        });
      }
    };

    wsService.onTestRunUpdate(handleTestUpdate);
    wsService.onTestRunComplete(handleComplete);

    return () => {
      wsService.offTestRunUpdate(handleTestUpdate);
      wsService.offTestRunComplete(handleComplete);
    };
  }, [isOpen, showToast]);

  const handleRunTests = async () => {
    setIsRunning(true);
    setTests([]);
    setSummary({ passed: 0, failed: 0, total: 0, duration: 0 });

    try {
      // Connect WebSocket if not connected
      if (!wsService.isConnected()) {
        wsService.connect();
      }

      await apiService.runTests({
        projectPath,
        testFiles,
        framework,
      });
    } catch (error: any) {
      setIsRunning(false);
      showToast({
        type: 'error',
        message: `Failed to run tests: ${error.message}`,
      });
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-accent animate-spin" />;
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-error" />;
      case 'skipped':
        return <Clock className="w-5 h-5 text-white/40" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-4xl glass rounded-xl shadow-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Play className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Run Tests</h2>
              <p className="text-sm text-white/60">
                {testFiles ? `${testFiles.length} test file(s)` : 'All tests'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={isRunning}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        {tests.length > 0 && (
          <div className="px-6 py-4 border-b border-white/10 grid grid-cols-4 gap-4">
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-white/60 mb-1">Total</p>
              <p className="text-2xl font-bold">{summary.total || tests.length}</p>
            </div>
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-white/60 mb-1">Passed</p>
              <p className="text-2xl font-bold text-success">{summary.passed || tests.filter(t => t.status === 'passed').length}</p>
            </div>
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-white/60 mb-1">Failed</p>
              <p className="text-2xl font-bold text-error">{summary.failed || tests.filter(t => t.status === 'failed').length}</p>
            </div>
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-white/60 mb-1">Duration</p>
              <p className="text-2xl font-bold">{(summary.duration / 1000).toFixed(1)}s</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tests.length === 0 && !isRunning ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Play className="w-16 h-16 text-white/20 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to run tests</h3>
              <p className="text-white/60 mb-6">
                Click the button below to start running your tests
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className={`glass rounded-lg p-4 border-l-4 ${
                    test.status === 'passed'
                      ? 'border-success'
                      : test.status === 'failed'
                      ? 'border-error'
                      : test.status === 'running'
                      ? 'border-accent'
                      : 'border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(test.status)}
                      <div className="flex-1">
                        <p className="font-mono text-sm">{test.testFile}</p>
                        {test.error && (
                          <p className="text-xs text-error mt-2 font-mono">{test.error}</p>
                        )}
                      </div>
                    </div>
                    {test.duration && (
                      <span className="text-xs text-white/60 flex-shrink-0">
                        {(test.duration / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isRunning && tests.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-white/80">Starting test runner...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
          {!isRunning && tests.length === 0 ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRunTests}
                className="px-6 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Run Tests
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors"
            >
              {isRunning ? 'Running...' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
