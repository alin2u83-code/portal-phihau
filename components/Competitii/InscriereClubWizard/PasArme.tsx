import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { useError } from '../../ErrorProvider';
import { formatNume } from '../../../utils/formatareSportiv';
import { gradEfectivLaData } from '../../../utils/eligibilitateCompetitie';
import {
  motivCombinatieInterzisa, categoriePentruArma, conflicteCategorie, armeStale, avertismentStagii,
} from '../../../utils/armeCvd';
import { salveazaArmeCompetitie, incarcaCerinteStagii } from '../../../services/armeCvdService';
import type { useArmeCvd } from '../../../hooks/useArmeCvd';
import type { PasArmeProps, ArmeAlese } from './types';

type Cerinte = Array<{ grad_min_ordine: number; grad_max_ordine: number; stagii_nationale: number }>;
const GOL = new Set<string>();
const egale = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x));

const PasArme: React.FC<PasArmeProps & { arme: ReturnType<typeof useArmeCvd> }> = ({
  competitie, sportivi, grade, categorii, inscrieri, armeAlese, onChange, canEdit, onContinua, onBack, arme,
}) => {
  const { showError } = useError();
  const [draft, setDraft] = useState<ArmeAlese>(armeAlese);
  const [implicit, setImplicit] = useState<Set<string>>(new Set());
  const [salveaza, setSalveaza] = useState(false);
  const [cerinte, setCerinte] = useState<Cerinte>([]);

  // sportivii ale caror salvare a esuat: la resincronizarea cu armeAlese isi pastreaza editarile nesalvate
  const esuatiRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    setDraft(prev => {
      const n = new Map(armeAlese);
      for (const id of esuatiRef.current) if (prev.has(id)) n.set(id, prev.get(id)!);
      return n;
    });
  }, [armeAlese]);
  useEffect(() => {
    let anulat = false;
    incarcaCerinteStagii().then(({ data }) => { if (!anulat && data) setCerinte(data); });
    return () => { anulat = true; };
  }, []);

  const armePeId = useMemo(() => new Map(arme.arme.map(a => [a.id, a])), [arme.arme]);

  // per sportiv: grad efectiv, arme disponibile (drept pe grad + categorie existenta) si categoria fiecareia
  const randuri = useMemo(() => [...sportivi]
    .sort((a, b) => formatNume(a).localeCompare(formatNume(b), 'ro'))
    .map(s => {
      const grad = gradEfectivLaData(s, grade, competitie.data_inceput);
      const ordine = grad?.ordine ?? 0;
      const drept = (grad && arme.drepturi.get(grad.id)) || GOL;
      const categoriePe = new Map<string, ReturnType<typeof categoriePentruArma>>();
      for (const a of arme.arme) {
        if (a.activ && drept.has(a.id)) categoriePe.set(a.id, categoriePentruArma(a, s, ordine, competitie.data_inceput, categorii, arme.arme));
      }
      const disponibile = arme.arme.filter(a => categoriePe.get(a.id));
      return { s, grad, ordine, disponibile, categoriePe, doarCitire: s.status !== 'Activ' };
    }), [sportivi, grade, competitie.data_inceput, arme.arme, arme.drepturi, categorii]);

  const avertismente = useMemo(() => {
    const out: Array<{ cheie: string; text: string }> = [];
    const peCategorie = new Map<string, { nume: string; n: number }>();
    for (const r of randuri) {
      const alese = draft.get(r.s.id) ?? GOL;
      for (const id of alese) {
        const a = armePeId.get(id);
        if (!a) continue;
        const cat = r.categoriePe.get(id);
        if (cat) {
          const x = peCategorie.get(cat.id) ?? { nume: cat.denumire, n: 0 };
          x.n++; peCategorie.set(cat.id, x);
        }
        const nr = arme.stagii.get(r.s.id)?.get(a.denumire.trim().toLowerCase()) ?? 0;
        const t = avertismentStagii(r.ordine, nr, cerinte);
        if (t) out.push({ cheie: `st-${r.s.id}-${id}`, text: `${formatNume(r.s)} · ${a.denumire}: ${t}` });
      }
    }
    for (const [id, x] of peCategorie) {
      if (x.n > 3) out.push({ cheie: `cat-${id}`, text: `Peste 3 sportivi per club la categoria ${x.nume} (${x.n})` });
    }
    return out;
  }, [randuri, draft, armePeId, arme.stagii, cerinte]);

  const modificati = randuri.filter(r => !r.doarCitire && !egale(draft.get(r.s.id) ?? GOL, armeAlese.get(r.s.id) ?? GOL));

  const toggle = (sportivId: string, armaId: string) => {
    const next = new Map(draft);
    const set = new Set(next.get(sportivId) ?? []);
    if (!set.delete(armaId)) set.add(armaId);
    next.set(sportivId, set);
    setDraft(next);
  };

  const salveazaTot = async () => {
    setSalveaza(true);
    const reusite: string[] = [];
    try {
      for (const r of modificati) {
        const { error } = await salveazaArmeCompetitie(competitie.id, r.s.id, [...(draft.get(r.s.id) ?? [])], implicit.has(r.s.id));
        if (error) { showError('Armele nu au fost salvate', `${formatNume(r.s)}: ${error}`); break; }
        reusite.push(r.s.id);
      }
      await arme.reload();
      // doar cei salvati cu succes intra in armeAlese; esuatii isi pastreaza draftul (esuatiRef) si raman in modificati
      esuatiRef.current = new Set(modificati.filter(r => !reusite.includes(r.s.id)).map(r => r.s.id));
      if (reusite.length) {
        const next = new Map(armeAlese);
        for (const id of reusite) next.set(id, new Set(draft.get(id) ?? []));
        onChange(next);
      }
    } finally { setSalveaza(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5"><ArrowLeftIcon className="w-4 h-4" /></Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white leading-tight">Arme sportivi</h2>
          <p className="text-xs text-slate-400 mt-0.5">{competitie.denumire}</p>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-lg border border-slate-600 bg-slate-800/40 px-4 py-3 text-xs text-slate-300">
          Armele pot fi modificate doar de administratorul clubului, cât timp înscrierile sunt deschise. Aici sunt doar în citire.
        </div>
      )}
      {arme.loading && <p className="text-sm text-slate-400">Se încarcă armele...</p>}

      {avertismente.length > 0 && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-900/15 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-amber-400">Atenție (nu blochează salvarea):</p>
          {avertismente.map(w => <p key={w.cheie} className="text-xs text-amber-300">{w.text}</p>)}
        </div>
      )}

      <div className="space-y-2">
        {randuri.map(({ s, grad, ordine, disponibile, categoriePe, doarCitire }) => {
          const alese = draft.get(s.id) ?? GOL;
          const editabil = canEdit && !doarCitire;
          const stale = new Set(armeStale([...alese], disponibile.map(a => a.id)));
          const bifate = disponibile.filter(a => alese.has(a.id));
          const conflictCat = new Set(conflicteCategorie(bifate.map(a => ({ armaId: a.id, categorieId: categoriePe.get(a.id)?.id ?? null }))));
          const perechiInvalide: string[] = [];
          for (let i = 0; i < bifate.length; i++) for (let j = i + 1; j < bifate.length; j++) {
            const m = motivCombinatieInterzisa(bifate[i], bifate[j], ordine);
            if (m) perechiInvalide.push(`${bifate[i].denumire} + ${bifate[j].denumire}: ${m}`);
          }
          const chip = (a: typeof arme.arme[number], esteStale: boolean) => {
            const bifata = alese.has(a.id);
            const blocata = inscrieri.some(i => i.sportiv_id === s.id && i.arma_id === a.id && i.taxa_achitata && i.status?.toLowerCase() !== 'retras');
            let motiv: string | null = null;
            if (!bifata) {
              for (const b of bifate) {
                const catA = categoriePe.get(a.id)?.id;
                motiv = motivCombinatieInterzisa(a, b, ordine)
                  ?? (catA && catA === categoriePe.get(b.id)?.id ? `Aceeași categorie ca ${b.denumire}` : null);
                if (motiv) break;
              }
            }
            const dezactivat = !editabil || blocata || !!motiv;
            return (
              <label key={a.id} title={motiv ?? undefined}
                className={`inline-flex flex-col rounded-lg border px-2.5 py-1.5 text-xs ${
                  bifata ? 'border-brand-primary bg-brand-primary/20 text-white' : 'border-slate-600 text-slate-300'
                } ${dezactivat && !bifata ? 'opacity-50' : ''} ${esteStale ? 'opacity-60 border-dashed' : ''} ${dezactivat ? 'cursor-default' : 'cursor-pointer'}`}>
                <span className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={bifata} disabled={dezactivat} onChange={() => toggle(s.id, a.id)} />
                  {blocata && <span aria-hidden>🔒</span>}
                  {a.denumire}
                </span>
                {blocata && <span className="text-[10px] text-slate-400">înscris și achitat — nu se mai poate schimba</span>}
                {motiv && <span className="text-[10px] text-amber-400">{motiv}</span>}
                {esteStale && <span className="text-[10px] text-amber-400">nu mai e permisă (gradul s-a schimbat)</span>}
                {bifata && !esteStale && conflictCat.has(a.id) && <span className="text-[10px] text-amber-400">aceeași categorie ca altă armă aleasă</span>}
              </label>
            );
          };
          const stalePeArme = [...stale].map(id => armePeId.get(id)).filter((a): a is NonNullable<typeof a> => !!a);
          return (
            <div key={s.id} className="rounded-xl border border-slate-600 bg-slate-800/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-white">
                  {formatNume(s)} <span className="text-xs font-normal text-slate-400">{grad?.nume ?? 'fără grad'}{doarCitire ? ' · inactiv (doar citire)' : ''}</span>
                </p>
                {editabil && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={implicit.has(s.id)}
                      onChange={e => setImplicit(p => { const n = new Set(p); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })} />
                    Salvează ca implicit
                  </label>
                )}
              </div>
              {perechiInvalide.length > 0 && (
                <div className="rounded-md border border-amber-700/50 bg-amber-900/15 px-2 py-1">
                  {perechiInvalide.map(t => <p key={t} className="text-[11px] text-amber-300">Combinație nepermisă — {t}</p>)}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {disponibile.map(a => chip(a, false))}
                {stalePeArme.map(a => chip(a, true))}
                {disponibile.length === 0 && stalePeArme.length === 0 && <span className="text-xs text-slate-500 italic">Nicio armă disponibilă pentru acest grad / vârstă.</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 justify-end flex-wrap">
        {canEdit && (
          <Button variant="success" onClick={salveazaTot} disabled={salveaza || modificati.length === 0}>
            {salveaza ? 'Se salvează...' : `Salvează armele${modificati.length ? ` (${modificati.length})` : ''}`}
          </Button>
        )}
        <Button variant="secondary" onClick={onContinua}>Continuă</Button>
      </div>
    </div>
  );
};

export default PasArme;
