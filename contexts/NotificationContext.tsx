import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import { useAppStore } from '../src/store/useAppStore';

export interface Notification {
    id: string;
    title: string;
    body: string;
    is_read: boolean;
    created_at: string;
    metadata?: any;
    recipient_user_id: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    addNotification: (notification: Partial<Notification>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode; currentUser: User | null }> = ({ children, currentUser }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    // CR-02: nicio cerere/canal realtime inainte ca MFA sa treaca (Faza 38 D-02)
    const mfaTrecut = useAppStore(s => s.mfaContextId !== null);
    const userId = mfaTrecut ? currentUser?.user_id : undefined;

    const fetchNotifications = useCallback(async () => {
        if (!userId || !supabase) return;

        const { data, error } = await supabase
            .from('notificari')
            .select('*')
            .eq('recipient_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            setNotifications(data);
        }
    }, [userId]);

    useEffect(() => {
        fetchNotifications();

        if (!userId || !supabase) return;

        const channel = supabase.channel(`user-notifications-${userId}`)
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notificari', 
                    filter: `recipient_user_id=eq.${userId}` 
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);
                    
                    // Optional: Play a sound or show a toast
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                        new Notification(newNotif.title, { body: newNotif.body });
                    }
                }
            )
            .on(
                'postgres_changes',
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'notificari', 
                    filter: `recipient_user_id=eq.${userId}` 
                },
                (payload) => {
                    const updatedNotif = payload.new as Notification;
                    setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, fetchNotifications]);

    const markAsRead = async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase
            .from('notificari')
            .update({ is_read: true })
            .eq('id', id);
        
        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const addNotification = (notification: Partial<Notification>) => {
        // This is for optimistic updates if needed, but we mostly rely on Supabase Realtime
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationContext.Provider value={{ 
            notifications, 
            unreadCount, 
            markAsRead, 
            addNotification 
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
