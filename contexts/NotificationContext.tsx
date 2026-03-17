import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';

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

    const fetchNotifications = useCallback(async () => {
        if (!currentUser?.user_id || !supabase) return;

        const { data, error } = await supabase
            .from('notificari')
            .select('*')
            .eq('recipient_user_id', currentUser.user_id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            setNotifications(data);
        }
    }, [currentUser?.user_id]);

    useEffect(() => {
        fetchNotifications();

        if (!currentUser?.user_id || !supabase) return;

        const channel = supabase.channel(`user-notifications-${currentUser.user_id}`)
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notificari', 
                    filter: `recipient_user_id=eq.${currentUser.user_id}` 
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
                    filter: `recipient_user_id=eq.${currentUser.user_id}` 
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
    }, [currentUser?.user_id, fetchNotifications]);

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
