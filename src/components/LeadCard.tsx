import React from 'react';
import { Lead } from '../types/crm';
import { MessageCircle, PhoneCall, Flame, Sun, Snowflake, QrCode, CreditCard } from 'lucide-react';
import { obterInfoScore } from '../utils/scoring';
import { ehCelularBR } from '../utils/telefone';

interface LeadCardProps {
  lead: Lead;
  onOpenMessageComposer: (lead: Lead) => void;
  onOpenCallScript: (lead: Lead) => void;
  onOpenDetails: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: Lead['status']) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead, onOpenMessageComposer, onOpenCallScript, onOpenDetails,
}) => {
  const scoreInfo = obterInfoScore(lead);
  const isWhatsAppValido = ehCelularBR(lead.telefonePrincipal);

  // Lógica correta dos indicadores
  const pixAtivo = (lead.pixCount ?? 0) >= 3;
  const maquinaAtiva = (lead.maquinaVendas ?? 0) >= 500;

  // Fase M0/M1/M2 (só para fechados)
  const faseCiclo = (() => {
    if (lead.status !== 'fechado' || !lead.dataFechamento) return null;
    const dias = Math.floor((Date.now() - new Date(lead.dataFechamento).getTime()) / 86400000);
    if (dias < 30) return 'M0';
    if (dias < 60) return 'M1';
    if (dias < 90) return 'M2';
    return null;
  })();

  const renderScoreIcon = () => {
    if (!scoreInfo || scoreInfo.score < 0) return null;
    if (scoreInfo.categoria === 'hot') return <Flame className="w-3 h-3 text-rose-500" />;
    if (scoreInfo.categoria === 'alvo') return <Flame className="w-3 h-3 text-emerald-500" />;
    if (scoreInfo.categoria === 'medio') return <Sun className="w-3 h-3 text-amber-500" />;
    return <Snowflake className="w-3 h-3 text-slate-400" />;
  };

  // Pontos possíveis (para mostrar 0/10 ou 0/6)
  const pontosBase = lead.isMeiDesenquadrado ? 10 : (lead.isMei ? 6 : 10);

  return (
    <div
      onClick={() => onOpenDetails(lead)}
      className="group bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col gap-2"
    >
      {/* Nome + Score */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <h4 className="text-[13px] font-bold text-slate-900 truncate leading-tight">
            {lead.empresaExibicao}
          </h4>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {lead.nomeContato} · {lead.municipio || 'N/A'}
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-slate-50">
          {renderScoreIcon()}
        </div>
      </div>

      {/* Régua: Cadência, Pontos, Fase */}
      <div className="flex items-center gap-1 text-[9px] font-bold">
        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
          {lead.cadenciaContatos ?? 0}/3
        </span>
        <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
          {pontosBase}/10
        </span>
        {faseCiclo && (
          <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
            {faseCiclo}
          </span>
        )}
      </div>

      {/* Footer: Indicadores + Ações */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
        {/* Indicadores (não clicáveis) */}
        <div className="flex items-center gap-1">
          <div
            className={`p-1 rounded ${pixAtivo ? 'text-emerald-600' : 'text-slate-300'}`}
            title={pixAtivo ? `PIX ativo (${lead.pixCount}/3)` : `PIX pendente (${lead.pixCount ?? 0}/3)`}
          >
            <QrCode className="w-3.5 h-3.5" />
          </div>
          <div
            className={`p-1 rounded ${maquinaAtiva ? 'text-emerald-600' : 'text-slate-300'}`}
            title={maquinaAtiva ? `Máquina ativa (R$ ${lead.maquinaVendas})` : `Máquina pendente (R$ ${lead.maquinaVendas ?? 0})`}
          >
            <CreditCard className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Ações (clicáveis) */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenMessageComposer(lead); }}
            className={`p-1 rounded transition-colors ${
              isWhatsAppValido ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'
            }`}
            title={isWhatsAppValido ? 'WhatsApp' : 'Sem celular'}
            disabled={!isWhatsAppValido}
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenCallScript(lead); }}
            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Ligar"
          >
            <PhoneCall className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
