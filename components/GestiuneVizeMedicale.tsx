import React, { useState, useMemo } from 'react';
import { Sportiv, VizaMedicala } from '../types';
import { Card, Button, Input, Select, Badge } from './ui';
import { CalendarIcon, FileTextIcon, AlertCircleIcon, CheckCircleIcon, PlusIcon } from './icons';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface GestiuneVizeMedicaleProps {
  sportiv: Sportiv;
  vize: VizaMedicala[];
  onAddViza: (viza: Omit<VizaMedicala, 'id'>) => Promise<void>;
  isReadOnly?: boolean;
}

/**
 * Componentă optimizată pentru mobil pentru gestionarea vizelor medicale ale unui sportiv.
 * Utilizează un design de tip "Card Stack" pentru lizibilitate pe ecrane mici.
 */
export const GestiuneVizeMedicale: React.FC<GestiuneVizeMedicaleProps> = ({ 
  sportiv, 
  vize, 
  onAddViza, 
  isReadOnly = false 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newViza, setNewViza] = useState({
    data_emitere: format(new Date(), 'yyyy-MM-dd'),
    data_expirare: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
    status: 'În așteptare' as const,
    observatii: ''
  });

  // Sortăm vizele pentru a o afișa pe cea mai recentă prima
  const sortedVize = useMemo(() => {
    return [...vize].sort((a, b) => new Date(b.data_expirare).getTime() - new Date(a.data_expirare).getTime());
  }, [vize]);

  const handleSave = async () => {
    await onAddViza({
      ...newViza,
      sportiv_id: sportiv.id
    });
    setIsAdding(false);
  };

  /**
   * Determină culoarea și iconița în funcție de statusul vizei.
   */
  const getStatusConfig = (status: string, dataExpirare: string) => {
    const isExpired = new Date(dataExpirare) < new Date();
    if (isExpired || status === 'Expirat') return { color: 'red', icon: <AlertCircleIcon className="w-4 h-4" />, label: 'Expirată' };
    if (status === 'Valid') return { color: 'green', icon: <CheckCircleIcon className="w-4 h-4" />, label: 'Validă' };
    return { color: 'amber', icon: <AlertCircleIcon className="w-4 h-4" />, label: 'În așteptare' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileTextIcon className="text-brand-primary" />
          Vize Medicale
        </h3>
        {!isReadOnly && !isAdding && (
          <Button size="sm" variant="primary" onClick={() => setIsAdding(true)} className="rounded-full">
            <PlusIcon className="w-4 h-4 mr-1" /> Adaugă
          </Button>
        )}
      </div>

      {/* Formular adăugare viza (Mobile Optimized) */}
      {isAdding && (
        <Card className="border-brand-primary/30 bg-slate-900/50 animate-in slide-in-from-top duration-300">
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Data Emitere" 
                type="date" 
                value={newViza.data_emitere} 
                onChange={(e) => setNewViza({...newViza, data_emitere: e.target.value})}
              />
              <Input 
                label="Data Expirare" 
                type="date" 
                value={newViza.data_expirare} 
                onChange={(e) => setNewViza({...newViza, data_expirare: e.target.value})}
              />
            </div>
            <Select 
              label="Status" 
              value={newViza.status} 
              onChange={(e) => setNewViza({...newViza, status: e.target.value as any})}
            >
              <option value="În așteptare">În așteptare (necesită verificare)</option>
              <option value="Valid">Valid (aprobat)</option>
            </Select>
            <Input 
              label="Observații (opțional)" 
              placeholder="Ex: Aviz clinică privată..." 
              value={newViza.observatii} 
              onChange={(e) => setNewViza({...newViza, observatii: e.target.value})}
            />
            <div className="flex gap-2 pt-2">
              <Button variant="primary" className="flex-1" onClick={handleSave}>Salvează</Button>
              <Button variant="secondary" onClick={() => setIsAdding(false)}>Anulează</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Listă vize (Card Stack) */}
      <div className="space-y-3">
        {sortedVize.length === 0 ? (
          <div className="text-center py-8 bg-slate-900/20 rounded-xl border border-dashed border-slate-700">
            <AlertCircleIcon className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="text-slate-400 text-sm">Nicio viză medicală înregistrată.</p>
          </div>
        ) : (
          sortedVize.map((viza) => {
            const config = getStatusConfig(viza.status, viza.data_expirare);
            return (
              <Card key={viza.id} className="overflow-hidden border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Expiră la:</span>
                      <span className={`text-sm font-bold ${config.color === 'red' ? 'text-red-400' : 'text-white'}`}>
                        {format(new Date(viza.data_expirare), 'dd MMM yyyy', { locale: ro })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <CalendarIcon className="w-3 h-3" />
                      Emisă: {format(new Date(viza.data_emitere), 'dd.MM.yyyy')}
                    </div>
                  </div>
                  <Badge variant={config.color as any} className="flex items-center gap-1">
                    {config.icon}
                    {config.label}
                  </Badge>
                </div>
                {viza.observatii && (
                  <div className="mt-3 pt-3 border-t border-slate-800/50 text-xs text-slate-400 italic">
                    "{viza.observatii}"
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
