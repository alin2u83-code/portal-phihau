import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';
import { MessageSquareIcon, XIcon, DownloadIcon, TrashIcon, SendIcon } from './icons';
import toast from 'react-hot-toast';

interface FeedbackWidgetProps {
  userId?: string;
  userEmail?: string;
  rolActiv?: string;
  clubId?: string;
  isSuperAdmin?: boolean;
  variant?: 'fab' | 'footer-button';
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  userId,
  userEmail,
  rolActiv,
  clubId,
  isSuperAdmin = false,
  variant = 'fab',
}) => {
  const { activeView } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [descriere, setDescriere] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleSubmit = async () => {
    const text = descriere.trim();
    if (!text) return;

    setLoading(true);
    try {
      const browserInfo = {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        platform: navigator.platform,
        url: window.location.href,
      };

      const { error } = await supabase.from('feedback_debug').insert({
        user_id: userId ?? null,
        user_email: userEmail ?? null,
        rol_activ: rolActiv ?? null,
        club_id: clubId ?? null,
        view_activ: activeView,
        descriere: text,
        browser_info: browserInfo,
      });

      if (error) throw error;

      toast.success('Feedback trimis!');
      setDescriere('');
      setIsOpen(false);
    } catch (err: any) {
      toast.error(`Eroare: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback_debug')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback_debug_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${data?.length ?? 0} înregistrări exportate`);
    } catch (err: any) {
      toast.error(`Export eșuat: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Ștergi TOATE feedback-urile din Supabase? Acțiune ireversibilă.')) return;
    try {
      const { error } = await supabase
        .from('feedback_debug')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

      if (error) throw error;
      toast.success('Tabel golit');
    } catch (err: any) {
      toast.error(`Clear eșuat: ${err.message}`);
    }
  };

  const triggerButton =
    variant === 'footer-button' ? (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`hidden md:flex items-center gap-2 px-3 h-8 rounded-xl text-sm font-semibold transition-all border mr-2 ${
          isOpen
            ? 'bg-slate-700 border-slate-600 text-white'
            : 'bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30 hover:border-amber-400/60'
        }`}
        title="Feedback / Bug report"
      >
        <MessageSquareIcon className="w-4 h-4" />
        <span className="hidden lg:inline text-xs">Feedback</span>
      </button>
    ) : (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
          isOpen
            ? 'bg-slate-700 text-white'
            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/30'
        }`}
        title="Feedback / Bug report"
      >
        <MessageSquareIcon className="w-5 h-5" />
      </button>
    );

  return (
    <>
      {triggerButton}

      {isOpen && (
        <div className="fixed inset-0 z-[9000] flex items-end md:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareIcon className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white text-sm">Feedback / Bug report</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Context auto-capturat */}
            <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-400 space-y-1">
              <div><span className="text-slate-500">View:</span> <span className="text-slate-300">{activeView}</span></div>
              <div><span className="text-slate-500">Rol:</span> <span className="text-slate-300">{rolActiv ?? '—'}</span></div>
              <div><span className="text-slate-500">User:</span> <span className="text-slate-300">{userEmail ?? userId ?? '—'}</span></div>
              <div><span className="text-slate-500">Viewport:</span> <span className="text-slate-300">{window.innerWidth}×{window.innerHeight}</span></div>
            </div>

            {/* Textarea */}
            <textarea
              value={descriere}
              onChange={(e) => setDescriere(e.target.value)}
              placeholder="Descrie problema sau sugestia..."
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-500/60 transition-colors"
              autoFocus
            />

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              {isSuperAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
                    title="Exportă toate feedback-urile ca JSON"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    Export JSON
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-medium transition-all border border-red-800/40"
                    title="Golește tabelul feedback_debug"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={loading || !descriere.trim()}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <SendIcon className="w-4 h-4" />
                {loading ? 'Se trimite...' : 'Trimite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
