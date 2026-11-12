import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  carregarLeads, salvarLeads, carregarTemplates, salvarTemplates,
  exportarLeadsCsv, aplicarMudancaStatusCadencia,
} from './utils/storage';
import { mergeLeads3, hashLead, isSampleLeadId } from './utils/syncMerge';
import { Lead, LeadStatus, MessageTemplate, EquipeMembro } from './types/crm';
import { ehFollowUpVencido, calcularProximoFollowUp } from './utils/cadencia';
import { calcularScore } from './utils/scoring';
import { Header } from './components/Header';
import { PipelineKanban, CadenciaFiltro } from './components/PipelineKanban';
import { calcularAtivacaoStatus } from './utils/ativacao';
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
import { LoginScreen } from './components/LoginScreen';
import { MobileNav } from './components/MobileNav';
import { ProfileModal } from './components/ProfileModal';
import { FloatingActions } from './components/FloatingActions';
import { useMiningStatus } from './hooks/useMiningStatus';
import { getNotificationPermissionStatus, setupDaily9AmReminder, NotificationStatus } from './services/notificationService';
import { Loader2 } from 'lucide-react';
import {
  autocorrigeLead,
  formatarCnpj,
  formatarNome,
  formatarTelefone,
  limparCnpj,
  limparDigitos,
  consultarCnpj,
} from './services/cnpjService';
import { User } from 'firebase/auth';
import {
  googleSignIn, logoutGoogle, initAuth, getAccessToken, setCachedAccessToken,
} from './services/googleAuthService';
import {
  findOrCreateSpreadsheet, fetchLeadsFromSheet, saveAllLeadsToSheet,
  appendContactLogToSheet, SpreadsheetInfo,
} from './services/googleSheetsService';

const carregarBaseSync = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem('ictx_sync_base');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
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
  } catch (err) { console.warn('Erro sync:', err); }
};

