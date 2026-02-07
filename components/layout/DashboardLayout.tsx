import React, { useState, useMemo, Suspense } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { Menu, LogOut, RefreshCw, X, ChevronRight } from 'lucide-react';
import { adminMenu } from '../menuConfig';
import { useLocalStorage } from '../../hooks/useLocalStorage';

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
        if (isActive) setIsSubmenuOpen(true);
    }, [isActive]);

    const handleItemClick = (e: React.MouseEvent) => {
        if (hasSubmenu) {
            e.preventDefault();
            setIsSubmenuOpen(prev => !prev);
        } else if (onClick) {
            onClick();
        }
    };

    return (
        <div className="w-full">
            <NavLink 
                to={item.view ? `/${item.view}` : '#'} 
                onClick={handleItemClick}
                className={({isActive: linkActive}) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${(isActive || linkActive) ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
                `}
            >
                <item.icon className="w-5 h-5 shrink-0" />
                {isExpanded && <span className="font-bold text-sm truncate flex-grow">{item.label}</span>}
                {isExpanded && hasSubmenu && (
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-90' : ''}`} />
                )}
            </NavLink>
            {isExpanded && hasSubmenu && isSubmenuOpen && (
                <div className="pl-12 mt-1 space-y-1 animate-fade-in-down">
                    {item.submenu.map((sub: any) => (
                        <NavLink 
                            key={sub.view} 
                            to={`/${sub.view}`} 
                            onClick={onClick}
                            className={({isActive}) => `
                                block py-2 text-sm transition-colors
                                ${isActive ? 'text-blue-400 font-bold' : 'text-slate-500 hover:text-slate-300'}
                            `}
                        >
                            {sub.label}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
};

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userDetails: currentUser, logout } = useAuthStore();
    const permissions = usePermissions(currentUser);
    const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage('sidebar-expanded', window.innerWidth > 1024);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    const menuItems = useMemo(() => {
        return adminMenu.filter(item => !item.permission || item.permission(permissions)).map(item => ({
            ...item,
            submenu: item.submenu?.filter(sub => !sub.permission || sub.permission(permissions)),
        }));
    }, [permissions]);

    const SidebarContent: React.FC<{isExpanded: boolean, onNavClick?: () => void}> = ({ isExpanded, onNavClick }) => (
        <div className="flex flex-col h-full bg-brand-card border-r border-slate-800">
            <div className="p-6 border-b border-slate-800 h-20 flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer" onClick={() => navigate('/')}>
                    <svg viewBox="0 0 100 100" className="w-6 h-6 text-amber-400"><path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="8" fill="none" /><circle cx="50" cy="50" r="15" fill="currentColor" /></svg>
                </div>
                {isExpanded && <span className="font-black text-xl tracking-tight text-white uppercase italic">Phi Hau</span>}
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                {menuItems.map(item => (
                    <NavItem 
                        key={item.label} 
                        item={item} 
                        isExpanded={isExpanded} 
                        onClick={onNavClick} 
                    />
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-900/30">
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-all"
                >
                    <RefreshCw className="w-5 h-5" />
                    {isExpanded && <span className="font-bold text-sm">Sincronizare</span>}
                </button>
                <button 
                    onClick={() => logout()} 
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    {isExpanded && <span className="font-bold text-sm">Deconectare</span>}
                </button>
            </div>
        </div>
    );
    
    return (
        <div className="flex h-screen bg-brand-dark text-slate-200 overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex flex-col transition-all duration-300 ${isSidebarExpanded ? 'w-72' : 'w-24'}`}>
                <SidebarContent isExpanded={isSidebarExpanded} />
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <div 
                className={`fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={() => setIsMobileMenuOpen(false)} 
            />
            <aside className={`fixed inset-y-0 left-0 z-[70] w-80 lg:hidden transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarContent isExpanded={true} onNavClick={() => setIsMobileMenuOpen(false)} />
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-20 bg-brand-card/30 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-6 z-50">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} 
                            className="hidden lg:flex p-2.5 rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/50"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)} 
                            className="lg:hidden p-2.5 rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/50"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="lg:hidden font-black text-xl text-white italic uppercase tracking-tighter">Phi Hau</div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right mr-2">
                            <p className="text-sm font-black text-white leading-none mb-1 uppercase">{currentUser?.nume} {currentUser?.prenume}</p>
                            <p className="text-xs text-slate-500 font-bold">{currentUser?.email}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-xl shadow-blue-600/20 border-2 border-white/10">
                            {currentUser?.nume?.[0]}{currentUser?.prenume?.[0]}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <Suspense fallback={
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    }>
                        {children}
                    </Suspense>
                </main>
            </div>
        </div>
    );
};
