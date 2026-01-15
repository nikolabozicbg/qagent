import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@stores/onboardingStore';
import { ProgressBar } from '@components/onboarding/ProgressBar';
import { Target, Brain, Zap, Wrench, FolderOpen, ArrowRight } from 'lucide-react';

const features = [
  { icon: Target, text: 'Flow-based test generation' },
  { icon: Brain, text: 'Smart project discovery' },
  { icon: Zap, text: 'Multi-framework support' },
  { icon: Wrench, text: 'Self-healing tests' },
];

export default function OnboardingWelcome() {
  const navigate = useNavigate();
  const { currentStep, setProjectPath, nextStep } = useOnboardingStore();

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFileDialog();
      if (result && !result.canceled && result.filePaths && result.filePaths[0]) {
        setProjectPath(result.filePaths[0]);
        nextStep();
        navigate('/setup/detection');
      }
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-dark">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto px-8 py-8 w-full">
        {/* Progress - always at top */}
        <div className="mb-8">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
        </div>
        
        {/* Centered content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">

        {/* Header - Premium Hero */}
        <div className="mb-12 text-center animate-fade-in-up">
          <h1 className="text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary via-primary-hover to-primary-active bg-clip-text text-transparent">
              Welcome to QAgent
            </span>
          </h1>
          <p className="text-xl text-text-secondary leading-relaxed">
            AI-powered test generation for modern applications
          </p>
        </div>

        {/* Features - Vertical with stagger */}
        <div className="w-full mb-12 space-y-3 max-w-lg">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="flex items-center gap-4 p-5 rounded-xl card hover:shadow-glass-lg hover:-translate-y-1 transition-all duration-300 group animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 group-hover:scale-110 transition-transform">
                  <Icon size={24} className="text-primary" />
                </div>
                <span className="text-base font-medium text-text-primary group-hover:text-primary transition-colors">{feature.text}</span>
              </div>
            );
          })}
        </div>

        {/* CTA Button - Pulse animation */}
        <div className="flex flex-col items-center gap-3 w-full max-w-lg animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <button
            onClick={handleSelectFolder}
            className="group relative flex items-center justify-center gap-3 px-8 py-4 btn-primary text-base rounded-xl w-full shadow-glow-lg hover:shadow-glow-xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <FolderOpen size={22} className="relative z-10" />
            <span className="relative z-10">Get Started</span>
            <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="text-text-tertiary hover:text-text-secondary transition-colors text-sm">
            Skip for now
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
