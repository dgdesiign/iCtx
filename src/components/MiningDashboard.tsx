import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Minus,
  Pickaxe,
  FileSpreadsheet,
  History,
  Search,
  Loader2,
  Smartphone,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  MapPin,
  Play,
  RotateCw,
  Download,
  Trash2,
  Package,
  Calendar,
} from 'lucide-react';
import { formatarCnpj, limparCnpj, formatarTelefone } from '../services/cnpjService';
import { ehCelularBR } from '../utils/telefone';
import { CoverageMap } from './CoverageMap';
import { MiningStatusData } from '../hooks/useMiningStatus';

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz0fvTn2qaL1dg-g3drkSHPZEgOchJVD0kVHNqmJamOYLDVEphEvLIkttG57OzEf5iFtQ/exec';

const CIDADES: Record<string, string[]> = {
  'SALVADOR': ['Pituba','Barra','Ondina','Rio Vermelho','Itapuã','Piatã','Stella Maris','Caminho das Árvores','Bela Vista','Sete Portas','Liberdade','Cabula','Imbuí','Jaguaribe','Brotas','Nazaré','Comércio','Ribeira','Bonfim','Itapagipe','Paripe','Plataforma','Periperi','Cajazeiras','Tancredo Neves','Sussuarana','Pau da Lima','São Caetano','Valéria'],
  'CAMACARI': ['Centro','Arembepe','Guarajuba','Abrantes','Barra do Jacuípe','Itacimirim','Catu de Abrantes','Nova Vitória','Parque das Palmeiras','Jardim Limoeiro','Piaçaveira','Camaçari de Dentro','Alto da Cruz','Triângulo','Phoc I','Phoc II','Verdes Horizontes'],
  'CANDEIAS': ['Centro','Ouro Negro','Nova Candeias','Malembá','Santo Antônio','Sarandi','Areia','Caroba','Caboto','Urbis I','Urbis II','Pitanga','Menino Jesus','Passagem dos Teixeiras','Pindoba'],
  'LAURO DE FREITAS': ['Centro','Vilas do Atlântico','Ipitanga','Buraquinho','Portão','Pitangueiras','Vila Praiana','Areia Branca','Jambeiro','Quingoma','Itinga','Caji','Miragem','Vida Nova','Barro Duro','Caixa d\'Água'],
  'SIMÕES FILHO': ['Centro','CIA','CIA Sul','Pitanguinha','Ponto Parada','Parque Continental','Cristo Rei','Góes Calmon','Palmares','Santa Rosa','Mapele','Cova da Gia','Km 25','Engenho Novo'],
  'DIAS D\'ÁVILA': ['Centro','Nova Dias d\'Ávila','Urbis','Cristo Rei','Genaro','Entroncamento','Narandiba'],
  'MATA DE SÃO JOÃO': ['Praia do Forte','Imbassaí','Açu da Torre','Costa do Sauípe','Amado Bahia','Centro','Malhadas','Tapera','Pau Grande'],
  'POJUCA': ['Centro','Pojuca Nova','Pojuca II','Bairro da Vitória','Luís Eduardo Magalhães','Star','Corujão','Cruzeiro','Cajazeiras','Alto da Bela Vista','Miranga','Santiago','Sapé'],
  'CATU': ['Centro','Bela Flor','Sítio Novo','Barão de Camaçari','Boa Vista','Rua Nova','Pioneiro','Planalto','Bom Viver','Pau Lavrado'],
  'SÃO SEBASTIÃO DO PASSÉ': ['Centro','Cinco Rios','Jacuípe','Lamarão do Passe','São Roque','Humildes','Agostinho Amaral','Nazaré de Jacuípe'],
  'MADRE DE DEUS': ['Centro','Suape','Cação','Marezinha','Mirim','Alto do Paraíso','Apicum','Nova Madre de Deus'],
  'SÃO FRANCISCO DO CONDE': ['Centro','Mataripe','Monte Recôncavo','São Bento das Lages','Nova São Francisco','Baixa Fria','Paraminin','Pitangueiras','Caípe'],
  'ALAGOINHAS': ['Centro','Alagoinhas Velha','Santa Terezinha','Novo Horizonte','Barreiro','Kennedy','Jardim Petrolar','Juracy Magalhães','Mangalô','Parque Vitória','Santa Isabel','Teresópolis','Dois de Julho','Silva Jardim']
};

const CNAES_DISPONIVEIS = ['Restaurante', 'Bar', 'Padaria', 'Salão', 'Clínica'];

