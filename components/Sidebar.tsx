import React, { useState, useMemo, useEffect } from 'react';
import { User, View, MenuItem } from '../types';
import { ArrowRightOnRectangleIcon, ChevronDownIcon, UserCircleIcon } from './icons';

const NavItem: React.FC<{
    item: MenuItem;
    isExpanded: boolean;
    activeView: View;
    onNavigate: (view: View) => void;
}> = ({ item, isExpanded, activeView, onNavigate }) => {
    const isParent = !!item.submenu;
    const isChildActive = useMemo(() => isParent && item.submenu.some(sub => sub.view === activeView), [isParent, item.submenu, activeView]);
    const isActive = !isParent ? item.view === activeView : isChildActive;

    const [isOpen, setIsOpen] = useState(isChildActive);

    useEffect(() => {
        if (isChildActive) {
            setIsOpen(true);
        }
    }, [isChildActive]);
    
    // Auto-close if sidebar collapses, unless a child is active
    useEffect(() => {
        if (!isExpanded && !isChildActive) {
            setIsOpen(false);
        }
    }, [isExpanded, isChildActive]);

    const handleClick = () => {
        if (isParent) {
            if (isExpanded) setIsOpen(!isOpen);
        } else if (item.view) {
            onNavigate(item.view);
        }
    };
    
    const baseClasses = "flex items-center w-full text-sm rounded-md cursor-pointer transition-colors duration-200 relative";
    const paddingClasses = isExpanded ? "px-3 py-2.5" : "h-10 justify-center";
    const activeClasses = isActive && !isParent
        ? "bg-white/10 text-white font-semibold"
        : (isChildActive ? "text-sky-300" : "text-slate-200 hover:bg-white/10 hover:text-white");
    
    const itemTitle = !isExpanded ? item.label : '';

    return (
        <div>
            <a onClick={handleClick} className={`${baseClasses} ${paddingClasses} ${activeClasses}`} title={itemTitle}>
                {isActive && !isParent && <div className="absolute left-0 h-full w-1 bg-brand-secondary rounded-r-full"></div>}
                <item.icon className="h-5 w-5 shrink-0" />
                {isExpanded && <span className="flex-1 text-left ml-3">{item.label}</span>}
                {isExpanded && isParent && <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
            </a>
            {isExpanded && isParent && isOpen && (
                <div className="pl-4 mt-1 space-y-1 ml-4 border-l border-white/10">
                    {item.submenu.map(subItem => (
                        <NavItem
                            key={subItem.label}
                            item={subItem}
                            isExpanded={isExpanded}
                            activeView={activeView}
                            onNavigate={onNavigate}
                        />
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
    isMobileOpen: boolean;
    menu: MenuItem[];
}

const SidebarContent: React.FC<Omit<SidebarProps, 'isMobileOpen' | 'setIsMobileOpen'>> = ({ currentUser, onNavigate, onLogout, activeView, isExpanded, menu }) => {
    
    const userRoles = currentUser.roluri.map(r => r.nume);
    const hasRole = (item: MenuItem) => !item.roles || item.roles.some(r => userRoles.includes(r));

    return (
        <div className="flex flex-col h-full bg-brand-primary text-white">
            <div className="flex items-center justify-start px-4 border-b border-white/10 h-16 shrink-0">
                {isExpanded && <h1 className="text-md font-semibold tracking-tight text-white">Club Sportiv Phi Hau Iasi</h1>}
            </div>
            
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {menu.map(item => {
                    if (!hasRole(item)) return null;
                    if(item.submenu) {
                        const visibleSubItems = item.submenu.filter(hasRole);
                        if(visibleSubItems.length === 0) return null;
                        return <NavItem key={item.label} item={{...item, submenu: visibleSubItems}} isExpanded={isExpanded} activeView={activeView} onNavigate={onNavigate} />;
                    }
                    return <NavItem key={item.label} item={item} isExpanded={isExpanded} activeView={activeView} onNavigate={onNavigate} />;
                })}
            </nav>

            <div className="p-2 border-t border-white/10">
                <a
                    onClick={() => onNavigate(currentUser.roluri.some(r => r.nume !== 'Sportiv') ? 'user-management' : 'editare-profil-personal')}
                    className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${isExpanded ? 'bg-black/20 hover:bg-black/40' : 'hover:bg-white/10'}`}
                >
                    <UserCircleIcon className="h-8 w-8 shrink-0 text-brand-secondary" />
                    {isExpanded && (
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-semibold truncate">{currentUser.nume} {currentUser.prenume}</p>
                            <p className="text-xs text-slate-300 truncate">{currentUser.roluri.map(r => r.nume).join(', ')}</p>
                        </div>
                    )}
                </a>
                <a
                    onClick={onLogout}
                    className="w-full flex items-center p-2 mt-2 text-slate-300 rounded-md hover:bg-red-600/50 hover:text-white transition-colors cursor-pointer"
                    title={!isExpanded ? "Deconectare" : ""}
                >
                    <ArrowRightOnRectangleIcon className={`h-6 w-6 shrink-0 ${isExpanded ? '' : 'mx-auto'}`} />
                    {isExpanded && <span className="ml-3 font-semibold text-left">Deconectare</span>}
                </a>
            </div>
        </div>
    );
};


interface FullSidebarProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    activeView: View;
    isExpanded: boolean;
    isMobileOpen: boolean;
    setIsMobileOpen: (isOpen: boolean) => void;
    menu: MenuItem[];
}

export const Sidebar: React.FC<FullSidebarProps> = (props) => {
    const { isMobileOpen } = props;
    
    return (
        <>
            {/* Mobile Sidebar (Slide-out) */}
            <aside className={`fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-300 ease-in-out lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 <SidebarContent {...props} isExpanded={true} />
            </aside>
            
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:block fixed top-0 left-0 h-full z-30 transition-all duration-300 bg-brand-primary ${props.isExpanded ? 'w-64' : 'w-20'}`}>
                <SidebarContent {...props} />
            </aside>
        </>
    );
};