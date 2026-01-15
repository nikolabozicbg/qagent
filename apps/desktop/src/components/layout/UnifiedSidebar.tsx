import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Plus, MoreVertical, Settings, Trash2, Edit3, Check, X
} from 'lucide-react';
import { useProjectStore } from '@stores/useProjectStore';
import { wsService } from '@services/websocket';
import type { ProjectConfig } from '@/types/suite.types';


export const UnifiedSidebar = () => {
  const navigate = useNavigate();
  const { currentProject, recentProjects, setCurrentProject, removeRecentProject, toggleSidebar } = useProjectStore();
  const [contextMenu, setContextMenu] = useState<{ projectPath: string; x: number; y: number } | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket connection status
  useState(() => {
    setIsConnected(wsService.isConnected());
    const interval = setInterval(() => {
      setIsConnected(wsService.isConnected());
    }, 5000);
    return () => clearInterval(interval);
  });

  const handleProjectSelect = (project: ProjectConfig) => {
    setCurrentProject(project);
    navigate('/app/dashboard');
  };

  const handleCreateNew = () => {
    navigate('/setup/welcome');
  };

  const handleContextMenu = (e: React.MouseEvent, projectPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ projectPath, x: e.clientX, y: e.clientY });
  };

  const handleRename = (project: ProjectConfig) => {
    setEditingProject(project.projectPath);
    setEditName(project.projectName);
    setContextMenu(null);
  };

  const handleSaveRename = (project: ProjectConfig) => {
    const updated = { ...project, projectName: editName };
    setCurrentProject(updated);
    setEditingProject(null);
  };

  const handleDelete = (projectPath: string) => {
    if (confirm('Remove this project from the list?')) {
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
    <aside className="w-64 bg-surface border-r border-border flex flex-col transition-all duration-200">
      {/* Projects Section */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Projects
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateNew}
              className="p-1 rounded hover:bg-primary/20 text-primary transition-colors"
              title="New Project"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={toggleSidebar}
              className="p-1 rounded hover:bg-surface-hover text-text-secondary transition-colors"
              title="Hide Sidebar (Cmd+B)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
            {recentProjects.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <FolderOpen className="w-10 h-10 text-text-tertiary mx-auto mb-2 opacity-50" />
                <p className="text-xs text-text-secondary mb-2">No projects yet</p>
                <button
                  onClick={handleCreateNew}
                  className="text-xs text-primary hover:underline"
                >
                  Create your first project
                </button>
              </div>
            ) : (
              recentProjects.map((project) => {
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
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                      onClick={() => !isEditing && handleProjectSelect(project)}
                      onContextMenu={(e) => handleContextMenu(e, project.projectPath)}
                    >
                      <FolderOpen
                        size={16}
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
                            className="flex-1 bg-dark border border-primary/50 rounded px-2 py-1 text-xs focus:outline-none"
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
                            <Check size={12} />
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
                        <MoreVertical size={12} className="text-text-secondary" />
                      </button>
                    </div>

                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
                    )}
                  </div>
                );
              })
            )}
        </div>
      </div>

      {/* Status Footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-success' : 'bg-error'
            }`}
          />
          <span className="text-text-secondary">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="ml-auto text-text-tertiary font-mono">:3001</span>
        </div>
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
              const project = recentProjects.find((p) => p.projectPath === contextMenu.projectPath);
              if (project) handleRename(project);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
          >
            <Edit3 size={14} />
            <span>Rename</span>
          </button>
          <button
            onClick={() => {
              const project = recentProjects.find((p) => p.projectPath === contextMenu.projectPath);
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
