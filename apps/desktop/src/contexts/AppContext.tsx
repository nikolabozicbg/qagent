import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '@services/api';
import { useProjectStore } from '@stores/useProjectStore';
import { useSuiteStore } from '@stores/useSuiteStore';

export interface Flow {
  id: string;
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'no-tests' | 'passing' | 'partial' | 'failing';
  route: string;
  components: number;
  apis: number;
  enriched: boolean;
  lastRun?: string;
  passing?: number;
  total?: number;
  testFile?: string | boolean; // Path to test file (e.g., "tests/e2e/user-login.spec.ts") or boolean
  confidence?: number;
}

export interface DashboardMetrics {
  totalFlows: number;
  testsGenerated: number;
  testsPassing: number;
  coverage: number;
  passRate: number;
  avgTime: number;
  flakiness: number;
  healthScore: number;
}

export interface RecentActivity {
  id: string;
  type: 'test-passed' | 'test-failed' | 'test-generated' | 'test-rerun' | 'flaky-detected';
  message: string;
  timestamp: string;
  testFile?: string;
}

interface AppContextType {
  flows: Flow[];
  dashboardMetrics: DashboardMetrics;
  recentActivity: RecentActivity[];
  isLoading: boolean;
  isInitializing: boolean; // True while syncing with backend on startup
  error: string | null;
  aiCopilotVisible: boolean;
  selectedProjectPath: string | null;
  onboardingCompleted: boolean;
  projectPath: string | null;
  
