import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Inlantuire } from '../types';

export function useInlantuiri() {
  const [inlantuiri, setInlantuiri] = useState<Inlantuire[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inlantuiri')
      .select('id, denumire, ordine, activ')
      .order('ordine');
    if (!error) setInlantuiri((data ?? []) as Inlantuire[]);
    setLoading(false);
    return error;
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addInlantuire = async (values: Pick<Inlantuire, 'denumire' | 'ordine' | 'activ'>) => {
    const { data, error } = await supabase
      .from('inlantuiri')
      .insert(values)
      .select('id, denumire, ordine, activ')
      .single();
    if (!error && data) setInlantuiri(prev => [...prev, data as Inlantuire].sort((a, b) => a.ordine - b.ordine));
    return error;
  };

  const updateInlantuire = async (id: string, values: Partial<Pick<Inlantuire, 'denumire' | 'ordine' | 'activ'>>) => {
    const { error } = await supabase.from('inlantuiri').update(values).eq('id', id);
    if (!error) setInlantuiri(prev => prev.map(i => i.id === id ? { ...i, ...values } : i).sort((a, b) => a.ordine - b.ordine));
    return error;
  };

  const deleteInlantuire = async (id: string) => {
    const { error } = await supabase.from('inlantuiri').delete().eq('id', id);
    if (!error) setInlantuiri(prev => prev.filter(i => i.id !== id));
    return error;
  };

  return { inlantuiri, loading, refetch: fetch, addInlantuire, updateInlantuire, deleteInlantuire };
}
