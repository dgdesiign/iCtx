import React from 'react';
import { Search, Bell, AlertTriangle, Flame, ChevronRight, Phone, MessageCircle, LayoutGrid, List } from 'lucide-react';
import { Lead, LeadStatus } from '../types/crm';
import { ehFollowUpVencido } from '../utils/cadencia';
import { calcularScore } from '../utils/scoring';
import { calcularAtivacaoStatus } from '../utils/ativacao';
import { LeadCard } from './LeadCard';

export type CadenciaFiltro = 'todos' | 'followup_hoje' | 'score' | 'risco';

export interface ColunaKanbanConfig {
  id: LeadStatus;
  titulo: string;
  subtitulo: string;
  corHeader: string;
}

export const COLUNAS_KANBAN: ColunaKanbanConfig[] = [
  { id: 'novo', titulo: 'Novos', subtitulo: 'Aguardando', corHeader: 'bg-slate-100 text-slate-700' },
  { id: 'em_prospeccao', titulo: 'Prospecção', subtitulo: 'Cadência', corHeader: 'bg-blue-50 text-blue-700' },
  { id: 'negociacao', titulo: 'Negociação', subtitulo: 'Proposta', corHeader: 'bg-purple-50 text-purple-700' },
  { id: 'fechado', titulo: 'Fechado', subtitulo: 'Ativo', corHeader: 'bg-emerald-50 text-emerald-700' },
  { id: 'descartado', titulo: 'Descartado', subtitulo: 'Sem interesse', corHeader: 'bg-rose-50 text-rose-700' },
];

interface PipelineKanbanProps {
  leads: Lead[];
  onOpenMessageComposer: (lead: Lead) => void;
  onOpenCallScript: (lead: Lead) => void;
  onOpenDetails: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  filtroCadencia: CadenciaFiltro;
  onFiltroCadenciaChange: (filtro: CadenciaFiltro) => void;
  busca: string;
  onBuscaChange: (busca: string) => void;
  filtroStatus: string;
  onFiltroStatusChange: (status: string) => void;
  modoVisualizacao: 'kanban' | 'lista';
  onToggleVisualizacao: (modo: 'kanban' | 'lista') => void;
}

