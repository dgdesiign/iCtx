import React from 'react';
import { Lead } from '../types/crm';
import { MessageCircle, PhoneCall, Flame, Sun, Snowflake, Clock, MapPin, Building2, ChevronRight } from 'lucide-react';
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
  lead,
  onOpenMessageComposer,
  onOpenCallScript,
  onOpenDetails,
}) => {
  const scoreInfo = obterInfoScore(lead);
  // AQUI ESTÁ A CORREÇÃO: O WhatsApp fica verde se tiver celular, independente do status
  const isWhatsAppValido = ehCelularBR(lead.telefonePrincipal);

  const renderScoreIcon = () => {
    if (!scoreInfo || scoreInfo.score < 0) return null;
    if (scoreInfo.categoria === 'hot') return <Flame className="w-3.5 h-3.5 text-rose-500" />;
    if (scoreInfo.categoria === 'alvo') return <Flame className="w-3.5 h-3.5 text-emerald-500" />;
    if (scoreInfo.categoria === 'medio') return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    return <Snowflake className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div 
      onClick={() => onOpenDetails(lead)}
      className="group bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">
            {lead.empresaExibicao}
          </h4>
          <p className="text-xs text-slate-500 truncate font-medium mt-0.5">
            {lead.nomeContato}
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 border border-slate-100">
          {renderScoreIcon()}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span className="truncate max-w-[80px]">{lead.municipio || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Building2 className="w-3 h-3 text-slate-400" />
          <span className="truncate max-w-[80px]">{lead.cnaeDescricao ? lead.cnaeDescricao.split(' ')[0] : 'CNAE'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-auto">
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMessageComposer(lead);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              isWhatsAppValido 
                ? 'text-emerald-600 hover:bg-emerald-50' 
                : 'text-slate-300 cursor-not-allowed'
            }`}
            title={isWhatsAppValido ? "Abrir WhatsApp" : "Sem celular válido"}
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCallScript(lead);
            }}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Ligar / Roteiro"
          >
            <PhoneCall className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
          {(lead.cadenciaContatos ?? 0) > 0 && (
            <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200/60">
              <Clock className="w-2.5 h-2.5" />
              {lead.cadenciaContatos}/3
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </div>
    </div>
  );
};
