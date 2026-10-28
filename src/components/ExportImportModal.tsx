import React, { useRef } from 'react';
import { X, Download, Upload, FileSpreadsheet, ShieldCheck, Database } from 'lucide-react';
import { Lead, MessageTemplate } from '../types/crm';
import { exportarLeadsCsv } from '../utils/storage';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  templates: MessageTemplate[];
  onRestoreBackup: (leads: Lead[], templates: MessageTemplate[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  leads,
  templates,
  onRestoreBackup,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const backupData = {
      leads,
      templates,
      exportadoEm: new Date().toISOString(),
      versao: '2.0',
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_ictx_crm_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.leads)) {
            if (
              confirm(
                `Deseja restaurar ${parsed.leads.length} leads do arquivo de backup? Isso substituirá os dados atuais.`
              )
            ) {
              onRestoreBackup(parsed.leads, parsed.templates || templates);
              alert('Backup restaurado com sucesso!');
              onClose();
            }
          } else {
            alert('Arquivo de backup inválido.');
          }
        } catch {
          alert('Erro ao processar arquivo JSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              Backup & Exportação
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* CSV Export */}
          <div className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Planilha (CSV / Excel)</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Gera um arquivo compatível com Excel e Google Planilhas contendo todas as colunas enriquecidas da Receita Federal.
            </p>
            <button
              onClick={() => {
                exportarLeadsCsv(leads);
              }}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo CSV ({leads.length} leads)</span>
            </button>
          </div>

          {/* JSON Backup Download */}
          <div className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Backup Completo do Sistema (JSON)</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Salva todos os leads, histórico de contatos, anotações e templates customizados em um único arquivo de segurança.
            </p>
            <button
              onClick={handleExportJson}
              className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Salvar Backup JSON</span>
            </button>
          </div>

          {/* Restore JSON Backup */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Restaurar Backup Anterior</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Carrega um arquivo <code className="bg-white px-1 py-0.5 rounded border border-slate-200">.json</code> salvo anteriormente no computador ou celular.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Selecionar Arquivo de Backup</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
