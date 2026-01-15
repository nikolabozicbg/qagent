import { useState } from 'react';
import { FolderOpen, Plus, MoreVertical, Settings, Trash2, Edit3, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@stores/useProjectStore';
import type { ProjectConfig } from '@/types/suite.types';

export const ProjectSidebar = () => {
  const navigate = useNavigate();
  const { currentProject, recentProjects, setCurrentProject, removeRecentProject } = useProjectStore();
  const [contextMenu, setContextMenu] = useState<{ projectPath: string; x: number; y: number } | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleProjectSelect = (project: ProjectConfig) => {
    setCurrentProject(project);
    navigate('/app/dashboard');
  };

  const handleCreateNew = () => {
    navigate('/setup/welcome');
  };

  const handleContextMenu = (e: React.MouseEvent, projectPath: string) => {
    e.preventDefault();
    setContextMenu({ projectPath, x: e.clientX, y: e.clientY });
  };

  const handleRename = (project: ProjectConfig) => {
    setEditingProject(project.projectPath);
    setEditName(project.projectName);
    setContextMenu(null);
  };

  const handleSaveRename = (project: ProjectConfig) => {
    // Update project name
    const updated = { ...project, projectName: editName };
    setCurrentProject(updated);
    setEditingProject(null);
  };

  const handleDelete = (projectPath: string) => {
    if (confirm('Are you sure you want to remove this project from the list?')) {
      removeRecentProject(projectPath);
      if (currentProject?.projectPath === projectPath) {
        setCurrentProject(recentProjects[0] || null);
      }
    }
    setContextMenu(null);
  };

  // Close context menu on click outside
  useState(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  });

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Projects
        </h2>
        <button
          onClick={handleCreateNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-dark font-medium transition-colors"
        >
          <Plus size={18} />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {recentProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <FolderOpen className="w-12 h-12 text-text-tertiary mb-3 opacity-50" />
            <p className="text-sm text-text-secondary">No projects yet</p>
            <p className="text-xs text-text-tertiary mt-1">
              Create a new project to get started
            </p>
          </div>
        )}

        {recentProjects.map((project) => {
          const isActive = currentProject?.projectPath === project.projectPath;
          const isEditing = editingProject === project.projectPath;

          return (
            <div
              key={project.projectPath}
              className={`group relative mb-1 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-surface-hover border border-transparent'
              }`}
            >
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                onClick={() => !isEditing && handleProjectSelect(project)}
                onContextMenu={(e) => handleContextMenu(e, project.projectPath)}
              >
                <FolderOpen
                  size={18}
                  className={`flex-shrink-0 ${isActive ? 'text-primary' : 'text-text-tertiary'}`}
                />
                
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(project);
                        if (e.key === 'Escape') setEditingProject(null);
                      }}
                      className="flex-1 bg-dark border border-primary/50 rounded px-2 py-1 text-sm focus:outline-none"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveRename(project);
                      }}
                      className="p-1 hover:bg-success/20 rounded text-success"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive ? 'text-primary' : 'text-text-primary'
                      }`}
                    >
                      {project.projectName}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {project.framework}
                    </p>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, project.projectPath);
                  }}
                  className={`p-1 rounded hover:bg-white/10 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <MoreVertical size={14} className="text-text-secondary" />
                </button>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 glass border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const project = recentProjects.find(p => p.projectPath === contextMenu.projectPath);
              if (project) handleRename(project);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
          >
            <Edit3 size={14} />
            <span>Rename</span>
          </button>
          <button
            onClick={() => {
              const project = recentProjects.find(p => p.projectPath === contextMenu.projectPath);
              if (project) {
                setCurrentProject(project);
                navigate('/app/settings');
                setContextMenu(null);
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
          <div className="h-px bg-border my-1" />
          <button
            onClick={() => handleDelete(contextMenu.projectPath)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 size={14} />
            <span>Remove</span>
          </button>
        </div>
      )}
    </aside>
  );
};
