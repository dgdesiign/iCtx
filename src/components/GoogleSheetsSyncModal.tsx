import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  LogOut,
  X,
  AlertTriangle,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  Building,
  Clock,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { SpreadsheetInfo } from '../services/googleSheetsService';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  spreadsheet: SpreadsheetInfo | null;
  isLoading: boolean;
  lastSyncTime: string | null;
  totalLeads: number;
  onConnectGoogle: () => Promise<void>;
  onSyncToSheet: () => Promise<void>;
  onFetchFromSheet: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

const APPS_SCRIPT_SNIPPET = `function enviarResumoDiario() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaDados = ss.getSheetByName("Dados_CRM");
  if (!abaDados) return;
  var rows = abaDados.getDataRange().getValues();
  var resumo = "📊 iCtx — Resumo diário\\n\\n";
  var hoje = new Date().toDateString();
  var followupsHoje = 0, fechadosOntem = 0, totalLeads = 0;

  for (var i = 1; i < rows.length; i++) {
    var json = "";
    for (var c = 4; c < rows[i].length; c++) if (rows[i][c]) json += rows[i][c];
    if (!json) continue;
    try {
      var payload = JSON.parse(json);
      (payload.leads || []).forEach(function(l) {
        totalLeads++;
        if (l.proximoFollowUp && new Date(l.proximoFollowUp).toDateString() === hoje) followupsHoje++;
        if (l.status === 'fechado' && l.dataUltimoContato && 
            new Date(l.dataUltimoContato).toDateString() === new Date(Date.now() - 86400000).toDateString()) fechadosOntem++;
      });
    } catch(e) {}
  }

  resumo += "Total de leads na base: " + totalLeads + "\\n";
  resumo += "🔔 Follow-ups para hoje: " + followupsHoje + "\\n";
  resumo += "🎉 Fechados ontem: " + fechadosOntem + "\\n\\n";
  resumo += "Bora pra cima!";
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "iCtx · Resumo diário", resumo);
}`;

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  spreadsheet,
  isLoading,
  lastSyncTime,
  totalLeads,
  onConnectGoogle,
  onSyncToSheet,
  onFetchFromSheet,
  onDisconnect,
}) => {
  const [confirmAction, setConfirmAction] = useState<'upload' | 'download' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAppsScript, setShowAppsScript] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  if (!isOpen) return null;

  const handleConfirmUpload = async () => {
    setActionError(null);
    try {
      await onSyncToSheet();
      setConfirmAction(null);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao salvar no Google Planilhas.');
    }
  };

  const handleConfirmDownload = async () => {
    setActionError(null);
    try {
      await onFetchFromSheet();
      setConfirmAction(null);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao importar da planilha.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Google Planilhas · Base Oficial</h2>
              <p className="text-xs text-emerald-100">
                Sincronização na nuvem para manter seus leads seguros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {!user ? (
            /* Estado Desconectado - Botão Oficial do Google */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  Conecte sua Conta Google
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Ao conectar, o iCtx cria e gerencia uma planilha segura em seu Google Drive (
                  <strong>iCtx - Base de Leads PJ</strong>). Todas as anotações, status e etapas serão salvas em tempo real.
                </p>
              </div>

              {/* Botão Oficial Sign in with Google */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={onConnectGoogle}
                  disabled={isLoading}
                  className="flex items-center gap-3 px-5 py-3 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 shadow-xs transition-all font-semibold text-xs text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isLoading ? 'Conectando...' : 'Entrar com Google (dr.douglasilva@gmail.com)'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Permissão oficial restrita à planilha do CRM iCtx</span>
              </div>
            </div>
          ) : (
            /* Estado Conectado */
            <div className="space-y-4">
              {/* Usuário Conectado */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google User'}
                      className="w-10 h-10 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">
                        {user.displayName || 'Usuário Google'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Conectado
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{user.email}</span>
                  </div>
                </div>

                <button
                  onClick={onDisconnect}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Desconectar do Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Informações da Planilha */}
              {spreadsheet && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-xs text-emerald-900">
                        {spreadsheet.name}
                      </span>
                    </div>
                    <a
                      href={spreadsheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      <span>Abrir no Google Sheets</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-emerald-200/60">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Leads na memória:</span>
                      <span className="font-bold text-slate-800">{totalLeads} empresas</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Último salvamento:</span>
                      <span className="font-bold text-slate-800">
                        {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('pt-BR') : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Diálogo de Confirmação para Operações Mutantes (Exigência do SKILL.md) */}
              {confirmAction === 'upload' && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-amber-900">
                        Confirmar Salvamento na Planilha?
                      </h4>
                      <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                        Esta ação atualizará as linhas da planilha oficial com os {totalLeads} leads atuais do CRM.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmUpload}
                      disabled={isLoading}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Confirmar e Salvar</span>
                    </button>
                  </div>
                </div>
              )}

              {confirmAction === 'download' && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-amber-900">
                        Recarregar dados do Google Sheets?
                      </h4>
                      <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                        Isto lerá as linhas atuais da sua planilha e atualizará a tela do CRM.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmDownload}
                      disabled={isLoading}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Confirmar e Recarregar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Botões de Ação de Sincronização */}
              {!confirmAction && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => setConfirmAction('upload')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <UploadCloud className="w-4 h-4 text-emerald-700" />
                    <span>Salvar no Sheets</span>
                  </button>

                  <button
                    onClick={() => setConfirmAction('download')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <DownloadCloud className="w-4 h-4 text-slate-600" />
                    <span>Recarregar do Sheets</span>
                  </button>
                </div>
              )}

              {/* Sprint 6: Trigger Diário no Apps Script */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowAppsScript(!showAppsScript)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">
                          Automação Diária por E-mail (Apps Script)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Sprint 6
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Receba resumo diário às 8h com follow-ups pendentes e fechados
                      </p>
                    </div>
                  </div>
                  {showAppsScript ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {showAppsScript && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-200/80 bg-white">
                    <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside pl-1 pt-1">
                      <li>Abra a planilha conectada no Google Sheets.</li>
                      <li>Clique em <strong>Extensões</strong> &gt; <strong>Apps Script</strong>.</li>
                      <li>Cole o script abaixo no final do arquivo (sem apagar o que já existe).</li>
                      <li>No menu lateral, clique no ícone ⏰ <strong>Acionadores</strong> &gt; <strong>+ Adicionar acionador</strong>.</li>
                      <li>Escolha a função <code>enviarResumoDiario</code>, evento <strong>Baseado em tempo</strong> &gt; <strong>Contador de dias</strong> (8h às 9h).</li>
                    </ol>

                    <div className="relative">
                      <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-3 py-1.5 rounded-t-lg text-[11px] font-mono">
                        <span>Apps Script · enviarResumoDiario.js</span>
                        <button
                          type="button"
                          onClick={handleCopyScript}
                          className="flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                        >
                          {copiedScript ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Script</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-950 text-emerald-300 text-[11px] font-mono rounded-b-lg overflow-x-auto max-h-48 border border-slate-800 leading-relaxed">
                        {APPS_SCRIPT_SNIPPET}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Base 100% no Google Sheets · Sem risco de perda de dados
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
