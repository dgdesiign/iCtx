import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Users,
  ShieldAlert,
  CheckCheck,
  Building2,
  Phone,
  Flame,
} from 'lucide-react';
import { Lead, LeadStatus, MessageTemplate } from '../types/crm';
import { INITIAL_TEMPLATES } from '../data/initialTemplates';
import { preencherVariaveisMensagem } from '../utils/storage';

interface BatchMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadsFiltrados: Lead[];
  templates?: MessageTemplate[];
  onUpdateStatus?: (
    leadId: string,
    novoStatus: LeadStatus,
    logInfo?: { tipo: 'whatsapp'; templateTitulo: string; mensagem: string }
  ) => void;
}

interface ItemLote {
  lead: Lead;
  texto: string;
  linkWhatsapp: string;
  telefoneFormatado: string;
  copiado?: boolean;
  disparado?: boolean;
}

export const BatchMessageModal: React.FC<BatchMessageModalProps> = ({
  isOpen,
  onClose,
  leadsFiltrados,
  templates = INITIAL_TEMPLATES,
  onUpdateStatus,
}) => {
  // Lista de templates disponíveis (apenas whatsapp)
  const templatesWhatsapp = useMemo(() => {
    const list = templates.length > 0 ? templates : INITIAL_TEMPLATES;
    return list.filter((t) => t.canal === 'whatsapp');
  }, [templates]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return templatesWhatsapp[0]?.id || 'pronampe_capital';
  });

  const [selectedEtapa, setSelectedEtapa] = useState<string>('contato_1');
  const [quantidade, setQuantidade] = useState<number>(20);
  const [itensLote, setItensLote] = useState<ItemLote[]>([]);
  const [copiouTodos, setCopiouTodos] = useState(false);
  const [copiadosIndividuais, setCopiadosIndividuais] = useState<Record<string, boolean>>({});

  // Helper para normalizar telefone para wa.me/55...
  const formatarLinkWa = (telefone: string, texto: string): string => {
    const digitos = (telefone || '').replace(/\D/g, '');
    if (!digitos) return '';
    let foneFinal = digitos;
    // Se não tiver o DDI 55 do Brasil
    if (!foneFinal.startsWith('55') || (foneFinal.length !== 12 && foneFinal.length !== 13)) {
      foneFinal = `55${digitos}`;
    }
    return `https://wa.me/${foneFinal}?text=${encodeURIComponent(texto)}`;
  };

  // Gerador de lote de mensagens
  const handleGerarLote = () => {
    const templateEscolhido =
      templatesWhatsapp.find((t) => t.id === selectedTemplateId) || templatesWhatsapp[0];
    if (!templateEscolhido) return;

    // Filtro 1: Excluir automaticamente leads com tentativasContato >= 3 (evita queimar contato)
    // Filtro 2: Excluir leads sem telefone
    // Filtro 3: Filtrar por etapa se selecionada
    const candidatos = leadsFiltrados.filter((lead) => {
      if ((lead.tentativasContato || 0) >= 3) return false;
      if (!lead.telefonePrincipal) return false;
      if (selectedEtapa !== 'todas' && lead.status !== selectedEtapa) return false;
      return true;
    });

    const limiteQtd = Math.max(1, Math.min(100, quantidade || 20));
    const selecionados = candidatos.slice(0, limiteQtd);

    const gerados: ItemLote[] = selecionados.map((lead) => {
      const textoInterpolado = preencherVariaveisMensagem(templateEscolhido.texto, lead);
      const linkWa = formatarLinkWa(lead.telefonePrincipal, textoInterpolado);
      return {
        lead,
        texto: textoInterpolado,
        linkWhatsapp: linkWa,
        telefoneFormatado: lead.telefonePrincipalFormatado || lead.telefonePrincipal,
      };
    });

    setItensLote(gerados);
    setCopiadosIndividuais({});
  };

  // Gera automaticamente ao abrir ou quando o modal é aberto pela primeira vez
  useEffect(() => {
    if (isOpen) {
      handleGerarLote();
    }
  }, [isOpen, selectedTemplateId, selectedEtapa]);

  if (!isOpen) return null;

  // Template atualmente selecionado
  const templateAtual =
    templatesWhatsapp.find((t) => t.id === selectedTemplateId) || templatesWhatsapp[0];

  // Total de leads excluídos por limite de 3 tentativas
  const totalQueimados = leadsFiltrados.filter(
    (l) => (l.tentativasContato || 0) >= 3 && (selectedEtapa === 'todas' || l.status === selectedEtapa)
  ).length;

  // Copiar mensagem individual
  const handleCopiarIndividual = (item: ItemLote) => {
    navigator.clipboard.writeText(item.texto);
    setCopiadosIndividuais((prev) => ({ ...prev, [item.lead.id]: true }));
    setTimeout(() => {
      setCopiadosIndividuais((prev) => ({ ...prev, [item.lead.id]: false }));
    }, 2500);
  };

  // Copiar todos os textos com separador ---
  const handleCopiarTodos = () => {
    if (itensLote.length === 0) return;

    const textoConcatenado = itensLote
      .map((item) => `${item.lead.empresaExibicao} — ${item.lead.nomeContato}\n${item.texto}`)
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(textoConcatenado);
    setCopiouTodos(true);
    setTimeout(() => setCopiouTodos(false), 3000);
  };

  // Registrar disparo opcional ao abrir wa.me
  const handleMarcarDisparo = (item: ItemLote) => {
    if (onUpdateStatus) {
      const proximoStatus: LeadStatus =
        item.lead.status === 'novo' ? 'contato_1' : item.lead.status;
      onUpdateStatus(item.lead.id, proximoStatus, {
        tipo: 'whatsapp',
        templateTitulo: templateAtual?.titulo || 'Disparo em Lote',
        mensagem: item.texto,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Topo do Modal */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-600/90 flex items-center justify-center shadow-xs shrink-0">
              <Send className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold truncate">
                  Lote de Mensagens Prontas
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 shrink-0">
                  Sprint 2
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Dispare 20 abordagens personalizadas no WhatsApp em menos de 10 minutos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Configuração e Filtros do Lote */}
        <div className="p-3 sm:p-5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end">
            
            {/* 1. Dropdown de Template */}
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-red-600" />
                <span>Script / Template</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
              >
                {templatesWhatsapp.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo} {t.destaque ? `(${t.destaque})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Dropdown de Etapa */}
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>Etapa do Lead</span>
              </label>
              <select
                value={selectedEtapa}
                onChange={(e) => setSelectedEtapa(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
              >
                <option value="contato_1">Contato 1 (Abordagem Inicial)</option>
                <option value="contato_2">Contato 2 (Follow-up)</option>
                <option value="contato_3">Contato 3 (Ligação / Repescagem)</option>
                <option value="novo">Novo Lead</option>
                <option value="todas">Todas as etapas ativas</option>
              </select>
            </div>

            {/* 3. Input Quantidade */}
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Quantidade</span>
                <span className="text-[10px] text-slate-400 font-normal">máx 100</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantidade}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantidade(isNaN(val) ? 20 : Math.min(100, Math.max(1, val)));
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
                <button
                  type="button"
                  onClick={handleGerarLote}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                  title="Atualizar / Gerar Lote"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Gerar</span>
                </button>
              </div>
            </div>

          </div>

          {/* Barra de Informação e Proteção Anti-Queima */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                {itensLote.length} de {quantidade} preparados
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShieldAlert className="w-3 h-3 text-emerald-600" />
                Filtro anti-queima: leads com ≥3 tentativas excluídos ({totalQueimados})
              </span>
            </div>

            {itensLote.length > 0 && (
              <button
                type="button"
                onClick={handleCopiarTodos}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  copiouTodos
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiouTodos ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiouTodos ? 'Copiado para Área de Transferência!' : `Copiar todos os ${itensLote.length} textos`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-slate-100/60">
          {itensLote.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Nenhum lead elegível encontrado para esta etapa
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não há leads disponíveis com telefone válido e menos de 3 tentativas na etapa selecionada.
                Mude a etapa para &quot;Todas as etapas ativas&quot; ou adicione novos leads no Kanban.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedEtapa('todas');
                  setTimeout(() => handleGerarLote(), 50);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Mostrar todas as etapas</span>
              </button>
            </div>
          ) : (
            itensLote.map((item, index) => {
              const estaCopiado = Boolean(copiadosIndividuais[item.lead.id]);
              const tentativas = item.lead.tentativasContato || 0;

              return (
                <div
                  key={item.lead.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow p-3.5 sm:p-4 space-y-2.5"
                >
                  {/* Cabeçalho do Card: Empresa — Nome + Meta info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 font-mono">
                          #{index + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{item.lead.empresaExibicao}</span>
                          <span className="text-slate-400 font-normal">—</span>
                          <span className="text-slate-700 font-semibold">{item.lead.nomeContato}</span>
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-400">{item.lead.cnpjFormatado}</span>
                        {item.lead.municipio && (
                          <>
                            <span>•</span>
                            <span>
                              {item.lead.municipio}/{item.lead.uf}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {item.telefoneFormatado}
                        </span>
                      </div>
                    </div>

                    {/* Badges de Status & Tentativas */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {item.lead.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          tentativas === 0
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : tentativas === 1
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                        title={`${tentativas} contatos já realizados`}
                      >
                        {tentativas === 0 ? '0 tentativas' : `${tentativas}/3 tentativa${tentativas > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>

                  {/* Bloco de Código com o Texto Interpolado */}
                  <div className="relative group">
                    <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-3 sm:p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed select-all overflow-x-auto max-h-48">
                      {item.texto}
                    </pre>
                  </div>

                  {/* Ações do Card: Copiar & Abrir WhatsApp */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-slate-400">
                      {item.texto.length} caracteres
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Botão Copiar */}
                      <button
                        type="button"
                        onClick={() => handleCopiarIndividual(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          estaCopiado
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                        title="Copiar texto para colar manualmente"
                      >
                        {estaCopiado ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      {/* Link Abrir WhatsApp */}
                      <a
                        href={item.linkWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleMarcarDisparo(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-colors cursor-pointer"
                        title="Abrir WhatsApp Web ou App já com a mensagem pronta"
                      >
                        <span>Abrir WhatsApp</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé Fixo do Modal */}
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-slate-500">
            Dica: clique em &quot;Abrir WhatsApp&quot; para disparar um a um ou &quot;Copiar todos&quot; para enviar em lote.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {itensLote.length > 0 && (
              <button
                type="button"
                onClick={handleCopiarTodos}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  copiouTodos
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                }`}
              >
                {copiouTodos ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiouTodos ? 'Todos Copiados!' : `Copiar todos (${itensLote.length})`}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