export default function App() {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [mobileTab, setMobileTab] = useState<'leads' | 'cartuchos' | 'metas' | 'perfil'>('leads');

  const [modoVisualizacao, setModoVisualizacao] = useState<'kanban' | 'lista'>(() => {
    return (localStorage.getItem('ictx_modo_visualizacao') as 'kanban' | 'lista') || 'kanban';
  });

  const handleToggleVisualizacao = (modo: 'kanban' | 'lista') => {
    setModoVisualizacao(modo);
    localStorage.setItem('ictx_modo_visualizacao', modo);
  };

  const [leads, setLeads] = useState<Lead[]>(() => {
    const salvos = carregarLeads();
    if (salvos.length > 0) {
      return salvos.filter((l) => l && l.id && !isSampleLeadId(l.id)).map((l) => {
        const corrigido = autocorrigeLead(l);
        let status = corrigido.status;
        let cadencia = corrigido.cadenciaContatos;
        if (status === 'contato_1' || status === 'contato_2' || status === 'contato_3') {
          if (cadencia === undefined) cadencia = status === 'contato_1' ? 1 : status === 'contato_2' ? 2 : 3;
          status = 'em_prospeccao';
        }
        const produtosAtivos = corrigido.produtosAtivos || {
          conta: Boolean(corrigido.contaAtivaEm || (corrigido.pixCount ?? 0) >= 3),
          maquina: Boolean(corrigido.maquinaAtivaEm || (corrigido.maquinaVendas ?? 0) >= 500),
        };
        return { ...corrigido, status, cadenciaContatos: (cadencia ?? 0) as 0 | 1 | 2 | 3, produtosAtivos };
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationStatus>(() => getNotificationPermissionStatus());
  const [isBatchModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isSingleLeadOpen, setIsSingleLeadOpen] = useState(false);
  const [isMiningOpen, setIsMiningOpen] = useState(false);
  const [isCartuchosOpen, setIsCartuchosOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const miningStatus = useMiningStatus();
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);

  const [usuarioAtivo] = useState<{ nome: string; email: string; role: 'supervisor' | 'executivo'; }>({
    nome: 'Douglas Krüger', email: 'dr.douglasilva@gmail.com', role: 'supervisor',
  });

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

      const matchTelefone = Boolean(
        (buscaDigitos.length > 0 && (telPrincipal.replace(/\D/g, '').includes(buscaDigitos) || telSecundario.replace(/\D/g, '').includes(buscaDigitos))) ||
        (textoBusca && (telPrincipal.toLowerCase().includes(textoBusca) || telSecundario.toLowerCase().includes(textoBusca)))
      );

      const matchBusca = !textoBusca ||
        lead.empresaExibicao.toLowerCase().includes(textoBusca) ||
        lead.nomeContato.toLowerCase().includes(textoBusca) ||
        lead.cnpj.includes(textoBusca) ||
        (lead.municipio || '').toLowerCase().includes(textoBusca) ||
        matchTelefone;

      const matchStatus = filtroStatus === 'todos' || lead.status === filtroStatus;

      const matchCadencia =
        filtroCadencia === 'todos' ? true
        : filtroCadencia === 'followup_hoje' ? ehFollowUpVencido(lead)
        : filtroCadencia === 'score' ? calcularScore(lead) >= 75
        : filtroCadencia === 'risco' ? (lead.status === 'fechado' && calcularAtivacaoStatus(lead) === 'risco')
        : true;

      return matchBusca && matchStatus && matchCadencia;
    });
  }, [leads, busca, filtroStatus, filtroCadencia]);

  const leadsEquipe: EquipeMembro[] = useMemo(() => ([{
    nome: usuarioAtivo.nome, email: usuarioAtivo.email, role: usuarioAtivo.role, payload: { leads },
  }]), [leads, usuarioAtivo]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(() => {
    try { const saved = localStorage.getItem('ictx_google_spreadsheet'); return saved ? JSON.parse(saved) : null; }
    catch { return null; }
  });
  const [isGoogleSyncing, setIsGoogleSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => localStorage.getItem('ictx_last_sync_time'));

  useEffect(() => {
    if (spreadsheet) localStorage.setItem('ictx_google_spreadsheet', JSON.stringify(spreadsheet));
  }, [spreadsheet]);

  async function executarComRetry(fn: () => Promise<void>): Promise<void> {
    try { await fn(); }
    catch (e: any) {
      if (e?.message !== 'TOKEN_EXPIRADO') throw e;
    }
  }

  const isInitialMountRef = useRef(true);
  const isLoadingFromSheetRef = useRef(false);
  const isSavingToSheetRef = useRef(false);
  const firstMergeDoneRef = useRef(false);
  const pendingSaveLeadsRef = useRef<Lead[] | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        if (token) setCachedAccessToken(token);
        setIsAuthChecking(false);
        
        if (token && !firstMergeDoneRef.current && spreadsheet?.id) {
          try {
            setIsGoogleSyncing(true);
            isLoadingFromSheetRef.current = true;
            const leadsRemotos = await fetchLeadsFromSheet(spreadsheet.id, token);
            const base = carregarBaseSync();
            let listaMerged: Lead[] = [];
            setLeads((locaisAtuais) => {
              const { merged } = mergeLeads3(locaisAtuais, leadsRemotos, base);
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
          } catch (err) { console.warn('Erro merge:', err); }
          finally { isLoadingFromSheetRef.current = false; setIsGoogleSyncing(false); }
        }
      },
      () => { setCurrentUser(null); firstMergeDoneRef.current = false; setIsAuthChecking(false); }
    );
    return () => unsubscribe();
  }, [spreadsheet?.id]);

  const [leadParaMensagem, setLeadParaMensagem] = useState<Lead | null>(null);
  const [leadParaLigacao, setLeadParaLigacao] = useState<Lead | null>(null);
  const [leadParaDetalhes, setLeadParaDetalhes] = useState<Lead | null>(null);
  const [leadParaCoach, setLeadParaCoach] = useState<Lead | null>(null);

  useEffect(() => { salvarLeads(leads); }, [leads]);

  // =========================================================================
  // 🧹 O FAXINEIRO DE DADOS (Roda apenas 1 vez no primeiro carregamento)
  // =========================================================================
  useEffect(() => {
    const MIGRATION_FLAG = 'ictx_migration_janitor_v1';
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') return;

    let alterado = false;
    
    const leadsLimpos = leads.map((lead) => {
      let mudou = false;
      const leadAtualizado = { ...lead };
      const nomesInvalidos = ['sim sucesso', 'sim', 'sucesso', 'não cnpj invalido', 'nao cnpj invalido', 'não', 'nao'];

      // 1. Consertar Nomes
      if (leadAtualizado.nomeContato && nomesInvalidos.includes(leadAtualizado.nomeContato.toLowerCase().trim())) {
        leadAtualizado.nomeContato = 'Consultar Receita';
        mudou = true;
      }
      if (leadAtualizado.empresaExibicao && nomesInvalidos.includes(leadAtualizado.empresaExibicao.toLowerCase().trim())) {
        leadAtualizado.empresaExibicao = 'Empresa';
        mudou = true;
      }

      // 2. Consertar Telefones
      const limparTelefone = (tel: string | undefined): string => {
        if (!tel) return '';
        const limpo = tel.replace(/\D/g, '');
        if (limpo.length > 11) {
          const match = limpo.match(/(\d{2}9?\d{8})/);
          return match ? match[1] : limpo.slice(0, 11);
        }
        return limpo;
      };

      const novoTelPrincipal = limparTelefone(leadAtualizado.telefonePrincipal);
      if (novoTelPrincipal !== leadAtualizado.telefonePrincipal) {
        leadAtualizado.telefonePrincipal = novoTelPrincipal;
        leadAtualizado.telefonePrincipalFormatado = formatarTelefone(novoTelPrincipal);
        mudou = true;
      }

      const novoTelSecundario = limparTelefone(leadAtualizado.telefoneSecundario);
      if (novoTelSecundario !== leadAtualizado.telefoneSecundario) {
        leadAtualizado.telefoneSecundario = novoTelSecundario || undefined;
        leadAtualizado.telefoneSecundarioFormatado = novoTelSecundario ? formatarTelefone(novoTelSecundario) : undefined;
        mudou = true;
      }

      // 3. Consertar Follow-up corrompido
      if (leadAtualizado.proximoFollowUp && leadAtualizado.proximoFollowUp.trim() === '') {
        leadAtualizado.proximoFollowUp = undefined;
        mudou = true;
      }

      if (mudou) {
        alterado = true;
        return leadAtualizado;
      }
      return lead;
    });

    if (alterado) {
      setLeads(leadsLimpos);
      salvarLeads(leadsLimpos);
      console.log('[Faxineiro] Base limpa: Nomes e Telefones corrigidos.');
      alert('🧹 Base de dados otimizada com sucesso!\n\nNomes "Sim Sucesso" e telefones corrompidos foram consertados.');
    }
    
    localStorage.setItem(MIGRATION_FLAG, 'true');
  }, []); // Roda só no mount
  // =========================================================================

  useEffect(() => {
    if (isInitialMountRef.current) { isInitialMountRef.current = false; return; }
    if (!firstMergeDoneRef.current || !currentUser || !spreadsheet?.id) return;
    if (isLoadingFromSheetRef.current || isSavingToSheetRef.current) return;
    pendingSaveLeadsRef.current = leads;
    const timeout = setTimeout(async () => {
      try {
        if (isLoadingFromSheetRef.current || !spreadsheet?.id || !pendingSaveLeadsRef.current) return;
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
      } catch (err) { console.warn('Auto-save:', err); }
      finally { isSavingToSheetRef.current = false; setIsGoogleSyncing(false); }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [leads, currentUser, spreadsheet?.id]);

  useEffect(() => { salvarTemplates(templates); }, [templates]);

  const handleBatchEnrich = async () => {
    let filaIds: string[] = [];
    const filaSalva = localStorage.getItem('ictx_enrich_fila');
    if (filaSalva) { filaIds = JSON.parse(filaSalva); }
    else {
      const leadsParaEnriquecer = leads.filter(l => {
        if (l.status === 'fechado' || l.status === 'descartado') return false;
        const tel1 = limparDigitos(l.telefonePrincipal || '');
        const tel2 = limparDigitos(l.telefoneSecundario || '');
        const isCelular1 = tel1.length === 11 && tel1[2] === '9';
        const isCelular2 = tel2.length === 11 && tel2[2] === '9';
        const temCelular = isCelular1 || isCelular2;
        return !temCelular || !l.cnaeCodigo || l.razaoSocial === 'Empresa';
      });
      if (leadsParaEnriquecer.length === 0) { alert('Nenhum lead pendente.'); return; }
      filaIds = leadsParaEnriquecer.map(l => l.id);
      localStorage.setItem('ictx_enrich_fila', JSON.stringify(filaIds));
      localStorage.setItem('ictx_enrich_total', filaIds.length.toString());
    }
    if (filaIds.length === 0) { localStorage.removeItem('ictx_enrich_fila'); localStorage.removeItem('ictx_enrich_total'); return; }

    const totalOriginal = parseInt(localStorage.getItem('ictx_enrich_total') || filaIds.length.toString(), 10);
    setIsEnriching(true); setEnrichTotal(totalOriginal); setEnrichProgress(totalOriginal - filaIds.length);

    while (filaIds.length > 0) {
      const leadId = filaIds[0];
      const leadsAtuais = carregarLeads();
      const index = leadsAtuais.findIndex(l => l.id === leadId);
      if (index !== -1) {
        const lead = leadsAtuais[index];
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
            leadsAtuais[index] = autocorrigeLead(leadAtualizado);
            salvarLeads(leadsAtuais);
            setLeads([...leadsAtuais]);
            if (leadParaDetalhes?.id === leadId) setLeadParaDetalhes(autocorrigeLead(leadAtualizado));
          }
        } catch (error) { console.warn(`Erro: ${lead.cnpj}`, error); }
      }
      filaIds.shift();
      localStorage.setItem('ictx_enrich_fila', JSON.stringify(filaIds));
      setEnrichProgress(totalOriginal - filaIds.length);
      if (filaIds.length > 0) await new Promise(r => setTimeout(r, 20000));
    }
    setIsEnriching(false);
    localStorage.removeItem('ictx_enrich_total');
    alert('Enriquecimento concluído!');
  };

  useEffect(() => {
    const filaSalva = localStorage.getItem('ictx_enrich_fila');
    if (filaSalva && !isEnriching) {
      const fila = JSON.parse(filaSalva);
      if (fila.length > 0) setTimeout(() => handleBatchEnrich(), 1000);
    }
  }, []);

  const handleUpdateLeadStatus = (leadId: string, novoStatus: LeadStatus, logInfo?: any) => {
    setLeads((prevLeads) => prevLeads.map((l) => {
      if (l.id !== leadId) return l;
      const leadComCadencia = aplicarMudancaStatusCadencia(l, novoStatus);
      let leadAtualizado = leadComCadencia;
      if (novoStatus === 'fechado' && !leadAtualizado.dataFechamento) leadAtualizado = { ...leadAtualizado, dataFechamento: new Date().toISOString() };
      const historicoAtualizado = [...leadAtualizado.historicoContatos];
      if (logInfo) {
        historicoAtualizado.unshift({
          id: `log_${Date.now()}`, dataHora: new Date().toISOString(),
          tipo: logInfo.tipo, templateTitulo: logInfo.templateTitulo,
          mensagemEnviada: logInfo.mensagem, observacao: logInfo.observacao,
        });
      }
      return { ...leadAtualizado, historicoContatos: historicoAtualizado };
    }));
  };

  const registrarAcaoContato = (leadId: string, tipo: 'whatsapp' | 'ligacao', templateTitulo?: string) => {
    const agoraIso = new Date().toISOString();
    setLeads((prevLeads) => {
      const atualizados = prevLeads.map((l) => {
        if (l.id !== leadId) return l;
        const novoStatus: LeadStatus = l.status === 'novo' ? 'em_prospeccao' : l.status;
        const proxFollowUp = calcularProximoFollowUp(novoStatus);
        const novoHistorico = [{
          id: `contato_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          dataHora: agoraIso, tipo, templateTitulo: templateTitulo || (tipo === 'whatsapp' ? 'WhatsApp Rápido' : 'Ligação'),
          observacao: 'Ação via CRM',
        }, ...(l.historicoContatos || [])];
        return {
          ...l, status: novoStatus, dataUltimoContato: agoraIso, ultimoContatoEm: agoraIso,
          proximoFollowUp: proxFollowUp || l.proximoFollowUp, tentativasContato: (l.tentativasContato || 0) + 1,
          cadenciaContatos: ((l.cadenciaContatos ?? 0) < 3 ? (l.cadenciaContatos ?? 0) + 1 : 3) as any,
          atualizadoEm: agoraIso, historicoContatos: novoHistorico,
        };
      });
      salvarLeads(atualizados);
      return atualizados;
    });
  };

  useEffect(() => {
    const handleCustomAcaoContato = (e: Event) => {
      const customEvent = e as CustomEvent<{ leadId: string; tipo: 'whatsapp' | 'ligacao'; templateTitulo?: string; }>;
      if (customEvent.detail?.leadId) {
        registrarAcaoContato(customEvent.detail.leadId, customEvent.detail.tipo || 'whatsapp', customEvent.detail.templateTitulo);
      }
    };
    window.addEventListener('ictx:registrarAcaoContato', handleCustomAcaoContato);
    return () => window.removeEventListener('ictx:registrarAcaoContato', handleCustomAcaoContato);
  }, [currentUser, spreadsheet?.id]);

  const handleConnectGoogle = async () => {
    setIsGoogleSyncing(true);
    isLoadingFromSheetRef.current = true;
    try {
      const authResult = await googleSignIn();
      if (!authResult) throw new Error('Sem credenciais');
      setCurrentUser(authResult.user);
      const sheetInfo = await findOrCreateSpreadsheet(authResult.accessToken);
      setSpreadsheet(sheetInfo);
      const leadsDaPlanilha = await fetchLeadsFromSheet(sheetInfo.id, authResult.accessToken);
      const base = carregarBaseSync();
      let listaMerged: Lead[] = [];
      setLeads((locaisAtuais) => {
        const { merged } = mergeLeads3(locaisAtuais, leadsDaPlanilha, base);
        listaMerged = merged;
        return merged;
      });
      if (listaMerged.length > 0) {
        await saveAllLeadsToSheet(sheetInfo.id, listaMerged, authResult.accessToken);
        salvarBaseSync(listaMerged);
      }
      firstMergeDoneRef.current = true;
      const agora = new Date().toISOString();
      setLastSyncTime(agora);
      localStorage.setItem('ictx_last_sync_time', agora);
    } catch (err: any) { console.error('Erro Google:', err); throw err; }
    finally { isLoadingFromSheetRef.current = false; setIsGoogleSyncing(false); }
  };

  const handleSyncToSheet = async () => {
    setIsGoogleSyncing(true);
    try {
      let token = await getAccessToken();
      if (!token) { const r = await googleSignIn(); if (!r) return; token = r.accessToken; setCurrentUser(r.user); }
      if (!spreadsheet) { const s = await findOrCreateSpreadsheet(token); setSpreadsheet(s); }
      if (spreadsheet?.id) { await saveAllLeadsToSheet(spreadsheet.id, leads, token); salvarBaseSync(leads); }
    } finally { setIsGoogleSyncing(false); }
  };

  const handleFetchFromSheet = async () => {
    setIsGoogleSyncing(true);
    try {
      let token = await getAccessToken();
      if (!token) { const r = await googleSignIn(); if (!r) return; token = r.accessToken; }
      if (!spreadsheet?.id) return;
      const leadsDaPlanilha = await fetchLeadsFromSheet(spreadsheet.id, token);
      const base = carregarBaseSync();
      let merged: Lead[] = [];
      setLeads((locais) => {
        const res = mergeLeads3(locais, leadsDaPlanilha, base);
        merged = res.merged;
        return res.merged;
      });
      if (merged.length > 0) { await saveAllLeadsToSheet(spreadsheet.id, merged, token); salvarBaseSync(merged); }
    } finally { setIsGoogleSyncing(false); }
  };

  const handleDisconnectGoogle = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    firstMergeDoneRef.current = false;
    setIsProfileOpen(false);
  };

  const handleUpdateLead = (leadAtualizado: Lead) => {
    const corrigido = autocorrigeLead(leadAtualizado);
    setLeads((prev) => prev.map((l) => (l.id === corrigido.id ? corrigido : l)));
    if (leadParaDetalhes?.id === corrigido.id) setLeadParaDetalhes(corrigido);
  };

  const handleOpenDetails = (lead: Lead) => {
    setLeadParaMensagem(null);
    setLeadParaLigacao(null);
    setLeadParaDetalhes(autocorrigeLead(lead));
  };

  const handleSaveNotas = (leadId: string, notas: string) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notas, atualizadoEm: new Date().toISOString() } : l)));
  };

  const handleSaveCoachEvaluation = (leadId: string, av: { nota: number; feedback: string; data: string }) => {
    setLeads((prev) => prev.map((l) => {
      if (l.id !== leadId) return l;
      return { ...l, coachNota: av.nota, coachFeedback: av.feedback, coachData: av.data,
        historicoCoach: [{ data: av.data, nota: av.nota, feedback: av.feedback }, ...(l.historicoCoach || [])],
        atualizadoEm: av.data };
    }));
  };

  const handleDeleteLead = (leadId: string) => setLeads((prev) => prev.filter((l) => l.id !== leadId));
  const handleImportLeads = (novos: Lead[]) => setLeads((prev) => [...novos.filter(l => l && l.id && !isSampleLeadId(l.id)).map(autocorrigeLead), ...prev]);
  const handleAddSingleLead = (n: Lead) => { if (!isSampleLeadId(n.id)) setLeads((prev) => [autocorrigeLead(n), ...prev]); };
  const handleSaveTemplates = (t: MessageTemplate[]) => setTemplates(t);
  const handleRestoreBackup = (bl: Lead[], bt: MessageTemplate[]) => {
    const saneados = bl.filter((l) => l && l.id && !isSampleLeadId(l.id)).map(autocorrigeLead);
    if (saneados.length > 0) salvarLeads(saneados);
    if (bt?.length > 0) salvarTemplates(bt);
    setLeads(saneados); setTemplates(bt);
  };

  const existingCnpjs = new Set(leads.map((l) => l.cnpj));

  if (isAuthChecking) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleConnectGoogle} isLoading={isGoogleSyncing} />;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex flex-col text-slate-800 pb-16 md:pb-0">
      <Header
        leads={leads}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <main className="flex-1 max-w-7xl lg:max-w-none w-full mx-auto p-1 space-y-3 sm:space-y-4">
        <PipelineKanban
          leads={leads}
          onOpenMessageComposer={(lead) => setLeadParaMensagem(autocorrigeLead(lead))}
          onOpenCallScript={(lead) => setLeadParaLigacao(autocorrigeLead(lead))}
          onOpenDetails={handleOpenDetails}
          onOpenAtivacao={() => {}}
          onUpdateStatus={handleUpdateLeadStatus}
          onDeleteLead={handleDeleteLead}
          onRegistrarAcaoContato={registrarAcaoContato}
          filtroCadencia={filtroCadencia}
          onFiltroCadenciaChange={setFiltroCadencia}
          busca={busca}
          onBuscaChange={setBusca}
          filtroStatus={filtroStatus}
          onFiltroStatusChange={setFiltroStatus}
          modoVisualizacao={modoVisualizacao}
          onToggleVisualizacao={handleToggleVisualizacao}
        />
      </main>

      <MobileNav
        activeTab={mobileTab}
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === 'cartuchos') setIsCartuchosOpen(true);
          if (tab === 'metas') setIsMetasOpen(true);
          if (tab === 'perfil') setIsProfileOpen(true);
        }}
      />

      {mobileTab === 'leads' && (
        <FloatingActions
          onEnrich={handleBatchEnrich}
          onImport={() => setIsBulkImportOpen(true)}
          onTemplates={() => setIsTemplatesOpen(true)}
          isEnriching={isEnriching}
        />
      )}

      {leadParaMensagem && <MessageComposerModal lead={leadParaMensagem} templates={templates} isOpen={true} onClose={() => setLeadParaMensagem(null)} onUpdateLeadStatus={handleUpdateLeadStatus} onOpenDetails={(lead) => setLeadParaDetalhes(autocorrigeLead(lead))} />}
      {leadParaLigacao && <CallScriptModal lead={leadParaLigacao} templates={templates} isOpen={true} onClose={() => setLeadParaLigacao(null)} onUpdateLeadStatus={handleUpdateLeadStatus} onOpenDetails={(lead) => setLeadParaDetalhes(autocorrigeLead(lead))} />}
      {leadParaDetalhes && <LeadDetailDrawer lead={leadParaDetalhes} isOpen={true} onClose={() => setLeadParaDetalhes(null)} onUpdateStatus={handleUpdateLeadStatus} onUpdateLead={handleUpdateLead} onSaveNotas={handleSaveNotas} onRegistrarAcaoContato={registrarAcaoContato} onOpenMessageComposer={(lead) => { setLeadParaDetalhes(null); setLeadParaMensagem(autocorrigeLead(lead)); }} onOpenCallScript={(lead) => { setLeadParaDetalhes(null); setLeadParaLigacao(autocorrigeLead(lead)); }} onOpenCoach={(lead) => setLeadParaCoach(autocorrigeLead(lead))} />}
      {isBulkImportOpen && <BulkImportModal isOpen={true} onClose={() => setIsBulkImportOpen(false)} existingLeads={leads} onImportLeads={handleImportLeads} />}
      {isSingleLeadOpen && <SingleLeadModal isOpen={true} onClose={() => setIsSingleLeadOpen(false)} onAddLead={handleAddSingleLead} existingCnpjs={existingCnpjs} />}
      {isTemplatesOpen && <TemplateManagerModal templates={templates} isOpen={true} onClose={() => setIsTemplatesOpen(false)} onSaveTemplates={handleSaveTemplates} />}
      {isExportOpen && <ExportImportModal isOpen={true} onClose={() => setIsExportOpen(false)} leads={leads} templates={templates} onRestoreBackup={handleRestoreBackup} />}
      {isInstallOpen && <InstallAppModal isOpen={true} onClose={() => setIsInstallOpen(false)} />}
      {isGoogleModalOpen && <GoogleSheetsSyncModal isOpen={true} onClose={() => setIsGoogleModalOpen(false)} user={currentUser} spreadsheet={spreadsheet} isLoading={isGoogleSyncing} lastSyncTime={lastSyncTime} totalLeads={leads.length} onConnectGoogle={handleConnectGoogle} onSyncToSheet={handleSyncToSheet} onFetchFromSheet={handleFetchFromSheet} onDisconnect={handleDisconnectGoogle} />}
      <BatchMessageModal isOpen={isBatchModalOpen} onClose={() => {}} leadsFiltrados={leadsFiltrados} templates={templates} onUpdateStatus={handleUpdateLeadStatus} />
      {leadParaCoach && <CoachModal isOpen={true} onClose={() => setLeadParaCoach(null)} lead={leadParaCoach} onSaveCoachEvaluation={handleSaveCoachEvaluation} />}
      <SupervisorDashboard isOpen={isSupervisorOpen} onClose={() => setIsSupervisorOpen(false)} leadsEquipe={leadsEquipe} usuarioAtivo={usuarioAtivo} onAlternarRole={() => {}} />
      <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} permissionStatus={notificationPermission} onPermissionChange={(status) => setNotificationPermission(status)} leads={leads} onSelectLead={(lead) => setLeadParaDetalhes(lead)} />
      {isMetasOpen && <MetasDashboard isOpen={true} onClose={() => { setIsMetasOpen(false); setMobileTab('leads'); }} leads={leads} />}
      {!isMiningOpen && (miningStatus.status === 'rodando' || miningStatus.status === 'aguardando' || miningStatus.processando > 0) && <MiningFloatingWidget status={miningStatus} onReopen={() => setIsMiningOpen(true)} />}
      {isMiningOpen && <MiningDashboard isOpen={isMiningOpen} onClose={() => setIsMiningOpen(false)} onMinimize={() => setIsMiningOpen(false)} miningStatus={miningStatus} onImportLeads={handleImportLeads} existingCnpjs={existingCnpjs} />}
      <CartuchosModal isOpen={isCartuchosOpen} onClose={() => { setIsCartuchosOpen(false); setMobileTab('leads'); }} />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => { setIsProfileOpen(false); setMobileTab('leads'); }}
        user={currentUser}
        onLogout={handleDisconnectGoogle}
        isSyncing={isGoogleSyncing}
        lastSyncTime={lastSyncTime}
        isSupervisor={usuarioAtivo.role === 'supervisor'}
        onOpenEnrich={handleBatchEnrich}
        isEnriching={isEnriching}
        enrichProgress={enrichProgress}
        enrichTotal={enrichTotal}
        onOpenBulkImport={() => { setIsProfileOpen(false); setIsBulkImportOpen(true); }}
        onOpenTemplates={() => { setIsProfileOpen(false); setIsTemplatesOpen(true); }}
        onOpenBackup={() => { setIsProfileOpen(false); setIsExportOpen(true); }}
        onOpenInstall={() => { setIsProfileOpen(false); setIsInstallOpen(true); }}
        onOpenGoogleSheets={() => { setIsProfileOpen(false); setIsGoogleModalOpen(true); }}
        onOpenMetas={() => { setIsProfileOpen(false); setIsMetasOpen(true); }}
        onOpenSupervisor={() => { setIsProfileOpen(false); setIsSupervisorOpen(true); }}
        onOpenNotifications={() => { setIsProfileOpen(false); setIsNotificationModalOpen(true); }}
        onOpenCartuchos={() => { setIsProfileOpen(false); setIsCartuchosOpen(true); }}
        modoVisualizacao={modoVisualizacao}
        onToggleVisualizacao={handleToggleVisualizacao}
      />
    </div>
  );
}