import { Outlet } from 'react-router-dom';
import { Titlebar } from './Titlebar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { KeyboardShortcuts } from '@components/KeyboardShortcuts';

export const MainLayout = () => {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Titlebar */}
      <Titlebar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Content */}
        <main className="flex-1 overflow-auto custom-scrollbar bg-dark">
          <Outlet />
        </main>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
};
