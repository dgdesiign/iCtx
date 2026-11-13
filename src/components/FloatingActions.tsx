import React, { useState } from 'react';
import { Plus, Sparkles, Upload, FileText, X } from 'lucide-react';

interface FloatingActionsProps {
  onEnrich: () => void;
  onImport: () => void;
  onTemplates: () => void;
  isEnriching: boolean;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  onEnrich, onImport, onTemplates, isEnriching
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Sparkles, label: 'Enriquecer', sublabel: 'Puxar dados', onClick: onEnrich, color: 'text-emerald-700', bgColor: 'bg-emerald-50', disabled: isEnriching },
    { icon: Upload, label: 'Importar', sublabel: 'Colar lista', onClick: onImport, color: 'text-slate-700', bgColor: 'bg-slate-100' },
    { icon: FileText, label: 'Templates', sublabel: 'Mensagens', onClick: onTemplates, color: 'text-slate-700', bgColor: 'bg-slate-100' },
  ];

  return (
    <>
      {/* Backdrop quando aberto */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bottom Sheet com Ações */}
      {isOpen && (
        <div className="md:hidden fixed bottom-20 left-3 right-3 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ações Rápidas</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {actions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => { action.onClick(); setIsOpen(false); }}
                  disabled={action.disabled}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl ${action.bgColor} active:scale-95 transition-transform disabled:opacity-50 cursor-pointer`}
                >
                  <Icon className={`w-5 h-5 ${action.color} ${action.disabled ? 'animate-spin' : ''}`} />
                  <span className={`text-[11px] font-bold ${action.color}`}>{action.label}</span>
                  <span className="text-[9px] text-slate-400">{action.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB (sempre visível quando fechado) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 shadow-2xl flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
          aria-label="Abrir ações rápidas"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}
    </>
  );
};