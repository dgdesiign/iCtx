import React from 'react';
import { Lead } from '../types/crm';
import { Users, RotateCw, CheckCircle2 } from 'lucide-react';

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
}) => {
  const totalLeads = leads.length;
  const leadsEmProspeccao = leads.filter(l => l.status === 'em_prospeccao' || l.status === 'contato_1' || l.status === 'contato_2' || l.status === 'contato_3').length;
  const leadsFechados = leads.filter(l => l.status === 'fechado').length;

  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] sticky top-0 z-30 flex flex-col transition-all">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-600 to-red-800 text-white font-black px-2.5 py-1.5 rounded-lg text-xl tracking-tighter shadow-sm">
            iCtx
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">
              CRM Prospecção
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
              Santander / GetNet
            </p>
          </div>
        </div>

        {/* Contadores Premium */}
        <div className="hidden lg:flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</p>
              <p className="font-bold text-slate-900 leading-none">{totalLeads}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <RotateCw className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Em Contato</p>
              <p className="font-bold text-slate-900 leading-none">{leadsEmProspeccao}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fechados</p>
              <p className="font-bold text-slate-900 leading-none">{leadsFechados}</p>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};