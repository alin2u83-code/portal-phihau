import React, { useState, useMemo } from 'react';
import { Card, Button } from '../ui';
import type { ProdusVanzare, CerereProdusFull } from '../../types';

// ─── Tipuri locale ────────────────────────────────────────────────────────────

type RandRaport = {
  key: string;
  denumire: string;
  cantitate: number;
  venit: number;      // sum(pret_vanzare_snapshot * cantitate)
  cost: number;       // sum(pret_intrare_snapshot * cantitate)
  profit: number;     // venit - cost
  margin: number;     // profit / venit * 100 (sau 0 dacă venit=0)
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface RaportProduseProps {
  vanzari: ProdusVanzare[];
  cereri?: CerereProdusFull[];
  clubNume?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>
      <span className={`font-bold text-sm ${className}`}>{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const RaportProduse: React.FC<RaportProduseProps> = ({
  vanzari,
  cereri = [],
  clubNume = 'Club QwanKiDo',
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // ── Filtrare perioadă ──────────────────────────────────────────────────────
  const vanzariFiltrate = useMemo(() => {
    return vanzari.filter(v => {
      const d = new Date(v.data_vanzare);
      const afterStart = !startDate || d >= new Date(startDate);
      const beforeEnd = !endDate || d <= new Date(endDate);
      return afterStart && beforeEnd;
    });
  }, [vanzari, startDate, endDate]);

  // ── Calculare rânduri per produs ──────────────────────────────────────────
  const randuri = useMemo<RandRaport[]>(() => {
    const byProdus = vanzariFiltrate.reduce(
      (acc, v) => {
        v.detalii.forEach(d => {
          const key = d.denumire_snapshot;
          if (!acc[key]) {
            acc[key] = { key, denumire: key, cantitate: 0, venit: 0, cost: 0, profit: 0, margin: 0 };
          }
          acc[key].cantitate += d.cantitate;
          acc[key].venit += d.pret_vanzare_snapshot * d.cantitate;
          acc[key].cost += d.pret_intrare_snapshot * d.cantitate;
        });
        return acc;
      },
      {} as Record<string, RandRaport>
    );

    return Object.values(byProdus)
      .map(r => ({
        ...r,
        profit: r.venit - r.cost,
        margin: r.venit > 0 ? ((r.venit - r.cost) / r.venit) * 100 : 0,
      }))
      .sort((a, b) => b.venit - a.venit);
  }, [vanzariFiltrate]);

  // ── Totaluri ──────────────────────────────────────────────────────────────
  const totalCantitate = randuri.reduce((s, r) => s + r.cantitate, 0);
  const totalVenit = randuri.reduce((s, r) => s + r.venit, 0);
  const totalCost = randuri.reduce((s, r) => s + r.cost, 0);
  const totalProfit = totalVenit - totalCost;
  const totalMargin = totalVenit > 0 ? (totalProfit / totalVenit) * 100 : 0;

  // ── Filtrare cereri pe perioadă ────────────────────────────────────────────
  const cereriFiltrate = useMemo(() => {
    return cereri.filter(c => {
      const d = new Date(c.created_at);
      const afterStart = !startDate || d >= new Date(startDate);
      const beforeEnd = !endDate || d <= new Date(endDate);
      return afterStart && beforeEnd;
    });
  }, [cereri, startDate, endDate]);

  // ── Metrici comenzi ────────────────────────────────────────────────────────
  const totalCereri = cereriFiltrate.length;
  const totalPredate = cereriFiltrate.filter(c =>
    ['PREDATA', 'PLATITA'].includes(c.stare_cerere)
  ).length;
  const totalPlatite = cereriFiltrate.filter(c => c.stare_cerere === 'PLATITA').length;
  const valoareRestanta = cereriFiltrate
    .filter(c => c.stare_cerere === 'PREDATA' && !c.platit_dupa_predare)
    .reduce((sum, c) => {
      const pret = c.varianta?.pret_vanzare ?? 0;
      return sum + pret * (c.cantitate ?? 1);
    }, 0);

  // ── Export Excel ──────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.aoa_to_sheet([
      ['Produs', 'Cantitate', 'Venit (RON)', 'Cost (RON)', 'Profit (RON)', 'Margin (%)'],
      ...randuri.map(r => [
        r.denumire,
        r.cantitate,
        r.venit.toFixed(2),
        r.cost.toFixed(2),
        r.profit.toFixed(2),
        r.margin.toFixed(1),
      ]),
      [
        'TOTAL',
        totalCantitate,
        totalVenit.toFixed(2),
        totalCost.toFixed(2),
        totalProfit.toFixed(2),
        totalMargin.toFixed(1),
      ],
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Raport Produse');

    // Sheet Comenzi
    const wsComenzi = utils.aoa_to_sheet([
      ['Produs', 'Variantă', 'Sportiv', 'Cantitate', 'Stare', 'Dată'],
      ...cereriFiltrate.map(c => {
        const produs = c.varianta?.produs?.denumire ?? '—';
        const variantaParts = [
          c.varianta?.culoare ?? '',
          c.varianta?.marime ?? '',
        ].filter(Boolean);
        const varianta = variantaParts.length > 0 ? variantaParts.join(' ') : '—';
        return [
          produs,
          varianta,
          c.sportiv_nume ?? '—',
          c.cantitate ?? 1,
          c.stare_cerere,
          new Date(c.created_at).toLocaleDateString('ro-RO'),
        ];
      }),
    ]);
    utils.book_append_sheet(wb, wsComenzi, 'Comenzi');

    const suffix = startDate || endDate ? `${startDate || 'inceput'}-${endDate || 'azi'}` : 'total';
    writeFile(wb, `raport-produse-${suffix}.xlsx`);
  };

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(clubNume, 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Raport Produse — Profit Brut', 14, 21);

    const perioadaText =
      startDate && endDate
        ? `Perioadă: ${startDate} — ${endDate}`
        : startDate
        ? `De la: ${startDate}`
        : endDate
        ? `Până la: ${endDate}`
        : 'Toate vânzările';
    doc.text(
      `Generat: ${new Date().toLocaleDateString('ro-RO')} · ${vanzariFiltrate.length} vânzări · ${perioadaText}`,
      14,
      27
    );

    autoTable(doc, {
      head: [['Produs', 'Cantitate', 'Venit (RON)', 'Cost (RON)', 'Profit (RON)', 'Margin (%)']],
      body: randuri.map(r => [
        r.denumire,
        r.cantitate,
        r.venit.toFixed(2),
        r.cost.toFixed(2),
        r.profit.toFixed(2),
        `${r.margin.toFixed(1)}%`,
      ]),
      foot: [
        [
          'TOTAL',
          totalCantitate,
          totalVenit.toFixed(2),
          totalCost.toFixed(2),
          totalProfit.toFixed(2),
          `${totalMargin.toFixed(1)}%`,
        ],
      ],
      startY: 33,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [30, 41, 59] as [number, number, number],
        lineColor: [226, 232, 240] as [number, number, number],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [16, 185, 129] as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] as [number, number, number],
      },
      footStyles: {
        fillColor: [241, 245, 249] as [number, number, number],
        textColor: [30, 41, 59] as [number, number, number],
        fontStyle: 'bold',
        fontSize: 10,
      },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'right' },
      },
    });

    const suffix = startDate || endDate ? `${startDate || 'inceput'}-${endDate || 'azi'}` : 'total';
    doc.save(`raport-produse-${suffix}.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Bara filtre + export */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium">De la</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="
              bg-[var(--t-input-bg)] border border-[var(--t-border)]
              text-[var(--t-text)] text-sm rounded-xl px-3 py-2
              focus:outline-none focus:ring-2 focus:ring-[var(--t-input-focus-ring)]
            "
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium">Până la</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="
              bg-[var(--t-input-bg)] border border-[var(--t-border)]
              text-[var(--t-text)] text-sm rounded-xl px-3 py-2
              focus:outline-none focus:ring-2 focus:ring-[var(--t-input-focus-ring)]
            "
          />
        </div>
        {(startDate || endDate) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setStartDate(''); setEndDate(''); }}
          >
            Resetează filtru
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>
            Export Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportPdf}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Bara sumar vânzări */}
      <div className="flex flex-wrap gap-4 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-xl px-4 py-3">
        <StatItem label="Vânzări" value={vanzariFiltrate.length.toString()} />
        <StatItem
          label="Venit total"
          value={`${totalVenit.toFixed(2)} RON`}
          className="text-emerald-400"
        />
        <StatItem
          label="Cost total"
          value={`${totalCost.toFixed(2)} RON`}
          className="text-amber-400"
        />
        <StatItem
          label="Profit brut"
          value={`${totalProfit.toFixed(2)} RON`}
          className={totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <StatItem
          label="Margin medie"
          value={totalVenit > 0 ? `${totalMargin.toFixed(1)}%` : '—'}
          className={totalMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>

      {/* Secțiune metrici comenzi (CMD-08) */}
      {cereri.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Comenzi Echipamente</h3>
          <div className="flex flex-wrap gap-4 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-xl px-4 py-3">
            <StatItem label="Total cereri" value={totalCereri.toString()} />
            <StatItem
              label="Predate"
              value={totalPredate.toString()}
              className="text-emerald-400"
            />
            <StatItem
              label="Plătite"
              value={totalPlatite.toString()}
              className="text-emerald-400"
            />
            <StatItem
              label="Valoare restantă"
              value={`${valoareRestanta.toFixed(2)} RON`}
              className={valoareRestanta > 0 ? 'text-amber-400' : 'text-slate-300'}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {randuri.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-slate-400">
            Nicio vânzare în perioada selectată
          </div>
        </Card>
      ) : (
        <>
          {/* Tabel desktop */}
          <div className="hidden md:block bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
                <tr className="border-b border-[var(--t-border)]">
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Produs</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Cantitate</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Venit (RON)</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Cost (RON)</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Profit (RON)</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--t-border)]">
                {randuri.map(r => (
                  <tr key={r.key} className="hover:bg-[var(--t-table-row-hover)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--t-text)]">{r.denumire}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{r.cantitate}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{r.venit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{r.cost.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.profit.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.venit > 0 ? `${r.margin.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--t-border)] bg-[var(--t-surface-2)]">
                  <td className="px-4 py-3 font-bold text-[var(--t-text)]">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--t-text)]">{totalCantitate}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">{totalVenit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-400">{totalCost.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalProfit.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${totalMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalVenit > 0 ? `${totalMargin.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Carduri mobile */}
          <div className="md:hidden space-y-2">
            {randuri.map(r => (
              <div
                key={r.key}
                className="bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-[var(--t-text)] text-sm">{r.denumire}</span>
                  <span className={`font-bold text-sm shrink-0 ${r.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.profit.toFixed(2)} RON profit
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-slate-400">
                  <span>Cant: {r.cantitate}</span>
                  <span>Venit: {r.venit.toFixed(2)} RON</span>
                  <span>Cost: {r.cost.toFixed(2)} RON</span>
                  <span>{r.venit > 0 ? `${r.margin.toFixed(1)}%` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RaportProduse;
