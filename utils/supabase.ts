import { Session } from '@supabase/supabase-js';

/**
 * Cleans a Supabase session object by converting string 'null' values to actual null.
 * This is useful before inserting/updating data to avoid UUID type errors in Postgres.
 * @param session The session object to clean.
 * @returns A new session object with cleaned values.
 */
export const cleanSessionForSupabase = (session: Session): Session => {
  const cleanedSession: Session = { ...session };

  for (const key in cleanedSession) {
    if (Object.prototype.hasOwnProperty.call(cleanedSession, key)) {
      const value = (cleanedSession as any)[key];
      if (typeof value === 'string' && value.toLowerCase() === 'null') {
        (cleanedSession as any)[key] = null;
      }
    }
  }

  return cleanedSession;
};
