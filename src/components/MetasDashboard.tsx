import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Target,
  TrendingUp,
  CheckCircle2,
  Share2,
  Sparkles,
  Award,
  CreditCard,
  Users,
  RotateCcw,
} from 'lucide-react';
import { Lead } from '../types/crm';
import { pontosMes } from '../utils/pontos';

export interface FaixaBonus {
  pts: number;
  valor: number;
}

// Faixas de Bônus por Pontos Totais
export const FAIXAS_PONTOS_TOTAIS: FaixaBonus[] = [
  { pts: 40, valor: 1000 },
  { pts: 60, valor: 2000 },
  { pts: 80, valor: 3000 },
  { pts: 100, valor: 4000 },
];

// Faixas de Bônus GetNet (maquininhas ativas)
export const FAIXAS_GETNET: FaixaBonus[] = [
  { pts: 25, valor: 1000 },
  { pts: 40, valor: 2000 },
  { pts: 55, valor: 3000 },
  { pts: 85, valor: 5000 },
];

// Faixas de Bônus de Equipe
export const FAIXAS_EQUIPE: FaixaBonus[] = [
  { pts: 50, valor: 1500 },
  { pts: 60, valor: 2500 },
  { pts: 80, valor: 4000 },
  { pts: 100, valor: 5000 },
];

// Lógica de Bônus por Pontos Totais (faixas de 40, 60, 80, 100 pts)
export const getBonusTotais = (pts: number): number => {
  if (pts >= 100) return 4000;
  if (pts >= 80) return 3000;
  if (pts >= 60) return 2000;
  if (pts >= 40) return 1000;
  return 0;
};

// Lógica de Bônus GetNet (faixas de 25, 40, 55, 85 pts)
export const getBonusGetnet = (pts: number): number => {
  if (pts >= 85) return 5000;
  if (pts >= 55) return 3000;
  if (pts >= 40) return 2000;
  if (pts >= 25) return 1000;
  return 0;
};

// Lógica de Bônus de Equipe (Gatilho da Equipe)
export const getBonusEquipe = (pts: number, equipeBateu: boolean): number => {
  if (!equipeBateu) return 0;
  if (pts >= 100) return 5000;
  if (pts >= 80) return 4000;
  if (pts >= 60) return 2500;
  if (pts >= 50) return 1500;
  return 0;
};

interface MetasDashboardProps {
  isOpen?: boolean;
  onClose: () => void;
  leads?: Lead[];
}

