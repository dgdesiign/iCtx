import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  Building2,
  Phone,
  Landmark,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Link2,
  FileText,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  Save,
  CheckCircle2,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import {
  Client,
  StatusContaPJ,
  ModeloEquipamento,
  StatusPedidoPOS,
  normalizarParaClient,
} from '../types/Client';
import { MessageTemplate, LeadStatus } from '../types/crm';
import {
  carregarTemplates,
  preencherVariaveisMensagem,
  gerarLinkWhatsApp,
} from '../utils/storage';
import { ehCelularBR, formatarCelularBR } from '../utils/telefone';

interface ClientDossierProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | any | null;
  templates?: MessageTemplate[];
  onUpdateClient?: (updated: Client) => void;
  onAvancarEtapa?: (client: Client) => void;
  onGerarLinkContaPJ?: (client: Client) => void;
}

const ETAPAS_FUNIL_SEQUENCIA = [
  'Novo',
  'Em Prospecção',
  'Negociação',
  'Fechado',
];

const STATUS_CONTA_OPCOES: StatusContaPJ[] = [
  'Não Iniciada',
  'Link Enviado',
  'Em Análise',
  'Aprovada',
  'Derivada para Agência',
];

const STATUS_PEDIDO_OPCOES: StatusPedidoPOS[] = [
  'Não Solicitado',
  'Submetido',
  'Em Processo de Entrega',
  'Entregue',
];

const MODELOS_GETNET_OPCOES: ModeloEquipamento[] = [
  'POS 3G',
  'Get Clássica',
  'Get Tap',
  'Link de Pagamento',
];

