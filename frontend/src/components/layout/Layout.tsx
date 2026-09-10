
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, FileScan, GitBranch, History, Settings, Activity, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Overview', to: '/', icon: LayoutDashboard },
  { name: 'Verify Identity', to: '/verify', icon: FileScan },
  { name: 'AI Pipeline Flow', to: '/pipeline', icon: GitBranch },
  { name: 'Audit Ledger', to: '/history', icon: History },
  { name: 'Review Queue', to: '/history?tab=review', icon: AlertTriangle, highlight: true },
  { name: 'System Health', to: '/health', icon: Activity },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export function Layout() {
  const location = useLocation();
  const currentUrl = location.pathname + location.search;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center space-x-3">
          <ShieldCheck className="w-8 h-8 text-primary-500" />
          <span className="text-xl font-bold tracking-wider">IDGUARD</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isMatch = item.to.includes('?') 
              ? currentUrl === item.to 
              : location.pathname === item.to && !location.search;

            return (
              <NavLink
                key={item.name}
                to={item.to}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-xs font-semibold',
                  isMatch
                    ? 'bg-primary-600 text-white shadow-sm'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-slate-800 hover:text-amber-200'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className={`w-4 h-4 ${item.highlight ? 'text-amber-400' : ''}`} />
                <span className="font-medium flex-1">{item.name}</span>
                {item.highlight && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800">
          IDGUARD v2.0
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
