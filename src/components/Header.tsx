import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  MessageSquareText,
  Download,
  Users,
  TrendingUp,
  CheckCircle2,
  Smartphone,
  BarChart3,
  Bell,
  BellRing,
  Target,
  Pickaxe,
  Loader2,
} from 'lucide-react';
import { Lead } from '../types/crm';
import { NotificationStatus } from '../services/notificationService';

interface HeaderProps {
  leads: Lead[];
  onOpenBulkImport: () => void;
  onOpenSingleLead: () => void;
  onOpenMining?: () => void;
  onOpenTemplates: () => void;
  onExportCsv: () => void;
  onOpenInstallModal: () => void;
  onOpenGoogleSheets: () => void;
  isGoogleConnected: boolean;
  isGoogleSyncing?: boolean;
  dirtyCount?: number;
  pendingSyncCount?: number;
  isSupervisor?: boolean;
  usuarioRole?: 'supervisor' | 'executivo';
  onOpenSupervisorDashboard?: () => void;
  onOpenMetas?: () => void;
  onToggleRole?: () => void;
  onOpenNotifications?: () => void;
  notificationStatus?: NotificationStatus;
  followupsHojeCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  leads,
  onOpenBulkImport,
  onOpenSingleLead,
  onOpenMining,
  onOpenTemplates,
  onExportCsv,
  onOpenInstallModal,
  onOpenGoogleSheets,
  isGoogleConnected,
  isGoogleSyncing = false,
  dirtyCount = 0,
  pendingSyncCount = 0,
  isSupervisor = false,
  usuarioRole = 'supervisor',
  onOpenSupervisorDashboard,
  onOpenMetas,
  onToggleRole,
  onOpenNotifications,
  notificationStatus = 'default',
  followupsHojeCount = 0,
}) => {
  const totalLeads = leads.length;
  const fechados = leads.filter((l) => l.status === 'fechado').length;
  const emNegociacao = leads.filter((l) => l.status === 'negociacao').length;
  const emContato = leads.filter((l) =>
    ['contato_1', 'contato_2', 'contato_3'].includes(l.status)
  ).length;

  // Estado da Mineração Autônoma (Sprint 11)
  const [isMiningJobRunning, setIsMiningJobRunning] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ictx_mining_job');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.isRunning);
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    const handleJobUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ isRunning: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isRunning === 'boolean') {
        setIsMiningJobRunning(customEvent.detail.isRunning);
      }
    };
    window.addEventListener('ictx:miningJobUpdate', handleJobUpdate);
    return () => window.removeEventListener('ictx:miningJobUpdate', handleJobUpdate);
  }, []);

  const handleOpenMiningCoverage = () => {
    localStorage.setItem('ictx_mining_initial_tab', 'cobertura');
    window.dispatchEvent(new CustomEvent('ictx:openMiningTab', { detail: 'cobertura' }));
    if (onOpenMining) {
      onOpenMining();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Main Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2.5 sm:py-3 gap-2.5 sm:gap-3">
          
          {/* Top Line: Brand & Metrics */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-slate-900 flex items-center justify-center text-white shadow-sm shrink-0 font-extrabold text-xs tracking-wider">
                iCtx
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                    iCtx
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
                    CRM Prospecção PJ
                  </span>
                  {onToggleRole && (
                    <button
                      type="button"
                      onClick={onToggleRole}
                      className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        usuarioRole === 'supervisor'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Clique para alternar perfil entre Supervisor e Executivo para validação"
                    >
                      {usuarioRole === 'supervisor' ? '👑 Supervisor' : '👤 Executivo'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Receita Federal · Pipeline de Vendas · Scripts WhatsApp & Ligação
                </p>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="flex items-center gap-2 sm:gap-4 px-2.5 py-1 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500 hidden md:inline">Total:</span>
                <span className="font-bold text-slate-900 tabular-nums">{totalLeads}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                <span className="text-slate-500 hidden md:inline">Contato:</span>
                <span className="font-bold text-blue-700 tabular-nums">{emContato}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="text-slate-500 hidden md:inline">Fechados:</span>
                <span className="font-bold text-emerald-700 tabular-nums">{fechados}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar - Apenas Ícones conforme solicitado */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full lg:w-auto">
            
            {/* Google Sheets Cloud Sync Button */}
            <button
              onClick={onOpenGoogleSheets}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0 ${
                isGoogleSyncing
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                  : isGoogleConnected && pendingSyncCount > 0
                  ? 'bg-red-50 text-red-800 border border-red-300 hover:bg-red-100'
                  : isGoogleConnected
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  : dirtyCount > 0
                  ? 'bg-red-50 text-red-800 border border-red-300 hover:bg-red-100'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
              title={
                isGoogleSyncing
                  ? 'Sincronizando com Google Planilhas...'
                  : isGoogleConnected && pendingSyncCount > 0
                  ? `${pendingSyncCount} leads pendentes de sync`
                  : isGoogleConnected
                  ? 'Google Planilhas Conectado e Sincronizado'
                  : dirtyCount > 0
                  ? `${dirtyCount} alteração(ões) pendente(s) neste dispositivo. Conecte o Google Planilhas para sincronizar.`
                  : 'Conectar Planilha Google'
              }
              aria-label="Conectar Planilha"
            >
              <FileSpreadsheet
                className={`w-4 h-4 ${
                  isGoogleSyncing
                    ? 'text-amber-600 animate-pulse'
                    : isGoogleConnected && pendingSyncCount > 0
                    ? 'text-red-600'
                    : isGoogleConnected
                    ? 'text-emerald-600'
                    : dirtyCount > 0
                    ? 'text-red-600'
                    : 'text-slate-600'
                }`}
              />
              {isGoogleSyncing ? (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
              ) : isGoogleConnected && pendingSyncCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white animate-pulse shadow-xs">
                  {pendingSyncCount}
                </span>
              ) : isGoogleConnected ? (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              ) : null}
            </button>

            {/* Importar Lista em Massa */}
            <button
              onClick={onOpenBulkImport}
              className="w-9 h-9 flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Importar Lista em Massa (WhatsApp / Texto)"
              aria-label="Importar Lista"
            >
              <Upload className="w-4 h-4" />
            </button>

            {/* Mineração Integrada (Sprint 10) */}
            {onOpenMining && (
              <button
                onClick={onOpenMining}
                className="w-9 h-9 flex items-center justify-center text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Central de Mineração Integrada (Casa dos Dados / Retorno AK)"
                aria-label="Mineração de Leads"
              >
                <Pickaxe className="w-4 h-4 text-amber-600" />
              </button>
            )}

            {/* Novo Lead */}
            <button
              onClick={onOpenSingleLead}
              className="w-9 h-9 flex items-center justify-center text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Novo Lead (Consulta Receita Federal)"
              aria-label="Novo Lead"
            >
              <Plus className="w-4 h-4 text-slate-600" />
            </button>

            {/* Scripts & Gatilhos */}
            <button
              onClick={onOpenTemplates}
              className="w-9 h-9 flex items-center justify-center text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Scripts de Abordagem & Gatilhos"
              aria-label="Scripts"
            >
              <MessageSquareText className="w-4 h-4 text-red-600" />
            </button>

            {/* Minhas Metas & Simulador de Projeção (Sprint R7) */}
            {onOpenMetas && (
              <button
                onClick={onOpenMetas}
                className="h-9 px-2.5 sm:px-3 flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Minhas Metas & Simulador de Projeção"
                aria-label="Minhas Metas"
              >
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Minhas Metas</span>
              </button>
            )}

            {/* Painel do Supervisor (Sprint 5) - visível somente para role === supervisor */}
            {isSupervisor && (
              <button
                onClick={onOpenSupervisorDashboard}
                className="w-9 h-9 flex items-center justify-center text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Painel do Supervisor (Métricas Reais)"
                aria-label="Supervisor"
              >
                <BarChart3 className="w-4 h-4 text-indigo-700" />
              </button>
            )}

            {/* Indicador de Mineração Autônoma Ativa (Sprint 11) */}
            {isMiningJobRunning && (
              <button
                type="button"
                onClick={handleOpenMiningCoverage}
                className="h-9 px-2.5 flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0 animate-pulse"
                title="Mineração Autônoma em andamento. Clique para abrir o Painel de Cobertura."
                aria-label="Mineração em andamento"
              >
                <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                <span className="hidden sm:inline">⛏️ Minerando...</span>
                <span className="sm:hidden">⛏️</span>
              </button>
            )}

            {/* Lembretes & Notificações (Web Push 9h) */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className={`relative w-9 h-9 flex items-center justify-center rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0 ${
                  notificationStatus === 'granted'
                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
                }`}
                title={
                  notificationStatus === 'granted'
                    ? `Notificações Ativas · Lembrete diário às 9h (${followupsHojeCount} follow-up(s) hoje)`
                    : 'Ativar Notificações do Navegador (Lembretes às 9h)'
                }
                aria-label="Notificações"
              >
                {notificationStatus === 'granted' ? (
                  <BellRing className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Bell className="w-4 h-4 text-slate-600" />
                )}
                {followupsHojeCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
                    {followupsHojeCount > 9 ? '9+' : followupsHojeCount}
                  </span>
                )}
              </button>
            )}

            {/* Exportar */}
            <button
              onClick={onExportCsv}
              className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Exportar Dados (CSV / Excel)"
              aria-label="Exportar"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Instalar App / APK */}
            <button
              onClick={onOpenInstallModal}
              className="w-9 h-9 flex items-center justify-center text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Instalar no Celular / Tablet (APK WebAPK)"
              aria-label="Instalar no Celular"
            >
              <Smartphone className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
