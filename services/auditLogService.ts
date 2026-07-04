import { supabase } from '../supabaseClient';

export async function logAuditEvent(params: {
  operatie: 'LOGIN' | 'LOGOUT' | 'ROL_SCHIMBAT';
  userId: string | null;
  clubId?: string | null;
  roleContextId?: string | null;
  dateNoi?: Record<string, any>;
}): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('audit_log').insert({
      user_id: params.userId,
      club_id: params.clubId ?? null,
      role_context_id: params.roleContextId ?? null,
      tabel: 'auth',
      operatie: params.operatie,
      date_noi: params.dateNoi ?? null,
      sursa: 'auth',
    });
  } catch {
    // Logarea nu trebuie sa blocheze fluxul de auth — esec silentios
  }
}