export const PipelineKanban: React.FC<PipelineKanbanProps> = ({
  leads, onOpenMessageComposer, onOpenCallScript, onOpenDetails, onUpdateStatus,
  filtroCadencia, onFiltroCadenciaChange, busca, onBuscaChange, filtroStatus,
  onFiltroStatusChange, modoVisualizacao, onToggleVisualizacao,
}) => {
  const totalFollowUpsVencidos = leads.filter((l) => ehFollowUpVencido(l)).length;
  const totalLeadsQuentes = leads.filter((l) => calcularScore(l) >= 75).length;
  const totalRisco = leads.filter(l => l.status === 'fechado' && calcularAtivacaoStatus(l) === 'risco').length;

  const leadsFiltrados = leads.filter((lead) => {
    const textoBusca = busca.toLowerCase().trim();
    const buscaDigitos = busca.replace(/\D/g, '');
    const telPrincipal = lead.telefonePrincipal || '';
    const telSecundario = lead.telefoneSecundario || '';

    const matchTelefone = Boolean(
      (buscaDigitos.length > 0 &&
        (telPrincipal.replace(/\D/g, '').includes(buscaDigitos) || telSecundario.replace(/\D/g, '').includes(buscaDigitos))) ||
      (textoBusca && (telPrincipal.toLowerCase().includes(textoBusca) || telSecundario.toLowerCase().includes(textoBusca)))
    );

    const matchBusca = !textoBusca ||
      lead.empresaExibicao.toLowerCase().includes(textoBusca) ||
      lead.nomeContato.toLowerCase().includes(textoBusca) ||
      lead.cnpj.includes(textoBusca) ||
      (lead.municipio || '').toLowerCase().includes(textoBusca) ||
      matchTelefone;

    const matchStatus = filtroStatus === 'todos' || lead.status === filtroStatus;

    const matchCadencia =
      filtroCadencia === 'todos' ? true
      : filtroCadencia === 'followup_hoje' ? ehFollowUpVencido(lead)
      : filtroCadencia === 'score' ? calcularScore(lead) >= 75
      : filtroCadencia === 'risco' ? (lead.status === 'fechado' && calcularAtivacaoStatus(lead) === 'risco')
      : true;

    return matchBusca && matchStatus && matchCadencia;
  });

  const leadsOrdenadosLista = [...leadsFiltrados].sort((a, b) => {
    if (filtroCadencia === 'score') return calcularScore(b) - calcularScore(a);
    return new Date(b.atualizadoEm || b.criadoEm).getTime() - new Date(a.atualizadoEm || a.criadoEm).getTime();
  });

  return (
    <div className="space-y-3">
      
      {/* Barra de Busca + Toggle + Filtros (tudo numa linha coesa) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 space-y-2">
        
        {/* Linha 1: Busca + Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Buscar..."
              className="w-full text-sm pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Toggle Kanban/Lista (de volta ao lugar certo) */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => onToggleVisualizacao('kanban')}
              className={`p-1.5 rounded-md transition-all ${
                modoVisualizacao === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
              title="Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleVisualizacao('lista')}
              className={`p-1.5 rounded-md transition-all ${
                modoVisualizacao === 'lista' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Linha 2: Filtros rápidos + Select de etapa */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => onFiltroCadenciaChange(filtroCadencia === 'followup_hoje' ? 'todos' : 'followup_hoje')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 border ${
              filtroCadencia === 'followup_hoje'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm scale-105'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:border-rose-200'
            }`}
          >
            <Bell className="w-3 h-3" />
            <span>{totalFollowUpsVencidos}</span>
          </button>

          <button
            onClick={() => onFiltroCadenciaChange(filtroCadencia === 'score' ? 'todos' : 'score')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 border ${
              filtroCadencia === 'score'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>{totalLeadsQuentes}</span>
          </button>

          <button
            onClick={() => onFiltroCadenciaChange(filtroCadencia === 'risco' ? 'todos' : 'risco')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 border ${
              filtroCadencia === 'risco'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm scale-105'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{totalRisco}</span>
          </button>

          <div className="w-px h-4 bg-slate-200 shrink-0 mx-0.5" />

          <select
            value={filtroStatus}
            onChange={(e) => onFiltroStatusChange(e.target.value)}
            className="text-[11px] bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 font-bold text-slate-700 focus:outline-none cursor-pointer shrink-0"
          >
            <option value="todos">Todas</option>
            {COLUNAS_KANBAN.map((col) => (
              <option key={col.id} value={col.id}>{col.titulo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MODO KANBAN — colunas de 175px (2 cabem no Moto G34) */}
      {modoVisualizacao === 'kanban' && (
        <div className="flex flex-row gap-2 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory no-scrollbar">
          {COLUNAS_KANBAN.map((coluna) => {
            const leadsDaColuna = leadsFiltrados.filter((l) => l.status === coluna.id);
            const leadsOrdenados = [...leadsDaColuna].sort((a, b) => {
              if (filtroCadencia === 'score') return calcularScore(b) - calcularScore(a);
              return new Date(b.atualizadoEm || b.criadoEm).getTime() - new Date(a.atualizadoEm || a.criadoEm).getTime();
            });

            return (
              <div
                key={coluna.id}
                className="w-[175px] min-w-[175px] md:w-[280px] md:min-w-[280px] shrink-0 snap-start bg-slate-50/80 rounded-xl border border-slate-200/60 flex flex-col max-h-[calc(100dvh-260px)]"
              >
                <div className={`p-2 rounded-t-xl border-b border-slate-200/60 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm ${coluna.corHeader}`}>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[10px] md:text-xs uppercase tracking-wider truncate">{coluna.titulo}</h3>
                    <p className="text-[9px] opacity-70 font-medium truncate">{coluna.subtitulo}</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/60 shadow-sm border border-black/5 shrink-0 ml-1">
                    {leadsDaColuna.length}
                  </span>
                </div>
                <div className="p-1.5 overflow-y-auto flex-1 space-y-1.5 no-scrollbar">
                  {leadsOrdenados.length === 0 ? (
                    <div className="h-16 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-[10px] text-slate-400 font-medium">
                      Vazio
                    </div>
                  ) : (
                    leadsOrdenados.map((lead) => (
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

      {/* MODO LISTA */}
      {modoVisualizacao === 'lista' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {leadsOrdenadosLista.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Nenhum lead encontrado com esses filtros.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {leadsOrdenadosLista.map((lead) => {
                const statusConfig = COLUNAS_KANBAN.find(c => c.id === lead.status);
                return (
                  <div
                    key={lead.id}
                    onClick={() => onOpenDetails(lead)}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 truncate">{lead.empresaExibicao}</p>
                      <p className="text-xs text-slate-500 truncate">{lead.nomeContato} · {lead.municipio || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConfig?.corHeader || 'bg-slate-100 text-slate-600'}`}>
                        {statusConfig?.titulo || lead.status}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); onOpenMessageComposer(lead); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onOpenCallScript(lead); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <Phone className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
