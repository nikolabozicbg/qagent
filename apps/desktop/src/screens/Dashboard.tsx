import { Target, CheckCircle2, TrendingUp, RefreshCw, AlertCircle, Clock, Activity, Sparkles, Play, Eye, Code, ArrowRight, Plus, Zap, Brain, ChevronRight, Upload, FolderOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@contexts/AppContext';
import { SkeletonStatCard } from '@components/Skeleton';
import { useToast } from '@contexts/ToastContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { dashboardMetrics, recentActivity, flows, isLoading, aiCopilotVisible, toggleAICopilot, refreshData, setProjectPath, projectPath, selectedProjectPath } = useApp();
  const { showToast } = useToast();
  const [fabOpen, setFabOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Load project path from localStorage on mount if not set
  useEffect(() => {
    if (!projectPath) {
      const savedPath = localStorage.getItem('qagent_project_path');
      if (savedPath) {
        setProjectPath(savedPath);
      }
    }
  }, []);

  // Get priority flows for display
  const priorityFlows = flows
    .filter(f => f.status === 'no-tests' || f.status === 'failing' || f.status === 'partial')
    .sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);

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
    
    // In Electron, we can access the file path
    if (files.length > 0) {
      // @ts-ignore - path property exists in Electron
      const folderPath = files[0].path;
      
      if (folderPath) {
        setProjectPath(folderPath);
        localStorage.setItem('qagent_project_path', folderPath);
        showToast({
          type: 'success',
          message: `Project path updated to: ${folderPath}`,
        });
      }
    }
  };

  return (
    <div 
      className="h-screen bg-dark overflow-hidden flex flex-col relative"
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
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-white/60">
            Project: <span className="text-primary">{projectPath ? projectPath.split('/').pop() : 'No project selected'}</span>
            {selectedProjectPath && (
              <>
                <span className="mx-2">•</span>
                <span className="text-white/80">Live data from backend</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => refreshData()}
          className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* No Project Selected State */}
        {!projectPath && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderOpen className="w-20 h-20 text-white/20 mb-6" />
            <h2 className="text-2xl font-bold mb-3">No Project Selected</h2>
            <p className="text-white/60 mb-6 max-w-md">
              Select a project folder from the title bar or drag & drop a folder anywhere on this screen to get started.
            </p>
            <button
              onClick={async () => {
                const result = await window.electron.selectFolder();
                if (!result.canceled && result.filePaths[0]) {
                  setProjectPath(result.filePaths[0]);
                  localStorage.setItem('qagent_project_path', result.filePaths[0]);
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
        
        {projectPath && (
        <>
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <div className="glass rounded-xl p-6 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <h3 className="text-sm text-white/60">Flows</h3>
                </div>
                <p className="text-4xl font-bold mb-2">{dashboardMetrics.totalFlows}</p>
                <p className="text-xs text-white/60">Discovered</p>
              </div>

              <div className="glass rounded-xl p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <h3 className="text-sm text-white/60">Tests</h3>
                </div>
                <p className="text-4xl font-bold mb-2">
                  {dashboardMetrics.testsPassing} <span className="text-white/60">/ {dashboardMetrics.testsGenerated}</span>
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-white/60">Passing</p>
                  <span className="text-xs text-success flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +3 today
                  </span>
                </div>
              </div>

              <div className="glass rounded-xl p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-accent" />
                  <h3 className="text-sm text-white/60">Coverage</h3>
                </div>
                <p className="text-4xl font-bold mb-2">{dashboardMetrics.coverage}%</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-success flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +5% this week
                  </span>
                  <div className="flex-1 h-6 flex items-end gap-[2px]">
                    <div className="w-1 bg-accent/40 rounded-sm" style={{ height: '30%' }} />
                    <div className="w-1 bg-accent/50 rounded-sm" style={{ height: '40%' }} />
                    <div className="w-1 bg-accent/60 rounded-sm" style={{ height: '50%' }} />
                    <div className="w-1 bg-accent/70 rounded-sm" style={{ height: '70%' }} />
                    <div className="w-1 bg-accent/80 rounded-sm" style={{ height: '85%' }} />
                    <div className="w-1 bg-accent rounded-sm" style={{ height: '100%' }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Priority Queue */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-error" />
                  <h2 className="text-lg font-semibold">Priority Queue</h2>
                </div>
                <button
                  onClick={() => navigate('/app/flows')}
                  className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {priorityFlows.map((flow) => {
                  const getBorderColor = () => {
                    if (flow.priority === 'CRITICAL') return 'border-error';
                    if (flow.priority === 'HIGH') return 'border-warning';
                    if (flow.priority === 'MEDIUM') return 'border-accent';
                    return 'border-success';
                  };

                  const getIcon = () => {
                    if (flow.status === 'no-tests') return <AlertCircle className="w-4 h-4 text-error" />;
                    if (flow.status === 'failing') return <AlertCircle className="w-4 h-4 text-error" />;
                    if (flow.status === 'partial') return <Clock className="w-4 h-4 text-warning" />;
                    return <CheckCircle2 className="w-4 h-4 text-success" />;
                  };

                  const getPriorityBadge = () => {
                    const colors = {
                      CRITICAL: 'bg-error/20 text-error',
                      HIGH: 'bg-warning/20 text-warning',
                      MEDIUM: 'bg-accent/20 text-accent',
                      LOW: 'bg-success/20 text-success',
                    };
                    return colors[flow.priority];
                  };

                  const getStatusText = () => {
                    if (flow.status === 'no-tests') return `No tests • High Risk • ${flow.apis} APIs`;
                    if (flow.status === 'failing') return `Failing ${flow.passing}/${flow.total} • Med Risk • ${flow.apis} APIs`;
                    if (flow.status === 'partial') return `Passing ${flow.passing}/${flow.total} • Med Risk • ${flow.apis} APIs`;
                    return `Passing • Low Risk • ${flow.apis} API`;
                  };

                  return (
                    <div key={flow.id} className={`glass rounded-lg p-4 border-l-4 ${getBorderColor()}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getIcon()}
                          <h3 className="font-semibold">{flow.name}</h3>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityBadge()}`}>
                          {flow.priority}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mb-2">{getStatusText()}</p>
                      <p className="text-sm text-white/80 mb-2">{flow.route}</p>
                      {flow.lastRun && (
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>Last run: {flow.lastRun}</span>
                        </div>
                      )}
                      <div className="mt-3 flex justify-end gap-2">
                        {flow.status === 'no-tests' ? (
                          <button
                            onClick={() => navigate(`/app/flows/${flow.id}`)}
                            className="text-sm px-3 py-1.5 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
                          >
                            Generate Test
                          </button>
                        ) : (
                          <>
                            <button className="text-sm px-3 py-1.5 glass hover:bg-white/10 rounded-lg font-medium transition-colors">
                              Fix
                            </button>
                            <button className="text-sm px-3 py-1.5 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors">
                              Run Test
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Test Health Trends */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold">Test Health Trends (7 days)</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Pass Rate:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-success">94%</span>
                      <span className="text-xs text-success flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +2%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: '94%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Avg Time:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">8.2s</span>
                      <span className="text-xs text-success flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 rotate-180" />
                        -0.5s
                      </span>
                    </div>
                  </div>
                  <div className="h-6 flex items-end gap-1">
                    <div className="w-full bg-accent/40 rounded-sm" style={{ height: '20%' }} />
                    <div className="w-full bg-accent/50 rounded-sm" style={{ height: '35%' }} />
                    <div className="w-full bg-accent/60 rounded-sm" style={{ height: '50%' }} />
                    <div className="w-full bg-accent/70 rounded-sm" style={{ height: '50%' }} />
                    <div className="w-full bg-accent/60 rounded-sm" style={{ height: '35%' }} />
                    <div className="w-full bg-accent/50 rounded-sm" style={{ height: '35%' }} />
                    <div className="w-full bg-accent/40 rounded-sm" style={{ height: '20%' }} />
                    <div className="w-full bg-accent rounded-sm" style={{ height: '20%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Flakiness:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">3%</span>
                      <span className="text-xs text-white/60">→ stable</span>
                    </div>
                  </div>
                  <div className="h-6 flex items-end gap-1">
                    <div className="w-full bg-warning/40 rounded-sm" style={{ height: '35%' }} />
                    <div className="w-full bg-warning/30 rounded-sm" style={{ height: '20%' }} />
                    <div className="w-full bg-warning/30 rounded-sm" style={{ height: '20%' }} />
                    <div className="w-full bg-warning/30 rounded-sm" style={{ height: '20%' }} />
                    <div className="w-full bg-warning/30 rounded-sm" style={{ height: '20%' }} />
                    <div className="w-full bg-warning/40 rounded-sm" style={{ height: '35%' }} />
                    <div className="w-full bg-warning/30 rounded-sm" style={{ height: '20%' }} />
                    <div className="w-full bg-warning/30 rounded-sm" style={{ height: '20%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Coverage Breakdown */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Coverage Breakdown</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Critical:</span>
                    <span className="text-sm font-semibold">89% <span className="text-white/60">(17/19 flows)</span></span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-error rounded-full" style={{ width: '89%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">High:</span>
                    <span className="text-sm font-semibold">78% <span className="text-white/60">(14/18 flows)</span></span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-warning rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Medium:</span>
                    <span className="text-sm font-semibold">45% <span className="text-white/60">(9/20 flows)</span></span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Low:</span>
                    <span className="text-sm font-semibold">23% <span className="text-white/60">(5/22 flows)</span></span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: '23%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Activity</h2>
                <button
                  onClick={() => navigate('/app/flows')}
                  className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-sm font-medium">checkout.spec.ts passed (2.3s)</p>
                      <p className="text-xs text-white/60">2 min ago</p>
                    </div>
                  </div>
                  <button className="text-xs px-3 py-1.5 glass hover:bg-white/10 rounded-lg transition-colors">
                    View Test
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    <div>
                      <p className="text-sm font-medium">login.spec.ts flaky detected</p>
                      <p className="text-xs text-white/60">5 min ago</p>
                    </div>
                  </div>
                  <button className="text-xs px-3 py-1.5 glass hover:bg-white/10 rounded-lg transition-colors">
                    Screenshot
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Generated test for Profile</p>
                      <p className="text-xs text-white/60">12 min ago</p>
                    </div>
                  </div>
                  <button className="text-xs px-3 py-1.5 glass hover:bg-white/10 rounded-lg transition-colors">
                    View Code
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium">Re-ran failed tests (3/3 passed)</p>
                      <p className="text-xs text-white/60">15 min ago</p>
                    </div>
                  </div>
                  <button className="text-xs px-3 py-1.5 glass hover:bg-white/10 rounded-lg transition-colors">
                    Details
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Co-pilot Sidebar */}
          <div className="glass rounded-xl p-6 h-fit sticky top-0">
            <div className="flex items-center gap-2 mb-6">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">AI Co-pilot</h2>
            </div>

            {/* Smart Suggestions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white/80 mb-3">💡 Smart Suggestions</h3>
              <div className="space-y-3">
                <div className="glass rounded-lg p-3">
                  <p className="text-sm mb-2">Login flow missing error handling tests</p>
                  <button className="text-xs px-3 py-1.5 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors w-full">
                    Generate Now
                  </button>
                </div>

                <div className="glass rounded-lg p-3">
                  <p className="text-sm mb-2">Payment flow tested 3 months ago</p>
                  <button className="text-xs px-3 py-1.5 glass hover:bg-white/10 rounded-lg font-medium transition-colors w-full">
                    Re-validate
                  </button>
                </div>

                <div className="glass rounded-lg p-3">
                  <p className="text-sm mb-2">API /users/login response changed</p>
                  <button className="text-xs px-3 py-1.5 glass hover:bg-white/10 rounded-lg font-medium transition-colors w-full">
                    Update Tests
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white/80 mb-3">⚡ Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-sm px-4 py-2.5 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Run Discovery
                </button>
                <button className="w-full text-sm px-4 py-2.5 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate All
                </button>
                <button className="w-full text-sm px-4 py-2.5 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Analyze Impact
                </button>
                <button className="w-full text-sm px-4 py-2.5 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  View Reports
                </button>
              </div>
            </div>

            {/* Health Score */}
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3">📈 Health Score</h3>
              <div className="glass rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">87/100</span>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-success/20 text-success">Excellent</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-success to-primary rounded-full" style={{ width: '87%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        {fabOpen && (
          <div className="absolute bottom-16 right-0 glass rounded-xl p-2 shadow-2xl backdrop-blur-lg space-y-2 min-w-[200px] animate-scale-in">
            <button className="w-full text-sm px-4 py-3 hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-primary" />
              Generate Test
            </button>
            <button className="w-full text-sm px-4 py-3 hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-3">
              <Brain className="w-4 h-4 text-accent" />
              Run Discovery
            </button>
            <button className="w-full text-sm px-4 py-3 hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-3">
              <Plus className="w-4 h-4 text-success" />
              Create Flow
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 rounded-full bg-primary hover:bg-primary-hover shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          {fabOpen ? (
            <Plus className="w-6 h-6 rotate-45 transition-transform" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
}
