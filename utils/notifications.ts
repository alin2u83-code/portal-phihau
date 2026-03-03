import { supabase } from '../supabaseClient';

export interface NotificationPayload {
    recipient_user_id: string;
    title: string;
    body: string;
    sent_by?: string;
    sender_sportiv_id?: string;
    type?: string;
    metadata?: any;
}

export const sendNotification = async (payload: NotificationPayload) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };

    try {
        const { error } = await supabase.from('notificari').insert({
            recipient_user_id: payload.recipient_user_id,
            title: payload.title,
            body: payload.body,
            sent_by: payload.sent_by || null,
            sender_sportiv_id: payload.sender_sportiv_id || null,
            type: payload.type || 'system',
            metadata: payload.metadata || {}
        });

        if (error) throw error;

        // Optionally trigger push notification via Edge Function
        try {
            await supabase.functions.invoke('send-push-notifications', {
                body: { 
                    title: payload.title, 
                    body: payload.body,
                    userId: payload.recipient_user_id
                },
            });
        } catch (pushErr) {
            console.warn('Push notification failed, but in-app notification was saved:', pushErr);
        }

        return { success: true };
    } catch (err: any) {
        console.error('Error sending notification:', err);
        return { success: false, error: err.message };
    }
};

export const sendBulkNotifications = async (payloads: NotificationPayload[]) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };

    try {
        const { error } = await supabase.from('notificari').insert(payloads.map(p => ({
            recipient_user_id: p.recipient_user_id,
            title: p.title,
            body: p.body,
            sent_by: p.sent_by || null,
            sender_sportiv_id: p.sender_sportiv_id || null,
            type: p.type || 'system',
            metadata: p.metadata || {}
        })));

        if (error) throw error;

        // For bulk, we might want a different edge function or just skip push for now
        // to avoid rate limits if there are many.
        
        return { success: true };
    } catch (err: any) {
        console.error('Error sending bulk notifications:', err);
        return { success: false, error: err.message };
    }
};
