import React, { useMemo, useState } from 'react';
import { Modal, Button, Select, Badge } from '../ui';
import { useError } from '../ErrorProvider';
import { aplicaOperatieCategorii } from '../../services/categoriiAdminService';
import {
  planAnulare, planFuziune, planImpartire, planMutare, mutariDinPlan, cheieRand, compatibile,
  type PlanOperatieCategorii, type CtxCategorii, type CriteriuImpartire,
} from '../../utils/categoriiAdmin';
import { categorieActiva, categorieEticheta } from './constants';
import type {
  Competitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, Grad,
  OperatieCategorii, RezultatOperatieCategorii,
} from '../../types';

export interface CategorieOperatieModalProps {
  operatie: OperatieCategorii;
  competitie: Competitie;
  surse: CategorieCompetitie[];                                   // anulare/impartire: 1; fuziune: >= 2; mutare: []
  selectie?: { tip: 'inscriere' | 'echipa'; id: string }[];      // mutare only
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  grade: Grad[];
  onClose: () => void;
  onDone: (rez: RezultatOperatieCategorii) => void;
}

const TITLURI: Record<OperatieCategorii, string> = {
  anulare: 'Anulează categoria',
  fuziune: 'Fuzionează categorii',
  impartire: 'Împarte categoria',
  mutare: 'Realocă înscrieri',
};
const CONFIRMARI: Record<OperatieCategorii, string> = {
  anulare: 'Confirmă anularea',
  fuziune: 'Confirmă fuziunea',
  impartire: 'Confirmă împărțirea',
  mutare: 'Confirmă realocarea',
};

const planVid: PlanOperatieCategorii = {
  operatie: 'mutare', surse: [], categoriiNoi: [], randuri: [], blocaje: [], avertismente: [], asteptat: null, taxe: null,
};

