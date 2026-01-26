import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import { BellIcon } from './icons';

interface Notification {
    id: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

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


export const InAppNotifications: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (!currentUser.user_id || !supabase) return;

        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('in_app_notificari')
                .select('*')
                .eq('recipient_user_id', currentUser.user_id)
                .order('created_at', { ascending: false })
                .limit(15);
            if (!error && data) {
                setNotifications(data);
            }
        };
        fetchNotifications();

        const channel = supabase.channel('in-app-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'in_app_notificari', filter: `recipient_user_id=eq.${currentUser.user_id}` },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel).catch(console.error);
        };
    }, [currentUser.user_id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleOpen = async () => {
        const willBeOpen = !isOpen;
        setIsOpen(willBeOpen);

        if (willBeOpen && unreadCount > 0) {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
            const { error } = await supabase.from('in_app_notificari').update({ is_read: true }).in('id', unreadIds);
            if (!error) {
                setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n));
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
                                    <p className="text-sm text-slate-200">{n.message}</p>
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