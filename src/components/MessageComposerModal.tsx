import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Building2,
  User,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  Info,
} from 'lucide-react';
import { Lead, LeadStatus, MessageTemplate, TemplateEtapa } from '../types/crm';
import { gerarLinkWhatsApp, preencherVariaveisMensagem } from '../utils/storage';
import { autocorrigeLead } from '../services/cnpjService';
import { quebrarEmBlocos, limparTextoHumano } from './LeadDetailDrawer';

interface MessageComposerModalProps {
  lead: Lead | null;
  templates: MessageTemplate[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateLeadStatus: (leadId: string, novoStatus: LeadStatus, logInfo?: { tipo: 'whatsapp'; templateTitulo: string; mensagem: string }) => void;
  onOpenDetails?: (lead: Lead) => void;
  onRegistrarAcaoContato?: (leadId: string, tipo: 'whatsapp' | 'ligacao', templateTitulo?: string) => void;
}

function sugerirProximaEtapa(statusAtual?: LeadStatus): LeadStatus {
  switch (statusAtual) {
    case 'novo':
      return 'contato_1';
    case 'contato_1':
      return 'contato_2';
    case 'contato_2':
      return 'contato_3';
    case 'contato_3':
      return 'negociacao';
    default:
      return statusAtual || 'contato_1';
  }
}

export const MessageComposerModal: React.FC<MessageComposerModalProps> = ({
  lead: rawLead,
  templates: rawTemplates,
  isOpen,
  onClose,
  onUpdateLeadStatus,
  onOpenDetails,
  onRegistrarAcaoContato,
}) => {
  const lead = rawLead ? autocorrigeLead(rawLead) : null;

  // Sanitização anti-spam: remove qualquer template banido pelo WhatsApp (Conta Isenta / isenção total)
  const templates = (rawTemplates || []).filter(
    (t) =>
      !t.titulo.toLowerCase().includes('conta isenta') &&
      !t.titulo.toLowerCase().includes('conta pj isenta') &&
      !t.texto.toLowerCase().includes('isenção total')
  );

  // Categoria de filtro de templates - inicia em 'todas' para acesso livre a todo o repertório
  const [categoriaAtiva, setCategoriaAtiva] = useState<TemplateEtapa | 'todas'>('todas');
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState<string>('');
  const [textoMensagem, setTextoMensagem] = useState<string>('');
  const [telefoneDestino, setTelefoneDestino] = useState<'principal' | 'secundario'>('principal');
  const [copiado, setCopiado] = useState(false);
  const [blocoCopiadoIndex, setBlocoCopiadoIndex] = useState<number | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<'blocos' | 'editor'>('blocos');
  const [proximaEtapa, setProximaEtapa] = useState<LeadStatus>('contato_1');

  // Inicializa o template quando o modal abre ou o lead muda
  useEffect(() => {
    if (!lead || !isOpen) return;

    // Filtra pelo template padrão do lead ou pelo primeiro disponível
    let tpl = templates.find((t) => t.id === lead.templateId);
    if (!tpl) {
      if (lead.status === 'contato_1') {
        tpl = templates.find((t) => t.etapa === 'contato_2') || templates[0];
      } else if (lead.status === 'contato_2') {
        tpl = templates.find((t) => t.etapa === 'contato_3') || templates[0];
      } else {
        tpl = templates[0];
      }
    }

    if (tpl) {
      setTemplateSelecionadoId(tpl.id);
      setTextoMensagem(preencherVariaveisMensagem(tpl.texto, lead));
    }

    // Deixa em 'todas' para o usuário poder navegar e clicar livremente em qualquer abordagem!
    setCategoriaAtiva('todas');
    setProximaEtapa(sugerirProximaEtapa(lead.status));
    setTelefoneDestino('principal');
  }, [lead?.id, templates, isOpen]);

  // Registra automaticamente início de contato ao abrir o modal de disparo
  useEffect(() => {
    if (isOpen && lead) {
      const tpl = templates.find((t) => t.id === templateSelecionadoId) || templates[0];
      const titulo = tpl?.titulo || 'WhatsApp Rápido';
      if (onRegistrarAcaoContato) {
        onRegistrarAcaoContato(lead.id, 'whatsapp', titulo);
      } else {
        window.dispatchEvent(
          new CustomEvent('ictx:registrarAcaoContato', {
            detail: { leadId: lead.id, tipo: 'whatsapp', templateTitulo: titulo },
          })
        );
      }
    }
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  // Atualiza o texto quando muda o template
  const handleSelecionarTemplate = (tplId: string) => {
    setTemplateSelecionadoId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setTextoMensagem(preencherVariaveisMensagem(tpl.texto, lead));
    }
  };

  // Inserir tag de variável no cursor
  const handleInserirVariavel = (tag: string) => {
    const valor = preencherVariaveisMensagem(tag, lead);
    setTextoMensagem((prev) => prev + ' ' + valor);
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(textoMensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const numeroFinal =
    telefoneDestino === 'principal'
      ? lead.telefonePrincipal
      : lead.telefoneSecundario || lead.telefonePrincipal;

  const telLimpoDestino = (numeroFinal || '').replace(/\D/g, '');
  const linkWhatsappVazio = `https://wa.me/55${telLimpoDestino}`;

  const handleDispararWhatsApp = (avancarStatus = true) => {
    const tplAtual = templates.find((t) => t.id === templateSelecionadoId);
    
    // Atualiza status se selecionado
    if (avancarStatus && proximaEtapa !== lead.status) {
      onUpdateLeadStatus(lead.id, proximaEtapa, {
        tipo: 'whatsapp',
        templateTitulo: tplAtual?.titulo || 'Mensagem Personalizada',
        mensagem: textoMensagem,
      });
    }

    onClose();
  };

  // Filtragem de templates para exibição livre (sem os banidos)
  const templatesFiltrados = templates.filter((t) => {
    if (categoriaAtiva === 'todas') return true;
    return t.etapa === categoriaAtiva;
  });

  const templateAtual = templates.find((t) => t.id === templateSelecionadoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Bar */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  Disparador WhatsApp
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 shrink-0">
                  {lead.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Selecione a abordagem ou personalize antes de enviar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenDetails && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDetails(lead);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                title="Voltar e ver dossiê completo deste lead"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Ver Dossiê</span>
                <span className="sm:hidden text-[11px]">Dossiê</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lead Summary Bar */}
        <div className="px-5 py-3 bg-red-50/60 border-b border-red-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-red-700" />
              <span className="font-bold text-slate-900">{lead.empresaExibicao}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Contato: <strong className="text-slate-800">{lead.nomeContato}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span>CNPJ: <strong className="font-mono text-slate-800">{lead.cnpjFormatado}</strong></span>
            </div>
            {lead.municipio && (
              <div className="text-slate-600">
                <span>{lead.municipio}/{lead.uf}</span>
              </div>
            )}
            {lead.idadeEmpresa && (
              <div className="text-slate-600">
                <span>Idade: <strong>{lead.idadeEmpresa}</strong></span>
              </div>
            )}
            {lead.isMeiDesenquadrado && (
              <div className="w-full flex items-center gap-1.5 text-amber-800 text-[11px] bg-amber-100/70 px-2.5 py-1 rounded-md border border-amber-200/80 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Abordagem Humanizada Ativa: Falando com <strong>{lead.nomeContato}</strong> sobre <em>sua empresa</em> (regra anti-spam).</span>
              </div>
            )}
          </div>

          {/* Destino do Telefone (Principal x Secundário) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Enviar para:</span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white text-xs">
              <button
                type="button"
                onClick={() => setTelefoneDestino('principal')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  telefoneDestino === 'principal'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lead: {lead.telefonePrincipalFormatado || lead.telefonePrincipal}
              </button>
              {lead.telefoneSecundario && (
                <button
                  type="button"
                  onClick={() => setTelefoneDestino('secundario')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    telefoneDestino === 'secundario'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Telefone cadastrado na Receita Federal"
                >
                  Receita: {lead.telefoneSecundarioFormatado || lead.telefoneSecundario}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body: Split view of Templates and Message Editor */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* Left Column: Template Selector (5 cols) */}
          <div className="md:col-span-5 p-3 sm:p-4 flex flex-col max-h-60 md:max-h-none overflow-y-auto bg-slate-50/50 shrink-0">
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Selecione a Abordagem ou Objeção:
              </label>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 no-scrollbar">
                {[
                  { id: 'todas', label: 'Todas' },
                  { id: 'contato_1', label: 'Contato 1' },
                  { id: 'contato_2', label: 'Contato 2' },
                  { id: 'contato_3', label: 'Contato 3' },
                  { id: 'objecao', label: 'Objeções' },
                  { id: 'fechamento', label: 'Fechamento' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaAtiva(cat.id as any)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      categoriaAtiva === cat.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Cards List */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {templatesFiltrados.map((tpl) => {
                const isSelected = tpl.id === templateSelecionadoId;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelecionarTemplate(tpl.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white border-red-600 shadow-sm ring-1 ring-red-600/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                        {tpl.titulo}
                      </h4>
                      {tpl.destaque && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          {tpl.destaque}
                        </span>
                      )}
                    </div>
                    {tpl.descricao && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">
                        {tpl.descricao}
                      </p>
                    )}
                    <div className="text-[11px] text-slate-400 italic line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                      "{tpl.texto.slice(0, 85)}..."
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Message Preview & Customization (7 cols) */}
          <div className="md:col-span-7 p-4 flex flex-col justify-between overflow-y-auto space-y-3">
            <div className="space-y-3">
              {/* Botão Grande 1: Abrir Conversa no WhatsApp (link sem texto na URL) */}
              <a
                href={linkWhatsappVazio}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (onRegistrarAcaoContato) {
                    onRegistrarAcaoContato(lead.id, 'whatsapp', templateAtual?.titulo || 'WhatsApp Rápido');
                  }
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-sm transition-all cursor-pointer"
                title="1. Abrir Conversa no WhatsApp (conversa limpa)"
              >
                <MessageSquare className="w-4 h-4" />
                <span>1. Abrir Conversa no WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              {/* Instrução visual anti-spam */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2 shadow-2xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium">
                  Clique em abrir o WhatsApp, depois copie e cole os blocos um a um.
                </span>
              </div>

              {/* Header com Toggle Blocos x Editor */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>2. {modoVisualizacao === 'blocos' ? 'Blocos Humanizados:' : 'Editor de Texto:'}</span>
                </label>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao('blocos')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      modoVisualizacao === 'blocos'
                        ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Blocos
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao('editor')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      modoVisualizacao === 'editor'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Editar
                  </button>
                </div>
              </div>

              {modoVisualizacao === 'blocos' ? (
                /* Lista de Blocos Numerados com Copiar Individual */
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {quebrarEmBlocos(textoMensagem).map((blocoRaw, idx) => {
                    const bloco = limparTextoHumano(blocoRaw);
                    const isCopiado = blocoCopiadoIndex === idx;

                    return (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold font-mono">
                              {idx + 1}
                            </span>
                            <span>Bloco {idx + 1}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(bloco);
                              setBlocoCopiadoIndex(idx);
                              setTimeout(() => setBlocoCopiadoIndex(null), 2000);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                              isCopiado
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                            title={`Copiar Bloco ${idx + 1}`}
                          >
                            {isCopiado ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{isCopiado ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed font-sans bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 select-all">
                          {bloco}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Modo Editor Livre com Variáveis Dinâmicas */
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Inserir:</span>
                    {[
                      { label: '+ Nome', tag: '{nome}' },
                      { label: '+ Empresa', tag: '{empresa}' },
                      { label: '+ Cidade', tag: '{cidade}' },
                      { label: '+ Idade', tag: '{idade}' },
                      { label: '+ Sócio', tag: '{socio}' },
                    ].map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInserirVariavel(item.tag)}
                        className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 bg-[#efeae2]/30 p-2.5">
                    <textarea
                      rows={6}
                      value={textoMensagem}
                      onChange={(e) => setTextoMensagem(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-y leading-relaxed font-sans"
                      placeholder="Escreva ou selecione a mensagem..."
                    />
                    <div className="flex justify-between items-center pt-2 text-[11px] text-slate-400 border-t border-slate-200/60">
                      <span>Template ativo: <strong>{templateAtual?.titulo || 'Personalizado'}</strong></span>
                      <span>{textoMensagem.length} caracteres</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls: Stage transition & Action buttons */}
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
              {/* Stage Transition Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Após o envio, mover lead para:</span>
                </div>
                <select
                  value={proximaEtapa}
                  onChange={(e) => setProximaEtapa(e.target.value as LeadStatus)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                >
                  <option value="novo">Lead Novo</option>
                  <option value="contato_1">Contato 1 (1ª Mensagem)</option>
                  <option value="contato_2">Contato 2 (Follow-up)</option>
                  <option value="contato_3">Contato 3 (Ligação)</option>
                  <option value="negociacao">Em Negociação</option>
                  <option value="fechado">Fechado</option>
                  <option value="descartado">Descartado</option>
                </select>
              </div>

              {/* Main Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <div className="flex items-center justify-end gap-2 order-2 sm:order-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDispararWhatsApp(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Conclui sem alterar a coluna no funil"
                  >
                    <span>Concluir sem Mover</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDispararWhatsApp(true)}
                  className="px-4 sm:px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Concluir Envio & Avançar Status</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
