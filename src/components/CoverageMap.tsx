import React, { useState } from 'react';
import {
  MapPin,
  Layers,
  X,
  CheckSquare,
  Square,
  Package,
} from 'lucide-react';

export type BairroStatus = 'nao_minerado' | 'processando' | 'minerado';

export interface BairroItem {
  id: string;
  nome: string;
  municipio?: string;
  status: BairroStatus;
  leadsCount: number;
}

interface CoverageMapProps {
  bairros: string[] | { id: string; nome: string; municipio?: string }[];
  breakdown?: Record<string, number>;
  bairrosPendentes?: string[] | Set<string>;
  municipio?: string;
  selecionadosIds?: Set<string>;
  onToggleSelectBairro?: (bairroId: string) => void;
  onSelectAll?: (selecionar: boolean) => void;
  onSelectOnlyNaoMinerados?: () => void;
  disabled?: boolean;
}

/**
 * Função utilitária para buscar a quantidade de leads no breakdown de forma resiliente
 * (ignora diferenças de maiúsculas/minúsculas e acentos)
 */
function getCountFromBreakdown(breakdown: Record<string, number> = {}, bairroNome: string): number {
  if (typeof breakdown[bairroNome] === 'number') {
    return breakdown[bairroNome];
  }
  const norm = bairroNome.toLowerCase().trim();
  for (const [key, val] of Object.entries(breakdown)) {
    if (key.toLowerCase().trim() === norm) {
      return typeof val === 'number' ? val : 0;
    }
  }
  return 0;
}

