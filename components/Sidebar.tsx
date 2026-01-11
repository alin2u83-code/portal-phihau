import React from 'react';
import { User, View } from '../types';
import { MenuGroup, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, ChevronDownIcon, UserCircleIcon } from './icons';

const NavItem: React.FC<{
    item: MenuItem;
    isExpanded: boolean;
    isActive: boolean;
    onNavigate: (view: View) => void;
}> = ({ item, isExpanded, isActive, onNavigate }) => {
    
    const handleClick = () => {
        if (item.view) {
            onNavigate(item.view);
        }
    };

    const baseClasses = "flex items-center w-full text-sm rounded-md cursor-pointer transition-colors duration-200 relative";
    const paddingClasses = isExpanded ? "px-3 py-2" : "h-10 justify-center";
    const activeClasses = isActive 
        ? "bg-white/20 text-white font-semibold" 
        : "text-slate-200 hover:bg-white/10 hover:text-white";
    const itemTitle = !isExpanded ? item.label : '';

    return (
        <a onClick={handleClick} className={`${baseClasses} ${paddingClasses} ${activeClasses}`} title={itemTitle}>
            {isActive && <div className="absolute left-0 h-6 top-1/2 -translate-y-1/2 w-1 bg-brand-secondary rounded-r-full"></div>}
            <item.icon className="h-5 w-5 shrink-0" />
            {isExpanded && <span className="flex-1 text-left ml-3">{item.label}</span>}
        </a>
    );
};

interface SidebarProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    activeView: View;
    isExpanded: boolean;
    isMobileOpen: boolean;
    menu: (MenuGroup[] | MenuItem[]);
    isGrouped: boolean;
}

const SidebarContent: React.FC<Omit<SidebarProps, 'isMobileOpen' | 'setIsMobileOpen'>> = ({ currentUser, onNavigate, onLogout, activeView, isExpanded, menu, isGrouped }) => {
    
    const userRoles = currentUser.roluri.map(r => r.nume);
    const hasRole = (item: MenuItem) => !item.roles || item.roles.some(r => userRoles.includes(r));

    return (
        <div className="flex flex-col h-full bg-brand-primary text-white">
            <div className="flex items-center justify-start px-4 border-b border-white/10 h-16 shrink-0">
                {isExpanded && <h1 className="text-md font-semibold tracking-tight text-white">Club Sportiv Phi Hau Iasi</h1>}
            </div>
            
            <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
                {isGrouped ? (
                    (menu as MenuGroup[]).map((group, index) => {
                        const visibleItems = group.items.filter(hasRole);
                        if (visibleItems.length === 0) return null;
                        
                        return (
                            <div key={group.title || index}>
                                {isExpanded && group.title && <h2 className="px-3 mb-2 mt-3 text-xs font-semibold tracking-wider text-sky-200/50 uppercase">{group.title}</h2>}
                                <div className="space-y-1">
                                    {visibleItems.map(item => (
                                        <NavItem 
                                            key={item.view} 
                                            item={item} 
                                            isExpanded={isExpanded} 
                                            isActive={item.view === activeView} 
                                            onNavigate={onNavigate} 
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="space-y-1">
                        {(menu as MenuItem[]).filter(hasRole).map(item => (
                             <NavItem 
                                key={item.view} 
                                item={item} 
                                isExpanded={isExpanded} 
                                isActive={item.view === activeView} 
                                onNavigate={onNavigate} 
                            />
                        ))}
                    </div>
                )}
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
    menu: (MenuGroup[] | MenuItem[]);
    isGrouped: boolean;
}

export const Sidebar: React.FC<FullSidebarProps> = (props) => {
    const { isMobileOpen } = props;
    
    const contentProps = { ...props };

    return (
        <>
            {/* Mobile Sidebar (Slide-out) */}
            <aside className={`fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-300 ease-in-out lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 <SidebarContent {...contentProps} isExpanded={true} />
            </aside>
            
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:block fixed top-0 left-0 h-full z-30 transition-all duration-300 bg-brand-primary ${props.isExpanded ? 'w-64' : 'w-20'}`}>
                <SidebarContent {...contentProps} />
            </aside>
        </>
    );
};