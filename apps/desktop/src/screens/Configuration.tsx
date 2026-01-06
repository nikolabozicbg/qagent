import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@stores/onboardingStore';
import { ProgressBar } from '@components/onboarding/ProgressBar';
import { apiService } from '@services/api';
import { Settings, Globe, Key, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

export default function Configuration() {
  const navigate = useNavigate();
  const { currentStep, config, updateConfig, nextStep, prevStep } = useOnboardingStore();

  const [baseUrl, setBaseUrl] = useState(config.baseUrl || 'http://localhost:3000');
  const [framework, setFramework] = useState<'playwright' | 'cypress'>(config.framework || 'playwright');
  const [username, setUsername] = useState(config.auth?.username || '');
  const [password, setPassword] = useState(config.auth?.password || '');
  const [useSeedData, setUseSeedData] = useState(config.auth?.useSeedData || false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    const result = await apiService.testConnection(baseUrl);
    
    if (result.success) {
      setTestResult({ success: true, message: `Connected! (Status: ${result.status})` });
    } else {
      setTestResult({ success: false, message: result.error || 'Connection failed' });
    }
    
    setTesting(false);
  };

  const handleContinue = () => {
    updateConfig({
      baseUrl,
      framework,
      auth: username && password ? { username, password, useSeedData } : undefined,
    });
    nextStep();
    navigate('/onboarding/discovery');
  };

  const handleBack = () => {
    prevStep();
    navigate('/onboarding/detection');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-dark">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto px-8 py-8 w-full">
        {/* Progress - always at top */}
        <div className="mb-8">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
        </div>
        
        {/* Centered content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">

        <div className="mb-8 w-full animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Settings className="text-primary" size={20} />
            </div>
            <h1 className="text-4xl font-bold text-text-primary">
              Configuration
            </h1>
          </div>
          <p className="text-base text-text-secondary ml-11">
            Configure your testing environment and authentication
          </p>
        </div>

        <div className="w-full space-y-5">
          {/* Base URL */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-2">
              <Globe size={14} />
              Base URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-surface-elevated/60 backdrop-blur border border-border/50 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="http://localhost:3000"
              />
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-2 btn-secondary disabled:opacity-50 whitespace-nowrap"
              >
                {testing && <Loader2 size={14} className="animate-spin" />}
                {testing ? 'Testing...' : 'Test'}
              </button>
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 text-xs mt-2 animate-fade-in-up ${
                testResult.success ? 'text-success' : 'text-error'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 size={14} className="animate-scale-in" />
                ) : (
                  <XCircle size={14} className="animate-scale-in" />
                )}
                {testResult.message}
              </div>
            )}
          </div>

          {/* Test Framework */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-2">
              <Key size={14} />
              Test Framework
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setFramework('playwright')}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  framework === 'playwright'
                    ? 'bg-gradient-to-br from-primary to-primary-active text-white shadow-glow-sm'
                    : 'bg-surface-elevated/60 backdrop-blur border border-border/50 text-text-secondary hover:border-primary/30 hover:bg-surface-hover/60'
                }`}
              >
                Playwright
              </button>
              <button
                onClick={() => setFramework('cypress')}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  framework === 'cypress'
                    ? 'bg-gradient-to-br from-primary to-primary-active text-white shadow-glow-sm'
                    : 'bg-surface-elevated/60 backdrop-blur border border-border/50 text-text-secondary hover:border-primary/30 hover:bg-surface-hover/60'
                }`}
              >
                Cypress
              </button>
            </div>
          </div>

          {/* Authentication - Collapsible */}
          <div className="pt-5 border-t border-border">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors mb-4"
            >
              {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Advanced Options (Authentication)
            </button>
            {showAdvanced && (
            <div className="space-y-4 animate-fade-in-up">
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-elevated/60 backdrop-blur border border-border/50 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-elevated/60 backdrop-blur border border-border/50 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSeedData}
                  onChange={(e) => setUseSeedData(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-xs text-text-secondary">Use seed data (auto-detected)</span>
              </label>
            </div>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-8 w-full">
          <button
            onClick={handleBack}
            className="btn-ghost"
          >
            Back
          </button>
          <button
            onClick={handleContinue}
            className="btn-primary"
          >
            Continue
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
