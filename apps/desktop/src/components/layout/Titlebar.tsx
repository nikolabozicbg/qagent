import { useState, useEffect } from 'react';
import { FolderOpen, ChevronDown } from 'lucide-react';
import { useApp } from '@contexts/AppContext';

export const Titlebar = () => {
  const [appVersion, setAppVersion] = useState<string>('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const { projectPath, setProjectPath } = useApp();

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, []);

  const getProjectName = (path: string | null) => {
    if (!path) return 'No Project';
    const parts = path.split('/');
    return parts[parts.length - 1] || 'Project';
  };

  const handleSelectProject = async () => {
    if (window.electronAPI?.selectFolder) {
      const result = await window.electronAPI.selectFolder();
      if (result && !result.canceled && result.filePaths[0]) {
        setProjectPath(result.filePaths[0]);
        setShowProjectDropdown(false);
      }
    }
  };

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <div className="h-titlebar bg-surface border-b border-border flex items-center justify-between px-4 titlebar-drag">
      {/* Left: Logo and title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
            <span className="text-xs font-bold text-white">Q</span>
          </div>
          <span className="text-sm font-medium text-text-primary">QAgent</span>
          {appVersion && (
            <span className="text-xs text-text-tertiary font-mono">v{appVersion}</span>
          )}
        </div>

        {/* Project Selector */}
        <div className="relative titlebar-no-drag">
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-hover rounded-lg hover:bg-surface-active transition-colors group"
          >
            <FolderOpen className="w-3.5 h-3.5 text-text-tertiary group-hover:text-text-secondary" />
            <span className="text-xs font-medium text-text-secondary max-w-[180px] truncate">
              {getProjectName(projectPath)}
            </span>
            <ChevronDown className="w-3 h-3 text-text-tertiary" />
          </button>

          {/* Dropdown */}
          {showProjectDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProjectDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="p-2">
                  {/* Current Project Info */}
                  {projectPath ? (
                    <div className="px-3 py-2 mb-2 bg-surface-hover rounded">
                      <div className="text-xs font-medium text-text-secondary mb-1">
                        Current Project
                      </div>
                      <div className="text-xs text-text-tertiary font-mono truncate">
                        {projectPath}
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-2 mb-2 bg-warning/10 border border-warning/20 rounded">
                      <div className="text-xs text-warning">
                        No project selected
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <button
                    onClick={handleSelectProject}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover rounded transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm text-text-primary">
                      {projectPath ? 'Change Project' : 'Select Project'}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Window controls (only show on non-macOS) */}
      {window.electronAPI?.platform !== 'darwin' && (
        <div className="flex items-center gap-1 titlebar-no-drag">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center hover:bg-surface-hover rounded transition-colors text-text-tertiary hover:text-text-primary"
            aria-label="Minimize"
          >
            <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
              <rect width="10" height="2" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="w-7 h-7 flex items-center justify-center hover:bg-surface-hover rounded transition-colors text-text-tertiary hover:text-text-primary"
            aria-label="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="1" y="1" width="8" height="8" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center hover:bg-error rounded transition-colors text-text-tertiary hover:text-white"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1L9 9M9 1L1 9" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
