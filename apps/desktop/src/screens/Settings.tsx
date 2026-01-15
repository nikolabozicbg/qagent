import { useState, useEffect } from 'react';
import { Save, FolderOpen, TestTube, Globe, Key, Palette, Keyboard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '@contexts/AppContext';
import { useToast } from '@contexts/ToastContext';
import { apiService } from '@services/api';

import type { ProjectConfig } from '@/types/suite.types';

// Use unified ProjectConfig from suite.types

interface Preferences {
  theme: 'dark' | 'light' | 'system';
  enableAICopilot: boolean;
  autoSaveTests: boolean;
  showKeyboardShortcuts: boolean;
  enableNotifications: boolean;
}

export default function Settings() {
  const { selectedProjectPath, aiCopilotVisible, toggleAICopilot } = useApp();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'project' | 'preferences' | 'advanced'>('project');
  const [isSaving, setIsSaving] = useState(false);
  const [testConnectionStatus, setTestConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    projectPath: selectedProjectPath || '',
    projectName: selectedProjectPath?.split('/').pop() || 'project',
    framework: 'playwright',
    baseUrl: 'http://localhost:3000',
    testDir: 'tests/e2e',
    auth: {
      enabled: false,
      username: '',
      password: '',
    },
  });

  const [preferences, setPreferences] = useState<Preferences>({
    theme: 'dark',
    enableAICopilot: aiCopilotVisible,
    autoSaveTests: true,
    showKeyboardShortcuts: true,
    enableNotifications: true,
  });

  // Load config on mount
  useEffect(() => {
    if (selectedProjectPath) {
      loadProjectConfig();
    }
  }, [selectedProjectPath]);

  const loadProjectConfig = async () => {
    try {
      // Load from /projects endpoint (same storage as Setup flow)
      const response = await apiService.getProject(selectedProjectPath!);
      // API returns { config: {...}, suites: [...] } - extract config
      const project = response?.config || response;
      if (project) {
        setProjectConfig({
          projectPath: project.projectPath || selectedProjectPath!,
          projectName: project.projectName || selectedProjectPath!.split('/').pop() || 'project',
          framework: project.framework || 'playwright',
          baseUrl: project.baseUrl || 'http://localhost:3000',
          testDir: project.testDir || 'tests/e2e',
          auth: project.auth || { enabled: false, username: '', password: '' },
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleSaveProject = async () => {
    setIsSaving(true);
    try {
      // Upsert via /projects so Setup and Settings share the same source
      await apiService.createProject({
        projectPath: projectConfig.projectPath,
        projectName: projectConfig.projectPath.split('/').pop() || 'project',
        framework: projectConfig.framework,
        baseUrl: projectConfig.baseUrl,
        testDir: projectConfig.testDir,
        auth: projectConfig.auth,
      });
      // If auth enabled or changed, regenerate auth setup
      if (projectConfig.auth?.enabled && projectConfig.auth.username && projectConfig.auth.password) {
        await apiService.generateAuthSetup({ projectPath: projectConfig.projectPath, auth: projectConfig.auth, testDir: projectConfig.testDir });
      }
      showToast({ type: 'success', message: 'Project configuration saved successfully' });
    } catch (error: any) {
      showToast({
        type: 'error',
        message: `Failed to save configuration: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestConnectionStatus('testing');
    try {
      const result = await apiService.testConnection(projectConfig.baseUrl);
      if (result.success) {
        setTestConnectionStatus('success');
        showToast({
          type: 'success',
          message: 'Connection successful!',
        });
      } else {
        setTestConnectionStatus('error');
        showToast({
          type: 'error',
          message: `Connection failed: ${result.error}`,
        });
      }
    } catch (error: any) {
      setTestConnectionStatus('error');
      showToast({
        type: 'error',
        message: `Connection failed: ${error.message}`,
      });
    } finally {
      setTimeout(() => setTestConnectionStatus('idle'), 3000);
    }
  };

  const handleSelectProjectFolder = async () => {
    if (window.electronAPI?.openFileDialog) {
      const path = await window.electronAPI.openFileDialog();
      if (path) {
        setProjectConfig(prev => ({ ...prev, projectPath: path }));
      }
    }
  };

  const handleSavePreferences = () => {
    // Save to localStorage
    localStorage.setItem('preferences', JSON.stringify(preferences));
    
    // Apply preferences
    if (preferences.enableAICopilot !== aiCopilotVisible) {
      toggleAICopilot();
    }
    
    showToast({
      type: 'success',
      message: 'Preferences saved successfully',
    });
  };

  return (
    <div className="h-full bg-dark overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-white/60">Configure your QAgent workspace</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 px-8">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('project')}
            className={`py-3 px-1 border-b-2 transition-colors ${
              activeTab === 'project'
                ? 'border-primary text-white'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Project
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-1 border-b-2 transition-colors ${
              activeTab === 'preferences'
                ? 'border-primary text-white'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`py-3 px-1 border-b-2 transition-colors ${
              activeTab === 'advanced'
                ? 'border-primary text-white'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'project' && (
            <div className="space-y-6">
              {/* Project Path */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Project Path</h2>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectConfig.projectPath}
                    onChange={(e) => setProjectConfig(prev => ({ ...prev, projectPath: e.target.value }))}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="/path/to/your/project"
                  />
                  <button
                    onClick={handleSelectProjectFolder}
                    className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* Test Framework */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TestTube className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Test Framework</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setProjectConfig(prev => ({ ...prev, framework: 'playwright' }))}
                    className={`p-4 rounded-lg font-medium transition-colors ${
                      projectConfig.framework === 'playwright'
                        ? 'bg-primary text-white'
                        : 'glass hover:bg-white/10'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold mb-1">Playwright</p>
                      <p className="text-xs text-white/60">Modern, fast, cross-browser testing</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setProjectConfig(prev => ({ ...prev, framework: 'cypress' }))}
                    className={`p-4 rounded-lg font-medium transition-colors ${
                      projectConfig.framework === 'cypress'
                        ? 'bg-primary text-white'
                        : 'glass hover:bg-white/10'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold mb-1">Cypress</p>
                      <p className="text-xs text-white/60">Popular, developer-friendly testing</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Base URL</h2>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={projectConfig.baseUrl}
                    onChange={(e) => setProjectConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="http://localhost:3000"
                  />
                  <button
                    onClick={handleTestConnection}
                    disabled={testConnectionStatus === 'testing'}
                    className="flex items-center gap-2 px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors"
                  >
                    {testConnectionStatus === 'testing' && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    {testConnectionStatus === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    )}
                    {testConnectionStatus === 'error' && (
                      <AlertCircle className="w-4 h-4 text-error" />
                    )}
                    {testConnectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>

              {/* Test Directory */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Test Directory</h2>
                <input
                  type="text"
                  value={projectConfig.testDir}
                  onChange={(e) => setProjectConfig(prev => ({ ...prev, testDir: e.target.value }))}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="tests/e2e"
                />
                <p className="text-xs text-white/60 mt-2">Where generated tests will be saved</p>
              </div>

              {/* Authentication */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Authentication</h2>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={projectConfig.auth?.enabled}
                      onChange={(e) => setProjectConfig(prev => ({
                        ...prev,
                        auth: { ...prev.auth!, enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                    />
                    <span className="text-sm">Enable authentication for testing</span>
                  </label>
                  
                  {projectConfig.auth?.enabled && (
                    <div className="space-y-3 pl-6 animate-fade-in-up">
                      <input
                        type="text"
                        value={projectConfig.auth?.username}
                        onChange={(e) => setProjectConfig(prev => ({
                          ...prev,
                          auth: { ...prev.auth!, username: e.target.value }
                        }))}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                        placeholder="Username"
                      />
                      <input
                        type="password"
                        value={projectConfig.auth?.password}
                        onChange={(e) => setProjectConfig(prev => ({
                          ...prev,
                          auth: { ...prev.auth!, password: e.target.value }
                        }))}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                        placeholder="Password"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveProject}
                  disabled={isSaving}
                  className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Project Configuration'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* UI Preferences */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">User Interface</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/80 mb-2 block">Theme</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['dark', 'light', 'system'] as const).map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setPreferences(prev => ({ ...prev, theme }))}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                            preferences.theme === theme
                              ? 'bg-primary text-white'
                              : 'glass hover:bg-white/10'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Enable AI Co-pilot</span>
                    <input
                      type="checkbox"
                      checked={preferences.enableAICopilot}
                      onChange={(e) => setPreferences(prev => ({ ...prev, enableAICopilot: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Show keyboard shortcuts hint</span>
                    <input
                      type="checkbox"
                      checked={preferences.showKeyboardShortcuts}
                      onChange={(e) => setPreferences(prev => ({ ...prev, showKeyboardShortcuts: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                    />
                  </label>
                </div>
              </div>

              {/* Editor Preferences */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Test Generation</h2>
                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Auto-save generated tests</span>
                    <input
                      type="checkbox"
                      checked={preferences.autoSaveTests}
                      onChange={(e) => setPreferences(prev => ({ ...prev, autoSaveTests: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Enable desktop notifications</span>
                    <input
                      type="checkbox"
                      checked={preferences.enableNotifications}
                      onChange={(e) => setPreferences(prev => ({ ...prev, enableNotifications: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                    />
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSavePreferences}
                  className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Keyboard Shortcuts */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Keyboard className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { keys: '⌘K', action: 'Open command palette' },
                    { keys: '⌘1', action: 'Go to Dashboard' },
                    { keys: '⌘2', action: 'Go to Flows' },
                    { keys: '⌘G', action: 'Generate test' },
                    { keys: '⌘R', action: 'Run discovery' },
                    { keys: '⌘J', action: 'Toggle AI Co-pilot' },
                  ].map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between p-3 glass rounded-lg">
                      <span className="text-sm text-white/80">{shortcut.action}</span>
                      <kbd className="px-3 py-1.5 text-sm bg-white/10 rounded border border-white/20 font-mono">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* About */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">About</h2>
                <div className="space-y-2 text-sm text-white/80">
                  <p><strong>QAgent</strong> - AI-Powered Test Generation</p>
                  <p>Version: 1.0.0</p>
                  <p>© 2024 QAgent. All rights reserved.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
