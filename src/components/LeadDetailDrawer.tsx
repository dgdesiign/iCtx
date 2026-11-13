import React, { useState, useEffect } from 'react';
import {
  X, Building2, User, Phone, MapPin, FileText, Clock, Sparkles,
  MessageCircle, PhoneCall, Save, CheckCircle2, Edit2, CreditCard,
  QrCode, Copy, XCircle, ArrowLeft, ShieldAlert, ShieldCheck,
  Landmark, Check, ChevronDown, TrendingUp, DollarSign, Link2, ExternalLink, Send, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Lead, LeadStatus } from '../types/crm';
import { CredenciamentoWizardModal } from './CredenciamentoWizardModal';
import { COLUNAS_KANBAN } from './PipelineKanban';
import { formatarNome, formatarTelefone, limparDigitos, consultarCnpj } from '../services/cnpjService';
import { obterInfoScore } from '../utils/scoring';
import { 
  definirPix, definirMaquinaVendas, registrarVendaMaquina, calcularAtivacaoStatus,
  contaAtiva, maquinaAtiva, produtosVendidos, corrigirDataAtivacaoConta,
  corrigirDataAtivacaoMaquina, definirFitEnergia, dataLocalISO
} from '../utils/ativacao';
import { formatarNomeEmpresa, formatarNomePessoa } from '../utils/formatacao';

// ============================================================================
// COMPONENTE SANFONA (ACCORDION)
// ============================================================================
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

// ============================================================================
// TEMPLATES DO SNIPER (WHATSAPP) - ZERO EMOJIS
// ============================================================================
const TEMPLATES_SNIPER = [
  { id: 'visao_geral', titulo: 'Visão Geral', tag: '1º Contato', icone: 'MessageCircle', texto: `Oi {nome}, tudo joia? Vi aqui que você responde pela *{empresa}*, certo?\n\nSou o Douglas Krüger, represento o Banco Santander aqui na região em soluções e abertura de contas PJ. Tô te chamando rapidinho porque acompanho empresas com o perfil da {empresa} para avaliar a viabilidade de condições diferenciadas, como taxas competitivas e linhas de Pronampe. Vale a pena eu dar uma olhada rápida na viabilidade para a {empresa}?` },
  { id: 'recuperacao', titulo: 'Recuperação', tag: 'Recontato', icone: 'RefreshCw', texto: `Oi {nome}, tudo bem?\n\nTentei falar com você anteriormente sobre as condições do Santander para a *{empresa}*. Conseguiu dar uma olhada na proposta ou prefere que eu te ligue em 1 minutinho para alinharmos?` },
  { id: 'oferta_maquina', titulo: 'Máquina', tag: 'GetNet', icone: 'CreditCard', texto: `Oi {nome}, tudo bem? Sou o Douglas Krüger do Santander.\n\nMuitos empresários do setor da *{empresa}* estão buscando alternativas para reduzir os custos com taxas de maquininhas e cobranças à distância. Temos uma condição especial para a máquina GetNet / Fit Energia. Posso te enviar as taxas agora?` },
  { id: 'fechamento', titulo: 'Fechamento', tag: 'Etapa Final', icone: 'CheckCircle2', texto: `Perfeito {nome}! Vamos avançar com o credenciamento e ativação da conta da *{empresa}*.\n\nO processo é 100% digital e rápido. Me confirma apenas se o CNPJ continua 100% regular para darmos o start?` },
  { id: 'regional', titulo: 'Proximidade', tag: 'Regional', icone: 'MapPin', texto: `Oi {nome}, tudo bem? Sou o Douglas Krüger, consultor do Santander aqui na nossa região de {cidade}.\n\nPrecisava falar rapidamente com o responsável pela *{empresa}* sobre um pacote especial com isenção e linhas para o CNPJ de vocês. Você prefere que eu te ligue em 1 minutinho ou conversamos por aqui?` },
  { id: 'objecao', titulo: 'Objeção', tag: 'Contorno', icone: 'ShieldAlert', texto: `Entendo perfeitamente {nome}, a maioria dos nossos parceiros já tinha relacionamento em outros bancos. Nossa intenção não é substituir seu banco principal agora, mas garantir que a *{empresa}* tenha uma segunda conta PJ sem custo fixo e com linhas de crédito abertas.` },
];

