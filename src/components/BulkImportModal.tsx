import React, { useState } from 'react';
import {
  X, FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Loader2, Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Lead } from '../types/crm';
import {
  construirLead, consultarCnpj, formatarCnpj, formatarNome, extrairTokensInteligente, limparDigitos,
} from '../services/cnpjService';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLeads: Lead[];
  onImportLeads: (novosLeads: Lead[]) => void;
}

interface ParsedRow {
  telefoneBruto: string;
  telefoneSecundarioBruto?: string;
  nomeBruto: string;
  cnpjBruto: string;
  cnpjLimpo: string;
  isMeiDetectado?: boolean;
  valido: boolean;
  duplicado: boolean;
  simDisponivel?: boolean; // NOVO
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen, onClose, existingLeads, onImportLeads,
}) => {
  const [textoEntrada, setTextoEntrada] = useState('');
  const [etapa, setEtapa] = useState<'colar' | 'processando' | 'concluido'>('colar');
  const [progresso, setProgresso] = useState({ atual: 0, total: 0, empresaAtual: '' });
  const [resultadoFinal, setResultadoFinal] = useState({ adicionados: 0, duplicados: 0 });
  const [menores1AnoDetectados, setMenores1AnoDetectados] = useState<Lead[]>([]);
  const [elegiveisPendentes, setElegiveisPendentes] = useState<Lead[]>([]);
  const [mostrarModalMenores, setMostrarModalMenores] = useState(false);

  const cnpjsExistentes = new Set(existingLeads.map((l) => l.cnpj));
  if (!isOpen) return null;

  const analisarLinhas = (texto: string): ParsedRow[] => {
    const linhas = texto.split('\n');
    const parsed: ParsedRow[] = [];
    const cnpjsNoLote = new Set<string>();

    for (const linha of linhas) {
      const trimmed = linha.trim();
      if (!trimmed) continue;

      // Verifica se a linha contém "sim disponível"
      const simDisponivel = trimmed.toLowerCase().includes('sim disponível') || trimmed.toLowerCase().includes('sim disponivel');
      
      // Remove a palavra "sim disponível" para não sujar o nome ou tokens
      const linhaLimpa = trimmed.replace(/sim disponível/gi, '').replace(/sim disponivel/gi, '').trim();

      const extraido = extrairTokensInteligente(linhaLimpa);

      if (extraido.cnpjLimpo && extraido.cnpjLimpo.length === 14) {
        const duplicado = cnpjsExistentes.has(extraido.cnpjLimpo) || cnpjsNoLote.has(extraido.cnpjLimpo);
        if (!duplicado) cnpjsNoLote.add(extraido.cnpjLimpo);

        parsed.push({
          telefoneBruto: extraido.telefoneLimpo || extraido.telefoneBruto,
          telefoneSecundarioBruto: extraido.telefoneSecundarioLimpo || extraido.telefoneSecundarioBruto,
          nomeBruto: extraido.nomeContatoLimpo || extraido.nomeBruto || 'Consultar Receita',
          cnpjBruto: extraido.cnpjBruto,
          cnpjLimpo: extraido.cnpjLimpo,
          isMeiDetectado: extraido.isMeiDetectado,
          valido: extraido.valido || extraido.cnpjLimpo.length === 14,
          duplicado,
          simDisponivel,
        });
      }
    }
    return parsed;
  };

  const previewRows = analisarLinhas(textoEntrada);
  const totalValidos = previewRows.filter((r) => r.valido && !r.duplicado).length;
  const totalDuplicados = previewRows.filter((r) => r.duplicado).length;
  const totalInvalidos = previewRows.filter((r) => !r.valido).length;

  const handleCarregarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        const textoConvertido = data.map(row => row.join('\t')).join('\n');
        setTextoEntrada(textoConvertido);
      } catch (err) {
        alert("Erro ao ler o arquivo Excel.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => setTextoEntrada(event.target?.result as string || '');
      reader.readAsText(file);
    }
  };

  const handleIniciarProcessamento = async () => {
    const linhasParaProcessar = previewRows.filter((r) => r.valido && !r.duplicado);
    if (linhasParaProcessar.length === 0) return;

    setEtapa('processando');
    setProgresso({ atual: 0, total: linhasParaProcessar.length, empresaAtual: '' });

    const novosLeads: Lead[] = [];

    for (let i = 0; i < linhasParaProcessar.length; i++) {
      const linha = linhasParaProcessar[i];
      setProgresso({ atual: i + 1, total: linhasParaProcessar.length, empresaAtual: `Consultando: ${formatarCnpj(linha.cnpjLimpo)}...` });

      let dadosApi = null;
      try { dadosApi = await consultarCnpj(linha.cnpjLimpo); } catch (err) {}

      // Prioriza WhatsApp
      if (dadosApi) {
        const tel1 = dadosApi.ddd_telefone_1 || '';
        const tel2 = dadosApi.ddd_telefone_2 || '';
        const isCel1 = limparDigitos(tel1).length === 11 && limparDigitos(tel1)[2] === '9';
        const isCel2 = limparDigitos(tel2).length === 11 && limparDigitos(tel2)[2] === '9';

        if (isCel1) {
          linha.telefoneBruto = tel1;
          if (isCel2 || limparDigitos(tel2).length >= 10) linha.telefoneSecundarioBruto = tel2;
        } else if (isCel2) {
          linha.telefoneBruto = tel2;
          if (limparDigitos(tel1).length >= 10) linha.telefoneSecundarioBruto = tel1;
        } else {
          if (!linha.telefoneBruto) linha.telefoneBruto = tel1 || tel2;
        }
      }

      const lead = construirLead(linha.telefoneBruto, linha.nomeBruto, linha.cnpjLimpo, dadosApi, linha.telefoneSecundarioBruto);
      
      // Se foi marcado como Sim Disponível, aplica a tag verde
      if (linha.simDisponivel) {
        lead.parceiroSantander = { status: 'apto', verificadoEm: new Date().toISOString() };
      }

      novosLeads.push(lead);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const elegiveis: Lead[] = [];
    const menores: Lead[] = [];
    for (const lead of novosLeads) {
      const ref = lead.cnpjInicio || lead.dataAbertura;
      if (ref) {
        const dtIni = new Date(ref);
        const hoje = new Date();
        const umAnoAtras = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
        if (dtIni > umAnoAtras) menores.push(lead);
        else elegiveis.push(lead);
      } else elegiveis.push(lead);
    }

    if (menores.length > 0) {
      setMenores1AnoDetectados(menores);
      setElegiveisPendentes(elegiveis); 
      setMostrarModalMenores(true);
      return;
    }

    onImportLeads(elegiveis);
    setResultadoFinal({ adicionados: elegiveis.length, duplicados: totalDuplicados });
    setEtapa('concluido');
  };

  // ... O restante do JSX de renderização do modal é o mesmo da versão anterior ...
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Importação em Massa</h3>
              <p className="text-xs text-slate-500">Identifica "Sim Disponível" e marca como Apto</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {etapa === 'colar' && (
            <>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Cole ou suba o arquivo:</label>
                <label className="text-xs text-emerald-700 hover:underline font-medium cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Subir arquivo .xlsx/.csv</span>
                  <input type="file" accept=".txt,.csv,.xlsx,.xls" onChange={handleCarregarArquivo} className="hidden" />
                </label>
              </div>
              <textarea
                rows={7}
                value={textoEntrada}
                onChange={(e) => setTextoEntrada(e.target.value)}
                placeholder="Cole a planilha do AK aqui..."
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 bg-slate-50/50"
              />
              {previewRows.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">Resumo:</span>
                    <span className="text-emerald-700">{totalValidos} novos aptos {totalDuplicados > 0 && `(${totalDuplicados} já existentes)`}</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-lg text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0">
                        <tr><th className="p-1.5">Telefone</th><th className="p-1.5">Contato</th><th className="p-1.5">CNPJ</th><th className="p-1.5">Apto?</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-1.5 font-mono">{row.telefoneBruto}</td>
                            <td className="p-1.5 font-medium">{formatarNome(row.nomeBruto)}</td>
                            <td className="p-1.5 font-mono">{formatarCnpj(row.cnpjLimpo)}</td>
                            <td className="p-1.5">{row.simDisponivel ? <span className="text-emerald-700 font-bold">Sim</span> : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {etapa === 'processando' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Consultando a Receita Federal...</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto line-clamp-1">{progresso.empresaAtual}</p>
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-300" style={{ width: `${(progresso.atual / Math.max(progresso.total, 1)) * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-mono">
                  <span>{progresso.atual} de {progresso.total}</span>
                  <span>{Math.round((progresso.atual / Math.max(progresso.total, 1)) * 100)}%</span>
                </div>
              </div>
            </div>
          )}

          {etapa === 'concluido' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Importação Concluída!</h4>
                <p className="text-sm text-slate-600 mt-1"><strong>{resultadoFinal.adicionados}</strong> leads adicionados com sucesso.</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          {etapa === 'colar' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl">Cancelar</button>
              <button disabled={totalValidos === 0} onClick={handleIniciarProcessamento} className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 ${totalValidos > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'bg-slate-200 text-slate-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Processar {totalValidos} Leads</span>
              </button>
            </>
          )}
          {etapa === 'concluido' && <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl">Ver no Pipeline</button>}
        </div>
      </div>

      {mostrarModalMenores && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900">CNPJ com menos de 1 ano</h3>
                <p className="text-xs text-slate-600 mt-1">{menores1AnoDetectados.length} lead(s) têm CNPJ aberto há menos de 1 ano.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button onClick={() => { onImportLeads(elegiveisPendentes); setResultadoFinal({ adicionados: elegiveisPendentes.length, duplicados: totalDuplicados }); setMostrarModalMenores(false); setEtapa('concluido'); }} className="py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Importar só elegíveis</button>
              <button onClick={() => { onImportLeads([...elegiveisPendentes, ...menores1AnoDetectados]); setResultadoFinal({ adicionados: elegiveisPendentes.length + menores1AnoDetectados.length, duplicados: totalDuplicados }); setMostrarModalMenores(false); setEtapa('concluido'); }} className="py-2 bg-amber-100 text-amber-900 rounded-lg text-sm font-bold">Importar todos</button>
              <button onClick={() => { setMostrarModalMenores(false); setEtapa('colar'); }} className="py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
