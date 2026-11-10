import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lead, LeadStatus } from '../types/crm';
import { safeParseLead, parseLeadsArray } from '../schemas/leadSchema';

export interface CrmStore {
  // Estado Principal de Dados
  leads: Lead[];
  selectedLeadId: string | null;

  // Filtros Globais Rápidos
  busca: string;
  filtroStatus: string;

  // Ações de Mutação Segura e Imutável
  setLeads: (leads: Lead[] | unknown[]) => void;
  addLead: (lead: Lead | unknown) => void;
  updateLead: (id: string, partial: Partial<Lead>) => void;
  updateLeadStatus: (id: string, novoStatus: LeadStatus) => void;
  deleteLead: (id: string) => void;
  setSelectedLeadId: (id: string | null) => void;
  setBusca: (busca: string) => void;
  setFiltroStatus: (status: string) => void;

  // Seletor Computado
  getLeadById: (id: string) => Lead | undefined;
}

export const useCrmStore = create<CrmStore>()(
  persist(
    (set, get) => ({
      leads: [],
      selectedLeadId: null,
      busca: '',
      filtroStatus: 'todos',

      // Define a lista completa de leads sanitizada via Zod
      setLeads: (novosLeads) => {
        const validados = parseLeadsArray(novosLeads) as Lead[];
        set({ leads: validados });
      },

      // Adiciona um lead individual com validação defensiva
      addLead: (novoLead) => {
        const validado = safeParseLead(novoLead) as Lead | null;
        if (!validado) return;

        set((state) => {
          // Evita duplicidade por ID ou CNPJ se presente
          const jaExiste = state.leads.some(
            (l) => l.id === validado.id || (validado.cnpj && l.cnpj && l.cnpj === validado.cnpj)
          );
          if (jaExiste) {
            return {
              leads: state.leads.map((l) =>
                l.id === validado.id || (validado.cnpj && l.cnpj === validado.cnpj)
                  ? { ...l, ...validado, atualizadoEm: new Date().toISOString() }
                  : l
              ),
            };
          }
          return {
            leads: [validado, ...state.leads],
          };
        });
      },

      // Atualização imutável e atômica de campos parciais do lead
      updateLead: (id, partial) => {
        const agora = new Date().toISOString();
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === id
              ? ({
                  ...l,
                  ...partial,
                  atualizadoEm: agora,
                } as Lead)
              : l
          ),
        }));
      },

      updateLeadStatus: (id, novoStatus) =>
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === id
              ? { ...l, status: novoStatus, atualizadoEm: new Date().toISOString() }
              : l
          ),
        })),

      // Remoção imutável de lead
      deleteLead: (id) => {
        set((state) => ({
          leads: state.leads.filter((l) => l.id !== id),
          selectedLeadId: state.selectedLeadId === id ? null : state.selectedLeadId,
        }));
      },

      // Seleção de lead para visualização no Dossiê / Drawer
      setSelectedLeadId: (id) => set({ selectedLeadId: id }),

      // Controles de busca e filtro
      setBusca: (busca) => set({ busca }),
      setFiltroStatus: (filtroStatus) => set({ filtroStatus }),

      // Helper para busca rápida
      getLeadById: (id) => get().leads.find((l) => l.id === id),
    }),
    {
      name: 'ictx-storage',
      // Serializa apenas os dados essenciais (leads e filtros)
      partialize: (state) => ({
        leads: state.leads,
        filtroStatus: state.filtroStatus,
      }),
    }
  )
);
