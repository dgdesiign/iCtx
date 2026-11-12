import React from 'react';
import { Lead } from '../types/crm';
import { Users, RotateCw, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  leads: Lead[];
}

export const Header: React.FC<HeaderProps> = ({ leads }) => {
  const totalLeads = leads.length;
  const leadsEmProspeccao = leads.filter(l => l.status === 'em_prospeccao' || l.status === 'contato_1' || l.status === 'contato_2' || l.status === 'contato_3').length;
  const leadsFechados = leads.filter(l => l.status === 'fechado').length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 h-14 flex items-center px-4 md:px-6">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-red-600 text-white font-black px-2 py-1 rounded-md text-lg tracking-tighter shadow-sm">
            iCtx
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xs font-bold text-slate-900 tracking-tight leading-none">
              CRM Prospecção
            </h1>
            <p className="text-[9px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
              Santander / GetNet
            </p>
          </div>
        </div>

        {/* Contadores (Desktop apenas) */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</p>
              <p className="font-bold text-slate-800 text-xs leading-none">{totalLeads}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Contato</p>
              <p className="font-bold text-slate-800 text-xs leading-none">{leadsEmProspeccao}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Fechados</p>
              <p className="font-bold text-slate-800 text-xs leading-none">{leadsFechados}</p>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
