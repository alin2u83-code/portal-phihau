import { supabase } from '../supabaseClient';
import type { AuditLogEntry } from '../types';

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

export interface AuditLogFilters {
  userId?: string;
  clubId?: string;
  dataStart?: string;
  dataEnd?: string;
  operatie?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAuditLog(filters: AuditLogFilters): Promise<{ data: AuditLogEntry[]; error: any }> {
  if (!supabase) return { data: [], error: 'Supabase neinitializat' };
  let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false });
  if (filters.userId) query = query.eq('user_id', filters.userId);
  if (filters.clubId) query = query.eq('club_id', filters.clubId);
  if (filters.operatie) query = query.eq('operatie', filters.operatie);
  if (filters.dataStart) query = query.gte('created_at', filters.dataStart);
  if (filters.dataEnd) query = query.lte('created_at', filters.dataEnd);
  query = query.range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50) - 1);
  const { data, error } = await query;
  return { data: (data as AuditLogEntry[]) ?? [], error };
}
