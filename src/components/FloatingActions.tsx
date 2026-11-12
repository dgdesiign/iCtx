import React, { useState } from 'react';
import { Plus, Sparkles, Upload, FileText, X } from 'lucide-react';

interface FloatingActionsProps {
  onEnrich: () => void;
  onImport: () => void;
  onTemplates: () => void;
  isEnriching: boolean;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({ onEnrich, onImport, onTemplates, isEnriching }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Sparkles, label: 'Enriquecer', onClick: onEnrich, color: 'bg-emerald-600', disabled: isEnriching },
    { icon: Upload, label: 'Importar', onClick: onImport, color: 'bg-indigo-600' },
    { icon: FileText, label: 'Templates', onClick: onTemplates, color: 'bg-slate-700' },
  ];

  return (
    <div className="md:hidden fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3">
      {/* Ações Expandidas */}
      {isOpen && (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => { action.onClick(); setIsOpen(false); }}
                disabled={action.disabled}
                className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg ${action.color} text-white text-xs font-bold disabled:opacity-50 transition-all`}
              >
                <Icon className={`w-4 h-4 ${action.disabled ? 'animate-spin' : ''}`} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Botão Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all ${
          isOpen ? 'bg-slate-900 rotate-45' : 'bg-red-600 hover:bg-red-500'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
};