import React, { useState } from 'react';
import { Search, Filter, LayoutGrid, List, ArrowUpDown, Bell, AlertTriangle, Flame } from 'lucide-react';
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
  { id: 'novo', titulo: 'Novos Leads', subtitulo: 'Aguardando 1º contato', corHeader: 'bg-slate-100 text-slate-700' },
  { id: 'em_prospeccao', titulo: 'Em Prospecção', subtitulo: 'Cadência em andamento', corHeader: 'bg-blue-50 text-blue-700' },
  { id: 'negociacao', titulo: 'Negociação', subtitulo: 'Proposta e fechamento', corHeader: 'bg-purple-50 text-purple-700' },
  { id: 'fechado', titulo: 'Fechado', subtitulo: 'Conta/Máquina aberta', corHeader: 'bg-emerald-50 text-emerald-700' },
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
}

export const PipelineKanban: React.FC<PipelineKanbanProps> = ({
  leads,
  onOpenMessageComposer,
  onOpenCallScript,
  onOpenDetails,
  onUpdateStatus,
  filtroCadencia,
  onFiltroCadenciaChange,
  busca,
  onBuscaChange,
  filtroStatus,
  onFiltroStatusChange,
}) => {
  const [ordenarPor, setOrdenarPor] = useState<'data' | 'score'>('data');

  const totalFollowUpsVencidos = leads.filter((l) => ehFollowUpVencido(l)).length;
  const totalLeadsQuentes = leads.filter((l) => calcularScore(l) >= 75).length;
  const totalRisco = leads.filter(l => l.status === 'fechado' && calcularAtivacaoStatus(l) === 'risco').length;

  const leadsFiltrados = leads.filter((lead) => {
    const textoBusca = busca.toLowerCase().trim();
    const buscaDigitos = busca.replace(/\D/g, '');

    const telPrincipal = lead.telefonePrincipal || '';
    const telSecundario = lead.telefoneSecundario || '';
    const telPrincipalDigitos = telPrincipal.replace(/\D/g, '');
    const telSecundarioDigitos = telSecundario.replace(/\D/g, '');

    const matchTelefone = Boolean(
      (buscaDigitos.length > 0 &&
        (telPrincipalDigitos.includes(buscaDigitos) || telSecundarioDigitos.includes(buscaDigitos))) ||
      (textoBusca &&
        (telPrincipal.toLowerCase().includes(textoBusca) || telSecundario.toLowerCase().includes(textoBusca)))
    );

    const matchBusca =
      !textoBusca ||
      lead.empresaExibicao.toLowerCase().includes(textoBusca) ||
      lead.nomeContato.toLowerCase().includes(textoBusca) ||
      lead.cnpj.includes(textoBusca) ||
      (lead.municipio || '').toLowerCase().includes(textoBusca) ||
      matchTelefone;

    const matchStatus = filtroStatus === 'todos' || lead.status === filtroStatus;

    const matchCadencia =
      filtroCadencia === 'todos'
        ? true
        : filtroCadencia === 'followup_hoje'
        ? ehFollowUpVencido(lead)
        : filtroCadencia === 'score'
        ? calcularScore(lead) >= 75
        : filtroCadencia === 'risco'
        ? (lead.status === 'fechado' && calcularAtivacaoStatus(lead) === 'risco')
        : true;

    return matchBusca && matchStatus && matchCadencia;
  });

  return (
    <div className="space-y-4">
      
      {/* Filtros Premium */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => onFiltroCadenciaChange(filtroCadencia === 'followup_hoje' ? 'todos' : 'followup_hoje')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
            filtroCadencia === 'followup_hoje'
              ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Follow-ups Hoje</span>
          <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[10px]">{totalFollowUpsVencidos}</span>
        </button>

        <button
          onClick={() => onFiltroCadenciaChange(filtroCadencia === 'score' ? 'todos' : 'score')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
            filtroCadencia === 'score'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Leads Quentes</span>
          <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px]">{totalLeadsQuentes}</span>
        </button>

        <button
          onClick={() => onFiltroCadenciaChange(filtroCadencia === 'risco' ? 'todos' : 'risco')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
            filtroCadencia === 'risco'
              ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Risco</span>
          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">{totalRisco}</span>
        </button>
      </div>

      {/* Barra de Busca e Ordenação */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar por empresa, contato, CNPJ..."
            className="w-full text-sm pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 text-slate-800 placeholder:text-slate-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setOrdenarPor('data')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${ordenarPor === 'data' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Data
            </button>
            <button
              onClick={() => setOrdenarPor('score')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${ordenarPor === 'score' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Score
            </button>
          </div>
          
          <select
            value={filtroStatus}
            onChange={(e) => onFiltroStatusChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-100 cursor-pointer"
          >
            <option value="todos">Todas as etapas</option>
            {COLUNAS_KANBAN.map((col) => (
              <option key={col.id} value={col.id}>{col.titulo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex flex-row gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory no-scrollbar">
        {COLUNAS_KANBAN.map((coluna) => {
          const leadsDaColuna = leadsFiltrados.filter((l) => l.status === coluna.id);
          const leadsOrdenados = [...leadsDaColuna].sort((a, b) => {
            if (ordenarPor === 'score') {
              return calcularScore(b) - calcularScore(a);
            }
            return new Date(b.atualizadoEm || b.criadoEm).getTime() - new Date(a.atualizadoEm || a.criadoEm).getTime();
          });

          return (
            <div
              key={coluna.id}
              className="w-[85vw] sm:w-[300px] shrink-0 snap-start bg-slate-50/80 rounded-2xl border border-slate-200/60 flex flex-col max-h-[calc(100dvh-220px)]"
            >
              {/* Column Header */}
              <div className={`p-3 rounded-t-2xl border-b border-slate-200/60 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm ${coluna.corHeader}`}>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider">{coluna.titulo}</h3>
                  <p className="text-[10px] opacity-70 font-medium">{coluna.subtitulo}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/60 shadow-sm border border-black/5">
                  {leadsDaColuna.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 overflow-y-auto flex-1 space-y-2 no-scrollbar">
                {leadsOrdenados.length === 0 ? (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                    Nenhum lead aqui
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
    </div>
  );
};