  // Actions
  setFlows: (flows: Flow[]) => void;
  addFlow: (flow: Flow) => void;
  updateFlow: (id: string, updates: Partial<Flow>) => void;
  deleteFlow: (id: string) => void;
  setDashboardMetrics: (metrics: DashboardMetrics) => void;
  addActivity: (activity: RecentActivity) => void;
  toggleAICopilot: () => void;
  setSelectedProjectPath: (path: string) => void;
  setProjectPath: (path: string) => void;
  completeOnboarding: () => void;
  refreshData: () => Promise<void>;
  refreshFlows: () => Promise<void>;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const mockFlows: Flow[] = [
  {
    id: '1',
    name: 'User Login',
    priority: 'CRITICAL',
    status: 'no-tests',
    route: '/signin → /dashboard',
    components: 2,
    apis: 1,
    enriched: true,
    confidence: 94,
  },
  {
    id: '2',
    name: 'Create Transaction',
    priority: 'HIGH',
    status: 'passing',
    route: '/transaction/new → /transactions/:id',
    components: 3,
    apis: 2,
    enriched: true,
    lastRun: '5m ago',
    passing: 12,
    total: 12,
    testFile: true,
    confidence: 87,
  },
  {
    id: '3',
    name: 'Bank Account Management',
    priority: 'HIGH',
    status: 'partial',
    route: '/bankaccounts → /bankaccounts/:id',
    components: 4,
    apis: 3,
    enriched: true,
    lastRun: '12m ago',
    passing: 8,
    total: 10,
    testFile: true,
    confidence: 84,
  },
  {
    id: '4',
    name: 'User Registration',
    priority: 'CRITICAL',
    status: 'no-tests',
    route: '/signup → /dashboard',
    components: 2,
    apis: 1,
    enriched: true,
    confidence: 91,
  },
  {
    id: '5',
    name: 'Payment Processing',
    priority: 'MEDIUM',
    status: 'failing',
    route: '/checkout → /success',
    components: 5,
    apis: 3,
    enriched: false,
    lastRun: '8m ago',
    passing: 4,
    total: 6,
    testFile: true,
  },
  {
    id: '6',
    name: 'Profile Settings',
    priority: 'LOW',
    status: 'passing',
    route: '/settings → /settings/profile',
    components: 3,
    apis: 2,
    enriched: true,
    lastRun: '15m ago',
    passing: 8,
    total: 8,
    testFile: true,
  },
];

const mockMetrics: DashboardMetrics = {
  totalFlows: 24,
  testsGenerated: 92,
  testsPassing: 87,
  coverage: 73,
  passRate: 94,
  avgTime: 8.2,
  flakiness: 3,
  healthScore: 87,
};

const mockActivity: RecentActivity[] = [
  {
    id: '1',
    type: 'test-passed',
    message: 'checkout.spec.ts passed (2.3s)',
    timestamp: '2 min ago',
    testFile: 'checkout.spec.ts',
  },
  {
    id: '2',
    type: 'flaky-detected',
    message: 'login.spec.ts flaky detected',
    timestamp: '5 min ago',
    testFile: 'login.spec.ts',
  },
  {
    id: '3',
    type: 'test-generated',
    message: 'Generated test for Profile',
    timestamp: '12 min ago',
  },
  {
    id: '4',
    type: 'test-rerun',
    message: 'Re-ran failed tests (3/3 passed)',
    timestamp: '15 min ago',
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [flows, setFlows] = useState<Flow[]>(mockFlows);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>(mockMetrics);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>(mockActivity);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Start as true
  const [error, setError] = useState<string | null>(null);
  const [aiCopilotVisible, setAiCopilotVisible] = useState(true);
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('qagent_project_path');
    console.log('💾 Loaded selectedProjectPath from localStorage:', saved);
    return saved;
  });
  const [projectPath, setProjectPath] = useState<string | null>(() => {
    const saved = localStorage.getItem('qagent_project_path');
    return saved;
  });
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    const completed = localStorage.getItem('qagent_onboarding_completed') === 'true';
    console.log('🎯 Onboarding status on init:', completed);
    return completed;
  });

  const completeOnboarding = () => {
    localStorage.setItem('qagent_onboarding_completed', 'true');
    setOnboardingCompleted(true);
  };

  // Sync projectPath with selectedProjectPath and persist to localStorage
  useEffect(() => {
    if (projectPath && projectPath !== selectedProjectPath) {
      console.log('🔄 Setting selectedProjectPath to:', projectPath);
      setSelectedProjectPath(projectPath);
      localStorage.setItem('qagent_project_path', projectPath);
    }
  }, [projectPath]);
  
  // Persist selectedProjectPath when it changes directly
  useEffect(() => {
    if (selectedProjectPath) {
      localStorage.setItem('qagent_project_path', selectedProjectPath);
      console.log('💾 Persisted selectedProjectPath to localStorage:', selectedProjectPath);
    }
  }, [selectedProjectPath]);

  const addFlow = (flow: Flow) => {
    setFlows(prev => [...prev, flow]);
  };

  const updateFlow = (id: string, updates: Partial<Flow>) => {
    console.log('🔧 AppContext.updateFlow called:', { id, updates });
    setFlows(prev => {
      const updated = prev.map(flow => {
        if (flow.id === id) {
          const newFlow = { ...flow, ...updates };
          console.log('✅ Flow updated:', { old: flow, new: newFlow });
          return newFlow;
        }
        return flow;
      });
      console.log('📊 Updated flows array length:', updated.length);
      return updated;
    });
  };

  const deleteFlow = (id: string) => {
    setFlows(prev => prev.filter(flow => flow.id !== id));
  };

  const addActivity = (activity: RecentActivity) => {
    setRecentActivity(prev => [activity, ...prev].slice(0, 10));
  };

  const toggleAICopilot = () => {
    setAiCopilotVisible(prev => !prev);
  };

  const refreshData = async () => {
    if (!selectedProjectPath) {
      console.warn('No project path selected');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log('🔄 Refreshing data for project:', selectedProjectPath);
      
      // Fetch flows and metrics in parallel
      const [flowsData, metricsData, activityData] = await Promise.all([
        apiService.getFlows(selectedProjectPath),
        apiService.getDashboardMetrics(selectedProjectPath),
        apiService.getRecentActivity(selectedProjectPath, 10),
      ]);

      console.log('✅ Received flows from BE:', flowsData);
      console.log('✅ Received metrics from BE:', metricsData);
      console.log('✅ Received activity from BE:', activityData);

      // Transform BE flows to frontend format
      // Backend returns { flows: [...], total: N } but we need just the array
      const transformedFlows = Array.isArray(flowsData) 
        ? flowsData 
        : (flowsData?.flows && Array.isArray(flowsData.flows) ? flowsData.flows : []);
      
      console.log('✅ Transformed flows:', transformedFlows.length, 'flows');
      
      setFlows(transformedFlows);
      setDashboardMetrics(metricsData);
      setRecentActivity(activityData);
    } catch (error: any) {
      console.error('Failed to refresh data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch data';
      setError(errorMessage);
      
      // Fall back to mock data if API fails
      if (flows.length === 0) {
        setFlows(mockFlows);
        setDashboardMetrics(mockMetrics);
        setRecentActivity(mockActivity);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFlows = async () => {
    if (!selectedProjectPath) return;
    
    try {
      const flowsData = await apiService.getFlows(selectedProjectPath);
      const transformedFlows = Array.isArray(flowsData) 
        ? flowsData 
        : (flowsData?.flows && Array.isArray(flowsData.flows) ? flowsData.flows : []);
      
      setFlows(transformedFlows);
    } catch (error) {
      console.error('Failed to refresh flows:', error);
    }
  };
  
  const clearError = () => {
    setError(null);
  };

  // Sync with backend on app startup
  useEffect(() => {
    const syncOnStartup = async () => {
      setIsInitializing(true);
      try {
        console.log('🚀 App startup: Syncing with backend...');
        
        // Sync projects from backend
        await useProjectStore.getState().syncWithBackend();
        
        // Check if we have projects in backend - if so, onboarding is complete
        const currentProject = useProjectStore.getState().currentProject;
        const recentProjects = useProjectStore.getState().recentProjects;
        
        if (currentProject || recentProjects.length > 0) {
          console.log('✅ Found projects in database - marking onboarding as complete');
          // Set onboarding as complete since we have projects
          if (!onboardingCompleted) {
            localStorage.setItem('qagent_onboarding_completed', 'true');
            setOnboardingCompleted(true);
          }
          
          // Set selectedProjectPath from current project
          if (currentProject?.projectPath && !selectedProjectPath) {
            setSelectedProjectPath(currentProject.projectPath);
            setProjectPath(currentProject.projectPath);
            localStorage.setItem('qagent_project_path', currentProject.projectPath);
          }
          
          // Load cached suites
          if (currentProject?.projectPath) {
            console.log('📦 Loading cached suites for:', currentProject.projectName);
            await useSuiteStore.getState().loadSuitesFromBackend(currentProject.projectPath);
          }
        } else {
          // No projects in database - reset to onboarding state
          console.log('🚨 No projects in database - resetting to onboarding');
          
          // Clear localStorage
          localStorage.removeItem('qagent_onboarding_completed');
          localStorage.removeItem('qagent_project_path');
          localStorage.removeItem('qagent-suite-storage');
          localStorage.removeItem('qagent-project-storage');
          
          // Clear stores
          useSuiteStore.getState().clear();
          useProjectStore.getState().clearAll();
          
          // Reset state
          setOnboardingCompleted(false);
          setSelectedProjectPath(null);
          setProjectPath('');
        }
        
        console.log('✅ Backend sync complete');
      } catch (error) {
        console.warn('⚠️ Failed to sync with backend on startup:', error);
        // Graceful fallback - app continues with localStorage data
      } finally {
        setIsInitializing(false);
      }
    };
    
    syncOnStartup();
  }, []); // Run once on mount
  
  // Auto-refresh data when project path changes
  useEffect(() => {
    if (selectedProjectPath) {
      refreshData();
    }
  }, [selectedProjectPath]);

  const value: AppContextType = {
    flows,
    dashboardMetrics,
    recentActivity,
    isLoading,
    isInitializing,
    error,
    aiCopilotVisible,
    selectedProjectPath,
    projectPath,
    onboardingCompleted,
    setFlows,
    addFlow,
    updateFlow,
    deleteFlow,
    setDashboardMetrics,
    addActivity,
    toggleAICopilot,
    setSelectedProjectPath,
    setProjectPath,
    completeOnboarding,
    refreshData,
    refreshFlows,
    clearError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