// ============================================================================
// ROTEIROS DE LIGAÇÃO (com Teleprompter)
// ============================================================================
const ROTEIROS_LIGACAO = [
  { id: 'abordagem_inicial', titulo: 'Abordagem Inicial', tag: '1º Contato', etapas: [{ fase: 'QUEBRA-GELO', fala: 'Olá {nome}, tudo bem? Aqui é Douglas Krüger do Santander Empresas. Vi que a {empresa} atua forte aqui na região de {cidade}.' }, { fase: 'GATILHO', fala: 'Estou te ligando rápido porque mapeamos o segmento da {empresa} e liberamos condições diferenciadas com isenção de tarifa na conta PJ e taxas especiais de Pronampe. Hoje você paga alguma taxa mensal de manutenção no seu banco atual?' }, { fase: 'FECHAMENTO', fala: 'Consigo garantir essa isenção completa. Posso te mandar o comparativo oficial direto no seu WhatsApp agora para você olhar sem compromisso?' }] },
  { id: 'quebra_objecao', titulo: 'Quebra de Objeção', tag: 'Contorno', etapas: [{ fase: 'SE JÁ TEM BANCO', fala: 'Perfeito {nome}, a maioria dos nossos parceiros já tinham relacionamento em outros bancos. Nossa intenção não é substituir seu banco principal agora, mas sim garantir que a {empresa} tenha uma segunda conta PJ blindada sem custo fixo e com linhas de crédito abertas.' }, { fase: 'SE NÃO TEM TEMPO', fala: 'Compreendo perfeitamente, tempo de empresário é ouro! Por isso o credenciamento é 100% digital pelo celular e leva menos de 5 minutos, sem pisar em agência.' }] },
  { id: 'oferta_maquina', titulo: 'Máquina & Taxas', tag: 'GetNet', etapas: [{ fase: 'ABORDAGEM DIRETA', fala: 'Oi {nome}, tudo joia? Douglas do Santander. Liguei rápido porque liberamos uma campanha direta para reduzir as taxas de maquininha de empresas em {cidade}.' }, { fase: 'PROPOSTA', fala: 'Temos a máquina GetNet com isenção de aluguel por faturamento e taxas agressivas. Me fala qual o volume aproximado no cartão por mês que eu já gero a tabela de economia no seu WhatsApp.' }] },
  { id: 'ativacao_fechamento', titulo: 'Ativação & PIX', tag: 'Fechamento', etapas: [{ fase: 'PARABENIZAR', fala: 'Olá {nome}, tudo bem? Douglas aqui. Vi que a proposta da {empresa} foi concluída e a conta Santander Empresas já está habilitada.' }, { fase: 'PASSO DE ATIVAÇÃO', fala: 'Para validar o pacote com as isenções que combinamos, só precisamos fazer o primeiro login no aplicativo e registrar a sua chave PIX CNPJ.' }] },
];

// ============================================================================
// UTILITÁRIOS
// ============================================================================
export function quebrarEmBlocos(texto: string): string[] {
  if (!texto) return [];
  const pedacos = texto.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
  if (pedacos.length === 1 && texto.includes('\n')) return texto.split('\n').map((p) => p.trim()).filter((p) => p.length > 0);
  return pedacos.length > 0 ? pedacos : [texto.trim()];
}

