import React, { useState } from 'react';
import { User, View } from '../types';
import { Sidebar } from './Sidebar';
import { Bars3Icon, ChevronDownIcon } from './icons';
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
    <div className="lg:hidden fixed top-0 left-0 w-full z-40 bg-slate-900/80 backdrop-blur-sm shadow-md h-16 flex items-center justify-between px-4 border-b border-slate-700">
        <button onClick={onMenuClick} className="text-white p-2">
            <Bars3Icon className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-white text-lg">{title}</h1>
        <div className="w-8"></div> {/* Spacer */}
    </div>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentUser, onNavigate, onLogout, activeView, isSidebarExpanded, setIsSidebarExpanded }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    
    const isAdmin = currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor');
    const menu = isAdmin ? adminMenu : sportivMenu;
    const isGrouped = isAdmin;

    const allItems = isAdmin ? adminMenu.flatMap(g => g.items) : sportivMenu;
    const activeItem = allItems.find(item => item.view === activeView);
    const pageTitle = activeItem?.label || 'Dashboard';
    
    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsMobileOpen(false); // Close mobile menu on navigation
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <Topbar onMenuClick={() => setIsMobileOpen(true)} title={pageTitle} />

            <div
                className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileOpen(false)}
            />

            <Sidebar 
                currentUser={currentUser}
                onNavigate={handleNavigate}
                onLogout={onLogout}
                activeView={activeView}
                isExpanded={isSidebarExpanded}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
                menu={menu}
                isGrouped={isGrouped}
            />
            
            <button
                className={`hidden lg:block fixed top-5 z-40 p-1 bg-slate-800 rounded-full text-white hover:bg-brand-secondary transition-all duration-300 shadow-lg ${isSidebarExpanded ? 'left-[15.2rem]' : 'left-[4.2rem]'}`}
                onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                title={isSidebarExpanded ? "Restrânge meniul" : "Extinde meniul"}
             >
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isSidebarExpanded ? 'rotate-90' : '-rotate-90'}`} />
            </button>

            <main className={`flex-1 transition-all duration-300 p-4 md:p-8 lg:pt-8 pt-20 ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {children}
            </main>
        </div>
    );
};