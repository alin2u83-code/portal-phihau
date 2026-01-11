import React, { useState, useEffect } from 'react';
import { User, View } from '../types';
import { adminMenu, sportivMenu, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, UserCircleIcon } from './icons';
import { logoPhiHau } from '../assets/logo';

const NavItem: React.FC<{
    item: MenuItem;
    isExpanded: boolean;
    isActive: boolean;
    onNavigate: (view: View) => void;
    activeView: View;
}> = ({ item, isExpanded, isActive, onNavigate, activeView }) => {
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

    useEffect(() => {
        if (isActive) {
            setIsSubmenuOpen(true);
        }
    }, [isActive]);

    const hasSubmenu = item.submenu && item.submenu.length > 0;

    const handleClick = () => {
        if (hasSubmenu) {
            setIsSubmenuOpen(!isSubmenuOpen);
        } else if (item.view) {
            onNavigate(item.view);
        }
    };

    const baseClasses = "flex items-center p-2 text-white rounded-md cursor-pointer transition-colors duration-200";
    const activeClasses = isActive ? "bg-brand-secondary text-white shadow-lg" : "hover:bg-white/10";

    return (
        <div>
            <div
                onClick={handleClick}
                className={`${baseClasses} ${activeClasses} w-full`}
                title={!isExpanded ? item.label : ''}
            >
                <item.icon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                {isExpanded && (
                     <span className="flex-1 font-semibold">{item.label}</span>
                )}
                {isExpanded && hasSubmenu && (
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                )}
            </div>
            {isExpanded && hasSubmenu && isSubmenuOpen && (
                <div className="pl-6 mt-1 space-y-1">
                    {item.submenu?.map(subItem => (
                        <div
                            key={subItem.view}
                            onClick={() => onNavigate(subItem.view)}
                            className={`block p-2 text-sm rounded-md cursor-pointer transition-colors ${subItem.view === activeView ? 'bg-brand-secondary/50 font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                        >
                            {subItem.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface SidebarProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    activeView: View;
    isExpanded: boolean;
    setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    isPortalView: boolean;
    onViewOwnPortal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onNavigate, onLogout, activeView, isExpanded, setIsExpanded, isPortalView }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    
    const menu = isPortalView ? sportivMenu : adminMenu;

    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsMobileOpen(false);
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-brand-primary text-white shadow-xl">
            <div className="flex items-center justify-center p-4 border-b border-white/10" onClick={() => handleNavigate('dashboard')}>
                 <img 
                    src={`data:image/svg+xml;base64,${logoPhiHau}`} 
                    alt="Club Logo" 
                    className="h-12 w-12 cursor-pointer transform hover:scale-110 transition-transform" 
                />
            </div>
            
            <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
                {menu.map(item => {
                     const isActive = item.view === activeView || (item.submenu?.some(s => s.view === activeView) ?? false);
                     return <NavItem key={item.label} item={item} isExpanded={isExpanded} isActive={isActive} onNavigate={handleNavigate} activeView={activeView} />
                })}
            </nav>

            <div className="p-3 border-t border-white/10">
                <div className={`flex items-center p-2 rounded-md ${isExpanded ? 'bg-black/20' : ''}`}>
                    <UserCircleIcon className={`h-8 w-8 shrink-0 text-brand-secondary ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                    {isExpanded && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate">{currentUser.nume} {currentUser.prenume}</p>
                            <p className="text-xs text-slate-400 truncate">{currentUser.roluri.map(r => r.nume).join(', ')}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center p-2 mt-2 text-white rounded-md hover:bg-red-600/50 transition-colors"
                    title={!isExpanded ? "Deconectare" : ""}
                >
                    <ArrowRightOnRectangleIcon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                    {isExpanded && <span className="font-semibold">Deconectare</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <div className="lg:hidden fixed top-0 left-0 w-full z-40 bg-slate-900/80 backdrop-blur-sm shadow-md h-16 flex items-center justify-between px-4">
                <button onClick={() => setIsMobileOpen(true)} className="text-white p-2">
                    <Bars3Icon className="w-6 h-6" />
                </button>
                 <img src={`data:image/svg+xml;base64,${logoPhiHau}`} alt="Club Logo" className="h-10 w-10" />
                <div className="w-8"></div>
            </div>
            
            <div
                className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileOpen(false)}
            />
            
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-300 ease-in-out lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {sidebarContent}
            </aside>
            
            <aside className={`hidden lg:block fixed top-0 left-0 h-full z-30 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}>
                {sidebarContent}
            </aside>
             <button
                className={`hidden lg:block fixed top-4 z-40 p-1 bg-white/10 rounded-full text-white hover:bg-brand-secondary transition-all duration-300 ${isExpanded ? 'left-[15.2rem]' : 'left-[4.2rem]'}`}
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Restrânge meniul" : "Extinde meniul"}
             >
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : '-rotate-90'}`} />
            </button>
        </>
    );
};