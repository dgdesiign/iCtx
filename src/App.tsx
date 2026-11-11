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
import { ehFollowUpVencido, calcularProximoFollowUp } from './utils/cadencia';
import { calcularScore } from './utils/scoring';
import { Header } from './components/Header';
import { PipelineKanban, CadenciaFiltro } from './components/PipelineKanban';
import { calcularAtivacaoStatus } from './utils/ativacao';
export type { CadenciaFiltro } from './components/PipelineKanban';
import { BatchMessageModal } from './components/BatchMessageModal';
import { CoachModal } from './components/CoachModal';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { MetasDashboard } from './components/MetasDashboard';
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
import { MiningDashboard } from './components/MiningDashboard';
import { MiningFloatingWidget } from './components/MiningFloatingWidget';
import { CartuchosModal } from './components/CartuchosModal';
import { useMiningStatus } from './hooks/useMiningStatus';
import {
  getNotificationPermissionStatus,
  setupDaily9AmReminder,
  NotificationStatus,
} from './services/notificationService';
import {
  Sparkles,
  Smartphone,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Database,
  ClipboardPaste,
} from 'lucide-react';
import {
  autocorrigeLead,
  formatarCnpj,
  formatarNome,
  formatarTelefone,
  limparCnpj,
  limparDigitos,
  consultarCnpj,
} from './services/cnpjService';
import { normalizarParaClient } from './types/Client';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logoutGoogle,
  initAuth,
  getAccessToken,
  setCachedAccessToken,
} from './services/googleAuthService';
import {
  findOrCreateSpreadsheet,
  fetchLeadsFromSheet,
  saveAllLeadsToSheet,
  appendContactLogToSheet,
  SpreadsheetInfo,
} from './services/googleSheetsService';

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
      return salvos
        .filter((l) => l && l.id && !isSampleLeadId(l.id))
        .map((l) => {
          const corrigido = autocorrigeLead(l);
          let status = corrigido.status;
          let cadencia = corrigido.cadenciaContatos;

          if (status === 'contato_1' || status === 'contato_2' || status === 'contato_3') {
            if (cadencia === undefined) {
              cadencia = status === 'contato_1' ? 1 : status === 'contato_2' ? 2 : 3;
            }
            status = 'em_prospeccao';
          }

          const produtosAtivos = corrigido.produtosAtivos || {
            conta: Boolean(corrigido.contaAtivaEm || (corrigido.pixCount ?? 0) >= 3),
            maquina: Boolean(corrigido.maquinaAtivaEm || (corrigido.maquinaVendas ?? 0) >= 500),
          };

          return {
            ...corrigido,
            status,
            cadenciaContatos: (cadencia ?? 0) as 0 | 1 | 2 | 3,
            produtosAtivos,
          };
        });
    }
    return [];
  });

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => carregarTemplates());
  const [filtroCadencia, setFiltroCadencia] = useState<CadenciaFiltro>('todos');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const [isSupervisorOpen, setIsSupervisorOpen] = useState(false);
  const [isMetasOpen, setIsMetasOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationStatus>(() =>
    getNotificationPermissionStatus()
  );
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isSingleLeadOpen, setIsSingleLeadOpen] = useState(false);
  const [isMiningOpen, setIsMiningOpen] = useState(false);
  const [isCartuchosOpen, setIsCartuchosOpen] = useState(false);
  const miningStatus = useMiningStatus();
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isBannerExpanded, setIsBannerExpanded] = useState(false);

  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);

  const [usuarioAtivo, setUsuarioAtivo] = useState<{
    nome: string;
    email: string;
    role: 'supervisor' | 'executivo';
  }>({
    nome: 'Douglas Krüger',
    email: 'dr.douglasilva@gmail.com',
    role: 'supervisor',
  });

  const followupsHojeCount = useMemo(() => {
    return leads.filter((l) => ehFollowUpVencido(l)).length;
  }, [leads]);

  useEffect(() => {
    const cleanup = setupDaily9AmReminder(() => leads);
    return () => cleanup();
  }, [leads]);

  const leadsFiltrados = useMemo(() => {
    return leads.filter((lead) => {
      const textoBusca = busca.toLowerCase().trim();
      const buscaDigitos = busca.replace(/\D/g, '');

      const telPrincipal = lead.telefonePrincipal || (lead as any).telefone || '';
      const telSecundario = lead.telefoneSecundario || '';
      const telPrincipalDigitos = telPrincipal.replace(/\D/g, '');
      const telSecundarioDigitos = telSecundario.replace(/\D/g, '');

      const matchTelefone = Boolean(
        (buscaDigitos.length > 0 &&
          (telPrincipalDigitos.includes(buscaDigitos) || telSecundarioDigitos.includes(buscaDigitos))) ||
        (textoBusca &&
          (telPrincipal.toLowerCase().includes(textoBusca) || telSecundario.toLowerCase().includes(textoBusca)))
      );

      const matchBusca =
        !textoBusca ||
        lead.empresaExibicao.toLowerCase().includes(textoBusca) ||
        lead.nomeContato.toLowerCase().includes(textoBusca) ||
        lead.cnpj.includes(textoBusca) ||
        (lead.municipio || '').toLowerCase().includes(textoBusca) ||
        matchTelefone;

      const matchStatus = filtroStatus === 'todos' || lead.status === filtroStatus;

      const matchCadencia =
        filtroCadencia === 'todos'
          ? true
          : filtroCadencia === 'followup_hoje'
          ? ehFollowUpVencido(lead)
          : filtroCadencia === 'score'
          ? calcularScore(lead) >= 75
          : filtroCadencia === 'risco'
          ? (lead.status === 'fechado' && calcularAtivacaoStatus(lead) === 'risco')
          : true;

      return matchBusca && matchStatus && matchCadencia;
    });
  }, [leads, busca, filtroStatus, filtroCadencia]);

  const leadsEquipe: EquipeMembro[] = useMemo(() => {
    return [
      {
        nome: usuarioAtivo.nome,
        email: usuarioAtivo.email,
        role: usuarioAtivo.role,
        payload: { leads },
      },
    ];
  }, [leads, usuarioAtivo]);

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

  useEffect(() => {
    if (spreadsheet) {
      localStorage.setItem('ictx_google_spreadsheet', JSON.stringify(spreadsheet));
    }
  }, [spreadsheet]);

  const dirtyCount = useMemo(() => {
    if (currentUser) return 0;
    const base = carregarBaseSync();
    return leads.filter((l) => {
      if (!l || !l.id || isSampleLeadId(l.id)) return false;
      return hashLead(l) !== base[l.id];
    }).length;
  }, [leads, currentUser]);

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
        setPendingSyncCount((prev) => prev + 1);
        console.warn('[sync] token expirado — clique no badge vermelho do Header para reconectar');
      } else {
        throw e;
      }
    }
  }

  useEffect(() => {
    if (!isSavingToSheetRef.current && currentUser && spreadsheet?.id) {
      setPendingSyncCount(calcularPendenciasLocais());
    }
  }, [leads, spreadsheet?.id, currentUser]);

  const isInitialMountRef = useRef(true);
  const isLoadingFromSheetRef = useRef(false);
  const isSavingToSheetRef = useRef(false);
  const firstMergeDoneRef = useRef(false);
  const pendingSaveLeadsRef = useRef<Lead[] | null>(null);

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

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        setCachedAccessToken(token);

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
            if (listaMerged.length > 0) {
              await saveAllLeadsToSheet(spreadsheet.id, listaMerged, token);
              salvarBaseSync(listaMerged);
            }
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

  const [leadParaMensagem, setLeadParaMensagem] = useState<Lead | null>(null);
  const [leadParaLigacao, setLeadParaLigacao] = useState<Lead | null>(null);
  const [leadParaDetalhes, setLeadParaDetalhes] = useState<Lead | null>(null);
  const [leadParaCoach, setLeadParaCoach] = useState<Lead | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  useEffect(() => {
    salvarLeads(leads);
  }, [leads]);

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
    }, 3000);

    return () => clearTimeout(timeout);
  }, [leads, currentUser, spreadsheet?.id]);

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

  useEffect(() => {
    salvarTemplates(templates);
  }, [templates]);

  useEffect(() => {
    setLeads((prev) => {
      let alterado = false;
      const migrados = prev.map((l) => {
        let mudou = false;
        let novoStatus = l.status;
        let cadencia = l.cadenciaContatos;

        if (l.dataAbertura && !l.cnpjInicio && l.status !== 'fechado') {
          mudou = true;
          l = { ...l, cnpjInicio: l.dataAbertura };
        }

        if (novoStatus === 'contato_1' || novoStatus === 'contato_2' || novoStatus === 'contato_3') {
          mudou = true;
          if (cadencia === undefined) {
            cadencia = novoStatus === 'contato_1' ? 1 : novoStatus === 'contato_2' ? 2 : 3;
          }
          novoStatus = 'em_prospeccao';
        }

        const produtosAtivos = l.produtosAtivos || {
          conta: Boolean(l.contaAtivaEm || (l.pixCount ?? 0) >= 3),
          maquina: Boolean(l.maquinaAtivaEm || (l.maquinaVendas ?? 0) >= 500),
        };

        if (!l.produtosAtivos) mudou = true;

        if (mudou) {
          alterado = true;
          return {
            ...l,
            status: novoStatus,
            cadenciaContatos: (cadencia ?? 0) as 0 | 1 | 2 | 3,
            produtosAtivos,
          };
        }
        return l;
      });
      return alterado ? migrados : prev;
    });
  }, []);

  useEffect(() => {
    const leadsSaneados = leads.map((l) => autocorrigeLead(l));
    if (JSON.stringify(leadsSaneados) !== JSON.stringify(leads)) {
      setLeads(leadsSaneados);
    }
  }, []);

  useEffect(() => {
    const MIGRATION_FLAG = 'ictx_migration_ativa_repair_done';
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') return;

    let alterado = false;
    const leadsReparados = leads.map((l) => {
      const patches: Partial<Lead> = {};

      if ((l.pixCount ?? 0) >= 3 && !l.contaAtivaEm) {
        patches.contaAtivaEm = l.dataAbertura || l.dataFechamento?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      }

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
      console.log('[repair ativacao] leads reparados:', leadsReparados.filter((r, i) => r.contaAtivaEm !== leads[i]?.contaAtivaEm || r.maquinaAtivaEm !== leads[i]?.maquinaAtivaEm).length);
    }
    localStorage.setItem(MIGRATION_FLAG, 'true');
  }, []);

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
  }, []);

  // --- FUNÇÃO DE ENRIQUECIMENTO INTELIGENTE (RESILIENTE E COM PAUSA) ---
  const handleBatchEnrich = async () => {
    const leadsParaEnriquecer = leads.filter(l => {
      if (l.status === 'fechado' || l.status === 'descartado') return false;
      
      const tel1 = limparDigitos(l.telefonePrincipal || '');
      const tel2 = limparDigitos(l.telefoneSecundario || '');
      
      const isCelular1 = tel1.length === 11 && tel1[2] === '9';
      const isCelular2 = tel2.length === 11 && tel2[2] === '9';
      
      const temCelular = isCelular1 || isCelular2;
      
      return !temCelular || !l.cnaeCodigo || l.razaoSocial === 'Empresa';
    });

    if (leadsParaEnriquecer.length === 0) {
      alert('Nenhum lead pendente de enriquecimento.');
      return;
    }

    setIsEnriching(true);
    setEnrichTotal(leadsParaEnriquecer.length);
    setEnrichProgress(0);

    for (let i = 0; i < leadsParaEnriquecer.length; i++) {
      const lead = leadsParaEnriquecer[i];
      try {
        const dados = await consultarCnpj(lead.cnpj);
        if (dados) {
          let tel1 = dados.ddd_telefone_1 ? limparDigitos(dados.ddd_telefone_1) : '';
          let tel2 = dados.ddd_telefone_2 ? limparDigitos(dados.ddd_telefone_2) : '';

          let isCelular1 = tel1.length === 11 && tel1[2] === '9';
          let isCelular2 = tel2.length === 11 && tel2[2] === '9';

          let novoTelPrincipal = lead.telefonePrincipal;
          let novoTelSecundario = lead.telefoneSecundario;

          if (isCelular1) {
            novoTelPrincipal = tel1;
            if (isCelular2 || tel2.length >= 10) novoTelSecundario = tel2;
          } else if (isCelular2) {
            novoTelPrincipal = tel2;
            if (tel1.length >= 10) novoTelSecundario = tel1;
          } else {
            if (tel1 && (!lead.telefonePrincipal || lead.telefonePrincipal.length < 10)) novoTelPrincipal = tel1;
            if (tel2 && !lead.telefoneSecundario) novoTelSecundario = tel2;
          }

          const leadAtualizado: Lead = {
            ...lead,
            razaoSocial: dados.razao_social || lead.razaoSocial,
            nomeFantasia: dados.nome_fantasia || lead.nomeFantasia,
            empresaExibicao: dados.nome_fantasia || dados.razao_social || lead.empresaExibicao,
            cnaeCodigo: dados.cnae_fiscal ? String(dados.cnae_fiscal) : lead.cnaeCodigo,
            cnaeDescricao: dados.cnae_fiscal_descricao || lead.cnaeDescricao,
            logradouro: dados.logradouro || lead.logradouro,
            numero: dados.numero || lead.numero,
            bairro: dados.bairro || lead.bairro,
            municipio: dados.municipio || lead.municipio,
            uf: dados.uf || lead.uf,
            cep: dados.cep || lead.cep,
            dataAbertura: dados.data_inicio_atividade || lead.dataAbertura,
            telefonePrincipal: novoTelPrincipal,
            telefonePrincipalFormatado: formatarTelefone(novoTelPrincipal),
            telefoneSecundario: novoTelSecundario || undefined,
            telefoneSecundarioFormatado: novoTelSecundario ? formatarTelefone(novoTelSecundario) : undefined,
          };
          handleUpdateLead(leadAtualizado);
        }
      } catch (error) {
        console.warn(`Erro ao enriquecer ${lead.cnpj}:`, error);
      }
      setEnrichProgress(prev => prev + 1);
      
      // Salva o progresso no localStorage para não perder se o usuário atualizar a página
      localStorage.setItem('ictx_enrich_progress', JSON.stringify({ atual: i + 1, total: leadsParaEnriquecer.length }));

      // Pausa de 20 segundos
      await new Promise(r => setTimeout(r, 20000));
    }

    setIsEnriching(false);
    localStorage.removeItem('ictx_enrich_progress');
    alert('Enriquecimento em lote concluído!');
  };

  // Retoma o enriquecimento se a página for atualizada
  useEffect(() => {
    const progSalvo = localStorage.getItem('ictx_enrich_progress');
    if (progSalvo && !isEnriching) {
      const p = JSON.parse(progSalvo);
      if (p.atual < p.total) {
        console.log('Retomando enriquecimento de onde parou...');
        handleBatchEnrich();
      }
    }
  }, []);

  const handleUpdateLeadStatus = (
    leadId: string,
    novoStatus: LeadStatus,
    logInfo?: { tipo: 'whatsapp' | 'ligacao'; templateTitulo: string; mensagem: string; observacao?: string }
  ) => {
    setLeads((prevLeads) => {
      const atualizados = prevLeads.map((l) => {
        if (l.id !== leadId) return l;

        const leadComCadencia = aplicarMudancaStatusCadencia(l, novoStatus);

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

  const registrarAcaoContato = (
    leadId: string,
    tipo: 'whatsapp' | 'ligacao',
    templateTitulo?: string
  ) => {
    const agoraIso = new Date().toISOString();
    setLeads((prevLeads) => {
      const atualizados = prevLeads.map((l) => {
        if (l.id !== leadId) return l;

        const novoStatus: LeadStatus = l.status === 'novo' ? 'em_prospeccao' : l.status;
        const proxFollowUp = calcularProximoFollowUp(novoStatus);
        const novoHistorico = [
          {
            id: `contato_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            dataHora: agoraIso,
            tipo,
            templateTitulo: templateTitulo || (tipo === 'whatsapp' ? 'WhatsApp Rápido' : 'Ligação'),
            observacao: 'Ação via CRM',
          },
          ...(l.historicoContatos || []),
        ];

        return {
          ...l,
          status: novoStatus,
          dataUltimoContato: agoraIso,
          ultimoContatoEm: agoraIso,
          proximoFollowUp: proxFollowUp || l.proximoFollowUp,
          tentativasContato: (l.tentativasContato || 0) + 1,
          cadenciaContatos: ((l.cadenciaContatos ?? 0) < 3 ? (l.cadenciaContatos ?? 0) + 1 : 3) as any,
          atualizadoEm: agoraIso,
          historicoContatos: novoHistorico,
        };
      });

      salvarLeads(atualizados);
      return atualizados;
    });

    if (leadParaDetalhes?.id === leadId) {
      setLeadParaDetalhes((prev) => {
        if (!prev) return null;
        const novoStatus: LeadStatus = prev.status === 'novo' ? 'em_prospeccao' : prev.status;
        const proxFollowUp = calcularProximoFollowUp(novoStatus);
        return {
          ...prev,
          status: novoStatus,
          dataUltimoContato: agoraIso,
          ultimoContatoEm: agoraIso,
          proximoFollowUp: proxFollowUp || prev.proximoFollowUp,
          tentativasContato: (prev.tentativasContato || 0) + 1,
          cadenciaContatos: ((prev.cadenciaContatos ?? 0) < 3 ? (prev.cadenciaContatos ?? 0) + 1 : 3) as any,
          atualizadoEm: agoraIso,
          historicoContatos: [
            {
              id: `contato_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              dataHora: agoraIso,
              tipo,
              templateTitulo: templateTitulo || (tipo === 'whatsapp' ? 'WhatsApp Rápido' : 'Ligação'),
              observacao: 'Ação via CRM',
            },
            ...(prev.historicoContatos || []),
          ],
        };
      });
    }

    if (currentUser && spreadsheet?.id && firstMergeDoneRef.current) {
      executarComRetry(async () => {
        const token = await getAccessToken();
        if (!token) throw new Error('TOKEN_EXPIRADO');
        const leadsAtuais = carregarLeads();
        await saveAllLeadsToSheet(spreadsheet.id, leadsAtuais, token);
        salvarBaseSync(leadsAtuais);
      }).catch((e) => {
        console.warn('[sync] auto-save pós registrarAcaoContato falhou:', e);
      });
    }
  };

  useEffect(() => {
    const handleCustomAcaoContato = (e: Event) => {
      const customEvent = e as CustomEvent<{
        leadId: string;
        tipo: 'whatsapp' | 'ligacao';
        templateTitulo?: string;
      }>;
      if (customEvent.detail?.leadId) {
        registrarAcaoContato(
          customEvent.detail.leadId,
          customEvent.detail.tipo || 'whatsapp',
          customEvent.detail.templateTitulo
        );
      }
    };
    window.addEventListener('ictx:registrarAcaoContato', handleCustomAcaoContato);
    return () => {
      window.removeEventListener('ictx:registrarAcaoContato', handleCustomAcaoContato);
    };
  }, [currentUser, spreadsheet?.id]);

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

      if (listaMerged.length > 0) {
        await executarComRetry(async () => {
          await saveAllLeadsToSheet(sheetInfo.id, listaMerged, authResult.accessToken);
        });
        salvarBaseSync(listaMerged);
      }
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

        if (listaMerged.length > 0) {
          await saveAllLeadsToSheet(sheetId, listaMerged, currentToken);
          salvarBaseSync(listaMerged);
        }
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

  const handleOpenAtivacao = (lead: Lead) => {
    setLeadParaMensagem(null);
    setLeadParaLigacao(null);
    setSelectedClient(normalizarParaClient(lead));
  };

  const handleOpenDetails = (lead: Lead) => {
    setLeadParaMensagem(null);
    setLeadParaLigacao(null);
    setLeadParaDetalhes(autocorrigeLead(lead));
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

  const handleImportarLeadsMinerados = (leadsRecebidos: any[]) => {
    if (!leadsRecebidos || leadsRecebidos.length === 0) return;

    const cnpjsExistentes = new Set(leads.map((l) => l.cnpj));
    const novosFormatados: Lead[] = [];
    let duplicadosCount = 0;

    for (const raw of leadsRecebidos) {
      const cnpjLimpo = limparCnpj(raw.cnpj || raw.CNPJ || '');
      if (!cnpjLimpo || cnpjLimpo.length !== 14) continue;

      if (cnpjsExistentes.has(cnpjLimpo)) {
        duplicadosCount++;
        continue;
      }

      cnpjsExistentes.add(cnpjLimpo);

      const telPrincipal = limparDigitos(raw.telefone || raw.telefonePrincipal || raw.celular || '');
      const telSecundario = limparDigitos(raw.telefoneSecundario || '');
      const agora = new Date().toISOString();

      const razao = (raw.razaoSocial || raw.razao_social || raw.nome || raw.empresa || '').trim();
      const fantasia = (raw.nomeFantasia || raw.nome_fantasia || '').trim();
      const nomeContato = (raw.nomeContato || raw.contato || raw.nome || '').trim() || 'Contato';

      const novoLead: Lead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        cnpj: cnpjLimpo,
        cnpjFormatado: formatarCnpj(cnpjLimpo),
        nomeContato: formatarNome(nomeContato),
        telefonePrincipal: telPrincipal,
        telefonePrincipalFormatado: formatarTelefone(telPrincipal),
        telefoneSecundario: telSecundario || undefined,
        telefoneSecundarioFormatado: telSecundario ? formatarTelefone(telSecundario) : undefined,
        razaoSocial: formatarNome(razao || 'Empresa'),
        nomeFantasia: formatarNome(fantasia),
        empresaExibicao: formatarNome(fantasia || razao || 'Empresa'),
        empresaParaMensagem: formatarNome(fantasia || 'sua empresa'),
        municipio: raw.municipio || raw.cidade || '',
        bairro: raw.bairro || '',
        cnaeCodigo: raw.cnaeCodigo ? String(raw.cnaeCodigo) : undefined,
        cnaeDescricao: raw.cnaeDescricao || raw.cnae || '',
        socios: raw.socios || [],
        status: 'em_prospeccao',
        parceiroSantander: {
          status: 'apto',
          verificadoEm: agora,
        },
        produtoSugerido: '💳 Conta PJ Isenta & Cartão',
        criadoEm: agora,
        atualizadoEm: agora,
        historicoContatos: [],
        cadenciaContatos: 0,
        produtosAtivos: {
          conta: false,
          maquina: false,
        },
      };

      novosFormatados.push(autocorrigeLead(novoLead));
    }

    if (novosFormatados.length === 0) {
      alert(`Todos os ${leadsRecebidos.length} leads já constam na base do CRM (duplicatas evitadas).`);
      return;
    }

    setLeads((prev) => [...novosFormatados, ...prev]);
    setIsMiningOpen(false);

    const msg = duplicadosCount > 0
      ? `Sucesso: ${novosFormatados.length} lead(s) adicionados diretamente em "Em Prospecção" com tag Apto! (${duplicadosCount} duplicado(s) ignorado(s))`
      : `Sucesso: ${novosFormatados.length} lead(s) adicionados diretamente em "Em Prospecção" com tag Apto!`;

    alert(msg);
  };

  const handleSaveTemplates = (novosTemplates: MessageTemplate[]) => {
    setTemplates(novosTemplates);
  };

  const handleRestoreBackup = (backupLeads: Lead[], backupTemplates: MessageTemplate[]) => {
    const leadsSaneados = backupLeads
      .filter((l) => l && l.id && !isSampleLeadId(l.id))
      .map((l) => autocorrigeLead(l));
    
    if (leadsSaneados.length > 0) {
      salvarLeads(leadsSaneados);
    }
    if (backupTemplates && backupTemplates.length > 0) {
      salvarTemplates(backupTemplates);
    }
    setLeads(leadsSaneados);
    setTemplates(backupTemplates);
  };

  const existingCnpjs = new Set(leads.map((l) => l.cnpj));

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex flex-col text-slate-800">
      
      <Header
        leads={leads}
        onOpenBulkImport={() => setIsBulkImportOpen(true)}
        onOpenSingleLead={() => setIsSingleLeadOpen(true)}
        onOpenCartuchos={() => setIsCartuchosOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onExportCsv={() => exportarLeadsCsv(leads)}
        onOpenInstallModal={() => setIsInstallOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleModalOpen(true)}
        isGoogleConnected={Boolean(currentUser && spreadsheet)}
        isSupervisor={usuarioAtivo.role === 'supervisor'}
        onOpenSupervisorDashboard={() => setIsSupervisorOpen(true)}
        onOpenMetas={() => setIsMetasOpen(true)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        followupsHojeCount={followupsHojeCount}
        isEnriching={isEnriching}
        enrichProgress={enrichProgress}
        enrichTotal={enrichTotal}
        onEnrichAll={handleBatchEnrich}
      />

      <main className="flex-1 max-w-7xl lg:max-w-none w-full mx-auto p-1 space-y-3 sm:space-y-4">
        
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
              >
                <span>{isBannerExpanded ? 'Ocultar' : 'Guia'}</span>
                {isBannerExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => setIsGoogleModalOpen(true)}
                className={`relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 ${
                  currentUser && spreadsheet
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/70'
                }`}
                title={currentUser && spreadsheet ? 'Planilha Google Conectada e Sincronizada' : 'Salvar no Google Sheets'}
              >
                <FileSpreadsheet className="w-4 h-4" />
                {currentUser && spreadsheet && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setIsInstallOpen(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                title="Instalar APK / App"
              >
                <Smartphone className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsExportOpen(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-xs transition-colors cursor-pointer shrink-0"
                title="Backup e Restauração"
              >
                <Database className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white text-red-800 hover:bg-red-50 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                title="Colar Nova Lista"
              >
                <ClipboardPaste className="w-4 h-4" />
              </button>
            </div>
          </div>

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

        <PipelineKanban
          leads={leads}
          onOpenMessageComposer={(lead) => setLeadParaMensagem(autocorrigeLead(lead))}
          onOpenCallScript={(lead) => setLeadParaLigacao(autocorrigeLead(lead))}
          onOpenDetails={handleOpenDetails}
          onOpenAtivacao={handleOpenAtivacao}
          onUpdateStatus={handleUpdateLeadStatus}
          onDeleteLead={handleDeleteLead}
          onRegistrarAcaoContato={registrarAcaoContato}
          filtroCadencia={filtroCadencia}
          onFiltroCadenciaChange={setFiltroCadencia}
          busca={busca}
          onBuscaChange={setBusca}
          filtroStatus={filtroStatus}
          onFiltroStatusChange={setFiltroStatus}
        />

      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <p>
          iCtx · CRM de Prospecção PJ · Desenvolvido para operações de vendas externas e ativas de Douglas Krüger · Dados públicos da Receita Federal
        </p>
      </footer>

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

      {leadParaDetalhes && (
        <LeadDetailDrawer
          lead={leadParaDetalhes}
          isOpen={true}
          onClose={() => setLeadParaDetalhes(null)}
          onUpdateStatus={handleUpdateLeadStatus}
          onUpdateLead={handleUpdateLead}
          onSaveNotas={handleSaveNotas}
          onRegistrarAcaoContato={registrarAcaoContato}
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

      {isBulkImportOpen && (
        <BulkImportModal
          isOpen={true}
          onClose={() => setIsBulkImportOpen(false)}
          existingLeads={leads}
          onImportLeads={handleImportLeads}
        />
      )}

      {isSingleLeadOpen && (
        <SingleLeadModal
          isOpen={true}
          onClose={() => setIsSingleLeadOpen(false)}
          onAddLead={handleAddSingleLead}
          existingCnpjs={existingCnpjs}
        />
      )}

      {isTemplatesOpen && (
        <TemplateManagerModal
          templates={templates}
          isOpen={true}
          onClose={() => setIsTemplatesOpen(false)}
          onSaveTemplates={handleSaveTemplates}
        />
      )}

      {isExportOpen && (
        <ExportImportModal
          isOpen={true}
          onClose={() => setIsExportOpen(false)}
          leads={leads}
          templates={templates}
          onRestoreBackup={handleRestoreBackup}
        />
      )}

      {isInstallOpen && (
        <InstallAppModal
          isOpen={true}
          onClose={() => setIsInstallOpen(false)}
        />
      )}

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

      <BatchMessageModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        leadsFiltrados={leadsFiltrados}
        templates={templates}
        onUpdateStatus={handleUpdateLeadStatus}
      />

      {leadParaCoach && (
        <CoachModal
          isOpen={true}
          onClose={() => setLeadParaCoach(null)}
          lead={leadParaCoach}
          onSaveCoachEvaluation={handleSaveCoachEvaluation}
        />
      )}

      <SupervisorDashboard
        isOpen={isSupervisorOpen}
        onClose={() => setIsSupervisorOpen(false)}
        leadsEquipe={leadsEquipe}
        usuarioAtivo={usuarioAtivo}
        onAlternarRole={(role) => setUsuarioAtivo((prev) => ({ ...prev, role }))}
      />

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        permissionStatus={notificationPermission}
        onPermissionChange={(status) => setNotificationPermission(status)}
        leads={leads}
        onSelectLead={(lead) => setLeadParaDetalhes(lead)}
      />

      {isMetasOpen && (
        <MetasDashboard
          isOpen={true}
          onClose={() => setIsMetasOpen(false)}
          leads={leads}
        />
      )}

      {!isMiningOpen &&
        (miningStatus.status === 'rodando' ||
          miningStatus.status === 'aguardando' ||
          miningStatus.processando > 0) && (
          <MiningFloatingWidget
            status={miningStatus}
            onReopen={() => setIsMiningOpen(true)}
          />
        )}

      {isMiningOpen && (
        <MiningDashboard
          isOpen={isMiningOpen}
          onClose={() => setIsMiningOpen(false)}
          onMinimize={() => setIsMiningOpen(false)}
          miningStatus={miningStatus}
          onImportLeads={handleImportarLeadsMinerados}
          existingCnpjs={existingCnpjs}
        />
      )}

      <CartuchosModal 
        isOpen={isCartuchosOpen} 
        onClose={() => setIsCartuchosOpen(false)} 
      />

    </div>
  );
}
