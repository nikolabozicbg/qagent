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

// Component that handles initial routing based on onboarding status
function RootRedirect() {
  const { onboardingCompleted, projectPath } = useApp();
  const location = useLocation();
  
  // If on root path, redirect based on onboarding status AND project path
  if (location.pathname === '/') {
    // Onboarding is truly complete only if we have both flag AND project path
    const isFullySetup = onboardingCompleted && projectPath;
    return <Navigate to={isFullySetup ? '/app/dashboard' : '/onboarding/welcome'} replace />;
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
        
        {/* Onboarding flow - no layout */}
        <Route path="/onboarding/welcome" element={<OnboardingWelcome />} />
        <Route path="/onboarding/detection" element={<ProjectDetection />} />
        <Route path="/onboarding/config" element={<Configuration />} />
        <Route path="/onboarding/discovery" element={<SmartDiscovery />} />
        
        {/* Main app - with layout */}
        <Route path="/app" element={<MainLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="flows" element={<FlowsList />} />
          <Route path="flows/:flowId" element={<FlowDetail />} />
          <Route path="test-results" element={<TestResults />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
      {/* Catch all - redirect based on onboarding status */}
      <Route 
        path="*" 
        element={
          <Navigate 
            to={(onboardingCompleted && projectPath) ? '/app/dashboard' : '/onboarding/welcome'} 
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
