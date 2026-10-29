import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  carregarLeads,
  salvarLeads,
  carregarTemplates,
  salvarTemplates,
  exportarLeadsCsv,
  aplicarMudancaStatusCadencia,
} from './utils/storage';
import { mergeLeads3, hashLead, isSampleLeadId } from './utils/syncMerge';
import { Lead, LeadStatus, MessageTemplate, EquipeMembro } from './types/crm';
import { ehFollowUpVencido } from './utils/cadencia';
import { calcularScore } from './utils/scoring';
import { Header } from './components/Header';
import { PipelineKanban, CadenciaFiltro } from './components/PipelineKanban';
import { BatchMessageModal } from './components/BatchMessageModal';
import { CoachModal } from './components/CoachModal';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { MessageComposerModal } from './components/MessageComposerModal';
import { CallScriptModal } from './components/CallScriptModal';
import { LeadDetailDrawer } from './components/LeadDetailDrawer';
import { BulkImportModal } from './components/BulkImportModal';
import { SingleLeadModal } from './components/SingleLeadModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { ExportImportModal } from './components/ExportImportModal';
import { InstallAppModal } from './components/InstallAppModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { NotificationModal } from './components/NotificationModal';
import {
  getNotificationPermissionStatus,
  setupDaily9AmReminder,
  NotificationStatus,
} from './services/notificationService';
import {
  Building2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Database,
  ClipboardPaste,
} from 'lucide-react';
import { construirLead, autocorrigeLead } from './services/cnpjService';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logoutGoogle,
  initAuth,
  getAccessToken,
  setCachedAccessToken,
  tentarReautenticar,
} from './services/googleAuthService';
import {
  findOrCreateSpreadsheet,
  fetchLeadsFromSheet,
  saveAllLeadsToSheet,
  appendContactLogToSheet,
  SpreadsheetInfo,
} from './services/googleSheetsService';

// Helpers de persistência da Base de Sincronização 3-Way (ictx_sync_base)
const carregarBaseSync = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem('ictx_sync_base');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const salvarBaseSync = (listaLeads: Lead[]) => {
  try {
    const base: Record<string, string> = {};
    for (const l of listaLeads) {
      if (l && l.id && !isSampleLeadId(l.id)) {
        const chave = l.cnpj || ('id:' + l.id);
        base[chave] = hashLead(l);
        base[l.id] = hashLead(l);
      }
    }
    localStorage.setItem('ictx_sync_base', JSON.stringify(base));
  } catch (err) {
    console.warn('Erro ao gravar base de sincronização no localStorage:', err);
  }
};

