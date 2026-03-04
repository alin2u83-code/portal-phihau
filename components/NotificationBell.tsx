import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { BellIcon } from './icons';
import { useNotifications } from '../contexts/NotificationContext';

function timeAgo(date: string) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
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
    
    const handleOpen = async () => {
        const willBeOpen = !isOpen;
        setIsOpen(willBeOpen);

        if (willBeOpen && unreadCount > 0) {
            const unreadNotifications = notifications.filter(n => !n.is_read);
            for (const n of unreadNotifications) {
                await markAsRead(n.id);
            }
        }
    };
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={handleOpen} className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700">
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 justify-center items-center text-[9px] text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] rounded-lg shadow-2xl border border-[var(--border-color)] z-50 animate-fade-in-down">
                    <div className="p-3 border-b border-[var(--border-color)]">
                        <h3 className="font-bold text-white">Notificări</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div key={n.id} className={`p-3 border-b border-slate-700/50 ${!n.is_read ? 'bg-brand-primary/10' : ''}`}>
                                    <p className="text-sm font-bold text-slate-200">{n.title || (n as any).titlu || 'Notificare'}</p>
                                    <p className="text-sm text-slate-300">{n.body || (n as any).message}</p>
                                    <p className="text-xs text-slate-500 text-right mt-1">{timeAgo(n.created_at)}</p>
                                </div>
                            ))
                        ) : (
                            <p className="p-6 text-center text-sm text-slate-400">Nicio notificare.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
