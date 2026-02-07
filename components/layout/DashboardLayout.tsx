import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { usePermissions } from '../../hooks/usePermissions';
import { X, Menu, LogOut, RefreshCw } from 'lucide-react';
import { adminMenu } from '../menuConfig';

const NavItem: React.FC<{ item: any; isExpanded: boolean; onClick?: () => void }> = ({ item, isExpanded, onClick }) => {
    const location = useLocation();
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    
    const isActive = useMemo(() => {
        const checkPath = (path: string) => location.pathname === `/${path}` || location.pathname.startsWith(`/${path}/`);
        if (hasSubmenu) {
            return item.submenu.some((sub: any) => checkPath(sub.view));
        }
        return item.view ? checkPath(item.view) : false;
    }, [location.pathname, item]);

    React.useEffect(() => {
        if (isActive) {
            setIsSubmenuOpen(true);
        }
    }, [isActive]);

    const handleItemClick = (e: React.MouseEvent) => {
        if (hasSubmenu) {
            e.preventDefault();
            setIsSubmenuOpen(prev => !prev);
        } else if (onClick) {
            onClick();
        }
    };

    const linkContent = (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
            <item.icon className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="font-semibold text-sm truncate">{item.label}</span>}
        </div>
    );
    
    return (
        <div>
            <NavLink to={item.view || '#'} onClick={handleItemClick}>
                {linkContent}
            </NavLink>
            {isExpanded && hasSubmenu && isSubmenuOpen && (
                <div className="pl-8 mt-1 space-y-1">
                    {item.submenu.map((sub: any) => (
                        <NavLink key={sub.view} to={`/${sub.view}`} onClick={onClick} className={({isActive}) => `block px-3 py-1.5 rounded-md text-sm transition-colors ${isActive ? 'font-semibold text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}>{sub.label}</NavLink>
                    ))}
                </div>
            )}
        </div>
    );
};

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userDetails: currentUser, logout } = useAuthStore();
    const permissions = usePermissions(currentUser);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = useMemo(() => {
        return adminMenu.filter(item => !item.permission || item.permission(permissions)).map(item => ({
            ...item,
            submenu: item.submenu?.filter(sub => !sub.permission || sub.permission(permissions)),
        }));
    }, [permissions]);

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
             <div className="p-4 border-b border-slate-700 h-16 flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                    <svg viewBox="0 0 100 100" className="w-6 h-6 text-amber-400"><path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="8" fill="none" /><circle cx="50" cy="50" r="15" fill="currentColor" /></svg>
                </div>
                {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-white">Phi Hau</span>}
            </div>
            <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                {menuItems.map(item => <NavItem key={item.label} item={item} isExpanded={isSidebarOpen} onClick={() => setIsMobileMenuOpen(false)} />)}
            </nav>
            <div className="p-3 border-t border-slate-700 space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" onClick={() => window.location.reload()}>
                    <RefreshCw className="w-5 h-5" />
                    {isSidebarOpen && <span className="font-medium text-sm">Sincronizare</span>}
                </button>
                <button onClick={() => logout()} className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                    <LogOut className="w-5 h-5" />
                    {isSidebarOpen && <span className="font-medium text-sm">Deconectare</span>}
                </button>
            </div>
        </div>
    );
    
    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex flex-col bg-[#1e293b] border-r border-slate-700 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <SidebarContent />
            </aside>
            {/* Mobile Sidebar (Drawer) */}
            <div className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'bg-black/60' : 'bg-transparent pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)} />
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col lg:hidden transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarContent />
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-[#1e293b]/50 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:block p-2 rounded-full hover:bg-slate-700/50"><Menu className="w-5 h-5" /></button>
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-full hover:bg-slate-700/50"><Menu className="w-5 h-5" /></button>
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
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
