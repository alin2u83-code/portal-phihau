import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Inlantuire, Grad } from '../types';

export interface PivotAsociere {
  id: string;
  inlantuire_id: string;
  grade_id: string;
  tip_proba: string;
}

/**
 * Hook pentru modul matrice: încarcă grade, înlănțuiri filtrate după categorii,
 * și toate asocierile din inlantuiri_grade pentru tipul de probă dat.
 *
 * categoriiInlantuiri: array de valori `categorie` pentru filtrarea coloanelor.
 *   Ex: ['quyen'] pentru Thao Quyen / Sincron
 *       ['song_luyen'] pentru Song Luyen
 *       ['thao_lo_bong', 'thao_lo_dao', 'thao_lo_guom'] pentru Thao Lo
 *       ['arma_cvd'] pentru Arme CVD
 *
 * tipProba: valoarea din CHECK constraint pentru inlantuiri_grade.tip_proba
 */
export function useInlantuiriPivot(
  tipProba: string,
  categoriiInlantuiri: string[]
) {
  const [grade, setGrade] = useState<Grad[]>([]);
  const [inlantuiri, setInlantuiri] = useState<Inlantuire[]>([]);
  const [asocieri, setAsocieri] = useState<PivotAsociere[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [gradeRes, inlantuiriRes] = await Promise.all([
      supabase
        .from('grade')
        .select('id, nume, ordine')
        .order('ordine'),
      supabase
        .from('inlantuiri')
        .select('id, denumire, ordine, activ, categorie')
        .in('categorie', categoriiInlantuiri)
        .eq('activ', true)
        .order('ordine'),
    ]);

    const gradeData = (gradeRes.data ?? []) as Grad[];
    const inlantuiriData = (inlantuiriRes.data ?? []) as Inlantuire[];

    setGrade(gradeData);
    setInlantuiri(inlantuiriData);

    // Preluăm asocierile doar dacă avem înlănțuiri
    if (inlantuiriData.length > 0) {
      const ids = inlantuiriData.map(i => i.id);
      const { data: asocData } = await supabase
        .from('inlantuiri_grade')
        .select('id, inlantuire_id, grade_id, tip_proba')
        .in('inlantuire_id', ids)
        .eq('tip_proba', tipProba);
      setAsocieri((asocData ?? []) as PivotAsociere[]);
    } else {
      setAsocieri([]);
    }

    setLoading(false);
  }, [tipProba, categoriiInlantuiri.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isActive = (grade_id: string, inlantuire_id: string): boolean =>
    asocieri.some(a => a.grade_id === grade_id && a.inlantuire_id === inlantuire_id);

  const toggle = async (grade_id: string, inlantuire_id: string): Promise<Error | null> => {
    const existing = asocieri.find(
      a => a.grade_id === grade_id && a.inlantuire_id === inlantuire_id
    );

    if (existing) {
      const { error } = await supabase
        .from('inlantuiri_grade')
        .delete()
        .eq('id', existing.id);
      if (error) return new Error(error.message);
      setAsocieri(prev => prev.filter(a => a.id !== existing.id));
      return null;
    } else {
      const { data, error } = await supabase
        .from('inlantuiri_grade')
        .insert({ inlantuire_id, grade_id, tip_proba: tipProba })
        .select('id, inlantuire_id, grade_id, tip_proba')
        .single();
      if (error) return new Error(error.message);
      if (data) setAsocieri(prev => [...prev, data as PivotAsociere]);
      return null;
    }
  };

  return { grade, inlantuiri, asocieri, loading, isActive, toggle, refetch: fetchAll };
}