export default function App() {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const salvos = carregarLeads();
    if (salvos.length > 0) {
      // Descarta incondicionalmente leads de exemplo (/^lead_[1-9]\d?$/)
      return salvos
        .filter((l) => l && l.id && !isSampleLeadId(l.id))
        .map((l) => autocorrigeLead(l));
    }
    return [];
  });

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => carregarTemplates());
  const [filtroCadencia, setFiltroCadencia] = useState<CadenciaFiltro>('todos');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Modais
  const [isSupervisorOpen, setIsSupervisorOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationStatus>(() =>
    getNotificationPermissionStatus()
  );
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isSingleLeadOpen, setIsSingleLeadOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isBannerExpanded, setIsBannerExpanded] = useState(false);

  // Perfil do Usuário Ativo (Sprint 5)
  const [usuarioAtivo, setUsuarioAtivo] = useState<{
    nome: string;
    email: string;
    role: 'supervisor' | 'executivo';
  }>({
    nome: 'Douglas Krüger',
    email: 'dr.douglasilva@gmail.com',
    role: 'supervisor',
  });

  // Quantidade de follow-ups vencidos ou para hoje
  const followupsHojeCount = useMemo(() => {
    return leads.filter((l) => ehFollowUpVencido(l)).length;
  }, [leads]);

  // Agendador de Lembrete Diário Web Push às 9h da manhã
  useEffect(() => {
    const cleanup = setupDaily9AmReminder(() => leads);
    return () => cleanup();
  }, [leads]);

  // Leads filtrados respeitando busca, status e cadência
  const leadsFiltrados = useMemo(() => {
    return leads.filter((lead) => {
      const textoBusca = busca.toLowerCase().trim();
      const matchBusca =
        !textoBusca ||
        lead.empresaExibicao.toLowerCase().includes(textoBusca) ||
        lead.nomeContato.toLowerCase().includes(textoBusca) ||
        lead.cnpj.includes(textoBusca) ||
        (lead.municipio || '').toLowerCase().includes(textoBusca);

      const matchStatus = filtroStatus === 'todos' || lead.status === filtroStatus;

      const matchCadencia =
        filtroCadencia === 'todos'
          ? true
          : filtroCadencia === 'followup_hoje'
          ? ehFollowUpVencido(lead)
          : filtroCadencia === 'score'
          ? calcularScore(lead) >= 75
          : true;

      return matchBusca && matchStatus && matchCadencia;
    });
  }, [leads, busca, filtroStatus, filtroCadencia]);

  const leadsEquipe = useMemo(() => {
    return [
      {
        nome: usuarioAtivo.nome,
        email: usuarioAtivo.email,
        role: usuarioAtivo.role,
        payload: { leads },
      },
    ];
  }, [leads, usuarioAtivo]);

  // Estados do Google Sheets & Workspace
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(() => {
    try {
      const saved = localStorage.getItem('ictx_google_spreadsheet');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isGoogleSyncing, setIsGoogleSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('ictx_last_sync_time');
  });

  // Salva metadados da planilha no storage
  useEffect(() => {
    if (spreadsheet) {
      localStorage.setItem('ictx_google_spreadsheet', JSON.stringify(spreadsheet));
    }
  }, [spreadsheet]);

  // Contagem de leads alterados apenas localmente (hash local diferente de base[id]) sem sessão Google ativa
  const dirtyCount = useMemo(() => {
    if (currentUser) return 0;
    const base = carregarBaseSync();
    return leads.filter((l) => {
      if (!l || !l.id || isSampleLeadId(l.id)) return false;
      return hashLead(l) !== base[l.id];
    }).length;
  }, [leads, currentUser]);

  // Contagem de pendências de sync e helper de retry (S-ATIVAÇÃO-A)
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  function calcularPendenciasLocais(): number {
    const baseRaw = localStorage.getItem('ictx_sync_base');
    if (!baseRaw) return leads.length;
    try {
      const base: Record<string, string> = JSON.parse(baseRaw);
      let pendentes = 0;
      leads.forEach((l) => {
        if (!l || !l.id || isSampleLeadId(l.id)) return;
        const cnpj = l.cnpj || ('id:' + l.id);
        if (base[cnpj] !== hashLead(l)) pendentes++;
      });
      return pendentes;
    } catch {
      return leads.length;
    }
  }

  async function executarComRetry(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      setPendingSyncCount(0);
    } catch (e: any) {
      if (e?.message === 'TOKEN_EXPIRADO') {
        const renovado = await tentarReautenticar();
        if (renovado) {
          try {
            await fn(); // retry uma vez
            setPendingSyncCount(0);
            return;
          } catch {
            // fallback abaixo
          }
        }
        setPendingSyncCount((prev) => prev + 1);
        console.warn('[sync] token expirado, pendências:', pendingSyncCount + 1);
      } else {
        throw e;
      }
    }
  }

  // Recalcula pendingSyncCount quando leads ou spreadsheet mudam (se não estiver salvando)
  useEffect(() => {
    if (!isSavingToSheetRef.current && currentUser && spreadsheet?.id) {
      setPendingSyncCount(calcularPendenciasLocais());
    }
  }, [leads, spreadsheet?.id, currentUser]);

  // Travas de proteção para evitar loops e sobrescritas destrutivas
  const isInitialMountRef = useRef(true);
  const isLoadingFromSheetRef = useRef(false);
  const isSavingToSheetRef = useRef(false);
  const firstMergeDoneRef = useRef(false);
  const pendingSaveLeadsRef = useRef<Lead[] | null>(null);

  // Executa autoteste de merge em ambiente de desenvolvimento (DEV)
  useEffect(() => {
    if (import.meta.env.DEV) {
      import('./utils/syncMerge').then(({ selfTestMerge }) => {
        const falhas = selfTestMerge();
        if (falhas.length > 0) {
          console.error('[syncMerge selfTest]: Falhas encontradas no merge 3-way:', falhas);
        } else {
          console.log('[syncMerge selfTest]: Todos os testes unitários do merge 3-way passaram.');
        }
      });
    }
  }, []);

  // Listener de autenticação Firebase / Google e execução do 1º merge da sessão
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        setCachedAccessToken(token);

        // Se houver planilha conectada e o 1º merge ainda não ocorreu nesta sessão, executa merge seguro
        if (!firstMergeDoneRef.current && spreadsheet?.id) {
          try {
            setIsGoogleSyncing(true);
            isLoadingFromSheetRef.current = true;
            const leadsRemotos = await fetchLeadsFromSheet(spreadsheet.id, token);
            const base = carregarBaseSync();
            let listaMerged: Lead[] = [];
            setLeads((locaisAtuais) => {
              const { merged, conflitos } = mergeLeads3(locaisAtuais, leadsRemotos, base);
              if (conflitos > 0) {
                console.info(`[Sync Merge] ${conflitos} conflito(s) resolvido(s) priorizando estado local.`);
              }
              listaMerged = merged;
              return merged;
            });
            await saveAllLeadsToSheet(spreadsheet.id, listaMerged, token);
            salvarBaseSync(listaMerged);
            firstMergeDoneRef.current = true;
            const agora = new Date().toISOString();
            setLastSyncTime(agora);
            localStorage.setItem('ictx_last_sync_time', agora);
          } catch (err) {
            console.warn('Aviso: Falha ao executar o merge inicial da sessão com Google Sheets:', err);
          } finally {
            isLoadingFromSheetRef.current = false;
            setIsGoogleSyncing(false);
          }
        }
      },
      () => {
        setCurrentUser(null);
        firstMergeDoneRef.current = false;
      }
    );
    return () => unsubscribe();
  }, [spreadsheet?.id]);

  // Seleções ativas
  const [leadParaMensagem, setLeadParaMensagem] = useState<Lead | null>(null);
  const [leadParaLigacao, setLeadParaLigacao] = useState<Lead | null>(null);
  const [leadParaDetalhes, setLeadParaDetalhes] = useState<Lead | null>(null);
  const [leadParaCoach, setLeadParaCoach] = useState<Lead | null>(null);

  // Sincroniza leads no storage local instantâneo
  useEffect(() => {
    salvarLeads(leads);
  }, [leads]);

  // Auto-salvamento debounced no Google Sheets: habilitado APENAS após o 1º merge na sessão completar
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (!firstMergeDoneRef.current) return;
    if (!currentUser || !spreadsheet?.id) return;
    if (isLoadingFromSheetRef.current || isSavingToSheetRef.current) return;

    pendingSaveLeadsRef.current = leads;

    const timeout = setTimeout(async () => {
      try {
        if (isLoadingFromSheetRef.current) return;
        if (!spreadsheet?.id || !pendingSaveLeadsRef.current) return;

        isSavingToSheetRef.current = true;
        setIsGoogleSyncing(true);
        const dadosParaSalvar = pendingSaveLeadsRef.current;

        await executarComRetry(async () => {
          const token = await getAccessToken();
          if (!token) throw new Error('TOKEN_EXPIRADO');
          await saveAllLeadsToSheet(spreadsheet.id, dadosParaSalvar, token);
        });

        salvarBaseSync(dadosParaSalvar);
        pendingSaveLeadsRef.current = null;
        const agora = new Date().toISOString();
        setLastSyncTime(agora);
        localStorage.setItem('ictx_last_sync_time', agora);
      } catch (err) {
        console.warn('Auto-save no Google Sheets falhou:', err);
      } finally {
        isSavingToSheetRef.current = false;
        setIsGoogleSyncing(false);
      }
    }, 3000); // Debounce de 3s conforme REGRAS.md §3

    return () => clearTimeout(timeout);
  }, [leads, currentUser, spreadsheet?.id]);

  // Descarrega imediatamente saves pendentes ao fechar ou ocultar a página se a sessão for válida
  useEffect(() => {
    const flushPendingSave = async () => {
      if (!firstMergeDoneRef.current || !pendingSaveLeadsRef.current || !spreadsheet?.id) return;
      try {
        const token = await getAccessToken();
        if (token) {
          const dadosParaSalvar = pendingSaveLeadsRef.current;
          pendingSaveLeadsRef.current = null;
          await saveAllLeadsToSheet(spreadsheet.id, dadosParaSalvar, token);
          salvarBaseSync(dadosParaSalvar);
        }
      } catch (e) {
        console.warn('Erro ao descarregar save pendente no background:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    };

    const handlePageHide = () => {
      flushPendingSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [spreadsheet?.id]);

  // Sincroniza templates no storage
  useEffect(() => {
    salvarTemplates(templates);
  }, [templates]);

  // Migração idempotente por lead: copia dataAbertura (fundação Receita) para cnpjInicio quando não fechado
  useEffect(() => {
    setLeads((prev) => {
      let alterado = false;
      const migrados = prev.map((l) => {
        if (l.dataAbertura && !l.cnpjInicio && l.status !== 'fechado') {
          alterado = true;
          return { ...l, cnpjInicio: l.dataAbertura };
        }
        return l;
      });
      return alterado ? migrados : prev;
    });
  }, []); // roda só no mount

  // useEffect B — Saneamento de telefone/nome/empresa (roda sempre)
  useEffect(() => {
    const leadsSaneados = leads.map((l) => autocorrigeLead(l));
    if (JSON.stringify(leadsSaneados) !== JSON.stringify(leads)) {
      setLeads(leadsSaneados);
    }
  }, []); // roda só no mount (leads muda depois via outros handlers)

  // useEffect C — Migration de reparo para leads com pixCount>=3 mas sem contaAtivaEm
  useEffect(() => {
    const MIGRATION_FLAG = 'ictx_migration_ativa_repair_done';
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') return;

    let alterado = false;
    const leadsReparados = leads.map((l) => {
      const patches: Partial<Lead> = {};

      // Reparo conta: pixCount>=3 sem contaAtivaEm
      if ((l.pixCount ?? 0) >= 3 && !l.contaAtivaEm) {
        patches.contaAtivaEm = l.dataAbertura || l.dataFechamento?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      }

      // Reparo máquina: maquinaVendas>=500 sem maquinaAtivaEm
      if ((l.maquinaVendas ?? 0) >= 500 && !l.maquinaAtivaEm) {
        patches.maquinaAtivaEm = l.dataAbertura || l.dataFechamento?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      }

      if (Object.keys(patches).length > 0) {
        alterado = true;
        return { ...l, ...patches } as Lead;
      }
      return l;
    });

    if (alterado) {
      setLeads(leadsReparados);
      console.log(
        '[repair ativacao] leads reparados:',
        leadsReparados.filter((r, i) => r.contaAtivaEm !== leads[i]?.contaAtivaEm || r.maquinaAtivaEm !== leads[i]?.maquinaAtivaEm).length
      );
    }
    localStorage.setItem(MIGRATION_FLAG, 'true');
  }, []);

  // Backfill dataFechamento para leads em "fechado" (ITEM 1 — S-DINHEIRO-B)
  useEffect(() => {
    let alterado = false;
    const leadsBackfillados = leads.map(l => {
      if (l.status === 'fechado' && !l.dataFechamento) {
        alterado = true;
        return {
          ...l,
          dataFechamento: l.atualizadoEm || l.dataUltimoContato || new Date().toISOString(),
        } as Lead;
      }
      return l;
    });
    if (alterado) setLeads(leadsBackfillados);
  }, []); // só mount

  // Handlers de status e histórico
  const handleUpdateLeadStatus = (
    leadId: string,
    novoStatus: LeadStatus,
    logInfo?: { tipo: 'whatsapp' | 'ligacao'; templateTitulo: string; mensagem: string; observacao?: string }
  ) => {
    setLeads((prevLeads) => {
      const atualizados = prevLeads.map((l) => {
        if (l.id !== leadId) return l;

        // Regra de cadência centralizada (Sprint 1)
        const leadComCadencia = aplicarMudancaStatusCadencia(l, novoStatus);

        // Se mudou para fechado e ainda não tem dataFechamento, trava com timestamp atual
        let leadAtualizado = leadComCadencia;
        if (novoStatus === 'fechado' && !leadAtualizado.dataFechamento) {
          leadAtualizado = {
            ...leadAtualizado,
            dataFechamento: new Date().toISOString(),
          };
        }

        const historicoAtualizado = [...leadAtualizado.historicoContatos];
        if (logInfo) {
          historicoAtualizado.unshift({
            id: `log_${Date.now()}`,
            dataHora: new Date().toISOString(),
            tipo: logInfo.tipo,
            templateTitulo: logInfo.templateTitulo,
            mensagemEnviada: logInfo.mensagem,
            observacao: logInfo.observacao,
          });
        }

        return {
          ...leadAtualizado,
          historicoContatos: historicoAtualizado,
        };
      });

      // Se logInfo presente e planilha conectada, registra também na aba HistoricoContatos do Google Sheets
      if (logInfo && spreadsheet) {
        const leadAlvo = prevLeads.find((x) => x.id === leadId);
        if (leadAlvo) {
          getAccessToken().then((token) => {
            if (token && spreadsheet) {
              appendContactLogToSheet(
                spreadsheet.id,
                {
                  id: `log_${Date.now()}`,
                  dataHora: new Date().toISOString(),
                  tipo: logInfo.tipo,
                  templateTitulo: logInfo.templateTitulo,
                  mensagemEnviada: logInfo.mensagem,
                  observacao: logInfo.observacao,
                },
                leadAlvo,
                token
              ).catch((e) => console.warn('Erro ao registrar log no Sheets:', e));
            }
          });
        }
      }

      return atualizados;
    });

    // Dispara auto-save com retry se conectado e merge inicial concluído (S-ATIVAÇÃO-A)
    if (currentUser && spreadsheet?.id && firstMergeDoneRef.current) {
      executarComRetry(async () => {
        const token = await getAccessToken();
        if (!token) throw new Error('TOKEN_EXPIRADO');
        const leadsAtuais = carregarLeads();
        await saveAllLeadsToSheet(spreadsheet.id, leadsAtuais, token);
        salvarBaseSync(leadsAtuais);
      }).catch((e) => {
        console.warn('[sync] auto-save pós status falhou:', e);
      });
    }
  };

  const handleConnectGoogle = async () => {
    setIsGoogleSyncing(true);
    isLoadingFromSheetRef.current = true;
    try {
      const authResult = await googleSignIn();
      if (!authResult) throw new Error('Não foi possível obter credenciais do Google.');

      setCurrentUser(authResult.user);

      const sheetInfo = await findOrCreateSpreadsheet(authResult.accessToken);
      setSpreadsheet(sheetInfo);

      const leadsDaPlanilha = await fetchLeadsFromSheet(sheetInfo.id, authResult.accessToken);
      const base = carregarBaseSync();
      let listaMerged: Lead[] = [];
      setLeads((locaisAtuais) => {
        const { merged, conflitos } = mergeLeads3(locaisAtuais, leadsDaPlanilha, base);
        if (conflitos > 0) {
          console.info(`[Sync Merge] ${conflitos} conflito(s) resolvido(s) favorecendo versão local.`);
        }
        listaMerged = merged;
        return merged;
      });

      await executarComRetry(async () => {
        await saveAllLeadsToSheet(sheetInfo.id, listaMerged, authResult.accessToken);
      });

      salvarBaseSync(listaMerged);
      firstMergeDoneRef.current = true;

      const agora = new Date().toISOString();
      setLastSyncTime(agora);
      localStorage.setItem('ictx_last_sync_time', agora);
    } catch (err: any) {
      console.error('Erro ao conectar Google Sheets:', err);
      throw err;
    } finally {
      isLoadingFromSheetRef.current = false;
      setIsGoogleSyncing(false);
    }
  };

  const handleSyncToSheet = async () => {
    setIsGoogleSyncing(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authResult = await googleSignIn();
        if (!authResult) return;
        token = authResult.accessToken;
        setCurrentUser(authResult.user);
      }

      let targetSheetId = spreadsheet?.id;
      if (!spreadsheet) {
        const sheetInfo = await findOrCreateSpreadsheet(token);
        setSpreadsheet(sheetInfo);
        targetSheetId = sheetInfo.id;
      }

      if (targetSheetId) {
        await executarComRetry(async () => {
          const currentToken = (await getAccessToken()) || token;
          if (!currentToken) throw new Error('TOKEN_EXPIRADO');
          await saveAllLeadsToSheet(targetSheetId, leads, currentToken);
        });
        salvarBaseSync(leads);
        firstMergeDoneRef.current = true;
      }

      const agora = new Date().toISOString();
      setLastSyncTime(agora);
      localStorage.setItem('ictx_last_sync_time', agora);
    } finally {
      setIsGoogleSyncing(false);
    }
  };

  const handleFetchFromSheet = async () => {
    setIsGoogleSyncing(true);
    isLoadingFromSheetRef.current = true;
    try {
      let token = await getAccessToken();
      if (!token) {
        const authResult = await googleSignIn();
        if (!authResult) return;
        token = authResult.accessToken;
        setCurrentUser(authResult.user);
      }

      const sheetId = spreadsheet?.id;
      if (!sheetId) throw new Error('Nenhuma planilha conectada.');

      await executarComRetry(async () => {
        const currentToken = (await getAccessToken()) || token;
        if (!currentToken) throw new Error('TOKEN_EXPIRADO');
        const leadsDaPlanilha = await fetchLeadsFromSheet(sheetId, currentToken);
        const base = carregarBaseSync();
        let listaMerged: Lead[] = [];
        setLeads((locaisAtuais) => {
          const { merged, conflitos } = mergeLeads3(locaisAtuais, leadsDaPlanilha, base);
          if (conflitos > 0) {
            console.info(`[Sync Merge] ${conflitos} conflito(s) resolvido(s) favorecendo versão local.`);
          }
          listaMerged = merged;
          return merged;
        });

        await saveAllLeadsToSheet(sheetId, listaMerged, currentToken);
        salvarBaseSync(listaMerged);
      });

      firstMergeDoneRef.current = true;

      const agora = new Date().toISOString();
      setLastSyncTime(agora);
      localStorage.setItem('ictx_last_sync_time', agora);
    } finally {
      isLoadingFromSheetRef.current = false;
      setIsGoogleSyncing(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    firstMergeDoneRef.current = false;
  };

  const handleUpdateLead = (leadAtualizado: Lead) => {
    const corrigido = autocorrigeLead(leadAtualizado);
    setLeads((prev) => prev.map((l) => (l.id === corrigido.id ? corrigido : l)));
    if (leadParaDetalhes?.id === corrigido.id) {
      setLeadParaDetalhes(corrigido);
    }
  };

  const handleSaveNotas = (leadId: string, notas: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, notas, atualizadoEm: new Date().toISOString() } : l))
    );
  };

  const handleSaveCoachEvaluation = (
    leadId: string,
    avaliacao: { nota: number; feedback: string; data: string }
  ) => {
    setLeads((prevLeads) => {
      return prevLeads.map((l) => {
        if (l.id !== leadId) return l;

        const novoHistorico = [
          { data: avaliacao.data, nota: avaliacao.nota, feedback: avaliacao.feedback },
          ...(l.historicoCoach || []),
        ];

        const atualizado: Lead = {
          ...l,
          coachNota: avaliacao.nota,
          coachFeedback: avaliacao.feedback,
          coachData: avaliacao.data,
          historicoCoach: novoHistorico,
          atualizadoEm: avaliacao.data,
        };

        if (leadParaDetalhes?.id === leadId) {
          setLeadParaDetalhes(atualizado);
        }
        if (leadParaCoach?.id === leadId) {
          setLeadParaCoach(atualizado);
        }

        return atualizado;
      });
    });
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (leadParaDetalhes?.id === leadId) setLeadParaDetalhes(null);
  };

  const handleImportLeads = (novosLeads: Lead[]) => {
    const leadsSaneados = novosLeads
      .filter((l) => l && l.id && !isSampleLeadId(l.id))
      .map((l) => autocorrigeLead(l));
    setLeads((prev) => [...leadsSaneados, ...prev]);
  };

  const handleAddSingleLead = (novoLead: Lead) => {
    if (novoLead && isSampleLeadId(novoLead.id)) return;
    setLeads((prev) => [autocorrigeLead(novoLead), ...prev]);
  };

  const handleSaveTemplates = (novosTemplates: MessageTemplate[]) => {
    setTemplates(novosTemplates);
  };

  const handleRestoreBackup = (backupLeads: Lead[], backupTemplates: MessageTemplate[]) => {
    const leadsSaneados = backupLeads
      .filter((l) => l && l.id && !isSampleLeadId(l.id))
      .map((l) => autocorrigeLead(l));
    setLeads(leadsSaneados);
    setTemplates(backupTemplates);
  };

  const existingCnpjs = new Set(leads.map((l) => l.cnpj));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      
      {/* Top Header Navigation */}
      <Header
        leads={leads}
        onOpenBulkImport={() => setIsBulkImportOpen(true)}
        onOpenSingleLead={() => setIsSingleLeadOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenBatchMessages={() => setIsBatchModalOpen(true)}
        onExportCsv={() => exportarLeadsCsv(leads)}
        onOpenInstallModal={() => setIsInstallOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleModalOpen(true)}
        isGoogleConnected={Boolean(currentUser && spreadsheet)}
        isGoogleSyncing={isGoogleSyncing}
        dirtyCount={dirtyCount}
        pendingSyncCount={pendingSyncCount}
        isSupervisor={usuarioAtivo.role === 'supervisor'}
        usuarioRole={usuarioAtivo.role}
        onOpenSupervisorDashboard={() => setIsSupervisorOpen(true)}
        onToggleRole={() =>
          setUsuarioAtivo((prev) => ({
            ...prev,
            role: prev.role === 'supervisor' ? 'executivo' : 'supervisor',
          }))
        }
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        notificationStatus={notificationPermission}
        followupsHojeCount={followupsHojeCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl lg:max-w-none w-full mx-auto p-1 space-y-3 sm:space-y-4">
        
        {/* Banner with workflow guide (Expansível / Recolhível para economizar espaço em tablets e celulares) */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-slate-900 rounded-2xl p-2.5 sm:p-4 text-white shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold tracking-tight truncate">
                <span className="sm:hidden">iCtx · Fluxo</span>
                <span className="hidden sm:inline">iCtx · Fluxo Comercial de Alta Conversão</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsBannerExpanded(!isBannerExpanded)}
                className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title={isBannerExpanded ? 'Recolher guia' : 'Expandir guia detalhado'}
              >
                <span>{isBannerExpanded ? 'Ocultar' : 'Guia'}</span>
                {isBannerExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Salvar no Google Sheets */}
              <button
                onClick={() => setIsGoogleModalOpen(true)}
                className={`relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 ${
                  currentUser && spreadsheet
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/70'
                }`}
                title={
                  currentUser && spreadsheet
                    ? 'Planilha Google Conectada e Sincronizada'
                    : 'Salvar no Google Sheets'
                }
                aria-label="Salvar no Sheets"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {currentUser && spreadsheet && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                )}
              </button>

              {/* Instalar APK / App */}
              <button
                onClick={() => setIsInstallOpen(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                title="Instalar APK / App no Celular ou Tablet"
                aria-label="Instalar APK / App"
              >
                <Smartphone className="w-4 h-4" />
              </button>

              {/* Backup */}
              <button
                onClick={() => setIsExportOpen(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-xs transition-colors cursor-pointer shrink-0"
                title="Backup e Restauração de Dados"
                aria-label="Backup"
              >
                <Database className="w-4 h-4" />
              </button>

              {/* Colar Nova Lista */}
              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white text-red-800 hover:bg-red-50 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                title="Colar Nova Lista de Leads"
                aria-label="Colar Nova Lista"
              >
                <ClipboardPaste className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo Expansível do Guia */}
          {isBannerExpanded && (
            <div className="pt-2.5 border-t border-white/15 text-xs text-red-100 leading-relaxed animate-in fade-in duration-200">
              <p>
                1. <strong>Lead Novo</strong> ➔ 2. <strong>Contato 1</strong> (Pronampe / Condições Especiais) ➔ 3. <strong>Contato 2</strong> (Follow-up de rotina) ➔ 4. <strong>Contato 3</strong> (Ligação telefônica) ➔ 5. <strong>Em Negociação</strong> ou <strong>Descartado</strong>.
              </p>
              <p className="text-[11px] text-red-200/80 mt-1">
                💡 Dica: Arraste os cards diretamente entre as colunas do Kanban ou utilize o seletor no card para movimentar seus clientes.
              </p>
            </div>
          )}
        </div>

        {leads.length === 0 && !currentUser && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Sua base está vazia.</strong>
              Conecte sua planilha Google (ícone verde no topo) para sincronizar os leads ou importe uma lista em massa (ícone roxo de upload).
            </div>
          </div>
        )}

        {/* Pipeline / Kanban Board View */}
        <PipelineKanban
          leads={leads}
          onOpenMessageComposer={(lead) => setLeadParaMensagem(autocorrigeLead(lead))}
          onOpenCallScript={(lead) => setLeadParaLigacao(autocorrigeLead(lead))}
          onOpenDetails={(lead) => setLeadParaDetalhes(autocorrigeLead(lead))}
          onUpdateStatus={handleUpdateLeadStatus}
          onDeleteLead={handleDeleteLead}
          filtroCadencia={filtroCadencia}
          onFiltroCadenciaChange={setFiltroCadencia}
          busca={busca}
          onBuscaChange={setBusca}
          filtroStatus={filtroStatus}
          onFiltroStatusChange={setFiltroStatus}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <p>
          iCtx · CRM de Prospecção PJ · Desenvolvido para operações de vendas externas e ativas de Douglas Krüger · Dados públicos da Receita Federal
        </p>
      </footer>

      {/* Modal 1: Disparador de WhatsApp Inteligente (com leque de mensagens para qualquer etapa) */}
      {leadParaMensagem && (
        <MessageComposerModal
          lead={leadParaMensagem}
          templates={templates}
          isOpen={true}
          onClose={() => setLeadParaMensagem(null)}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onOpenDetails={(lead) => setLeadParaDetalhes(autocorrigeLead(lead))}
        />
      )}

      {/* Modal 2: Assistente de Ligação Telefônica (Contato 3) */}
      {leadParaLigacao && (
        <CallScriptModal
          lead={leadParaLigacao}
          templates={templates}
          isOpen={true}
          onClose={() => setLeadParaLigacao(null)}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onOpenDetails={(lead) => setLeadParaDetalhes(autocorrigeLead(lead))}
        />
      )}

      {/* Modal 3: Dossiê Completo do Lead (Receita Federal / QSA / Sócios) */}
      {leadParaDetalhes && (
        <LeadDetailDrawer
          lead={leadParaDetalhes}
          isOpen={true}
          onClose={() => setLeadParaDetalhes(null)}
          onUpdateStatus={handleUpdateLeadStatus}
          onUpdateLead={handleUpdateLead}
          onSaveNotas={handleSaveNotas}
          onOpenMessageComposer={(lead) => {
            setLeadParaDetalhes(null);
            setLeadParaMensagem(autocorrigeLead(lead));
          }}
          onOpenCallScript={(lead) => {
            setLeadParaDetalhes(null);
            setLeadParaLigacao(autocorrigeLead(lead));
          }}
          onOpenCoach={(lead) => {
            setLeadParaCoach(autocorrigeLead(lead));
          }}
        />
      )}

      {/* Modal 4: Importador em Massa (Cole texto do WhatsApp ou envie CSV) */}
      {isBulkImportOpen && (
        <BulkImportModal
          isOpen={true}
          onClose={() => setIsBulkImportOpen(false)}
          existingLeads={leads}
          onImportLeads={handleImportLeads}
        />
      )}

      {/* Modal 5: Cadastro de Lead Único com Busca de CNPJ */}
      {isSingleLeadOpen && (
        <SingleLeadModal
          isOpen={true}
          onClose={() => setIsSingleLeadOpen(false)}
          onAddLead={handleAddSingleLead}
          existingCnpjs={existingCnpjs}
        />
      )}

      {/* Modal 6: Gerenciador de Templates & Scripts */}
      {isTemplatesOpen && (
        <TemplateManagerModal
          templates={templates}
          isOpen={true}
          onClose={() => setIsTemplatesOpen(false)}
          onSaveTemplates={handleSaveTemplates}
        />
      )}

      {/* Modal 7: Exportação e Backup JSON */}
      {isExportOpen && (
        <ExportImportModal
          isOpen={true}
          onClose={() => setIsExportOpen(false)}
          leads={leads}
          templates={templates}
          onRestoreBackup={handleRestoreBackup}
        />
      )}

      {/* Modal 8: Instalação do Aplicativo (APK WebAPK no Celular ou Tablet) */}
      {isInstallOpen && (
        <InstallAppModal
          isOpen={true}
          onClose={() => setIsInstallOpen(false)}
        />
      )}

      {/* Modal 9: Sincronização e Conexão com Google Planilhas */}
      {isGoogleModalOpen && (
        <GoogleSheetsSyncModal
          isOpen={true}
          onClose={() => setIsGoogleModalOpen(false)}
          user={currentUser}
          spreadsheet={spreadsheet}
          isLoading={isGoogleSyncing}
          lastSyncTime={lastSyncTime}
          totalLeads={leads.length}
          onConnectGoogle={handleConnectGoogle}
          onSyncToSheet={handleSyncToSheet}
          onFetchFromSheet={handleFetchFromSheet}
          onDisconnect={handleDisconnectGoogle}
        />
      )}

      {/* Modal 10: Lote de Mensagens Prontas (Sprint 2) */}
      <BatchMessageModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        leadsFiltrados={leadsFiltrados}
        templates={templates}
        onUpdateStatus={handleUpdateLeadStatus}
      />

      {/* Modal 11: AI Coach Local (Sprint 4) */}
      {leadParaCoach && (
        <CoachModal
          isOpen={true}
          onClose={() => setLeadParaCoach(null)}
          lead={leadParaCoach}
          onSaveCoachEvaluation={handleSaveCoachEvaluation}
        />
      )}

      {/* Modal 12: Painel Supervisor com Métricas Reais (Sprint 5) */}
      <SupervisorDashboard
        isOpen={isSupervisorOpen}
        onClose={() => setIsSupervisorOpen(false)}
        leadsEquipe={leadsEquipe}
        usuarioAtivo={usuarioAtivo}
        onAlternarRole={(role) => setUsuarioAtivo((prev) => ({ ...prev, role }))}
      />

      {/* Modal 13: Lembretes & Notificações Web Push (9h da manhã) */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        permissionStatus={notificationPermission}
        onPermissionChange={(status) => setNotificationPermission(status)}
        leads={leads}
        onSelectLead={(lead) => setLeadParaDetalhes(lead)}
      />
    </div>
  );
}
