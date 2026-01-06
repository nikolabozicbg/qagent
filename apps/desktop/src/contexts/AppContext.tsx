import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '@services/api';

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
  testFile?: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [aiCopilotVisible, setAiCopilotVisible] = useState(true);
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    const completed = localStorage.getItem('qagent_onboarding_completed') === 'true';
    console.log('🎯 Onboarding status on init:', completed);
    return completed;
  });

  const completeOnboarding = () => {
    localStorage.setItem('qagent_onboarding_completed', 'true');
    setOnboardingCompleted(true);
  };

  // Sync projectPath with selectedProjectPath
  useEffect(() => {
    if (projectPath && projectPath !== selectedProjectPath) {
      console.log('🔄 Setting selectedProjectPath to:', projectPath);
      setSelectedProjectPath(projectPath);
    }
  }, [projectPath]);

  const addFlow = (flow: Flow) => {
    setFlows(prev => [...prev, flow]);
  };

  const updateFlow = (id: string, updates: Partial<Flow>) => {
    setFlows(prev => prev.map(flow => 
      flow.id === id ? { ...flow, ...updates } : flow
    ));
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

  const clearError = () => {
    setError(null);
  };

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
