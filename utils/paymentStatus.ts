import { Plata } from '../types';

// ─── Tipuri ──────────────────────────────────────────────────────────────────

export type PaymentDisplayStatus =
  | 'Achitat'
  | 'Achitat Parțial'
  | 'Anulat'            // factură anulată (soft) — nu mai e de încasat
  | 'Scadent Critic'   // restant 30+ zile
  | 'Scadent'          // restant 1-29 zile
  | 'Neachitat';       // viitor sau scadent azi

// ─── Config badge-uri ─────────────────────────────────────────────────────────

export const STATUS_DISPLAY_CONFIG: Record<
  PaymentDisplayStatus,
  { cls: string; label: string; dotCls: string }
> = {
  'Achitat': {
    cls: 'bg-green-600/20 text-green-400 border-green-600/50',
    dotCls: 'bg-green-400',
    label: 'Achitat',
  },
  'Achitat Parțial': {
    cls: 'bg-amber-600/20 text-amber-400 border-amber-600/50',
    dotCls: 'bg-amber-400',
    label: 'Parțial',
  },
  'Anulat': {
    cls: 'bg-slate-700/20 text-slate-500 border-slate-600/50 line-through',
    dotCls: 'bg-slate-600',
    label: 'Anulat',
  },
  'Neachitat': {
    cls: 'bg-slate-600/20 text-slate-300 border-slate-600/50',
    dotCls: 'bg-slate-400',
    label: 'Neachitat',
  },
  'Scadent': {
    cls: 'bg-red-600/20 text-red-400 border-red-600/50',
    dotCls: 'bg-red-400',
    label: 'Scadent',
  },
  'Scadent Critic': {
    cls: 'bg-red-950/60 text-red-300 border-red-700/50',
    dotCls: 'bg-red-300 animate-pulse',
    label: 'Restant!',
  },
};

// ─── Funcție calcul status vizual ─────────────────────────────────────────────

/**
 * Calculează statusul vizual al unei plăți, diferențiind plățile restante
 * (data scadentă trecută) de cele viitoare sau scadente azi.
 *
 * @param plata  - obiectul plată (trebuie să aibă `status` și `data`)
 * @param zileToleranță - nr. de zile grație după data scadentă (implicit 0)
 */
export function getDisplayStatus(
  plata: Pick<Plata, 'status' | 'data'>,
  zileToleranță = 0
): PaymentDisplayStatus {
  if (plata.status === 'Achitat') return 'Achitat';
  if (plata.status === 'Achitat Parțial') return 'Achitat Parțial';
  // Anulat trebuie verificat înaintea oricărui calcul de scadență — altfel o
  // factură anulată ar fi afișată greșit ca "Scadent"/"Restant!".
  if (plata.status === 'Anulat') return 'Anulat';

  const dataScadenta = new Date(plata.data.toString().slice(0, 10));
  if (isNaN(dataScadenta.getTime())) return 'Neachitat';

  const azi = new Date();
  azi.setHours(0, 0, 0, 0);
  dataScadenta.setHours(0, 0, 0, 0);

  const diffZile = Math.floor(
    (azi.getTime() - dataScadenta.getTime()) / 86_400_000
  );

  if (diffZile > 30) return 'Scadent Critic';
  if (diffZile > zileToleranță) return 'Scadent';
  return 'Neachitat';
}

/** Returnează numărul de zile de întârziere (0 dacă nu e restantă) */
export function getDaysOverdue(plata: Pick<Plata, 'status' | 'data'>): number {
  if (plata.status === 'Achitat' || plata.status === 'Anulat') return 0;
  const dataScadenta = new Date(plata.data.toString().slice(0, 10));
  if (isNaN(dataScadenta.getTime())) return 0;
  const azi = new Date();
  azi.setHours(0, 0, 0, 0);
  dataScadenta.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((azi.getTime() - dataScadenta.getTime()) / 86_400_000));
}

/** Adevărat dacă factura a fost anulată (soft). */
export function esteAnulata(p: Pick<Plata, 'status'>): boolean {
  return p.status === 'Anulat';
}

/**
 * Adevărat dacă factura este încă de încasat (apare în totaluri de restanțe/de încasat).
 *
 * Predicatul vechi `status !== 'Achitat'` include din greșeală facturile anulate
 * în sumele de încasat — o factură 'Anulat' nu mai reprezintă o datorie.
 * Folosește acest helper peste tot unde se agregă bani sau se contorizează restanțe.
 */
export function esteDeIncasat(p: Pick<Plata, 'status'>): boolean {
  return p.status !== 'Achitat' && p.status !== 'Anulat';
}
