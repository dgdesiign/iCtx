import React, { useState } from 'react';
import { X, UserPlus, Search, Loader2, Building2, User, Phone, Check } from 'lucide-react';
import { Lead } from '../types/crm';
import {
  construirLead,
  consultarCnpj,
  formatarCnpj,
  formatarNome,
  limparCnpj,
  limparDigitos,
} from '../services/cnpjService';

interface SingleLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Lead) => void;
  existingCnpjs: Set<string>;
}

export const SingleLeadModal: React.FC<SingleLeadModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  existingCnpjs,
}) => {
  const [cnpj, setCnpj] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [dadosReceita, setDadosReceita] = useState<any>(null);
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleBuscarCnpj = async () => {
    const limpo = limparCnpj(cnpj);
    if (limpo.length !== 14) {
      setErro('Digite um CNPJ válido com 14 números.');
      return;
    }

    setErro('');
    setBuscando(true);
    try {
      const data = await consultarCnpj(limpo);
      if (data) {
        setDadosReceita(data);
        const nomeFinal = data.nome_fantasia || data.razao_social || '';
        setEmpresa(formatarNome(nomeFinal));
      } else {
        setErro('CNPJ não encontrado na Receita Federal.');
      }
    } catch {
      setErro('Erro de conexão ao buscar CNPJ.');
    } finally {
      setBuscando(false);
    }
  };

  const handleSalvar = () => {
    const limpoCnpj = limparCnpj(cnpj);
    const limpoTel = limparDigitos(telefone);

    if (!nome.trim() || !limpoTel) {
      setErro('Preencha pelo menos o Nome e o Telefone.');
      return;
    }

    if (limpoCnpj.length === 14 && existingCnpjs.has(limpoCnpj)) {
      if (!confirm('Este CNPJ já está cadastrado no seu sistema. Deseja adicionar mesmo assim?')) {
        return;
      }
    }

    const lead = construirLead(limpoTel, nome, limpoCnpj, dadosReceita);
    if (empresa.trim()) {
      lead.empresaExibicao = formatarNome(empresa);
    }

    onAddLead(lead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              Cadastrar Lead Único
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-3.5 text-xs">
          
          {erro && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              CNPJ (Busca Automática na Receita)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="Ex: 53.150.210/0001-10"
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleBuscarCnpj}
                disabled={buscando}
                className="px-3.5 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {buscando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Buscar</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nome do Responsável / Contato
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Charles Santos"
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Telefone (WhatsApp)
            </label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Ex: (71) 98403-6151"
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nome da Empresa / Nome Fantasia
            </label>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Puxado da Receita ou digite..."
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600 text-xs font-medium"
            />
          </div>

          {dadosReceita && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 space-y-1">
              <span className="font-bold block">✓ Dados encontrados na Receita Federal:</span>
              <p>Razão Social: {dadosReceita.razao_social}</p>
              {dadosReceita.municipio && (
                <p>Localização: {dadosReceita.municipio}/{dadosReceita.uf}</p>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Salvar no Pipeline</span>
          </button>
        </div>

      </div>
    </div>
  );
};
