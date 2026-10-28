import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  FileText,
  CheckCircle2,
  Sparkles,
  Copy,
  Building2,
  User,
  MapPin,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import {
  Lead,
  CredenciamentoStep,
  DocumentoTipo,
  CredenciamentoData,
} from '../types/crm';
import { dataLocalISO } from '../utils/ativacao';

interface Props {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (leadAtualizado: Lead) => void;
}

const STEPS: Array<{ n: CredenciamentoStep; titulo: string; subtitulo: string }> = [
  { n: 1, titulo: 'Parceiro Santander', subtitulo: 'Indicação no portal' },
  { n: 2, titulo: 'Documentos', subtitulo: 'Coleta de documentos' },
  { n: 3, titulo: 'Conta Empresarial', subtitulo: 'Cadastro no Santander' },
  { n: 4, titulo: 'Portal AK', subtitulo: 'Produção Almeida Krüger' },
  { n: 5, titulo: 'Conclusão', subtitulo: 'Revisão e ativação' },
];

const DOCUMENTOS_LISTA: DocumentoTipo[] = [
  'RG',
  'CNH',
  'Contrato Social',
  'Cartão CNPJ',
  'Desenquadramento CNPJ',
  'Contrato de Empresário Individual',
];

const COMBOS_LISTA = [
  '1MM',
  '10K',
  '15K',
  '20K',
  '30K',
  '40K',
  '50K',
  '60K',
  '100K',
  '200K',
  '500K',
  '700K',
  'GETPAY',
  'LINKDEPAGAMENTO',
];

