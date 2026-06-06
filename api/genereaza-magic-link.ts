import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";

function sanitize(str: string): string {
    return (str || '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]/g, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return res.status(500).json({ error: 'Serverul nu este configurat corect.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const { sportiv_id, roles } = req.body;

    if (!sportiv_id) {
        return res.status(400).json({ error: 'sportiv_id este obligatoriu.' });
    }

    try {
        const { data: sportiv, error: sportivError } = await supabaseAdmin
            .from('sportivi')
            .select('id, nume, prenume, club_id, email, user_id')
            .eq('id', sportiv_id)
            .single();

        if (sportivError || !sportiv) {
            return res.status(404).json({ error: 'Sportivul nu a fost găsit.' });
        }

        if (sportiv.user_id) {
            return res.status(400).json({ error: 'Sportivul are deja un cont activ.' });
        }

        const prenume = sanitize(sportiv.prenume);
        const nume = sanitize(sportiv.nume);
        const username = `${prenume}.${nume}`;

        // Găsește email provizoriu disponibil
        let tempEmail = `${username}@frqkd.ro`;
        for (let i = 1; i < 100; i++) {
            const { data: existing } = await supabaseAdmin
                .from('sportivi')
                .select('id')
                .eq('email', tempEmail)
                .maybeSingle();
            if (!existing) break;
            tempEmail = `${username}.${i}@frqkd.ro`;
        }

        // Creează user în Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: tempEmail,
            email_confirm: true,
            user_metadata: {
                nume: sportiv.nume,
                prenume: sportiv.prenume,
                full_name: `${sportiv.prenume} ${sportiv.nume}`,
                username,
            }
        });

        if (authError) throw authError;
        const userId = authData.user.id;

        // Asociază roluri și profil sportiv via RPC
        const rolesToAssign = roles || ['SPORTIV'];
        const { error: rpcError } = await supabaseAdmin.rpc('refactor_create_user_account', {
            p_nume: sportiv.nume,
            p_prenume: sportiv.prenume,
            p_email: tempEmail,
            p_username: username,
            p_club_id: sportiv.club_id,
            p_roles: rolesToAssign,
            p_user_id: userId,
            p_additional_data: {
                data_nasterii: '1900-01-01',
                status: 'Activ',
                data_inscrierii: new Date().toISOString().split('T')[0],
            }
        });

        if (rpcError) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            throw rpcError;
        }

        // Actualizează sportivul cu user_id și email provizoriu
        await supabaseAdmin
            .from('sportivi')
            .update({ user_id: userId, trebuie_schimbata_parola: true, email: tempEmail })
            .eq('id', sportiv_id);

        // Generează magic link
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: tempEmail,
        });

        if (linkError) throw linkError;

        res.json({
            success: true,
            link: linkData.properties?.action_link,
            username,
            tempEmail,
        });
    } catch (error: any) {
        console.error('Error generating magic link:', error);
        res.status(500).json({ error: error.message });
    }
}
