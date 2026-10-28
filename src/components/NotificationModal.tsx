import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  X,
  Sparkles,
  Phone,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Lead } from '../types/crm';
import {
  NotificationStatus,
  requestNotificationPermission,
  sendTestNotification,
  sendFollowUpNotification,
} from '../services/notificationService';
import { ehFollowUpVencido } from '../utils/cadencia';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionStatus: NotificationStatus;
  onPermissionChange: (status: NotificationStatus) => void;
  leads: Lead[];
  onSelectLead?: (lead: Lead) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  permissionStatus,
  onPermissionChange,
  leads,
  onSelectLead,
}) => {
  const [testSent, setTestSent] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  if (!isOpen) return null;

  const leadsVencidosHoje = leads.filter((l) => ehFollowUpVencido(l));

  const handleRequestPermission = async () => {
    const novoStatus = await requestNotificationPermission();
    onPermissionChange(novoStatus);
    if (novoStatus === 'granted') {
      sendTestNotification();
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  const handleSendTest = () => {
    const success = sendTestNotification();
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  const handleSendFollowUpAlertNow = () => {
    if (leadsVencidosHoje.length > 0) {
      const success = sendFollowUpNotification(leadsVencidosHoje, true);
      if (success) {
        setAlertSent(true);
        setTimeout(() => setAlertSent(false), 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Lembretes & Web Push</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-bold border border-indigo-400/30">
                  9h da Manhã
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Notificações na tela para não deixar nenhum follow-up esfriar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Card de Status da Permissão */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Status no Navegador:</span>
              {permissionStatus === 'granted' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Ativo & Autorizado
                </span>
              )}
              {permissionStatus === 'default' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pendente de Autorização
                </span>
              )}
              {permissionStatus === 'denied' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Bloqueado no Navegador
                </span>
              )}
              {permissionStatus === 'unsupported' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                  Não suportado neste browser
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O iCtx dispara um alerta diário às <strong>9h da manhã</strong> na área de notificações do seu computador ou celular para todos os leads com follow-up agendado para o dia.
            </p>

            {/* Ações de Permissão e Teste */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>Permitir Notificações</span>
                </button>
              )}

              {permissionStatus === 'granted' && (
                <>
                  <button
                    type="button"
                    onClick={handleSendTest}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{testSent ? '✓ Notificação Enviada!' : 'Testar Notificação'}</span>
                  </button>

                  {leadsVencidosHoje.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSendFollowUpAlertNow}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5 text-amber-600" />
                      <span>{alertSent ? '✓ Alerta Disparado!' : 'Disparar Alerta Agora'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Lista de Follow-ups de Hoje */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Follow-ups Vencidos / Hoje ({leadsVencidosHoje.length})</span>
              </h3>
              {leadsVencidosHoje.length > 0 && (
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Ação Prioritária
                </span>
              )}
            </div>

            {leadsVencidosHoje.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">Tudo em dia!</p>
                <p className="text-[11px] text-slate-400">
                  Nenhum lead com follow-up pendente para hoje no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {leadsVencidosHoje.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3 bg-white border border-amber-200 hover:border-amber-300 rounded-xl shadow-2xs flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {lead.empresaExibicao}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                          {lead.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {lead.nomeContato} · {lead.telefonePrincipalFormatado} · {lead.municipio || 'Salvador'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://wa.me/55${lead.telefonePrincipal}?text=${encodeURIComponent(
                          `Oi ${lead.nomeContato}, tudo bem? Aqui é do Santander Empresas...`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                      {onSelectLead && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectLead(lead);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                        >
                          Dossiê
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Alerta nativo às 09:00:00 da manhã</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