export const CredenciamentoWizardModal: React.FC<Props> = ({
  lead,
  isOpen,
  onClose,
  onSave,
}) => {
  const [cred, setCred] = useState<CredenciamentoData>({
    stepAtual: 1,
    documentos: [],
    produto: 'CONTA_INTEGRADA',
    pacote: 'AVANCAR_2',
    combo: '1MM',
    tipoCombo: 'Combo GetNet D2',
    segmento: 'B1',
    faturamento: 'De 500K A 1M',
  });

  const [step, setStep] = useState<CredenciamentoStep>(1);
  const [copiadoCampo, setCopiadoCampo] = useState<string | null>(null);

  useEffect(() => {
    if (lead && isOpen) {
      const inicial = lead.credenciamento ?? {
        stepAtual: 1,
        documentos: [],
        produto: 'CONTA_INTEGRADA',
        pacote: 'AVANCAR_2',
        combo: '1MM',
        tipoCombo: 'Combo GetNet D2',
        segmento: 'B1',
        faturamento: 'De 500K A 1M',
      };
      setCred(inicial);
      setStep(inicial.stepAtual || 1);
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

  const copiarTexto = (texto: string, campo: string) => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setCopiadoCampo(campo);
    setTimeout(() => {
      setCopiadoCampo((prev) => (prev === campo ? null : prev));
    }, 1500);
  };

  const atualizar = (novosDados: Partial<CredenciamentoData>) => {
    setCred((prev) => {
      const atualizado = {
        ...prev,
        ...novosDados,
        iniciadoEm: prev.iniciadoEm ?? new Date().toISOString(),
      };
      return atualizado;
    });
  };

  const irParaStep = (novoStep: CredenciamentoStep) => {
    setStep(novoStep);
    const atualizado: CredenciamentoData = {
      ...cred,
      stepAtual: novoStep,
      iniciadoEm: cred.iniciadoEm ?? new Date().toISOString(),
    };
    setCred(atualizado);
    onSave({
      ...lead,
      credenciamento: atualizado,
    });
  };

  const finalizarCredenciamento = () => {
    const hoje = dataLocalISO(new Date());
    onSave({
      ...lead,
      dataAbertura: lead.dataAbertura ?? hoje,
      credenciamento: {
        ...cred,
        stepAtual: 5,
        concluidoEm: new Date().toISOString(),
      },
    });
    onClose();
  };

  const podeAvancar = (): boolean => {
    if (step === 1) return cred.parceiroIndicado === true;
    if (step === 2) return (cred.documentos?.length ?? 0) >= 1;
    if (step === 3) return cred.santanderConcluido === true;
    if (step === 4) return cred.akConcluido === true && !!cred.produto && !!cred.pacote;
    return true;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                Credenciamento: {lead.empresaExibicao}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Passo {step} de 5 — {STEPS.find((s) => s.n === step)?.titulo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: 2 colunas em ≥768px */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Tracker vertical */}
          <aside className="md:w-64 shrink-0 border-r border-slate-200 p-4 overflow-y-auto bg-slate-50/80">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              Etapas do Processo
            </h3>
            <div className="space-y-1.5">
              {STEPS.map((s) => {
                const isPassado = step > s.n;
                const isAtual = step === s.n;
                return (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => irParaStep(s.n)}
                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isAtual
                        ? 'bg-white border border-emerald-400 shadow-xs ring-1 ring-emerald-400/20'
                        : isPassado
                        ? 'hover:bg-white/80 bg-slate-100/60'
                        : 'opacity-60 hover:opacity-80'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        isPassado
                          ? 'bg-emerald-600 text-white'
                          : isAtual
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPassado ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] font-bold leading-tight ${isAtual ? 'text-slate-900' : 'text-slate-700'}`}>
                        {s.titulo}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        {s.subtitulo}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Lead em atendimento:</p>
              <p className="truncate font-medium text-slate-900">{lead.empresaExibicao}</p>
              <p className="font-mono text-[10px] text-slate-500">{lead.cnpjFormatado || lead.cnpj}</p>
            </div>
          </aside>

          {/* Conteúdo do step */}
          <section className="flex-1 overflow-y-auto p-5 md:p-6 bg-white">
            {step === 1 && (
              <div className="max-w-2xl space-y-5 animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Passo 1 de 5
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    Indicação no Parceiro Santander
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Abra o portal, faça a indicação do cliente com os dados da empresa, e volte marcando a caixa abaixo para registrar o avanço.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Portal Parceiro Santander</h4>
                      <p className="text-[11px] text-slate-500">Acesse em uma nova aba com suas credenciais de parceiro</p>
                    </div>
                    <a
                      href="https://www.parceirosantander.com.br/spa-base/landing-page"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors"
                    >
                      Abrir Parceiro Santander <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cred.parceiroIndicado === true}
                      onChange={(e) => atualizar({ parceiroIndicado: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Indicação concluída no Parceiro Santander
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Confirmo que cadastrei o lead com sucesso no portal do Parceiro Santander.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="max-w-2xl space-y-5 animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Passo 2 de 5
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    Documentos coletados do cliente
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Marque os documentos que foram enviados pelo cliente. É necessário ter pelo menos 1 documento coletado para avançar.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DOCUMENTOS_LISTA.map((doc) => {
                    const marcado = (cred.documentos || []).includes(doc);
                    return (
                      <label
                        key={doc}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                          marcado
                            ? 'bg-emerald-50/70 border-emerald-300 text-slate-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={(e) => {
                            const antigos = cred.documentos || [];
                            const novos = e.target.checked
                              ? [...antigos, doc]
                              : antigos.filter((d) => d !== doc);
                            atualizar({ documentos: novos });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <FileText className={`w-4 h-4 shrink-0 ${marcado ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-xs">{doc}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">
                    {(cred.documentos || []).length} documento(s) coletado(s)
                  </span>
                  {(cred.documentos || []).length >= 1 ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Requisito atendido
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">Selecione pelo menos 1</span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Nota LGPD:</strong> O app registra apenas a confirmação de coleta. Os arquivos de documentos permanecem sob sua guarda operacional e não são transmitidos para armazenamento no servidor.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="max-w-2xl space-y-5 animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Passo 3 de 5
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    Cadastro no Santander Conta Empresarial
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Escolha o produto contratado e utilize o link direto para realizar o credenciamento digital no Santander/Getnet.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Produto Ofertado
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => atualizar({ produto: 'CONTA_INTEGRADA' })}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        cred.produto === 'CONTA_INTEGRADA'
                          ? 'border-red-500 bg-red-50/50 ring-1 ring-red-400'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900">CONTA INTEGRADA</p>
                      <p className="text-[11px] text-slate-500 mt-1">Conta Corrente PJ Santander + Máquina Getnet</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => atualizar({ produto: 'LINK_PAGAMENTO' })}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        cred.produto === 'LINK_PAGAMENTO'
                          ? 'border-red-500 bg-red-50/50 ring-1 ring-red-400'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900">LINK DE PAGAMENTO</p>
                      <p className="text-[11px] text-slate-500 mt-1">Solução Getnet para vendas online e links</p>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Link Direto de Cadastro</h4>
                      <p className="text-[11px] text-slate-500">
                        {cred.produto === 'LINK_PAGAMENTO'
                          ? 'Portal Getnet (Carrinho / Link)'
                          : 'Santander Conta Empresarial (Núcleo)'}
                      </p>
                    </div>
                    <a
                      href={
                        cred.produto === 'LINK_PAGAMENTO'
                          ? 'https://cadastro.getnet.com.br/#/carrinho'
                          : 'https://www.santander.com.br/conta-empresarial/cnpj?utm_source=email&utm_medium=devolucao&utm_campaign=nucleo'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors"
                    >
                      Abrir Cadastro {cred.produto === 'LINK_PAGAMENTO' ? 'Getnet' : 'Santander'} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cred.santanderConcluido === true}
                      onChange={(e) => atualizar({ santanderConcluido: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Cadastro concluído no Santander
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Confirmo que o formulário de abertura e credenciamento foi preenchido e transmitido.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="max-w-3xl space-y-5 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Passo 4 de 5
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      Produção no Portal Almeida Krüger
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Transfira os dados para o formulário de produção no Portal AK. Clique no botão de copiar em cada campo para agilizar o preenchimento.
                    </p>
                  </div>
                  <a
                    href="https://portal.almeidakruger.com.br/cadastrarProducaoAF"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors shrink-0"
                  >
                    Abrir Portal AK <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Bloco 1: Dados da Receita Federal (Readonly + Copiar) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      Dados Cadastrais da Empresa (Receita Federal)
                    </h4>
                    <span className="text-[10px] text-slate-400">Clique para copiar</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {[
                      { label: 'CNPJ', valor: lead.cnpjFormatado || lead.cnpj, id: 'cnpj' },
                      { label: 'Razão Social', valor: lead.razaoSocial || lead.empresaExibicao, id: 'razao' },
                      {
                        label: 'Sócio Responsável',
                        valor: lead.socios?.[0]?.nome || lead.nomeContato || 'Não informado',
                        id: 'socio',
                      },
                      {
                        label: 'Data da Constituição',
                        valor: lead.cnpjInicio || lead.idadeEmpresa || 'Não informado',
                        id: 'constituicao',
                      },
                      { label: 'CEP', valor: lead.cep || 'Não informado', id: 'cep' },
                      { label: 'Logradouro', valor: lead.logradouro || 'Não informado', id: 'logradouro' },
                      { label: 'Número', valor: lead.numero || 'S/N', id: 'numero' },
                      { label: 'Bairro', valor: lead.bairro || 'Não informado', id: 'bairro' },
                      { label: 'Complemento', valor: lead.complemento || '—', id: 'complemento' },
                      { label: 'Cidade', valor: lead.municipio || 'Não informado', id: 'municipio' },
                      { label: 'UF', valor: lead.uf || 'BA', id: 'uf' },
                    ].map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-1 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium text-slate-400">{item.label}</p>
                          <p className="text-xs font-semibold text-slate-800 truncate" title={item.valor}>
                            {item.valor}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copiarTexto(item.valor, item.id)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
                            copiadoCampo === item.id
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Copiar para clipboard"
                        >
                          {copiadoCampo === item.id ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bloco 2: Configuração da Produção no Wizard */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    Parâmetros da Produção
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Segmento (Padrão)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={cred.segmento || 'B1'}
                        className="w-full text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-700 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Faturamento
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={cred.faturamento || 'De 500K A 1M'}
                        className="w-full text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-700 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tipo do Combo
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={cred.tipoCombo || 'Combo GetNet D2'}
                        className="w-full text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-700 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Produto Ofertado *
                      </label>
                      <select
                        value={cred.produto || 'CONTA_INTEGRADA'}
                        onChange={(e) =>
                          atualizar({ produto: e.target.value as 'CONTA_INTEGRADA' | 'LINK_PAGAMENTO' })
                        }
                        className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="CONTA_INTEGRADA">CONTA INTEGRADA</option>
                        <option value="LINK_PAGAMENTO">LINK DE PAGAMENTO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Pacote Ofertado *
                      </label>
                      <select
                        value={cred.pacote || ''}
                        onChange={(e) =>
                          atualizar({ pacote: e.target.value as 'AVANCAR_2' | 'AVANCAR_3' })
                        }
                        className={`w-full text-xs font-semibold bg-white border rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                          !cred.pacote ? 'border-amber-400 bg-amber-50/40' : 'border-slate-300'
                        }`}
                      >
                        <option value="">Selecione o pacote...</option>
                        <option value="AVANCAR_2">AVANÇAR 2</option>
                        <option value="AVANCAR_3">AVANÇAR 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Combo
                      </label>
                      <select
                        value={cred.combo || '1MM'}
                        onChange={(e) => atualizar({ combo: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        {COMBOS_LISTA.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bloco 3: Dados Fixos do Executivo */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Estrutura Comercial / Executivo (Almeida Krüger)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Coordenador:</span>
                      <strong className="text-slate-900 font-bold">ARAGON</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Supervisor:</span>
                      <strong className="text-slate-900 font-bold">PABLO</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Consultor:</span>
                      <strong className="text-slate-900 font-bold">DOUGLAS GONCALVES RAMOS DE LIMA</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Região:</span>
                      <strong className="text-slate-900 font-bold">SALVADOR NORTE</strong>
                    </div>
                  </div>
                </div>

                {/* Checkbox de Confirmação AK */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cred.akConcluido === true}
                      onChange={(e) => atualizar({ akConcluido: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Produção cadastrada no Portal AK
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Confirmo que a produção foi devidamente lançada e protocolada no Portal Almeida Krüger.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="max-w-2xl space-y-5 animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Passo 5 de 5
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    Revisão final do Credenciamento
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Confira o resumo das etapas concluídas antes de finalizar a ativação do lead.
                  </p>
                </div>

                {/* Resumo dos steps */}
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">1. Parceiro Santander</p>
                      <p className="text-[11px] text-slate-500">Indicação de cliente no portal</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Concluído
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">2. Documentos Coletados</p>
                      <p className="text-[11px] text-slate-500">
                        {(cred.documentos || []).length > 0
                          ? (cred.documentos || []).join(', ')
                          : 'Nenhum documento marcado'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                      {(cred.documentos || []).length} coletado(s)
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">3. Cadastro Santander / Getnet</p>
                      <p className="text-[11px] text-slate-500">
                        Produto: {cred.produto === 'LINK_PAGAMENTO' ? 'Link de Pagamento' : 'Conta Integrada'}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Concluído
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">4. Produção Portal AK</p>
                      <p className="text-[11px] text-slate-500">
                        Pacote: {cred.pacote || '—'} · Combo: {cred.combo || '—'} · Segmento: {cred.segmento || 'B1'}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Cadastrado
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Estrutura Comercial</p>
                      <p className="text-[11px] text-slate-500">
                        Douglas Gonçalves Ramos de Lima · Região Salvador Norte
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-500">Supervisor: Pablo</span>
                  </div>
                </div>

                {/* Banner de Aviso de Ativação */}
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950 space-y-1">
                    <p className="font-bold">Pronto para ativar a contagem de pontos!</p>
                    <p className="text-emerald-800 leading-relaxed">
                      Ao clicar em <strong>Concluir credenciamento</strong>, o Lead será marcado como <strong>credenciado hoje ({dataLocalISO(new Date())})</strong>. A partir de agora, as transações de PIX e faturamento de Máquina começam a pontuar na campanha.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => irParaStep((step - 1) as CredenciamentoStep)}
            disabled={step === 1}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Voltar
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => irParaStep((step + 1) as CredenciamentoStep)}
              disabled={!podeAvancar()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
            >
              Avançar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finalizarCredenciamento}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Concluir credenciamento
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