interface RawLeadMinerado {
  id?: string;
  cnpj?: string;
  CNPJ?: string;
  razaoSocial?: string;
  razao_social?: string;
  nomeFantasia?: string;
  nome_fantasia?: string;
  telefone?: string;
  telefonePrincipal?: string;
  celular?: string;
  municipio?: string;
  cidade?: string;
  bairro?: string;
  cnae?: string;
  [key: string]: any;
}

interface MiningDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  miningStatus?: MiningStatusData;
  onImportLeads: (leads: RawLeadMinerado[]) => void;
  existingCnpjs?: Set<string>;
}

export const MiningDashboard: React.FC<MiningDashboardProps> = ({
  isOpen,
  onClose,
  onMinimize,
  miningStatus,
  onImportLeads,
  existingCnpjs = new Set(),
}) => {
  const [activeTab, setActiveTab] = useState<'minerar' | 'retorno_ak' | 'cobertura' | 'historico'>('minerar');

  // Fallback caso miningStatus não seja injetado
  const fallbackStatus = useMemo<MiningStatusData>(
    () => ({
      status: 'idle',
      totalCartucho: 0,
      leadsNoCartucho: 0,
      duplicatasBloqueadas: 0,
      pendentes: [],
      bairrosPendentes: [],
      processando: 0,
      breakdown: {},
      totalBairros: 0,
      bairrosConcluidos: 0,
      bairroAtual: null,
      refresh: async () => {},
    }),
    []
  );

  const cartuchoStatus = miningStatus || fallbackStatus;

  // Controles da Aba 1: Minerar Leads
  const [municipioSelecionado, setMunicipioSelecionado] = useState<string>('SALVADOR');
  const [bairrosSelecionados, setBairrosSelecionados] = useState<Set<string>>(
    () => new Set(CIDADES['SALVADOR'] || [])
  );
  const [cnaesSelecionados, setCnaesSelecionados] = useState<string[]>([...CNAES_DISPONIVEIS]);
  const [anoInicio, setAnoInicio] = useState<string>('');
  const [anoFim, setAnoFim] = useState<string>('');

  // Estado do Job e Cartucho (Backend Apps Script)
  const [isMiningLoading, setIsMiningLoading] = useState(false);
  const [isDownloadingCartucho, setIsDownloadingCartucho] = useState(false);
  const [isClearingCartucho, setIsClearingCartucho] = useState(false);
  const [miningError, setMiningError] = useState<string | null>(null);

  // Aba 2: Importar Retorno AK
  const [textoAK, setTextoAK] = useState('');
  const [isAKLoading, setIsAKLoading] = useState(false);
  const [akError, setAkError] = useState<string | null>(null);
  const [leadsAK, setLeadsAK] = useState<RawLeadMinerado[]>([]);
  const [selectedAK, setSelectedAK] = useState<Set<number>>(new Set());
  // Mensagens de Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);

  const isJobAtivo =
    isMiningLoading ||
    cartuchoStatus.processando > 0 ||
    cartuchoStatus.status === 'rodando' ||
    cartuchoStatus.status === 'aguardando' ||
    cartuchoStatus.status === 'em_andamento';

  // Fecha modal com confirmação de segundo plano se houver job ativo
  const handleClose = () => {
    if (isJobAtivo) {
      const querMinimizar = window.confirm(
        'A mineração continua em segundo plano. Deseja minimizar em vez de fechar?'
      );
      if (querMinimizar) {
        if (onMinimize) {
          onMinimize();
        } else {
          onClose();
        }
        return;
      }
    }
    onClose();
  };

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    } else {
      onClose();
    }
  };

  // Fecha com ESC chamando handleClose (com alerta de background se ativo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isJobAtivo, onMinimize, onClose]);

  // Listener para trocar aba via evento customizado (ex: Header)
  useEffect(() => {
    const handleOpenTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === 'cobertura') {
        setActiveTab('cobertura');
      }
    };
    window.addEventListener('ictx:openMiningTab', handleOpenTab);
    return () => window.removeEventListener('ictx:openMiningTab', handleOpenTab);
  }, []);

  // Ao abrir o modal, verifica se havia flag de aba
  useEffect(() => {
    if (isOpen) {
      const initialTab = localStorage.getItem('ictx_mining_initial_tab');
      if (initialTab === 'cobertura') {
        setActiveTab('cobertura');
        localStorage.removeItem('ictx_mining_initial_tab');
      }
    }
  }, [isOpen]);

  // Limpa feedback após 5s
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  // Atualiza a seleção de bairros quando o município mudar
  const handleTrocarMunicipio = (novoMuni: string) => {
    setMunicipioSelecionado(novoMuni);
    const bairrosNovoMuni = CIDADES[novoMuni] || [];
    setBairrosSelecionados(new Set(bairrosNovoMuni));
  };

  const toggleBairro = (bairro: string) => {
    setBairrosSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(bairro)) {
        next.delete(bairro);
      } else {
        next.add(bairro);
      }
      return next;
    });
  };

  const handleSelectAllBairros = (marcar: boolean) => {
    const lista = CIDADES[municipioSelecionado] || [];
    if (marcar) {
      setBairrosSelecionados(new Set(lista));
    } else {
      setBairrosSelecionados(new Set());
    }
  };

  const toggleCnae = (cnae: string) => {
    setCnaesSelecionados((prev) =>
      prev.includes(cnae) ? prev.filter((item) => item !== cnae) : [...prev, cnae]
    );
  };

  const handleSelectAllCnaes = () => {
    if (cnaesSelecionados.length === CNAES_DISPONIVEIS.length) {
      setCnaesSelecionados([]);
    } else {
      setCnaesSelecionados([...CNAES_DISPONIVEIS]);
    }
  };

  // Atualiza status ao abrir o modal
  useEffect(() => {
    if (isOpen && cartuchoStatus.refresh) {
      cartuchoStatus.refresh();
    }
  }, [isOpen, cartuchoStatus]);

  // PASSO 2: Iniciar Mineração
  const handleIniciarMineracao = async () => {
    console.log('[Mineração] handleIniciarMineracao disparado!');
    const bairrosArray = Array.from(bairrosSelecionados);
    console.log('[Mineração] Município:', municipioSelecionado);
    console.log('[Mineração] Bairros selecionados (' + bairrosArray.length + '):', bairrosArray);
    console.log('[Mineração] CNAEs selecionados:', cnaesSelecionados);

    if (bairrosArray.length === 0) {
      console.warn('[Mineração] Nenhum bairro selecionado.');
      setMiningError('Selecione pelo menos um bairro para iniciar a mineração.');
      return;
    }

    if (cnaesSelecionados.length === 0) {
      console.warn('[Mineração] Nenhum CNAE selecionado.');
      setMiningError('Selecione pelo menos um CNAE para filtrar.');
      return;
    }

    setIsMiningLoading(true);
    setMiningError(null);
    setFeedbackMsg(null);

    const anoIniNum = anoInicio.trim() ? Number(anoInicio.trim()) : undefined;
    const anoFimNum = anoFim.trim() ? Number(anoFim.trim()) : undefined;

    const payload = {
      action: 'iniciar_mineracao',
      dados: {
        municipio: municipioSelecionado,
        bairros: bairrosArray,
        cnaes: cnaesSelecionados,
        excluirMei: true,
        apenasMaisDeUmAno: true,
        anoInicio: anoIniNum,
        anoFim: anoFimNum,
      },
    };

    console.log('[Mineração] Disparando fetch para:', APPS_SCRIPT_URL);
    console.log('[Mineração] Payload JSON:', JSON.stringify(payload));

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      });

      console.log('[Mineração] Resposta HTTP recebida. Status:', response.status, response.statusText);

      const raw = await response.text();
      console.log('[Mineração] Resposta texto bruto:', raw);

      let res: any = {};
      try {
        res = JSON.parse(raw);
        console.log('[Mineração] Resposta JSON parseada:', res);
      } catch (errJson) {
        console.warn('[Mineração] Resposta não é JSON:', errJson);
        res = {};
      }

      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Mineração iniciada com sucesso em ${municipioSelecionado} (${bairrosArray.length} bairros)! O robô está acumulando os leads no cartucho.`,
      });

      // Notifica o Header imediatamente
      localStorage.setItem('ictx_mining_job', JSON.stringify({ isRunning: true }));
      window.dispatchEvent(
        new CustomEvent('ictx:miningJobUpdate', {
          detail: { isRunning: true },
        })
      );

      // Dispara atualização imediata no hook central
      if (cartuchoStatus.refresh) {
        await cartuchoStatus.refresh();
      }

      // PASSO 4: Ao clicar em "Iniciar Mineração", após o fetch de iniciar_mineracao, chame refresh() e depois onMinimize() automaticamente
      if (onMinimize) {
        onMinimize();
      }
    } catch (err: any) {
      console.warn('[Mineração] Erro ao iniciar mineração:', err);
      const msg = err?.message === 'Failed to fetch'
        ? 'Erro de conexão com o Apps Script. Verifique se o script no Google Sheets tem o erro "setHeaders is not a function" na linha 52 do arquivo "Código" e gere um novo Deploy.'
        : (err?.message || 'Falha ao conectar com o robô de mineração.');
      setMiningError(msg);
    } finally {
      setIsMiningLoading(false);
    }
  };

  // PASSO 3: Baixar Cartucho (.xlsx)
  const handleBaixarCartucho = async () => {
    setIsDownloadingCartucho(true);
    setFeedbackMsg(null);

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ action: 'baixar_cartucho' }),
      });

      const raw = await response.text();
      let res: any = {};
      try {
        res = JSON.parse(raw);
      } catch {
        res = {};
      }

      const downloadUrl = res.link || res.url || res.downloadUrl || res.arquivoUrl;

      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        setFeedbackMsg({
          tipo: 'sucesso',
          texto: 'Planilha Excel do cartucho gerada e download iniciado!',
        });
      } else {
        setFeedbackMsg({
          tipo: 'info',
          texto: res.mensagem || 'Cartucho vazio ou solicitação processada pelo Apps Script.',
        });
      }

      // Atualiza status via hook
      if (cartuchoStatus.refresh) {
        await cartuchoStatus.refresh();
      }
    } catch (err: any) {
      console.warn('[Mineração] Erro ao baixar cartucho:', err);
      setFeedbackMsg({
        tipo: 'erro',
        texto: err?.message || 'Falha ao solicitar o download do cartucho.',
      });
    } finally {
      setIsDownloadingCartucho(false);
    }
  };

  // PASSO 3: Limpar Cartucho
  const handleLimparCartucho = async () => {
    const confirmou = window.confirm(
      'Tem certeza que deseja limpar todo o cartucho de mineração? Essa ação zerará os leads acumulados no robô.'
    );
    if (!confirmou) return;

    setIsClearingCartucho(true);
    setFeedbackMsg(null);

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ action: 'limpar_cartucho' }),
      });

      const raw = await response.text();
      let res: any = {};
      try {
        res = JSON.parse(raw);
      } catch {
        res = {};
      }

      setIsMiningLoading(false);
      localStorage.removeItem('ictx_mining_job');
      window.dispatchEvent(
        new CustomEvent('ictx:miningJobUpdate', {
          detail: { isRunning: false },
        })
      );

      setFeedbackMsg({
        tipo: 'sucesso',
        texto: res.mensagem || 'Cartucho limpo e zerado com sucesso!',
      });

      // Atualiza status via hook
      if (cartuchoStatus.refresh) {
        await cartuchoStatus.refresh();
      }
    } catch (err: any) {
      console.warn('[Mineração] Erro ao limpar cartucho:', err);
      setFeedbackMsg({
        tipo: 'erro',
        texto: err?.message || 'Falha ao solicitar a limpeza do cartucho.',
      });
    } finally {
      setIsClearingCartucho(false);
    }
  };

  // Processar Retorno AK (Aba 2)
  const handleProcessarRetornoAK = async () => {
    const textoTrim = textoAK.trim();
    if (!textoTrim) {
      setAkError('Cole o texto do Portal AK no campo abaixo antes de processar.');
      return;
    }

    setIsAKLoading(true);
    setAkError(null);
    setFeedbackMsg(null);

    try {
      const bodyPayload = {
        action: 'processarAK',
        texto: textoTrim,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();
      let parsedData: any;
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        throw new Error(
          'O Apps Script não retornou um JSON válido. Verifique se o script está publicado como Web App com acesso "Qualquer pessoa".'
        );
      }

      const lista: RawLeadMinerado[] = Array.isArray(parsedData)
        ? parsedData
        : parsedData.leads || parsedData.data || parsedData.resultado || parsedData.aprovados || [];

      if (!lista || lista.length === 0) {
        setLeadsAK([]);
        setSelectedAK(new Set());
        setFeedbackMsg({
          tipo: 'info',
          texto: 'Nenhum lead aprovado identificado no texto fornecido.',
        });
      } else {
        setLeadsAK(lista);
        setSelectedAK(new Set(lista.map((_, idx) => idx)));
        setFeedbackMsg({
          tipo: 'sucesso',
          texto: `${lista.length} lead(s) aprovados identificados do Portal AK!`,
        });
      }
    } catch (err: any) {
      console.error('Erro ao processar retorno AK:', err);
      if (err.name === 'AbortError') {
        setAkError('Tempo limite excedido ao processar retorno AK.');
      } else {
        setAkError(err.message || 'Falha ao processar retorno do Portal AK.');
      }
    } finally {
      setIsAKLoading(false);
    }
  };

  const handleConfirmarImportacaoAK = () => {
    const selecionados = leadsAK.filter((_, idx) => selectedAK.has(idx));
    if (selecionados.length === 0) return;
    onImportLeads(selecionados);
  };

  const toggleSelectAK = (index: number) => {
    setSelectedAK((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleSelectAllAK = () => {
    if (selectedAK.size === leadsAK.length) {
      setSelectedAK(new Set());
    } else {
      setSelectedAK(new Set(leadsAK.map((_, idx) => idx)));
    }
  };

  // Selecionar apenas não minerados no mapa de cobertura
  const handleSelectOnlyNaoMineradosCoverage = () => {
    const listaBairros = CIDADES[municipioSelecionado] || [];
    const pendentes = listaBairros.filter((b) => {
      const count = cartuchoStatus.breakdown[b] || 0;
      return count === 0;
    });
    setBairrosSelecionados(new Set(pendentes));
  };

  const bairrosAtuaisDaCidade = CIDADES[municipioSelecionado] || [];

  if (!isOpen) return null;

  return (
    <div
      onClick={() => {
        console.log('[Mineração] Clique no backdrop');
        handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-50 border border-slate-200 rounded-2xl shadow-2xl flex flex-col w-full h-full max-h-[96vh] max-w-6xl overflow-hidden"
      >
        
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs shrink-0">
              <Pickaxe className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Central de Mineração Integrada
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Sprint 11.4
                </span>
                {isJobAtivo && (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                    Minerando ({cartuchoStatus.leadsNoCartucho} no cartucho)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Controle Manual de Cartucho · Filtros de Ano · 13 Cidades da RMS/Bahia · Semáforo de Cobertura
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Atualizar */}
            <button
              type="button"
              onClick={() => {
                console.log('[Mineração] Atualizar status clicado manualmente');
                if (cartuchoStatus.refresh) {
                  cartuchoStatus.refresh();
                }
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Atualizar Status do Cartucho"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* 1. Botão "-" (Minimizar) */}
            <button
              type="button"
              onClick={handleMinimize}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Minimizar (continua em segundo plano)"
              aria-label="Minimizar"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* 2. Botão "X" (Fechar) */}
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              title="Fechar (Esc)"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-5 pt-2 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            {/* Aba 1: Minerar Leads */}
            <button
              onClick={() => setActiveTab('minerar')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'minerar'
                  ? 'border-amber-500 text-amber-700 bg-amber-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Search className="w-4 h-4 text-amber-600" />
              <span>Minerar Leads</span>
              {cartuchoStatus.leadsNoCartucho > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                  {cartuchoStatus.leadsNoCartucho}
                </span>
              )}
            </button>

            {/* Aba 4: Cobertura de Atendimento */}
            <button
              onClick={() => setActiveTab('cobertura')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'cobertura'
                  ? 'border-red-600 text-red-700 bg-red-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <MapPin className="w-4 h-4 text-red-600" />
              <span>Cobertura de Atendimento</span>
            </button>

            {/* Aba 2: Importar Retorno AK */}
            <button
              onClick={() => setActiveTab('retorno_ak')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'retorno_ak'
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Importar Retorno AK</span>
            </button>

            {/* Aba 3: Histórico */}
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'historico'
                  ? 'border-indigo-500 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <History className="w-4 h-4 text-indigo-600" />
              <span>Histórico</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 pb-2 shrink-0">
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cartucho Atual: {cartuchoStatus.leadsNoCartucho} leads</span>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div
            className={`mx-5 mt-3 px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150 ${
              feedbackMsg.tipo === 'sucesso'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedbackMsg.tipo === 'erro'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{feedbackMsg.texto}</span>
            </div>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-slate-600 text-xs ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ======================================================== */}
          {/* ABA 1: MINERAR LEADS COM CONTROLE DE CARTUCHO & ANOS */}
          {/* ======================================================== */}
          {activeTab === 'minerar' && (
            <div className="space-y-4">
              
              {/* Form Filter Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                
                {/* 1. Dropdown de Cidades */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-amber-600" />
                      Parâmetros de Mineração
                    </h3>
                    <p className="text-xs text-slate-500">
                      Escolha a cidade, bairros alvos, CNAEs e faixa de fundação
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">Cidade Alvo:</label>
                    <select
                      value={municipioSelecionado}
                      onChange={(e) => handleTrocarMunicipio(e.target.value)}
                      disabled={isJobAtivo}
                      className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer disabled:opacity-60"
                    >
                      {Object.keys(CIDADES).map((cid) => (
                        <option key={cid} value={cid}>
                          {cid} ({CIDADES[cid].length} bairros)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Grid de Checkboxes para os Bairros da Cidade Selecionada */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Bairros de {municipioSelecionado} ({bairrosSelecionados.size} de {bairrosAtuaisDaCidade.length} selecionados):
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSelectAllBairros(bairrosSelecionados.size !== bairrosAtuaisDaCidade.length)}
                        disabled={isJobAtivo}
                        className="text-amber-700 hover:text-amber-800 font-bold cursor-pointer"
                      >
                        {bairrosSelecionados.size === bairrosAtuaisDaCidade.length
                          ? 'Desmarcar Todos'
                          : 'Selecionar Todos'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[160px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                    {bairrosAtuaisDaCidade.map((b) => {
                      const isChecked = bairrosSelecionados.has(b);
                      const leadsNoCartucho = cartuchoStatus.breakdown[b] || 0;
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => toggleBairro(b)}
                          disabled={isJobAtivo}
                          className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left cursor-pointer ${
                            isChecked
                              ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[9px] ${
                                isChecked ? 'bg-amber-600 text-white' : 'border border-slate-300 bg-white'
                              }`}
                            >
                              {isChecked && '✓'}
                            </div>
                            <span className="truncate">{b}</span>
                          </div>
                          {leadsNoCartucho > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded shrink-0">
                              {leadsNoCartucho}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Checkboxes de CNAEs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Segmentos / CNAEs Alvo:
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllCnaes}
                      disabled={isJobAtivo}
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
                    >
                      {cnaesSelecionados.length === CNAES_DISPONIVEIS.length
                        ? 'Desmarcar Todos'
                        : 'Selecionar Todos'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {CNAES_DISPONIVEIS.map((cnae) => {
                      const isChecked = cnaesSelecionados.includes(cnae);
                      return (
                        <button
                          key={cnae}
                          type="button"
                          onClick={() => toggleCnae(cnae)}
                          disabled={isJobAtivo}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left cursor-pointer ${
                            isChecked
                              ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] ${
                              isChecked ? 'bg-amber-600 text-white' : 'border border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && '✓'}
                          </div>
                          <span className="truncate">{cnae}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Inputs Numéricos: Ano de Abertura (De) e Ano de Abertura (Até) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Ano de Abertura (De):
                    </label>
                    <input
                      type="number"
                      min="1950"
                      max="2030"
                      value={anoInicio}
                      onChange={(e) => setAnoInicio(e.target.value)}
                      placeholder="Ex: 2010 (Opcional)"
                      disabled={isJobAtivo}
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Ano de Abertura (Até):
                    </label>
                    <input
                      type="number"
                      min="1950"
                      max="2030"
                      value={anoFim}
                      onChange={(e) => setAnoFim(e.target.value)}
                      placeholder="Ex: 2024 (Opcional)"
                      disabled={isJobAtivo}
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white"
                    />
                  </div>
                </div>

                {/* Mensagem de Erro / Diagnóstico Apps Script */}
                {(miningError || cartuchoStatus.connectionError) && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{miningError || cartuchoStatus.connectionError}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 pl-6 leading-relaxed">
                      💡 <strong>Como resolver no Google Sheets:</strong> No editor do Apps Script (Extensões &gt; Apps Script), no arquivo <code>Código</code> na linha 52, remova a chamada <code>.setHeaders(...)</code> do <code>ContentService</code> (esse método não existe no Apps Script). Em seguida, clique em <strong>Implantar &gt; Gerenciar Implantações &gt; Editar &gt; Nova Versão</strong>.
                    </p>
                  </div>
                )}

                {/* 5. Botão Iniciar Mineração */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Filtros fixos:</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">
                      Excluir MEI
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">
                      Mais de 1 ano
                    </span>
                  </div>

                  {isJobAtivo ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-xs">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mineração em Andamento...</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('[Mineração] Forçando novo disparo de Iniciar Mineração...');
                          setIsMiningLoading(false);
                          handleIniciarMineracao();
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        title="Clique para redisparar uma nova mineração"
                      >
                        Reiniciar / Forçar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('[Mineração] Botão Iniciar Mineração clicado pelo usuário');
                        handleIniciarMineracao();
                      }}
                      disabled={bairrosSelecionados.size === 0}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Iniciar Mineração ({bairrosSelecionados.size} Bairros)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ======================================================== */}
              {/* PASSO 3: CARD DE STATUS E CONTROLE DE CARTUCHO */}
              {/* Visível quando houver job ativo OU leads no cartucho */}
              {/* ======================================================== */}
              {(isJobAtivo || cartuchoStatus.status === 'concluido' || cartuchoStatus.status === 'concluído' || cartuchoStatus.leadsNoCartucho > 0 || cartuchoStatus.duplicatasBloqueadas > 0) && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-emerald-600" />
                        <h4 className="text-base font-extrabold text-slate-900">
                          {cartuchoStatus.leadsNoCartucho} leads no cartucho
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {cartuchoStatus.duplicatasBloqueadas} duplicatas bloqueadas
                      </p>
                    </div>

                    {/* Botões de Ação do Cartucho */}
                    <div className="flex items-center gap-2">
                      {/* Botão verde: Baixar Cartucho (.xlsx) */}
                      <button
                        type="button"
                        onClick={handleBaixarCartucho}
                        disabled={isDownloadingCartucho || cartuchoStatus.leadsNoCartucho === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isDownloadingCartucho ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>📦 Baixar Cartucho (.xlsx)</span>
                      </button>

                      {/* Botão vermelho: Limpar Cartucho */}
                      <button
                        type="button"
                        onClick={handleLimparCartucho}
                        disabled={isClearingCartucho || (cartuchoStatus.leadsNoCartucho === 0 && !isJobAtivo)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isClearingCartucho ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-600" />
                        )}
                        <span>🗑️ Limpar Cartucho</span>
                      </button>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {isJobAtivo ? (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                      <span>⏳ Processando bairro...</span>
                    </div>
                  ) : (cartuchoStatus.status === 'concluido' || cartuchoStatus.status === 'concluído') ? (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>✅ Fila concluída. Baixe o cartucho.</span>
                    </div>
                  ) : null}

                  {/* Barra de Progresso se o job estiver rodando */}
                  {isJobAtivo && (
                    <div className="space-y-2 bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          Robô trabalhando: {cartuchoStatus.bairrosConcluidos} de {cartuchoStatus.totalBairros || bairrosSelecionados.size} bairros processados
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Atualizando a cada 10s
                        </span>
                      </div>

                      <div className="w-full bg-amber-200/60 rounded-full h-2.5 overflow-hidden">
                        <div
                          style={{
                            width: `${
                              cartuchoStatus.totalBairros > 0
                                ? Math.min(
                                    Math.round(
                                      (cartuchoStatus.bairrosConcluidos / cartuchoStatus.totalBairros) * 100
                                    ),
                                    100
                                  )
                                : 25
                            }%`,
                          }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pré-visualização do Semáforo na Aba Minerar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-600" />
                    Cobertura de {municipioSelecionado} no Cartucho:
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    🟢 Verde = leads no cartucho | 🔴 Vermelho = pendente
                  </span>
                </div>

                <CoverageMap
                  bairros={bairrosAtuaisDaCidade}
                  breakdown={cartuchoStatus.breakdown}
                  bairrosPendentes={cartuchoStatus.bairrosPendentes}
                  municipio={municipioSelecionado}
                  selecionadosIds={bairrosSelecionados}
                  onToggleSelectBairro={toggleBairro}
                  onSelectAll={handleSelectAllBairros}
                  onSelectOnlyNaoMinerados={handleSelectOnlyNaoMineradosCoverage}
                  disabled={isJobAtivo}
                />
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 4: COBERTURA DE ATENDIMENTO */}
          {/* ======================================================== */}
          {activeTab === 'cobertura' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      Semáforo de Cobertura Territorial via Cartucho
                    </h3>
                    <p className="text-xs text-slate-500">
                      O cartucho é a verdade absoluta da cobertura: verde para bairros já minerados e vermelho para pendentes
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Cidade:</span>
                    <select
                      value={municipioSelecionado}
                      onChange={(e) => handleTrocarMunicipio(e.target.value)}
                      disabled={isJobAtivo}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer disabled:opacity-60"
                    >
                      {Object.keys(CIDADES).map((cid) => (
                        <option key={cid} value={cid}>
                          {cid}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Resumo rápido do cartucho */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">
                      📦 Cartucho: <strong className="text-emerald-700">{cartuchoStatus.leadsNoCartucho} leads</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="font-medium text-slate-600">
                      Duplicatas bloqueadas: <strong className="text-amber-700">{cartuchoStatus.duplicatasBloqueadas}</strong>
                    </span>
                  </div>

                  {cartuchoStatus.leadsNoCartucho > 0 && (
                    <button
                      type="button"
                      onClick={handleBaixarCartucho}
                      disabled={isDownloadingCartucho}
                      className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Cartucho (.xlsx)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid do Semáforo */}
              <CoverageMap
                bairros={bairrosAtuaisDaCidade}
                breakdown={cartuchoStatus.breakdown}
                bairrosPendentes={cartuchoStatus.bairrosPendentes}
                municipio={municipioSelecionado}
                selecionadosIds={bairrosSelecionados}
                onToggleSelectBairro={toggleBairro}
                onSelectAll={handleSelectAllBairros}
                onSelectOnlyNaoMinerados={handleSelectOnlyNaoMineradosCoverage}
                disabled={isJobAtivo}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 2: IMPORTAR RETORNO AK */}
          {/* ======================================================== */}
          {activeTab === 'retorno_ak' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Colar Dados do Portal Almeida Krüger (AK)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cole a tabela ou texto copiado da produção do Portal AK para extrair os leads aprovados
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Processador AK
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={textoAK}
                  onChange={(e) => setTextoAK(e.target.value)}
                  placeholder={`Cole aqui o texto copiado do Portal AK contendo CNPJ, Razão Social, Telefones e Status...
Exemplo:
61.456.484/0001-72	JORGE DE GOES COSTA	71999815825	Aprovado
67.918.942/0001-24	GABRIELA VILLACORTA	71988857562	Apto`}
                  className="w-full text-xs font-mono p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                  disabled={isAKLoading}
                />

                {akError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{akError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    O parser inteligente identificará celulares e marcará os leads como Apto.
                  </span>
                  <button
                    type="button"
                    onClick={handleProcessarRetornoAK}
                    disabled={isAKLoading || !textoAK.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isAKLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Processar Retorno</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {leadsAK.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleSelectAllAK}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                      >
                        {selectedAK.size === leadsAK.length ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                        <span>
                          {selectedAK.size === leadsAK.length
                            ? 'Desmarcar Todos'
                            : 'Selecionar Todos'}
                        </span>
                      </button>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-600">
                        <strong className="text-slate-900">{selectedAK.size}</strong> de{' '}
                        <strong className="text-slate-900">{leadsAK.length}</strong> aprovados selecionados
                      </span>
                    </div>

                    <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Celulares prontos para abordagem via WhatsApp</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/75 text-slate-600 sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">CNPJ</th>
                          <th className="py-2.5 px-3">Razão Social</th>
                          <th className="py-2.5 px-3">Telefone</th>
                          <th className="py-2.5 px-3">Status AK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leadsAK.map((lead, idx) => {
                          const cnpjLimpo = limparCnpj(lead.cnpj || lead.CNPJ || '');
                          const isSelected = selectedAK.has(idx);
                          const tel = lead.telefone || lead.telefonePrincipal || lead.celular || '';
                          const isCelular = ehCelularBR(tel);
                          const telFormatado = formatarTelefone(tel);

                          return (
                            <tr
                              key={idx}
                              onClick={() => toggleSelectAK(idx)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                                {formatarCnpj(cnpjLimpo)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {lead.razaoSocial || lead.razao_social || lead.nome || 'Empresa'}
                              </td>
                              <td className="py-2.5 px-3">
                                {tel ? (
                                  <div className="flex items-center gap-1.5 font-mono">
                                    {isCelular ? (
                                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                                        {telFormatado}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[11px]">
                                        <Phone className="w-3 h-3 text-slate-500" />
                                        {telFormatado}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Sem telefone</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ Aprovado AK
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      💡 Leads serão adicionados na coluna <strong className="text-slate-800">"Em Prospecção"</strong> com a tag de Santander <strong className="text-emerald-700">"Apto"</strong>.
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmarImportacaoAK}
                      disabled={selectedAK.size === 0}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Importar {selectedAK.size} Aprovados para o Kanban</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 3: HISTÓRICO */}
          {/* ======================================================== */}
          {activeTab === 'historico' && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Em breve: Histórico de Minerações
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Registro de lotes minerados, parâmetros utilizados e taxas de conversão de cada busca realizada.
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
