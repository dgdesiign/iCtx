import React, { useState } from 'react';
import {
  X,
  PhoneCall,
  User,
  Building2,
  CheckCircle2,
  PhoneOff,
  UserX,
  FileText,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Lead, LeadStatus, MessageTemplate } from '../types/crm';
import { gerarLinkWhatsApp, preencherVariaveisMensagem } from '../utils/storage';

interface CallScriptModalProps {
  lead: Lead | null;
  templates: MessageTemplate[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateLeadStatus: (
    leadId: string,
    novoStatus: LeadStatus,
    logInfo?: { tipo: 'ligacao' | 'whatsapp'; templateTitulo: string; mensagem: string; observacao?: string }
  ) => void;
  onOpenDetails?: (lead: Lead) => void;
}

export const CallScriptModal: React.FC<CallScriptModalProps> = ({
  lead,
  templates,
  isOpen,
  onClose,
  onUpdateLeadStatus,
  onOpenDetails,
}) => {
  const [anotacoes, setAnotacoes] = useState('');
  const [motivoDescarte, setMotivoDescarte] = useState('Sem interesse no momento');
  const [mostrarModalDescarte, setMostrarModalDescarte] = useState(false);

  if (!isOpen || !lead) return null;

  // Script de ligação preenchido
  const scriptTemplate =
    templates.find((t) => t.id === 'script_ligacao_completo') ||
    templates.find((t) => t.canal === 'ligacao');

  const textoScript = scriptTemplate
    ? preencherVariaveisMensagem(scriptTemplate.texto, lead)
    : `Alô, ${lead.nomeContato}? Aqui é o Douglas Krüger. Represento o Banco Santander na abertura de contas PJ e soluções corporativas...`;

  const handleSucessoInteresse = () => {
    onUpdateLeadStatus(lead.id, 'negociacao', {
      tipo: 'ligacao',
      templateTitulo: 'Ligação Realizada com Sucesso',
      mensagem: 'Cliente atendeu e demonstrou interesse em conhecer as condições do Santander.',
      observacao: anotacoes,
    });
    onClose();
  };

  const handleNaoAtendeu = () => {
    // Busca template pós ligação
    const tplPos = templates.find((t) => t.id === 'whatsapp_pos_ligacao') || templates[0];
    const msg = preencherVariaveisMensagem(tplPos.texto, lead);
    const link = gerarLinkWhatsApp(lead.telefonePrincipal, msg);

    // Abre WhatsApp automaticamente com mensagem pós ligação
    window.open(link, '_blank');

    onUpdateLeadStatus(lead.id, 'contato_3', {
      tipo: 'ligacao',
      templateTitulo: 'Tentativa de Ligação (Não atendeu)',
      mensagem: 'Ligação não atendida. Disparada mensagem pós-ligação no WhatsApp.',
      observacao: anotacoes,
    });
    onClose();
  };

  const handleConfirmarDescarte = () => {
    onUpdateLeadStatus(lead.id, 'descartado', {
      tipo: 'ligacao',
      templateTitulo: 'Descartado após contato telefônico',
      mensagem: `Motivo: ${motivoDescarte}`,
      observacao: anotacoes,
    });
    setMostrarModalDescarte(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-purple-50/70">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 truncate">
                Roteiro de Ligação (Contato 3)
              </h3>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Roteiro falado para Douglas Krüger converter o cliente por telefone
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenDetails && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDetails(lead);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                title="Voltar e ver dossiê completo deste lead"
              >
                <span className="hidden sm:inline">Ver Dossiê</span>
                <span className="sm:hidden text-[11px]">Dossiê</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lead Dossier */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Empresa</span>
            <strong className="text-slate-900 line-clamp-1">{lead.empresaExibicao}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Contato</span>
            <strong className="text-slate-900">{lead.nomeContato}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Telefone</span>
            <a
              href={`tel:${lead.telefonePrincipal}`}
              className="text-purple-700 font-bold hover:underline font-mono"
            >
              {lead.telefonePrincipalFormatado || lead.telefonePrincipal}
            </a>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Sócios / QSA</span>
            <span className="text-slate-700 line-clamp-1" title={lead.socios.map(s => s.nome).join(', ')}>
              {lead.socios.length > 0 ? lead.socios[0].nome : 'Não informado'}
            </span>
          </div>
        </div>

        {/* Script Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Main Script */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Roteiro Sugerido de Ligação (Douglas Krüger · Santander PJ):</span>
            </div>
            <pre className="text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed">
              {textoScript}
            </pre>
          </div>

          {/* Quick Objections Answers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
              <strong className="text-amber-900 block font-semibold mb-1">
                Se disser: "Tô sem tempo"
              </strong>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                "Super compreendo, {lead.nomeContato}! Só preciso de 30 segundos: se eu te mandar as taxas do Pronampe no WhatsApp, você prefere dar uma olhada no final do dia?"
              </p>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80">
              <strong className="text-blue-900 block font-semibold mb-1">
                Se disser: "Já tenho banco"
              </strong>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                "Excelente! A meta não é você fechar lá, e sim ter uma segunda conta reserva com custo zero e limite pré-aprovado para não depender de um banco só."
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
              <strong className="text-emerald-900 block font-semibold mb-1">
                Se disser: "Manda no Zap"
              </strong>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                "Vou mandar agora mesmo em PDF! Só me confirma: sua maior prioridade hoje é taxa de maquininha ou capital de giro com juros baixos?"
              </p>
            </div>
          </div>

          {/* Call Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Anotações desta ligação (Salva no histórico do Lead):
            </label>
            <textarea
              rows={2}
              value={anotacoes}
              onChange={(e) => setAnotacoes(e.target.value)}
              placeholder="Ex: Disse que o faturamento é de 40k, pediu pra mandar proposta amanhã às 14h..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600 bg-white"
            />
          </div>

          {/* Discard Dialog Triggered */}
          {mostrarModalDescarte && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
              <strong className="text-xs text-rose-900 block font-bold">
                Confirmar descarte do lead:
              </strong>
              <select
                value={motivoDescarte}
                onChange={(e) => setMotivoDescarte(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-rose-300 bg-white"
              >
                <option value="Sem interesse no momento">Sem interesse no momento ("No momento não")</option>
                <option value="Satisfeito com o banco atual">Satisfeito com o banco atual</option>
                <option value="Empresa inativa / Parou de operar">Empresa inativa / Fechando</option>
                <option value="Número errado / Não pertence mais">Número errado ou inexistente</option>
                <option value="Recusa expressa / Não ligar mais">Recusa expressa</option>
              </select>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMostrarModalDescarte(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarDescarte}
                  className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded"
                >
                  Confirmar Descarte
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-2 order-2 sm:order-1">
            <button
              type="button"
              onClick={() => setMostrarModalDescarte(true)}
              className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Cliente Recusou</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 order-1 sm:order-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleNaoAtendeu}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Dispara mensagem pós ligação no WhatsApp e mantém em Contato 3"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Não Atendeu (Zap)</span>
            </button>

            <button
              type="button"
              onClick={handleSucessoInteresse}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Teve Interesse</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
