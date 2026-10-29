import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
  MessageCircle,
  PhoneCall,
  Save,
  CheckCircle2,
  Edit2,
  Bell,
  CreditCard,
  TrendingUp,
  QrCode,
} from 'lucide-react';
import { Lead, LeadStatus } from '../types/crm';
import { CredenciamentoWizardModal } from './CredenciamentoWizardModal';
import { KANBAN_COLUMNS } from '../utils/storage';
import { formatarNome, formatarTelefone, limparDigitos, consultarCnpj } from '../services/cnpjService';
import { obterInfoFollowUp, diasDesdeUltimoContato } from '../utils/cadencia';
import { obterInfoScore } from '../utils/scoring';
import { 
  definirPix, 
  registrarVendaMaquina, 
  calcularAtivacaoStatus, 
  ativacaoCompleta,
  janelaCheia,
  contaAtiva,
  maquinaAtiva,
  produtosVendidos,
  ATIVACAO_CFG,
  corrigirDataAtivacaoConta,
  corrigirDataAtivacaoMaquina,
  definirFitEnergia,
  dataLocalISO
} from '../utils/ativacao';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onUpdateLead?: (lead: Lead) => void;
  onSaveNotas: (leadId: string, notas: string) => void;
  onOpenMessageComposer: (lead: Lead) => void;
  onOpenCallScript: (lead: Lead) => void;
  onOpenCoach: (lead: Lead) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdateLead,
  onSaveNotas,
  onOpenMessageComposer,
  onOpenCallScript,
  onOpenCoach,
}) => {
  const [notas, setNotas] = useState(lead?.notas || '');
  const [salvo, setSalvo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editNome, setEditNome] = useState(lead?.nomeContato || '');
  const [editTelefone, setEditTelefone] = useState(lead?.telefonePrincipal || '');
  const [editEmpresa, setEditEmpresa] = useState(lead?.empresaExibicao || '');
  const [wizardAberto, setWizardAberto] = useState(false);

  useEffect(() => {
    if (lead) {
      setNotas(lead.notas || '');
      setEditNome(lead.nomeContato || '');
      setEditTelefone(lead.telefonePrincipal || '');
      setEditEmpresa(lead.empresaExibicao || '');
      setEditando(false);
    }
  }, [lead?.id]);

  useEffect(() => {
    if (!lead || !isOpen) return;
    if (lead.status !== 'fechado') return;
    if (lead.cnpjInicio) return; // já tem, não precisa puxar
    if (!lead.cnpj) return;
    if (!onUpdateLead) return;

    let cancelado = false;
    (async () => {
      try {
        const dados = await consultarCnpj(lead.cnpj);
        if (cancelado || !dados) return;
        const cnpjInicio = dados.data_inicio_atividade;
        if (cnpjInicio && /^\d{4}-\d{2}-\d{2}/.test(cnpjInicio)) {
          onUpdateLead({ ...lead, cnpjInicio });
        }
      } catch {
        // silencioso — usuário pode preencher manualmente se necessário
      }
    })();

    return () => { cancelado = true; };
  }, [lead?.id, lead?.status, lead?.cnpjInicio, isOpen]);

  if (!isOpen || !lead) return null;

  const handleSalvarEdicao = () => {
    if (!onUpdateLead) return;
    const telLimpo = limparDigitos(editTelefone);
    const atualizado: Lead = {
      ...lead,
      nomeContato: formatarNome(editNome),
      telefonePrincipal: telLimpo,
      telefonePrincipalFormatado: formatarTelefone(telLimpo),
      empresaExibicao: formatarNome(editEmpresa) || lead.empresaExibicao,
      atualizadoEm: new Date().toISOString(),
    };
    onUpdateLead(atualizado);
    setEditando(false);
  };

  const handleSalvarNotas = () => {
    onSaveNotas(lead.id, notas);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };

  const scoreInfo = obterInfoScore(lead);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-800 shrink-0">
                Dossiê da Empresa
              </span>
              {scoreInfo && (
                <span className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded border shrink-0 ${scoreInfo.badgeStyle}`}>
                  Score {scoreInfo.score}/100 ({scoreInfo.rotulo})
                </span>
              )}
              <span className="text-xs text-slate-500 font-mono truncate">{lead.cnpjFormatado}</span>
            </div>
            <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug truncate">
              {lead.empresaExibicao}
            </h3>
            {lead.razaoSocial && lead.razaoSocial !== lead.empresaExibicao && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Razão Social: {lead.razaoSocial}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
            title="Fechar Dossiê"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stage and Direct Actions Bar */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-xs text-slate-500 font-medium shrink-0">Etapa:</span>
            <select
              value={lead.status}
              onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-2 sm:px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600 truncate max-w-[150px] sm:max-w-[200px]"
            >
              {KANBAN_COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Direct Action Buttons - Apenas Ícones conforme solicitado */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* AI Coach Local (Sprint 4) */}
            <button
              onClick={() => onOpenCoach(lead)}
              className="w-9 h-9 flex items-center justify-center text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="AI Coach da Negociação"
              aria-label="Coach"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Ligação Telefônica */}
            <button
              onClick={() => onOpenCallScript(lead)}
              className="w-9 h-9 flex items-center justify-center text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Abrir Roteiro de Ligação Telefônica"
              aria-label="Ligação"
            >
              <PhoneCall className="w-4 h-4" />
            </button>

            {/* Disparar WhatsApp */}
            <button
              onClick={() => onOpenMessageComposer(lead)}
              className="w-9 h-9 flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Disparar Mensagem pelo WhatsApp"
              aria-label="Disparar WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5 text-xs text-slate-700">
          
          {/* Card de Cadência Automática & Próximo Follow-up (Sprint 1) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Bell className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Cadência & Próximo Follow-up</span>
              </div>
              {lead.proximoFollowUp ? (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    obterInfoFollowUp(lead).status === 'vencido'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : obterInfoFollowUp(lead).status === 'hoje'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {obterInfoFollowUp(lead).status === 'vencido'
                    ? `⏰ Vencido há ${diasDesdeUltimoContato(lead)}d`
                    : obterInfoFollowUp(lead).status === 'hoje'
                    ? '⏳ Retornar Hoje'
                    : '📅 Em dia'}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  Sem agendamento
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Próximo Follow-up</span>
                <strong className="text-slate-900">
                  {lead.proximoFollowUp
                    ? new Date(lead.proximoFollowUp).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : 'Vazio (Lead Novo / Concluído)'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Último Contato</span>
                <strong className="text-slate-900">
                  {lead.dataUltimoContato || lead.ultimoContatoEm
                    ? new Date(lead.dataUltimoContato || lead.ultimoContatoEm!).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })
                    : 'Ainda não contatado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tentativas de Contato</span>
                <strong className="text-slate-900">
                  {lead.tentativasContato ? `${lead.tentativasContato} tentativa(s)` : '0 tentativas'}
                </strong>
              </div>
            </div>
          </div>

          {/* 📊 Ativação Pós-Venda */}
          {lead.status === 'fechado' && (() => {
            const p = produtosVendidos(lead);
            const cA = contaAtiva(lead);
            const mA = maquinaAtiva(lead);
            const j = janelaCheia(lead);
            const completa = cA && (!p.maquina || mA) && (!p.conta || cA);
            const emRisco = j?.fase === 'expirado' && !completa;
            
            const bg = completa
              ? 'bg-emerald-50 border-emerald-200'
              : emRisco
                ? 'bg-rose-50 border-rose-200 animate-pulse'
                : 'bg-slate-50 border-slate-200';
            
            const faseCor = !j ? 'text-slate-500'
              : j.fase === 'M0' ? 'text-blue-700'
              : j.fase === 'M1' ? 'text-indigo-700'
              : j.fase === 'M2' ? 'text-amber-700'
              : 'text-rose-700';
            
            const faseLabel = !j ? 'Sem data'
              : j.fase === 'M0' ? `M0 (${j.diasRestantesM1}d)`
              : j.fase === 'M1' ? `M1 (${j.diasRestantesM1}d)`
              : j.fase === 'M2' ? `M2 (${j.diasRestantesM2}d)`
              : 'Expirado';
            
            return (
              <div className="space-y-2">
                <div className={`p-2 border rounded-lg ${bg} flex flex-wrap items-center gap-2 text-[11px] font-medium`}>
                  {/* Credenciamento */}
                  {!lead.dataAbertura && lead.status === 'fechado' ? (
                    <button
                      type="button"
                      onClick={() => setWizardAberto(true)}
                      className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Iniciar credenciamento
                    </button>
                  ) : onUpdateLead ? (
                    <label className="flex items-center gap-1 cursor-pointer hover:bg-white/60 rounded px-1.5 py-0.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-600">Credenciado:</span>
                      <input
                        type="date"
                        value={lead.dataAbertura || ''}
                        onChange={(e) => onUpdateLead({ ...lead, dataAbertura: e.target.value || undefined })}
                        className="bg-transparent border-none text-[11px] font-bold text-slate-800 focus:outline-none w-auto"
                      />
                    </label>
                  ) : (
                    <span className="text-slate-600">Credenciado: {lead.dataAbertura || '—'}</span>
                  )}
                  
                  <span className="text-slate-300">·</span>
                  
                  {/* PIX */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!onUpdateLead) return;
                        const atual = lead.pixCount || 0;
                        const novo = (atual + 1) % 4; // 0→1→2→3→0
                        onUpdateLead(definirPix(lead, novo));
                      }}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/60 ${
                        cA ? 'text-emerald-700' : (lead.pixCount||0) > 0 ? 'text-amber-700' : 'text-slate-500'
                      }`}
                      title="Clique para alternar: 0→1→2→3→0"
                    >
                      <QrCode className="w-3 h-3" />
                      <span className="font-bold">{lead.pixCount || 0}/3</span>
                      {cA && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    {cA && (
                      <button
                        type="button"
                        onClick={() => {
                          const novaData = window.prompt(
                            'Data de ativação (YYYY-MM-DD):',
                            lead.contaAtivaEm || ''
                          );
                          if (novaData && /^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
                            onUpdateLead?.(corrigirDataAtivacaoConta(lead, novaData));
                          }
                        }}
                        className="w-4 h-4 p-0.5 text-slate-400 hover:text-emerald-700 rounded hover:bg-white/60 transition-colors flex items-center justify-center cursor-pointer"
                        title="Editar data de ativação do PIX"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  <span className="text-slate-300">·</span>
                  
                  {/* Máquina */}
                  <div className="flex items-center gap-0.5">
                    <label className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/60 cursor-pointer">
                      <CreditCard className={`w-3 h-3 ${mA ? 'text-emerald-700' : (lead.maquinaVendas||0) > 0 ? 'text-amber-700' : 'text-slate-500'}`} />
                      <span className={`text-[11px] font-bold ${mA ? 'text-emerald-700' : (lead.maquinaVendas||0) > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                        R$ {(lead.maquinaVendas || 0).toLocaleString('pt-BR')}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        placeholder="+"
                        onBlur={(e) => {
                          if (!onUpdateLead) return;
                          const v = Number(e.target.value);
                          if (v > 0) {
                            onUpdateLead(registrarVendaMaquina(lead, v));
                            e.target.value = '';
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-12 bg-transparent border-b border-slate-300 text-[10px] focus:outline-none focus:border-emerald-600"
                      />
                    </label>
                    {mA && (
                      <button
                        type="button"
                        onClick={() => {
                          const novaData = window.prompt(
                            'Data de ativação (YYYY-MM-DD):',
                            lead.maquinaAtivaEm || ''
                          );
                          if (novaData && /^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
                            onUpdateLead?.(corrigirDataAtivacaoMaquina(lead, novaData));
                          }
                        }}
                        className="w-4 h-4 p-0.5 text-slate-400 hover:text-emerald-700 rounded hover:bg-white/60 transition-colors flex items-center justify-center cursor-pointer"
                        title="Editar data de ativação da Máquina"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  <span className="text-slate-300">·</span>

                  {/* Fit Energia */}
                  {lead.status === 'fechado' && (
                    <label
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/60 cursor-pointer"
                      title="Fit Energia contratado (+1 pt)"
                    >
                      <input
                        type="checkbox"
                        checked={!!lead.fitContratadoEm}
                        onChange={(e) => {
                          if (!onUpdateLead) return;
                          if (e.target.checked) {
                            onUpdateLead(definirFitEnergia(lead, dataLocalISO(new Date())));
                          } else {
                            onUpdateLead(definirFitEnergia(lead, undefined));
                          }
                        }}
                        className="w-3 h-3 rounded"
                      />
                      <span className={`text-[10px] font-bold ${
                        lead.fitContratadoEm ? 'text-emerald-700' : 'text-slate-500'
                      }`}>
                        Fit
                      </span>
                    </label>
                  )}
                  
                  <span className="text-slate-300">·</span>
                  
                  {/* Fase */}
                  <span className={`flex items-center gap-1 font-bold ${faseCor}`}>
                    <Clock className="w-3 h-3" />
                    {faseLabel}
                  </span>
                  
                  {/* Status ativa */}
                  {completa && (
                    <span className="ml-auto text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ativa
                    </span>
                  )}
                </div>

                {/* Banner de Retenção M2 */}
                {(() => {
                  if (j?.fase !== 'M2') return null;
                  return (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] flex items-center justify-between">
                      <span className="text-amber-900 font-medium">
                        Fase M2 — este cliente ainda está ativo?
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdateLead?.({
                            ...lead,
                            contaEncerradaEm: undefined,
                            maquinaEncerradaEm: undefined,
                          })}
                          className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Sim, ativo
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateLead?.({
                            ...lead,
                            contaEncerradaEm: dataLocalISO(new Date()),
                            maquinaEncerradaEm: dataLocalISO(new Date()),
                          })}
                          className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Não, encerrou
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Card de Avaliação do AI Coach (Sprint 4) */}
          {lead.coachNota !== undefined && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-950">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Última Avaliação do Coach</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                    Nota {lead.coachNota}/100
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenCoach(lead)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                  >
                    Reavaliar
                  </button>
                </div>
              </div>
              {lead.coachFeedback && (
                <pre className="text-[11px] text-indigo-900 bg-white/90 p-2.5 rounded-lg border border-indigo-100 font-sans whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {lead.coachFeedback}
                </pre>
              )}
              {lead.coachData && (
                <p className="text-[10px] text-indigo-500">
                  Avaliado em {new Date(lead.coachData).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(lead.coachData).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}

          {/* Card de Inteligência de MEI Desenquadrado / Anti-Spam */}
          {lead.isMeiDesenquadrado && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-amber-950 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>MEI Desenquadrado / Titular Pessoa Física Detectado</span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                A Razão Social oficial desta empresa é composta pelo nome do titular acompanhado de números de registro (ex: CNPJ inicial ou CPF). O decisor correto para falar é <strong>{lead.nomeTitular || lead.nomeContato}</strong>.
              </p>
              <div className="text-[11px] font-medium bg-white/70 p-2 rounded-lg border border-amber-200/60 text-amber-900">
                🛡️ <strong>Regra Anti-Spam Ativa:</strong> Nas mensagens de WhatsApp e roteiros, o sistema menciona <em>"sua empresa"</em> em vez do nome da pessoa física, soando 100% natural e profissional para o cliente.
              </div>
            </div>
          )}

          {/* Quadro de Sócios e Administradores (Crucial for Sales) */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Quadro de Sócios e Administradores (QSA Receita Federal)</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Procure pelo Sócio-Administrador ou Titular para saber com quem negociar a conta.
            </p>

            <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 space-y-2">
              {lead.socios.length === 0 ? (
                lead.nomeTitular ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-purple-100/80">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-purple-500" />
                      <strong className="text-slate-900 text-xs">{lead.nomeTitular}</strong>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Titular / Responsável MEI
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Nenhum sócio informado na base da Receita</span>
                )
              ) : (
                lead.socios.map((socio, idx) => {
                  const isAdmin =
                    socio.qualificacao.toLowerCase().includes('administrador') ||
                    socio.qualificacao.toLowerCase().includes('diretor') ||
                    socio.qualificacao.toLowerCase().includes('titular');
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-purple-100/80"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-purple-500" />
                        <strong className="text-slate-900 text-xs">{socio.nome}</strong>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isAdmin
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {socio.qualificacao}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Dados de Contato com opção de edição direta */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Contatos Telefônicos & Responsável
              </h4>
              {onUpdateLead && (
                <button
                  type="button"
                  onClick={() => {
                    setEditNome(lead.nomeContato);
                    setEditTelefone(lead.telefonePrincipal);
                    setEditEmpresa(lead.empresaExibicao);
                    setEditando(!editando);
                  }}
                  className="text-red-700 hover:text-red-800 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{editando ? 'Cancelar Edição' : 'Editar Dados'}</span>
                </button>
              )}
            </div>

            {editando ? (
              <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome do Responsável / Contato:
                  </label>
                  <input
                    type="text"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    placeholder="Ex: Geraldino"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Telefone Principal (com DDD):
                  </label>
                  <input
                    type="text"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(e.target.value)}
                    placeholder="Ex: 71991526718"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome Comercial de Exibição da Empresa:
                  </label>
                  <input
                    type="text"
                    value={editEmpresa}
                    onChange={(e) => setEditEmpresa(e.target.value)}
                    placeholder="Ex: Geraldino Galdino da Silva Junior"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-red-600 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSalvarEdicao}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Telefone Lead (Principal)
                    </span>
                    <strong className="text-slate-900 font-mono text-sm block truncate">
                      {lead.telefonePrincipalFormatado || lead.telefonePrincipal}
                    </strong>
                    <span className="text-[11px] text-slate-500 block truncate">
                      Responsável: <strong className="text-slate-800">{lead.nomeContato}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenCallScript(lead)}
                      className="w-8 h-8 flex items-center justify-center text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors cursor-pointer"
                      title="Ligar para o número principal"
                      aria-label="Ligar"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenMessageComposer(lead)}
                      className="w-8 h-8 flex items-center justify-center text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                      title="Enviar WhatsApp para o número principal"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Telefone Receita (Secundário)
                    </span>
                    <strong className="text-slate-900 font-mono text-sm block truncate">
                      {lead.telefoneSecundarioFormatado || lead.telefoneSecundario || 'Não cadastrado'}
                    </strong>
                    <span className="text-[11px] text-slate-500 block truncate">
                      Cadastro oficial Receita Federal
                    </span>
                  </div>
                  {lead.telefoneSecundario && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenCallScript(lead)}
                        className="w-8 h-8 flex items-center justify-center text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors cursor-pointer"
                        title="Ligar para o número secundário"
                        aria-label="Ligar"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenMessageComposer(lead)}
                        className="w-8 h-8 flex items-center justify-center text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                        title="Enviar WhatsApp para o número secundário"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Atividade Econômica e Enquadramento */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Atividade Econômica & Porte
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">CNAE Principal</span>
                <p className="text-slate-800 font-medium">
                  {lead.cnaeCodigo ? `${lead.cnaeCodigo} - ${lead.cnaeDescricao}` : 'Não informado'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Idade da Empresa</span>
                  <strong className="text-slate-800">{lead.idadeEmpresa || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">É MEI?</span>
                  <strong className="text-slate-800">{lead.isMei ? 'SIM' : 'NÃO'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Capital Social</span>
                  <strong className="text-slate-800">
                    {lead.capitalSocial
                      ? Number(lead.capitalSocial).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      : 'Não informado'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Localização</span>
            </h4>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
              <p>
                {lead.logradouro ? `${lead.logradouro}, ${lead.numero || 'S/N'}` : 'Endereço não informado'}
                {lead.complemento ? ` (${lead.complemento})` : ''}
              </p>
              <p className="text-slate-500 mt-0.5">
                {lead.bairro ? `${lead.bairro} - ` : ''}
                {lead.municipio}/{lead.uf} {lead.cep ? `· CEP: ${lead.cep}` : ''}
              </p>
            </div>
          </div>

          {/* Notas do Vendedor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Bloco de Notas do Vendedor (Douglas)</span>
              </h4>
              <button
                onClick={handleSalvarNotas}
                className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-800 cursor-pointer"
              >
                {salvo ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Save className="w-3 h-3" />}
                <span>{salvo ? 'Salvo!' : 'Salvar'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Digite observações sobre o cliente (faturamento, banco que utiliza, taxas, melhor horário para ligar)..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600 bg-white"
            />
          </div>

          {/* Histórico de Interações */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Histórico de Disparos & Ligações</span>
            </h4>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 max-h-48 overflow-y-auto">
              {lead.historicoContatos.length === 0 ? (
                <div className="p-3 text-center text-slate-400 italic">
                  Nenhum disparo registrado ainda.
                </div>
              ) : (
                lead.historicoContatos.map((item) => (
                  <div key={item.id} className="p-2.5 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-800">
                        {item.tipo === 'whatsapp' ? '🟢 WhatsApp' : '🟣 Ligação'} · {item.templateTitulo}
                      </strong>
                      <span className="text-slate-400 text-[10px] font-mono">
                        {new Date(item.dataHora).toLocaleDateString('pt-BR')} {new Date(item.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {item.mensagemEnviada && (
                      <p className="text-slate-500 italic line-clamp-2">
                        "{item.mensagemEnviada}"
                      </p>
                    )}
                    {item.observacao && (
                      <p className="text-purple-800 font-medium">
                        Obs: {item.observacao}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Modal de Credenciamento */}
      {lead && wizardAberto && (
        <CredenciamentoWizardModal
          lead={lead}
          isOpen={wizardAberto}
          onClose={() => setWizardAberto(false)}
          onSave={(atualizado) => {
            onUpdateLead?.(atualizado);
            setWizardAberto(false);
          }}
        />
      )}
    </div>
  );
};
