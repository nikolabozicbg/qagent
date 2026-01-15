import { useState, useEffect } from 'react';
import { Terminal, Trash2, CheckCircle, XCircle, FolderOpen } from 'lucide-react';
import { useApp } from '@contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@services/api';

export function DevOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const { onboardingCompleted, projectPath, setProjectPath, completeOnboarding } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+D (Mac) or Ctrl+Shift+D (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const handleSkipOnboarding = () => {
    // Set a mock project path and complete onboarding
    const mockPath = '/Users/nikolabozic/Projects/cypress-realworld-app';
    setProjectPath(mockPath);
    localStorage.setItem('qagent_project_path', mockPath);
    completeOnboarding();
    navigate('/app/dashboard');
    setIsOpen(false);
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('qagent_onboarding_completed');
    localStorage.removeItem('qagent_project_path');
    window.location.reload();
  };
  
  const handleFullReset = async () => {
    if (confirm('🚨 FULL RESET: This will clear ALL app data (projects, suites, settings). Continue?')) {
      try {
        // Reset backend database first
        console.log('🗑️ Resetting backend database...');
        await apiService.resetDatabase();
        console.log('✅ Backend database reset');
      } catch (error) {
        console.warn('⚠️ Failed to reset backend database:', error);
        // Continue with local reset even if backend fails
      }
      
      // Clear all localStorage
      localStorage.clear();
      
      // Clear IndexedDB if exists
      if (window.indexedDB) {
        indexedDB.databases().then(dbs => {
          dbs.forEach(db => {
            if (db.name) indexedDB.deleteDatabase(db.name);
          });
        }).catch(() => {
          // Fallback - some browsers don't support databases()
          console.warn('Could not enumerate IndexedDB databases');
        });
      }
      
      // Navigate to setup and reload
      navigate('/setup/welcome');
      setTimeout(() => window.location.reload(), 100);
    }
  };

  const handleResetProjectOnly = () => {
    localStorage.removeItem('qagent_project_path');
    window.location.reload();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={() => setIsOpen(false)}
      />

      {/* Overlay Panel */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[500px]">
        <div className="glass rounded-2xl border-2 border-primary/50 p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <Terminal className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Dev Tools</h2>
              <p className="text-xs text-white/60 mt-1">
                Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">⌘⇧D</kbd> to toggle
              </p>
            </div>
          </div>

          {/* Current State */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-sm font-semibold mb-3 text-white/80">Current State</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Onboarding:</span>
                <span className="flex items-center gap-2">
                  {onboardingCompleted ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-success">Completed</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-error" />
                      <span className="text-error">Not completed</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Project Path:</span>
                <span className="flex items-center gap-2">
                  {projectPath ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-success text-xs font-mono max-w-[250px] truncate">
                        {projectPath}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-error" />
                      <span className="text-error">Not set</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleSkipOnboarding}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center justify-between"
            >
              <span>Skip Onboarding (Mock Project)</span>
              <FolderOpen className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetProjectOnly}
              className="w-full px-4 py-3 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center justify-between"
            >
              <span>Reset Project Path Only</span>
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetOnboarding}
              className="w-full px-4 py-3 bg-warning/20 hover:bg-warning/30 rounded-lg font-medium transition-colors flex items-center justify-between border border-warning/30"
            >
              <span>Reset Onboarding Only</span>
              <Trash2 className="w-4 h-4 text-warning" />
            </button>
            
            <button
              onClick={handleFullReset}
              className="w-full px-4 py-3 bg-error/20 hover:bg-error/30 rounded-lg font-medium transition-colors flex items-center justify-between border border-error/30"
            >
              <span>🚨 FULL RESET (All Data)</span>
              <Trash2 className="w-4 h-4 text-error" />
            </button>
          </div>

          {/* Close hint */}
          <div className="mt-4 text-center">
            <p className="text-xs text-white/40">
              Click outside or press <kbd className="px-1 py-0.5 bg-white/10 rounded text-xs">ESC</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
