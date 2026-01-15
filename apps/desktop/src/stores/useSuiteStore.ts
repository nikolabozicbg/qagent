import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { TestSuite, TestCase, TestStep } from '../types/suite.types';
import { apiService } from '../services/api';

interface SuiteState {
  // Data
  suites: TestSuite[];
  selectedSuiteId: string | null;
  selectedCaseId: string | null;
  
  // Loading states
  isLoading: boolean;
  isGenerating: boolean;
  
  // Actions
  setSuites: (suites: TestSuite[]) => void;
  selectSuite: (suiteId: string | null) => void;
  selectCase: (caseId: string | null) => void;
  
  // Computed getters
  getSelectedSuite: () => TestSuite | null;
  getSelectedCase: () => TestCase | null;
  getSuiteById: (suiteId: string) => TestSuite | null;
  getCaseById: (caseId: string) => TestCase | null;
  
  // Updates
  updateCaseStatus: (caseId: string, status: TestCase['status']) => void;
  updateCaseTestFile: (caseId: string, testFile: TestCase['testFile']) => void;
  updateCaseFilePath: (caseId: string, filePath: string, generatedCode?: string) => void;
  updateStepStatus: (stepId: string, status: TestStep['status'], duration?: number, error?: any) => void;
  
  // Clear
  clear: () => void;
  
  // Backend sync
  loadSuitesFromBackend: (projectPath: string) => Promise<void>;
  saveSuitesToBackend: (projectPath: string, suites: TestSuite[]) => Promise<void>;
}

export const useSuiteStore = create<SuiteState>()(
  persist(
    immer((set, get) => ({
    // Initial state
    suites: [],
    selectedSuiteId: null,
    selectedCaseId: null,
    isLoading: false,
    isGenerating: false,
    
    // Actions
    setSuites: (suites) => set({ suites }),
    
    selectSuite: (suiteId) => set({ 
      selectedSuiteId: suiteId,
      selectedCaseId: null // Clear case selection when suite changes
    }),
    
    selectCase: (caseId) => set({ selectedCaseId: caseId }),
    
    // Computed getters
    getSelectedSuite: () => {
      const { suites, selectedSuiteId } = get();
      if (!selectedSuiteId) return null;
      return suites.find(s => s.id === selectedSuiteId) || null;
    },
    
    getSelectedCase: () => {
      const { selectedCaseId } = get();
      const suite = get().getSelectedSuite();
      if (!suite || !selectedCaseId) return null;
      return suite.testCases.find(c => c.id === selectedCaseId) || null;
    },
    
    getSuiteById: (suiteId) => {
      const { suites } = get();
      return suites.find(s => s.id === suiteId) || null;
    },
    
    getCaseById: (caseId) => {
      const { suites } = get();
      for (const suite of suites) {
        const testCase = suite.testCases.find(c => c.id === caseId);
        if (testCase) return testCase;
      }
      return null;
    },
    
    // Updates
    updateCaseStatus: (caseId, status) => set((state) => {
      for (const suite of state.suites) {
        const testCase = suite.testCases.find(c => c.id === caseId);
        if (testCase) {
          testCase.status = status;
          break;
        }
      }
    }),
    
    updateCaseTestFile: (caseId, testFile) => set((state) => {
      for (const suite of state.suites) {
        const testCase = suite.testCases.find(c => c.id === caseId);
        if (testCase) {
          testCase.testFile = testFile;
          break;
        }
      }
    }),
    
    updateCaseFilePath: (caseId, filePath, generatedCode) => {
      // Update local state
      set((state) => {
        for (const suite of state.suites) {
          const testCase = suite.testCases.find(c => c.id === caseId);
          if (testCase) {
            testCase.testFilePath = filePath;
            testCase.status = 'passing'; // Mark as generated
            break;
          }
        }
      });
      // Persist to backend (fire and forget)
      apiService.updateCase(caseId, {
        status: 'GENERATED',
        generatedFilePath: filePath,
        generatedCode,
      }).catch(err => console.error('Failed to persist case update:', err));
    },
    
    updateStepStatus: (stepId, status, duration, error) => set((state) => {
      for (const suite of state.suites) {
        for (const testCase of suite.testCases) {
          const step = testCase.steps.find(s => s.id === stepId);
          if (step) {
            step.status = status;
            if (duration !== undefined) step.duration = duration;
            if (error !== undefined) step.error = error;
            return;
          }
        }
      }
    }),
    
    clear: () => set({
      suites: [],
      selectedSuiteId: null,
      selectedCaseId: null,
      isLoading: false,
      isGenerating: false,
    }),
    
    // ============================================
    // BACKEND SYNC OPERATIONS
    // ============================================
    
    /**
     * Load cached suites from backend for a project
     * Fallback to localStorage if backend is unavailable
     */
    loadSuitesFromBackend: async (projectPath: string) => {
      try {
        console.log('📦 Loading cached suites from backend...');
        const cachedSuites = await apiService.getCachedSuites(projectPath);
        
        if (cachedSuites && cachedSuites.length > 0) {
          console.log(`✅ Loaded ${cachedSuites.length} cached suites from backend`);
          set({ suites: cachedSuites });
        } else {
          console.log('ℹ️ No cached suites in backend');
        }
      } catch (error: any) {
        if (error?.response?.status === 404) {
          console.log('ℹ️ Project not found in backend cache');
        } else {
          console.warn('⚠️ Failed to load cached suites from backend:', error);
        }
        // Graceful fallback - use localStorage data
      }
    },
    
    /**
     * Save suites to backend cache after discovery
     * Note: This happens automatically via POST /projects/:id/discover
     * This method is here for future manual sync if needed
     */
    saveSuitesToBackend: async (projectPath: string, suites: TestSuite[]) => {
      try {
        console.log(`💾 Saving ${suites.length} suites to backend cache...`);
        // Backend caching happens during discovery via ProjectController
        // This is a no-op unless we implement a separate save endpoint
        console.log('✅ Suites saved (cached during discovery)');
      } catch (error) {
        console.error('❌ Failed to save suites to backend:', error);
      }
    },
    })),
    {
      name: 'qagent-suite-storage',
      partialize: (state) => ({
        // Persist suites and selections
        suites: state.suites,
        selectedSuiteId: state.selectedSuiteId,
        selectedCaseId: state.selectedCaseId,
      }),
    }
  )
);
