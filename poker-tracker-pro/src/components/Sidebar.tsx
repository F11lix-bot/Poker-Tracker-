import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Trophy, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Games', path: '/games', icon: Trophy },
    { name: 'Players', path: '/players', icon: Users },
    { name: 'Stats', path: '/stats', icon: Trophy },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "flex flex-col h-screen w-64 bg-zinc-950 border-r border-zinc-800 text-zinc-400 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-zinc-950">
              <Trophy size={24} />
            </div>
            <h1 className="text-white font-bold text-lg leading-none">Poker Tracker</h1>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-zinc-900 rounded-lg text-zinc-500"
          >
            <LogOut size={20} className="rotate-180" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-zinc-900 text-emerald-400 border border-zinc-800 shadow-lg" 
                    : "hover:bg-zinc-900 hover:text-zinc-200"
                )
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

      <div className="p-4 border-t border-zinc-800">
        {user ? (
          <div className="flex flex-col gap-3">
            <div className="px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Logged in as</p>
              <p className="text-sm text-zinc-200 truncate font-medium">{user.email}</p>
              {isAdmin && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase font-bold mt-1 inline-block">Admin</span>}
            </div>
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 text-zinc-400"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 text-center">
            <p className="text-xs text-zinc-500">Guest Mode (Read-Only)</p>
          </div>
        )}
      </div>

        <div className="px-6 py-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest border-t border-zinc-900">
          © Felix
        </div>
      </div>
    </>
  );
};

export default Sidebar;
