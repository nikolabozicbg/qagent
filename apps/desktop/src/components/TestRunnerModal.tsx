import { useState, useEffect } from 'react';
import { X, Play, CheckCircle2, XCircle, Clock, Loader2, Pause, Square, Network, Terminal } from 'lucide-react';
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

interface ConsoleLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

interface NetworkRequest {
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: string;
}

interface Artifact {
  type: 'screenshot' | 'video' | 'trace';
  path: string;
  testId: string;
  timestamp: string;
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
  const [isPaused, setIsPaused] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState({ passed: 0, failed: 0, total: 0, duration: 0 });
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeTab, setActiveTab] = useState<'tests' | 'console' | 'network' | 'artifacts'>('tests');

  // Auto-run tests when modal opens
  useEffect(() => {
    if (isOpen && !isRunning && tests.length === 0) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        handleRunTests();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
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

    const handleConsole = (data: { timestamp: string; level: string; message: string }) => {
      setConsoleLogs(prev => [...prev, {
        timestamp: data.timestamp,
        level: data.level as any,
        message: data.message
      }]);
    };

    const handleNetwork = (data: { method: string; url: string; status: number; duration: number }) => {
      setNetworkRequests(prev => [...prev, {
        ...data,
        timestamp: new Date().toISOString()
      }]);
    };

    const handleArtifact = (data: { type: string; path: string; testId: string }) => {
      setArtifacts(prev => [...prev, {
        type: data.type as 'screenshot' | 'video' | 'trace',
        path: data.path,
        testId: data.testId,
        timestamp: new Date().toISOString()
      }]);
    };

    const handleComplete = (data: { passed: number; failed: number; total: number; duration: number }) => {
      setSummary(data);
      setIsRunning(false);
      setIsPaused(false);
      
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
    wsService.onTestRunConsole(handleConsole);
    wsService.onTestRunNetwork(handleNetwork);
    wsService.onTestRunArtifact(handleArtifact);
    wsService.onTestRunComplete(handleComplete);

    return () => {
      wsService.offTestRunUpdate(handleTestUpdate);
      wsService.offTestRunConsole(handleConsole);
      wsService.offTestRunNetwork(handleNetwork);
      wsService.offTestRunArtifact(handleArtifact);
      wsService.offTestRunComplete(handleComplete);
    };
  }, [isOpen, showToast]);

  const handleRunTests = async () => {
    // Debug: Check if Electron API is available
    console.log('🔍 Checking Electron API:', {
      hasWindow: typeof window !== 'undefined',
      hasElectronAPI: !!window.electronAPI,
      hasRunPlaywrightTests: !!window.electronAPI?.runPlaywrightTests,
      allAPIs: window.electronAPI ? Object.keys(window.electronAPI) : []
    });
    
    setIsRunning(true);
    setIsPaused(false);
    setTests([]);
    setSummary({ passed: 0, failed: 0, total: 0, duration: 0 });
    setConsoleLogs([]);
    setNetworkRequests([]);
    setArtifacts([]);
    setActiveTab('tests');

    try {
      // Use Electron IPC to run tests directly in project
      if (window.electronAPI?.runPlaywrightTests) {
        // Setup event listeners for live output BEFORE running tests
        let consoleCleanup: (() => void) | undefined;
        let completeCleanup: (() => void) | undefined;
        
        consoleCleanup = window.electronAPI.onTestConsole((data) => {
          console.log('📟 Test console:', data.message);
          setConsoleLogs(prev => [...prev, {
            timestamp: data.timestamp,
            level: data.level as 'info' | 'warn' | 'error' | 'debug',
            message: data.message
          }]);
        });
        
        completeCleanup = window.electronAPI.onTestComplete((data: any) => {
          console.log('✅ Test complete:', data);
          
          // Update tests from completion data if available
          if (data.tests && Array.isArray(data.tests)) {
            console.log('📝 Test results:', data.tests);
            setTests(data.tests);
          }
          
          setSummary({
            passed: data.passed,
            failed: data.failed,
            total: data.total,
            duration: data.duration
          });
          setIsRunning(false);
          setIsPaused(false);
          
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
          
          // Cleanup event listeners after completion
          if (consoleCleanup) consoleCleanup();
          if (completeCleanup) completeCleanup();
        });
        
        // Small delay to ensure listeners are registered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if app is running before executing tests
        // Read baseURL from .qagent/config.json
        let baseURL = 'http://localhost:3000'; // default
        try {
          const configPath = `${projectPath}/.qagent/config.json`;
          if (window.electronAPI?.readFile) {
            const configResult = await window.electronAPI.readFile(configPath);
            if (configResult.ok && configResult.contents) {
              const config = JSON.parse(configResult.contents);
              baseURL = config.baseUrl || baseURL;
            }
          }
        } catch (err) {
          console.warn('Could not read baseURL from config:', err);
        }
        
        // Test connection
        try {
          const response = await fetch(baseURL, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`App not responding at ${baseURL}`);
          }
          console.log('✅ App is running at', baseURL);
        } catch (err) {
          setIsRunning(false);
          showToast({
            type: 'error',
            message: `App not running at ${baseURL}. Please start your app first.`,
          });
          return;
        }
        
        // Run tests
        console.log('🚀 Starting test execution...');
        const result = await window.electronAPI.runPlaywrightTests({
          projectPath,
          testFiles
        });
        
        console.log('Test execution completed:', result);
      } else {
        // Electron API not available
        throw new Error('Test execution not available - Electron API required');
      }
    } catch (error: any) {
      setIsRunning(false);
      setIsPaused(false);
      showToast({
        type: 'error',
        message: `Failed to run tests: ${error.message}`,
      });
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    // TODO: Emit pause event to backend
    wsService.emit('test:run:pause', {});
  };

  const handleResume = () => {
    setIsPaused(false);
    // TODO: Emit resume event to backend
    wsService.emit('test:run:resume', {});
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    // TODO: Emit stop event to backend
    wsService.emit('test:run:stop', {});
    showToast({
      type: 'info',
      message: 'Test execution stopped',
    });
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

        {/* Tabs */}
        {isRunning || tests.length > 0 ? (
          <div className="border-b border-white/10 px-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('tests')}
                className={`py-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'tests'
                    ? 'border-primary text-white'
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                Tests
              </button>
              <button
                onClick={() => setActiveTab('console')}
                className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'console'
                    ? 'border-primary text-white'
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <Terminal className="w-4 h-4" />
                Console
                {consoleLogs.length > 0 && (
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{consoleLogs.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('network')}
                className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'network'
                    ? 'border-primary text-white'
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <Network className="w-4 h-4" />
                Network
                {networkRequests.length > 0 && (
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{networkRequests.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('artifacts')}
                className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'artifacts'
                    ? 'border-primary text-white'
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                Artifacts
                {artifacts.length > 0 && (
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{artifacts.length}</span>
                )}
              </button>
            </div>
          </div>
        ) : null}

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
          ) : activeTab === 'tests' ? (
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
          ) : activeTab === 'console' ? (
            <div className="glass rounded-lg p-4 max-h-96 overflow-auto">
              <div className="space-y-1 font-mono text-xs">
                {consoleLogs.length === 0 ? (
                  <div className="text-white/40 text-center py-8">No console output yet...</div>
                ) : (
                  consoleLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-white/40 flex-shrink-0">{log.timestamp.split('T')[1]?.split('.')[0] || ''}</span>
                      <span className={`flex-shrink-0 ${
                        log.level === 'error' ? 'text-error' :
                        log.level === 'warn' ? 'text-yellow-400' :
                        log.level === 'debug' ? 'text-white/40' :
                        'text-white/80'
                      }`}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-white/80 flex-1">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === 'network' ? (
            <div className="space-y-1">
              {networkRequests.length === 0 ? (
                <div className="text-white/40 text-center py-8">No network requests yet...</div>
              ) : (
                networkRequests.map((req, index) => (
                  <div key={index} className="glass rounded-lg p-3 flex items-center gap-3 text-xs">
                    <span className={`px-2 py-1 rounded font-semibold ${
                      req.status >= 200 && req.status < 300 ? 'bg-success/20 text-success' :
                      req.status >= 400 ? 'bg-error/20 text-error' :
                      'bg-white/10 text-white/80'
                    }`}>
                      {req.method}
                    </span>
                    <span className="flex-1 font-mono text-white/80 truncate">{req.url}</span>
                    <span className={`font-semibold ${
                      req.status >= 200 && req.status < 300 ? 'text-success' :
                      req.status >= 400 ? 'text-error' :
                      'text-white/60'
                    }`}>
                      {req.status}
                    </span>
                    <span className="text-white/60">{req.duration}ms</span>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'artifacts' ? (
            <div className="space-y-2">
              {artifacts.length === 0 ? (
                <div className="text-white/40 text-center py-8">No artifacts yet...</div>
              ) : (
                artifacts.map((artifact, index) => (
                  <div key={index} className="glass rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        artifact.type === 'screenshot' ? 'bg-blue-500/20' :
                        artifact.type === 'video' ? 'bg-purple-500/20' :
                        'bg-green-500/20'
                      }`}>
                        {artifact.type === 'screenshot' ? '📷' : artifact.type === 'video' ? '🎥' : '📝'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold capitalize">{artifact.type}</p>
                        <p className="text-xs text-white/60 font-mono">{artifact.path}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // TODO: Open artifact
                        showToast({
                          type: 'info',
                          message: 'Artifact viewer coming soon',
                        });
                      }}
                      className="text-xs px-3 py-1.5 glass hover:bg-white/10 rounded-lg transition-colors"
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {isRunning && tests.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-white/80">Starting test runner...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning && (
              <>
                {isPaused ? (
                  <button
                    onClick={handleResume}
                    className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                )}
                <button
                  onClick={handleStop}
                  className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
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
                disabled={isRunning && !isPaused}
                className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (isPaused ? 'Close' : 'Running...') : 'Close'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
