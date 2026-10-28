import { Lead } from '../types/crm';
import { ehFollowUpVencido } from '../utils/cadencia';

const STORAGE_LAST_NOTIF_DATE = 'ictx_last_notif_date_9am';
const STORAGE_NOTIF_ENABLED = 'ictx_notifications_enabled';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Retorna o status atual de permissão de notificações do navegador.
 */
export function getNotificationPermissionStatus(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita ao usuário a permissão para disparar notificações no navegador.
 */
export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(STORAGE_NOTIF_ENABLED, 'true');
    }
    return permission;
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificações:', err);
    return Notification.permission;
  }
}

/**
 * Dispara uma notificação nativa do navegador para leads com follow-up pendente.
 */
export function sendFollowUpNotification(leadsVencidos: Lead[], force: boolean = false): boolean {
  if (getNotificationPermissionStatus() !== 'granted') {
    return false;
  }

  if (!leadsVencidos || leadsVencidos.length === 0) {
    return false;
  }

  const hojeIsoDate = new Date().toISOString().slice(0, 10);
  const ultimaDataNotificada = localStorage.getItem(STORAGE_LAST_NOTIF_DATE);

  // Evita spam no mesmo dia a menos que seja forçado manualmente
  if (!force && ultimaDataNotificada === hojeIsoDate) {
    return false;
  }

  const qtd = leadsVencidos.length;
  const primeiroLead = leadsVencidos[0];
  const titulo = `🔔 iCtx CRM · ${qtd === 1 ? '1 Follow-up' : `${qtd} Follow-ups`} para Hoje!`;
  
  const corpo = qtd === 1
    ? `${primeiroLead.empresaExibicao} (${primeiroLead.nomeContato}) tem contato agendado para hoje. Não perca o timing!`
    : `${primeiroLead.empresaExibicao} e mais ${qtd - 1} empresa(s) aguardam seu contato hoje. Abra o iCtx para disparar as mensagens.`;

  try {
    const notification = new Notification(titulo, {
      body: corpo,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'ictx-followup-alert',
      data: {
        url: window.location.href,
        totalLeads: qtd,
      },
    } as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    localStorage.setItem(STORAGE_LAST_NOTIF_DATE, hojeIsoDate);
    return true;
  } catch (err) {
    console.warn('Falha ao instanciar Notification diretamente, tentando Service Worker:', err);
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(titulo, {
          body: corpo,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'ictx-followup-alert',
        });
        localStorage.setItem(STORAGE_LAST_NOTIF_DATE, hojeIsoDate);
      });
      return true;
    }
    return false;
  }
}

/**
 * Dispara uma notificação de teste imediata para o usuário validar a integração.
 */
export function sendTestNotification(): boolean {
  if (getNotificationPermissionStatus() !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification('🔔 iCtx CRM · Notificação de Teste', {
      body: 'Perfeito! Seus lembretes matinais diários às 9h estão configurados com sucesso.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'ictx-test-notification',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.error('Erro ao enviar notificação de teste:', err);
    return false;
  }
}

/**
 * Configura o agendamento do lembrete diário para as 09:00:00 da manhã.
 * Retorna uma função de desmonte (cleanup) para limpar timers.
 */
export function setupDaily9AmReminder(getLeads: () => Lead[]): () => void {
  let timeoutId: number | undefined;
  let intervalId: number | undefined;

  const checarDisparo = (isFromTimer: boolean = false) => {
    if (getNotificationPermissionStatus() !== 'granted') return;

    const leads = getLeads();
    const leadsVencidos = leads.filter((l) => ehFollowUpVencido(l));
    if (leadsVencidos.length === 0) return;

    const agora = new Date();
    const hojeIso = agora.toISOString().slice(0, 10);
    const ultimaNotif = localStorage.getItem(STORAGE_LAST_NOTIF_DATE);

    // Se é 9h ou após 9h e ainda não notificou hoje
    if (agora.getHours() >= 9 && ultimaNotif !== hojeIso) {
      sendFollowUpNotification(leadsVencidos, false);
    } else if (isFromTimer) {
      sendFollowUpNotification(leadsVencidos, false);
    }
  };

  // 1. Checagem imediata ao abrir o app (se já passou das 9h de hoje e ainda não foi avisado)
  checarDisparo(false);

  // 2. Calcula milissegundos até as próximas 09:00:00
  const agora = new Date();
  const proxima9h = new Date(agora);
  proxima9h.setHours(9, 0, 0, 0);

  if (agora >= proxima9h) {
    // 9h de hoje já passou, agenda para 9h de amanhã
    proxima9h.setDate(proxima9h.getDate() + 1);
  }

  const msAteProxima9h = proxima9h.getTime() - agora.getTime();

  // Agenda timeout para as próximas 9h
  timeoutId = window.setTimeout(() => {
    checarDisparo(true);

    // Depois do primeiro disparo às 9h, repete diariamente a cada 24 horas
    intervalId = window.setInterval(() => {
      checarDisparo(true);
    }, 24 * 60 * 60 * 1000);
  }, msAteProxima9h);

  return () => {
    if (timeoutId) window.clearTimeout(timeoutId);
    if (intervalId) window.clearInterval(intervalId);
  };
}
