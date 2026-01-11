import React, { useState } from 'react';
import { User, View } from '../types';
import { Sidebar } from './Sidebar';
import { Bars3Icon } from './icons';
import { logoPhiHau } from '../assets/logo';
import { adminMenu, sportivMenu } from './menuConfig';

interface LayoutProps {
    children: React.ReactNode;
    currentUser: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    activeView: View;
    isSidebarExpanded: boolean;
    setIsSidebarExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

const Topbar: React.FC<{ onMenuClick: () => void; title: string; }> = ({ onMenuClick, title }) => (
    <div className="lg:hidden fixed top-0 left-0 w-full z-40 bg-slate-900/80 backdrop-blur-sm shadow-md h-16 flex items-center justify-between px-4">
        <button onClick={onMenuClick} className="text-white p-2">
            <Bars3Icon className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
             <img src={`data:image/svg+xml;base64,${logoPhiHau}`} alt="Club Logo" className="h-10 w-10" />
             <span className="font-bold text-white">{title}</span>
        </div>
        <div className="w-8"></div>
    </div>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentUser, onNavigate, onLogout, activeView, isSidebarExpanded, setIsSidebarExpanded }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const isAdmin = currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor');
    const menu = isAdmin ? adminMenu : sportivMenu;
    
    const activeMenuItem = menu.find(item => item.view === activeView || item.submenu?.some(sub => sub.view === activeView));
    const activeSubMenuItem = activeMenuItem?.submenu?.find(sub => sub.view === activeView);
    const pageTitle = activeSubMenuItem?.label || activeMenuItem?.label || 'Dashboard';
    
    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsMobileOpen(false); // Close mobile menu on navigation
    };

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Mobile Topbar */}
            <Topbar onMenuClick={() => setIsMobileOpen(true)} title={pageTitle} />

            {/* Mobile Sidebar Overlay */}
            <div
                className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileOpen(false)}
            />

            {/* Sidebar (Mobile and Desktop) */}
            <Sidebar 
                currentUser={currentUser}
                onNavigate={handleNavigate}
                onLogout={onLogout}
                activeView={activeView}
                isExpanded={isSidebarExpanded}
                setIsExpanded={setIsSidebarExpanded}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
                menu={menu}
            />

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 p-4 md:p-8 lg:pt-8 pt-20 ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {children}
            </main>
        </div>
    );
};