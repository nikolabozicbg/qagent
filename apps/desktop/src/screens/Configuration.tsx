import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@stores/onboardingStore';
import { useProjectStore } from '@stores/useProjectStore';
import { ProgressBar } from '@components/onboarding/ProgressBar';
import { apiService } from '@services/api';
import { playwrightService, PlaywrightStatus } from '@services/playwright';
import { Settings, Globe, Key, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, Download, AlertCircle } from 'lucide-react';
import type { ProjectConfig } from '@/types/suite.types';

export default function Configuration() {
  const navigate = useNavigate();
  const { currentStep, projectPath, config, updateConfig, nextStep, prevStep } = useOnboardingStore();
  const { setCurrentProject, addRecentProject, createProjectInBackend } = useProjectStore();

  const [baseUrl, setBaseUrl] = useState(config.baseUrl || 'http://localhost:3000');
  const [framework, setFramework] = useState<'playwright' | 'cypress'>(config.framework || 'playwright');
  const [username, setUsername] = useState(config.auth?.username || '');
  const [password, setPassword] = useState(config.auth?.password || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Playwright detection state
  const [playwrightStatus, setPlaywrightStatus] = useState<PlaywrightStatus | null>(null);
  const [checkingPlaywright, setCheckingPlaywright] = useState(false);
  const [installingPlaywright, setInstallingPlaywright] = useState(false);
  const [installProgress, setInstallProgress] = useState<string[]>([]);

  // Check Playwright on mount and when project changes
  useEffect(() => {
    const checkPlaywright = async () => {
      if (!projectPath) return;
      
      setCheckingPlaywright(true);
      try {
        const status = await playwrightService.checkPlaywright(projectPath);
        setPlaywrightStatus(status);
        
        // Auto-set testDir if found
        if (status.testDir) {
          console.log('🎭 Playwright config found:', status);
        }
      } catch (err) {
        console.error('Failed to check Playwright:', err);
      } finally {
        setCheckingPlaywright(false);
      }
    };
    
    checkPlaywright();
  }, [projectPath]);
  
  const handleInstallPlaywright = async () => {
    if (!projectPath) return;
    
    setInstallingPlaywright(true);
    setInstallProgress([]);
    
    try {
      await playwrightService.installPlaywright(
        projectPath,
        (message) => {
          setInstallProgress(prev => [...prev, message]);
        },
        async (success, error) => {
          if (success) {
            // Re-check Playwright status after installation
            const status = await playwrightService.checkPlaywright(projectPath);
            setPlaywrightStatus(status);
          } else {
            console.error('Playwright installation failed:', error);
          }
          setInstallingPlaywright(false);
        }
      );
    } catch (err: any) {
      console.error('Failed to install Playwright:', err);
      setInstallingPlaywright(false);
    }
  };
  
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

  const handleContinue = async () => {
    if (!projectPath) {
      console.error('No project path set');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Build full ProjectConfig
      const projectName = projectPath.split('/').pop() || 'project';
      const testDir = playwrightStatus?.testDir || 'tests/e2e';
      
      const projectConfig: ProjectConfig = {
        projectPath,
        projectName,
        framework,
        baseUrl,
        testDir,
        auth: username && password ? {
          enabled: true,
          username,
          password,
          // Defaults - will be auto-detected or can be overridden in Settings
          loginRoute: '/signin',
          usernameSelector: '[name="username"]',
          passwordSelector: '[name="password"]',
          submitSelector: 'button[type="submit"]',
          successUrlPattern: '/dashboard|/home|/$',
        } : undefined,
      };
      
      // Save to backend (single source of truth)
      await createProjectInBackend(projectConfig);
      console.log('✅ Project saved to backend:', projectConfig);
      
      // Update local stores
      setCurrentProject(projectConfig);
      addRecentProject(projectConfig);
      
      // Update onboarding config
      updateConfig({
        baseUrl,
        framework,
        auth: projectConfig.auth,
      });
      
      // Sync baseURL to playwright.config.ts if Playwright is installed
      if (playwrightStatus?.isInstalled && window.electronAPI?.createPlaywrightConfig) {
        try {
          await window.electronAPI.createPlaywrightConfig(projectPath, {
            baseURL: baseUrl,
            testDir,
          });
          console.log('✅ Playwright config synced with baseURL:', baseUrl);
        } catch (err) {
          console.warn('Failed to sync Playwright config:', err);
        }
      }
      
      // If auth is enabled, trigger auth setup generation
      if (projectConfig.auth?.enabled) {
        try {
          await apiService.generateAuthSetup({
            projectPath,
            auth: projectConfig.auth,
          });
          console.log('✅ Auth setup generated');
        } catch (err) {
          console.warn('Failed to generate auth setup:', err);
        }
      }
      
      nextStep();
      navigate('/setup/discovery');
    } catch (err) {
      console.error('Failed to save project config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    prevStep();
    navigate('/setup/detection');
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

          {/* Test Framework - Playwright Only */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-2">
              <Key size={14} />
              Test Framework
            </label>
            
            {/* Playwright Status Banner */}
            {checkingPlaywright ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-elevated/60 backdrop-blur border border-border/50 rounded-lg mb-3">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="text-xs text-text-secondary">Checking Playwright installation...</span>
              </div>
            ) : playwrightStatus && !playwrightStatus.isInstalled ? (
              <div className="space-y-3 mb-3">
                <div className="flex items-start gap-2 px-3 py-2.5 bg-warning/10 border border-warning/30 rounded-lg">
                  <AlertCircle size={14} className="text-warning mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-warning font-medium">Playwright Not Installed</p>
                    <p className="text-xs text-text-tertiary mt-1">Install Playwright to generate and run tests</p>
                  </div>
                </div>
                <button
                  onClick={handleInstallPlaywright}
                  disabled={installingPlaywright}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {installingPlaywright ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Installing Playwright...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Install Playwright
                    </>
                  )}
                </button>
                {installProgress.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-surface-elevated/60 backdrop-blur border border-border/50 rounded-lg p-2">
                    {installProgress.slice(-5).map((msg, i) => (
                      <div key={i} className="text-xs text-text-tertiary font-mono">{msg}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : playwrightStatus?.isInstalled ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-success/10 border border-success/30 rounded-lg mb-3">
                <CheckCircle2 size={14} className="text-success" />
                <div className="flex-1">
                  <span className="text-xs text-success font-medium">Playwright Installed</span>
                  {playwrightStatus.testDir && (
                    <span className="text-xs text-text-tertiary ml-2">• Tests: {playwrightStatus.testDir}</span>
                  )}
                </div>
              </div>
            ) : null}
            
            {/* Framework Selection - Playwright Only for Now */}
            <div className="flex gap-3">
              <button
                onClick={() => setFramework('playwright')}
                disabled={!playwrightStatus?.isInstalled}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                  framework === 'playwright'
                    ? 'bg-gradient-to-br from-primary to-primary-active text-white shadow-glow-sm'
                    : 'bg-surface-elevated/60 backdrop-blur border border-border/50 text-text-secondary hover:border-primary/30 hover:bg-surface-hover/60'
                }`}
              >
                Playwright
              </button>
              <button
                disabled
                className="flex-1 px-3 py-2.5 rounded-lg text-sm font-medium bg-surface-elevated/30 border border-border/30 text-text-tertiary cursor-not-allowed opacity-40"
                title="Cypress support coming soon"
              >
                Cypress (Coming Soon)
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
              <p className="text-xs text-text-tertiary">
                Enter credentials for a test user. This will be used to authenticate before running tests on protected routes.
              </p>
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
            disabled={isSaving}
            className="btn-primary disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Continue'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
