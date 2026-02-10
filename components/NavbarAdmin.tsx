import React, { useState, useRef, useEffect } from 'react';
import { User, View, Permissions } from '../types';
import { ChevronDownIcon, CogIcon, ArrowRightOnRectangleIcon, HomeIcon, SitemapIcon, UserCircleIcon } from './icons';

interface NavbarAdminProps {
    currentUser: User;
    permissions: Permissions;
    onNavigate: (view: View) => void;
    onLogout: () => void;
}

const MenuItem: React.FC<{ label: string; icon: React.ElementType; onClick: () => void }> = ({ label, icon: Icon, onClick }) => (
    <button onClick={onClick} className="flex items-center w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors">
        <Icon className="w-5 h-5 mr-3" />
        <span>{label}</span>
    </button>
);

export const NavbarAdmin: React.FC<NavbarAdminProps> = ({ currentUser, permissions, onNavigate, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const initials = (currentUser.nume?.[0] || '') + (currentUser.prenume?.[0] || '');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(p => !p)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-700/50 transition-colors"
            >
                <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-slate-800 font-bold text-sm">
                    {initials}
                </div>
                <ChevronDownIcon className={`hidden sm:block w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-card)] rounded-lg shadow-2xl border border-[var(--border-color)] z-50 animate-fade-in-down">
                    <div className="p-3 border-b border-[var(--border-color)]">
                        <p className="text-sm font-semibold text-white truncate">{currentUser.nume} {currentUser.prenume}</p>
                        <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                    </div>
                    
                    <div className="p-2 space-y-1">
                        {permissions.isSportiv && (
                             <MenuItem label="Portalul Meu" icon={UserCircleIcon} onClick={() => handleNavigate('my-portal')} />
                        )}
                        {permissions.hasAdminAccess && (
                            <MenuItem label="Dashboard Admin" icon={HomeIcon} onClick={() => handleNavigate('dashboard')} />
                        )}
                        {permissions.isMultiContextAdmin && (
                             <MenuItem label="Schimbă Context" icon={SitemapIcon} onClick={() => handleNavigate('admin-console')} />
                        )}
                        <MenuItem label="Setări Cont" icon={CogIcon} onClick={() => handleNavigate('account-settings')} />
                    </div>

                    <div className="p-2 border-t border-[var(--border-color)]">
                         <button onClick={onLogout} className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300 rounded-md transition-colors">
                            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                            <span>Deconectare</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};