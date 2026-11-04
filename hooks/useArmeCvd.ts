import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Arma, Competitie } from '../types';
import {
  incarcaArme, incarcaDrepturiArme, incarcaArmeSportivi, incarcaStagiiLaArma,
} from '../services/armeCvdService';

type MapSet = Map<string, Set<string>>;
interface Stare {
  arme: Arma[]; drepturi: MapSet; implicit: MapSet; competitieArme: MapSet;
  stagii: Map<string, Map<string, number>>;
}
const GOL: Stare = { arme: [], drepturi: new Map(), implicit: new Map(), competitieArme: new Map(), stagii: new Map() };

export function useArmeCvd(competitie: Competitie, sportivIds: string[], enabled: boolean) {
  const [stare, setStare] = useState<Stare>(GOL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const competitieId = competitie?.id;
  // cheie stabila: evita refetch cand parintele recreeaza array-ul cu aceleasi id-uri
  const cheie = useMemo(() => [...sportivIds].sort().join(','), [sportivIds]);
  const idsRef = useRef<string[]>([]);
  idsRef.current = sportivIds;

  const incarca = useCallback(async (esteAnulat: () => boolean) => {
    const ids = idsRef.current;
    setLoading(true);
    const [a, d, s, g] = await Promise.all([
      incarcaArme(), incarcaDrepturiArme(), incarcaArmeSportivi(competitieId, ids), incarcaStagiiLaArma(ids),
    ]);
    if (esteAnulat()) return;
    setError([a, d, s, g].map(r => r.error).filter(Boolean).join('; ') || null);
    const imp = s.data?.implicit ?? new Map();
    const comp = new Map(s.data?.competitie ?? []);
    // sportivii fara rand pe competitie primesc local setul implicit (fara scriere in DB)
    for (const id of ids) if (!comp.has(id) && imp.has(id)) comp.set(id, new Set(imp.get(id)));
    setStare({
      arme: a.data ?? [], drepturi: d.data ?? new Map(), implicit: imp, competitieArme: comp, stagii: g.data ?? new Map(),
    });
    setLoading(false);
  }, [competitieId]);

  useEffect(() => {
    if (!enabled || !competitieId) { setStare(GOL); setLoading(false); return; }
    let cancelled = false;
    incarca(() => cancelled);
    return () => { cancelled = true; };
  }, [enabled, competitieId, cheie, incarca]);

  const reload = useCallback(async () => {
    if (enabled && competitieId) await incarca(() => false);
  }, [enabled, competitieId, incarca]);

  return useMemo(() => ({ ...stare, loading, error, reload }), [stare, loading, error, reload]);
}
