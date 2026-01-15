import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from '@components/layout/MainLayout';
import { AppProvider, useApp } from '@contexts/AppContext';
import { ToastProvider } from '@contexts/ToastContext';
import { DevOverlay } from '@components/DevOverlay';
import OnboardingWelcome from '@screens/OnboardingWelcome';
import SimpleWelcome from '@screens/SimpleWelcome';
import ProjectDetection from '@screens/ProjectDetection';
import Configuration from '@screens/Configuration';
import SmartDiscovery from '@screens/SmartDiscovery';
import Dashboard from '@screens/Dashboard';
import FlowsList from '@screens/FlowsList';
import FlowDetail from '@screens/FlowDetail';
import Settings from '@screens/Settings';
import TestResults from '@screens/TestResults';
import Test from '@screens/Test';
import SuitesList from '@screens/SuitesList';
import SuiteDetail from '@screens/SuiteDetail';
import CaseDetail from '@screens/CaseDetail';

// Component that handles initial routing based on onboarding status
function RootRedirect() {
  const { onboardingCompleted, projectPath, isInitializing } = useApp();
  const location = useLocation();
  
  // Wait for backend sync to complete before routing
  if (isInitializing) {
    return (
      <div className="h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If on root path, redirect based on onboarding status AND project path
  if (location.pathname === '/') {
    // Onboarding is truly complete only if we have both flag AND project path
    const isFullySetup = onboardingCompleted && projectPath;
    return <Navigate to={isFullySetup ? '/app/dashboard' : '/setup/welcome'} replace />;
  }
  
  return null;
}

function AppRoutes() {
  const { onboardingCompleted, projectPath } = useApp();
  
  return (
    <Routes>
      {/* Test route - REMOVE AFTER DEBUGGING */}
      <Route path="/test" element={<Test />} />
      
      {/* Root redirect based on onboarding status */}
      <Route path="/" element={<RootRedirect />} />
        
        {/* DEBUG: Simple welcome */}
        <Route path="/simple" element={<SimpleWelcome />} />
        
        {/* Setup flow - no layout */}
        <Route path="/setup/welcome" element={<OnboardingWelcome />} />
        <Route path="/setup/detection" element={<ProjectDetection />} />
        <Route path="/setup/config" element={<Configuration />} />
        <Route path="/setup/discovery" element={<SmartDiscovery />} />
        
        {/* Main app - with layout */}
        <Route path="/app" element={<MainLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="flows" element={<FlowsList />} />
          <Route path="flows/:flowId" element={<FlowDetail />} />
          <Route path="suites" element={<SuitesList />} />
          <Route path="suites/:suiteId" element={<SuiteDetail />} />
          <Route path="suites/:suiteId/cases/:caseId" element={<CaseDetail />} />
          <Route path="results" element={<TestResults />} />
          <Route path="test-results" element={<TestResults />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
      {/* Catch all - redirect based on onboarding status */}
      <Route 
        path="*" 
        element={
          <Navigate 
            to={(onboardingCompleted && projectPath) ? '/app/dashboard' : '/setup/welcome'} 
            replace 
          />
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
          <DevOverlay />
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
