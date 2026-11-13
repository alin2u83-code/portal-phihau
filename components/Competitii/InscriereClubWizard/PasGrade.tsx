import React, { useMemo, useState } from 'react';
import { Button, Badge } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { calculeazaVarstaLaData } from '../../../utils/eligibilitateCompetitie';
import { formatNume } from '../../../utils/formatareSportiv';
import type { Competitie, Grad, Sportiv } from '../../../types';
import SchimbaGradCompetitieModal from './SchimbaGradCompetitieModal';

interface Props {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  onGradSchimbat: (sportivId: string, gradId: string) => void;
  onContinua: () => void;
  onBack: () => void;
}

// Faza 40: primul pas al reprezentantului: grade sportivi (cu echivalarea la 13 ani) inainte de arme si probe.
const PasGrade: React.FC<Props> = ({ competitie, sportivi, grade, onGradSchimbat, onContinua, onBack }) => {
  const [sportivGrad, setSportivGrad] = useState<Sportiv | null>(null);
  const [doarDeActualizat, setDoarDeActualizat] = useState(false);

  const randuri = useMemo(() => [...sportivi]
    .sort((a, b) => formatNume(a).localeCompare(formatNume(b), 'ro'))
    .map(s => {
      const grad = grade.find(g => g.id === s.grad_actual_id);
      const varsta = s.data_nasterii ? calculeazaVarstaLaData(s.data_nasterii, competitie.data_inceput) : null;
      // aceeasi regula ca in RPC previzualizeaza_schimbare_grad (ordine 6..14 la 13 ani -> 1 Cap Albastru)
      const deActualizat = varsta !== null && varsta >= 13 && !!grad && grad.ordine >= 6 && grad.ordine <= 14;
      return { s, grad, varsta, deActualizat };
    }), [sportivi, grade, competitie.data_inceput]);

  const nrDeActualizat = randuri.filter(r => r.deActualizat).length;
  const vizibile = doarDeActualizat ? randuri.filter(r => r.deActualizat) : randuri;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Înapoi" className="p-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/50">
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-base font-semibold text-white">Pasul 1: Grade sportivi</h3>
          <p className="text-xs text-slate-400">
            Verifică gradele înainte de arme și probe. La 13 ani, gradele 1 Câp Roșu … C.V. 4 Câp Alb se echivalează cu 1 Câp Albastru, fără cost.
          </p>
        </div>
      </div>

      {nrDeActualizat > 0 ? (
        <div className="rounded-lg border border-amber-700/50 bg-amber-900/15 px-4 py-3 text-xs text-amber-300 flex items-center justify-between gap-3 flex-wrap">
          <span>{nrDeActualizat} {nrDeActualizat === 1 ? 'sportiv are' : 'sportivi au'} 13 ani la competiție și pot fi echivalați la 1 Câp Albastru.</span>
          <button type="button" onClick={() => setDoarDeActualizat(v => !v)} className="underline">
            {doarDeActualizat ? 'Arată toți sportivii' : 'Arată doar aceștia'}
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-green-700/40 bg-green-900/10 px-4 py-3 text-xs text-green-300">Nu există sportivi de echivalat.</div>
      )}

      <div className="space-y-2">
        {vizibile.map(({ s, grad, varsta, deActualizat }) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-600 bg-slate-800/40 px-3 py-2.5 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{formatNume(s)}</p>
              <p className="text-xs text-slate-400">{varsta !== null ? `${varsta} ani` : 'vârstă necunoscută'} · {grad?.nume ?? 'fără grad'}</p>
            </div>
            <div className="flex items-center gap-2">
              {deActualizat && <Badge variant="amber">Echivalare disponibilă</Badge>}
              <button
                type="button"
                onClick={() => setSportivGrad(s)}
                className="text-xs px-2.5 py-1.5 rounded border border-slate-600 text-slate-300 hover:bg-slate-700/50 min-h-9"
              >Schimbă grad</button>
            </div>
          </div>
        ))}
        {vizibile.length === 0 && <p className="text-sm text-slate-500 italic">Niciun sportiv de afișat.</p>}
      </div>

      <div className="flex justify-end">
        <Button variant="success" onClick={onContinua}>Continuă</Button>
      </div>

      <SchimbaGradCompetitieModal
        sportiv={sportivGrad}
        competitieId={competitie.id}
        grade={grade}
        onClose={() => setSportivGrad(null)}
        onSaved={(id, gradId) => onGradSchimbat(id, gradId)}
      />
    </div>
  );
};

export default PasGrade;
