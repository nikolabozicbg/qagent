import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectConfig } from '../types/suite.types';
import { apiService } from '../services/api';

interface ProjectState {
  // Current project
  currentProject: ProjectConfig | null;
  
  // Recent projects
  recentProjects: ProjectConfig[];
  
  // UI state
  sidebarVisible: boolean;
  
  // Actions
  setCurrentProject: (project: ProjectConfig) => void;
  addRecentProject: (project: ProjectConfig) => void;
  clearCurrentProject: () => void;
  removeRecentProject: (projectPath: string) => void;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  clearAll: () => void;
  
  // Backend sync
  syncWithBackend: () => Promise<void>;
  createProjectInBackend: (project: ProjectConfig) => Promise<void>;
  deleteProjectFromBackend: (projectPath: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      // Initial state
      currentProject: null,
      recentProjects: [],
      sidebarVisible: false, // Hidden by default for max space
      
      // Actions
      setCurrentProject: (project) => set({ currentProject: project }),
      
      addRecentProject: (project) => set((state) => {
        // Remove if already exists
        const filtered = state.recentProjects.filter(
          p => p.projectPath !== project.projectPath
        );
        
        // Add to front, limit to 5 recent projects
        return {
          recentProjects: [project, ...filtered].slice(0, 5)
        };
      }),
      
      clearCurrentProject: () => set({ currentProject: null }),
      
      removeRecentProject: (projectPath) => set((state) => ({
        recentProjects: state.recentProjects.filter(
          p => p.projectPath !== projectPath
        )
      })),
      
      toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
      
      setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
      
      clearAll: () => set({
        currentProject: null,
        recentProjects: [],
      }),
      
      // ============================================
      // BACKEND SYNC OPERATIONS
      // ============================================
      
      /**
       * Sync projects from backend database
       * Called on app startup to restore projects from backend
       */
      syncWithBackend: async () => {
        try {
          console.log('🔄 Syncing projects with backend...');
          
          // Get all projects from database
          const backendProjects = await apiService.getAllProjects();
          
          if (backendProjects.length > 0) {
            console.log(`✅ Found ${backendProjects.length} projects in database`);
            
            // Set recent projects from backend
            set({ recentProjects: backendProjects.slice(0, 5) });
            
            // Try to get the active project
            try {
              const activeProject = await apiService.getActiveProject();
              if (activeProject) {
                console.log('✅ Found active project:', activeProject.projectName);
                set({ currentProject: activeProject });
              } else if (backendProjects.length > 0) {
                // No active project set, use the most recent one
                console.log('ℹ️ No active project, using most recent:', backendProjects[0].projectName);
                set({ currentProject: backendProjects[0] });
                // Activate it in backend (ignore errors)
                try {
                  await apiService.activateProject(backendProjects[0].projectPath);
                } catch (e) {
                  console.warn('⚠️ Could not activate project:', e);
                }
              }
            } catch (activeError) {
              console.warn('⚠️ Could not get active project:', activeError);
            }
          } else {
            // No projects in backend - clear local state to match
            console.log('🚨 No projects in database - clearing local state');
            set({ currentProject: null, recentProjects: [] });
          }
        } catch (error) {
          console.warn('⚠️ Failed to sync with backend:', error);
          // Graceful fallback - use localStorage data
        }
      },
      
      /**
       * Create project in backend cache
       * Called after completing setup wizard
       */
      createProjectInBackend: async (project: ProjectConfig) => {
        try {
          console.log('➕ Creating project in backend:', project.projectName);
          await apiService.createProject(project);
          console.log('✅ Project created in backend');
        } catch (error) {
          console.error('❌ Failed to create project in backend:', error);
          throw error;
        }
      },
      
      /**
       * Delete project from backend cache
       * Called when user removes a project
       */
      deleteProjectFromBackend: async (projectPath: string) => {
        try {
          console.log('🗑️ Deleting project from backend:', projectPath);
          await apiService.deleteProject(projectPath);
          console.log('✅ Project deleted from backend');
        } catch (error) {
          console.error('❌ Failed to delete project from backend:', error);
          throw error;
        }
      },
    }),
    {
      name: 'qagent-project-storage',
      partialize: (state) => ({
        // Only persist these fields
        currentProject: state.currentProject,
        recentProjects: state.recentProjects,
        sidebarVisible: state.sidebarVisible,
      }),
    }
  )
);
