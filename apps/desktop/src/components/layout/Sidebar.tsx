import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GitBranch, Settings, TestTube2, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import { wsService } from '@services/websocket';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  {
    path: '/app/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    path: '/app/suites',
    label: 'Test Suites',
    icon: Layers,
  },
  {
    path: '/app/flows',
    label: 'Flows',
    icon: GitBranch,
  },
  {
    path: '/app/test-results',
    label: 'Test Results',
    icon: TestTube2,
  },
  {
    path: '/app/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export const Sidebar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check initial connection status
    setIsConnected(wsService.isConnected());

    // Try to connect if not connected
    if (!wsService.isConnected()) {
      setIsConnecting(true);
      wsService.connect();
      
      // Check connection status after a delay
      setTimeout(() => {
        setIsConnected(wsService.isConnected());
        setIsConnecting(false);
      }, 2000);
    }

    // Poll connection status every 5 seconds
    const interval = setInterval(() => {
      setIsConnected(wsService.isConnected());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-sidebar bg-surface border-r border-border flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs">
          <div 
            className={`w-1.5 h-1.5 rounded-full ${
              isConnecting 
                ? 'bg-warning animate-pulse' 
                : isConnected 
                ? 'bg-success' 
                : 'bg-error'
            }`} 
          />
          <span className="text-text-secondary">
            {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="ml-auto text-text-tertiary font-mono">:3001</span>
        </div>
      </div>
    </aside>
  );
};
