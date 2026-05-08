import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface AsociereGrad {
  id: string;
  inlantuire_id: string;
  grade_id: string;
  tip_proba: string;
}

export function useInlantuiriGrade(inlantuireId: string | null) {
  const [asocieri, setAsocieri] = useState<AsociereGrad[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!inlantuireId) { setAsocieri([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('inlantuiri_grade')
      .select('id, inlantuire_id, grade_id, tip_proba')
      .eq('inlantuire_id', inlantuireId);
    if (!error) setAsocieri((data ?? []) as AsociereGrad[]);
    setLoading(false);
  }, [inlantuireId]);

  useEffect(() => { fetch(); }, [fetch]);

  const isActive = (grade_id: string, tip_proba: string) =>
    asocieri.some(a => a.grade_id === grade_id && a.tip_proba === tip_proba);

  const toggle = async (grade_id: string, tip_proba: string) => {
    if (!inlantuireId) return null;
    const existing = asocieri.find(a => a.grade_id === grade_id && a.tip_proba === tip_proba);
    if (existing) {
      const { error } = await supabase.from('inlantuiri_grade').delete().eq('id', existing.id);
      if (!error) setAsocieri(prev => prev.filter(a => a.id !== existing.id));
      return error;
    } else {
      const { data, error } = await supabase
        .from('inlantuiri_grade')
        .insert({ inlantuire_id: inlantuireId, grade_id, tip_proba })
        .select('id, inlantuire_id, grade_id, tip_proba')
        .single();
      if (!error && data) setAsocieri(prev => [...prev, data as AsociereGrad]);
      return error;
    }
  };

  return { asocieri, loading, isActive, toggle, refetch: fetch };
}
