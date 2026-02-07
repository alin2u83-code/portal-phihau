import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Settings, 
  LayoutDashboard, 
  LogOut, 
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  const { userDetails: currentUser, logout: signOut } = useAuthStore();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Gestiune Membri', path: '/sportivi' },
    { icon: Calendar, label: 'Evenimente & Examene', path: '/examene' },
    { icon: CreditCard, label: 'Financiar', path: '/plati-scadente' },
    { icon: Settings, label: 'Setări Club', path: '/setari-club' },
  ];

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden">
      {/* SIDEBAR FIX */}
      <aside className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Phi Hau</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-semibold">
            {currentUser?.cluburi?.nume || 'Portal Club'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all" onClick={() => window.location.reload()}>
            <RefreshCw className="w-5 h-5" />
            <span className="font-medium">Sincronizare</span>
          </button>
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Deconectare</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 bg-[#1e293b]/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-8">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 italic">Mod Lucru:</span>
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
              {currentUser?.rol_activ_context ? currentUser.rol_activ_context.replace(/_/g, ' ') : (currentUser?.roluri?.[0]?.nume || 'SPORTIV')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-white leading-none">{currentUser?.nume} {currentUser?.prenume}</p>
              <p className="text-xs text-slate-400">{currentUser?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg">
              {currentUser?.nume?.[0]}{currentUser?.prenume?.[0]}
            </div>
          </div>
        </header>

        {/* CONTENT SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
