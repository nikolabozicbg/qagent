import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, GitBranch, TestTube2, Settings, Menu } from 'lucide-react';
import { useProjectStore } from '@stores/useProjectStore';
import { ProjectSelector } from './ProjectSelector';

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

export const TopNav = () => {
  const { toggleSidebar } = useProjectStore();

  return (
    <div className="h-12 border-b border-border bg-surface flex items-center px-4 gap-3">
      {/* Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
        title="Toggle Sidebar (Cmd+B)"
      >
        <Menu size={18} className="text-text-secondary" />
      </button>

      {/* Project Selector */}
      <ProjectSelector />

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
