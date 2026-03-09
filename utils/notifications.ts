import { supabase } from '../supabaseClient';

export interface NotificationPayload {
    recipient_user_id: string;
    title: string;
    body: string;
    sent_by?: string;
    sender_sportiv_id?: string;
    type?: string;
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
            type: payload.type || 'system'
        });

        if (error) throw error;

        // In-app notification saved successfully. 
        // Push notifications via Edge Functions are disabled in this environment 
        // to prevent "Failed to send a request to the Edge Function" errors.
        
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
            type: p.type || 'system'
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
