import React from 'react';
import { Lead } from '../types/crm';
import { NotificationStatus } from '../services/notificationService';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  FileText,
  Target,
  BarChart3,
  Bell,
  Download,
  Smartphone,
  Package,
  RotateCw,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface HeaderProps {
  leads: Lead[];
  onOpenBulkImport: () => void;
  onOpenSingleLead: () => void;
  onOpenCartuchos: () => void;
  onOpenTemplates: () => void;
  onExportCsv: () => void;
  onOpenInstallModal: () => void;
  onOpenGoogleSheets: () => void;
  isGoogleConnected: boolean;
  isGoogleSyncing: boolean;
  dirtyCount: number;
  pendingSyncCount: number;
  isSupervisor: boolean;
  usuarioRole: 'supervisor' | 'executivo';
  onOpenSupervisorDashboard: () => void;
  onOpenMetas: () => void;
  onToggleRole: () => void;
  onOpenNotifications: () => void;
  notificationStatus: NotificationStatus;
  followupsHojeCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  leads,
  onOpenBulkImport,
  onOpenSingleLead,
  onOpenCartuchos,
  onOpenTemplates,
  onExportCsv,
  onOpenInstallModal,
  onOpenGoogleSheets,
  isGoogleConnected,
  dirtyCount,
  pendingSyncCount,
  isSupervisor,
  usuarioRole,
  onOpenSupervisorDashboard,
  onOpenMetas,
  onToggleRole,
  onOpenNotifications,
  followupsHojeCount,
}) => {
  const totalLeads = leads.length;
  const leadsEmProspeccao = leads.filter(l => l.status === 'em_prospeccao' || l.status === 'contato_1' || l.status === 'contato_2' || l.status === 'contato_3').length;
  const leadsFechados = leads.filter(l => l.status === 'fechado').length;

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        
        <div className="flex items-center gap-3">
          <div className="bg-red-600 text-white font-bold px-2 py-1 rounded-md text-xl tracking-tighter shadow-xs">
            iCtx
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wider">
                CRM Prospecção PJ
              </h1>
              {isSupervisor && (
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  SUPERVISOR
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Receita Federal · Pipeline de Vendas · Scripts WhatsApp & Ligação
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl px-4 py-1.5 bg-slate-50/50 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Total: <strong className="text-slate-800">{totalLeads}</strong></span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-blue-500" />
            <span>Contato: <strong className="text-slate-800">{leadsEmProspeccao}</strong></span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Fechados: <strong className="text-slate-800">{leadsFechados}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          
          <button
            onClick={onOpenCartuchos}
            className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Baixar Cartuchos AK (Leads Minerados)"
          >
            <Package className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenBulkImport}
            className="p-2 text-slate-600 hover:bg-slate-100 border border-transparent rounded-xl transition-colors cursor-pointer"
            title="Colar Nova Lista"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSingleLead}
            className="p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Adicionar Lead Único"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenTemplates}
            className="p-2 text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Gerenciar Templates"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenMetas}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Target className="w-4 h-4" />
            <span className="hidden md:inline">Minhas Metas</span>
          </button>

          {isSupervisor && (
            <button
              onClick={onOpenSupervisorDashboard}
              className="hidden sm:flex items-center justify-center p-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Painel do Supervisor"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          )}
          
          <div className="w-px h-6 bg-slate-200 mx-0.5"></div>

          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-600 hover:bg-slate-100 border border-transparent rounded-xl transition-colors cursor-pointer"
            title="Notificações e Lembretes"
          >
            <Bell className="w-4 h-4" />
            {followupsHojeCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full border border-white animate-pulse"></span>
            )}
          </button>

          <button
            onClick={onExportCsv}
            className="p-2 text-slate-600 hover:bg-slate-100 border border-transparent rounded-xl transition-colors cursor-pointer"
            title="Exportar Dados (CSV)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenInstallModal}
            className="p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Instalar App (PWA)"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenGoogleSheets}
            className={`p-2 rounded-xl transition-colors cursor-pointer border shadow-2xs relative ${
              isGoogleConnected 
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
            }`}
            title="Sincronização com Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {isGoogleConnected && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};