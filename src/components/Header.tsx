import React from 'react';
import { Lead } from '../types/crm';
import { FileSpreadsheet, Smartphone, Database, ClipboardPaste, Users, RotateCw, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  leads: Lead[];
  onOpenBulkImport: () => void;
  onExportCsv: () => void;
  onOpenInstallModal: () => void;
  onOpenGoogleSheets: () => void;
  isGoogleConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  leads,
  onOpenBulkImport,
  onExportCsv,
  onOpenInstallModal,
  onOpenGoogleSheets,
  isGoogleConnected,
}) => {
  const totalLeads = leads.length;
  const leadsEmProspeccao = leads.filter(l => l.status === 'em_prospeccao' || l.status === 'contato_1' || l.status === 'contato_2' || l.status === 'contato_3').length;
  const leadsFechados = leads.filter(l => l.status === 'fechado').length;

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5">
        
        <div className="flex items-center gap-3">
          <div className="bg-red-600 text-white font-bold px-2 py-1 rounded-md text-xl tracking-tighter shadow-xs">
            iCtx
          </div>
          <div>
            <h1 className="text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wider">
              CRM Prospecção PJ
            </h1>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block mt-0.5">
              Pipeline de Vendas Santander / GetNet
            </p>
          </div>
        </div>

        {/* Contadores ocultos no mobile */}
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

        {/* Botões de Ação Desktop */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenBulkImport}
            className="p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Colar Nova Lista"
          >
            <ClipboardPaste className="w-4 h-4" />
          </button>
          <button
            onClick={onExportCsv}
            className="p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Exportar CSV"
          >
            <Database className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenInstallModal}
            className="p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Instalar App"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenGoogleSheets}
            className={`p-2 rounded-xl transition-colors cursor-pointer border shadow-2xs relative ${
              isGoogleConnected ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
            }`}
            title="Sincronização com Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};