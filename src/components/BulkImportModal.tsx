import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
  ShieldCheck,
  Building2,
  Copy,
} from 'lucide-react';
import { Lead } from '../types/crm';
import {
  construirLead,
  consultarCnpj,
  formatarCnpj,
  formatarNome,
  limparCnpj,
  limparDigitos,
  extrairTokensInteligente,
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
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  existingLeads,
  onImportLeads,
}) => {
  const [textoEntrada, setTextoEntrada] = useState('');
  const [etapa, setEtapa] = useState<'colar' | 'processando' | 'concluido'>('colar');
  const [progresso, setProgresso] = useState<{ atual: number; total: number; empresaAtual: string }>({
    atual: 0,
    total: 0,
    empresaAtual: '',
  });
  const [resultadoFinal, setResultadoFinal] = useState<{ adicionados: number; duplicados: number }>({
    adicionados: 0,
    duplicados: 0,
  });
  const [menores1AnoDetectados, setMenores1AnoDetectados] = useState<Lead[]>([]);
  const [elegiveisPendentes, setElegiveisPendentes] = useState<Lead[]>([]);
  const [mostrarModalMenores, setMostrarModalMenores] = useState(false);

  // Conjunto de CNPJs já cadastrados na base
  const cnpjsExistentes = new Set(existingLeads.map((l) => l.cnpj));

  if (!isOpen) return null;

  // Analisa o texto colado e extrai as linhas com inteligência de tokens
  const analisarLinhas = (texto: string): ParsedRow[] => {
    const linhas = texto.split('\n');
    const parsed: ParsedRow[] = [];
    const cnpjsNoLote = new Set<string>();

    for (const linha of linhas) {
      const trimmed = linha.trim();
      if (!trimmed) continue;

      const extraido = extrairTokensInteligente(trimmed);

      // Se achou CNPJ válido com 14 dígitos
      if (extraido.cnpjLimpo && extraido.cnpjLimpo.length === 14) {
        const duplicado = cnpjsExistentes.has(extraido.cnpjLimpo) || cnpjsNoLote.has(extraido.cnpjLimpo);

        if (!duplicado) {
          cnpjsNoLote.add(extraido.cnpjLimpo);
        }

        parsed.push({
          telefoneBruto: extraido.telefoneLimpo || extraido.telefoneBruto,
          telefoneSecundarioBruto: extraido.telefoneSecundarioLimpo || extraido.telefoneSecundarioBruto,
          nomeBruto: extraido.nomeContatoLimpo || extraido.nomeBruto || 'Consultar Receita',
          cnpjBruto: extraido.cnpjBruto,
          cnpjLimpo: extraido.cnpjLimpo,
          isMeiDetectado: extraido.isMeiDetectado,
          valido: extraido.valido || extraido.cnpjLimpo.length === 14,
          duplicado,
        });
      }
    }

    return parsed;
  };

  const previewRows = analisarLinhas(textoEntrada);
  const totalValidos = previewRows.filter((r) => r.valido && !r.duplicado).length;
  const totalDuplicados = previewRows.filter((r) => r.duplicado).length;
  const totalInvalidos = previewRows.filter((r) => !r.valido).length;

  const handleCarregarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setTextoEntrada(content || '');
      };
      reader.readAsText(file);
    }
  };

  const handleExemplo = () => {
    setTextoEntrada(`71-30372720,71-988857562\tGABRIELA VILLACORTA GONCALVES\t67918942000124
71-987464876\tR S LEMOS\t63075435000115
71-999815825,71-00000000\tJORGE DE GOES COSTA\t61456484000172
71-991424511\t58.744.884 DIANA BRITO DE ALMEIDA MOTA\t58744884000179
71-992015421\tLUSIMARA SILVA TITO WEBER 46053000582\t41590567000142`);
  };

  const handleIniciarProcessamento = async () => {
    const linhasParaProcessar = previewRows.filter((r) => r.valido && !r.duplicado);
    if (linhasParaProcessar.length === 0) return;

    setEtapa('processando');
    setProgresso({ atual: 0, total: linhasParaProcessar.length, empresaAtual: '' });

    const novosLeads: Lead[] = [];

    for (let i = 0; i < linhasParaProcessar.length; i++) {
      const linha = linhasParaProcessar[i];
      setProgresso({
        atual: i + 1,
        total: linhasParaProcessar.length,
        empresaAtual: `Consultando CNPJ: ${formatarCnpj(linha.cnpjLimpo)} (${linha.nomeBruto})...`,
      });

      let dadosApi = null;
      try {
        dadosApi = await consultarCnpj(linha.cnpjLimpo);
      } catch (err) {
        console.warn('Erro ao consultar CNPJ:', linha.cnpjLimpo, err);
      }

      const lead = construirLead(
        linha.telefoneBruto,
        linha.nomeBruto,
        linha.cnpjLimpo,
        dadosApi,
        linha.telefoneSecundarioBruto
      );
      novosLeads.push(lead);

      // Pequena pausa (250ms) para respeitar limites da API pública
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const elegiveis: Lead[] = [];
    const menores: Lead[] = [];

    for (const lead of novosLeads) {
      // Calcula idade em dias desde cnpjInicio ou data da Receita
      const ref = lead.cnpjInicio || lead.dataAbertura;
      if (ref) {
        const dtIni = new Date(ref);
        const hoje = new Date();
        const umAnoAtras = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
        if (dtIni > umAnoAtras) {
          menores.push(lead);
        } else {
          elegiveis.push(lead);
        }
      } else {
        elegiveis.push(lead); // sem data → assume elegível
      }
    }

    if (menores.length > 0) {
      setMenores1AnoDetectados(menores);
      setElegiveisPendentes(elegiveis); // novo useState
      setMostrarModalMenores(true);
      return;
    }

    // Se não há menores, fluxo normal:
    onImportLeads(elegiveis);
    setResultadoFinal({ adicionados: elegiveis.length, duplicados: totalDuplicados });
    setEtapa('concluido');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Importação em Massa com Consulta na Receita
              </h3>
              <p className="text-xs text-slate-500">
                Cole sua lista de leads ou envie um arquivo para alimentar o seu pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content based on stage */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {etapa === 'colar' && (
            <>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cole o texto com Telefone, Nome e CNPJ:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExemplo}
                    className="text-xs text-emerald-700 hover:underline font-medium cursor-pointer"
                  >
                    Preencher exemplo
                  </button>
                  <span className="text-slate-300">·</span>
                  <label className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Subir arquivo .csv/.txt</span>
                    <input
                      type="file"
                      accept=".txt,.csv"
                      onChange={handleCarregarArquivo}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                rows={7}
                value={textoEntrada}
                onChange={(e) => setTextoEntrada(e.target.value)}
                placeholder="71-984036151	CHARLES	5315021000110&#10;71-993530364	LUCIENE	4220264000101&#10;71-991854402	DIEGO	7855405000150"
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 bg-slate-50/50"
              />

              {/* Format explanation tip */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Formato aceito:</strong> Copie diretamente do WhatsApp ou do Excel com{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-emerald-700">
                    Telefone [TAB] Nome [TAB] CNPJ
                  </code>. O robô ajusta zeros à esquerda automaticamente caso o CNPJ tenha 13 dígitos.
                </div>
              </div>

              {/* Parsing Preview Summary */}
              {previewRows.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">Resumo da análise do texto:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-700">{totalValidos} novos aptos</span>
                      {totalDuplicados > 0 && (
                        <span className="text-amber-700">{totalDuplicados} já existentes (ignora)</span>
                      )}
                      {totalInvalidos > 0 && (
                        <span className="text-rose-700">{totalInvalidos} inválidos</span>
                      )}
                    </div>
                  </div>

                  {/* Sample rows preview */}
                  <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-lg text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0">
                        <tr>
                          <th className="p-1.5">Telefone</th>
                          <th className="p-1.5">Contato</th>
                          <th className="p-1.5">CNPJ</th>
                          <th className="p-1.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-1.5 font-mono text-slate-600">{row.telefoneBruto}</td>
                            <td className="p-1.5 font-medium text-slate-800">{formatarNome(row.nomeBruto)}</td>
                            <td className="p-1.5 font-mono text-slate-600">{formatarCnpj(row.cnpjLimpo)}</td>
                            <td className="p-1.5">
                              {row.duplicado ? (
                                <span className="text-amber-700 font-medium">Já cadastrado</span>
                              ) : row.valido ? (
                                <span className="text-emerald-700 font-medium">Pronto para buscar</span>
                              ) : (
                                <span className="text-rose-700 font-medium">CNPJ incompleto</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Processing Screen */}
          {etapa === 'processando' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Consultando Dados Públicos na Receita Federal...
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto line-clamp-1">
                  {progresso.empresaAtual}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto space-y-1.5">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(progresso.atual / Math.max(progresso.total, 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-mono">
                  <span>{progresso.atual} de {progresso.total} leads</span>
                  <span>{Math.round((progresso.atual / Math.max(progresso.total, 1)) * 100)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Completed Screen */}
          {etapa === 'concluido' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  Importação Concluída com Sucesso!
                </h4>
                <p className="text-sm text-slate-600 mt-1">
                  <strong>{resultadoFinal.adicionados}</strong> novos leads enriquecidos com dados da Receita foram inseridos na coluna <strong>"Lead Novo"</strong> do seu Pipeline.
                </p>
                {resultadoFinal.duplicados > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    ({resultadoFinal.duplicados} leads ignorados por já estarem no sistema)
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          {etapa === 'colar' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={totalValidos === 0}
                onClick={handleIniciarProcessamento}
                className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  totalValidos > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Processar {totalValidos} Leads na Receita</span>
              </button>
            </>
          )}

          {etapa === 'concluido' && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Ver Leads no Pipeline
            </button>
          )}
        </div>

      </div>

      {mostrarModalMenores && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900">CNPJ com menos de 1 ano</h3>
                <p className="text-xs text-slate-600 mt-1">
                  {menores1AnoDetectados.length} lead(s) têm CNPJ aberto há menos de 1 ano.
                  Estes não pontuam como +1 ano em M0/M1 (valem 6 pts, não 10).
                </p>
                <p className="text-xs text-slate-500 mt-2 italic">
                  CNPJs &lt;1 ano: {menores1AnoDetectados.slice(0, 3).map((l) => l.empresaExibicao).join(', ')}
                  {menores1AnoDetectados.length > 3 && ` e mais ${menores1AnoDetectados.length - 3}...`}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onImportLeads(elegiveisPendentes);
                  setResultadoFinal({ adicionados: elegiveisPendentes.length, duplicados: totalDuplicados });
                  setMostrarModalMenores(false);
                  setEtapa('concluido');
                }}
                className="py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 cursor-pointer"
              >
                Importar só os {elegiveisPendentes.length} elegíveis
              </button>
              <button
                type="button"
                onClick={() => {
                  onImportLeads([...elegiveisPendentes, ...menores1AnoDetectados]);
                  setResultadoFinal({
                    adicionados: elegiveisPendentes.length + menores1AnoDetectados.length,
                    duplicados: totalDuplicados,
                  });
                  setMostrarModalMenores(false);
                  setEtapa('concluido');
                }}
                className="py-2 bg-amber-100 text-amber-900 rounded-lg text-sm font-bold hover:bg-amber-200 cursor-pointer"
              >
                Importar todos ({elegiveisPendentes.length + menores1AnoDetectados.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalMenores(false);
                  setEtapa('colar');
                }}
                className="py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Cancelar importação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
