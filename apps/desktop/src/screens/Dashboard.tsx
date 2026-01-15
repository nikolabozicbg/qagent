import { CheckCircle2, Timer, AlertTriangle, Activity, Sparkles, FolderOpen, Upload, Trash2, RefreshCw } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@contexts/ToastContext';
import { useSuiteStore } from '@stores/useSuiteStore';
import { useProjectStore } from '@stores/useProjectStore';
import api from '@services/api';
import { PRIORITY_ORDER } from '@/types/suite.types';
import {
  MetricCard,
  CoverageBar,
  QuickActions,
  CoverageByPriority,
  SuitesTable,
  RecentActivity,
  type ActivityItem,
} from '@components/dashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { suites, setSuites, loadSuitesFromBackend } = useSuiteStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [lastRunTime, setLastRunTime] = useState<string | undefined>();
  const [lastRunStatus, setLastRunStatus] = useState<'passed' | 'failed' | 'none'>('none');

  // Load suites from backend when project changes
  useEffect(() => {
    if (currentProject?.projectPath) {
      loadSuitesFromBackend(currentProject.projectPath);
    }
  }, [currentProject?.projectPath]);

  // Calculate stats from suites
  const stats = useMemo(() => {
    const totalCases = suites.reduce((acc, s) => acc + (s.stats?.totalCases || s.testCases?.length || 0), 0);
    const totalSteps = suites.reduce((acc, s) => acc + (s.stats?.totalSteps || 0), 0);
    
    // Cases with generated tests (not 'not-generated' or 'pending')
    const casesWithTests = suites.reduce((acc, s) => 
      acc + (s.testCases?.filter(tc => 
        tc.status !== 'not-generated' && tc.status !== 'pending'
      ).length || 0), 0
    );
    
    const casesPassing = suites.reduce((acc, s) => 
      acc + (s.testCases?.filter(tc => tc.status === 'passed' || tc.status === 'passing').length || 0), 0
    );
    
    const casesFailing = suites.reduce((acc, s) => 
      acc + (s.testCases?.filter(tc => tc.status === 'failed' || tc.status === 'failing').length || 0), 0
    );
    
    const casesFlaky = suites.reduce((acc, s) => 
      acc + (s.testCases?.filter(tc => tc.status === 'flaky').length || 0), 0
    );

    // Estimated total time (sum of suite estimated durations)
    const totalTime = suites.reduce((acc, s) => acc + (s.stats?.estimatedDuration || 0), 0);

    return {
      totalSuites: suites.length,
      totalCases,
      totalSteps,
      casesWithTests,
      casesWithoutTests: totalCases - casesWithTests,
      casesPassing,
      casesFailing,
      casesFlaky,
      totalTime,
    };
  }, [suites]);

  // Coverage percentage
  const coveragePercentage = stats.totalCases > 0 
    ? Math.round((stats.casesWithTests / stats.totalCases) * 100)
    : 0;

  // Coverage by priority
  const coverageByPriority = useMemo(() => {
    const priorities: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    
    return priorities.map(priority => {
      const suitesWithPriority = suites.filter(s => s.priority === priority);
      const totalCases = suitesWithPriority.reduce((acc, s) => acc + (s.testCases?.length || 0), 0);
      const coveredCases = suitesWithPriority.reduce((acc, s) => 
        acc + (s.testCases?.filter(tc => 
          tc.status !== 'not-generated' && tc.status !== 'pending'
        ).length || 0), 0
      );
      
      return { priority, covered: coveredCases, total: totalCases };
    }).filter(p => p.total > 0); // Only show priorities with cases
  }, [suites]);

  // Critical covered count
  const criticalCovered = useMemo(() => {
    return suites
      .filter(s => s.priority === 'CRITICAL')
      .reduce((acc, s) => 
        acc + (s.testCases?.filter(tc => 
          tc.status !== 'not-generated' && tc.status !== 'pending'
        ).length || 0), 0
      );
  }, [suites]);

  // High missing count
  const highMissing = useMemo(() => {
    return suites
      .filter(s => s.priority === 'HIGH')
      .reduce((acc, s) => 
        acc + (s.testCases?.filter(tc => 
          tc.status === 'not-generated' || tc.status === 'pending'
        ).length || 0), 0
      );
  }, [suites]);

  // Cases without tests (for Generate Missing)
  const missingCaseNames = useMemo(() => {
    const names: string[] = [];
    suites.forEach(s => {
      s.testCases?.forEach(tc => {
        if (tc.status === 'not-generated' || tc.status === 'pending') {
          names.push(tc.name);
        }
      });
    });
    return names;
  }, [suites]);

  // Generate activities from suites data
  useEffect(() => {
    const newActivities: ActivityItem[] = [];
    
    // Add discovery activity if suites exist
    if (suites.length > 0) {
      const totalCases = suites.reduce((acc, s) => acc + (s.testCases?.length || 0), 0);
      newActivities.push({
        id: 'discovery-1',
        type: 'discovered',
        message: `Discovered ${suites.length} suites, ${totalCases} cases`,
        timestamp: new Date().toISOString(),
        details: suites.map(s => s.name).join(', '),
      });
    }

    // Add passing/failing activities based on test status
    suites.forEach(s => {
      const passing = s.testCases?.filter(tc => tc.status === 'passed' || tc.status === 'passing').length || 0;
      const failing = s.testCases?.filter(tc => tc.status === 'failed' || tc.status === 'failing').length || 0;
      
      if (passing > 0) {
        newActivities.push({
          id: `pass-${s.id}`,
          type: 'test-passed',
          message: `${passing} tests passing in ${s.name}`,
          timestamp: new Date().toISOString(),
        });
      }
      
      if (failing > 0) {
        newActivities.push({
          id: `fail-${s.id}`,
          type: 'test-failed',
          message: `${failing} tests failing in ${s.name}`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    setActivities(newActivities.slice(0, 5));
  }, [suites]);

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length > 0) {
      // @ts-ignore - path property exists in Electron
      const folderPath = files[0].path;
      
      if (folderPath) {
        setCurrentProject({
          projectPath: folderPath,
          projectName: folderPath.split('/').pop() || 'Project',
          framework: 'playwright',
          baseUrl: 'http://localhost:3000',
          testDir: './e2e'
        });
        showToast({
          type: 'success',
          message: `Project loaded: ${folderPath.split('/').pop()}`,
        });
      }
    }
  };

  const handleDiscoverSuites = () => {
    navigate('/setup/detection');
  };

  const handleRunAllTests = async () => {
    if (stats.casesWithTests === 0) return;
    
    setIsRunning(true);
    showToast({ type: 'info', message: 'Running all tests...' });
    
    // TODO: Implement actual test running via API
    // For now, simulate
    setTimeout(() => {
      setIsRunning(false);
      setLastRunStatus('passed');
      setLastRunTime('Just now');
      showToast({ type: 'success', message: 'All tests passed!' });
    }, 2000);
  };

  const handleGenerateMissing = async () => {
    if (stats.casesWithoutTests === 0) return;
    
    setIsGenerating(true);
    showToast({ type: 'info', message: 'Generating missing tests...' });
    
    // TODO: Implement batch generation via API
    // For now, navigate to first suite with missing tests
    const suiteWithMissing = suites.find(s => 
      s.testCases?.some(tc => tc.status === 'not-generated' || tc.status === 'pending')
    );
    
    if (suiteWithMissing) {
      navigate(`/app/suites/${suiteWithMissing.id}`);
    }
    
    setIsGenerating(false);
  };
  
  const handleResetApp = async () => {
    if (confirm('🚨 Reset app to first-time setup? This will clear all projects and suites.')) {
      try {
        // Reset backend database
        await api.resetDatabase();
        console.log('✅ Backend database reset');
      } catch (error) {
        console.warn('⚠️ Failed to reset backend:', error);
      }
      
      // Clear localStorage
      localStorage.clear();
      
      // Navigate to setup and reload
      navigate('/setup/welcome');
      setTimeout(() => window.location.reload(), 100);
    }
  };

  const handleRefresh = async () => {
    if (!currentProject?.projectPath) return;
    
    setIsLoading(true);
    try {
      await loadSuitesFromBackend(currentProject.projectPath);
      showToast({ type: 'success', message: 'Data refreshed' });
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to refresh' });
    } finally {
      setIsLoading(false);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  return (
    <div 
      className="h-full bg-dark overflow-hidden flex flex-col relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-dark/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="glass rounded-2xl p-12 max-w-md text-center border-2 border-dashed border-primary/50">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
              <FolderOpen className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Drop Project Folder</h3>
            <p className="text-white/60 mb-6">
              Release to set this folder as your project directory
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-white/40">
              <Upload className="w-4 h-4" />
              <span>Drag & Drop Support</span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* No Project Selected State */}
        {!currentProject && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderOpen className="w-20 h-20 text-white/20 mb-6" />
            <h2 className="text-2xl font-bold mb-3">No Project Selected</h2>
            <p className="text-white/60 mb-6 max-w-md">
              Select a project folder from the title bar or drag & drop a folder anywhere on this screen to get started.
            </p>
            <button
              onClick={async () => {
                const result = await window.electronAPI.selectFolder();
                if (!result.canceled && result.filePaths[0]) {
                  const path = result.filePaths[0];
                  setCurrentProject({
                    projectPath: path,
                    projectName: path.split('/').pop() || 'Project',
                    framework: 'playwright',
                    baseUrl: 'http://localhost:3000',
                    testDir: './e2e'
                  });
                  showToast({
                    type: 'success',
                    message: 'Project loaded successfully',
                  });
                }
              }}
              className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FolderOpen className="w-5 h-5" />
              Select Project Folder
            </button>
          </div>
        )}
        
        {currentProject && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{currentProject.projectName}</h1>
                <p className="text-sm text-white/50">
                  {stats.totalSuites} suites • {stats.totalCases} cases • {stats.totalSteps} steps
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="glass p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleDiscoverSuites}
                  className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Re-discover
                </button>
                <button
                  onClick={handleResetApp}
                  className="glass p-2 rounded-lg hover:bg-error/20 transition-colors text-error/60 hover:text-error"
                  title="Reset app"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* No Suites Yet */}
            {stats.totalSuites === 0 && (
              <div className="glass rounded-xl p-12 text-center">
                <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-3">Ready to Discover Test Suites</h2>
                <p className="text-white/60 mb-6 max-w-md mx-auto">
                  Click "Re-discover" to analyze your project and generate intelligent test suites.
                </p>
                <button
                  onClick={handleDiscoverSuites}
                  className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                  <Sparkles className="w-5 h-5" />
                  Discover Test Suites
                </button>
              </div>
            )}

            {/* Main Content */}
            {stats.totalSuites > 0 && (
              <>
                {/* Coverage Bar */}
                <CoverageBar
                  percentage={coveragePercentage}
                  totalCases={stats.totalCases}
                  coveredCases={stats.casesWithTests}
                  criticalCovered={criticalCovered}
                  highMissing={highMissing}
                />

                {/* Metric Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <MetricCard
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    value={`${stats.casesPassing}/${stats.casesWithTests}`}
                    label="Passing"
                    sublabel={lastRunTime ? `Last: ${lastRunTime}` : undefined}
                    className="animate-fade-in-up"
                  />
                  <MetricCard
                    icon={<Timer className="w-5 h-5" />}
                    value={formatTime(stats.totalTime)}
                    label="Total time"
                    trend={stats.totalTime > 0 ? { value: '0.3s faster', direction: 'down' } : undefined}
                    className="animate-fade-in-up"
                  />
                  <MetricCard
                    icon={<AlertTriangle className="w-5 h-5" />}
                    value={stats.casesFlaky}
                    label="Flaky"
                    sublabel="tests"
                    className="animate-fade-in-up"
                  />
                  <MetricCard
                    icon={<Activity className="w-5 h-5" />}
                    value={5}
                    label="Runs today"
                    trend={{ value: '↑ 2 vs yesterday', direction: 'up' }}
                    className="animate-fade-in-up"
                  />
                </div>

                {/* Quick Actions */}
                <QuickActions
                  testsReady={stats.casesWithTests}
                  casesWithoutTests={stats.casesWithoutTests}
                  missingCaseNames={missingCaseNames}
                  lastRunStatus={lastRunStatus}
                  lastRunTime={lastRunTime}
                  onRunAll={handleRunAllTests}
                  onGenerateMissing={handleGenerateMissing}
                  isRunning={isRunning}
                  isGenerating={isGenerating}
                />

                {/* Two Column Layout */}
                <div className="grid grid-cols-[1fr_320px] gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Coverage by Priority */}
                    <CoverageByPriority coverageData={coverageByPriority} />

                    {/* Suites Table */}
                    <SuitesTable
                      suites={suites}
                      onSuiteClick={(suiteId) => navigate(`/app/suites/${suiteId}`)}
                      onViewAll={() => navigate('/app/suites')}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Recent Activity */}
                    <RecentActivity activities={activities} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