export const ClientDossier: React.FC<ClientDossierProps> = ({
  isOpen,
  onClose,
  client: clientInput,
  templates: templatesProp,
  onUpdateClient,
  onAvancarEtapa,
  onGerarLinkContaPJ,
}) => {
  // Lista de templates carregados
  const listaTemplates = useMemo(() => {
    if (templatesProp && templatesProp.length > 0) return templatesProp;
    return carregarTemplates();
  }, [templatesProp]);

  const [formData, setFormData] = useState<Client>(() => normalizarParaClient(clientInput));
  const [templateAtivoId, setTemplateAtivoId] = useState<string>('');
  const [textoMensagem, setTextoMensagem] = useState<string>('');
  const [notaRapida, setNotaRapida] = useState<string>('');
  
  // Feedbacks visuais
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [copiadoMsg, setCopiadoMsg] = useState(false);
  const [copiadoCnpj, setCopiadoCnpj] = useState(false);
  const [salvoFeedback, setSalvoFeedback] = useState(false);

  // Inicializa dados ao abrir ou trocar cliente
  useEffect(() => {
    if (clientInput && isOpen) {
      const norm = normalizarParaClient(clientInput);
      setFormData(norm);
      setNotaRapida(norm.observacoes || (norm as any).notas || '');

      // Seleciona template padrão mais adequado
      if (listaTemplates.length > 0) {
        let defaultTpl = listaTemplates.find((t) => t.canal === 'whatsapp');
        if (!defaultTpl) defaultTpl = listaTemplates[0];
        setTemplateAtivoId(defaultTpl.id);
        setTextoMensagem(preencherVariaveisMensagem(defaultTpl.texto, norm));
      }
    }
  }, [clientInput, isOpen, listaTemplates]);

  if (!isOpen || !clientInput) return null;

  // Formatação de CNPJ
  const formatarCnpj = (valor: string) => {
    const limpo = valor.replace(/\D/g, '');
    if (limpo.length !== 14) return valor;
    return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const telefoneLimpo = (formData.telefone || (formData as any).telefonePrincipal || '').replace(/\D/g, '');
  const isCelular = ehCelularBR(telefoneLimpo);
  const telefoneFormatado = formatarCelularBR(telefoneLimpo) || formData.telefone || 'Sem telefone';
  const isFaturamentoAcima60k = (formData.faturamentoMensal ?? 0) >= 60000;

  // CNAE elegível: não é MEI puro desqualificado
  const cnaeElegivel = !formData.isMei || Boolean(formData.isMeiDesenquadrado);

  const handleFieldChange = <K extends keyof Client>(field: K, value: Client[K]) => {
    setFormData((prev) => {
      const atualizado = { ...prev, [field]: value };
      if (onUpdateClient) {
        onUpdateClient(atualizado);
      }
      return atualizado;
    });
  };

  const handleTrocarTemplate = (tplId: string) => {
    setTemplateAtivoId(tplId);
    const tpl = listaTemplates.find((t) => t.id === tplId);
    if (tpl) {
      setTextoMensagem(preencherVariaveisMensagem(tpl.texto, formData));
    }
  };

  const handleCopiarMensagem = () => {
    navigator.clipboard.writeText(textoMensagem);
    setCopiadoMsg(true);
    setTimeout(() => setCopiadoMsg(false), 2000);
  };

  const handleDispararWhatsApp = () => {
    if (!telefoneLimpo) return;
    const linkWa = gerarLinkWhatsApp(telefoneLimpo, textoMensagem);
    if (linkWa) {
      window.open(linkWa, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopiarLinkSantander = () => {
    const docLimpo = formData.cnpj.replace(/\D/g, '');
    const linkGerado = `https://santander.com.br/abertura-conta-pj?ref=ictx&cnpj=${docLimpo}&cli=${formData.id}`;
    navigator.clipboard.writeText(linkGerado);
    setCopiadoLink(true);
    setTimeout(() => setCopiadoLink(false), 2500);

    // Se a conta não estava iniciada, avança para Link Enviado
    if (formData.statusContaPJ === 'Não Iniciada') {
      handleFieldChange('statusContaPJ', 'Link Enviado');
    }

    if (onGerarLinkContaPJ) {
      onGerarLinkContaPJ(formData);
    }
  };

  const handleCopiarCnpj = () => {
    navigator.clipboard.writeText(formData.cnpj.replace(/\D/g, ''));
    setCopiadoCnpj(true);
    setTimeout(() => setCopiadoCnpj(false), 2000);
  };

  const handleSalvarTudo = () => {
    const atualizado: Client = {
      ...formData,
      observacoes: notaRapida,
      notas: notaRapida,
    };
    setFormData(atualizado);
    if (onUpdateClient) {
      onUpdateClient(atualizado);
    }
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 2000);
  };

  const handleAvancarEtapa = () => {
    const statusAtual = formData.statusFunil || 'Novo';
    const idx = ETAPAS_FUNIL_SEQUENCIA.findIndex(
      (e) => e.toLowerCase() === statusAtual.toLowerCase() || e === statusAtual
    );
    const proxima =
      idx >= 0 && idx < ETAPAS_FUNIL_SEQUENCIA.length - 1
        ? ETAPAS_FUNIL_SEQUENCIA[idx + 1]
        : 'Fechado';

    const atualizado: Client = {
      ...formData,
      statusFunil: proxima,
      status: proxima.toLowerCase().replace(/\s+/g, '_'),
      observacoes: notaRapida,
      notas: notaRapida,
    };

    setFormData(atualizado);

    if (onAvancarEtapa) {
      onAvancarEtapa(atualizado);
    } else if (onUpdateClient) {
      onUpdateClient(atualizado);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. CABEÇALHO COMPACTO & BOTÃO WHATSAPP GIGANTE */}
        <header className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-sm">
              <Building2 className="w-5 h-5 text-slate-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  {formData.nomeFantasia || formData.razaoSocial}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {formData.statusFunil || 'Novo'}
                </span>
                {formData.completudeCadastral && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <BadgeCheck className="w-3 h-3" />
                    Biometria OK
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
                <span className="font-mono">{formatarCnpj(formData.cnpj)}</span>
                <button
                  type="button"
                  onClick={handleCopiarCnpj}
                  className="hover:text-slate-800 transition-colors p-0.5"
                  title="Copiar CNPJ"
                >
                  {copiadoCnpj ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-slate-600 font-semibold">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {telefoneFormatado}
                </span>
              </div>
            </div>
          </div>

          {/* Botão de Disparo WhatsApp Gigante + Fechar */}
          <div className="flex items-center gap-2.5 shrink-0 self-stretch md:self-auto justify-end">
            <button
              type="button"
              onClick={handleDispararWhatsApp}
              disabled={!telefoneLimpo}
              className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                telefoneLimpo
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 hover:shadow-lg'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
              title={telefoneLimpo ? 'Abrir conversa no WhatsApp' : 'Telefone inválido'}
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp Imediato</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* CORPO DO COCKPIT: GRID 2 COLUNAS (DISPARADOR CENTRAL + BARRA DE CHECKPOINTS) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* 2. MÓDULO CENTRAL: DISPARADOR RÁPIDO (A Alma do Sistema) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Disparador Rápido de Scripts
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Selecione o script e envie em 1 clique
                  </span>
                </div>

                {/* Seleção Rápida de Templates (Chips Ágeis) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {listaTemplates.slice(0, 5).map((tpl) => {
                    const ativo = templateAtivoId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleTrocarTemplate(tpl.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          ativo
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tpl.titulo.replace(/^[^\w\s]+/, '').trim() || tpl.titulo}
                      </button>
                    );
                  })}
                </div>

                {/* Caixa de Texto Interativa da Mensagem */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Mensagem personalizada para o cliente:</span>
                    <button
                      type="button"
                      onClick={handleCopiarMensagem}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                      {copiadoMsg ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Texto</span>
                        </>
                      )}
                    </button>
                  </div>

                  <textarea
                    rows={7}
                    value={textoMensagem}
                    onChange={(e) => setTextoMensagem(e.target.value)}
                    className="w-full text-xs font-sans p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all text-slate-800 leading-relaxed resize-none"
                    placeholder="Digite ou edite a mensagem..."
                  />
                </div>

                {/* Ações do Disparador */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <span className="text-[11px] text-slate-400">
                    Disparo oficial wa.me sem risco de bloqueio
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopiarMensagem}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {copiadoMsg ? 'Texto Copiado!' : 'Copiar Texto'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDispararWhatsApp}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar no WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Área de Nota Rápida / Resumo da Conversa */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Nota Rápida / Resumo da Conversa
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-400">Salva no histórico do lead</span>
                </div>
                <textarea
                  rows={2}
                  value={notaRapida}
                  onChange={(e) => setNotaRapida(e.target.value)}
                  onBlur={handleSalvarTudo}
                  placeholder="Ex: Conversou com o sócio Carlos, solicitou proposta para 2 máquinas D1..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all text-slate-800 resize-none"
                />
              </div>
            </div>

            {/* 3. BARRA LATERAL: CHECKPOINTS DE VENDA (Conferência Ágil) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* CHECKPOINT 1: QUALIFICAÇÃO & FATURAMENTO */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-slate-700" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      1. Qualificação
                    </h4>
                  </div>
                  {isFaturamentoAcima60k && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      Isenção 6 Máquinas
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* CNAE Elegível */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      CNAE Elegível
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleFieldChange('isMei', false)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          cnaeElegivel
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        Sim (PJ/MEI+)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldChange('isMei', true)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          !cnaeElegivel
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        Não (MEI)
                      </button>
                    </div>
                  </div>

                  {/* Faturamento Mensal R$ */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Faturamento Mensal
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[11px] font-bold text-slate-400 pointer-events-none">
                        R$
                      </span>
                      <input
                        type="number"
                        value={formData.faturamentoMensal ?? ''}
                        onChange={(e) =>
                          handleFieldChange(
                            'faturamentoMensal',
                            e.target.value === '' ? undefined : Number(e.target.value)
                          )
                        }
                        placeholder="0"
                        className="w-full pl-8 pr-2 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {formData.cnae && (
                  <div className="text-[11px] text-slate-500 truncate font-mono bg-slate-50 px-2 py-1 rounded">
                    CNAE: {formData.cnae} {formData.cnaeDescricao ? `- ${formData.cnaeDescricao}` : ''}
                  </div>
                )}
              </div>

              {/* CHECKPOINT 2: CONTA PJ (SANTANDER) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-slate-700" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      2. Conta PJ (Santander)
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      formData.statusContaPJ === 'Aprovada'
                        ? 'bg-emerald-100 text-emerald-800'
                        : formData.statusContaPJ === 'Link Enviado'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {formData.statusContaPJ}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Status da Conta
                  </label>
                  <select
                    value={formData.statusContaPJ}
                    onChange={(e) =>
                      handleFieldChange('statusContaPJ', e.target.value as StatusContaPJ)
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    {STATUS_CONTA_OPCOES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>

                  {/* Botão de 1 clique: Copiar Link Conta PJ */}
                  <button
                    type="button"
                    onClick={handleCopiarLinkSantander}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs"
                  >
                    {copiadoLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Link Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Copiar Link Conta PJ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CHECKPOINT 3: POS (GETNET) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-slate-700" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      3. POS & Adquirência (Getnet)
                    </h4>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {formData.statusPedidoPOS}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Modelo POS
                      </label>
                      <select
                        value={formData.modeloEquipamento}
                        onChange={(e) =>
                          handleFieldChange('modeloEquipamento', e.target.value as ModeloEquipamento)
                        }
                        className="w-full px-2 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                      >
                        {MODELOS_GETNET_OPCOES.map((mod) => (
                          <option key={mod} value={mod}>
                            {mod}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Status Logística
                      </label>
                      <select
                        value={formData.statusPedidoPOS}
                        onChange={(e) =>
                          handleFieldChange('statusPedidoPOS', e.target.value as StatusPedidoPOS)
                        }
                        className="w-full px-2 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                      >
                        {STATUS_PEDIDO_OPCOES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Checkbox de 1 clique: Completude Cadastral */}
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors select-none ${
                      formData.completudeCadastral
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(formData.completudeCadastral)}
                      onChange={(e) => handleFieldChange('completudeCadastral', e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                    />
                    <div className="text-xs leading-tight">
                      <span>Completude Cadastral no App</span>
                      <p className="text-[10px] font-normal text-slate-500">
                        Selfie + CNH validadas
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. AÇÕES DE FECHAMENTO (RODAPÉ DO COCKPIT) */}
        <footer className="bg-white border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Etapa Atual:</span>
            <strong className="text-slate-800 font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
              {formData.statusFunil || 'Novo'}
            </strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSalvarTudo}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {salvoFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Salvo!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Dados</span>
                </>
              )}
            </button>

            {/* Botão em destaque: Avançar Etapa do Funil */}
            <button
              type="button"
              onClick={handleAvancarEtapa}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-sm transition-all cursor-pointer"
            >
              <span>Avançar Etapa do Funil</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
