import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Inlantuire } from '../../../types';
import { incarcaFormeCvd } from '../../../services/armeCvdService';
import { Button } from '../../ui';
import BannerDeRezolvat from './BannerDeRezolvat';

import { ArrowLeftIcon } from '../../icons';
import { useError } from '../../ErrorProvider';
import { formatNume } from '../../../utils/formatareSportiv';
import { gradEfectivLaData } from '../../../utils/eligibilitateCompetitie';
import type { Pas2ArmeProps, FormaPerArma } from './types';

const seteaza = (base: FormaPerArma, sportivId: string, armaId: string, val: string): FormaPerArma => {
  const next = new Map(base);
  const m = new Map(next.get(sportivId) ?? []);
  if (val) m.set(armaId, val); else m.delete(armaId);
  next.set(sportivId, m);
  return next;
};

// CVD Pas2: per sportiv, o sectiune per arma aleasa, cu formele armei permise gradului efectiv (o forma per arma)
const Pas2Arme: React.FC<Pas2ArmeProps> = ({
  competitie, sportivi, grade, arme, armeAlese, categoriePerArma, formaPerArma, inscrieri = [], onChange, onContinua, onBack, bannerLipsuri,
}) => {
  const { showError } = useError();
  const [dreptMap, setDreptMap] = useState<Map<string, Inlantuire[]>>(new Map()); // gradId -> forme (toate armele)
  const [loading, setLoading] = useState(true);
  const autoDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    incarcaFormeCvd().then(({ data, error }) => {
      if (cancelled) return;
      if (error) showError('Incarcare drepturi grad', error);
      else if (data) setDreptMap(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [showError]);

  const armePeId = useMemo(() => new Map(arme.map(a => [a.id, a])), [arme]);

  // per sportiv: sectiuni (arma, categorie, optiuni) doar pentru armele alese
  const randuri = useMemo(() => [...sportivi]
    .sort((a, b) => formatNume(a).localeCompare(formatNume(b), 'ro'))
    .map(s => {
      const grad = gradEfectivLaData(s, grade, competitie.data_inceput);
      const toate = grad ? (dreptMap.get(grad.id) ?? []) : [];
      const sectiuni = [...(armeAlese.get(s.id) ?? [])]
        .map(id => armePeId.get(id))
        .filter((a): a is NonNullable<typeof a> => !!a)
        .sort((a, b) => a.ordine - b.ordine)
        .map(a => ({
          arma: a,
          categorie: categoriePerArma.get(s.id)?.get(a.id) ?? null,
          opts: toate.filter(f => f.arma_id === a.id),
        }));
      return { s, sectiuni };
    }), [sportivi, grade, competitie.data_inceput, dreptMap, armeAlese, armePeId, categoriePerArma]);

  // o singura optiune -> se alege automat, o data (nu suprascrie alegeri existente)
  useEffect(() => {
    if (loading || autoDone.current || randuri.length === 0) return;
    autoDone.current = true;
    let next = formaPerArma;
    let schimbat = false;
    for (const r of randuri) for (const sec of r.sectiuni) {
      if (blocata(r.s.id, sec.arma.id)) continue;
      if (sec.categorie && sec.opts.length === 1 && !next.get(r.s.id)?.get(sec.arma.id)) {
        next = seteaza(next, r.s.id, sec.arma.id, sec.opts[0].id); schimbat = true;
      }
    }
    if (schimbat) onChange(next);
  }, [loading, randuri, formaPerArma, onChange]);

  const blocata = (sportivId: string, armaId: string) =>
    inscrieri.some(i => i.sportiv_id === sportivId && i.arma_id === armaId && i.taxa_achitata && i.status?.toLowerCase() !== 'retras');

  const handleBulk = () => {
    let next = formaPerArma;
    for (const r of randuri) for (const sec of r.sectiuni) {
      if (blocata(r.s.id, sec.arma.id)) continue;
      if (sec.categorie && sec.opts.length > 0) next = seteaza(next, r.s.id, sec.arma.id, sec.opts[0].id);
    }
    onChange(next);
  };

  const { total, complet } = useMemo(() => {
    let t = 0, c = 0;
    for (const r of randuri) for (const sec of r.sectiuni) {
      if (!sec.categorie) continue;
      t++;
      if (sec.opts.some(f => f.id === formaPerArma.get(r.s.id)?.get(sec.arma.id))) c++;
    }
    return { total: t, complet: c };
  }, [randuri, formaPerArma]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white leading-tight">Forme pe arme</h2>
        </div>
        <div className="text-right shrink-0 text-xs text-slate-500">{complet}/{total} complet</div>
      </div>

      <BannerDeRezolvat items={bannerLipsuri ?? []} />
      {loading ? (
        <div className="text-center text-xs text-slate-500 py-8 animate-pulse">Se incarca formele...</div>
      ) : randuri.length === 0 ? (
        <div className="text-center text-slate-500 py-10 italic text-sm">Niciun sportiv selectat.</div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={handleBulk}>Prima opțiune la toți</Button>
          </div>
          <div className="space-y-3">
            {randuri.map(({ s, sectiuni }) => (
              <div key={s.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 space-y-2">
                <div className="font-semibold text-white text-sm">{formatNume(s)}</div>
                {sectiuni.length === 0 && <div className="text-xs text-yellow-400">Nicio armă aleasă.</div>}
                {sectiuni.map(({ arma, categorie, opts }) => (
                  <div key={arma.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                    <div className="sm:w-1/2 min-w-0">
                      <div className="text-sm text-slate-200">{blocata(s.id, arma.id) && <span aria-hidden>🔒 </span>}{arma.denumire}</div>
                      <div className="text-xs text-slate-500 truncate">{categorie ? categorie.denumire : 'Nicio categorie potrivită'}</div>
                    </div>
                    <select
                      value={opts.find(f => f.id === formaPerArma.get(s.id)?.get(arma.id))?.id ?? ''}
                      disabled={!categorie || opts.length === 0 || blocata(s.id, arma.id)}
                      title={blocata(s.id, arma.id) ? 'Înscris și achitat — forma nu se mai poate schimba' : undefined}
                      onChange={e => blocata(s.id, arma.id) ? undefined : onChange(seteaza(formaPerArma, s.id, arma.id, e.target.value))}
                      className="w-full sm:w-1/2 min-h-[40px] bg-slate-900 border border-slate-600 rounded-lg px-2 text-sm text-white disabled:opacity-50"
                    >
                      <option value="">{opts.length === 0 ? 'Nicio formă disponibilă' : '— alege forma —'}</option>
                      {opts.map(f => <option key={f.id} value={f.id}>{f.denumire}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-2 pb-2 md:pb-4 -mx-4 px-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">{total - complet > 0 ? `${total - complet} forme nealese` : ''}</span>
        <Button variant="success" onClick={onContinua} className="min-w-[140px]">Continuă</Button>
      </div>
    </div>
  );
};

export default Pas2Arme;
