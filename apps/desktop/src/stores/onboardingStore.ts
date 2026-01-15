import { create } from 'zustand';
import { 
  ProjectConfig, 
  DetectedTech, 
  ProjectInsights, 
  DiscoveredFlow,
  AnalysisProgress,
  TechDetectionResult
} from '@/types/onboarding';

interface OnboardingState {
  // Step tracking
  currentStep: number;
  
  // Project
  projectPath: string | null;
  setProjectPath: (path: string) => void;
  
  // Detection
  detectedTech: DetectedTech[];
  projectInsights: ProjectInsights | null;
  analysisProgress: AnalysisProgress | null;
  techDetectionResult: TechDetectionResult | null;
  setDetectedTech: (tech: DetectedTech[]) => void;
  setProjectInsights: (insights: ProjectInsights) => void;
  setAnalysisProgress: (progress: AnalysisProgress) => void;
  setTechDetectionResult: (result: TechDetectionResult) => void;
  
  // Configuration
  config: Partial<ProjectConfig>;
  updateConfig: (config: Partial<ProjectConfig>) => void;
  
  // Discovery
  discoveredFlows: DiscoveredFlow[];
  selectedFlowIds: string[];
  setDiscoveredFlows: (flows: DiscoveredFlow[]) => void;
  toggleFlowSelection: (flowId: string) => void;
  
  // Navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  projectPath: null,
  detectedTech: [],
  projectInsights: null,
  analysisProgress: null,
  techDetectionResult: null,
  config: {},
  discoveredFlows: [],
  selectedFlowIds: [],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  
  setProjectPath: (path) => set({ projectPath: path }),
  
  setDetectedTech: (tech) => set({ detectedTech: tech }),
  
  setProjectInsights: (insights) => set({ projectInsights: insights }),
  
  setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
  
  setTechDetectionResult: (result) => set({ techDetectionResult: result }),
  
  updateConfig: (config) => 
    set((state) => ({ 
      config: { ...state.config, ...config } 
    })),
  
  setDiscoveredFlows: (flows) => 
    set({ 
      discoveredFlows: flows,
      selectedFlowIds: flows
        .filter(f => f.priority === 'critical')
        .map(f => f.id)
    }),
  
  toggleFlowSelection: (flowId) => 
    set((state) => ({
      selectedFlowIds: state.selectedFlowIds.includes(flowId)
        ? state.selectedFlowIds.filter(id => id !== flowId)
        : [...state.selectedFlowIds, flowId]
    })),
  
  nextStep: () => 
    set((state) => ({ 
      currentStep: Math.min(state.currentStep + 1, 4) 
    })),
  
  prevStep: () => 
    set((state) => ({ 
      currentStep: Math.max(state.currentStep - 1, 1) 
    })),
  
  goToStep: (step) => 
    set({ currentStep: step }),
  
  reset: () => set(initialState),
}));
