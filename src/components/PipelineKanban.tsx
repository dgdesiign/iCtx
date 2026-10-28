import React, { useState } from 'react';
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  CheckCircle2,
  Building2,
  ChevronRight,
  ArrowUpDown,
  PhoneCall,
  MessageCircle,
  Bell,
} from 'lucide-react';
import { Lead, LeadStatus } from '../types/crm';
import { KANBAN_COLUMNS } from '../utils/storage';
import { ehFollowUpVencido } from '../utils/cadencia';
import { calcularScore } from '../utils/scoring';
import { LeadCard } from './LeadCard';

export type CadenciaFiltro = 'todos' | 'followup_hoje' | 'score';

interface PipelineKanbanProps {
  leads: Lead[];
  onOpenMessageComposer: (lead: Lead) => void;
  onOpenCallScript: (lead: Lead) => void;
  onOpenDetails: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onDeleteLead?: (leadId: string) => void;
  filtroCadencia: CadenciaFiltro;
  onFiltroCadenciaChange: (filtro: CadenciaFiltro) => void;
  busca: string;
  onBuscaChange: (busca: string) => void;
  filtroStatus: string;
  onFiltroStatusChange: (status: string) => void;
}

export const PipelineKanban: React.FC<PipelineKanbanProps> = ({
  leads,
  onOpenMessageComposer,
  onOpenCallScript,
  onOpenDetails,
  onUpdateStatus,
  onDeleteLead,
  filtroCadencia,
  onFiltroCadenciaChange,
  busca,
  onBuscaChange,
  filtroStatus,
  onFiltroStatusChange,
}) => {
  const [modoVisualizacao, setModoVisualizacao] = useState<'kanban' | 'tabela'>('kanban');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [ordenarPor, setOrdenarPor] = useState<'data' | 'score'>('data');

  const totalFollowUpsVencidos = leads.filter((l) => ehFollowUpVencido(l)).length;
  const totalLeadsQuentes = leads.filter((l) => calcularScore(l) >= 75).length;

  // Filtragem de leads (Busca por texto + status dropdown + filtro de cadência/score combinados)
  const leadsFiltrados = leads.filter((lead) => {
    const textoBusca = busca.toLowerCase().trim();
    const matchBusca =
      !textoBusca ||
      lead.empresaExibicao.toLowerCase().includes(textoBusca) ||
      lead.nomeContato.toLowerCase().includes(textoBusca) ||
      lead.cnpj.includes(textoBusca) ||
      (lead.municipio || '').toLowerCase().includes(textoBusca);

    const matchStatus = filtroStatus === 'todos' || lead.status === filtroStatus;

    const matchCadencia =
      filtroCadencia === 'todos'
        ? true
        : filtroCadencia === 'followup_hoje'
        ? ehFollowUpVencido(lead)
        : filtroCadencia === 'score'
        ? calcularScore(lead) >= 75
        : true;

    return matchBusca && matchStatus && matchCadencia;
  });

  return (
    <div className="space-y-3 sm:space-y-4">
      
      {/* Barra de Filtros de Cadência & Follow-up (Sprint 1) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        {/* Pílula 1: Follow-ups de hoje */}
        <button
          type="button"
          onClick={() =>
            onFiltroCadenciaChange(filtroCadencia === 'followup_hoje' ? 'todos' : 'followup_hoje')
          }
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
            filtroCadencia === 'followup_hoje'
              ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/40'
              : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200'
          }`}
          title="Filtrar apenas leads com follow-up previsto para hoje ou já vencidos"
        >
          <Bell className={`w-3.5 h-3.5 ${filtroCadencia === 'followup_hoje' ? 'text-white' : 'text-rose-600'}`} />
          <span>Follow-ups de hoje</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              filtroCadencia === 'followup_hoje'
                ? 'bg-white/20 text-white'
                : totalFollowUpsVencidos > 0
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalFollowUpsVencidos}
          </span>
        </button>

        {/* Pílula 2: Filtro por Score (Leads Quentes ≥75) */}
        <button
          type="button"
          onClick={() =>
            onFiltroCadenciaChange(filtroCadencia === 'score' ? 'todos' : 'score')
          }
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
            filtroCadencia === 'score'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold ring-2 ring-emerald-400/40'
              : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200'
          }`}
          title="Filtrar apenas leads com Score Quente (≥75 pts)"
        >
          <span>🔥</span>
          <span>Leads Quentes</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              filtroCadencia === 'score'
                ? 'bg-white/20 text-white'
                : totalLeadsQuentes > 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalLeadsQuentes}
          </span>
        </button>

        {/* Pílula 3: Todos */}
        <button
          type="button"
          onClick={() => onFiltroCadenciaChange('todos')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
            filtroCadencia === 'todos'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <span>Todos</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              filtroCadencia === 'todos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {leads.length}
          </span>
        </button>
      </div>

      {/* Control Bar: Search, Filters & View Toggle */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar por empresa, contato, CNPJ ou cidade..."
            className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 bg-slate-50/50"
          />
          {busca && (
            <button
              onClick={() => onBuscaChange('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* View Mode & Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status selector filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filtroStatus}
              onChange={(e) => onFiltroStatusChange(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-600"
            >
              <option value="todos">Todas as etapas ({leads.length})</option>
              {KANBAN_COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.titulo} ({leads.filter((l) => l.status === col.id).length})
                </option>
              ))}
            </select>
          </div>

          {/* Seletor Ordenar por: Data | Score */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setOrdenarPor('data')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  ordenarPor === 'data'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Ordenar por data mais recente"
              >
                Data
              </button>
              <button
                type="button"
                onClick={() => setOrdenarPor('score')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  ordenarPor === 'score'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Ordenar do maior score para o menor (leads mais quentes primeiro)"
              >
                <span>Score</span>
                {ordenarPor === 'score' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Toggle Kanban vs Tabela */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setModoVisualizacao('kanban')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                modoVisualizacao === 'kanban'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacao('tabela')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                modoVisualizacao === 'tabela'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
          </div>
        </div>

      </div>

      {/* Main View: Kanban Columns with Drag and Drop */}
      {modoVisualizacao === 'kanban' && (
        <div className="flex gap-1 overflow-x-auto pb-4 pt-1 items-start min-h-[72vh] select-none snap-x snap-mandatory scroll-smooth px-0.5">
          {KANBAN_COLUMNS.map((coluna) => {
            const leadsDaColuna = leadsFiltrados.filter((l) => l.status === coluna.id);
            const leadsDaColunaOrdenados = [...leadsDaColuna].sort((a, b) => {
              if (ordenarPor === 'score') {
                const scoreA = calcularScore(a);
                const scoreB = calcularScore(b);
                if (scoreB !== scoreA) {
                  return scoreB - scoreA;
                }
              }
              const dataA = new Date(a.atualizadoEm || a.criadoEm).getTime();
              const dataB = new Date(b.atualizadoEm || b.criadoEm).getTime();
              return dataB - dataA;
            });
            const isDragOver = dragOverColumn === coluna.id;

            return (
              <div
                key={coluna.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverColumn !== coluna.id) {
                    setDragOverColumn(coluna.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverColumn === coluna.id) {
                    setDragOverColumn(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const leadId = e.dataTransfer.getData('text/plain');
                  if (leadId) {
                    onUpdateStatus(leadId, coluna.id);
                  }
                  setDragOverColumn(null);
                }}
                className={`w-[85vw] max-w-[210px] sm:w-[210px] shrink-0 snap-center bg-slate-100/90 rounded-2xl flex flex-col max-h-[82vh] border transition-all duration-150 ${
                  isDragOver
                    ? 'border-red-500 ring-2 ring-red-400/50 bg-red-50/50 shadow-md scale-[1.01]'
                    : 'border-slate-200 shadow-2xs'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3.5 rounded-t-2xl border-b border-slate-200/80 ${coluna.corHeader}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                        {coluna.titulo}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {coluna.subtitulo}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-800 shadow-2xs tabular-nums border border-slate-200/60">
                      {leadsDaColuna.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 overflow-y-auto space-y-2 flex-1 pr-1.5">
                  {isDragOver && (
                    <div className="py-2.5 px-3 text-center text-xs font-bold text-red-700 bg-red-100/90 border-2 border-dashed border-red-400 rounded-xl animate-pulse">
                      Solte aqui para mover para {coluna.titulo}
                    </div>
                  )}

                  {leadsDaColunaOrdenados.length === 0 && !isDragOver ? (
                    <div className="py-10 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl m-1">
                      Arraste um lead para esta etapa
                    </div>
                  ) : (
                    leadsDaColunaOrdenados.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onOpenMessageComposer={onOpenMessageComposer}
                        onOpenCallScript={onOpenCallScript}
                        onOpenDetails={onOpenDetails}
                        onUpdateStatus={onUpdateStatus}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alternative View: High-density Table */}
      {modoVisualizacao === 'tabela' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-3">Contato</th>
                  <th className="py-3 px-3">CNPJ</th>
                  <th className="py-3 px-3">Localidade</th>
                  <th className="py-3 px-3">Idade</th>
                  <th className="py-3 px-3">Etapa Atual</th>
                  <th className="py-3 px-3">Pitch Sugerido</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Nenhum lead encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  [...leadsFiltrados]
                    .sort((a, b) => {
                      if (ordenarPor === 'score') {
                        const scoreA = calcularScore(a);
                        const scoreB = calcularScore(b);
                        if (scoreB !== scoreA) {
                          return scoreB - scoreA;
                        }
                      }
                      const dataA = new Date(a.atualizadoEm || a.criadoEm).getTime();
                      const dataB = new Date(b.atualizadoEm || b.criadoEm).getTime();
                      return dataB - dataA;
                    })
                    .map((lead) => {
                    const colConfig = KANBAN_COLUMNS.find((c) => c.id === lead.status);
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4">
                          <button
                            onClick={() => onOpenDetails(lead)}
                            className="font-bold text-slate-900 hover:text-red-700 text-left cursor-pointer"
                          >
                            {lead.empresaExibicao}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {lead.nomeContato}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {lead.cnpjFormatado}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {lead.municipio ? `${lead.municipio}/${lead.uf}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {lead.idadeEmpresa || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={lead.status}
                            onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                            className="text-xs font-semibold border border-slate-200 rounded px-2 py-0.5 bg-white text-slate-800"
                          >
                            {KANBAN_COLUMNS.map((col) => (
                              <option key={col.id} value={col.id}>
                                {col.titulo}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[150px]">
                          {lead.produtoSugerido}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenCallScript(lead)}
                              className="p-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                              title="Ligação"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenMessageComposer(lead)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Zap</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
