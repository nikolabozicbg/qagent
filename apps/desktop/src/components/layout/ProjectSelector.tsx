import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FolderOpen, Plus, Clock, Settings, Search } from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import { useSuiteStore } from '../../stores/useSuiteStore';
import { useNavigate } from 'react-router-dom';

interface ProjectSelectorProps {
  onNewProject?: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ onNewProject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { currentProject, recentProjects, setCurrentProject } = useProjectStore();
  const { suites } = useSuiteStore();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const filteredProjects = recentProjects.filter(project =>
    project && project.projectName && project.projectPath &&
    (project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.projectPath.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleProjectSelect = (project: typeof currentProject) => {
    if (project) {
      setCurrentProject(project);
      setIsOpen(false);
      setSearchQuery('');
      navigate('/app/dashboard');
    }
  };

  const handleNewProject = () => {
    setIsOpen(false);
    if (onNewProject) {
      onNewProject();
    } else {
      navigate('/setup/welcome');
    }
  };

  const handleOpenProject = async () => {
    setIsOpen(false);
    const path = await window.electronAPI.selectFolder();
    if (path) {
      // Create minimal project config
      const newProject = {
        projectPath: path,
        projectName: path.split('/').pop() || 'Unnamed Project',
        framework: 'playwright' as const,
        baseUrl: 'http://localhost:3000',
        testDir: 'tests',
      };
      setCurrentProject(newProject);
      navigate('/app/dashboard');
    }
  };

  // Get suite stats for a project (simplified)
  const getSuiteStats = () => {
    const totalCases = suites.reduce((sum, suite) => sum + suite.testCases.length, 0);
    return {
      suiteCount: suites.length,
      caseCount: totalCases,
    };
  };

  const stats = getSuiteStats();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 
                   border border-white/10 transition-all duration-200"
      >
        <FolderOpen className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white/90">
          {currentProject?.projectName || 'No Project Selected'}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-[380px] bg-black/90 backdrop-blur-xl 
                     border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg
                         text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
                autoFocus
              />
            </div>
          </div>

          {/* Project List */}
          <div className="max-h-[400px] overflow-y-auto">
            {/* Current Project */}
            {currentProject && (
              <>
                <div
                  className="px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-l-2 border-primary"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-medium text-white">{currentProject.projectName}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-white/40 mt-1 truncate">{currentProject.projectPath}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                        <span>{stats.suiteCount} suites</span>
                        <span>•</span>
                        <span>{stats.caseCount} cases</span>
                      </div>
                    </div>
                  </div>
                </div>
                {recentProjects.length > 0 && (
                  <div className="border-t border-white/10" />
                )}
              </>
            )}

            {/* Recent Projects */}
            {filteredProjects.map((project) => {
              // Skip current project (already shown above)
              if (currentProject && project.projectPath === currentProject.projectPath) {
                return null;
              }

              return (
                <div
                  key={project.projectPath}
                  onClick={() => handleProjectSelect(project)}
                  className="px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-l-2 border-transparent hover:border-white/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                        <span className="text-sm font-medium text-white/90">{project.projectName}</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1 truncate">{project.projectPath}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {filteredProjects.length === 0 && !currentProject && (
              <div className="px-4 py-8 text-center text-white/40 text-sm">
                {searchQuery ? 'No projects found' : 'No recent projects'}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-white/10 p-2">
            <button
              onClick={handleNewProject}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm text-white/90">New Project...</span>
            </button>
            
            <button
              onClick={handleOpenProject}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <FolderOpen className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/90">Open Existing Project...</span>
            </button>

            {currentProject && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/app/settings');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <Settings className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/90">Project Settings</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
