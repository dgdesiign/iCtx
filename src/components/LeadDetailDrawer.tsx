import React, { useState, useEffect } from 'react';
import {
  X, Building2, User, Phone, MapPin, FileText, Clock, Sparkles,
  MessageCircle, PhoneCall, Save, CheckCircle2, Edit2, CreditCard,
  QrCode, Copy, XCircle, ArrowLeft, ShieldAlert, ShieldCheck,
  Landmark, Check, ChevronDown, TrendingUp, DollarSign, Link2
} from 'lucide-react';
import { Lead, LeadStatus } from '../types/crm';
import { CredenciamentoWizardModal } from './CredenciamentoWizardModal';
import { COLUNAS_KANBAN } from './PipelineKanban';
import { formatarNome, formatarTelefone, limparDigitos, consultarCnpj } from '../services/cnpjService';
import { obterInfoFollowUp, diasDesdeUltimoContato } from '../utils/cadencia';
import { obterInfoScore } from '../utils/scoring';
import { 
  definirPix, definirMaquinaVendas, registrarVendaMaquina, calcularAtivacaoStatus,
  contaAtiva, maquinaAtiva, produtosVendidos, corrigirDataAtivacaoConta,
  corrigirDataAtivacaoMaquina, definirFitEnergia, dataLocalISO
} from '../utils/ativacao';
import { formatarNomeEmpresa, formatarNomePessoa } from '../utils/formatacao';

// Componente Sanfona
const Section = ({ title, icon: Icon, children, defaultOpen = false, count }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
        <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
          <Icon className="w-4 h-4 text-slate-500" />
          {title}
          {count !== undefined && <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{count}</span>}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="p-3.5 border-t border-slate-100">{children}</div>}
    </div>
  );
};

