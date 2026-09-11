
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, FileScan, GitBranch, History, Settings, Activity, AlertTriangle, Menu, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white p-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-primary-500" />
          <span className="font-bold tracking-wider">IDGUARD</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-slate-300 hover:text-white">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:flex items-center space-x-3">
          <ShieldCheck className="w-8 h-8 text-primary-500" />
          <span className="text-xl font-bold tracking-wider">IDGUARD</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 md:mt-0 overflow-y-auto">
          {navItems.map((item) => {
            const isMatch = item.to.includes('?') 
              ? currentUrl === item.to 
              : location.pathname === item.to && !location.search;

            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
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
        <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800 mt-auto">
          IDGUARD v2.0
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
