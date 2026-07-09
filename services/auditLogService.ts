import { supabase } from '../supabaseClient';
import type { AuditLogEntry, LoginSession, TraficProfil } from '../types';

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

export interface SessionEventFilters {
  userId?: string;
  dataStart?: string;
  dataEnd?: string;
  limit?: number;
}

export async function fetchSessionEvents(filters: SessionEventFilters): Promise<{ data: AuditLogEntry[]; error: any }> {
  if (!supabase) return { data: [], error: 'Supabase neinitializat' };
  let query = supabase
    .from('audit_log')
    .select('*')
    .in('operatie', ['LOGIN', 'LOGOUT'])
    .order('created_at', { ascending: true });
  if (filters.userId) query = query.eq('user_id', filters.userId);
  if (filters.dataStart) query = query.gte('created_at', filters.dataStart);
  if (filters.dataEnd) query = query.lte('created_at', filters.dataEnd);
  query = query.limit(filters.limit ?? 1000);
  const { data, error } = await query;
  return { data: (data as AuditLogEntry[]) ?? [], error };
}

export function deriveSessions(events: AuditLogEntry[]): LoginSession[] {
  const sortate = [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const evenimentePerUser: Record<string, AuditLogEntry[]> = {};
  for (const ev of sortate) {
    if (!ev.user_id) continue;
    if (!evenimentePerUser[ev.user_id]) evenimentePerUser[ev.user_id] = [];
    evenimentePerUser[ev.user_id].push(ev);
  }

  const sesiuni: LoginSession[] = [];

  for (const userId of Object.keys(evenimentePerUser)) {
    let sesiuneDeschisa: { login_at: string } | null = null;

    for (const ev of evenimentePerUser[userId]) {
      if (ev.operatie === 'LOGIN') {
        if (sesiuneDeschisa) {
          // Login nou fara logout intre ele -> inchide precedenta ca necunoscuta
          sesiuni.push({ user_id: userId, login_at: sesiuneDeschisa.login_at, logout_at: null, durata_secunde: null });
        }
        sesiuneDeschisa = { login_at: ev.created_at };
      } else if (ev.operatie === 'LOGOUT') {
        if (sesiuneDeschisa) {
          const loginTime = new Date(sesiuneDeschisa.login_at).getTime();
          const logoutTime = new Date(ev.created_at).getTime();
          const durata_secunde = Math.round((logoutTime - loginTime) / 1000);
          sesiuni.push({ user_id: userId, login_at: sesiuneDeschisa.login_at, logout_at: ev.created_at, durata_secunde });
          sesiuneDeschisa = null;
        }
        // LOGOUT fara LOGIN deschis anterior -> ignora (nu exista sesiune de inchis)
      }
    }

    if (sesiuneDeschisa) {
      sesiuni.push({ user_id: userId, login_at: sesiuneDeschisa.login_at, logout_at: null, durata_secunde: null });
    }
  }

  return sesiuni.sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());
}

export function deriveTrafic(sessions: LoginSession[]): TraficProfil[] {
  const agregat: Record<string, TraficProfil> = {};

  for (const sesiune of sessions) {
    if (!agregat[sesiune.user_id]) {
      agregat[sesiune.user_id] = { user_id: sesiune.user_id, nr_sesiuni: 0, timp_total_secunde: 0 };
    }
    agregat[sesiune.user_id].nr_sesiuni += 1;
    if (sesiune.durata_secunde != null) {
      agregat[sesiune.user_id].timp_total_secunde += sesiune.durata_secunde;
    }
  }

  return Object.values(agregat).sort((a, b) => b.timp_total_secunde - a.timp_total_secunde);
}