export const CoverageMap: React.FC<CoverageMapProps> = ({
  bairros,
  breakdown = {},
  bairrosPendentes = [],
  municipio = '',
  selecionadosIds = new Set(),
  onToggleSelectBairro,
  onSelectAll,
  onSelectOnlyNaoMinerados,
  disabled = false,
}) => {
  const [bairroDetalhe, setBairroDetalhe] = useState<BairroItem | null>(null);

  const pendentesSet = React.useMemo(() => {
    if (bairrosPendentes instanceof Set) {
      return bairrosPendentes;
    }
    return new Set(bairrosPendentes.map((b) => b.toLowerCase().trim()));
  }, [bairrosPendentes]);

  // Normaliza lista de bairros e aplica o semáforo baseado no breakdown do cartucho
  const listaBairrosFormatados: BairroItem[] = React.useMemo(() => {
    return bairros.map((item) => {
      const nome = typeof item === 'string' ? item : item.nome;
      const id = typeof item === 'string' ? item : item.id || item.nome;
      const muni = typeof item === 'string' ? municipio : item.municipio || municipio;

      const leadsNoCartucho = getCountFromBreakdown(breakdown, nome);
      const isPendente =
        pendentesSet.has(nome.toLowerCase().trim()) ||
        pendentesSet.has(id.toLowerCase().trim());

      let status: BairroStatus = 'nao_minerado';

      if (isPendente) {
        status = 'processando'; // 🟡 Amarelo: bairro na fila/processando no job atual
      } else if (leadsNoCartucho > 0) {
        status = 'minerado'; // 🟢 Verde: já tem leads no cartucho
      } else {
        status = 'nao_minerado'; // 🔴 Vermelho: não minerado ou zerado no cartucho
      }

      return {
        id,
        nome,
        municipio: muni,
        status,
        leadsCount: leadsNoCartucho,
      };
    });
  }, [bairros, breakdown, pendentesSet, municipio]);

  const total = listaBairrosFormatados.length;
  const minerados = listaBairrosFormatados.filter((b) => b.status === 'minerado');
  const processando = listaBairrosFormatados.filter((b) => b.status === 'processando');
  const naoMinerados = listaBairrosFormatados.filter((b) => b.status === 'nao_minerado');

  const totalLeadsCartucho = minerados.reduce((acc, curr) => acc + (curr.leadsCount || 0), 0);

  const getStatusBadge = (status: BairroStatus) => {
    switch (status) {
      case 'minerado':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            🟢 Coberto
          </span>
        );
      case 'processando':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            🟡 Na Fila
          </span>
        );
      case 'nao_minerado':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            🔴 Pendente
          </span>
        );
    }
  };

  const getCardClasses = (status: BairroStatus, isSelected: boolean) => {
    let base =
      'p-3 rounded-xl border text-left transition-all duration-150 relative cursor-pointer flex flex-col justify-between min-h-[96px] ';

    if (isSelected) {
      base += 'ring-2 ring-amber-500 shadow-sm ';
    }

    switch (status) {
      case 'minerado':
        return (
          base +
          (isSelected
            ? 'bg-emerald-50 border-emerald-400'
            : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300')
        );
      case 'processando':
        return (
          base +
          (isSelected
            ? 'bg-amber-50 border-amber-400'
            : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70 hover:border-amber-300')
        );
      case 'nao_minerado':
      default:
        return (
          base +
          (isSelected
            ? 'bg-red-50 border-red-300'
            : 'bg-red-50/60 border-red-200 hover:bg-red-100/60 hover:border-red-300')
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Resumo do Semáforo e Contadores de Cartucho */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-800">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Total: {total} Bairros</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>🟢 Minerados: {minerados.length}</span>
            <span className="text-[11px] font-medium text-emerald-600">
              ({totalLeadsCartucho} no cartucho)
            </span>
          </div>

          {processando.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              <span>🟡 Na Fila: {processando.length}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 font-bold text-red-800">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>🔴 Não Minerados: {naoMinerados.length}</span>
          </div>
        </div>

        {/* Ações de Seleção Rápida */}
        {onToggleSelectBairro && (
          <div className="flex items-center gap-2 self-end md:self-center">
            {onSelectOnlyNaoMinerados && (
              <button
                type="button"
                onClick={onSelectOnlyNaoMinerados}
                disabled={disabled}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                title="Selecionar apenas bairros vermelhos (sem leads no cartucho)"
              >
                Selecionar 🔴 Pendentes
              </button>
            )}

            {onSelectAll && (
              <button
                type="button"
                onClick={() => onSelectAll(selecionadosIds.size !== total)}
                disabled={disabled}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {selecionadosIds.size === total ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid Visual de Bairros (Semáforo de Cobertura via Cartucho) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {listaBairrosFormatados.map((b) => {
          const isSelected = selecionadosIds.has(b.id);
          return (
            <div
              key={b.id}
              onClick={() => {
                setBairroDetalhe(b);
              }}
              className={getCardClasses(b.status, isSelected)}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="font-bold text-xs text-slate-900 truncate tracking-tight" title={b.nome}>
                  {b.nome}
                </span>

                {onToggleSelectBairro && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!disabled) onToggleSelectBairro(b.id);
                    }}
                    disabled={disabled}
                    className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer shrink-0"
                    title={isSelected ? 'Desmarcar para mineração' : 'Selecionar para mineração'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-end justify-between gap-1 pt-2">
                <div>{getStatusBadge(b.status)}</div>

                <div className="text-right">
                  <span
                    className={`text-xs font-extrabold tabular-nums ${
                      b.status === 'minerado' ? 'text-emerald-800' : 'text-slate-600'
                    }`}
                  >
                    {b.leadsCount || 0} leads
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalhes do Bairro */}
      {bairroDetalhe && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    bairroDetalhe.status === 'minerado'
                      ? 'bg-emerald-100 text-emerald-700'
                      : bairroDetalhe.status === 'processando'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{bairroDetalhe.nome}</h4>
                  <p className="text-[11px] text-slate-500">{bairroDetalhe.municipio || municipio}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBairroDetalhe(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Status no Cartucho:</span>
                <div>{getStatusBadge(bairroDetalhe.status)}</div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Leads no Cartucho:
                </span>
                <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                  {bairroDetalhe.leadsCount || 0} leads
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              {onToggleSelectBairro && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleSelectBairro(bairroDetalhe.id);
                    setBairroDetalhe(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    selecionadosIds.has(bairroDetalhe.id)
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  {selecionadosIds.has(bairroDetalhe.id)
                    ? 'Desmarcar da Mineração'
                    : 'Incluir na Mineração'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setBairroDetalhe(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
