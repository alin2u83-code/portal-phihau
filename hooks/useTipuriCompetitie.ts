/**
 * useTipuriCompetitie — citește denumirile tipurilor de competiție din DB.
 * Returnează un Map<cod, denumire>.
 * Fallback la TIP_COMPETITIE_LABELS hardcodate dacă DB-ul e gol sau eroare.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { TIP_COMPETITIE_LABELS } from '../utils/competitiiTemplates';

interface TipCompetitieDB {
  cod: string;
  denumire: string;
}

export function useTipuriCompetitie(): {
  labels: Map<string, string>;
  loading: boolean;
} {
  const [labels, setLabels] = useState<Map<string, string>>(
    new Map(Object.entries(TIP_COMPETITIE_LABELS))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('tipuri_competitie')
      .select('cod, denumire')
      .eq('activ', true)
      .order('ordine')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data && data.length > 0) {
          const map = new Map<string, string>();
          for (const row of data as TipCompetitieDB[]) {
            map.set(row.cod, row.denumire);
          }
          setLabels(map);
        }
        // Dacă eroare sau DB gol, rămâne fallback-ul hardcodat
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { labels, loading };
}
