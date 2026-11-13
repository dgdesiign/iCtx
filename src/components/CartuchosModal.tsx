import React, { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet, Loader2, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';

interface CartuchosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CartuchoArquivo {
  name: string;
  download_url: string;
  size: number;
}

export const CartuchosModal: React.FC<CartuchosModalProps> = ({ isOpen, onClose }) => {
  const [arquivos, setArquivos] = useState<CartuchoArquivo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarCartuchos = async () => {
    setCarregando(true);
    setErro(null);
    
    try {
      // O parâmetro 't=' força o navegador a não usar cache e buscar fresco do GitHub
      const url = `https://api.github.com/repos/dgdesiign/iCtx/contents/cartuchos?ref=main&t=${Date.now()}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Limite do GitHub atingido. Tente novamente mais tarde.');
        }
        throw new Error(`Falha na comunicação com GitHub (Erro ${response.status})`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('O GitHub retornou um formato de dados inesperado.');
      }

      // Filtra estritamente por arquivos (não pastas) que terminam com .xlsx
      const arquivosXlsx = data
        .filter((item: any) => item.type === 'file' && item.name.toLowerCase().endsWith('.xlsx'))
        .map((item: any) => ({
          name: item.name,
          download_url: item.download_url,
          size: item.size || 0
        }));

      // Ordena do mais recente para o mais antigo (pelo nome)
      arquivosXlsx.sort((a: any, b: any) => b.name.localeCompare(a.name));
      
      setArquivos(arquivosXlsx);

    } catch (err: any) {
      console.error('[Cartuchos] Erro detalhado:', err);
      setErro(err.message || 'Não foi possível carregar a lista de cartuchos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (isOpen) carregarCartuchos();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        <div className="px-5 py-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-slate-900">Cartuchos AK</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={carregarCartuchos} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg" title="Atualizar lista">
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 max-h-[60vh] overflow-y-auto space-y-2">
          {carregando && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-red-600" />
              <p className="text-sm font-medium">Buscando cartuchos...</p>
            </div>
          )}

          {erro && !carregando && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm text-rose-800 font-medium">{erro}</p>
              <a 
                href="https://github.com/dgdesiign/iCtx/tree/main/cartuchos" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-rose-300 text-rose-700 rounded-lg text-sm font-bold shadow-sm hover:bg-rose-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Abrir pasta no GitHub
              </a>
            </div>
          )}

          {!carregando && !erro && arquivos.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              Nenhum arquivo .xlsx encontrado.
            </div>
          )}

          {!carregando && !erro && arquivos.map((arquivo) => (
            <div key={arquivo.name} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-red-300 transition-colors">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-sm font-bold text-slate-800 truncate">{arquivo.name}</p>
                <p className="text-[10px] text-slate-500">{(arquivo.size / 1024).toFixed(1)} KB</p>
              </div>
              <a 
                href={arquivo.download_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors shrink-0"
                title="Baixar arquivo"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