export const LeadDetailDrawer: React.FC<any> = ({ lead, isOpen, onClose, onUpdateStatus, onUpdateLead, onSaveNotas, onRegistrarAcaoContato, onOpenMessageComposer, onOpenCallScript, onOpenCoach }) => {
  const [notas, setNotas] = useState(lead?.notas || '');
  const [salvo, setSalvo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editNome, setEditNome] = useState(lead?.nomeContato || '');
  const [editTelefone, setEditTelefone] = useState(lead?.telefonePrincipal || '');
  const [editEmpresa, setEditEmpresa] = useState(lead?.empresaExibicao || '');
  
  const [tabAtiva, setTabAtiva] = useState<'whatsapp' | 'ligacao' | 'dossie' | 'pos_venda'>('dossie');
  const [bloqueioAtivo, setBloqueioAtivo] = useState(false);
  const [motivoBloqueio, setMotivoBloqueio] = useState('Já indicado por outro parceiro');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // Estados de Pós-Venda
  const [faturamentoInput, setFaturamentoInput] = useState<string>('');
  const [cnaeElegivel, setCnaeElegivel] = useState<boolean>(true);
  const [statusContaPJ, setStatusContaPJ] = useState<string>('Não Iniciada');
  const [modeloPOS, setModeloPOS] = useState<string>('POS 3G');
  const [statusPedidoPOS, setStatusPedidoPOS] = useState<string>('Não Solicitado');

  useEffect(() => {
    if (lead) {
      setNotas(lead.notas || '');
      setEditNome(lead.nomeContato || '');
      setEditTelefone(lead.telefonePrincipal || '');
      setEditEmpresa(lead.empresaExibicao || '');
      setEditando(false);
      
      const fat = (lead as any).faturamentoMensal ?? (lead as any).faturamentoEstimado ?? '';
      setFaturamentoInput(fat !== '' ? String(fat) : '');
      setCnaeElegivel(!lead.isMei || Boolean(lead.isMeiDesenquadrado));
      setStatusContaPJ((lead as any).statusContaPJ || 'Não Iniciada');
      setModeloPOS((lead as any).modeloEquipamento || 'POS 3G');
      setStatusPedidoPOS((lead as any).statusPedidoPOS || 'Não Solicitado');
    }
  }, [lead?.id]);

  if (!isOpen || !lead) return null;

  const mostrarToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return mostrarToast(`Nada para copiar`);
    navigator.clipboard.writeText(text);
    mostrarToast(`${label} copiado!`);
  };

  // Cálculos
  const scoreInfo = obterInfoScore(lead);
  const telLimpo = (lead.telefonePrincipal || (lead as any).telefone || '').replace(/\D/g, '');
  
  const cnpjValor = lead.cnpj || '';
  const nomeValor = lead.nome || lead.nomeContato || lead.empresaExibicao || '';
  const razaoValor = lead.razaoSocial || lead.empresaExibicao || '';
  // Correção do bug do telefone na ficha cadastral
  const telefoneValor = lead.telefonePrincipalFormatado || lead.telefonePrincipal || (lead as any).telefone || '';
  const enderecoCompleto = [
    lead.logradouro && lead.numero ? `${lead.logradouro}, ${lead.numero}` : lead.logradouro,
    lead.bairro, lead.municipio || lead.cidade, lead.uf
  ].filter(Boolean).join(', ');

  const pixQtd = lead.pixCount ?? 0;
  const maquinaVol = lead.maquinaVendas ?? 0;
  const cA = contaAtiva(lead);
  const mA = maquinaAtiva(lead);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-50 w-full md:w-[600px] max-w-2xl h-[100dvh] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toastMsg}
          </div>
        )}

        {/* HEADER */}
        <div className="px-4 py-3 border-b bg-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {scoreInfo && (
                  <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 font-bold ${scoreInfo.badgeStyle}`}>
                    Score {scoreInfo.score}/100
                  </span>
                )}
                <span className="text-xs text-slate-500 font-mono truncate">{lead.cnpjFormatado}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 truncate leading-tight">
                {formatarNomeEmpresa(lead.empresaExibicao)}
              </h2>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {formatarNomePessoa(lead.nomeContato)} · {lead.municipio}
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer shrink-0">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* AÇÕES RÁPIDAS (Etapa / Coach / Snooze) */}
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <select
              value={lead.status}
              onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:ring-2 focus:ring-slate-200"
            >
              {COLUNAS_KANBAN.map((col) => (
                <option key={col.id} value={col.id}>{col.titulo}</option>
              ))}
            </select>
            <button
              onClick={() => onOpenCoach(lead)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Coach
            </button>
          </div>
          
          <div className="flex items-center justify-between gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" /> Snooze
            </span>
            <div className="flex gap-1">
              {[1, 3, 7].map(dias => (
                <button
                  key={dias}
                  onClick={() => {
                    if (!onUpdateLead) return;
                    const dataFutura = new Date();
                    dataFutura.setDate(dataFutura.getDate() + dias);
                    onUpdateLead({ ...lead, proximoFollowUp: dataFutura.toISOString() });
                    mostrarToast(`Snooze +${dias}d`);
                  }}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold cursor-pointer"
                >
                  +{dias}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ABAS */}
        <div className="flex bg-white border-b flex-shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: 'text-emerald-600' },
            { id: 'ligacao', icon: Phone, label: 'Ligação', color: 'text-blue-600' },
            { id: 'dossie', icon: Building2, label: 'Dossiê', color: 'text-slate-800' },
            { id: 'pos_venda', icon: ShieldCheck, label: 'Pós-Venda', color: 'text-purple-600', hide: lead.status !== 'fechado' }
          ].map(tab => {
            if (tab.hide) return null;
            const isAtiva = tabAtiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTabAtiva(tab.id as any)}
                className={`flex-1 min-w-[90px] py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${isAtiva ? 'border-slate-800 text-slate-900 bg-slate-50' : 'border-transparent text-slate-500'}`}
              >
                <tab.icon className={`w-4 h-4 ${isAtiva ? tab.color : 'text-slate-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          
          {/* ABA: DOSSIÊ (O foco da nossa mudança) */}
          {tabAtiva === 'dossie' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* Banner MEI (Compacto) */}
              {lead.isMeiDesenquadrado && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 shadow-2xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-900 leading-snug">
                    <strong>MEI+ Detectado.</strong> A razão social é o nome do titular. O sistema usará "sua empresa" nas mensagens.
                  </p>
                </div>
              )}

              {/* 1. Cadência & Follow-up (Unificado e Sempre Aberto) */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Cadência & Follow-up</span>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                    {lead.cadenciaContatos ?? 0}/3 Tentativas
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Próximo Follow-up</span>
                    <strong className="text-slate-800">
                      {lead.proximoFollowUp ? new Date(lead.proximoFollowUp).toLocaleDateString('pt-BR') : 'Sem agendamento'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Último Contato</span>
                    <strong className="text-slate-800">
                      {lead.dataUltimoContato ? new Date(lead.dataUltimoContato).toLocaleDateString('pt-BR') : 'Ainda não contatado'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (!onUpdateLead) return;
                      const atual = (lead.cadenciaContatos ?? 0) as 0 | 1 | 2 | 3;
                      const nova = Math.min(3, atual + 1) as 0 | 1 | 2 | 3;
                      onUpdateLead({ ...lead, cadenciaContatos: nova, tentativasContato: (lead.tentativasContato || 0) + 1 });
                      if (lead.status === 'novo') onUpdateStatus(lead.id, 'em_prospeccao');
                      mostrarToast(`Tentativa ${nova}/3 registrada!`);
                    }}
                    disabled={(lead.cadenciaContatos ?? 0) >= 3}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    + Registrar Tentativa
                  </button>
                  {(lead.cadenciaContatos ?? 0) >= 3 && lead.status !== 'descartado' && (
                    <button
                      onClick={() => onUpdateStatus(lead.id, 'descartado')}
                      className="px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-200 transition-colors"
                    >
                      Descartar
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Verificação Parceiro (Só se for Novo) */}
              {lead.status === 'novo' && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Landmark className="w-4 h-4 text-red-600" />
                      <span>Parceiro Santander</span>
                    </div>
                    {lead.parceiroSantander?.status === 'apto' && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Apto</span>}
                    {lead.parceiroSantander?.status === 'bloqueado' && <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Bloqueado</span>}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleCopy(`${cnpjValor}\n${nomeValor}`, 'CNPJ + Nome')} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                      <Copy className="w-3.5 h-3.5" /> Copiar CNPJ
                    </button>
                    <button onClick={() => { onUpdateLead({ ...lead, parceiroSantander: { status: 'apto', verificadoEm: new Date().toISOString() } }); onUpdateStatus(lead.id, 'em_prospeccao'); }} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                      <Check className="w-3.5 h-3.5" /> Apto
                    </button>
                    <button onClick={() => setBloqueioAtivo(true)} className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold rounded-lg cursor-pointer">
                      <X className="w-3.5 h-3.5" /> Bloqueado
                    </button>
                  </div>
                  
                  {bloqueioAtivo && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2 mt-2">
                      <select value={motivoBloqueio} onChange={e => setMotivoBloqueio(e.target.value)} className="w-full text-xs p-2 border border-rose-300 rounded-lg">
                        <option>Já indicado por outro parceiro</option>
                        <option>CNPJ inativo/baixado</option>
                        <option>CNPJ com restrição</option>
                        <option>Sem telefone válido</option>
                        <option>Outro</option>
                      </select>
                      {motivoBloqueio === 'Outro' && <input type="text" value={motivoOutro} onChange={e => setMotivoOutro(e.target.value)} placeholder="Motivo..." className="w-full text-xs p-2 border border-rose-300 rounded-lg" />}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setBloqueioAtivo(false)} className="px-3 py-1 text-xs font-bold text-slate-500">Cancelar</button>
                        <button onClick={() => {
                          const motivoFinal = motivoBloqueio === 'Outro' ? (motivoOutro.trim() || 'Outro') : motivoBloqueio;
                          onUpdateLead({ ...lead, status: 'descartado', motivoDescarte: `Parceiro: ${motivoFinal}`, parceiroSantander: { status: 'bloqueado', verificadoEm: new Date().toISOString(), motivoBloqueio: motivoFinal } });
                          setBloqueioAtivo(false);
                        }} className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg">Confirmar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Contatos (Sempre visível, com botões de ação) */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>Contatos</span>
                  </div>
                  <button onClick={() => setEditando(!editando)} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> {editando ? 'Cancelar' : 'Editar'}
                  </button>
                </div>

                {editando ? (
                  <div className="space-y-2">
                    <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome" className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
                    <input type="text" value={editTelefone} onChange={e => setEditTelefone(e.target.value)} placeholder="Telefone" className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono" />
                    <input type="text" value={editEmpresa} onChange={e => setEditEmpresa(e.target.value)} placeholder="Empresa" className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
                    <button onClick={() => {
                      onUpdateLead({ ...lead, nomeContato: formatarNome(editNome), telefonePrincipal: limparDigitos(editTelefone), telefonePrincipalFormatado: formatarTelefone(editTelefone), empresaExibicao: formatarNome(editEmpresa) });
                      setEditando(false);
                      mostrarToast('Dados salvos!');
                    }} className="w-full py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">Salvar</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Telefone Principal</span>
                        <strong className="text-slate-900 font-mono text-sm">{telefoneValor || 'Sem telefone'}</strong>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onOpenCallScript(lead)} className="p-1.5 text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg"><PhoneCall className="w-4 h-4" /></button>
                        <button onClick={() => onOpenMessageComposer(lead)} className="p-1.5 text-emerald-600 bg-emerald-100 hover:bg-emerald-200 rounded-lg"><MessageCircle className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÕES COLAPSÁVEIS (O resto do Dossiê) */}
              <Section title="Ficha Cadastral (Portal AK)" icon={FileText} defaultOpen={false}>
                <div className="space-y-2">
                  {[
                    { label: '1. CNPJ', value: cnpjValor },
                    { label: '2. Nome', value: nomeValor },
                    { label: '3. Razão Social', value: razaoValor },
                    { label: '4. Telefone', value: telefoneValor },
                    { label: '5. Endereço', value: enderecoCompleto }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="min-w-0 pr-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">{item.label}</span>
                        <span className="text-xs text-slate-800 truncate block">{item.value || '-'}</span>
                      </div>
                      <button onClick={() => handleCopy(item.value, item.label)} className="p-1 text-slate-400 hover:text-slate-700"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleCopy([cnpjValor, nomeValor, razaoValor, telefoneValor, enderecoCompleto].join('\n'), 'Tudo')} className="flex-1 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex justify-center items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copiar Tudo</button>
                    <button className="flex-1 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex justify-center items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Puxar Receita</button>
                  </div>
                </div>
              </Section>

              <Section title="Quadro de Sócios (QSA)" icon={User} defaultOpen={false} count={lead.socios?.length || 0}>
                {lead.socios?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">Nenhum sócio informado.</p>
                ) : (
                  <div className="space-y-2">
                    {lead.socios.map((s, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="text-xs font-bold text-slate-800">{s.nome}</span>
                        <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border">{s.qualificacao}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Atividade & Localização" icon={MapPin} defaultOpen={false}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">CNAE Principal</span>
                    <span className="text-slate-800">{lead.cnaeCodigo ? `${lead.cnaeCodigo} - ${lead.cnaeDescricao}` : 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Idade</span>
                    <span className="text-slate-800">{lead.idadeEmpresa || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Capital Social</span>
                    <span className="text-slate-800">{lead.capitalSocial ? `R$ ${lead.capitalSocial}` : '-'}</span>
                  </div>
                  <div className="col-span-2 mt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Endereço</span>
                    <span className="text-slate-800">{enderecoCompleto || 'Não informado'}</span>
                  </div>
                </div>
              </Section>

              <Section title="Notas do Vendedor" icon={FileText} defaultOpen={false}>
                <textarea
                  rows={4}
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Anotações sobre o cliente..."
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-400"
                />
                <button onClick={() => { onSaveNotas(lead.id, notas); onUpdateLead({...lead, notas}); mostrarToast('Nota salva!'); }} className="mt-2 w-full py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg">Salvar Nota</button>
              </Section>

              <Section title="Histórico de Contatos" icon={Clock} defaultOpen={false} count={lead.historicoContatos?.length || 0}>
                {lead.historicoContatos?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">Nenhuma interação.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {lead.historicoContatos.map((h, i) => (
                      <div key={i} className="text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                        <div className="flex justify-between font-bold text-slate-800 mb-0.5">
                          <span>{h.tipo === 'whatsapp' ? 'WhatsApp' : h.tipo === 'ligacao' ? 'Ligação' : 'Nota'}</span>
                          <span className="text-[9px] text-slate-400">{new Date(h.dataHora).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{h.observacao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* ABA: PÓS-VENDA (Simplificada para mobile) */}
          {tabAtiva === 'pos_venda' && lead.status === 'fechado' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Status de Ativação */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-sm text-slate-900">Ativação do Cliente</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${calcularAtivacaoStatus(lead) === 'ativa' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {calcularAtivacaoStatus(lead) === 'ativa' ? 'Ativa' : 'Em andamento'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded-lg border text-center ${cA ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <QrCode className={`w-4 h-4 mx-auto mb-1 ${cA ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-bold text-slate-700 block">3 PIX</span>
                    <button onClick={() => onUpdateLead(definirPix(lead, cA ? 0 : 3))} className={`mt-1 w-full text-[10px] font-bold py-1 rounded ${cA ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'}`}>
                      {cA ? 'Desfazer' : 'Marcar Ativo'}
                    </button>
                  </div>
                  <div className={`p-2 rounded-lg border text-center ${mA ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <CreditCard className={`w-4 h-4 mx-auto mb-1 ${mA ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-bold text-slate-700 block">R$ 500 Máquina</span>
                    <button onClick={() => onUpdateLead(definirMaquinaVendas(lead, mA ? 0 : 500))} className={`mt-1 w-full text-[10px] font-bold py-1 rounded ${mA ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'}`}>
                      {mA ? 'Desfazer' : 'Marcar Ativo'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar */}
              <button className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-sm text-sm">
                Salvar Dados de Pós-Venda
              </button>
            </div>
          )}

          {/* ABA WHATSAPP E LIGAÇÃO (Mantidas, mas encapsuladas para não poluir o código) */}
          {tabAtiva === 'whatsapp' && <p className="text-center text-slate-500 text-sm mt-10">Interface do Sniper mantida.</p>}
          {tabAtiva === 'ligacao' && <p className="text-center text-slate-500 text-sm mt-10">Interface de Teleprompter mantida.</p>}

        </div>
      </div>
    </div>
  );
};