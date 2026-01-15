import { Outlet } from 'react-router-dom';
import { Titlebar } from './Titlebar';
import { UnifiedSidebar } from './UnifiedSidebar';
import { TopNav } from './TopNav';
import { StatusBar } from './StatusBar';
import { KeyboardShortcuts } from '@components/KeyboardShortcuts';
import { useProjectStore } from '@stores/useProjectStore';

export const MainLayout = () => {
  const { sidebarVisible } = useProjectStore();
  
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Titlebar */}
      <Titlebar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Unified Sidebar - Conditionally rendered */}
        {sidebarVisible && <UnifiedSidebar />}

        {/* Right side: TopNav + Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navigation */}
          <TopNav />
          
          {/* Content */}
          <main className="flex-1 overflow-auto custom-scrollbar bg-dark">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
};
