import React from 'react';
import { Pickaxe, Maximize2, Loader2 } from 'lucide-react';
import { MiningStatusData } from '../hooks/useMiningStatus';

interface MiningFloatingWidgetProps {
  status: MiningStatusData;
  onReopen: () => void;
}

export const MiningFloatingWidget: React.FC<MiningFloatingWidgetProps> = ({
  status,
  onReopen,
}) => {
  const {
    totalCartucho,
    bairrosConcluidos,
    totalBairros,
    bairroAtual,
    processando,
  } = status;

  const pctProgresso =
    totalBairros > 0
      ? Math.min(Math.round((bairrosConcluidos / totalBairros) * 100), 100)
      : 25;

  return (
    <div
      onClick={onReopen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onReopen();
        }
      }}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl hover:shadow-2xl hover:border-amber-400 transition-all cursor-pointer group animate-in slide-in-from-bottom-3 duration-200 select-none max-w-sm"
      title="Mineração em andamento. Clique para expandir a Central de Mineração."
    >
      {/* Ícone Animado ⛏️ */}
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
        <Pickaxe className="w-5 h-5 animate-pulse text-amber-600" />
      </div>

      {/* Textos e Progresso */}
      <div className="flex-1 min-w-[150px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            Minerando: <strong className="text-amber-700">{totalCartucho} leads</strong>
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {bairrosConcluidos}/{totalBairros || '?'}
          </span>
        </div>

        {processando > 0 && bairroAtual && (
          <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin text-amber-500 shrink-0" />
            <span className="truncate">Bairro atual: <strong className="text-slate-700">{bairroAtual}</strong></span>
          </p>
        )}

        {/* Barra de Progresso Pequena */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden border border-slate-200/50">
          <div
            style={{ width: `${pctProgresso}%` }}
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
          />
        </div>
      </div>

      {/* Botão Expandir */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReopen();
        }}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200/80 transition-colors shrink-0 cursor-pointer"
      >
        <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
        <span>Expandir</span>
      </button>
    </div>
  );
};
