import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@stores/onboardingStore';
import { ProgressBar } from '@components/onboarding/ProgressBar';
import { apiService } from '@services/api';
import { TechDetectionResult } from '@/types/onboarding';
import { 
  CheckCircle2, 
  Zap, 
  Box, 
  Palette, 
  Database, 
  TestTube2, 
  Code2, 
  Package,
  Sparkles,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function ProjectDetection() {
  const navigate = useNavigate();
  const {
    currentStep,
    projectPath,
    setDetectedTech,
    setProjectInsights,
    setTechDetectionResult,
    nextStep,
    prevStep,
  } = useOnboardingStore();

  const [isDetecting, setIsDetecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [techResult, setTechResult] = useState<TechDetectionResult | null>(null);

  useEffect(() => {
    if (!projectPath) {
      navigate('/setup/welcome');
      return;
    }

    detectTechnology();
  }, [projectPath]);

  const detectTechnology = async () => {
    try {
      setIsDetecting(true);
      setError(null);

      const result = await apiService.detectTechnology(projectPath!);
      setTechResult(result);
      setTechDetectionResult(result); // Cache in store for later use

      // Transform to legacy format for store compatibility
      const detectedTech = [];
      
      if (result.framework) {
        detectedTech.push({
          name: result.framework,
          version: result.frameworkVersion || undefined,
          category: 'framework' as const
        });
      }
      
      if (result.uiLibrary) {
        detectedTech.push({
          name: result.uiLibrary,
          version: result.uiLibraryVersion || undefined,
          category: 'ui' as const
        });
      }
      
      if (result.stateManagement) {
        detectedTech.push({
          name: result.stateManagement,
          category: 'state' as const
        });
      }
      
      result.testingFrameworks.forEach(fw => {
        detectedTech.push({
          name: fw,
          category: 'testing' as const
        });
      });

      setDetectedTech(detectedTech);
      
      // Set project insights
      setProjectInsights({
        componentsCount: 0, // Not doing deep analysis anymore
        routesCount: 0,
        apiEndpointsCount: 0,
        hasPlaywright: result.testingFrameworks.includes('playwright'),
        hasCypress: result.testingFrameworks.includes('cypress'),
      });

      setIsDetecting(false);
    } catch (err: any) {
      console.error('Tech detection error:', err);
      setError(err.message || 'Failed to detect project technology');
      setIsDetecting(false);
    }
  };

  const handleContinue = () => {
    nextStep();
    navigate('/setup/config');
  };

  const handleBack = () => {
    prevStep();
    navigate('/setup/welcome');
  };

  const getProjectTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'react-frontend': 'React Frontend',
      'vue-frontend': 'Vue.js Frontend',
      'angular-frontend': 'Angular Frontend',
      'next-fullstack': 'Next.js Fullstack',
      'node-backend': 'Node.js Backend',
      'python-backend': 'Python Backend',
      'monorepo': 'Monorepo',
      'unknown': 'Unknown'
    };
    return labels[type] || type;
  };

  const getTestTypeIcon = (type: string) => {
    if (type.includes('E2E')) return '🎭';
    if (type.includes('Component')) return '🧩';
    if (type.includes('Visual')) return '👁️';
    if (type.includes('API')) return '🔌';
    if (type.includes('Unit')) return '🔬';
    return '✅';
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-dark">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto px-8 py-8 w-full overflow-y-auto custom-scrollbar">
        {/* Progress */}
        <div className="mb-8">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Zap className="text-primary" size={20} />
            </div>
            <h1 className="text-3xl font-bold text-text-primary">
              Technology Detection
            </h1>
          </div>
          <p className="text-base text-text-secondary ml-11">
            Instantly detecting your project's technology stack
          </p>
        </div>

        {/* Loading State */}
        {isDetecting && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-text-secondary">Detecting technologies...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-error/10 border border-error rounded-lg p-4 mb-6">
            <p className="text-error">{error}</p>
            <button 
              onClick={detectTechnology}
              className="mt-2 text-sm text-error underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {techResult && !isDetecting && (
          <div className="space-y-6 animate-fade-in">
            {/* Detection Time Badge */}
            <div className="flex items-center gap-2 text-sm text-text-tertiary">
              <CheckCircle2 size={16} className="text-success" />
              <span>Detected in {techResult.detectionTime}ms</span>
            </div>

            {/* Main Tech Stack Card */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                Detected Stack
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Project Type */}
                <div className="flex items-center gap-3 p-3 bg-surface-elevated/50 rounded-lg">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Box size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wide">Project Type</p>
                    <p className="text-text-primary font-medium">{getProjectTypeLabel(techResult.projectType)}</p>
                  </div>
                </div>

                {/* Framework */}
                {techResult.framework && (
                  <div className="flex items-center gap-3 p-3 bg-surface-elevated/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-info/10">
                      <Code2 size={18} className="text-info" />
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary uppercase tracking-wide">Framework</p>
                      <p className="text-text-primary font-medium">
                        {techResult.framework}
                        {techResult.frameworkVersion && (
                          <span className="text-text-tertiary ml-1">v{techResult.frameworkVersion}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* UI Library */}
                {techResult.uiLibrary && (
                  <div className="flex items-center gap-3 p-3 bg-surface-elevated/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Palette size={18} className="text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary uppercase tracking-wide">UI Library</p>
                      <p className="text-text-primary font-medium">
                        {techResult.uiLibrary}
                        {techResult.uiLibraryVersion && (
                          <span className="text-text-tertiary ml-1">v{techResult.uiLibraryVersion}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* State Management */}
                {techResult.stateManagement && (
                  <div className="flex items-center gap-3 p-3 bg-surface-elevated/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Database size={18} className="text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary uppercase tracking-wide">State Management</p>
                      <p className="text-text-primary font-medium">{techResult.stateManagement}</p>
                    </div>
                  </div>
                )}

                {/* Language */}
                <div className="flex items-center gap-3 p-3 bg-surface-elevated/50 rounded-lg">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Code2 size={18} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wide">Language</p>
                    <p className="text-text-primary font-medium capitalize">{techResult.language}</p>
                  </div>
                </div>

                {/* Package Manager */}
                <div className="flex items-center gap-3 p-3 bg-surface-elevated/50 rounded-lg">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Package size={18} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wide">Package Manager</p>
                    <p className="text-text-primary font-medium uppercase">{techResult.packageManager}</p>
                  </div>
                </div>
              </div>

              {/* Existing Testing Frameworks */}
              {techResult.testingFrameworks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-text-tertiary uppercase tracking-wide mb-2">Existing Test Frameworks</p>
                  <div className="flex flex-wrap gap-2">
                    {techResult.testingFrameworks.map((fw, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1.5 bg-success/10 border border-success/20 rounded-lg text-sm text-success font-medium"
                      >
                        <TestTube2 size={14} className="inline mr-1.5" />
                        {fw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Features */}
              {techResult.features.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-text-tertiary uppercase tracking-wide mb-2">Detected Features</p>
                  <div className="flex flex-wrap gap-2">
                    {techResult.features.map((feature, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 bg-surface-elevated border border-border rounded-full text-xs text-text-secondary"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recommended Test Types */}
            <div className="card p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <TestTube2 size={18} className="text-primary" />
                Recommended Test Types
              </h3>
              
              <div className="space-y-2">
                {techResult.recommendedTestTypes.map((type, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-3 bg-surface/50 rounded-lg"
                  >
                    <span className="text-xl">{getTestTypeIcon(type)}</span>
                    <span className="text-text-primary font-medium">{type}</span>
                    <CheckCircle2 size={16} className="text-success ml-auto" />
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-text-tertiary mt-4">
                Based on your stack, we'll help you generate these test types in the next step.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="sticky bottom-0 bg-dark/95 backdrop-blur-sm border-t border-border pt-4 mt-auto">
          <div className="flex justify-between w-full">
            <button
              onClick={handleBack}
              className="btn-ghost"
            >
              Back
            </button>
            <button
              onClick={handleContinue}
              disabled={isDetecting || !!error}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
