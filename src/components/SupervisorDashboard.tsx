import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  BarChart3,
  Users,
  Building2,
  FileSpreadsheet,
  TrendingUp,
  Award,
  CheckCircle2,
  ChevronDown,
  Layers,
  ArrowUpRight,
  Filter,
  Flame,
  Target,
  Sparkles,
  PieChart,
  MapPin,
  Globe,
  Compass,
  Navigation,
} from 'lucide-react';
import { Lead, EquipeMembro, LeadStatus } from '../types/crm';
import { INITIAL_TEMPLATES } from '../data/initialTemplates';
import { pontosMes, remuneracao, gatilhoDoMes } from '../utils/pontos';

interface SupervisorDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  leadsEquipe: EquipeMembro[];
  usuarioAtivo: {
    nome: string;
    email: string;
    role: 'supervisor' | 'executivo';
  };
  onAlternarRole?: (role: 'supervisor' | 'executivo') => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  isOpen,
  onClose,
  leadsEquipe,
  usuarioAtivo,
  onAlternarRole,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtro de executivo: 'todos' para consolidado ou email do executivo
  const [executivoSelecionado, setExecutivoSelecionado] = useState<string>('todos');
  const [filtroMinCnae, setFiltroMinCnae] = useState<number>(3); // Default 3 conforme prompt, ajustável para 1 se base pequena

  // Bônus Equipe (ITEM 6 — S-DINHEIRO-B)
  const mesAtual = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [equipeBateu, setEquipeBateu] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('ictx_equipe_bateu_' + mesAtual) ?? localStorage.getItem('ictx_equipe_bateu_meta_' + mesAtual);
      return v === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ictx_equipe_bateu_' + mesAtual, String(equipeBateu));
      localStorage.setItem('ictx_equipe_bateu_meta_' + mesAtual, String(equipeBateu));
    } catch {
      // silencioso
    }
  }, [equipeBateu, mesAtual]);

  // Leads do escopo ativo (Consolidado de toda a equipe ou de um executivo específico)
  const leadsAtivos = useMemo(() => {
    if (executivoSelecionado === 'todos') {
      return leadsEquipe.flatMap((m) => m.payload.leads);
    }
    const membro = leadsEquipe.find((m) => m.email === executivoSelecionado);
    return membro ? membro.payload.leads : [];
  }, [leadsEquipe, executivoSelecionado]);

  // 1. DADOS DO FUNIL GERAL
  const dadosFunil = useMemo(() => {
    const total = leadsAtivos.length;
    const etapas: Array<{ id: LeadStatus; rotulo: string; cor: string; bgBarra: string }> = [
      { id: 'novo', rotulo: 'Novo Lead', cor: 'text-slate-700', bgBarra: 'bg-slate-500' },
      { id: 'contato_1', rotulo: 'Contato 1 (Abordagem)', cor: 'text-blue-700', bgBarra: 'bg-blue-600' },
      { id: 'contato_2', rotulo: 'Contato 2 (Follow-up)', cor: 'text-amber-700', bgBarra: 'bg-amber-500' },
      { id: 'contato_3', rotulo: 'Contato 3 (Ligação)', cor: 'text-purple-700', bgBarra: 'bg-purple-600' },
      { id: 'negociacao', rotulo: 'Em Negociação', cor: 'text-indigo-700', bgBarra: 'bg-indigo-600' },
      { id: 'fechado', rotulo: 'Fechado (Ganho)', cor: 'text-emerald-700', bgBarra: 'bg-emerald-600' },
      { id: 'descartado', rotulo: 'Descartado', cor: 'text-rose-700', bgBarra: 'bg-rose-500' },
    ];

    const topoDoFunil = total > 0 ? total : 1;

    return etapas.map((et) => {
      const qtd = leadsAtivos.filter((l) => l.status === et.id).length;
      const pct = Math.round((qtd / topoDoFunil) * 100);
      return {
        ...et,
        quantidade: qtd,
        porcentagem: pct,
      };
    });
  }, [leadsAtivos]);

  // 2. DADOS DA TAXA POR CNAE
  const dadosCnae = useMemo(() => {
    const mapa = new Map<string, { cnaeDescricao: string; cnaeCodigo: string; total: number; fechados: number }>();

    leadsAtivos.forEach((lead) => {
      const chave = lead.cnaeDescricao ? lead.cnaeDescricao.trim() : 'Outros / Não Informado';
      const cnaeCod = lead.cnaeCodigo || '-';
      const atual = mapa.get(chave) || {
        cnaeDescricao: chave,
        cnaeCodigo: cnaeCod,
        total: 0,
        fechados: 0,
      };
      atual.total += 1;
      if (lead.status === 'fechado') {
        atual.fechados += 1;
      }
      mapa.set(chave, atual);
    });

    const lista = Array.from(mapa.values());
    
    // Se nenhum CNAE tiver >= 3, usa threshold menor para sempre exibir dados
    const temCnaeCom3 = lista.some((item) => item.total >= 3);
    const minThreshold = temCnaeCom3 ? filtroMinCnae : 1;

    return lista
      .filter((item) => item.total >= minThreshold)
      .map((item) => {
        const taxa = item.total > 0 ? Math.round((item.fechados / item.total) * 100) : 0;
        return {
          ...item,
          taxaConversao: taxa,
        };
      })
      .sort((a, b) => {
        if (b.taxaConversao !== a.taxaConversao) {
          return b.taxaConversao - a.taxaConversao; // Maior % de fechados primeiro
        }
        return b.total - a.total;
      });
  }, [leadsAtivos, filtroMinCnae]);

  // 3. DADOS DA TAXA POR TEMPLATE INICIAL
  const dadosTemplates = useMemo(() => {
    // Mapa: templateId -> { total, responderam: count que chegou em contato_2+ }
    const mapa = new Map<string, { id: string; titulo: string; totalAbordados: number; responderam: number }>();

    // Inicializa com os templates padrão
    INITIAL_TEMPLATES.forEach((tpl) => {
      mapa.set(tpl.id, {
        id: tpl.id,
        titulo: tpl.titulo,
        totalAbordados: 0,
        responderam: 0,
      });
    });

    // Mapeia leads abordados
    leadsAtivos.forEach((lead) => {
      const templateId =
        lead.templateUsadoInicialmente ||
        lead.templateId ||
        (lead.historicoContatos && lead.historicoContatos[0]?.templateTitulo
          ? INITIAL_TEMPLATES.find((t) => lead.historicoContatos[0].templateTitulo?.includes(t.titulo.slice(0, 10)))?.id || 'pronampe_capital'
          : null);

      if (!templateId) return;

      const item = mapa.get(templateId) || {
        id: templateId,
        titulo: templateId,
        totalAbordados: 0,
        responderam: 0,
      };

      item.totalAbordados += 1;

      // Resposta = lead avançou além de 'novo' e 'contato_1' chegando em contato_2, contato_3, negociacao ou fechado
      const avancou = ['contato_2', 'contato_3', 'negociacao', 'fechado'].includes(lead.status);
      if (avancou) {
        item.responderam += 1;
      }

      mapa.set(templateId, item);
    });

    return Array.from(mapa.values())
      .filter((t) => t.totalAbordados > 0)
      .map((t) => {
        const taxaResposta = Math.round((t.responderam / t.totalAbordados) * 100);
        return {
          ...t,
          taxaResposta,
        };
      })
      .sort((a, b) => b.taxaResposta - a.taxaResposta);
  }, [leadsAtivos]);

  // 4. RANKING DE EXECUTIVOS
  const rankingExecutivos = useMemo(() => {
    return leadsEquipe.map((membro) => {
      const leadsMembro = membro.payload.leads;
      const totalLeads = leadsMembro.length;
      const fechados = leadsMembro.filter((l) => l.status === 'fechado').length;
      const taxaFechamento = totalLeads > 0 ? Math.round((fechados / totalLeads) * 100) : 0;

      const mesAtual = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      const pontosDoMes = pontosMes(leadsMembro, mesAtual);
      const pontosReais = pontosDoMes.total;

      return {
        nome: membro.nome,
        email: membro.email,
        role: membro.role || 'executivo',
        totalLeads,
        fechados,
        taxaFechamento,
        pontosReais,
        pontosConta: pontosDoMes.conta,
        pontosGetnet: pontosDoMes.getnet,
        pontosFit: pontosDoMes.fit,
        pontosM01: pontosDoMes.m01Total,
        semDataAbertura: leadsMembro.filter(l => !l.dataAbertura && l.status === 'fechado').length,
      };
    }).sort((a, b) => b.pontosReais - a.pontosReais);
  }, [leadsEquipe]);

  // 5. DADOS DO MAPA DE CALOR GEOGRÁFICO (Fechados por Região / Prospecção Local)
  const [modoGeo, setModoGeo] = useState<'bairro' | 'municipio'>('bairro');
  const [focoStatusGeo, setFocoStatusGeo] = useState<'fechados' | 'todos'>('fechados');

  const dadosMapaCalor = useMemo(() => {
    // Total de fechados no escopo ativo
    const totalFechadosAtivos = leadsAtivos.filter((l) => l.status === 'fechado').length;

    const mapa = new Map<
      string,
      {
        regiao: string;
        municipio: string;
        uf: string;
        fechados: number;
        totalLeads: number;
        empresasFechadas: string[];
      }
    >();

    leadsAtivos.forEach((lead) => {
      let chave = '';
      if (modoGeo === 'bairro') {
        chave = lead.bairro ? lead.bairro.trim() : (lead.municipio ? `${lead.municipio} (Geral)` : 'Não informado');
      } else {
        chave = lead.municipio ? lead.municipio.trim() : 'Salvador';
      }

      const atual = mapa.get(chave) || {
        regiao: chave,
        municipio: lead.municipio || 'Salvador',
        uf: lead.uf || 'BA',
        fechados: 0,
        totalLeads: 0,
        empresasFechadas: [],
      };

      atual.totalLeads += 1;
      if (lead.status === 'fechado') {
        atual.fechados += 1;
        if (!atual.empresasFechadas.includes(lead.empresaExibicao)) {
          atual.empresasFechadas.push(lead.empresaExibicao);
        }
      }

      mapa.set(chave, atual);
    });

    const lista = Array.from(mapa.values());
    const baseDenominador = focoStatusGeo === 'fechados' ? (totalFechadosAtivos || 1) : (leadsAtivos.length || 1);

    return lista
      .map((item) => {
        const valorFoco = focoStatusGeo === 'fechados' ? item.fechados : item.totalLeads;
        const pctFoco = Math.round((valorFoco / baseDenominador) * 100);
        const taxaConversaoRegiao = item.totalLeads > 0 ? Math.round((item.fechados / item.totalLeads) * 100) : 0;

        // Classificação do nível de calor térmico
        let nivelCalor: 'quente' | 'morna' | 'fria' | 'emergente' = 'emergente';
        if (pctFoco >= 25 || item.fechados >= 2) {
          nivelCalor = 'quente'; // 🔥 Alta concentração
        } else if (pctFoco >= 10 || item.fechados === 1) {
          nivelCalor = 'morna'; // 🟧 Média concentração
        } else if (item.totalLeads >= 2) {
          nivelCalor = 'fria'; // 🟨 Em prospecção ativa
        }

        return {
          ...item,
          pctFoco,
          taxaConversaoRegiao,
          nivelCalor,
        };
      })
      .sort((a, b) => {
        if (focoStatusGeo === 'fechados') {
          if (b.fechados !== a.fechados) return b.fechados - a.fechados;
          return b.totalLeads - a.totalLeads;
        }
        return b.totalLeads - a.totalLeads;
      });
  }, [leadsAtivos, modoGeo, focoStatusGeo]);

  const pontosEscopo = useMemo(() => pontosMes(leadsAtivos, mesAtual), [leadsAtivos, mesAtual]);
  const taxaFechamentoEscopo = leadsAtivos.length > 0
    ? Math.round((leadsAtivos.filter((l) => l.status === 'fechado').length / leadsAtivos.length) * 100)
    : 0;

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          Métricas de equipe no computador
        </h2>
        <p className="text-sm text-slate-600 max-w-sm mb-6">
          Este painel foi otimizado para telas grandes. Abra no computador para visualizar o funil, ranking e mapa de calor com clareza.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </div>
    );
  }

  const totalGeralLeads = leadsEquipe.reduce((acc, m) => acc + m.payload.leads.length, 0);
  const totalGeralFechados = leadsEquipe.reduce(
    (acc, m) => acc + m.payload.leads.filter((l) => l.status === 'fechado').length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-150">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-xs text-white shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">
              Painel do Supervisor
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 uppercase tracking-wider shrink-0">
              Single-user
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500 hidden sm:block shrink-0" />
            <select
              value={executivoSelecionado}
              onChange={(e) => setExecutivoSelecionado(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 shadow-2xs"
            >
              <option value="todos">
                👥 Equipe Completa ({totalGeralLeads} leads · {totalGeralFechados} fechados)
              </option>
              {leadsEquipe.map((m) => (
                <option key={m.email} value={m.email}>
                  👤 {m.nome} ({m.payload.leads.length} leads ·{' '}
                  {m.payload.leads.filter((l) => l.status === 'fechado').length} fechados)
                </option>
              ))}
            </select>
          </div>

          {onAlternarRole && (
            <button
              type="button"
              onClick={() =>
                onAlternarRole(usuarioAtivo.role === 'supervisor' ? 'executivo' : 'supervisor')
              }
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer hidden md:inline-flex items-center"
              title="Alternar perfil"
            >
              {usuarioAtivo.role === 'supervisor' ? 'Supervisor' : 'Executivo'}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main scrollable view */}
      <main className="flex-1 overflow-y-auto bg-slate-100 p-4 lg:p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Banners */}
          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Modo single-user ativo.</strong> Este painel mostra apenas a sua produção. Ranking multi-usuário (com executivos de equipe reais) será liberado na FASE B (login + roles).
              </div>
            </div>

            {rankingExecutivos.some((r) => r.semDataAbertura > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
                ⚠️ {rankingExecutivos.reduce((acc, r) => acc + r.semDataAbertura, 0)}{' '}
                lead(s) fechado(s) sem data de abertura registrada — não pontuam até serem ativados no Dossiê (R3).
              </div>
            )}
          </div>

          {/* Hero KPIs (5 cards) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total de Pontos
              </span>
              <span className="text-[32px] leading-tight font-extrabold text-emerald-600 tabular-nums block">
                {pontosEscopo.total.toLocaleString('pt-BR')} <span className="text-sm font-bold text-emerald-700">pts</span>
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Ciclo M0/M1/M2 acumulado</span>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Pontos Conta PJ
              </span>
              <span className="text-[32px] leading-tight font-extrabold text-blue-600 tabular-nums block">
                {pontosEscopo.conta.toLocaleString('pt-BR')} <span className="text-sm font-bold text-blue-700">pts</span>
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Ativação com 3 PIX</span>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Pontos Getnet
              </span>
              <span className="text-[32px] leading-tight font-extrabold text-purple-600 tabular-nums block">
                {pontosEscopo.getnet.toLocaleString('pt-BR')} <span className="text-sm font-bold text-purple-700">pts</span>
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Maquininhas ativas</span>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Taxa de Fechamento
              </span>
              <span className="text-[32px] leading-tight font-extrabold text-slate-900 tabular-nums block">
                {taxaFechamentoEscopo}%
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {leadsAtivos.filter((l) => l.status === 'fechado').length} de {leadsAtivos.length} leads
              </span>
            </div>

            {/* 5º Card: Bônus Equipe (ITEM 6) */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Equipe bateu meta?
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="equipe-bateu-meta"
                    checked={equipeBateu}
                    onChange={(e) => setEquipeBateu(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer accent-emerald-600"
                  />
                  <label htmlFor="equipe-bateu-meta" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Sim
                  </label>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Ativa bônus de equipe (M0/M1)
              </p>
            </div>
          </div>
          
          {/* ======================================================== */}
          {/* BLOCO 1: FUNIL GERAL (BARRAS HORIZONTAIS SIMPLES EM CSS) */}
          {/* ======================================================== */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Funil de Vendas Geral
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Volume e percentual de conversão em relação ao topo do funil ({leadsAtivos.length} leads)
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {leadsAtivos.length > 0
                  ? `${Math.round(
                      (leadsAtivos.filter((l) => l.status === 'fechado').length / leadsAtivos.length) * 100
                    )}% Conversão Final`
                  : '0% Conversão'}
              </span>
            </div>

            {/* Barras Horizontais do Funil em CSS */}
            <div className="space-y-2.5 pt-1">
              {dadosFunil.map((etapa) => (
                <div key={etapa.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>{etapa.rotulo}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 tabular-nums">
                        {etapa.quantidade} leads
                      </strong>
                      <span className="text-[11px] font-bold text-slate-500 w-12 text-right tabular-nums">
                        {etapa.porcentagem}%
                      </span>
                    </div>
                  </div>

                  {/* Barra horizontal em CSS puro */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${etapa.bgBarra}`}
                      style={{ width: `${Math.max(etapa.porcentagem > 0 ? 3 : 0, etapa.porcentagem)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid dos Blocos 2 e 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* ======================================================== */}
            {/* BLOCO 2: TAXA POR CNAE (ORDENADO DESC COM FILTRO ≥3)     */}
            {/* ======================================================== */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Taxa de Conversão por CNAE
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Segmentos mais rentáveis (% fechados / total de leads)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFiltroMinCnae(filtroMinCnae === 3 ? 1 : 3)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                  title="Alternar filtro de amostragem mínima"
                >
                  {filtroMinCnae === 3 ? 'Exibindo ≥3 leads' : 'Exibindo todos (≥1 lead)'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-72 pr-1">
                {dadosCnae.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    Nenhum CNAE atende ao critério de {filtroMinCnae} ou mais leads no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {dadosCnae.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.cnaeDescricao}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              CNAE: {item.cnaeCodigo} · {item.total} {item.total === 1 ? 'lead' : 'leads'} analisados
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs font-black px-2 py-0.5 rounded-md ${
                                item.taxaConversao >= 40
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.taxaConversao > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {item.taxaConversao}% fechados
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {item.fechados} de {item.total}
                            </p>
                          </div>
                        </div>

                        {/* Barra de Progresso do CNAE */}
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.max(item.taxaConversao > 0 ? 5 : 0, item.taxaConversao)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* BLOCO 3: TAXA POR TEMPLATE INICIAL (MAIOR TAXA RESPOSTA) */}
            {/* ======================================================== */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Taxa por Template Inicial
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Qual copy gera mais resposta (leads que avançaram para Contato 2+)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-72 pr-1">
                {dadosTemplates.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    Nenhum disparo com template rastreado ainda. Dispare mensagens no Kanban para gerar dados.
                  </div>
                ) : (
                  dadosTemplates.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {item.titulo}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {item.totalAbordados} abordagens · {item.responderam} engajaram (Contato 2+)
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-md ${
                              item.taxaResposta >= 50
                                ? 'bg-emerald-100 text-emerald-800 font-bold'
                                : item.taxaResposta >= 25
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {item.taxaResposta}% resposta
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso do Template */}
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.max(item.taxaResposta > 0 ? 5 : 0, item.taxaResposta)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* BLOCO 4: RANKING DE EXECUTIVOS (TABELA COM PONTOS REAIS) */}
          {/* ======================================================== */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Ranking de Executivos da Equipe
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Classificação por produção comercial e Pontos Reais acumulados
                  </p>
                </div>
              </div>
            </div>

            {/* Tabela do Ranking de Executivos */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Posição / Executivo</th>
                    <th className="py-3 px-3">E-mail</th>
                    <th className="py-3 px-3 text-center">Leads</th>
                    <th className="py-3 px-3 text-center">Fechados</th>
                    <th className="py-3 px-3 text-center">Conta</th>
                    <th className="py-3 px-3 text-center">Getnet</th>
                    <th className="py-3 px-3 text-center">Taxa</th>
                    <th className="py-3 px-3 text-right">Total pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankingExecutivos.map((exec, index) => {
                    const medalha = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                    return (
                      <tr
                        key={exec.email}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          executivoSelecionado === exec.email ? 'bg-amber-50/50 font-medium' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                medalha ? 'text-base' : 'bg-slate-100 text-slate-600 text-[10px] font-black'
                              }`}
                            >
                              {medalha || index + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {exec.nome}
                              </span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {exec.role}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {exec.email}
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-800 tabular-nums">
                          {exec.totalLeads}
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-emerald-700 tabular-nums">
                          {exec.fechados}
                        </td>

                        <td className="py-3 px-3 text-center font-semibold text-blue-700 tabular-nums">
                          {exec.pontosConta} pts
                        </td>

                        <td className="py-3 px-3 text-center font-semibold text-amber-700 tabular-nums">
                          {exec.pontosGetnet} pts
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                            {exec.taxaFechamento}%
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-black text-slate-900 tabular-nums text-sm">
                          <div>{exec.pontosReais.toLocaleString('pt-BR')} pts</div>
                          {equipeBateu && (
                            <span className="text-[10px] text-emerald-600 font-bold block">
                              + bônus equipe
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Dica da pontuação */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>* Pontos Reais calculados via motor oficial Santander (ciclo M0/M1/M2).</span>
              <button
                type="button"
                onClick={() => setExecutivoSelecionado('todos')}
                className="text-red-700 hover:underline font-semibold cursor-pointer"
              >
                Resetar filtro para Consolidado
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BLOCO 5: MAPA DE CALOR GEOGRÁFICO (CONCENTRAÇÃO DE FECHADOS) */}
          {/* ======================================================== */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            
            {/* Cabeçalho do Bloco 5 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                  <Flame className="w-4 h-4 text-orange-600 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Mapa de Calor Geográfico · Concentração de Fechados
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold border border-orange-200">
                      Prospecção Local
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Destaque territorial onde estão concentrados os clientes ganhos para orientar rotas e indicações
                  </p>
                </div>
              </div>

              {/* Controles de Granularidade e Status */}
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setModoGeo('bairro')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      modoGeo === 'bairro'
                        ? 'bg-white text-orange-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📍 Por Bairro
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoGeo('municipio')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      modoGeo === 'municipio'
                        ? 'bg-white text-orange-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏙️ Por Município
                  </button>
                </div>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setFocoStatusGeo('fechados')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      focoStatusGeo === 'fechados'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏆 Fechados
                  </button>
                  <button
                    type="button"
                    onClick={() => setFocoStatusGeo('todos')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      focoStatusGeo === 'todos'
                        ? 'bg-slate-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📊 Todos Leads
                  </button>
                </div>
              </div>
            </div>

            {/* Insight Tático de Prospecção Territorial */}
            {dadosMapaCalor.length > 0 && dadosMapaCalor[0].fechados > 0 && (
              <div className="p-3.5 bg-gradient-to-r from-orange-50 via-amber-50 to-red-50 border border-orange-200 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-orange-950">
                    💡 Insight Tático para Prospecção Local
                  </h4>
                  <p className="text-xs text-orange-900 leading-relaxed">
                    A região <strong>{dadosMapaCalor[0].regiao}</strong> ({dadosMapaCalor[0].municipio}) concentra{' '}
                    <strong>{dadosMapaCalor[0].pctFoco}%</strong> de todos os fechamentos da base (
                    {dadosMapaCalor[0].fechados} cliente{dadosMapaCalor[0].fechados > 1 ? 's' : ''} ganho{dadosMapaCalor[0].fechados > 1 ? 's' : ''}).{' '}
                    <span className="font-semibold">Ação recomendada:</span> agende rotas de visita presenciais concentradas nesse raio e ative campanhas de indicação (MGM) com os sócios já conveniados para dominar o quarteirão comercial.
                  </p>
                </div>
              </div>
            )}

            {/* Grid com Canvas Visual de Calor e Lista de Regiões */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
              
              {/* Painel Gráfico / Mapa Visual Térmico */}
              <div className="lg:col-span-5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white rounded-xl p-4 flex flex-col justify-between border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                    <Compass className="w-4 h-4" />
                    <span>Cartografia Comercial · Salvador & Região</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {dadosMapaCalor.reduce((acc, r) => acc + r.fechados, 0)} Fechamentos
                  </span>
                </div>

                {/* SVG Interativo com Hotspots Térmicos */}
                <div className="py-4 flex items-center justify-center relative h-72">
                  <svg viewBox="0 0 400 240" className="w-full h-full max-h-72 filter drop-shadow-md">
                    {/* Linhas cartográficas do litoral e eixos viários */}
                    <path
                      d="M 20 40 Q 90 60 160 90 T 260 140 T 360 190"
                      fill="none"
                      stroke="#334155"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <path
                      d="M 60 20 Q 140 80 200 130 T 310 210"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="2"
                    />
                    <path
                      d="M 280 40 Q 290 100 270 170 T 230 230"
                      fill="none"
                      stroke="#334155"
                      strokeWidth="1.5"
                    />

                    {/* Zonas de Calor (Hotspots) calculados dinamicamente */}
                    {dadosMapaCalor.slice(0, 5).map((reg, idx) => {
                      const posicoes = [
                        { cx: 280, cy: 150 }, // Pituba / Orla Norte
                        { cx: 160, cy: 190 }, // Barra / Ondina / Orla Sul
                        { cx: 240, cy: 110 }, // Caminho das Árvores / Centro Financeiro
                        { cx: 330, cy: 60 },  // Vilas do Atlântico / Lauro
                        { cx: 90, cy: 70 },   // Camaçari / Polo
                      ];
                      const pos = posicoes[idx % posicoes.length];
                      const isQuente = reg.nivelCalor === 'quente';
                      const isMorna = reg.nivelCalor === 'morna';

                      const corRaio = isQuente
                        ? '#ef4444'
                        : isMorna
                        ? '#f97316'
                        : '#3b82f6';

                      return (
                        <g key={reg.regiao} className="cursor-pointer group">
                          {/* Aura de pulso de calor */}
                          <circle
                            cx={pos.cx}
                            cy={pos.cy}
                            r={isQuente ? 36 : isMorna ? 26 : 18}
                            fill={corRaio}
                            opacity={isQuente ? 0.25 : 0.18}
                            className={isQuente ? 'animate-pulse' : ''}
                          />
                          <circle
                            cx={pos.cx}
                            cy={pos.cy}
                            r={isQuente ? 20 : isMorna ? 15 : 10}
                            fill={corRaio}
                            opacity={0.4}
                          />
                          {/* Núcleo do ponto */}
                          <circle
                            cx={pos.cx}
                            cy={pos.cy}
                            r={isQuente ? 8 : isMorna ? 6 : 4}
                            fill={corRaio}
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                          {/* Rótulo da Região */}
                          <text
                            x={pos.cx}
                            y={pos.cy + (isQuente ? 22 : 18)}
                            textAnchor="middle"
                            fill="#f8fafc"
                            fontSize="10"
                            fontWeight="bold"
                            className="pointer-events-none drop-shadow"
                          >
                            {reg.regiao} ({reg.fechados}★)
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legenda do Mapa de Calor */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-300 font-semibold">Alta (≥25%)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-orange-300 font-semibold">Média (10-24%)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-blue-300 font-semibold">Prospecção</span>
                  </span>
                </div>
              </div>

              {/* Lista Detalhada de Densidade Térmica das Regiões */}
              <div className="lg:col-span-7 space-y-2.5">
                {dadosMapaCalor.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">Nenhum dado geográfico localizado</p>
                    <p className="text-[11px] text-slate-400">
                      Adicione endereços ou bairros aos leads para ver a distribuição territorial.
                    </p>
                  </div>
                ) : (
                  dadosMapaCalor.map((reg, index) => {
                    const isTop1 = index === 0 && reg.fechados > 0;
                    return (
                      <div
                        key={reg.regiao}
                        className={`p-3.5 rounded-xl border transition-all ${
                          reg.nivelCalor === 'quente'
                            ? 'bg-gradient-to-r from-red-50/70 via-orange-50/50 to-white border-red-200 shadow-2xs'
                            : reg.nivelCalor === 'morna'
                            ? 'bg-gradient-to-r from-amber-50/60 to-white border-amber-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                                  isTop1
                                    ? 'bg-red-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {index + 1}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {reg.regiao}
                              </h4>
                              <span className="text-[10px] text-slate-500">
                                · {reg.municipio}/{reg.uf}
                              </span>
                            </div>

                            {/* Empresas Fechadas na Região */}
                            {reg.empresasFechadas.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                                <span className="text-[10px] font-semibold text-slate-400">
                                  Clientes ganhos:
                                </span>
                                {reg.empresasFechadas.map((emp) => (
                                  <span
                                    key={emp}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 truncate max-w-[200px]"
                                  >
                                    ✓ {emp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Badge de Calor Térmico */}
                          <div className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5">
                              {reg.nivelCalor === 'quente' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200 uppercase tracking-wide">
                                  <Flame className="w-3 h-3 text-red-600" />
                                  Zona Quente · {reg.pctFoco}%
                                </span>
                              )}
                              {reg.nivelCalor === 'morna' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Aquecida · {reg.pctFoco}%
                                </span>
                              )}
                              {reg.nivelCalor === 'fria' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  Em Prospecção
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 block mt-0.5">
                              {reg.fechados} fechado{reg.fechados > 1 ? 's' : ''} / {reg.totalLeads} total ({reg.taxaConversaoRegiao}%)
                            </span>
                          </div>
                        </div>

                        {/* Barra de Intensidade Térmica */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              reg.nivelCalor === 'quente'
                                ? 'bg-gradient-to-r from-amber-500 to-red-600'
                                : reg.nivelCalor === 'morna'
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                                : 'bg-slate-400'
                            }`}
                            style={{
                              width: `${Math.max(reg.pctFoco > 0 ? 8 : 2, reg.pctFoco)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 z-20 h-12 bg-white border-t border-slate-200 px-4 lg:px-6 flex items-center justify-between shrink-0 shadow-xs">
        <p className="text-xs text-slate-500">
          Painel do Supervisor · Métricas baseadas em registros auditáveis do CRM
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </footer>
    </div>
  );
};
