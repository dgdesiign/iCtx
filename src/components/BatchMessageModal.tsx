import React, { useState, useMemo } from 'react';
import { X, Copy, MessageCircle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Lead, LeadStatus, MessageTemplate } from '../types/crm';
import { INITIAL_TEMPLATES } from '../data/initialTemplates';

const ETAPAS = ['Todos', 'Novo', 'Em Prospecção', 'Negociação'];

const TEMPLATES_PADRAO = [
  { id: 't1', titulo: 'Abordagem Inicial', texto: 'Olá {nome}, tudo bem? Sou do Santander e vi que a {empresa}...' },
  { id: 't2', titulo: 'Follow-up (Sumiu)', texto: '{nome}, tentei falar com você ontem. Conseguiu ver a proposta?' },
  { id: 't3', titulo: 'Oferta Maquininha', texto: 'Temos uma condição especial para a máquina Fit Energia na {empresa}...' },
  { id: 't4', titulo: 'Fechamento PIX', texto: 'Maravilha, {nome}! Segue a chave PIX para ativação da conta.' },
];

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

export const BatchMessageModal: React.FC<BatchMessageModalProps> = ({
  isOpen,
  onClose,
  leadsFiltrados,
  templates = INITIAL_TEMPLATES,
  onUpdateStatus,
}) => {
  const [etapaSelecionada, setEtapaSelecionada] = useState('Todos');
  const [templateSelecionado, setTemplateSelecionado] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Lista de templates integrando os templates reais com fallback
  const listaTemplates = useMemo(() => {
    const list = templates && templates.length > 0 ? templates : INITIAL_TEMPLATES;
    const zapList = list.filter((t) => t.canal === 'whatsapp');
    if (zapList.length > 0) {
      return zapList.map((t) => ({
        id: t.id,
        titulo: t.titulo.replace(/^[^\w\sÀ-ÿ]+/g, '').trim(),
        texto: t.texto,
      }));
    }
    return TEMPLATES_PADRAO;
  }, [templates]);

  // Filtra leads pela etapa
  const leadsVisiveis = useMemo(() => {
    if (etapaSelecionada === 'Todos') return leadsFiltrados;
    return leadsFiltrados.filter((l) => {
      if (etapaSelecionada === 'Novo' && l.status === 'novo') return true;
      if (
        etapaSelecionada === 'Em Prospecção' &&
        (l.status === 'em_prospeccao' ||
          l.status === 'contato_1' ||
          l.status === 'contato_2' ||
          l.status === 'contato_3')
      ) {
        return true;
      }
      if (etapaSelecionada === 'Negociação' && l.status === 'negociacao') return true;
      return false;
    });
  }, [leadsFiltrados, etapaSelecionada]);

  const gerarTexto = (lead: Lead, templateTexto: string) => {
    const nomeRaw = (lead.nomeContato || (lead as any).nome || 'Cliente').trim();
    const nome = nomeRaw.split(/\s+/)[0] || 'Cliente';
    const empresa = lead.empresaExibicao || (lead as any).empresa || 'sua empresa';
    const cidade = lead.municipio || (lead as any).cidade || 'sua região';
    const idade = lead.idadeEmpresa || 'algum tempo';

    return templateTexto
      .replace(/{nome}/g, nome)
      .replace(/{empresa}/g, empresa)
      .replace(/{cidade}/g, cidade)
      .replace(/{idade}/g, idade);
  };

  const handleCopiar = (texto: string, leadId: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(leadId);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleCopiarLote = () => {
    if (!templateSelecionado) return;
    const template = listaTemplates.find((t) => t.id === templateSelecionado);
    if (!template) return;
    const loteTexto = leadsVisiveis.map((l) => gerarTexto(l, template.texto)).join('\n\n---\n\n');
    navigator.clipboard.writeText(loteTexto);
    setToastMsg(`${leadsVisiveis.length} mensagens copiadas para a área de transferência!`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  if (!isOpen) return null;

  const templateAtivo = listaTemplates.find((t) => t.id === templateSelecionado);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER FIXO */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <MessageCircle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Centro de Disparo</h2>
            <p className="text-sm text-gray-500">Envio rápido e padronizado em lote</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors cursor-pointer"
          title="Fechar"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* PAINEL ESQUERDO: CONTROLES (1 Clique) */}
        <div className="w-full md:w-1/3 border-r bg-white flex flex-col flex-shrink-0 overflow-y-auto">
          {/* BLOCO 1: ETAPA */}
          <div className="p-6 border-b">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">1. Filtrar Etapa</h3>
            <div className="flex flex-wrap gap-2">
              {ETAPAS.map((etapa) => (
                <button
                  key={etapa}
                  onClick={() => setEtapaSelecionada(etapa)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    etapaSelecionada === etapa
                      ? 'bg-gray-800 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {etapa}
                </button>
              ))}
            </div>
          </div>

          {/* BLOCO 2: TEMPLATES (Cards) */}
          <div className="p-6 flex-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">2. Escolher Mensagem</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listaTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setTemplateSelecionado(tpl.id)}
                  className={`p-3 rounded-xl border-2 text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    templateSelecionado === tpl.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <MessageCircle
                    size={18}
                    className={templateSelecionado === tpl.id ? 'text-blue-600' : 'text-gray-400'}
                  />
                  <span
                    className={`font-semibold text-sm leading-tight ${
                      templateSelecionado === tpl.id ? 'text-blue-900' : 'text-gray-700'
                    }`}
                  >
                    {tpl.titulo}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PAINEL DIREITO: LISTA COMPACTA */}
        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
          <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10 flex-shrink-0">
            <h3 className="font-semibold text-gray-700">
              Leads Prontos{' '}
              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs ml-2">
                {leadsVisiveis.length}
              </span>
            </h3>
            <button
              onClick={handleCopiarLote}
              disabled={!templateAtivo || leadsVisiveis.length === 0}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Copy size={18} />
              Copiar Lote Completo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!templateAtivo ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageCircle size={48} className="mb-4 opacity-20" />
                <p>Selecione um template à esquerda para visualizar os leads.</p>
              </div>
            ) : leadsVisiveis.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Nenhum lead encontrado nesta etapa.
              </div>
            ) : (
              <div className="space-y-2">
                {leadsVisiveis.map((lead) => {
                  const textoGerado = gerarTexto(lead, templateAtivo.texto);
                  const isCopied = copiadoId === lead.id;
                  const telLimpo = (
                    lead.telefonePrincipal ||
                    lead.telefonePrincipalFormatado ||
                    (lead as any).telefone ||
                    ''
                  ).replace(/\D/g, '');
                  const telExibicao =
                    lead.telefonePrincipalFormatado ||
                    lead.telefonePrincipal ||
                    (lead as any).telefone ||
                    'Sem número';
                  const empresaNome =
                    lead.empresaExibicao ||
                    (lead as any).empresa ||
                    lead.nomeContato ||
                    (lead as any).nome ||
                    'Sem nome';

                  return (
                    <div
                      key={lead.id}
                      className="bg-white p-3 rounded-lg border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex-1 truncate">
                        <p className="font-bold text-gray-800 text-sm truncate">{empresaNome}</p>
                        <p className="text-xs text-gray-500">{telExibicao}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleCopiar(textoGerado, lead.id)}
                          className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isCopied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                          {isCopied ? 'Copiado' : 'Copiar'}
                        </button>
                        {telLimpo.length >= 10 ? (
                          <a
                            href={`https://wa.me/55${telLimpo}?text=${encodeURIComponent(textoGerado)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (onUpdateStatus && templateAtivo) {
                                onUpdateStatus(
                                  lead.id,
                                  lead.status === 'novo' ? 'em_prospeccao' : lead.status,
                                  {
                                    tipo: 'whatsapp',
                                    templateTitulo: templateAtivo.titulo,
                                    mensagem: textoGerado,
                                  }
                                );
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ExternalLink size={16} />
                            WhatsApp
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic px-2">Sem WhatsApp</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchMessageModal;
