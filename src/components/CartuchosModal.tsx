import React, { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet, AlertTriangle, Loader2 } from 'lucide-react';

interface CartuchosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GitHubFile {
  name: string;
  download_url: string;
}

export const CartuchosModal: React.FC<CartuchosModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        // Busca a lista de arquivos na raiz do repositório
        const response = await fetch('https://api.github.com/repos/dgdesiign/iCtx/contents/');
        if (!response.ok) throw new Error('Falha ao acessar o GitHub');
        
        const data = await response.json();
        
        // Filtra apenas arquivos Excel e ordena do mais recente para o mais antigo
        const xlsxFiles = data
          .filter((f: any) => f.name.endsWith('.xlsx') && f.type === 'file')
          .sort((a: any, b: any) => b.name.localeCompare(a.name));
          
        setFiles(xlsxFiles);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar os cartuchos.');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cartuchos AK</h3>
              <p className="text-xs text-slate-500">Leads minerados prontos para o Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aviso Importante */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            <strong>Atenção:</strong> Baixe o cartucho e envie no Robô AK. Os leads só devem entrar no Kanban usando a função <strong>"Importar Retorno AK"</strong> após serem filtrados.
          </p>
        </div>

        {/* Lista de Arquivos */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-sm font-medium">Buscando cartuchos no GitHub...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium text-center border border-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="text-center py-10">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Nenhum cartucho encontrado no repositório.</p>
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.name} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-emerald-300 transition-colors">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded">Pronto para AK</span>
                  </div>
                  <a
                    href={file.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};