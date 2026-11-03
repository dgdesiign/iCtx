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
  Copy,
  XCircle,
  Send,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { Lead, LeadStatus } from '../types/crm';
import { CredenciamentoWizardModal } from './CredenciamentoWizardModal';
import { COLUNAS_KANBAN } from './PipelineKanban';
import { formatarNome, formatarTelefone, limparDigitos, consultarCnpj } from '../services/cnpjService';
import { obterInfoFollowUp, diasDesdeUltimoContato } from '../utils/cadencia';
import { obterInfoScore } from '../utils/scoring';
import { 
  definirPix, 
  definirMaquinaVendas,
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

// Templates Sniper para Grid de Tiles (1 Clique)
interface TemplateSniper {
  id: string;
  titulo: string;
  subtitulo: string;
  tag: string;
  corEstilo: string;
  corIconeBg: string;
  corIcone: string;
  icone: 'MessageCircle' | 'RefreshCw' | 'CreditCard' | 'CheckCircle2' | 'Building2' | 'MapPin';
  texto: string;
}

const TEMPLATES_SNIPER: TemplateSniper[] = [
  {
    id: 'visao_geral',
    titulo: 'Visão Geral',
    subtitulo: '1º contato & Pronampe',
    tag: '1º Contato',
    corEstilo: 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 text-emerald-950',
    corIconeBg: 'bg-emerald-100 text-emerald-700',
    corIcone: 'text-emerald-700',
    icone: 'MessageCircle',
    texto: `Oi {nome}, tudo joia? Vi aqui que você responde pela *{empresa}*, certo?\n\nSou o Douglas Krüger, represento o Banco Santander aqui na região em soluções e abertura de contas PJ. Tô te chamando rapidinho porque acompanho empresas com o perfil da {empresa} para avaliar a viabilidade de condições diferenciadas, como taxas competitivas e linhas de Pronampe. Vale a pena eu dar uma olhada rápida na viabilidade para a {empresa}?`,
  },
  {
    id: 'recuperacao',
    titulo: 'Recuperação',
    subtitulo: 'Retomada de contato',
    tag: 'Recontato',
    corEstilo: 'bg-amber-50/70 hover:bg-amber-100/80 border-amber-200 text-amber-950',
    corIconeBg: 'bg-amber-100 text-amber-700',
    corIcone: 'text-amber-700',
    icone: 'RefreshCw',
    texto: `Oi {nome}, tudo bem?\n\nTentei falar com você anteriormente sobre as condições do Santander para a *{empresa}*. Conseguiu dar uma olhada na proposta ou prefere que eu te ligue em 1 minutinho para alinharmos?`,
  },
  {
    id: 'oferta_maquina',
    titulo: 'Máquina & Taxas',
    subtitulo: 'GetNet & Fit Energia',
    tag: 'GetNet',
    corEstilo: 'bg-blue-50/70 hover:bg-blue-100/80 border-blue-200 text-blue-950',
    corIconeBg: 'bg-blue-100 text-blue-700',
    corIcone: 'text-blue-700',
    icone: 'CreditCard',
    texto: `Oi {nome}, tudo bem? Sou o Douglas Krüger do Santander.\n\nMuitos empresários do setor da *{empresa}* estão buscando alternativas para reduzir os custos com taxas de maquininhas e cobranças à distância. Temos uma condição especial para a máquina GetNet / Fit Energia. Posso te enviar as taxas agora?`,
  },
  {
    id: 'fechamento',
    titulo: 'Fechamento PIX',
    subtitulo: 'Ativação & chave PIX',
    tag: 'Etapa Final',
    corEstilo: 'bg-purple-50/70 hover:bg-purple-100/80 border-purple-200 text-purple-950',
    corIconeBg: 'bg-purple-100 text-purple-700',
    corIcone: 'text-purple-700',
    icone: 'CheckCircle2',
    texto: `Perfeito {nome}! Vamos avançar com o credenciamento e ativação da conta da *{empresa}*.\n\nO processo é 100% digital e rápido. Me confirma apenas se o CNPJ continua 100% regular para darmos o start?`,
  },
  {
    id: 'tarifa_zero',
    titulo: 'Conta Isenta',
    subtitulo: 'Isenção tarifas PJ',
    tag: 'Tarifa Zero',
    corEstilo: 'bg-teal-50/70 hover:bg-teal-100/80 border-teal-200 text-teal-950',
    corIconeBg: 'bg-teal-100 text-teal-700',
    corIcone: 'text-teal-700',
    icone: 'Building2',
    texto: `Olá {nome}, tudo bem? Parabéns pelo trabalho na *{empresa}*!\n\nSou o Douglas Krüger, especialista em abertura de contas PJ para o Santander. Auxilio empresas com o perfil da {empresa} a estruturarem sua operação financeira com isenção de tarifas e condições diferenciadas. Consegue falar 1 minutinho?`,
  },
  {
    id: 'regional',
    titulo: 'Proximidade',
    subtitulo: 'Consultor Santander local',
    tag: 'Regional',
    corEstilo: 'bg-rose-50/70 hover:bg-rose-100/80 border-rose-200 text-rose-950',
    corIconeBg: 'bg-rose-100 text-rose-700',
    corIcone: 'text-rose-700',
    icone: 'MapPin',
    texto: `Oi {nome}, tudo bem? Sou o Douglas Krüger, consultor do Santander aqui na nossa região de {cidade}.\n\nPrecisava falar rapidamente com o responsável pela *{empresa}* sobre um pacote especial com isenção e linhas para o CNPJ de vocês. Você prefere que eu te ligue em 1 minutinho ou conversamos por aqui?`,
  },
];

// Roteiros de Ligação em Blocos (Tiles + Teleprompter)
interface RoteiroLigacaoTile {
  id: string;
  titulo: string;
  subtitulo: string;
  tag: string;
  corEstilo: string;
  corIconeBg: string;
  icone: 'PhoneCall' | 'ShieldAlert' | 'CreditCard' | 'CheckCircle2';
  etapas: {
    fase: string;
    fala: string;
    dica?: string;
  }[];
}

const ROTEIROS_LIGACAO: RoteiroLigacaoTile[] = [
  {
    id: 'abordagem_inicial',
    titulo: 'Roteiro: Abordagem Inicial',
    subtitulo: 'Apresentação & qualificação rápida',
    tag: '1º Contato',
    corEstilo: 'bg-blue-50/70 hover:bg-blue-100/80 border-blue-200 text-blue-950',
    corIconeBg: 'bg-blue-100 text-blue-700',
    icone: 'PhoneCall',
    etapas: [
      {
        fase: 'OBJETIVO DA LIGAÇÃO',
        fala: 'Conexão imediata e qualificação rápida sem parecer telemarketing.',
      },
      {
        fase: 'QUEBRA-GELO',
        fala: 'Olá {nome}, tudo bem? Aqui é Douglas Krüger do Santander Empresas. Vi que a {empresa} atua forte aqui na região de {cidade}.',
        dica: 'Fale com energia firme e natural, sem pausas de dúvida.',
      },
      {
        fase: 'O GATILHO (Dor / Oportunidade)',
        fala: 'Estou te ligando rápido porque mapeamos o segmento da {empresa} e liberamos condições diferenciadas com isenção de tarifa na conta PJ e taxas especiais de Pronampe. Hoje você paga alguma taxa mensal de manutenção no seu banco atual?',
        dica: 'Aguarde o lead responder. A maioria reclama de taxas altas ou gerente ausente.',
      },
      {
        fase: 'FECHAMENTO PARA PRÓXIMO PASSO',
        fala: 'Consigo garantir essa isenção completa e crédito pré-aprovado. Posso te mandar o comparativo oficial direto no seu WhatsApp agora para você olhar sem compromisso?',
      },
    ],
  },
  {
    id: 'quebra_objecao',
    titulo: 'Roteiro: Quebra de Objeção',
    subtitulo: '"Já tenho banco" / "Sem tempo"',
    tag: 'Contorno',
    corEstilo: 'bg-amber-50/70 hover:bg-amber-100/80 border-amber-200 text-amber-950',
    corIconeBg: 'bg-amber-100 text-amber-700',
    icone: 'ShieldAlert',
    etapas: [
      {
        fase: 'OBJETIVO DA LIGAÇÃO',
        fala: 'Contornar a resistência inicial com foco em conta de contingência sem custos e taxas menores.',
      },
      {
        fase: 'SE O LEAD DISSER "JÁ TENHO BANCO"',
        fala: 'Perfeito {nome}, a maioria dos nossos parceiros já tinham relacionamento em outros bancos. Nossa intenção não é substituir seu banco principal agora, mas sim garantir que a {empresa} tenha uma segunda conta PJ blindada sem custo fixo e com linhas de crédito abertas.',
      },
      {
        fase: 'SE O LEAD DISSER "NÃO TENHO TEMPO"',
        fala: 'Compreendo perfeitamente, tempo de empresário é ouro! Por isso o credenciamento é 100% digital pelo celular e leva menos de 5 minutos, sem pisar em agência.',
      },
      {
        fase: 'FECHAMENTO RÁPIDO',
        fala: 'Vou fazer o seguinte: só me confirma se o CNPJ continua 100% regular que eu deixo a proposta pronta no WhatsApp para você ver quando tiver 1 minuto. Pode ser?',
      },
    ],
  },
  {
    id: 'oferta_maquina',
    titulo: 'Roteiro: Máquina & Taxas',
    subtitulo: 'Redução de custos GetNet',
    tag: 'GetNet',
    corEstilo: 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 text-emerald-950',
    corIconeBg: 'bg-emerald-100 text-emerald-700',
    icone: 'CreditCard',
    etapas: [
      {
        fase: 'OBJETIVO DA LIGAÇÃO',
        fala: 'Identificar custos de maquininha atual e apresentar economia comprovada.',
      },
      {
        fase: 'ABORDAGEM DIRETA',
        fala: 'Oi {nome}, tudo joia? Douglas do Santander. Liguei rápido porque liberamos uma campanha direta para reduzir as taxas de maquininha de empresas em {cidade}.',
      },
      {
        fase: 'PERGUNTA QUALIFICADORA',
        fala: 'Qual máquina você usa hoje na {empresa}? Está pagando taxa de aluguel ou mais de 1,5% no débito/crédito?',
      },
      {
        fase: 'PROPOSTA E FECHAMENTO',
        fala: 'Temos a máquina GetNet com isenção de aluguel por faturamento e taxas agressivas. Me fala qual o volume aproximado no cartão por mês que eu já gero a tabela de economia no seu WhatsApp.',
      },
    ],
  },
  {
    id: 'ativacao_fechamento',
    titulo: 'Roteiro: Ativação & PIX',
    subtitulo: 'Ativação e validação de conta',
    tag: 'Fechamento',
    corEstilo: 'bg-purple-50/70 hover:bg-purple-100/80 border-purple-200 text-purple-950',
    corIconeBg: 'bg-purple-100 text-purple-700',
    icone: 'CheckCircle2',
    etapas: [
      {
        fase: 'OBJETIVO DA LIGAÇÃO',
        fala: 'Acompanhar a finalização da emissão da conta e cadastramento da primeira chave PIX.',
      },
      {
        fase: 'PARABENIZAR',
        fala: 'Olá {nome}, tudo bem? Douglas aqui. Vi que a proposta da {empresa} foi concluída e a conta Santander Empresas já está habilitada.',
      },
      {
        fase: 'PASSO DE ATIVAÇÃO',
        fala: 'Para validar o pacote com as isenções que combinamos, só precisamos fazer o primeiro login no aplicativo e registrar a sua chave PIX CNPJ.',
      },
      {
        fase: 'CHAMADA PARA AÇÃO',
        fala: 'Você consegue abrir o app agora para validarmos juntos em 2 minutos?',
      },
    ],
  },
];

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (leadId: string, status: LeadStatus) => void;
  onUpdateLead?: (lead: Lead) => void;
  onSaveNotas?: (leadId: string, notas: string) => void;
  onOpenMessageComposer?: (lead: Lead) => void;
  onOpenCallScript?: (lead: Lead) => void;
  onOpenCoach?: (lead: Lead) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onUpdateStatus = () => {},
  onUpdateLead,
  onSaveNotas = () => {},
  onOpenMessageComposer = () => {},
  onOpenCallScript = () => {},
  onOpenCoach = () => {},
}) => {
  const [notas, setNotas] = useState(lead?.notas || '');
  const [salvo, setSalvo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editNome, setEditNome] = useState(lead?.nomeContato || '');
  const [editTelefone, setEditTelefone] = useState(lead?.telefonePrincipal || '');
  const [editEmpresa, setEditEmpresa] = useState(lead?.empresaExibicao || '');
  const [wizardAberto, setWizardAberto] = useState(false);

  // Estados para Verificação Parceiro Santander (Sprint R8)
  const [bloqueioAtivo, setBloqueioAtivo] = useState(false);
  const [motivoBloqueio, setMotivoBloqueio] = useState('Já indicado por outro parceiro');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Abas de Gestão de Contato Rápido (WhatsApp / Ligação / Dossiê)
  const [tabAtiva, setTabAtiva] = useState<'whatsapp' | 'ligacao' | 'dossie'>('whatsapp');
  const [roteiroSelecionadoId, setRoteiroSelecionadoId] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setNotas(lead.notas || '');
      setEditNome(lead.nomeContato || '');
      setEditTelefone(lead.telefonePrincipal || '');
      setEditEmpresa(lead.empresaExibicao || '');
      setEditando(false);
      setBloqueioAtivo(false);
      setMotivoBloqueio('Já indicado por outro parceiro');
      setMotivoOutro('');
      setRoteiroSelecionadoId(null);
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

  const handleCopy = (text: string, label: string) => {
    if (!text) {
      setToastMsg(`Nenhum dado de ${label} para copiar`);
      setTimeout(() => setToastMsg(null), 2500);
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => {
        setToastMsg(`${label} copiado!`);
        setTimeout(() => setToastMsg(null), 2500);
      },
      () => {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setToastMsg(`${label} copiado!`);
          setTimeout(() => setToastMsg(null), 2500);
        } catch {
          setToastMsg(`Erro ao copiar ${label}`);
          setTimeout(() => setToastMsg(null), 2500);
        }
      }
    );
  };

  const cnpjValor = lead.cnpj || lead.cnpjFormatado?.replace(/\D/g, '') || '';
  const nomeValor = lead.nome || lead.nomeContato || lead.empresaExibicao || '';
  const razaoValor = lead.razaoSocial || lead.empresaExibicao || '';
  const telefoneValor = lead.telefone || lead.telefonePrincipalFormatado || lead.telefonePrincipal || '';
  const enderecoCompletoValor = [
    lead.logradouro && lead.numero ? `${lead.logradouro}, ${lead.numero}` : lead.logradouro || lead.numero,
    lead.bairro,
    lead.municipio || lead.cidade,
    lead.uf,
  ]
    .filter(Boolean)
    .join(', ');
  const blocoTudoValor = [cnpjValor, nomeValor, razaoValor, telefoneValor, enderecoCompletoValor].join('\n');

  const scoreInfo = obterInfoScore(lead);

  const interpolar = (txt: string) => {
    const nomeRaw = (lead.nomeContato || (lead as any).nome || 'Cliente').trim();
    const primeiroNome = nomeRaw.split(/\s+/)[0] || 'Cliente';
    const empresa = lead.empresaExibicao || (lead as any).empresa || 'Sua empresa';
    const cidade = lead.municipio || (lead as any).cidade || 'sua região';
    const idade = lead.idadeEmpresa || 'algum tempo';

    return txt
      .replace(/{nome}/g, primeiroNome)
      .replace(/{empresa}/g, empresa)
      .replace(/{cidade}/g, cidade)
      .replace(/{idade}/g, idade)
      .replace(/\[Seu Nome\]/g, 'Douglas Krüger');
  };

  const roteiroSelecionado = ROTEIROS_LIGACAO.find((r) => r.id === roteiroSelecionadoId);

  const telLimpo = (
    lead.telefonePrincipal ||
    lead.telefonePrincipalFormatado ||
    (lead as any).telefone ||
    ''
  ).replace(/\D/g, '');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full md:w-[600px] max-w-2xl h-[100dvh] max-h-[100dvh] shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 relative">
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-slate-900/95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* HEADER DA GAVETA */}
        <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50 flex-shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Gestão de Contato
              </span>
              {scoreInfo && (
                <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${scoreInfo.badgeStyle}`}>
                  Score {scoreInfo.score}/100
                </span>
              )}
              <span className="text-xs text-slate-500 font-mono truncate">{lead.cnpjFormatado}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">
              {lead.empresaExibicao || (lead as any).empresa || lead.nomeContato || (lead as any).nome}
            </h2>
            {lead.razaoSocial && lead.razaoSocial !== lead.empresaExibicao && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Razão Social: {lead.razaoSocial}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer shrink-0"
            title="Fechar Gaveta"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Quick Stage & Coach Bar */}
        <div className="px-5 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-500 font-medium shrink-0">Etapa:</span>
            <select
              value={lead.status}
              onChange={(e) => onUpdateStatus?.(lead.id, e.target.value as LeadStatus)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600 truncate max-w-[170px]"
            >
              {COLUNAS_KANBAN.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.titulo}
                </option>
              ))}
            </select>
          </div>
          {onOpenCoach && (
            <button
              onClick={() => onOpenCoach(lead)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              title="Abrir AI Coach da Negociação"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Coach</span>
            </button>
          )}
        </div>

        {/* ABAS (1 Clique para decidir a ação) */}
        <div className="flex border-b bg-white flex-shrink-0">
          <button
            type="button"
            onClick={() => setTabAtiva('whatsapp')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 transition-colors cursor-pointer ${
              tabAtiva === 'whatsapp'
                ? 'border-green-500 text-green-600 bg-green-50/50'
                : 'border-transparent text-slate-500 hover:bg-slate-50'
            }`}
          >
            <MessageCircle size={16} />
            <span>WhatsApp Rápido</span>
          </button>
          <button
            type="button"
            onClick={() => setTabAtiva('ligacao')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 transition-colors cursor-pointer ${
              tabAtiva === 'ligacao'
                ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Phone size={16} />
            <span>Roteiro de Ligação</span>
          </button>
          <button
            type="button"
            onClick={() => setTabAtiva('dossie')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 transition-colors cursor-pointer ${
              tabAtiva === 'dossie'
                ? 'border-slate-800 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Building2 size={16} />
            <span>Dossiê da Empresa</span>
          </button>
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50 text-xs text-slate-700">
          {/* ABA 1: DISPARO SNIPER WHATSAPP (1 CLIQUE) */}
          {tabAtiva === 'whatsapp' && (
            <div className="flex flex-col h-full animate-in fade-in duration-200">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageCircle size={15} className="text-emerald-600" />
                    Gatilhos Sniper (1 Clique)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clique no bloco desejado para abrir diretamente no WhatsApp com os dados do lead preenchidos.
                  </p>
                </div>
                {telLimpo.length < 10 && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                    Sem WhatsApp válido
                  </span>
                )}
              </div>

              {/* LISTA VERTICAL COMPACTA SLIM UI (SEM SUBTÍTULOS) */}
              <div className="flex flex-col gap-1.5">
                {TEMPLATES_SNIPER.map((tpl) => {
                  const textoCustomizado = interpolar(tpl.texto);
                  const waUrl =
                    telLimpo.length >= 10
                      ? `https://wa.me/55${telLimpo}?text=${encodeURIComponent(textoCustomizado)}`
                      : '#';

                  return (
                    <a
                      key={tpl.id}
                      href={waUrl}
                      target={telLimpo.length >= 10 ? '_blank' : undefined}
                      rel={telLimpo.length >= 10 ? 'noopener noreferrer' : undefined}
                      onClick={(e) => {
                        if (telLimpo.length < 10) {
                          e.preventDefault();
                          setToastMsg('Lead sem número de WhatsApp válido.');
                          setTimeout(() => setToastMsg(null), 2500);
                          return;
                        }
                        if (onUpdateStatus) {
                          onUpdateStatus(lead.id, lead.status === 'novo' ? 'em_prospeccao' : lead.status);
                        }
                        setToastMsg(`Disparando "${tpl.titulo}" no WhatsApp...`);
                        setTimeout(() => setToastMsg(null), 2500);
                      }}
                      className="w-full flex items-center gap-3 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 text-sm transition-colors text-left group cursor-pointer"
                      title={`Enviar "${tpl.titulo}" via WhatsApp`}
                    >
                      <div className="text-slate-500 group-hover:text-emerald-600 transition-colors shrink-0">
                        {tpl.icone === 'MessageCircle' && <MessageCircle size={16} />}
                        {tpl.icone === 'RefreshCw' && <RefreshCw size={16} />}
                        {tpl.icone === 'CreditCard' && <CreditCard size={16} />}
                        {tpl.icone === 'CheckCircle2' && <CheckCircle2 size={16} />}
                        {tpl.icone === 'Building2' && <Building2 size={16} />}
                        {tpl.icone === 'MapPin' && <MapPin size={16} />}
                      </div>
                      <span className="font-medium text-slate-800 flex-1 truncate">
                        {tpl.titulo}
                      </span>
                    </a>
                  );
                })}
              </div>

              {/* DICA / RODAPÉ */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Variáveis como <strong>{lead.nomeContato?.split(' ')[0] || 'Nome'}</strong> e <strong>{lead.empresaExibicao || 'Empresa'}</strong> são inseridas automaticamente.
                </span>
                <span className="font-mono text-slate-600 font-semibold">
                  {telLimpo ? `+55 ${telLimpo}` : 'Telefone não cadastrado'}
                </span>
              </div>
            </div>
          )}

          {/* ABA 2: ROTEIRO DE LIGAÇÃO (GRID DE BLOCOS + TELEPROMPTER) */}
          {tabAtiva === 'ligacao' && (
            <div className="h-full flex flex-col animate-in fade-in duration-200">
              {/* Header de Discagem */}
              <div className="bg-blue-600 text-white p-3.5 sm:p-4 rounded-xl flex justify-between items-center shadow-xs mb-3.5 shrink-0">
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Ligando para {lead.nomeContato || (lead as any).nome || 'Cliente'}
                  </h3>
                  <p className="text-blue-100 text-xs font-mono">{telefoneValor || 'Sem telefone'}</p>
                </div>
                {telLimpo.length >= 10 ? (
                  <a
                    href={`tel:${telLimpo}`}
                    onClick={() => {
                      if (onUpdateStatus) {
                        onUpdateStatus(lead.id, lead.status === 'novo' ? 'em_prospeccao' : lead.status);
                      }
                      setToastMsg('Iniciando chamada...');
                      setTimeout(() => setToastMsg(null), 2500);
                    }}
                    className="px-3.5 py-2 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Discar ligação agora"
                  >
                    <Phone size={15} className="text-blue-700 animate-pulse" />
                    <span>Discar</span>
                  </a>
                ) : (
                  <span className="text-[10px] bg-blue-700 text-blue-200 px-2 py-1 rounded font-medium">
                    Sem número
                  </span>
                )}
              </div>

              {/* ESTADO 1: LISTA VERTICAL COMPACTA SLIM UI (SEM SUBTÍTULOS) */}
              {!roteiroSelecionado ? (
                <div className="flex-1 flex flex-col">
                  <div className="mb-3.5 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <PhoneCall size={15} className="text-blue-600" />
                        Roteiros de Ligação
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Selecione um roteiro para abrir em formato Teleprompter durante a chamada.
                      </p>
                    </div>
                  </div>

                  {/* LISTA COMPACTA SLIM UI (SEM SUBTÍTULOS) */}
                  <div className="flex flex-col gap-1.5">
                    {ROTEIROS_LIGACAO.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setRoteiroSelecionadoId(tpl.id)}
                        className="w-full flex items-center gap-3 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 text-sm transition-colors text-left group cursor-pointer"
                        title={`Abrir "${tpl.titulo}"`}
                      >
                        <div className="text-slate-500 group-hover:text-blue-600 transition-colors shrink-0">
                          {tpl.icone === 'PhoneCall' && <PhoneCall size={16} />}
                          {tpl.icone === 'ShieldAlert' && <ShieldAlert size={16} />}
                          {tpl.icone === 'CreditCard' && <CreditCard size={16} />}
                          {tpl.icone === 'CheckCircle2' && <CheckCircle2 size={16} />}
                        </div>
                        <span className="font-medium text-slate-800 flex-1 truncate">
                          {tpl.titulo}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* DICA DE APOIO */}
                  <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse"></span>
                      Roteiros estruturados para abertura, contorno de objeções, taxas GetNet e fechamento.
                    </span>
                  </div>
                </div>
              ) : (
                /* ESTADO 2: MODO TELEPROMPTER DE LIGAÇÃO */
                <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Barra Superior do Teleprompter */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRoteiroSelecionadoId(null)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 py-1 transition-colors cursor-pointer"
                      title="Voltar aos roteiros de ligação"
                    >
                      <ArrowLeft size={13} />
                      <span>Voltar</span>
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
                        {roteiroSelecionado.tag}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {roteiroSelecionado.titulo}
                      </h4>
                    </div>
                  </div>

                  {/* Conteúdo em Destaque (Teleprompter) */}
                  <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                    {roteiroSelecionado.etapas.map((etapa, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                            {etapa.fase}
                          </span>
                          {etapa.dica && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              💡 {etapa.dica}
                            </span>
                          )}
                        </div>
                        <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/60 border-l-4 border-blue-500 text-slate-900 text-sm sm:text-base leading-relaxed font-medium">
                          {interpolar(etapa.fala)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rodapé do Teleprompter */}
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const textoCompleto = roteiroSelecionado.etapas
                          .map((e) => `${e.fase}:\n${interpolar(e.fala)}`)
                          .join('\n\n');
                        handleCopy(textoCompleto, 'Roteiro de ligação');
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy size={14} />
                      <span>Copiar Roteiro</span>
                    </button>

                    <span className="text-[11px] text-slate-500 font-medium">
                      Teleprompter ativo para {lead.nomeContato?.split(' ')[0] || 'Cliente'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: DOSSIÊ COMPLETO */}
          {tabAtiva === 'dossie' && (
            <div className="space-y-5 animate-in fade-in duration-200">

          {/* ========================================================================= */}
          {/* BLOCO: GESTÃO DE CADÊNCIA (SPRINT H2.1)                                   */}
          {/* ========================================================================= */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <span className="text-sm">💬</span>
                <span>Gestão de Cadência</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Tentativas:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${
                    (lead.cadenciaContatos ?? 0) === 0
                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                      : (lead.cadenciaContatos ?? 0) < 3
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200'
                  }`}
                >
                  {lead.cadenciaContatos ?? 0}/3
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Controle a cadência de prospecção do lead (até 3 tentativas estruturadas).
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {/* Botão + Registrar Tentativa */}
              <button
                type="button"
                onClick={() => {
                  if (!onUpdateLead) return;
                  const atual = (lead.cadenciaContatos ?? 0) as 0 | 1 | 2 | 3;
                  const novaCadencia = Math.min(3, atual + 1) as 0 | 1 | 2 | 3;
                  const novoStatus: LeadStatus = lead.status === 'novo' ? 'em_prospeccao' : lead.status;
                  const atualizado: Lead = {
                    ...lead,
                    status: novoStatus,
                    cadenciaContatos: novaCadencia,
                    tentativasContato: (lead.tentativasContato || 0) + 1,
                    dataUltimoContato: new Date().toISOString(),
                    atualizadoEm: new Date().toISOString(),
                  };
                  onUpdateLead(atualizado);
                  if (lead.status === 'novo') {
                    onUpdateStatus(lead.id, 'em_prospeccao');
                  }
                  setToastMsg(`Tentativa ${novaCadencia}/3 registrada com sucesso!`);
                  setTimeout(() => setToastMsg(null), 2500);
                }}
                disabled={(lead.cadenciaContatos ?? 0) >= 3}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs ${
                  (lead.cadenciaContatos ?? 0) >= 3
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                }`}
              >
                <span>+ Registrar Tentativa</span>
                <span className="text-[10px] opacity-80">
                  ({(lead.cadenciaContatos ?? 0) < 3 ? `${(lead.cadenciaContatos ?? 0) + 1}ª vez` : '3/3 atingido'})
                </span>
              </button>

              {/* Botão de alerta vermelho rápido se 3/3 */}
              {(lead.cadenciaContatos ?? 0) >= 3 && lead.status !== 'descartado' && (
                <button
                  type="button"
                  onClick={() => {
                    const atualizado: Lead = {
                      ...lead,
                      status: 'descartado',
                      motivoDescarte: 'Cadência Esgotada (3/3 tentativas sem sucesso)',
                      atualizadoEm: new Date().toISOString(),
                    };
                    if (onUpdateLead) {
                      onUpdateLead(atualizado);
                    }
                    onUpdateStatus(lead.id, 'descartado');
                    setToastMsg('Lead descartado (cadência esgotada).');
                    setTimeout(() => setToastMsg(null), 2500);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs animate-pulse"
                  title="Marcar lead como Descartado por cadência esgotada"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Esgotado: Descartar Lead?</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BLOCO A: VERIFICAÇÃO PARCEIRO SANTANDER (SOMENTE SE LEAD STATUS === NOVO) */}
          {/* ========================================================================= */}
          {lead.status === 'novo' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
              {lead.parceiroSantander?.status === 'apto' ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>✓ Apto para indicação (Verificado)</span>
                  </div>
                  {lead.parceiroSantander.verificadoEm && (
                    <span className="text-[10px] text-emerald-700">
                      {new Date(lead.parceiroSantander.verificadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              ) : lead.parceiroSantander?.status === 'bloqueado' ? (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2 font-bold text-xs">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>✗ Bloqueado: {lead.parceiroSantander.motivoBloqueio || 'Indicação bloqueada'}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Building2 className="w-4 h-4 text-red-600 shrink-0" />
                      <span>🏦 Verificação Parceiro Santander</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Pendente
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Consulte o CNPJ no Portal do Parceiro Santander antes de iniciar o primeiro contato.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {/* Botão 1: [Copiar CNPJ + Nome] */}
                    <button
                      type="button"
                      onClick={() => handleCopy(`${cnpjValor}\n${nomeValor}`, 'CNPJ + Nome')}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-white hover:border-slate-400 bg-white/70 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Copiar CNPJ e Nome em 2 linhas"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>[Copiar CNPJ + Nome]</span>
                    </button>

                    {/* Botão 2: ✓ Apto */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateLead) {
                          onUpdateLead({
                            ...lead,
                            parceiroSantander: {
                              status: 'apto',
                              verificadoEm: new Date().toISOString(),
                            },
                            atualizadoEm: new Date().toISOString(),
                          });
                        }
                        setToastMsg('✓ Apto para indicação (Verificado)');
                        setTimeout(() => setToastMsg(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Marcar parceiro como apto para indicação"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ Apto</span>
                    </button>

                    {/* Botão 3: ✗ Bloqueado */}
                    <button
                      type="button"
                      onClick={() => setBloqueioAtivo(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Abrir opções de descarte por bloqueio no parceiro"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>✗ Bloqueado</span>
                    </button>
                  </div>

                  {/* Div/Modal inline de Bloqueio */}
                  {bloqueioAtivo && (
                    <div className="mt-2.5 p-3 bg-white border border-rose-200 rounded-xl space-y-2.5 shadow-xs animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-rose-100 pb-1.5">
                        <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          Motivo do Bloqueio no Parceiro
                        </span>
                        <button
                          type="button"
                          onClick={() => setBloqueioAtivo(false)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-slate-700 block">
                          Selecione o motivo:
                        </label>
                        <select
                          value={motivoBloqueio}
                          onChange={(e) => setMotivoBloqueio(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          <option value="Já indicado por outro parceiro">Já indicado por outro parceiro</option>
                          <option value="CNPJ inativo/baixado">CNPJ inativo/baixado</option>
                          <option value="CNPJ com restrição">CNPJ com restrição</option>
                          <option value="Sem telefone válido">Sem telefone válido</option>
                          <option value="Outro">Outro</option>
                        </select>

                        {motivoBloqueio === 'Outro' && (
                          <input
                            type="text"
                            placeholder="Descreva o motivo do bloqueio..."
                            value={motivoOutro}
                            onChange={(e) => setMotivoOutro(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setBloqueioAtivo(false)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const motivoFinal = motivoBloqueio === 'Outro' ? (motivoOutro.trim() || 'Outro') : motivoBloqueio;
                            if (onUpdateLead) {
                              onUpdateLead({
                                ...lead,
                                status: 'descartado',
                                motivoDescarte: 'Parceiro Santander: ' + motivoFinal,
                                parceiroSantander: {
                                  status: 'bloqueado',
                                  verificadoEm: new Date().toISOString(),
                                  motivoBloqueio: motivoFinal,
                                },
                                atualizadoEm: new Date().toISOString(),
                              });
                            } else {
                              onUpdateStatus(lead.id, 'descartado');
                            }
                            setBloqueioAtivo(false);
                            setToastMsg('Lead bloqueado e movido para Descartado');
                            setTimeout(() => setToastMsg(null), 2500);
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          Confirmar Bloqueio
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* BLOCO B: FICHA CADASTRAL (PORTAL AK) — RENDERIZA EM QUALQUER STATUS        */}
          {/* ========================================================================= */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <span>📋 Ficha Cadastral (Portal AK)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Cópia individual para formulários</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 1. Copiar CNPJ */}
              <button
                type="button"
                onClick={() => handleCopy(cnpjValor, 'CNPJ')}
                className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-white bg-slate-100/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
                title={cnpjValor ? `Copiar CNPJ: ${cnpjValor}` : 'Sem CNPJ'}
              >
                <div className="min-w-0 pr-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">1. CNPJ</span>
                  <span className="text-xs font-mono font-medium text-slate-800 truncate block">
                    {cnpjValor || '—'}
                  </span>
                </div>
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
              </button>

              {/* 2. Copiar Nome */}
              <button
                type="button"
                onClick={() => handleCopy(nomeValor, 'Nome')}
                className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-white bg-slate-100/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
                title={nomeValor ? `Copiar Nome: ${nomeValor}` : 'Sem Nome'}
              >
                <div className="min-w-0 pr-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">2. Nome</span>
                  <span className="text-xs font-medium text-slate-800 truncate block">
                    {nomeValor || '—'}
                  </span>
                </div>
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
              </button>

              {/* 3. Copiar Razão Social */}
              <button
                type="button"
                onClick={() => handleCopy(razaoValor, 'Razão Social')}
                className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-white bg-slate-100/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
                title={razaoValor ? `Copiar Razão Social: ${razaoValor}` : 'Sem Razão Social'}
              >
                <div className="min-w-0 pr-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">3. Razão Social</span>
                  <span className="text-xs font-medium text-slate-800 truncate block">
                    {razaoValor || '—'}
                  </span>
                </div>
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
              </button>

              {/* 4. Copiar Telefone */}
              <button
                type="button"
                onClick={() => handleCopy(telefoneValor, 'Telefone')}
                className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-white bg-slate-100/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
                title={telefoneValor ? `Copiar Telefone: ${telefoneValor}` : 'Sem Telefone'}
              >
                <div className="min-w-0 pr-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">4. Telefone</span>
                  <span className="text-xs font-medium text-slate-800 truncate block">
                    {telefoneValor || '—'}
                  </span>
                </div>
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
              </button>

              {/* 5. Copiar Endereço Completo */}
              <button
                type="button"
                onClick={() => handleCopy(enderecoCompletoValor, 'Endereço Completo')}
                className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-white bg-slate-100/40 text-left transition-colors flex items-center justify-between group sm:col-span-2 cursor-pointer"
                title={enderecoCompletoValor ? `Copiar Endereço Completo: ${enderecoCompletoValor}` : 'Sem Endereço'}
              >
                <div className="min-w-0 pr-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">5. Endereço Completo</span>
                  <span className="text-xs font-medium text-slate-800 truncate block">
                    {enderecoCompletoValor || '—'}
                  </span>
                </div>
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
              </button>
            </div>

            {/* Botão extra no final: Copiar Tudo (Bloco) */}
            <div className="pt-2 border-t border-slate-200/70 flex justify-end">
              <button
                type="button"
                onClick={() => handleCopy(blocoTudoValor, 'Todos os Dados')}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white hover:border-slate-400 bg-white/60 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Copiar os 5 dados cadastrais, um por linha"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Tudo (Bloco)</span>
              </button>
            </div>
          </div>

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
                        const leadPix = definirPix(lead, novo);
                        onUpdateLead({
                          ...leadPix,
                          produtosAtivos: {
                            ...leadPix.produtosAtivos,
                            conta: novo >= 3,
                          },
                        });
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
                    {contaAtiva(lead) && onUpdateLead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Desativar conta PJ? O lead deixará de pontuar por conta.')) {
                            const leadPix = definirPix(lead, 0);
                            onUpdateLead({
                              ...leadPix,
                              produtosAtivos: {
                                ...leadPix.produtosAtivos,
                                conta: false,
                              },
                            });
                          }
                        }}
                        title="Desativar conta PJ"
                        className="w-3 h-3 flex items-center justify-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 text-[9px] font-bold ml-0.5"
                      >
                        ✕
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
                            const leadMaq = registrarVendaMaquina(lead, v);
                            onUpdateLead({
                              ...leadMaq,
                              produtosAtivos: {
                                ...leadMaq.produtosAtivos,
                                maquina: (leadMaq.maquinaVendas || 0) >= 500,
                              },
                            });
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
                    {maquinaAtiva(lead) && onUpdateLead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Desativar máquina? O lead deixará de pontuar por GetNet.')) {
                            const leadMaq = definirMaquinaVendas(lead, 0);
                            onUpdateLead({
                              ...leadMaq,
                              produtosAtivos: {
                                ...leadMaq.produtosAtivos,
                                maquina: false,
                              },
                            });
                          }
                        }}
                        title="Desativar máquina"
                        className="w-3 h-3 flex items-center justify-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 text-[9px] font-bold ml-0.5"
                      >
                        ✕
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
      )}

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

export default LeadDetailDrawer;

