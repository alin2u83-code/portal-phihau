import React, { useMemo, useState } from 'react';
import { Competitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, Grad } from '../../types';
import { Button, Card, Badge } from '../ui';
import { participantiFaraCategorie, cheieRand } from '../../utils/categoriiAdmin';
import { categorieEticheta } from './constants';

export interface FaraCategoriePanelProps {
  competitie: Competitie;
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  grade: Grad[];
  poateRealoca: boolean;
  onRealoca: (selectie: { tip: 'inscriere' | 'echipa'; id: string }[]) => void;
}

export const FaraCategoriePanel: React.FC<FaraCategoriePanelProps> = ({ competitie, categorii, inscrieri, echipe, grade, poateRealoca, onRealoca }) => {
  const rows = useMemo(
    () => participantiFaraCategorie({ categorii, inscrieri, echipe, grade, competitie }),
    [categorii, inscrieri, echipe, grade, competitie],
  );
  const [sel, setSel] = useState<Set<string>>(new Set());

  if (rows.length === 0) return null;

  const toate = rows.every(r => sel.has(cheieRand(r)));
  const toggle = (k: string) => setSel(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleToate = () => setSel(toate ? new Set() : new Set(rows.map(cheieRand)));
  const realoca = () => {
    onRealoca(rows.filter(r => sel.has(cheieRand(r))).map(r => ({ tip: r.tip, id: r.id })));
    setSel(new Set());
  };

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[var(--t-text)]">Fără categorie (de realocat) — {rows.length}</h3>
          <p className="text-xs text-slate-400 mt-1">
            Înscrieri rămase pe categorii anulate sau restructurate. Taxa lor nu mai e datorată până la realocare; taxele deja achitate se reportează.
          </p>
        </div>
        {poateRealoca && (
          <Button variant="primary" size="sm" disabled={sel.size === 0} onClick={realoca}>
            Realocă selectate ({sel.size})
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 border-b border-[var(--t-border)]">
              {poateRealoca && (
                <th className="py-2 pr-2 w-8">
                  <input type="checkbox" checked={toate} onChange={toggleToate} aria-label="Selectează toate" />
                </th>
              )}
              <th className="py-2 pr-2">Nume</th>
              <th className="py-2 pr-2">Club</th>
              <th className="py-2 pr-2">Grad</th>
              <th className="py-2 pr-2 hidden md:table-cell">Quyen</th>
              <th className="py-2 pr-2">Categoria anterioară</th>
              <th className="py-2">Taxă</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const k = cheieRand(r);
              const cat = categorii.find(c => c.id === r.categorieId);
              const et = cat ? categorieEticheta(cat, categorii) : null;
              return (
                <tr key={k} className="border-b border-[var(--t-border)] last:border-0 align-top">
                  {poateRealoca && (
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={sel.has(k)} onChange={() => toggle(k)} aria-label={`Selectează ${r.nume}`} />
                    </td>
                  )}
                  <td className="py-2 pr-2">
                    <div className="font-semibold uppercase">{r.nume}</div>
                    {r.tip === 'echipa' && r.membri.length > 0 && (
                      <div className="text-xs text-slate-400">{r.membri.map(m => `${m.nume} ${m.prenume}`).join(', ')}</div>
                    )}
                  </td>
                  <td className="py-2 pr-2">{r.clubNume}</td>
                  <td className="py-2 pr-2">{r.gradNume}</td>
                  <td className="py-2 pr-2 hidden md:table-cell">{r.quyen || '—'}</td>
                  <td className="py-2 pr-2">
                    {cat ? `#${cat.numar_categorie} · ${cat.denumire ?? ''}` : '—'}
                    {et && <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${et.clasa}`}>{et.text}</span>}
                  </td>
                  <td className="py-2">
                    {r.taxaAchitata ? <Badge variant="blue">Achitată — de realocat</Badge> : <Badge variant="slate">Anulată</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
