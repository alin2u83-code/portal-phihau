import React from 'react';
import { User, View } from '../types';
import { CogIcon, UserCircleIcon, HomeIcon, ArrowRightOnRectangleIcon } from './icons';

interface AdminProfileQuickAccessProps {
  user: User;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  isExpanded: boolean;
}

export const AdminProfileQuickAccess: React.FC<AdminProfileQuickAccessProps> = ({ user, onNavigate, onLogout, isExpanded }) => {
    return (
        <div 
            className="absolute bottom-full mb-2 w-56 rounded-md shadow-lg bg-slate-700 ring-1 ring-black ring-opacity-5 z-50 animate-fade-in-down"
            style={{ right: isExpanded ? '0.75rem' : 'auto', left: isExpanded ? 'auto' : '0.75rem' }}
        >
            <div className="py-1">
                <div className="px-4 py-3 border-b border-slate-600">
                    <p className="text-sm font-semibold text-white truncate">{user.nume} {user.prenume}</p>
                    <p className="text-xs text-slate-400 truncate">{user.roluri.map(r => r.nume).join(', ')}</p>
                </div>
                <div className="py-1">
                    <button
                        onClick={() => onNavigate('my-portal')}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-brand-primary hover:text-white transition-colors"
                    >
                        <HomeIcon className="w-5 h-5 mr-3" />
                        Portalul Meu
                    </button>
                    <button
                        onClick={() => onNavigate('user-management')}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-brand-primary hover:text-white transition-colors"
                    >
                        <UserCircleIcon className="w-5 h-5 mr-3" />
                        Setări Cont
                    </button>
                    <button
                        onClick={() => onNavigate('data-maintenance')}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-brand-primary hover:text-white transition-colors"
                    >
                        <CogIcon className="w-5 h-5 mr-3" />
                        Gestiune Date
                    </button>
                </div>
                <div className="py-1 border-t border-slate-600">
                     <button
                        onClick={onLogout}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                        Deconectare
                    </button>
                </div>
            </div>
        </div>
    );
};