export const CategorieOperatieModal: React.FC<CategorieOperatieModalProps> = ({
  operatie, competitie, surse, selectie, categorii, inscrieri, echipe, grade, onClose, onDone,
}) => {
  const { showError, showSuccess } = useError();
  const [alegeri, setAlegeri] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const ctx: CtxCategorii = useMemo(
    () => ({ categorii, inscrieri, echipe, grade, competitie }),
    [categorii, inscrieri, echipe, grade, competitie],
  );

  const plan = useMemo<PlanOperatieCategorii>(() => {
    if (operatie === 'anulare') return planAnulare(surse[0], ctx);
    if (operatie === 'fuziune') return planFuziune(surse, ctx);
    if (operatie === 'mutare') return planMutare(selectie ?? [], ctx);
    if (operatie === 'impartire') return planImpartire(surse[0], 'varsta' as CriteriuImpartire, [], ctx);
    return planVid;
  }, [operatie, surse, selectie, ctx]);

  const rez = useMemo(
    () => (operatie === 'anulare' ? null : mutariDinPlan(plan, alegeri, ctx)),
    [operatie, plan, alegeri, ctx],
  );
  const blocaje = [...plan.blocaje, ...(rez?.blocaje ?? [])];

  const numarCategorie = (id: string) => categorii.find(c => c.id === id)?.numar_categorie ?? '?';

  const optiuniTinta = (r: (typeof plan.randuri)[number]) => {
    if (operatie === 'impartire') return plan.categoriiNoi.map(n => ({ value: n.cheie, label: n.denumire }));
    const curenta = categorii.find(c => c.id === r.categorieId);
    return categorii
      .filter(c => c.id !== r.categorieId && categorieActiva(c) && (!curenta || compatibile(curenta, c)))
      .map(c => ({ value: c.id, label: `${c.numar_categorie} · ${c.denumire}` }));
  };

  const confirma = async () => {
    setLoading(true);
    const { data, error } = await aplicaOperatieCategorii({
      operatie,
      competitieId: competitie.id,
      surse: plan.surse,
      categoriiNoi: plan.categoriiNoi,
      mutari: rez?.mutari ?? [],
      asteptat: plan.asteptat,
    });
    setLoading(false);
    if (error || !data) { showError('Operația nu a fost aplicată', error ?? 'Răspuns gol de la server'); return; }
    const noi = data.categorii_noi?.length ? `; categorii noi: ${data.categorii_noi.map(c => c.numar_categorie).join(', ')}` : '';
    const rezumat = operatie === 'anulare'
      ? `Categoria a fost anulată. ${data.taxe_anulate} taxe anulate${data.taxe_achitate_anulate > 0 ? `, ${data.taxe_achitate_anulate} achitate de realocat/returnat` : ''}`
      : `${data.inscrieri_mutate} înscrieri și ${data.echipe_mutate} echipe mutate${noi}`;
    showSuccess('Gata', rezumat);
    onDone(data);
  };

  const inchide = () => { if (!loading) onClose(); };
  const t = plan.taxe;
  const arataTinta = operatie !== 'anulare';
  const arataDin = operatie === 'fuziune' || operatie === 'mutare';

  return (
    <Modal isOpen onClose={inchide} title={TITLURI[operatie]} persistent={loading}>
      <div className="max-h-[75vh] overflow-y-auto space-y-4">
        {surse.length > 0 && (
          <div className="space-y-1">
            {surse.map(s => {
              const et = categorieEticheta(s, categorii);
              return (
                <div key={s.id} className="text-sm text-[var(--t-text)] flex flex-wrap items-center gap-2">
                  <span className="font-bold">#{s.numar_categorie} · {s.denumire}</span>
                  {et && <span className={`text-[10px] px-2 py-0.5 rounded-full ${et.clasa}`}>{et.text}</span>}
                </div>
              );
            })}
          </div>
        )}

        {(operatie === 'fuziune' || operatie === 'impartire') && plan.categoriiNoi.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Categorii noi</p>
            <ul className="space-y-0.5">
              {plan.categoriiNoi.map(n => <li key={n.cheie} className="text-sm text-[var(--t-text)]">{n.denumire}</li>)}
            </ul>
          </div>
        )}

        {operatie === 'anulare' && t && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-[var(--t-text)] space-y-1">
            <p>Taxe anulate: {t.nrNeachitate} ({t.sumaNeachitata} lei) — nu se mai plătesc.</p>
            {t.nrAchitate > 0 && (
              <p>{t.nrAchitate} taxe deja achitate ({t.sumaAchitata} lei) rămân marcate achitate: se reportează la realocare sau se returnează clubului.</p>
            )}
            <p>Înscrierile rămân «Fără categorie» până la realocare.</p>
          </div>
        )}

        {plan.avertismente.length > 0 && (
          <ul className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300 list-disc list-inside space-y-0.5">
            {plan.avertismente.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        )}
        {blocaje.length > 0 && (
          <ul className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 list-disc list-inside space-y-0.5">
            {blocaje.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}

        {plan.randuri.length === 0 ? (
          <p className="text-sm text-slate-400">Nicio înscriere activă în categorie.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-2">Nume</th>
                  <th className="py-2 pr-2">Club</th>
                  <th className="py-2 pr-2">Grad</th>
                  <th className="py-2 pr-2 hidden md:table-cell">Vârstă</th>
                  <th className="py-2 pr-2 hidden md:table-cell">Gen</th>
                  <th className="py-2 pr-2 hidden md:table-cell">Quyen</th>
                  {arataDin && <th className="py-2 pr-2">Din</th>}
                  {arataTinta && <th className="py-2 min-w-[11rem]">Către</th>}
                </tr>
              </thead>
              <tbody>
                {plan.randuri.map(r => {
                  const k = cheieRand(r);
                  const av = rez?.avertismente[k] ?? [];
                  return (
                    <React.Fragment key={k}>
                      <tr className="border-t border-[var(--t-border)] align-top text-[var(--t-text)]">
                        <td className="py-2 pr-2">
                          <p className="font-bold uppercase">{r.nume}</p>
                          {r.tip === 'echipa' && r.membri.length > 0 && (
                            <p className="text-xs text-slate-400">{r.membri.map(m => `${m.nume} ${m.prenume}`).join(', ')}</p>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-xs text-slate-400">{r.clubNume}</td>
                        <td className="py-2 pr-2">{r.gradNume}</td>
                        <td className="py-2 pr-2 hidden md:table-cell">{r.varsta ?? '—'}</td>
                        <td className="py-2 pr-2 hidden md:table-cell">{r.gen ?? '—'}</td>
                        <td className="py-2 pr-2 hidden md:table-cell">{r.quyen || '—'}</td>
                        {arataDin && <td className="py-2 pr-2">{numarCategorie(r.categorieId)}</td>}
                        {arataTinta && (
                          <td className="py-2">
                            {operatie === 'fuziune' ? (
                              <span>{plan.categoriiNoi[0]?.denumire}</span>
                            ) : (
                              <Select
                                aria-label={`Către pentru ${r.nume}`}
                                value={alegeri[k] ?? r.tinta ?? ''}
                                onChange={e => setAlegeri(p => ({ ...p, [k]: e.target.value }))}
                              >
                                <option value="">— alege —</option>
                                {optiuniTinta(r).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </Select>
                            )}
                          </td>
                        )}
                      </tr>
                      {av.length > 0 && (
                        <tr>
                          <td colSpan={8} className="pb-2 text-xs text-amber-300">{av.join(' ')}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="secondary" size="sm" onClick={inchide} disabled={loading}>Renunță</Button>
        <Button
          variant={operatie === 'anulare' ? 'danger' : 'warning'}
          size="sm"
          onClick={confirma}
          disabled={blocaje.length > 0 || loading}
          isLoading={loading}
        >
          {CONFIRMARI[operatie]}
        </Button>
      </div>
    </Modal>
  );
};