export const MetasDashboard: React.FC<MetasDashboardProps> = ({
  isOpen = true,
  onClose,
  leads = [],
}) => {
  const mesAtual = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // 1. Pontos Reais do Mês Atual (auditados do CRM)
  const pontosReais = useMemo(() => {
    return pontosMes(leads, mesAtual);
  }, [leads, mesAtual]);

  // 2. Estados da Simulação
  // Slider Principal: Pontos Totais (0 a 130, step 10)
  const [simulacaoPts, setSimulacaoPts] = useState<number>(() => {
    return Math.min(130, Math.max(0, pontosReais.total));
  });

  // Slider Secundário: Pontos GetNet (inicia com os pontos reais de GetNet)
  const [simulacaoGetnetPts, setSimulacaoGetnetPts] = useState<number>(() => {
    return Math.min(85, Math.max(0, pontosReais.getnet));
  });

  const [equipeBateuMeta, setEquipeBateuMeta] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sincroniza estados iniciais com os pontos reais quando os leads mudarem
  useEffect(() => {
    setSimulacaoPts(Math.min(130, Math.max(0, pontosReais.total)));
    setSimulacaoGetnetPts(Math.min(85, Math.max(0, pontosReais.getnet)));
  }, [pontosReais.total, pontosReais.getnet]);

  // Fechar via tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 3. Cálculos da Simulação (R7.1):
  // - Valor Base: simulacaoPts * 30
  // - Bônus por Pontos Totais: calculado estritamente usando o estado do slider principal (simulacaoPts)
  // - Bônus GetNet: calculado com base no slider/input de GetNet
  // - Bônus Equipe: calculado usando simulacaoPts se equipe atingiu meta
  const simBase = simulacaoPts * 30;
  const simBonusTotais = getBonusTotais(simulacaoPts);
  const simBonusGetnet = getBonusGetnet(simulacaoGetnetPts);
  const simBonusEquipe = getBonusEquipe(simulacaoPts, equipeBateuMeta);
  const simTotal = simBase + simBonusTotais + simBonusGetnet + simBonusEquipe;

  // 4. Cálculos dos Pontos Reais (Garantido até agora)
  const realBase = pontosReais.total * 30;
  const realBonusTotais = getBonusTotais(pontosReais.total);
  const realBonusGetnet = getBonusGetnet(pontosReais.getnet);
  const realBonusEquipe = getBonusEquipe(pontosReais.total, equipeBateuMeta);
  const realTotal = realBase + realBonusTotais + realBonusGetnet + realBonusEquipe;

  // 5. Próximas Faixas (Status Real)
  const proximaFaixaTotais = FAIXAS_PONTOS_TOTAIS.find((f) => f.pts > pontosReais.total);
  const proximaFaixaGetnet = FAIXAS_GETNET.find((f) => f.pts > pontosReais.getnet);

  // 6. Handler para Compartilhar Resumo no WhatsApp
  const handleCompartilharWhatsApp = () => {
    const faltamTotaisTexto = proximaFaixaTotais
      ? `Faltam ${proximaFaixaTotais.pts - pontosReais.total} pts para R$ ${proximaFaixaTotais.valor.toLocaleString('pt-BR')}`
      : 'Faixa máxima atingida!';
    const faltamGetnetTexto = proximaFaixaGetnet
      ? `Faltam ${proximaFaixaGetnet.pts - pontosReais.getnet} pts para R$ ${proximaFaixaGetnet.valor.toLocaleString('pt-BR')}`
      : 'Faixa máxima atingida!';

    const texto = [
      `📊 *Minhas Metas Santander — iCtx CRM*`,
      `📅 Mês: ${mesAtual}`,
      `🎯 *Fechando o mês com ${pontosReais.total} pts totais* (${pontosReais.getnet} pts GetNet)`,
      `💰 *Garantido até agora:* R$ ${realTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `   • Base (R$ 30/pt): R$ ${realBase.toLocaleString('pt-BR')}`,
      `   • Bônus por Pontos Totais: R$ ${realBonusTotais.toLocaleString('pt-BR')}`,
      `   • Bônus GetNet: R$ ${realBonusGetnet.toLocaleString('pt-BR')}`,
      equipeBateuMeta ? `   • Bônus Equipe: R$ ${realBonusEquipe.toLocaleString('pt-BR')}` : null,
      ``,
      `🎯 *Próximas Faixas:*`,
      `   • Bônus Totais: ${faltamTotaisTexto}`,
      `   • GetNet: ${faltamGetnetTexto}`,
    ]
      .filter((l) => l !== null)
      .join('\n');

    navigator.clipboard.writeText(texto).then(
      () => {
        setToastMsg('Resumo copiado para o WhatsApp!');
        setTimeout(() => setToastMsg(null), 3000);
      },
      () => {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = texto;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setToastMsg('Resumo copiado para o WhatsApp!');
          setTimeout(() => setToastMsg(null), 3000);
        } catch {
          setToastMsg('Erro ao copiar resumo');
          setTimeout(() => setToastMsg(null), 3000);
        }
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 md:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full h-full md:h-auto md:max-h-[92vh] md:max-w-4xl md:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-150">
        
        {/* Toast Notificação */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Header */}
        <header className="px-5 py-3.5 sm:py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Minhas Metas
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Simulador de Projeção
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Simule seu ganho financeiro total deste mês com bônus por pontos totais, GetNet e equipe
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Corpo Scrollável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">

          {/* ======================================================== */}
          {/* BLOCO 1: POTENCIAL NESTE MÊS                             */}
          {/* ======================================================== */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 sm:p-6 shadow-md relative overflow-hidden border border-slate-800">
            {/* Decoração de fundo */}
            <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  💰 POTENCIAL NESTE MÊS
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                  {simulacaoPts} pts totais simulados
                </span>
              </div>

              {/* Dinheiro Total Gigante */}
              <div>
                <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight tabular-nums block">
                  R$ {simTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Subtítulo: Breakdown da soma */}
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                R$ {simBase.toLocaleString('pt-BR')} base + R$ {simBonusTotais.toLocaleString('pt-BR')} bônus totais + R$ {simBonusGetnet.toLocaleString('pt-BR')} getnet + R$ {simBonusEquipe.toLocaleString('pt-BR')} equipe
              </p>

              {/* Checkbox visual em destaque */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={equipeBateuMeta}
                    onChange={(e) => setEquipeBateuMeta(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-emerald-500 shrink-0"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      Equipe atingiu a meta
                    </span>
                    <span className="text-slate-300 text-[11px]">
                      Destrava bônus extra de até R$ 5.000 (1.5k com 50pts, 2.5k com 60pts, 4k com 80pts, 5k com 100pts)
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BLOCO 2: SIMULADOR DE PONTOS                             */}
          {/* ======================================================== */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  📈
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    SIMULADOR DE PONTOS
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Arraste os sliders para projetar seus ganhos totais em tempo real
                  </p>
                </div>
              </div>

              {/* Indicador Numérico em Destaque */}
              <div className="text-right">
                <span className="text-lg font-black text-slate-900 tabular-nums">
                  {simulacaoPts} <span className="text-xs font-bold text-slate-500">pts totais</span>
                </span>
                <span className="text-xs font-bold text-emerald-600 block tabular-nums">
                  = R$ {simTotal.toLocaleString('pt-BR')} total
                </span>
              </div>
            </div>

            {/* Slider 1: Pontos Totais (Principal: 0 a 130 com step 10) */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Pontos Totais (determina Base e Bônus Totais)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-emerald-700 tabular-nums text-sm">
                    {simulacaoPts} pts
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    (R$ {simBase.toLocaleString('pt-BR')} base + R$ {simBonusTotais.toLocaleString('pt-BR')} bônus)
                  </span>
                </div>
              </div>

              <div className="relative pt-1">
                <input
                  type="range"
                  min="0"
                  max="130"
                  step="10"
                  value={simulacaoPts}
                  onChange={(e) => setSimulacaoPts(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  aria-label="Simulador de Pontos Totais"
                />
              </div>

              {/* Marcadores de Step */}
              <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                <span>0</span>
                <span>20</span>
                <span>40 (R$ 1k)</span>
                <span>60 (R$ 2k)</span>
                <span>80 (R$ 3k)</span>
                <span>100 (R$ 4k)</span>
                <span>130</span>
              </div>
            </div>

            {/* Slider 2: Pontos GetNet (Secundário: 0 a 85 com step 5) */}
            <div className="space-y-2 p-3.5 rounded-xl bg-purple-50/40 border border-purple-100">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-purple-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>Pontos GetNet (Maquininhas)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-purple-700 tabular-nums text-sm">
                    {simulacaoGetnetPts} pts
                  </span>
                  <span className="text-[11px] font-semibold text-purple-800">
                    (Bônus: R$ {simBonusGetnet.toLocaleString('pt-BR')})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSimulacaoGetnetPts(Math.min(85, Math.max(0, pontosReais.getnet)))}
                    className="p-1 rounded hover:bg-purple-100 text-purple-600 transition-colors cursor-pointer"
                    title={`Redefinir para o ritmo real (${pontosReais.getnet} pts)`}
                    aria-label="Redefinir GetNet"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="relative pt-1">
                <input
                  type="range"
                  min="0"
                  max="85"
                  step="5"
                  value={simulacaoGetnetPts}
                  onChange={(e) => setSimulacaoGetnetPts(Number(e.target.value))}
                  className="w-full h-2.5 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  aria-label="Simulador de Pontos GetNet"
                />
              </div>

              <div className="flex justify-between text-[10px] font-bold text-purple-400 px-1">
                <span>0</span>
                <span>25 (R$ 1k)</span>
                <span>40 (R$ 2k)</span>
                <span>55 (R$ 3k)</span>
                <span>85 (R$ 5k)</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BLOCO 3: FAIXAS (BÔNUS POR PONTOS TOTAIS) & GETNET       */}
          {/* ======================================================== */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  🎯
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    🎯 FAIXAS (BÔNUS POR PONTOS TOTAIS)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Seus números auditados do mês atual — sem a simulação
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-700">
                  Total Real: <strong className="text-emerald-700 font-extrabold">{pontosReais.total} pts</strong>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  R$ {realTotal.toLocaleString('pt-BR')} garantidos
                </span>
              </div>
            </div>

            {/* Grid 2 colunas: Bônus por Pontos Totais & GetNet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Coluna 1: BÔNUS POR PONTOS TOTAIS */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Bônus por Pontos Totais</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {pontosReais.total} pts atuais
                  </span>
                </div>

                <div className="space-y-2">
                  {FAIXAS_PONTOS_TOTAIS.map((f) => {
                    const atingido = pontosReais.total >= f.pts;
                    const faltam = f.pts - pontosReais.total;
                    return (
                      <div
                        key={f.pts}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                          atingido
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {atingido ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-slate-300 text-sm">⚪</span>
                          )}
                          <span>
                            Faixa <strong>{f.pts} pts</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 tabular-nums">
                            R$ {f.valor.toLocaleString('pt-BR')}
                          </span>
                          {!atingido && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              faltam {faltam} pts
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coluna 2: BÔNUS GETNET */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span>Bônus GetNet</span>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {pontosReais.getnet} pts atuais
                  </span>
                </div>

                <div className="space-y-2">
                  {FAIXAS_GETNET.map((f) => {
                    const atingido = pontosReais.getnet >= f.pts;
                    const faltam = f.pts - pontosReais.getnet;
                    return (
                      <div
                        key={f.pts}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                          atingido
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {atingido ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-slate-300 text-sm">⚪</span>
                          )}
                          <span>
                            Faixa <strong>{f.pts} pts</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 tabular-nums">
                            R$ {f.valor.toLocaleString('pt-BR')}
                          </span>
                          {!atingido && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              faltam {faltam} pts
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Faixas de Bônus de Equipe */}
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-indigo-900">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Bônus de Equipe Escalonado (Gatilho da Equipe)
                </span>
                <span className="text-[11px] text-indigo-700">
                  {equipeBateuMeta ? '✓ Meta de equipe ativada' : 'Aguardando confirmação de meta'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {FAIXAS_EQUIPE.map((f) => {
                  const atingido = pontosReais.total >= f.pts && equipeBateuMeta;
                  return (
                    <div
                      key={f.pts}
                      className={`p-2 rounded-lg border text-center ${
                        atingido
                          ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-white border-indigo-100 text-slate-600'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-slate-500">
                        {f.pts} pts
                      </div>
                      <div className="font-extrabold text-slate-900 text-xs">
                        R$ {f.valor.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Rodapé Fixo */}
        <footer className="px-5 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Valores baseados na campanha oficial Santander PJ (R$ 30 por ponto + faixas de bônus).
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Botão Compartilhar Resumo (WhatsApp) */}
            <button
              type="button"
              onClick={handleCompartilharWhatsApp}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Copiar resumo do status real para enviar no WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartilhar Resumo (WhatsApp)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