export function limparTextoHumano(bloco: string): string {
  return bloco
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

// Componente para renderizar o ícone do Sniper dinamicamente
const SniperIcon = ({ name, className }: { name: string, className?: string }) => {
  switch (name) {
    case 'MessageCircle': return <MessageCircle className={className} />;
    case 'RefreshCw': return <RefreshCw className={className} />;
    case 'CreditCard': return <CreditCard className={className} />;
    case 'CheckCircle2': return <CheckCircle2 className={className} />;
    case 'MapPin': return <MapPin className={className} />;
    case 'ShieldAlert': return <ShieldAlert className={className} />;
    default: return <MessageCircle className={className} />;
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export const LeadDetailDrawer: React.FC<any> = ({ lead, isOpen, onClose, onUpdateStatus, onUpdateLead, onSaveNotas, onRegistrarAcaoContato, onOpenMessageComposer, onOpenCallScript, onOpenCoach }) => {
  const [notas, setNotas] = useState(lead?.notas || '');
  const [editando, setEditando] = useState(false);
  const [editNome, setEditNome] = useState(lead?.nomeContato || '');
  const [editTelefone, setEditTelefone] = useState(lead?.telefonePrincipal || '');
  const [editEmpresa, setEditEmpresa] = useState(lead?.empresaExibicao || '');
  
  const [tabAtiva, setTabAtiva] = useState<'whatsapp' | 'ligacao' | 'dossie' | 'pos_venda'>('dossie');
  const [bloqueioAtivo, setBloqueioAtivo] = useState(false);
  const [motivoBloqueio, setMotivoBloqueio] = useState('Já indicado por outro parceiro');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [templateAtivo, setTemplateAtivo] = useState<any>(null);
  const [blocoCopiadoIndex, setBlocoCopiadoIndex] = useState<number | null>(null);
  const [roteiroAtivo, setRoteiroAtivo] = useState<any>(null);

  useEffect(() => {
    if (lead) {
      setNotas(lead.notas || '');
      setEditNome(lead.nomeContato || '');
      setEditTelefone(lead.telefonePrincipal || '');
      setEditEmpresa(lead.empresaExibicao || '');
      setEditando(false);
      setTemplateAtivo(null);
      setRoteiroAtivo(null);
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

  const interpolar = (txt: string) => {
    const nomeRaw = (lead.nomeContato || (lead as any).nome || 'Cliente').trim();
    const primeiroNome = nomeRaw.split(/\s+/)[0] || 'Cliente';
    return txt.replace(/{nome}/g, primeiroNome).replace(/{empresa}/g, lead.empresaExibicao || 'sua empresa').replace(/{cidade}/g, lead.municipio || 'sua região');
  };

  const scoreInfo = obterInfoScore(lead);
  const isCompliance = scoreInfo && scoreInfo.score < 0;
  const telLimpo = (lead.telefonePrincipal || (lead as any).telefone || '').replace(/\D/g, '');
  
  const cnpjValor = lead.cnpj || '';
  const nomeValor = lead.nome || lead.nomeContato || lead.empresaExibicao || '';
  const razaoValor = lead.razaoSocial || lead.empresaExibicao || '';
  const telefoneValor = lead.telefonePrincipalFormatado || lead.telefonePrincipal || (lead as any).telefone || '';
  const enderecoCompleto = [lead.logradouro, lead.numero, lead.bairro, lead.municipio || lead.cidade, lead.uf].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`bg-slate-50 w-full md:w-[600px] max-w-2xl h-[100dvh] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 ${isCompliance ? 'border-l-4 border-rose-600' : ''}`}>
        
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toastMsg}
          </div>
        )}

        <div className="px-4 py-3 border-b bg-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {scoreInfo && <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 font-bold ${scoreInfo.badgeStyle}`}>Score {scoreInfo.score}/100</span>}
                <span className="text-xs text-slate-500 font-mono truncate">{lead.cnpjFormatado}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 truncate leading-tight">{formatarNomeEmpresa(lead.empresaExibicao)}</h2>
              <p className="text-xs text-slate-500 truncate mt-0.5">{formatarNomePessoa(lead.nomeContato)} · {lead.municipio}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer shrink-0"><X size={24} /></button>
          </div>
          {isCompliance && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-[11px] font-bold text-rose-800">Lead bloqueado por compliance. Não indicar.</span>
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-white border-b border-slate-200 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <select value={lead.status} onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)} className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:ring-2 focus:ring-slate-200 flex-1">
              {COLUNAS_KANBAN.map((col) => <option key={col.id} value={col.id}>{col.titulo}</option>)}
            </select>
            <button onClick={() => onOpenCoach(lead)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer shrink-0">
              <Sparkles className="w-3.5 h-3.5" /> Coach
            </button>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-2 shrink-0"><Clock className="w-3 h-3 inline mr-1" />Snooze</span>
            <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); onUpdateLead({ ...lead, proximoFollowUp: d.toISOString() }); mostrarToast('Snooze +1d'); }} className="flex-1 py-1 bg-white text-slate-700 border border-slate-200 rounded text-[10px] font-bold cursor-pointer hover:bg-slate-100">+1d</button>
            <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+3); onUpdateLead({ ...lead, proximoFollowUp: d.toISOString() }); mostrarToast('Snooze +3d'); }} className="flex-1 py-1 bg-white text-slate-700 border border-slate-200 rounded text-[10px] font-bold cursor-pointer hover:bg-slate-100">+3d</button>
            <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+7); onUpdateLead({ ...lead, proximoFollowUp: d.toISOString() }); mostrarToast('Snooze +7d'); }} className="flex-1 py-1 bg-white text-slate-700 border border-slate-200 rounded text-[10px] font-bold cursor-pointer hover:bg-slate-100">+7d</button>
          </div>
        </div>

        <div className="flex bg-white border-b flex-shrink-0 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {[
            { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' },
            { id: 'ligacao', icon: Phone, label: 'Ligação' },
            { id: 'dossie', icon: Building2, label: 'Dossiê' },
            { id: 'pos_venda', icon: ShieldCheck, label: 'Pós-Venda', hide: lead.status !== 'fechado' }
          ].map(tab => {
            if (tab.hide) return null;
            const isAtiva = tabAtiva === tab.id;
            return (
              <button key={tab.id} onClick={() => setTabAtiva(tab.id as any)} className={`flex-1 min-w-[90px] py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap snap-start ${isAtiva ? 'border-slate-800 text-slate-900 bg-slate-50' : 'border-transparent text-slate-500'}`}>
                <tab.icon className={`w-4 h-4 ${isAtiva ? 'text-slate-800' : 'text-slate-400'}`} /> {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          
          {tabAtiva === 'whatsapp' && (
            <div className="animate-in fade-in">
              {!templateAtivo ? (
                <>
                  <p className="text-[11px] text-slate-500 mb-2 font-medium">Selecione um gatilho Sniper:</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {TEMPLATES_SNIPER.map(tpl => (
                      <button key={tpl.id} onClick={() => {
                        setTemplateAtivo(tpl);
                        if (onRegistrarAcaoContato) onRegistrarAcaoContato(lead.id, 'whatsapp', tpl.titulo);
                      }} className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded-2xl hover:border-emerald-400 active:scale-95 transition-all cursor-pointer aspect-square shadow-2xs">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 mb-1.5">
                          <SniperIcon name={tpl.icone} className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">{tpl.titulo}</span>
                        <span className="text-[8px] text-slate-400 mt-0.5">{tpl.tag}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <button onClick={() => setTemplateAtivo(null)} className="text-xs font-bold text-slate-500 flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Voltar aos Gatilhos</button>
                  <a href={`https://wa.me/55${telLimpo}`} target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm">
                    <MessageCircle className="w-5 h-5" /> Abrir Conversa no WhatsApp
                  </a>
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
                    <span>Copie os blocos um a um e cole no WhatsApp para evitar anti-spam.</span>
                  </div>
                  {quebrarEmBlocos(interpolar(templateAtivo.texto)).map((bloco, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 relative shadow-2xs">
                      <span className="text-[9px] font-bold text-slate-400 block mb-1">BLOCO {idx+1}</span>
                      <p className="text-xs text-slate-700 pr-10 leading-relaxed">{limparTextoHumano(bloco)}</p>
                      <button onClick={() => { handleCopy(limparTextoHumano(bloco), `Bloco ${idx+1}`); setBlocoCopiadoIndex(idx); }} className={`absolute top-2 right-2 p-1.5 rounded-lg ${blocoCopiadoIndex === idx ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {blocoCopiadoIndex === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tabAtiva === 'ligacao' && (
            <div className="animate-in fade-in">
              <div className="bg-blue-600 text-white p-3 rounded-xl flex justify-between items-center mb-3">
                <div><span className="text-[10px] block opacity-80">Ligando para:</span><strong className="text-sm">{lead.nomeContato}</strong></div>
                <a href={`tel:${telLimpo}`} className="bg-white text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Phone size={14} /> Discar</a>
              </div>

              {!roteiroAtivo ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500 mb-2 font-medium">Selecione um roteiro:</p>
                  {ROTEIROS_LIGACAO.map(r => (
                    <button key={r.id} onClick={() => setRoteiroAtivo(r)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-blue-400 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">{r.titulo}</span>
                        <span className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded">{r.tag}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col animate-in slide-in-from-right">
                  <div className="p-3 bg-slate-800 flex justify-between items-center text-white">
                    <button onClick={() => setRoteiroAtivo(null)} className="flex items-center gap-1 text-sm text-slate-300 hover:text-white"><ArrowLeft className="w-4 h-4" /> Voltar</button>
                    <span className="text-xs font-bold text-slate-300">{roteiroAtivo.titulo}</span>
                    <a href={`tel:${telLimpo}`} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Phone size={14} /> Discar</a>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {roteiroAtivo.etapas.map((e: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">{e.fase}</span>
                        <p className="text-base text-white leading-relaxed font-medium bg-slate-800/50 p-4 rounded-xl border-l-4 border-blue-500">
                          {interpolar(e.fala)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tabAtiva === 'dossie' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900"><Clock className="w-4 h-4 text-slate-500" /> Cadência & Follow-up</div>
                  <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full">{lead.cadenciaContatos ?? 0}/3</span>
                </div>
                <button onClick={() => {
                  const atual = (lead.cadenciaContatos ?? 0) as 0|1|2|3;
                  const nova = Math.min(3, atual + 1) as 0|1|2|3;
                  onUpdateLead({ ...lead, cadenciaContatos: nova });
                  mostrarToast(`Tentativa ${nova}/3!`);
                }} className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg">+ Registrar Tentativa</button>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900"><Phone className="w-4 h-4 text-slate-500" /> Contatos</div>
                  <button onClick={() => setEditando(!editando)} className="text-[10px] font-bold text-red-600"><Edit2 className="w-3 h-3 inline" /> {editando ? 'Cancelar' : 'Editar'}</button>
                </div>
                {editando ? (
                  <div className="space-y-2">
                    <input value={editNome} onChange={e => setEditNome(e.target.value)} className="w-full text-xs p-2 border rounded-lg" placeholder="Nome" />
                    <input value={editTelefone} onChange={e => setEditTelefone(e.target.value)} className="w-full text-xs p-2 border rounded-lg font-mono" placeholder="Telefone" />
                    <input value={editEmpresa} onChange={e => setEditEmpresa(e.target.value)} className="w-full text-xs p-2 border rounded-lg" placeholder="Empresa" />
                    <button onClick={() => { onUpdateLead({ ...lead, nomeContato: editNome, telefonePrincipal: editTelefone, empresaExibicao: editEmpresa }); setEditando(false); mostrarToast('Salvo!'); }} className="w-full py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">Salvar</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Telefone</span><strong className="text-slate-900 font-mono text-sm">{telefoneValor || 'Sem telefone'}</strong></div>
                    <div className="flex gap-1">
                      <button onClick={() => onOpenCallScript(lead)} className="p-1.5 text-blue-600 bg-blue-100 rounded-lg"><PhoneCall className="w-4 h-4" /></button>
                      <button onClick={() => onOpenMessageComposer(lead)} className="p-1.5 text-emerald-600 bg-emerald-100 rounded-lg"><MessageCircle className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>

              <Section title="Ficha Cadastral (Portal AK)" icon={FileText}>
                <div className="space-y-2 text-xs">
                  {[ {l:'CNPJ', v:cnpjValor}, {l:'Nome', v:nomeValor}, {l:'Razão Social', v:razaoValor}, {l:'Telefone', v:telefoneValor}, {l:'Endereço', v:enderecoCompleto} ].map((i, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                      <div><span className="text-[9px] text-slate-400 block">{i.l}</span><span className="text-slate-800">{i.v || '-'}</span></div>
                      <button onClick={() => handleCopy(i.v, i.l)} className="text-slate-400"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Quadro de Sócios (QSA)" icon={User} count={lead.socios?.length || 0}>
                {lead.socios?.length === 0 ? <p className="text-xs text-slate-400 italic">Nenhum sócio.</p> : lead.socios.map((s:any, i:number) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded mb-1">
                    <span className="text-xs font-bold">{s.nome}</span><span className="text-[10px] text-slate-500">{s.qualificacao}</span>
                  </div>
                ))}
              </Section>

              <Section title="Notas do Vendedor" icon={FileText}>
                <textarea rows={3} value={notas} onChange={e => setNotas(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded-lg" placeholder="Anotações..." />
                <button onClick={() => { onSaveNotas(lead.id, notas); onUpdateLead({...lead, notas}); mostrarToast('Nota salva!'); }} className="mt-2 w-full py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg">Salvar Nota</button>
              </Section>

              <Section title="Histórico de Contatos" icon={Clock} count={lead.historicoContatos?.length || 0}>
                {lead.historicoContatos?.length === 0 ? <p className="text-xs text-slate-400 italic">Nenhuma interação.</p> : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {lead.historicoContatos.map((h: any, i: number) => (
                      <div key={i} className="text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                        <div className="flex justify-between font-bold text-slate-800"><span>{h.tipo}</span><span className="text-[9px] text-slate-400">{new Date(h.dataHora).toLocaleString('pt-BR')}</span></div>
                        <p className="text-slate-600">{h.observacao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}

          {tabAtiva === 'pos_venda' && lead.status === 'fechado' && (
            <div className="text-center p-6 text-slate-500 text-sm">Interface de Pós-Venda mantida (Ativação PIX e Máquina).</div>
          )}

        </div>
      </div>
    </div>
  );
};