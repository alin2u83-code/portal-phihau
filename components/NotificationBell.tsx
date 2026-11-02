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
            <button onClick={handleOpen} aria-label="Notificări" className="relative flex items-center justify-center h-11 w-11 lg:h-9 lg:w-9 rounded-lg transition-colors text-[var(--t-text-muted)] hover:text-[var(--t-text)] hover:bg-[var(--t-surface-2)]">
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-1 -right-1 rounded-full min-w-4 h-4 px-1 text-center text-white text-xs font-semibold leading-4"
                        style={{ background: 'var(--t-status-danger)' }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] rounded-xl shadow-lg border border-[var(--border-color)] z-50 animate-fade-in-down overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--t-surface-2)]">
                        <h3 className="font-semibold text-[var(--t-text)] text-sm">
                            Notificări
                            {unreadCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-white text-xs font-semibold rounded-full" style={{ background: 'var(--t-status-danger)' }}>{unreadCount}</span>
                            )}
                        </h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAll}
                                    className="text-xs text-[var(--t-primary)] hover:opacity-80 transition-opacity font-semibold"
                                >
                                    Marchează toate citite
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-[var(--t-border)]">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`px-4 py-3 transition-colors ${!n.is_read ? 'bg-[var(--t-surface-2)]' : 'hover:bg-[var(--t-surface-2)]'}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            {!n.is_read && (
                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--t-primary)] mr-1.5 mb-0.5 align-middle" />
                                            )}
                                            <span className="text-sm font-semibold text-[var(--t-text)]">{n.title || (n as any).titlu || 'Notificare'}</span>
                                            <p className="text-sm text-[var(--t-text-muted)] mt-0.5 leading-snug">{n.body || (n as any).message}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {(n as any).metadata?.sender_name && (
                                                    <span className="text-xs text-[var(--t-text-muted)]">
                                                        De la: <span className="text-[var(--t-text)] font-semibold">{(n as any).metadata.sender_name}</span>
                                                    </span>
                                                )}
                                                <span className="text-xs text-[var(--t-text-muted)]">{timeAgo(n.created_at)}</span>
                                            </div>
                                        </div>
                                        {!n.is_read && (
                                            <button
                                                onClick={() => markAsRead(n.id)}
                                                className="shrink-0 p-1 text-[var(--t-text-muted)] hover:text-[var(--t-primary)] transition-colors mt-0.5"
                                                title="Marchează ca citit"
                                            >
                                                <CheckCircleIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="p-6 text-center text-sm text-[var(--t-text-muted)]">Nicio notificare.</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-[var(--border-color)] bg-[var(--t-surface-2)]">
                        <button
                            onClick={handleOpenNotificari}
                            className="w-full text-xs text-[var(--t-primary)] hover:opacity-80 transition-opacity font-semibold text-center"
                        >
                            Trimite anunț →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
