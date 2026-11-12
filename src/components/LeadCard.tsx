import React from 'react';
import { Lead } from '../types/crm';
import { MessageCircle, PhoneCall, Flame, Sun, Snowflake, QrCode, CreditCard, CheckCircle2 } from 'lucide-react';
import { obterInfoScore } from '../utils/scoring';
import { ehCelularBR } from '../utils/telefone';

interface LeadCardProps {
  lead: Lead;
  onOpenMessageComposer: (lead: Lead) => void;
  onOpenCallScript: (lead: Lead) => void;
  onOpenDetails: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: Lead['status']) => void;
}

// Calcula os pontos REAIS conquistados (não o máximo)
function calcularPontosReais(lead: Lead) {
  const isMeiComum = lead.isMei && !lead.isMeiDesenquadrado;
  if (isMeiComum) {
    return { pontos: 0, max: 0, qualifica: false, contaAtiva: false, maquinaAtiva: false };
  }

  let isMaisDeUmAno = true;
  const refDate = lead.cnpjInicio || lead.dataAbertura;
  if (refDate) {
    const dtIni = new Date(refDate);
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    isMaisDeUmAno = dtIni <= umAnoAtras;
  }

  const maxPontos = isMaisDeUmAno ? 10 : 6;

  const contaAtiva = (lead.pixCount ?? 0) >= 3 || Boolean(lead.contaAtivaEm);
  const pontosConta = contaAtiva ? (isMaisDeUmAno ? 4 : 2) : 0;

  const maquinaAtiva = (lead.maquinaVendas ?? 0) >= 500 || Boolean(lead.maquinaAtivaEm);
  const pontosMaquina = maquinaAtiva ? (isMaisDeUmAno ? 6 : 4) : 0;

  return {
    pontos: pontosConta + pontosMaquina,
    max: maxPontos,
    qualifica: true,
    contaAtiva,
    maquinaAtiva,
  };
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead, onOpenMessageComposer, onOpenCallScript, onOpenDetails,
}) => {
  const scoreInfo = obterInfoScore(lead);
  const isWhatsAppValido = ehCelularBR(lead.telefonePrincipal);
  const infoPontos = calcularPontosReais(lead);

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
      <div className="flex items-center gap-1 text-[9px] font-bold flex-wrap">
        {/* Cadência */}
        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
          {lead.cadenciaContatos ?? 0}/3
        </span>
        
        {/* Pontos: REAIS/MAX. Verde com ✓ se tem pontos, cinza se 0 */}
        <span
          className={`px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
            !infoPontos.qualifica
              ? 'bg-slate-100 text-slate-400 border-slate-200'
              : infoPontos.pontos > 0
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title={
            !infoPontos.qualifica
              ? 'MEI comum não qualifica para pontos'
              : `${infoPontos.pontos} de ${infoPontos.max} pontos ativos`
          }
        >
          {infoPontos.qualifica && infoPontos.pontos > 0 && (
            <CheckCircle2 className="w-2.5 h-2.5" />
          )}
          {infoPontos.qualifica ? `${infoPontos.pontos}/${infoPontos.max}` : 'N/Q'}
        </span>
        
        {/* Fase M0/M1/M2 (só fechados) */}
        {faseCiclo && (
          <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
            {faseCiclo}
          </span>
        )}
      </div>

      {/* Footer: Indicadores Pix/Máq + Ações WhatsApp/Telefone */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
        {/* Indicadores (não clicáveis) */}
        <div className="flex items-center gap-1">
          <div
            className={`p-1 rounded ${infoPontos.contaAtiva ? 'text-emerald-600' : 'text-slate-300'}`}
            title={
              infoPontos.contaAtiva
                ? `PIX ativo (${lead.pixCount ?? 3}/3)`
                : `PIX pendente (${lead.pixCount ?? 0}/3)`
            }
          >
            <QrCode className="w-3.5 h-3.5" />
          </div>
          <div
            className={`p-1 rounded ${infoPontos.maquinaAtiva ? 'text-emerald-600' : 'text-slate-300'}`}
            title={
              infoPontos.maquinaAtiva
                ? `Máquina ativa (R$ ${lead.maquinaVendas ?? 500})`
                : `Máquina pendente (R$ ${lead.maquinaVendas ?? 0})`
            }
          >
            <CreditCard className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMessageComposer(lead);
            }}
            className={`p-1 rounded transition-colors ${
              isWhatsAppValido ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'
            }`}
            title={isWhatsAppValido ? 'WhatsApp' : 'Sem celular'}
            disabled={!isWhatsAppValido}
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCallScript(lead);
            }}
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
