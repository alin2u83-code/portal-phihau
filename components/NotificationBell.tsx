import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { BellIcon, CheckCircleIcon } from './icons';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigation } from '../contexts/NavigationContext';

function timeAgo(date: string) {
    const seconds = Math.floor((new Date().getTime() - new Date((date || '').toString().slice(0, 19)).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} ani`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} luni`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)} zile`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)} ore`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)} min`;
    return `acum`;
}

export const NotificationBell: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const { setActiveView } = useNavigation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpen = () => setIsOpen(prev => !prev);

    const handleMarkAll = async () => {
        const unread = notifications.filter(n => !n.is_read);
        for (const n of unread) await markAsRead(n.id);
    };

    const handleOpenNotificari = () => {
        setIsOpen(false);
        setActiveView('notificari');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={handleOpen} className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700">
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 justify-center items-center text-[9px] text-white font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-color)] z-50 animate-fade-in-down overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-slate-800/50">
                        <h3 className="font-bold text-white text-sm">
                            Notificări
                            {unreadCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">{unreadCount}</span>
                            )}
                        </h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAll}
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                                >
                                    Marchează toate citite
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/50">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`px-4 py-3 transition-colors ${!n.is_read ? 'bg-indigo-500/5' : 'hover:bg-slate-800/30'}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            {!n.is_read && (
                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5 mb-0.5 align-middle" />
                                            )}
                                            <span className="text-sm font-bold text-slate-200">{n.title || (n as any).titlu || 'Notificare'}</span>
                                            <p className="text-sm text-slate-300 mt-0.5 leading-snug">{n.body || (n as any).message}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {(n as any).metadata?.sender_name && (
                                                    <span className="text-[10px] text-slate-500">
                                                        De la: <span className="text-slate-400 font-medium">{(n as any).metadata.sender_name}</span>
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-600">{timeAgo(n.created_at)}</span>
                                            </div>
                                        </div>
                                        {!n.is_read && (
                                            <button
                                                onClick={() => markAsRead(n.id)}
                                                className="shrink-0 p-1 text-slate-500 hover:text-indigo-400 transition-colors mt-0.5"
                                                title="Marchează ca citit"
                                            >
                                                <CheckCircleIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="p-6 text-center text-sm text-slate-400">Nicio notificare.</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-[var(--border-color)] bg-slate-800/30">
                        <button
                            onClick={handleOpenNotificari}
                            className="w-full text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium text-center"
                        >
                            Trimite anunț →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
