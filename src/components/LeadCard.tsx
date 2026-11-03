import React from 'react';
import {
  CreditCard,
} from 'lucide-react';
import { Lead, LeadStatus } from '../types/crm';
import { ehFollowUpVencido, diasDesdeUltimoContato, obterInfoFollowUp } from '../utils/cadencia';
import { calcularScore } from '../utils/scoring';
import { ehCelularBR, formatarCelularBR } from '../utils/telefone';
import { abreviarCidade } from '../utils/cidade';
import { abreviarEmpresaMEI } from '../utils/empresa';
import { potencial } from '../utils/pontos';
import { calcularAtivacaoStatus, janelaCheia, contaAtiva, maquinaAtiva } from '../utils/ativacao';

const PixIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M12 2.8 L21.2 12 L12 21.2 L2.8 12 Z" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinejoin="round" 
      fill="none"
    />
    <path 
      d="M12 8 L16 12 L12 16 L8 12 Z" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinejoin="round" 
      fill="none"
    />
  </svg>
);

interface LeadCardProps {
  lead: Lead;
  onOpenMessageComposer?: (lead: Lead) => void;
  onOpenCallScript?: (lead: Lead) => void;
  onOpenDetails: (lead: Lead) => void;
  onUpdateStatus?: (leadId: string, status: LeadStatus) => void;
  onOpenAtivacao?: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onOpenMessageComposer,
  onOpenCallScript,
  onOpenDetails,
  onUpdateStatus,
  onOpenAtivacao,
}) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', lead.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const isVencido = ehFollowUpVencido(lead);
  const infoFollowUp = obterInfoFollowUp(lead);
  const diasAtraso = diasDesdeUltimoContato(lead);

  // 1. Score como dot circular no canto
  const score = calcularScore(lead);
  const scoreDotColor =
    score >= 75
      ? 'bg-emerald-500'
      : score >= 45
      ? 'bg-amber-400'
      : score >= 0
      ? 'bg-slate-300'
      : null;

  // 2. Primeiro nome
  const primeiroNome = ((lead.nomeContato || (lead as any).nome || '') as string).trim().split(/\s+/)[0] || '';

  // 3. Porte (exibindo 'MEI+' em vez de 'MEI Desenq.')
  const porteRaw = lead.isMeiDesenquadrado
    ? 'MEI Desenq.'
    : lead.isMei
    ? 'MEI'
    : 'PJ';
  const porteExibicao = porteRaw === 'MEI Desenq.' ? 'MEI+' : porteRaw;

  // 3b. Empresa abreviada (para MEI+)
  const leadEmpresa = (lead as any).empresa || lead.empresaExibicao || '';
  const leadPorte = (lead as any).porte || (lead.isMeiDesenquadrado ? 'MEI+' : porteRaw);
  const empresaExibida = abreviarEmpresaMEI(leadEmpresa, leadPorte);

  // 4. Cidade abreviada (sem UF)
  const cidadeAbv = abreviarCidade(lead.municipio || (lead as any).cidade, lead.uf);

  // 5. Linha de contexto única combinada (sem "· ·" órfão)
  const segmentos: string[] = [];
  if (primeiroNome) segmentos.push(primeiroNome);
  if (porteExibicao) segmentos.push(porteExibicao);
  if (cidadeAbv) segmentos.push(cidadeAbv);
  const linhaContexto = segmentos.join(' · ');

  // 6. Telefone formatado
  const wa = formatarCelularBR(lead.telefonePrincipal || lead.telefonePrincipalFormatado);

  // 7. Ativação & Pontuação
  const pixCount = lead.pixCount || 0;
  const maquinaVendas = lead.maquinaVendas || 0;
  const potencialInfo = potencial(lead);
  const pontosTotais = potencialInfo.total;

  let pontosAtuais = 0;
  if (lead.status === 'fechado') {
    if (contaAtiva(lead)) {
      pontosAtuais += potencialInfo.conta;
    }
    if (maquinaAtiva(lead)) {
      pontosAtuais += potencialInfo.getnet;
    }
    if (lead.fitContratadoEm) {
      pontosAtuais += 1;
    }
  }

  const cadenciaContatos = lead.cadenciaContatos ?? 0;

  const statusAtiv = lead.status === 'fechado' 
    ? calcularAtivacaoStatus(lead) 
    : null;
  const j = lead.status === 'fechado' ? janelaCheia(lead) : null;
  const completa = contaAtiva(lead) && 
                   (lead.vendeuMaquina === false || maquinaAtiva(lead));
  const emRisco = statusAtiv === 'risco' && !completa;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onOpenDetails(lead)}
      className={`border shadow-none rounded-lg bg-white transition-all duration-150 p-3 group text-slate-800 cursor-grab active:cursor-grabbing relative w-full ${
        emRisco 
          ? 'border-rose-300 bg-rose-50/30 animate-pulse' 
          : j?.fase === 'M1' && j.diasRestantesM1 <= 10 && !completa
            ? 'border-amber-300 bg-amber-50/30'
            : 'border-slate-200/70 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Selo Visual de Follow-up (Absolute, se vencido) */}
      {isVencido && (
        <span
          className={`absolute top-1.5 right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-2xs z-10 pointer-events-none tracking-tight flex items-center gap-0.5 ${
            infoFollowUp.status === 'hoje'
              ? 'bg-amber-500 text-white'
              : 'bg-rose-600 text-white'
          }`}
          title={
            infoFollowUp.status === 'hoje'
              ? 'Follow-up agendado para hoje'
              : `Vencido há ${diasAtraso > 0 ? diasAtraso : 1} dia(s)`
          }
        >
          {infoFollowUp.status === 'hoje'
            ? 'Hoje'
            : `Vencido há ${diasAtraso > 0 ? diasAtraso : 1}d`}
        </span>
      )}

      {/* Linha 1: Empresa e Score Dot */}
      <div className={`flex items-center justify-between gap-1.5 min-w-0 ${isVencido ? 'pr-16' : ''}`}>
        <h4
          className="font-semibold text-sm text-slate-900 truncate leading-tight hover:text-red-700 cursor-pointer"
          title={`${empresaExibida} (Clique para ver detalhes)`}
        >
          {empresaExibida}
        </h4>

        {score >= 0 && scoreDotColor && (
          <span
            className={`inline-block w-2 h-2 rounded-full ${scoreDotColor} shrink-0`}
            title={`Score: ${score}/100`}
          />
        )}
      </div>

      {/* Linha 2: Contexto Único (contato · porte · cidade/UF) */}
      {linhaContexto && (
        <p className="text-xs text-slate-500 truncate mt-1 leading-tight">
          {linhaContexto}
        </p>
      )}

      {/* Linha 3: Telefone Celular formatado */}
      {wa && (
        <p className="text-xs font-mono text-slate-400 truncate mt-1 leading-none">
          {wa}
        </p>
      )}

      {/* Linha 4: Indicadores de texto ultralimpos (sem colchetes) e ícones de ativação (sem botões de zap/ligar) */}
      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 gap-1.5">
        {/* Esquerda: pontosAtuais/pontosTotais cadenciaContatos/3 (sem colchetes) */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 font-medium select-none">
          <span title={`Pontos: ${pontosAtuais} de ${pontosTotais} pontos possíveis`}>
            {pontosAtuais}/{pontosTotais}
          </span>
          <span title={`Cadência: ${cadenciaContatos} de 3 contatos realizados`}>
            {cadenciaContatos}/3
          </span>
        </div>

        {/* Direita: Ativações PIX e Máquina */}
        <div className="flex items-center gap-1">
          {/* PIX */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (lead.status === 'fechado' && onOpenAtivacao) {
                onOpenAtivacao(lead);
              } else {
                onOpenDetails(lead);
              }
            }}
            disabled={lead.status !== 'fechado'}
            title={
              lead.status !== 'fechado'
                ? 'PIX — disponível quando credenciado'
                : pixCount >= 3
                  ? `PIX ${pixCount}/3 — ativo`
                  : `PIX ${pixCount}/3 — pendente`
            }
            className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
              lead.status !== 'fechado'
                ? 'text-slate-300 cursor-not-allowed opacity-60'
                : pixCount >= 3
                  ? 'text-emerald-600 hover:bg-emerald-50 cursor-pointer'
                  : pixCount > 0
                    ? 'text-amber-500 hover:bg-amber-50 cursor-pointer'
                    : 'text-slate-400 hover:bg-slate-100 cursor-pointer'
            }`}
          >
            <PixIcon className="w-3.5 h-3.5" />
          </button>

          {/* Máquina */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (lead.status === 'fechado' && onOpenAtivacao) {
                onOpenAtivacao(lead);
              } else {
                onOpenDetails(lead);
              }
            }}
            disabled={lead.status !== 'fechado'}
            title={
              lead.status !== 'fechado'
                ? 'Máquina — disponível quando credenciado'
                : maquinaVendas >= 500
                  ? `Máq R$${maquinaVendas} — ativa`
                  : `Máq R$${maquinaVendas} — pendente`
            }
            className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
              lead.status !== 'fechado'
                ? 'text-slate-300 cursor-not-allowed opacity-60'
                : maquinaVendas >= 500
                  ? 'text-emerald-600 hover:bg-emerald-50 cursor-pointer'
                  : maquinaVendas > 0
                    ? 'text-amber-500 hover:bg-amber-50 cursor-pointer'
                    : 'text-slate-400 hover:bg-slate-100 cursor-pointer'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
          </button>

          {/* Contagem de dias na linha de ativação */}
          {j && lead.status === 'fechado' && (
            <span className={`text-[9px] font-bold ml-1 ${
              emRisco 
                ? 'text-rose-600'
                : j.fase === 'M2'
                  ? 'text-amber-600'
                  : 'text-slate-500'
            }`}>
              {j.fase === 'M0' ? `M0 · ${j.diasRestantesM1}d`
               : j.fase === 'M1' ? `M1 · ${j.diasRestantesM1}d`
               : j.fase === 'M2' ? `M2 · ${j.diasRestantesM2}d`
               : 'exp.'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
